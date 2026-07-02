/**
 * OMRTemplatePdfService
 *
 * PDFKit coords: origin (0,0) at TOP-LEFT, y increases downward.
 * Zero margins set in PDFDocument options, we position everything absolutely.
 */

const PDFDocument = require('pdfkit');
const { OMRTemplate } = require('../models');

const MM = 2.8346456693;
const mm = (v) => v * MM;

function removeVietnameseTones(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function estimateLabelWidth(label) {
  let width = 0;
  for (let i = 0; i < label.length; i++) {
    const char = label[i];
    if (/[A-Z]/.test(char)) {
      width += 1.6;
    } else if (/[a-z0-9]/.test(char)) {
      width += 1.2;
    } else {
      width += 0.8;
    }
  }
  return width;
}

class OMRTemplatePdfService {
  async generateSheetPdf(templateId, options = {}) {
    const template = await OMRTemplate.findById(templateId);
    if (!template) throw new Error('OMR template not found');

    const { examTitle = 'EXAM', schoolName = 'SCHOOL', versionCode = null } = options;

    return this._buildPdf(template, examTitle, schoolName, versionCode);
  }

  async generateVersionSheetsPdf(templateId, versionCodes, options = {}) {
    const template = await OMRTemplate.findById(templateId);
    if (!template) throw new Error('OMR template not found');

    const { examTitle = 'EXAM', schoolName = 'SCHOOL' } = options;
    const buffers = await Promise.all(versionCodes.map((code) => this._buildPdf(template, examTitle, schoolName, code)));
    return versionCodes.map((code, i) => ({
      versionCode: code,
      pdfBuffer: buffers[i],
    }));
  }

  _buildPdf(template, examTitle, schoolName, versionCode) {
    return new Promise((resolve, reject) => {
      const zones = template.zones || {};
      const pageConfig = template.pageConfig || {};
      const margins = pageConfig.margins || {};
      const scannerConfig = template.scannerConfig || {};

      const cleanSchoolName = removeVietnameseTones(schoolName);
      const cleanExamTitle = removeVietnameseTones(examTitle);

      // ── Page size in mm ───────────────────────────────────────────
      const paperSize = pageConfig.paperSize || 'A4';
      const customSize = pageConfig.customSize || {};
      const orientation = (scannerConfig.orientation || 'portrait').toLowerCase();

      const sizes = {
        A4: { w: 210, h: 297 },
        A5: { w: 148, h: 210 },
        A3: { w: 297, h: 420 },
      };
      let baseSize = sizes[paperSize] || { w: customSize.width || 210, h: customSize.height || 297 };
      if (orientation === 'landscape') {
        baseSize = { w: baseSize.h, h: baseSize.w };
      }

      const paperW = baseSize.w;
      const paperH = baseSize.h;

      const mTop = margins.top || 15;
      const mLeft = margins.left || 15;
      const mRight = margins.right || 15;
      const mBottom = margins.bottom || 15;
      const cW = paperW - mLeft - mRight;

      const pageW = mm(paperW);
      const pageH = mm(paperH);

      // ── Y flow positions in mm ─────────────────────────────────────
      const hdrOn = zones.header?.enabled !== false;
      const hdrH = hdrOn ? zones.header?.height || 40 : 0;
      const hdrEndY = hdrOn ? mTop + hdrH : mTop;

      const sc = zones.studentCode;
      const vc = zones.versionCode;
      const scOn = sc && sc.enabled !== false;
      const vcOn = vc && vc.enabled !== false;

      let cbY = hdrEndY;
      let codeRowH = 0;
      if (scOn || vcOn) {
        cbY = hdrOn ? hdrEndY + 5 : mTop;
        const scH = scOn
          ? 10 * (sc.digitConfig?.bubbleSize?.height || 2.5) + 9 * (sc.digitConfig?.bubbleSpacing?.vertical || 1) + 6
          : 0;
        const vcH = vcOn
          ? 10 * (vc.digitConfig?.bubbleSize?.height || 2) + 9 * (vc.digitConfig?.bubbleSpacing?.vertical || 0.5) + 6
          : 0;
        codeRowH = Math.max(scH, vcH);
      }
      const cbEndY = scOn || vcOn ? cbY + codeRowH : hdrEndY;

      const doc = new PDFDocument({
        size: [pageW, pageH],
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        info: {
          Title: 'OMR Answer Sheet',
          Author: 'Smart Grading System',
          Subject: 'OMR Answer Sheet',
        },
      });

      // White background (bottom layer)
      doc.rect(0, 0, pageW, pageH).fill('#ffffff');

      // ═══════════════════════════════════════════════════════════════
      // 1. HEADER
      // ═══════════════════════════════════════════════════════════════
      if (hdrOn) {
        this._drawHeader(doc, mm(mLeft), mm(mTop), mm(cW), mm(hdrH), cleanSchoolName, cleanExamTitle);
      }

      // ═══════════════════════════════════════════════════════════════
      // 2. CODE BLOCKS (Student & Version Code)
      // ═══════════════════════════════════════════════════════════════
      if (scOn) {
        let labelText = (sc.label && sc.label.text) || 'STUDENT ID';
        if (labelText === 'Số báo danh' || labelText === 'SBD') {
          labelText = 'STUDENT ID';
        } else if (labelText === 'Mã đề' || labelText === 'MĐ') {
          labelText = 'EXAM CODE';
        }
        labelText = removeVietnameseTones(labelText);

        this._drawCodeBlock(doc, mm(mLeft), mm(cbY), labelText, sc.digits || 3, sc.digitConfig, null);
      }

      if (vcOn) {
        const vx = mLeft + cW / 2 + 2;
        let labelText = (vc.label && vc.label.text) || 'EXAM CODE';
        if (labelText === 'Mã đề' || labelText === 'MĐ') {
          labelText = 'EXAM CODE';
        } else if (labelText === 'Số báo danh' || labelText === 'SBD') {
          labelText = 'STUDENT ID';
        }
        labelText = removeVietnameseTones(labelText);

        this._drawCodeBlock(doc, mm(vx), mm(cbY), labelText, vc.digits || 3, vc.digitConfig, versionCode);
      }

      // ═══════════════════════════════════════════════════════════════
      // 3. ANSWER GRID
      // ═══════════════════════════════════════════════════════════════
      const answerArea = zones.answerArea || {};
      const gridConfig = answerArea.gridConfig || {};
      const bCfg = gridConfig.bubbleConfig || {};
      const qCfg = gridConfig.questionNumberConfig || {};

      if (answerArea.enabled !== false && gridConfig) {
        const gridY = scOn || vcOn ? cbEndY + 6 : hdrOn ? hdrEndY + 5 : mTop;

        this._drawAnswerGrid(doc, {
          startX: mm(answerArea.startPosition?.x || mLeft),
          startY: mm(gridY),
          questionsPerRow: gridConfig.questionsPerRow || 5,
          totalQuestions: gridConfig.totalQuestions || 30,
          bubbleW: mm(bCfg.width || 4),
          bubbleH: mm(bCfg.height || 4),
          shape: bCfg.shape || 'circle',
          optionGap: mm((bCfg.spacing && bCfg.spacing.betweenOptions) || 1),
          questionGap: mm((bCfg.spacing && bCfg.spacing.betweenQuestions) || 3),
          rowGap: mm((bCfg.spacing && bCfg.spacing.betweenRows) || 8),
          numOptions: 4,
          qNumEnabled: qCfg.enabled !== false,
          qNumWidth: mm(qCfg.width || 8),
          qNumFontSize: qCfg.fontSize || 8,
        });
      }

      // ═══════════════════════════════════════════════════════════════
      // 4. FOOTER
      // ═══════════════════════════════════════════════════════════════
      const footerZone = zones.footer || {};
      if (footerZone.enabled !== false) {
        const fh = footerZone.height || 12;
        const fy = paperH - mBottom - fh;
        this._drawFooter(doc, mm(mLeft), mm(fy), mm(cW), mm(fh));
      }

      // ── Output ─────────────────────────────────────────────────────
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));
      doc.end();
    });
  }

  // ── Page size ──────────────────────────────────────────────────────
  _getPageSize(pageConfig, scannerConfig = {}) {
    const paperSize = pageConfig.paperSize || 'A4';
    const custom = pageConfig.customSize || {};
    const orientation = (scannerConfig.orientation || 'portrait').toLowerCase();

    const sizes = {
      A4: { w: 210, h: 297 },
      A5: { w: 148, h: 210 },
      A3: { w: 297, h: 420 },
    };

    let size = sizes[paperSize] || { w: custom.width || 210, h: custom.height || 297 };
    if (orientation === 'landscape') {
      size = { w: size.h, h: size.w };
    }
    return { pageW: mm(size.w), pageH: mm(size.h), sizeMm: size };
  }

  // ── HEADER ────────────────────────────────────────────────────────
  _drawHeader(doc, x, y, w, h, schoolName, examTitle) {
    doc.rect(x, y, w, h).fill('#f0f4f8');

    doc
      .moveTo(x, y + h)
      .lineTo(x + w, y + h)
      .strokeColor('#2563eb')
      .lineWidth(0.5)
      .stroke();

    const pad = mm(4);

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#1e40af')
      .text(schoolName.toUpperCase(), x + pad, y + mm(5), { width: w - pad * 2, align: 'center' });

    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor('#0f172a')
      .text(examTitle.toUpperCase(), x + pad, y + mm(16), { width: w - pad * 2, align: 'center' });

    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#94a3b8')
      .text('OMR ANSWER SHEET  -  SMART GRADING', x + pad, y + mm(29), { width: w - pad * 2, align: 'center' });
  }

  // ── CODE BLOCK (INT columns stacked vertically) ───────────────────
  _drawCodeBlock(doc, x, y, label, digits, digitConfig, filledCode) {
    const cfg = digitConfig || {};
    const bW = (cfg.bubbleSize && cfg.bubbleSize.width) || 2.5;
    const bH = (cfg.bubbleSize && cfg.bubbleSize.height) || 2.5;
    const bGapH = (cfg.bubbleSpacing && cfg.bubbleSpacing.horizontal) || 1;
    const bGapV = (cfg.bubbleSpacing && cfg.bubbleSpacing.vertical) || 1;
    const opts = cfg.optionsPerDigit || 10;

    const oneBubble = mm(bW);
    const oneBubbleH = mm(bH);
    const oneGapH = mm(bGapH);
    const oneGapV = mm(bGapV);

    const stepX = oneBubble + oneGapH;
    const stepY = oneBubbleH + oneGapV;

    const totalContentW = digits * stepX - oneGapH;
    const totalContentH = opts * stepY - oneGapV;

    const padX = mm(2);
    const padY = mm(2);

    // Width adjustments to prevent title text overflow
    const labelW = estimateLabelWidth(label) + 4;
    let minBlockW = Math.max(20, labelW);
    if (label.includes('STUDENT') || label.includes('DANH')) {
      minBlockW = Math.max(minBlockW, 32);
    } else if (label.includes('EXAM') || label.includes('DE')) {
      minBlockW = Math.max(minBlockW, 28);
    }
    const blockW = Math.max(totalContentW + padX * 2, mm(minBlockW));
    const blockH = totalContentH + mm(6) + padY * 2; // +6mm offset for label space

    doc.roundedRect(x - padX, y, blockW, blockH, mm(1)).fill('#f8fafc');
    doc
      .roundedRect(x - padX, y, blockW, blockH, mm(1))
      .strokeColor('#cbd5e1')
      .lineWidth(0.4)
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor('#64748b')
      .text(label, x - padX, y + mm(2), { width: blockW, align: 'center' });

    const vals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

    const startBubblesX = x - padX + (blockW - totalContentW) / 2;

    for (let d = 0; d < digits; d += 1) {
      const colX = startBubblesX + d * stepX;

      for (let v = 0; v < opts; v += 1) {
        const bx = colX;
        const by = y + mm(6) + v * stepY; // +6mm offset for label space
        const r = oneBubble / 2;
        const cy = by + r;
        const cx = bx + r;

        const filled = filledCode !== null && filledCode !== undefined && String(filledCode[d]) === vals[v];
        doc.circle(cx, cy, r).fillAndStroke(filled ? '#1e40af' : '#ffffff', '#94a3b8');

        // Print number inside bubble
        doc
          .font('Helvetica')
          .fontSize(5)
          .fillColor(filled ? '#ffffff' : '#64748b')
          .text(vals[v], cx - r, cy - 2, { width: oneBubble, align: 'center' });
      }

      // Column number at the bottom (centered)
      doc
        .font('Helvetica-Bold')
        .fontSize(5)
        .fillColor('#94a3b8')
        .text(String(d + 1), colX, y + blockH - mm(3), { width: oneBubble, align: 'center' });
    }
  }

  // ── ANSWER GRID ───────────────────────────────────────────────────
  _drawAnswerGrid(doc, params) {
    const {
      startX,
      startY,
      questionsPerRow,
      totalQuestions,
      bubbleW,
      bubbleH,
      shape,
      optionGap,
      questionGap,
      rowGap,
      numOptions,
      qNumEnabled,
      qNumWidth,
      qNumFontSize,
    } = params;

    const letters = ['A', 'B', 'C', 'D', 'E'].slice(0, numOptions);
    const cellW = qNumEnabled
      ? qNumWidth + questionGap + numOptions * bubbleW + (numOptions - 1) * optionGap
      : numOptions * bubbleW + (numOptions - 1) * optionGap;
    const cellH = bubbleH + rowGap;
    const gridW = questionsPerRow * cellW;
    const drawnRows = Math.ceil(totalQuestions / questionsPerRow);

    // Outer border
    doc
      .rect(startX, startY, gridW, drawnRows * cellH)
      .strokeColor('#1e40af')
      .lineWidth(0.8)
      .stroke();

    for (let q = 0; q < totalQuestions; q += 1) {
      const col = q % questionsPerRow;
      const row = Math.floor(q / questionsPerRow);
      const cx = startX + col * cellW;
      const cy = startY + row * cellH; // top of this cell

      // Horizontal row divider
      if (row > 0) {
        doc
          .moveTo(startX, cy)
          .lineTo(startX + gridW, cy)
          .strokeColor('#e2e8f0')
          .lineWidth(0.3)
          .stroke();
      }

      // Question number
      if (qNumEnabled) {
        doc
          .font('Helvetica-Bold')
          .fontSize(qNumFontSize)
          .fillColor('#334155')
          .text(String(q + 1), cx + mm(0.5), cy + cellH / 2 - qNumFontSize * 0.4, {
            width: qNumWidth - mm(1),
            align: 'right',
          });

        doc
          .moveTo(cx + qNumWidth, cy)
          .lineTo(cx + qNumWidth, cy + cellH)
          .strokeColor('#e2e8f0')
          .lineWidth(0.3)
          .stroke();
      }

      // Bubbles
      const optsStartX = qNumEnabled ? cx + qNumWidth + questionGap : cx;
      const optsTotalW = numOptions * bubbleW + (numOptions - 1) * optionGap;
      const cellInnerW = cellW - (qNumEnabled ? qNumWidth + questionGap : 0);
      const optsX = optsStartX + Math.max(0, (cellInnerW - optsTotalW) / 2);

      for (let o = 0; o < numOptions; o += 1) {
        const bx = optsX + o * (bubbleW + optionGap);
        const byB = cy + (cellH - bubbleH) / 2;
        const r = bubbleW / 2;

        if (shape === 'square') {
          doc.rect(bx, byB, bubbleW, bubbleH).fillAndStroke('#ffffff', '#94a3b8');
        } else {
          doc.circle(bx + r, byB + r, r).fillAndStroke('#ffffff', '#94a3b8');
        }

        doc
          .font('Helvetica-Bold')
          .fontSize(5)
          .fillColor('#64748b')
          .text(letters[o], bx, byB + r - 2, { width: bubbleW, align: 'center' });
      }
    }

    // Vertical column dividers
    for (let c = 0; c <= questionsPerRow; c += 1) {
      const dx = startX + c * cellW;
      doc
        .moveTo(dx, startY)
        .lineTo(dx, startY + drawnRows * cellH)
        .strokeColor('#e2e8f0')
        .lineWidth(0.3)
        .stroke();
    }
  }

  // ── FOOTER ────────────────────────────────────────────────────────
  _drawFooter(doc, x, y, w, h) {
    doc.rect(x, y, w, h).fill('#f8fafc');

    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#94a3b8')
      .text('Smart Grading  -  OMR Answer Sheet', x + mm(4), y + mm(3));

    doc
      .fontSize(7)
      .fillColor('#94a3b8')
      .text('Page 1/1', x + w - mm(25), y + mm(3));
  }
}

module.exports = new OMRTemplatePdfService();
