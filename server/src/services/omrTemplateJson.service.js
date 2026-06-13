/**
 * OMR Template zones (mm) → Flutter FieldBlock JSON (pixels @ 300 DPI).
 *
 * Conversion: px = mm * 300 / 25.4
 *
 * Dynamic Flow Layout coordinate calculations.
 */

const MM_TO_PX = 300 / 25.4;

function mmToPx(mm) {
  return Math.round(mm * MM_TO_PX);
}

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

function convertTemplate(template) {
  const { pageConfig = {}, zones = {} } = template;

  const toPx = (mm) => mmToPx(mm);

  const paperSize = pageConfig.paperSize || 'A4';
  const pageSizes = { A4: [2480, 3508], A5: [1748, 2480], A3: [3508, 4961] };
  const [pageW, pageH] = pageSizes[paperSize] || pageSizes.A4;

  const mTop = pageConfig.margins?.top || 15;
  const mLeft = pageConfig.margins?.left || 15;
  const mRight = pageConfig.margins?.right || 15;
  const paperSizesMm = { A4: [210, 297], A5: [148, 210], A3: [297, 420] };
  const [paperW] = paperSizesMm[paperSize] || paperSizesMm.A4;
  const cW = paperW - mLeft - mRight;

  const fieldBlocks = {};
  const outputColumns = [];

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
    const scH = scOn ? (10 * (sc.digitConfig?.bubbleSize?.height || 2.5) + 9 * (sc.digitConfig?.bubbleSpacing?.vertical || 1) + 6) : 0;
    const vcH = vcOn ? (10 * (vc.digitConfig?.bubbleSize?.height || 2) + 9 * (vc.digitConfig?.bubbleSpacing?.vertical || 0.5) + 6) : 0;
    codeRowH = Math.max(scH, vcH);
  }
  const cbEndY = (scOn || vcOn) ? (cbY + codeRowH) : hdrEndY;

  // ── Student code (INT: vertical 0-9 per digit column) ─────────────────
  if (scOn) {
    let labelText = (sc.label && sc.label.text) || 'STUDENT ID';
    if (labelText === 'Số báo danh' || labelText === 'SBD') {
      labelText = 'STUDENT ID';
    } else if (labelText === 'Mã đề' || labelText === 'MĐ') {
      labelText = 'EXAM CODE';
    }
    const label = removeVietnameseTones(labelText);

    const digits = sc.digits || 3;
    const bwVal = sc.digitConfig?.bubbleSize?.width || 2.5;
    const bGapHVal = sc.digitConfig?.bubbleSpacing?.horizontal || 1;
    const stepXVal = bwVal + bGapHVal;
    const totalContentW = digits * stepXVal - bGapHVal;
    const padX = 2;

    const labelW = estimateLabelWidth(label) + 4;
    let minBlockW = Math.max(20, labelW);
    if (label.includes('STUDENT') || label.includes('DANH')) {
      minBlockW = Math.max(minBlockW, 32);
    } else if (label.includes('EXAM') || label.includes('DE')) {
      minBlockW = Math.max(minBlockW, 28);
    }
    const blockW = Math.max(totalContentW + padX * 2, minBlockW);
    const startBubblesX = (mLeft - padX) + (blockW - totalContentW) / 2;

    const ox = toPx(startBubblesX);
    const oy = toPx(cbY + 6); // Add 6mm label space
    const bw = toPx(bwVal);
    const bh = toPx(sc.digitConfig?.bubbleSize?.height || 2.5);
    const bGapV = toPx(sc.digitConfig?.bubbleSpacing?.vertical || 1);
    const bGapH = toPx(bGapHVal);
    const labels = Array.from({ length: digits }, (_, i) => `roll${i + 1}`);

    fieldBlocks.student_code = {
      fieldType: 'QTYPE_INT',
      fieldLabels: labels,
      origin: [ox, oy],
      bubblesGap: bh + bGapV,  // step size (vertical)
      labelsGap: bw + bGapH,   // step size (horizontal)
      bubbleWidth: bw,
      bubbleHeight: bh,
      emptyValue: sc.digitConfig?.emptyValue || '',
    };
  }

  // ── Version code (INT) ────────────────────────────────────────────────
  if (vcOn) {
    const vx = mLeft + cW / 2 + 2;
    let labelText = (vc.label && vc.label.text) || 'EXAM CODE';
    if (labelText === 'Mã đề' || labelText === 'MĐ') {
      labelText = 'EXAM CODE';
    } else if (labelText === 'Số báo danh' || labelText === 'SBD') {
      labelText = 'STUDENT ID';
    }
    const label = removeVietnameseTones(labelText);

    const digits = vc.digits || 3;
    const bwVal = vc.digitConfig?.bubbleSize?.width || 2;
    const bGapHVal = vc.digitConfig?.bubbleSpacing?.horizontal || 0.5;
    const stepXVal = bwVal + bGapHVal;
    const totalContentW = digits * stepXVal - bGapHVal;
    const padX = 2;

    const labelW = estimateLabelWidth(label) + 4;
    let minBlockW = Math.max(20, labelW);
    if (label.includes('STUDENT') || label.includes('DANH')) {
      minBlockW = Math.max(minBlockW, 32);
    } else if (label.includes('EXAM') || label.includes('DE')) {
      minBlockW = Math.max(minBlockW, 28);
    }
    const blockW = Math.max(totalContentW + padX * 2, minBlockW);
    const startBubblesX = (vx - padX) + (blockW - totalContentW) / 2;

    const ox = toPx(startBubblesX);
    const oy = toPx(cbY + 6); // Add 6mm label space
    const bw = toPx(bwVal);
    const bh = toPx(vc.digitConfig?.bubbleSize?.height || 2);
    const bGapV = toPx(vc.digitConfig?.bubbleSpacing?.vertical || 0.5);
    const bGapH = toPx(bGapHVal);
    const labels = Array.from({ length: digits }, (_, i) => `ver${i + 1}`);

    fieldBlocks.version_code = {
      fieldType: 'QTYPE_INT',
      fieldLabels: labels,
      origin: [ox, oy],
      bubblesGap: bh + bGapV,  // step size (vertical)
      labelsGap: bw + bGapH,   // step size (horizontal)
      bubbleWidth: bw,
      bubbleHeight: bh,
      emptyValue: vc.digitConfig?.emptyValue || '',
    };
  }

  // ── 3. Calculate Answer Area Grid start Y and split columns ─────────────
  const aa = zones.answerArea;
  if (aa && aa.enabled !== false) {
    const gridY = (scOn || vcOn) ? (cbEndY + 6) : (hdrOn ? (hdrEndY + 5) : mTop);

    const gc = aa.gridConfig || {};
    const bc = gc.bubbleConfig || {};
    const qc = gc.questionNumberConfig || {};

    const startX = aa.startPosition?.x || mLeft;
    const ox = toPx(startX);
    const bw = toPx(bc.width || 4);
    const bh = toPx(bc.height || 4);
    const bGap = toPx(bc.spacing?.betweenOptions || 1);  // horizontal space
    const lGap = toPx(bc.spacing?.betweenRows || 8);     // vertical space
    const qNumW = toPx(qc.width || 8);
    const questionGap = toPx(bc.spacing?.betweenQuestions || 3);

    const totalQuestions = gc.totalQuestions || 30;
    const questionsPerRow = gc.questionsPerRow || 5;
    const numOptions = 4;

    const stepX = bw + bGap; // horizontal step between options (A, B, C, D)
    const stepY = bh + lGap; // vertical step between rows
    const cellW = qNumW + questionGap + numOptions * bw + (numOptions - 1) * bGap;

    const rows = Math.ceil(totalQuestions / questionsPerRow);

    // Apply vertical offset in the cells: cy + (cellH - bubbleH) / 2
    const cellHOffset = Math.round(((bc.height || 4) + (bc.spacing?.betweenRows || 8) - (bc.height || 4)) / 2);
    const oy = toPx(gridY + cellHOffset);

    // Split answer area into separate column FieldBlocks
    for (let col = 0; col < questionsPerRow; col++) {
      const colLabels = [];
      for (let r = 0; r < rows; r++) {
        const qIdx = col + r * questionsPerRow;
        if (qIdx < totalQuestions) {
          colLabels.push(`q${qIdx + 1}`);
        }
      }

      if (colLabels.length > 0) {
        const colStartX = ox + col * cellW + qNumW + questionGap;
        fieldBlocks[`answer_area_col_${col}`] = {
          fieldType: 'QTYPE_MCQ4',
          fieldLabels: colLabels,
          direction: 'horizontal',
          origin: [colStartX, oy],
          bubblesGap: stepX,
          labelsGap: stepY,
          bubbleWidth: bw,
          bubbleHeight: bh,
          emptyValue: '',
        };
      }
    }

    for (let i = 1; i <= totalQuestions; i += 1) {
      outputColumns.push(`q${i}`);
    }
  }

  return {
    name: template.name || 'OMR Template',
    pageDimensions: [pageW, pageH],
    bubbleDimensions: [toPx(4), toPx(4)],
    emptyValue: '',
    outputColumns,
    customLabels: {},
    preProcessors: [],
    fieldBlocks,
  };
}

module.exports = { convertTemplate };
