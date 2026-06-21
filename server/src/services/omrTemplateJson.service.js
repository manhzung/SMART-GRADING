/**
 * OMR Template zones (mm) → Flutter FieldBlock JSON (pixels @ 300 DPI).
 *
 * Conversion: px = mm * 300 / 25.4
 *
 * This is the SINGLE SOURCE OF TRUTH for OMR bubble coordinates.
 * Both Flutter mobile (via /json endpoint) and Web client (via jsPDF) consume this output.
 * Guarantees web-rendered PDF and mobile-detected bubbles are perfectly aligned.
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

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT COMPUTATION - exported for testing
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute the Y-axis flow positions (in mm) for header → code blocks → answer area.
 * @returns {{
 *   hdrEndY: number,
 *   cbY: number,
 *   codeRowH: number,
 *   cbEndY: number,
 *   mTop: number,
 *   mLeft: number,
 *   cW: number,
 *   paperW: number
 * }}
 */
function computeLayout({ pageConfig = {}, zones = {} }) {
  const paperSize = pageConfig.paperSize || 'A4';
  const pageSizesMm = { A4: [210, 297], A5: [148, 210], A3: [297, 420] };
  const [paperW] = pageSizesMm[paperSize] || pageSizesMm.A4;

  const mTop = pageConfig.margins?.top || 15;
  const mLeft = pageConfig.margins?.left || 15;
  const mRight = pageConfig.margins?.right || 15;
  const cW = paperW - mLeft - mRight;

  const hdrOn = zones.header?.enabled !== false;
  const hdrH = hdrOn ? (zones.header?.height || 40) : 0;
  const hdrEndY = hdrOn ? (mTop + hdrH) : mTop;

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

  return { hdrEndY, cbY, codeRowH, cbEndY, mTop, mLeft, cW, paperW };
}

/**
 * Build a student code (INT) FieldBlock at the given Y position.
 * @returns {Object|null} fieldBlock config or null if disabled
 */
function buildStudentCodeBlock(sc, layout) {
  if (!sc || sc.enabled === false) return null;

  const { cbY, mLeft } = layout;
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

  const ox = mmToPx(startBubblesX);
  const oy = mmToPx(cbY + 6);
  const bw = mmToPx(bwVal);
  const bh = mmToPx(sc.digitConfig?.bubbleSize?.height || 2.5);
  const bGapV = mmToPx(sc.digitConfig?.bubbleSpacing?.vertical || 1);
  const bGapH = mmToPx(bGapHVal);
  const labels = Array.from({ length: digits }, (_, i) => `roll${i + 1}`);

  return {
    fieldType: 'QTYPE_INT',
    fieldLabels: labels,
    origin: [ox, oy],
    bubblesGap: bh + bGapV,
    labelsGap: bw + bGapH,
    bubbleWidth: bw,
    bubbleHeight: bh,
    emptyValue: sc.digitConfig?.emptyValue || '',
  };
}

/**
 * Build a version code (INT) FieldBlock.
 */
function buildVersionCodeBlock(vc, layout) {
  if (!vc || vc.enabled === false) return null;

  const { cbY, mLeft, cW } = layout;
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

  const ox = mmToPx(startBubblesX);
  const oy = mmToPx(cbY + 6);
  const bw = mmToPx(bwVal);
  const bh = mmToPx(vc.digitConfig?.bubbleSize?.height || 2);
  const bGapV = mmToPx(vc.digitConfig?.bubbleSpacing?.vertical || 0.5);
  const bGapH = mmToPx(bGapHVal);
  const labels = Array.from({ length: digits }, (_, i) => `ver${i + 1}`);

  return {
    fieldType: 'QTYPE_INT',
    fieldLabels: labels,
    origin: [ox, oy],
    bubblesGap: bh + bGapV,
    labelsGap: bw + bGapH,
    bubbleWidth: bw,
    bubbleHeight: bh,
    emptyValue: vc.digitConfig?.emptyValue || '',
  };
}

/**
 * Build answer area FieldBlocks (one per column).
 */
