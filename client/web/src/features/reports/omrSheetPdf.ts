/**
 * omrSheetPdf.ts
 *
 * Dynamic OMR template matching reference layout.
 *
 * Layout is computed DYNAMICALLY from template zone values:
 *   Header → Code Row → Grid → Footer, no overlap guaranteed.
 */

import { jsPDF } from 'jspdf';
import type { PageConfig, Zones, VersionCodeZone, StudentCodeZone } from '../../types';

// ─── Types ─────────────────────────────────────────────────────────────────

interface OMRTemplateData {
  pageConfig?: PageConfig;
  zones?: Zones;
  scannerConfig?: {
    orientation?: string;
  };
}

interface OmrSheetParams {
  template: OMRTemplateData;
  examTitle: string;
  schoolName: string;
  versionCode?: string;
}

// ─── Paper sizes (width × height, mm) ────────────────────────────────────

const PAPER: Record<string, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
  A3: { w: 297, h: 420 },
};

// ─── Entry point ──────────────────────────────────────────────────────────

function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export async function generateOmrSheetPdf(params: OmrSheetParams): Promise<Blob> {
  const { template, examTitle, schoolName, versionCode } = params;
  const pageConfig = template.pageConfig ?? { paperSize: 'A4', margins: { top: 15, bottom: 15, left: 15, right: 15 } };
  const zones = template.zones ?? {};
  
  const cleanSchool = removeVietnameseTones(schoolName);
  const cleanTitle = removeVietnameseTones(examTitle);

  const paperSize = (pageConfig.paperSize || 'A4').toUpperCase();
  const orientation = (template.scannerConfig?.orientation || 'portrait').toLowerCase() as 'portrait' | 'landscape';
  
  const basePaper = PAPER[paperSize] || PAPER.A4;
  const paper = orientation === 'landscape'
    ? { w: basePaper.h, h: basePaper.w }
    : { w: basePaper.w, h: basePaper.h };

  const m = pageConfig.margins ?? { top: 15, bottom: 15, left: 15, right: 15 };
  const cW = paper.w - (m.left ?? 15) - (m.right ?? 15);

  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: paperSize.toLowerCase(),
  });

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, paper.w, paper.h, 'F');

  const mTop = m.top ?? 15;
  const mLeft = m.left ?? 15;
  // mRight is available but not currently used in layout calculations
  const mBottom = m.bottom ?? 15;

  // ── 1. Calculate Header Y bounds ──────────────────────────────────────────
  const hdrOn = zones.header?.enabled !== false;
  const hdrH = hdrOn ? (zones.header?.height || 40) : 0;
  const hdrEndY = hdrOn ? (mTop + hdrH) : mTop;

  // ── 2. Calculate Code Blocks Y bounds ──────────────────────────────────────
  const sc = zones.studentCode;
  const vc = zones.versionCode;
  const scOn = sc && sc.enabled !== false;
  const vcOn = vc && vc.enabled !== false;

  let cbY = hdrEndY;
  let codeRowH = 0;
  if (scOn || vcOn) {
    cbY = hdrOn ? (hdrEndY + 5) : mTop;
    const scH = scOn ? calcIntBlockH(sc, false) : 0;
    const vcH = vcOn ? calcIntBlockH(vc, true) : 0;
    codeRowH = Math.max(scH, vcH);
  }
  const cbEndY = (scOn || vcOn) ? (cbY + codeRowH) : hdrEndY;

  // ── HEADER ────────────────────────────────────────────────────────
  if (hdrOn) {
    drawHeader(doc, mLeft, mTop, cW, hdrH, cleanSchool, cleanTitle);
  }

  // ── CODE ROW (student + version, side by side) ────────────────────
  if (scOn) {
    drawIntField(doc, mLeft, cbY, sc, null);
  }
  if (vcOn) {
    const vx = mLeft + cW / 2 + 2;
    drawIntField(doc, vx, cbY, vc, versionCode ?? null);
  }

  // ── ANSWER GRID ──────────────────────────────────────────────────
  const aa = zones.answerArea;
  const gc = aa?.gridConfig;
  if (aa?.enabled !== false && gc) {
    const gridY = (scOn || vcOn) ? (cbEndY + 6) : (hdrOn ? (hdrEndY + 5) : mTop);

    const totalQ = gc.totalQuestions ?? 30;
    const cols = gc.questionsPerRow ?? 5;
    const rows = Math.ceil(totalQ / cols);
    const bW = gc.bubbleConfig?.width ?? 4;
    const bH = gc.bubbleConfig?.height ?? 4;
    const optGap = gc.bubbleConfig?.spacing?.betweenOptions ?? 1;
    const rowGap = gc.bubbleConfig?.spacing?.betweenRows ?? 8;
    const questionGap = gc.bubbleConfig?.spacing?.betweenQuestions ?? 3;
    const qc = gc.questionNumberConfig ?? {};
    const qNumOn = qc.enabled !== false;
    const qNumW = qc.width ?? 8;
    const qNumFS = qc.fontSize ?? 8;

    const cellW = qNumOn
      ? qNumW + questionGap + 4 * bW + 3 * optGap
      : 4 * bW + 3 * optGap;
    const cellH = bH + rowGap;
    const gridW = cols * cellW;

    drawAnswerGrid(doc, {
      startX: aa.startPosition?.x ?? mLeft,
      startY: gridY,
      width: gridW,
      height: rows * cellH,
      questionsPerRow: cols,
      totalQuestions: totalQ,
      bubbleW: bW,
      bubbleH: bH,
      shape: gc.bubbleConfig?.shape ?? 'circle',
      optionGap: optGap,
      questionGap,
      rowGap,
      numOptions: 4,
      qNumEnabled: qNumOn,
      qNumWidth: qNumW,
      qNumFontSize: qNumFS,
    });
  }

  // ── FOOTER ────────────────────────────────────────────────────────
  if (zones.footer?.enabled !== false) {
    const fH = zones.footer?.height ?? 12;
    const fY = paper.h - mBottom - fH;
    drawFooter(doc, mLeft, fY, cW, fH);
  }

  return doc.output('blob');
}

