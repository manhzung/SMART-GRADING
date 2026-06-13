import { describe, it, expect } from 'vitest';
import { jsonToPdfLayout, bubbleAtMm, PX_TO_MM } from './omrSheetPdf';
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