function buildAnswerAreaBlocks(aa, layout) {
  if (!aa || aa.enabled === false) return [];

  const { mLeft, cbEndY, hdrEndY } = layout;
  const gridY = (cbEndY !== hdrEndY || (aa.startPosition && aa.startPosition.y !== undefined))
    ? (cbEndY + 6)
    : (hdrEndY + 5);

  const gc = aa.gridConfig || {};
  const bc = gc.bubbleConfig || {};
  const qc = gc.questionNumberConfig || {};

  const startX = aa.startPosition?.x || mLeft;
  const ox = mmToPx(startX);
  const bw = mmToPx(bc.width || 4);
  const bh = mmToPx(bc.height || 4);
  const bGap = mmToPx(bc.spacing?.betweenOptions || 1);
  const lGap = mmToPx(bc.spacing?.betweenRows || 8);
  const qNumW = mmToPx(qc.width || 8);
  const questionGap = mmToPx(bc.spacing?.betweenQuestions || 3);

  const totalQuestions = gc.totalQuestions || 30;
  const questionsPerRow = gc.questionsPerRow || 5;
  const numOptions = 4;

  const stepX = bw + bGap;
  const stepY = bh + lGap;
  const cellW = qNumW + questionGap + numOptions * bw + (numOptions - 1) * bGap;
  const rows = Math.ceil(totalQuestions / questionsPerRow);

  // Center bubble vertically in its cell: offset from cell top to bubble center
  // = (cellH - bubbleH) / 2 = ((bh + lGap) - bh) / 2 = lGap / 2
  // lGapMm is the row spacing in mm; divide by 2 to get the center offset.
  // (bc.height || 4) gives the bubble height in mm; the +lGapMm -bc.height terms
  // cancel out, leaving just lGapMm, so cellHOffsetMm = lGapMm / 2.
  const lGapMm = bc.spacing?.betweenRows || 8;
  const cellHOffsetMm = ((bc.height || 4) + lGapMm - (bc.height || 4)) / 2; // = lGapMm / 2
  const oy = mmToPx(gridY + cellHOffsetMm);

  const blocks = [];
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
      blocks.push({
        name: `answer_area_col_${col}`,
        config: {
          fieldType: 'QTYPE_MCQ4',
          fieldLabels: colLabels,
          direction: 'horizontal',
          origin: [colStartX, oy],
          bubblesGap: stepX,
          labelsGap: stepY,
          bubbleWidth: bw,
          bubbleHeight: bh,
          emptyValue: '',
        },
      });
    }
  }
  return blocks;
}

/**
 * Main conversion: zones (mm) → Flutter FieldBlock JSON (pixels @ 300 DPI).
 * This is the SINGLE SOURCE OF TRUTH for OMR bubble coordinates.
 */
function convertTemplate(template) {
  const { pageConfig = {}, zones = {}, scannerConfig = {} } = template;

  const paperSize = pageConfig.paperSize || 'A4';
  const pageSizes = { A4: [2480, 3508], A5: [1748, 2480], A3: [3508, 4961] };
  const [pageW, pageH] = pageSizes[paperSize] || pageSizes.A4;

  const layout = computeLayout({ pageConfig, zones });
  const fieldBlocks = {};
  const outputColumns = [];

  // Student code
  const scBlock = buildStudentCodeBlock(zones.studentCode, layout);
  if (scBlock) {
    fieldBlocks.student_code = scBlock;
  }

  // Version code
  const vcBlock = buildVersionCodeBlock(zones.versionCode, layout);
  if (vcBlock) {
    fieldBlocks.version_code = vcBlock;
  }

  // Answer area
  const aaBlocks = buildAnswerAreaBlocks(zones.answerArea, layout);
  for (const { name, config } of aaBlocks) {
    fieldBlocks[name] = config;
  }

  for (let i = 1; i <= (zones.answerArea?.gridConfig?.totalQuestions || 0); i += 1) {
    outputColumns.push(`q${i}`);
  }

  // autoAlign flag - default true for backward compat
  const autoAlign = scannerConfig.autoAlign !== false;

  // bubbleDimensions root = max bubble size across all blocks
  // (used as fallback by clients that don't read block-level sizes)
  let maxBw = 0, maxBh = 0;
  if (scBlock) { maxBw = Math.max(maxBw, scBlock.bubbleWidth); maxBh = Math.max(maxBh, scBlock.bubbleHeight); }
  if (vcBlock) { maxBw = Math.max(maxBw, vcBlock.bubbleWidth); maxBh = Math.max(maxBh, vcBlock.bubbleHeight); }
  for (const { config } of aaBlocks) { maxBw = Math.max(maxBw, config.bubbleWidth); maxBh = Math.max(maxBh, config.bubbleHeight); }
  // If no blocks, fall back to default 4mm for backward compat
  const bubbleW = maxBw || mmToPx(4);
  const bubbleH = maxBh || mmToPx(4);

  return {
    name: template.name || 'OMR Template',
    pageDimensions: [pageW, pageH],
    bubbleDimensions: [bubbleW, bubbleH],
    emptyValue: '',
    outputColumns,
    customLabels: {},
    preProcessors: [],
    fieldBlocks,
    autoAlign,
  };
}

module.exports = {
  convertTemplate,
  // Exported for testing only
  computeLayout,
  buildStudentCodeBlock,
  buildVersionCodeBlock,
  buildAnswerAreaBlocks,
  mmToPx,
};
