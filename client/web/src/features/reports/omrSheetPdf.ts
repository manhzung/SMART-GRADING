/**
 * omrSheetPdf.ts
 *
 * Renders OMR answer sheet PDF from pre-computed JSON layout (from /json endpoint).
 *
 * KEY CHANGE: This file no longer computes bubble positions from raw zones.
 * It uses the SAME pixel coordinates that the mobile app receives via /json endpoint.
 * This guarantees web-rendered PDF and mobile-detected bubbles are perfectly aligned.
 *
 * Conversion: mm = px / (300 / 25.4) = px / 11.811
 */

import { jsPDF } from 'jspdf';

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * OMRTemplate JSON format - same as server /json endpoint.
 */
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

// ─── Exported helpers for testing ──────────────────────────────────────────

/**
 * Convert OMRTemplateJson into a PdfLayout (paper size in mm).
 */
export function jsonToPdfLayout(json: OMRTemplateJson): PdfLayout {
  const [pwPx, phPx] = json.pageDimensions;
  return {
    paper: { w: pwPx * PX_TO_MM, h: phPx * PX_TO_MM },
    dpi: DPI,
    mmToPx: MM_TO_PX,
  };
}

/**
 * Compute the (x, y) position in mm of bubble (fieldIdx, valueIdx) in a field block.
 * Mirrors the mobile FieldBlock coordinate generation.
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

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, paper.w, paper.h, 'F');

  // Draw header
  drawHeader(doc, cleanSchool, cleanTitle);

  // Draw student code (if present)
  const scBlock = template.fieldBlocks.student_code;
  if (scBlock) {
    drawCodeField(doc, scBlock, 'STUDENT ID', null);
  }

  // Draw version code (if present)
  const vcBlock = template.fieldBlocks.version_code;
  if (vcBlock) {
    drawCodeField(doc, vcBlock, 'EXAM CODE', versionCode ?? null);
  }

  // Draw answer area (one block per column)
  for (const [name, block] of Object.entries(template.fieldBlocks)) {
    if (name.startsWith('answer_area_col_')) {
      drawAnswerColumn(doc, block);
    }
  }

  // Draw footer
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

function drawHeader(doc: jsPDF, schoolName: string, examTitle: string): void {
  const pageW = doc.internal.pageSize.getWidth();
  const mLeft = 15;
  const mTop = 15;
  const cW = pageW - 2 * mLeft;
  const headerH = 40;

  doc.setFillColor(240, 244, 248);
  doc.rect(mLeft, mTop, cW, headerH, 'F');
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(mLeft, mTop + headerH, mLeft + cW, mTop + headerH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 64, 175);
  doc.text(schoolName.toUpperCase(), mLeft + cW / 2, mTop + 10, {
    align: 'center',
    maxWidth: cW - 8,
  });

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(examTitle.toUpperCase(), mLeft + cW / 2, mTop + 22, {
    align: 'center',
    maxWidth: cW - 8,
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('OMR ANSWER SHEET  ·  SMART GRADING', mLeft + cW / 2, mTop + 33, {
    align: 'center',
    maxWidth: cW - 8,
  });
}

function drawCodeField(
  doc: jsPDF,
  block: OMRFieldBlockJson,
  label: string,
  filled: string | null,
): void {
  // For INT (vertical) blocks: each fieldLabel is a digit column, bubbleValues are 0-9
  const isInt = block.fieldType === 'QTYPE_INT' || block.fieldType === 'QTYPE_INT_FROM_1';
  if (!isInt) return;

  const digitCount = block.fieldLabels.length;
  const bubbleValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const [originXPx, originYPx] = block.origin;
  const baseX = originXPx * PX_TO_MM;
  const baseY = originYPx * PX_TO_MM;
  const bubbleWMm = block.bubbleWidth * PX_TO_MM;
  const bubbleHMm = block.bubbleHeight * PX_TO_MM;
  const stepXMm = block.bubblesGap * PX_TO_MM; // horizontal step between digits
  const stepYMm = block.labelsGap * PX_TO_MM; // vertical step between value options

  // Draw label above
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(label, baseX, baseY - 2);

  for (let d = 0; d < digitCount; d++) {
    const colX = baseX + d * stepXMm;
    for (let v = 0; v < bubbleValues.length; v++) {
      const y = baseY + v * stepYMm;
      const isFilled = filled !== null && String(filled[d]) === bubbleValues[v];
      doc.setFillColor(isFilled ? 30 : 255, isFilled ? 64 : 255, isFilled ? 175 : 255);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.25);
      doc.circle(colX + bubbleWMm / 2, y + bubbleHMm / 2, bubbleWMm / 2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(isFilled ? 255 : 100, isFilled ? 255 : 116, isFilled ? 255 : 139);
      doc.text(
        bubbleValues[v],
        colX + bubbleWMm / 2,
        y + bubbleHMm / 2,
        { align: 'center', baseline: 'middle' },
      );
    }
  }
}

function drawAnswerColumn(doc: jsPDF, block: OMRFieldBlockJson): void {
  const [originXPx, originYPx] = block.origin;
  const baseX = originXPx * PX_TO_MM;
  const baseY = originYPx * PX_TO_MM;
  const bubbleWMm = block.bubbleWidth * PX_TO_MM;
  const bubbleHMm = block.bubbleHeight * PX_TO_MM;
  const stepXMm = block.bubblesGap * PX_TO_MM; // horizontal step between options
  const stepYMm = block.labelsGap * PX_TO_MM; // vertical step between questions

  const bubbleValues =
    block.fieldType === 'QTYPE_MCQ4' || block.fieldType === 'QTYPE_MCQ4_RTL'
      ? ['A', 'B', 'C', 'D']
      : ['A', 'B', 'C', 'D', 'E'];

  for (let fi = 0; fi < block.fieldLabels.length; fi++) {
    for (let vi = 0; vi < bubbleValues.length; vi++) {
      const x = baseX + vi * stepXMm;
      const y = baseY + fi * stepYMm;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.25);
      doc.circle(x + bubbleWMm / 2, y + bubbleHMm / 2, bubbleWMm / 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        bubbleValues[vi],
        x + bubbleWMm / 2,
        y + bubbleHMm / 2,
        { align: 'center', baseline: 'middle' },
      );
    }
  }
}

function drawFooter(doc: jsPDF, layout: PdfLayout): void {
  const { paper } = layout;
  const fH = 12;
  const fY = paper.h - 15 - fH;
  const mLeft = 15;
  const cW = paper.w - 2 * mLeft;

  doc.setFillColor(248, 250, 252);
  doc.rect(mLeft, fY, cW, fH, 'F');
  doc.setDrawColor(220, 225, 235);
  doc.setLineWidth(0.3);
  doc.line(mLeft, fY, mLeft + cW, fY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('Smart Grading  ·  OMR Answer Sheet', mLeft + 4, fY + 4);
  doc.text('Page 1/1', mLeft + cW - 4, fY + 4, { align: 'right' });
}
