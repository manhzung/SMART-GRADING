import { describe, it, expect } from 'vitest';
import { jsonToPdfLayout, bubbleAtMm, bubbleCenterAtMm, PX_TO_MM } from './omrSheetPdf';
import type { OMRFieldBlockJson } from './omrSheetPdf';

describe('jsonToPdfLayout', () => {
  it('converts page dimensions from px @ 300 DPI to mm', () => {
    const layout = jsonToPdfLayout({
      name: 't',
      pageDimensions: [2480, 3508],
      bubbleDimensions: [47, 47],
      emptyValue: '',
      fieldBlocks: {},
      customLabels: {},
      preProcessors: [],
      outputColumns: [],
    });
    // 2480px / 11.811 = 210mm
    expect(layout.paper.w).toBeCloseTo(210, 1);
    expect(layout.paper.h).toBeCloseTo(297, 1);
  });

  it('uses 300 DPI constant', () => {
    const layout = jsonToPdfLayout({
      name: 't',
      pageDimensions: [1748, 2480], // A5
      bubbleDimensions: [35, 35],
      emptyValue: '',
      fieldBlocks: {},
      customLabels: {},
      preProcessors: [],
      outputColumns: [],
    });
    expect(layout.dpi).toBe(300);
    expect(layout.mmToPx).toBeCloseTo(11.811, 3);
  });
});

describe('bubbleAtMm', () => {
  it('converts field block origin from px to mm', () => {
    const block: OMRFieldBlockJson = {
      fieldType: 'QTYPE_MCQ4',
      fieldLabels: ['q1'],
      origin: [200, 400],
      bubblesGap: 55,
      labelsGap: 45,
      bubbleWidth: 35,
      bubbleHeight: 35,
      emptyValue: '',
    };
    const layout = { dpi: 300, mmToPx: 300 / 25.4, paper: { w: 210, h: 297 } };
    // origin = (200, 400) px = (16.93, 33.86) mm
    const pos = bubbleAtMm(block, 0, 0, layout);
    expect(pos.xMm).toBeCloseTo(200 * PX_TO_MM, 2);
    expect(pos.yMm).toBeCloseTo(400 * PX_TO_MM, 2);
  });

  it('applies bubblesGap along X for horizontal MCQ4', () => {
    const block: OMRFieldBlockJson = {
      fieldType: 'QTYPE_MCQ4',
      fieldLabels: ['q1'],
      direction: 'horizontal',
      origin: [0, 0],
      bubblesGap: 55,
      labelsGap: 45,
      bubbleWidth: 35,
      bubbleHeight: 35,
      emptyValue: '',
    };
    const layout = { dpi: 300, mmToPx: 300 / 25.4, paper: { w: 210, h: 297 } };
    expect(bubbleAtMm(block, 0, 0, layout).xMm).toBeCloseTo(0, 2);
    expect(bubbleAtMm(block, 0, 1, layout).xMm).toBeCloseTo(55 * PX_TO_MM, 2);
    expect(bubbleAtMm(block, 0, 3, layout).xMm).toBeCloseTo(3 * 55 * PX_TO_MM, 2);
  });

  it('applies labelsGap along Y for horizontal MCQ4', () => {
    const block: OMRFieldBlockJson = {
      fieldType: 'QTYPE_MCQ4',
      fieldLabels: ['q1', 'q2', 'q3'],
      direction: 'horizontal',
      origin: [0, 0],
      bubblesGap: 55,
      labelsGap: 45,
      bubbleWidth: 35,
      bubbleHeight: 35,
      emptyValue: '',
    };
    const layout = { dpi: 300, mmToPx: 300 / 25.4, paper: { w: 210, h: 297 } };
    expect(bubbleAtMm(block, 0, 0, layout).yMm).toBeCloseTo(0, 2);
    expect(bubbleAtMm(block, 1, 0, layout).yMm).toBeCloseTo(45 * PX_TO_MM, 2);
    expect(bubbleAtMm(block, 2, 0, layout).yMm).toBeCloseTo(2 * 45 * PX_TO_MM, 2);
  });

  it('handles vertical INT (bubblesGap along Y)', () => {
    const block: OMRFieldBlockJson = {
      fieldType: 'QTYPE_INT',
      fieldLabels: ['roll1'],
      direction: 'vertical',
      origin: [100, 200],
      bubblesGap: 40,
      labelsGap: 0,
      bubbleWidth: 35,
      bubbleHeight: 35,
      emptyValue: '',
    };
    const layout = { dpi: 300, mmToPx: 300 / 25.4, paper: { w: 210, h: 297 } };
    // For vertical INT, origin.y is the first bubble; subsequent values go DOWN
    expect(bubbleAtMm(block, 0, 0, layout).xMm).toBeCloseTo(100 * PX_TO_MM, 2);
    expect(bubbleAtMm(block, 0, 0, layout).yMm).toBeCloseTo(200 * PX_TO_MM, 2);
    expect(bubbleAtMm(block, 0, 1, layout).yMm).toBeCloseTo((200 + 40) * PX_TO_MM, 2);
  });
});