export async function generateOmrVersionSheetsPdf(params: OmrSheetParams & { versionCodes: string[] }): Promise<Blob[]> {
  return Promise.all(
    params.versionCodes.map(code =>
      generateOmrSheetPdf({ ...params, versionCode: code })
    )
  );
}

// ─── Computed heights ──────────────────────────────────────────────────

function calcIntBlockH(block: StudentCodeZone | VersionCodeZone | undefined, isVersion: boolean): number {
  if (!block) return 0;
  const bH = block.digitConfig?.bubbleSize?.height ?? (isVersion ? 2 : 2.5);
  const bGap = block.digitConfig?.bubbleSpacing?.vertical ?? (isVersion ? 0.5 : 1);
  const opts = block.digitConfig?.optionsPerDigit ?? 10;
  const labelH = 6; // Space for label + value row
  return opts * (bH + bGap) - bGap + labelH;
}

// ─── Drawing: Header ─────────────────────────────────────────────────────

function drawHeader(doc: jsPDF, x: number, y: number, w: number, h: number, schoolName: string, examTitle: string) {
  doc.setFillColor(240, 244, 248);
  doc.rect(x, y, w, h, 'F');
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(x, y + h, x + w, y + h);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 64, 175);
  doc.text(schoolName.toUpperCase(), x + w / 2, y + 10, { align: 'center', maxWidth: w - 8 });

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(examTitle.toUpperCase(), x + w / 2, y + 22, { align: 'center', maxWidth: w - 8 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('OMR ANSWER SHEET  ·  SMART GRADING', x + w / 2, y + 33, { align: 'center', maxWidth: w - 8 });
}

function estimateLabelWidth(label: string): number {
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

// ─── Drawing: INT Code Field ─────────────────────────────────────────────

function drawIntField(
  doc: jsPDF,
  x: number,
  y: number,
  block: StudentCodeZone | VersionCodeZone,
  filled: string | null,
) {
  const bW    = block.digitConfig?.bubbleSize?.width ?? 2.5;
  const bH     = block.digitConfig?.bubbleSize?.height ?? 2.5;
  const bGapH  = block.digitConfig?.bubbleSpacing?.horizontal ?? 1;
  const bGapV  = block.digitConfig?.bubbleSpacing?.vertical ?? 1;
  const digits = block.digits ?? 3;
  const opts   = block.digitConfig?.optionsPerDigit ?? 10;

  let labelText = block.label?.text || 'CODE';
  if (labelText === 'Số báo danh' || labelText === 'SBD') {
    labelText = 'STUDENT ID';
  } else if (labelText === 'Mã đề' || labelText === 'MĐ') {
    labelText = 'EXAM CODE';
  }
  const label = removeVietnameseTones(labelText);

  const stepX = bW + bGapH;
  const stepY = bH + bGapV;

  const totalContentW = digits * stepX - bGapH;
  const totalContentH = opts * stepY - bGapV;

  const padX = 2;
  const padY = 2;
  
  // Width adjustments to prevent title text overflow
  const labelW = estimateLabelWidth(label) + 4;
  let minBlockW = Math.max(20, labelW);
  if (label.includes('STUDENT') || label.includes('DANH')) {
    minBlockW = Math.max(minBlockW, 32);
  } else if (label.includes('EXAM') || label.includes('DE')) {
    minBlockW = Math.max(minBlockW, 28);
  }
  const blockW = Math.max(totalContentW + padX * 2, minBlockW);
  const blockH = totalContentH + 6 + padY * 2; // +6mm offset for label space

  // Background
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x - padX, y, blockW, blockH, 1, 1, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(x - padX, y, blockW, blockH, 1, 1, 'S');

  // Label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(label, x - padX + blockW / 2, y + 4, { align: 'center' });

  const startBubblesX = (x - padX) + (blockW - totalContentW) / 2;

  for (let d = 0; d < digits; d++) {
    const colX = startBubblesX + d * stepX;

    // Bubbles (0-9 stacked vertically)
    for (let v = 0; v < opts; v++) {
      const bx = colX;
      const by = y + 6 + v * stepY;

      const isFilled = filled !== null && filled !== undefined
        ? String(filled[d]) === String(v)
        : false;

      doc.setFillColor(isFilled ? 30 : 255, isFilled ? 64 : 255, isFilled ? 175 : 255);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.25);
      doc.circle(bx + bW / 2, by + bH / 2, bW / 2, 'FD');

      // Draw digit inside bubble
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(isFilled ? 255 : 100, isFilled ? 255 : 116, isFilled ? 255 : 139);
      doc.text(String(v), bx + bW / 2, by + bH / 2, { align: 'center', baseline: 'middle' });
    }

    // Column number at the bottom (centered)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(148, 163, 184);
    doc.text(String(d + 1), colX + bW / 2, y + blockH - 2, { align: 'center', baseline: 'middle' });
  }
}

// ─── Drawing: Answer Grid ───────────────────────────────────────────────

interface DrawGridOpts {
  startX: number;
  startY: number;
  width: number;
  height: number;
  questionsPerRow: number;
  totalQuestions: number;
  bubbleW: number;
  bubbleH: number;
  shape: string;
  optionGap: number;
  questionGap: number;
  rowGap: number;
  numOptions: number;
  qNumEnabled: boolean;
  qNumWidth: number;
  qNumFontSize: number;
}

function drawAnswerGrid(doc: jsPDF, opt: DrawGridOpts) {
  const {
    startX, startY, width,
    questionsPerRow, totalQuestions,
    bubbleW, bubbleH, shape,
    optionGap, questionGap, rowGap,
    numOptions,
    qNumEnabled, qNumWidth, qNumFontSize,
  } = opt;

  const letters = ['A', 'B', 'C', 'D', 'E'].slice(0, numOptions);
  const cellW = qNumEnabled
    ? qNumWidth + questionGap + numOptions * bubbleW + (numOptions - 1) * optionGap
    : numOptions * bubbleW + (numOptions - 1) * optionGap;
  const cellH = bubbleH + rowGap;
  const drawnRows = Math.ceil(totalQuestions / questionsPerRow);

  // Outer border
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.6);
  doc.rect(startX, startY, width, drawnRows * cellH, 'S');

  for (let q = 0; q < totalQuestions; q++) {
    const col = q % questionsPerRow;
    const row = Math.floor(q / questionsPerRow);
    const cx = startX + col * cellW;
    const cy = startY + row * cellH;

    // Row divider
    if (row > 0) {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(startX, cy, startX + width, cy);
    }

    // Q# number
    if (qNumEnabled) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(qNumFontSize);
      doc.setTextColor(51, 65, 85);
      doc.text(String(q + 1), cx + qNumWidth - 0.5, cy + cellH / 2, { align: 'right', baseline: 'middle' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(cx + qNumWidth, cy, cx + qNumWidth, cy + cellH);
    }

    // Bubbles
    const optsStartX = qNumEnabled ? cx + qNumWidth + questionGap : cx;
    const optsTotalW = numOptions * bubbleW + (numOptions - 1) * optionGap;
    const cellInnerW = cellW - (qNumEnabled ? qNumWidth + questionGap : 0);
    const optsX = optsStartX + Math.max(0, (cellInnerW - optsTotalW) / 2);

    for (let o = 0; o < numOptions; o++) {
      const bx = optsX + o * (bubbleW + optionGap);
      const by = cy + (cellH - bubbleH) / 2;

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.25);

      if (shape === 'square') {
        doc.rect(bx, by, bubbleW, bubbleH, 'FD');
      } else {
        doc.circle(bx + bubbleW / 2, by + bubbleH / 2, bubbleW / 2, 'FD');
      }

      // Option letter inside bubble
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(100, 116, 139);
      doc.text(letters[o], bx + bubbleW / 2, by + bubbleH / 2, { align: 'center', baseline: 'middle' });
    }
  }

  // Vertical column dividers
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  for (let c = 0; c <= questionsPerRow; c++) {
    const dx = startX + c * cellW;
    doc.line(dx, startY, dx, startY + drawnRows * cellH);
  }
}

// ─── Drawing: Footer ─────────────────────────────────────────────────────

function drawFooter(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setFillColor(248, 250, 252);
  doc.rect(x, y, w, h, 'F');
  doc.setDrawColor(220, 225, 235);
  doc.setLineWidth(0.3);
  doc.line(x, y, x + w, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('Smart Grading  ·  OMR Answer Sheet', x + 4, y + 4);
  doc.text('Page 1/1', x + w - 4, y + 4, { align: 'right' });
}
