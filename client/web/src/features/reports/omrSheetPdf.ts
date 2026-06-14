/**
 * omrSheetPdf.ts
 *
 * Renders an OMR answer sheet PDF from the pre-computed JSON layout
 * (the same /json endpoint consumed by the mobile app).
 *
 * Design goals (intentionally minimal, mirroring OMRChecker sample4 style):
 *   1. NO fill colors, NO background rectangles. Black ink on white paper only.
 *   2. NO letters (A/B/C/D, 0-9) inside bubbles. Bubbles are empty outlined
 *      circles — the student fills them with pen.
 *   3. Question numbers printed BESIDE the bubbles (left of the row), not
 *      inside them. This matches what OMRChecker sample4 sheets look like
 *      and what the mobile overlay expects to see.
 *   4. Bubble positions are EXACTLY the same math as the mobile
 *      `bubbleDisplayCenter` helper: top-left template coord + bubbleW/2,
 *      bubbleH/2 → center. This guarantees the printed bubble and the
 *      mobile overlay (which draws a stroke-only circle at the same
 *      center) are perfectly aligned.
 *
 * Conversion: mm = px / (300 / 25.4) = px / 11.811
 */

import { jsPDF } from 'jspdf';

// ─── Types ─────────────────────────────────────────────────────────────────

/** OMRTemplate JSON format - same as server /json endpoint. */
export interface OMRTemplateJson {
  name: string;
  pageDimensions: [number, number]; // [width, height] in pixels @ 300 DPI
  bubbleDimensions: [number, number];
  emptyValue: string;
  outputColumns: string[];
  fieldBlocks: Record<string, OMRFieldBlockJson>;
  customLabels: Record<string, string[]>;
  preProcessors: Array<{ name: string; options: Record<string, unknown> }>;
  autoAlign?: boolean;
}

export interface OMRFieldBlockJson {
  fieldType: string;
  fieldLabels: string[];
  direction?: 'horizontal' | 'vertical';
  origin: [number, number];
  bubblesGap: number;
  labelsGap: number;
  bubbleWidth: number;
  bubbleHeight: number;
  emptyValue: string;
}

export interface OmrSheetParams {
  template: OMRTemplateJson;
  examTitle: string;
  schoolName: string;
  versionCode?: string;
}

interface PdfLayout {
  paper: { w: number; h: number };
  dpi: number;
  mmToPx: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DPI = 300;
export const MM_TO_PX = DPI / 25.4; // 11.811...
export const PX_TO_MM = 1 / MM_TO_PX;

const INK: [number, number, number] = [0, 0, 0]; // black
const PAPER: [number, number, number] = [255, 255, 255]; // white
const STROKE_WIDTH = 0.25; // mm - thin, looks like a printed circle
const QUESTION_NUMBER_OFFSET_MM = 4; // gap between question number text and first bubble

function setInk(doc: jsPDF): void {
  doc.setTextColor(...INK);
  doc.setDrawColor(...INK);
}

function setInkFill(doc: jsPDF): void {
  doc.setFillColor(...INK);
}

function setPaperFill(doc: jsPDF): void {
  doc.setFillColor(...PAPER);
}

// ─── Exported helpers for testing ──────────────────────────────────────────

/** Convert OMRTemplateJson → PdfLayout (paper size in mm). */
export function jsonToPdfLayout(json: OMRTemplateJson): PdfLayout {
  const [pwPx, phPx] = json.pageDimensions;
  return {
    paper: { w: pwPx * PX_TO_MM, h: phPx * PX_TO_MM },
    dpi: DPI,
    mmToPx: MM_TO_PX,
  };
}

/**
 * Top-left (x, y) of bubble (fieldIdx, valueIdx) in mm.
 * Mirrors mobile FieldBlock.fromConfig: the stored origin is the
 * bounding-box top-left of the first bubble, not the center.
 */
export function bubbleAtMm(
  block: OMRFieldBlockJson,
  fieldIdx: number,
  valueIdx: number,
  _layout: PdfLayout,
): { xMm: number; yMm: number } {
  const direction =
    block.direction ?? (block.fieldType.startsWith('QTYPE_MCQ') ? 'horizontal' : 'vertical');
  const [originXPx, originYPx] = block.origin;
  const isHorizontal = direction === 'horizontal';

  const xPx = isHorizontal
    ? originXPx + valueIdx * block.bubblesGap
    : originXPx + fieldIdx * block.labelsGap;
  const yPx = isHorizontal
    ? originYPx + fieldIdx * block.labelsGap
    : originYPx + valueIdx * block.bubblesGap;

  return { xMm: xPx * PX_TO_MM, yMm: yPx * PX_TO_MM };
}

/**
 * Center (cx, cy) of bubble (fieldIdx, valueIdx) in mm.
 * This is what `jsPDF.circle()` draws at - it takes a CENTER point, not
 * a top-left. Same formula as mobile's `bubbleDisplayCenter` helper.
 */
export function bubbleCenterAtMm(
  block: OMRFieldBlockJson,
  fieldIdx: number,
  valueIdx: number,
  layout: PdfLayout,
): { cxMm: number; cyMm: number } {
  const tl = bubbleAtMm(block, fieldIdx, valueIdx, layout);
  return {
    cxMm: tl.xMm + (block.bubbleWidth * PX_TO_MM) / 2,
    cyMm: tl.yMm + (block.bubbleHeight * PX_TO_MM) / 2,
  };
}

// ─── Entry point ───────────────────────────────────────────────────────────

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
  const layout = jsonToPdfLayout(template);
  const { paper } = layout;