describe('bubbleCenterAtMm', () => {
  // Mobile convention: bubble.x/y in template = TOP-LEFT of bubble's bounding box.
  // The CENTER (where Canvas.drawCircle draws) is (x + bubbleW/2, y + bubbleH/2).
  // This is the SAME math as the mobile `bubbleDisplayCenter` helper, just in mm.
  it('returns top-left + bubbleW/2 horizontally', () => {
    const block: OMRFieldBlockJson = {
      fieldType: 'QTYPE_MCQ4',
      fieldLabels: ['q1'],
      direction: 'horizontal',
      origin: [200, 400],
      bubblesGap: 55,
      labelsGap: 45,
      bubbleWidth: 35,
      bubbleHeight: 35,
      emptyValue: '',
    };
    const layout = { dpi: 300, mmToPx: 300 / 25.4, paper: { w: 210, h: 297 } };
    const center = bubbleCenterAtMm(block, 0, 0, layout);
    // top-left = (200, 400) px; center = (200 + 17.5, 400 + 17.5) px
    expect(center.cxMm).toBeCloseTo((200 + 35 / 2) * PX_TO_MM, 2);
    expect(center.cyMm).toBeCloseTo((400 + 35 / 2) * PX_TO_MM, 2);
  });

  it('applies bubblesGap along X for horizontal MCQ4 (center positions)', () => {
    const block: OMRFieldBlockJson = {
      fieldType: 'QTYPE_MCQ4',
      fieldLabels: ['q1'],
      direction: 'horizontal',
      origin: [0, 0],
      bubblesGap: 55,
      labelsGap: 45,
      bubbleWidth: 35,
      bubbleHeight: 35,
      emptyValue: '',
    };
    const layout = { dpi: 300, mmToPx: 300 / 25.4, paper: { w: 210, h: 297 } };
    // Centers: A=(17.5, 17.5), B=(72.5, 17.5), C=(127.5, 17.5), D=(182.5, 17.5) px
    expect(bubbleCenterAtMm(block, 0, 0, layout).cxMm).toBeCloseTo((35 / 2) * PX_TO_MM, 2);
    expect(bubbleCenterAtMm(block, 0, 1, layout).cxMm).toBeCloseTo((55 + 35 / 2) * PX_TO_MM, 2);
    expect(bubbleCenterAtMm(block, 0, 3, layout).cxMm).toBeCloseTo((3 * 55 + 35 / 2) * PX_TO_MM, 2);
  });

  it('applies labelsGap along Y for horizontal MCQ4 (center positions)', () => {
    const block: OMRFieldBlockJson = {
      fieldType: 'QTYPE_MCQ4',
      fieldLabels: ['q1', 'q2', 'q3'],
      direction: 'horizontal',
      origin: [0, 0],
      bubblesGap: 55,
      labelsGap: 45,
      bubbleWidth: 35,
      bubbleHeight: 35,
      emptyValue: '',
    };
    const layout = { dpi: 300, mmToPx: 300 / 25.4, paper: { w: 210, h: 297 } };
    // Centers q1: y=17.5, q2: y=45+17.5=62.5, q3: y=90+17.5=107.5 px
    expect(bubbleCenterAtMm(block, 0, 0, layout).cyMm).toBeCloseTo((35 / 2) * PX_TO_MM, 2);
    expect(bubbleCenterAtMm(block, 1, 0, layout).cyMm).toBeCloseTo((45 + 35 / 2) * PX_TO_MM, 2);
    expect(bubbleCenterAtMm(block, 2, 0, layout).cyMm).toBeCloseTo((2 * 45 + 35 / 2) * PX_TO_MM, 2);
  });

  it('vertical INT: centers spread along Y (center positions)', () => {
    const block: OMRFieldBlockJson = {
      fieldType: 'QTYPE_INT',
      fieldLabels: ['roll1'],
      direction: 'vertical',
      origin: [100, 200],
      bubblesGap: 40,
      labelsGap: 0,
      bubbleWidth: 35,
      bubbleHeight: 35,
      emptyValue: '',
    };
    const layout = { dpi: 300, mmToPx: 300 / 25.4, paper: { w: 210, h: 297 } };
    // Center of value 0 = (117.5, 217.5) px; value 1 = (117.5, 257.5) px
    expect(bubbleCenterAtMm(block, 0, 0, layout).cxMm).toBeCloseTo((100 + 35 / 2) * PX_TO_MM, 2);
    expect(bubbleCenterAtMm(block, 0, 0, layout).cyMm).toBeCloseTo((200 + 35 / 2) * PX_TO_MM, 2);
    expect(bubbleCenterAtMm(block, 0, 1, layout).cyMm).toBeCloseTo((200 + 40 + 35 / 2) * PX_TO_MM, 2);
  });
});