  const cleanSchool = removeVietnameseTones(schoolName);
  const cleanTitle = removeVietnameseTones(examTitle);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [paper.w, paper.h],
  });

  // No background fill - the printed paper is white. jsPDF defaults to white
  // already, so we don't need to call setFillColor / rect.

  drawTitleHeader(doc, cleanSchool, cleanTitle);

  // Student code (if present)
  const scBlock = template.fieldBlocks.student_code;
  if (scBlock) {
    drawIntField(doc, scBlock, layout, 'STUDENT ID', null);
  }

  // Version code (if present)
  const vcBlock = template.fieldBlocks.version_code;
  if (vcBlock) {
    drawIntField(doc, vcBlock, layout, 'EXAM CODE', versionCode ?? null);
  }

  // Answer area (one block per column)
  for (const [name, block] of Object.entries(template.fieldBlocks)) {
    if (name.startsWith('answer_area_col_')) {
      drawMcqColumn(doc, block, layout);
    }
  }

  drawFooter(doc, layout);

  return doc.output('blob');
}

export async function generateOmrVersionSheetsPdf(
  params: OmrSheetParams & { versionCodes: string[] },
): Promise<Blob[]> {
  return Promise.all(
    params.versionCodes.map((code) =>
      generateOmrSheetPdf({ ...params, versionCode: code }),
    ),
  );
}

// ─── Drawing helpers ───────────────────────────────────────────────────────

function drawTitleHeader(doc: jsPDF, schoolName: string, examTitle: string): void {
  const pageW = doc.internal.pageSize.getWidth();
  const mLeft = 15;
  const mTop = 10;
  const cW = pageW - 2 * mLeft;

  setInk(doc);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(schoolName.toUpperCase(), mLeft + cW / 2, mTop + 5, {
    align: 'center',
    maxWidth: cW - 8,
  });

  doc.setFontSize(13);
  doc.text(examTitle.toUpperCase(), mLeft + cW / 2, mTop + 12, {
    align: 'center',
    maxWidth: cW - 8,
  });

  // Thin separator
  doc.setLineWidth(0.2);
  doc.line(mLeft, mTop + 16, mLeft + cW, mTop + 16);
}

function drawFooter(doc: jsPDF, layout: PdfLayout): void {
  const { paper } = layout;
  const mLeft = 15;
  const mRight = 15;
  const footerY = paper.h - 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  setInk(doc);
  doc.text('Smart Grading · OMR Answer Sheet', mLeft, footerY);
  doc.text('Page 1/1', paper.w - mRight, footerY, { align: 'right' });
}

/**
 * Draw an INT (vertical) field: 10 value bubbles (0-9 or 1-0) for each digit.
 * The student code shows empty bubbles; the version code may show one filled
 * digit per column when the form is generated for a specific version.
 */
function drawIntField(
  doc: jsPDF,
  block: OMRFieldBlockJson,
  layout: PdfLayout,
  label: string,
  filled: string | null,
): void {
  const isInt = block.fieldType === 'QTYPE_INT' || block.fieldType === 'QTYPE_INT_FROM_1';
  if (!isInt) return;

  const digitCount = block.fieldLabels.length;
  // QTYPE_INT shows 0..9 top-to-bottom. QTYPE_INT_FROM_1 shows 1..9,0.
  const bubbleValues =
    block.fieldType === 'QTYPE_INT_FROM_1'
      ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
      : ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  const baseTL = bubbleAtMm(block, 0, 0, layout);
  const radiusMm = (block.bubbleWidth * PX_TO_MM) / 2;

  // Draw label above the first digit column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setInk(doc);
  doc.text(label, baseTL.xMm, baseTL.yMm - 2);

  doc.setLineWidth(STROKE_WIDTH);

  for (let d = 0; d < digitCount; d++) {
    for (let v = 0; v < bubbleValues.length; v++) {
      const center = bubbleCenterAtMm(block, d, v, layout);
      const isFilled = filled !== null && String(filled[d]) === bubbleValues[v];

      if (isFilled) {
        // Filled (printed) bubble for version code: solid black, no letter.
        setInkFill(doc);
        doc.circle(center.cxMm, center.cyMm, radiusMm, 'F');
      } else {
        // Empty (unfilled) bubble: outline only. NO letter inside.
        setPaperFill(doc);
        doc.circle(center.cxMm, center.cyMm, radiusMm, 'FD');
      }
    }
  }
}

/**
 * Draw a single MCQ column (one field block = one "column" of questions).
 * Layout matches OMRChecker sample4:
 *   [ question number ]  [ ○ ○ ○ ○ ]   <-- one row per question
 *
 * Bubbles are empty circles (no A/B/C/D inside). Question numbers are
 * printed to the LEFT of the first bubble.
 */
function drawMcqColumn(
  doc: jsPDF,
  block: OMRFieldBlockJson,
  layout: PdfLayout,
): void {
  const bubbleValues =
    block.fieldType === 'QTYPE_MCQ4' ||
    block.fieldType === 'QTYPE_MCQ4_RTL'
      ? ['A', 'B', 'C', 'D']
      : ['A', 'B', 'C', 'D', 'E'];

  const radiusMm = (block.bubbleWidth * PX_TO_MM) / 2;

  setInk(doc);
  doc.setLineWidth(STROKE_WIDTH);
  setPaperFill(doc);

  // First bubble center's Y → row position. Question number is to the LEFT
  // of this center by (first bubble center X - question number offset).
  const firstCenter = bubbleCenterAtMm(block, 0, 0, layout);
  const questionNumberX = firstCenter.cxMm - radiusMm - QUESTION_NUMBER_OFFSET_MM;

  for (let fi = 0; fi < block.fieldLabels.length; fi++) {
    const rowLabel = block.fieldLabels[fi];

    // Question number (or column header) — small text, left of the row
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(rowLabel, questionNumberX, firstCenter.cyMm + fi * (block.labelsGap * PX_TO_MM), {
      align: 'right',
      baseline: 'middle',
    });

    // Bubbles for this question — empty outline only, NO letters inside
    for (let vi = 0; vi < bubbleValues.length; vi++) {
      const center = bubbleCenterAtMm(block, fi, vi, layout);
      doc.circle(center.cxMm, center.cyMm, radiusMm, 'FD');
    }
  }
}
