import { describe, it, expect } from 'vitest';
import { generateOmrSheetPdf, type OMRTemplateJson } from './omrSheetPdf';

// Realistic template that the SERVER would return from /json endpoint
// (matches the snapshot of A4 default template).
// This is the EXACT shape that goes into generateOmrSheetPdf.
describe('verify realistic A4 template PDF (from server snapshot)', () => {
  it('generates correct PDF with all answer area bubbles', async () => {
    const t: OMRTemplateJson = {
      name: 'A4 Default Test',
      pageDimensions: [2480, 3508],
      bubbleDimensions: [47, 47],
      emptyValue: '',
      outputColumns: Array.from({ length: 30 }, (_, i) => `q${i + 1}`),
      fieldBlocks: {
        student_code: {
          fieldType: 'QTYPE_INT',
          fieldLabels: ['roll1', 'roll2', 'roll3'],
          origin: [286, 780],
          bubblesGap: 42,
          labelsGap: 42,
          bubbleWidth: 30,
          bubbleHeight: 30,
          emptyValue: '',
        },
        version_code: {
          fieldType: 'QTYPE_INT',
          fieldLabels: ['ver1', 'ver2', 'ver3'],
          origin: [1364, 780],
          bubblesGap: 30,
          labelsGap: 30,
          bubbleWidth: 24,
          bubbleHeight: 24,
          emptyValue: '',
        },
        answer_area_col_0: {
          fieldType: 'QTYPE_MCQ4',
          fieldLabels: ['q1', 'q6', 'q11', 'q16', 'q21', 'q26'],
          direction: 'horizontal',
          origin: [365, 1299],
          bubblesGap: 59,
          labelsGap: 141,
          bubbleWidth: 47,
          bubbleHeight: 47,
          emptyValue: '',
        },
        answer_area_col_1: {
          fieldType: 'QTYPE_MCQ4',
          fieldLabels: ['q2', 'q7', 'q12', 'q17', 'q22', 'q27'],
          direction: 'horizontal',
          origin: [718, 1299],
          bubblesGap: 59,
          labelsGap: 141,
          bubbleWidth: 47,
          bubbleHeight: 47,
          emptyValue: '',
        },
        answer_area_col_2: {
          fieldType: 'QTYPE_MCQ4',
          fieldLabels: ['q3', 'q8', 'q13', 'q18', 'q23', 'q28'],
          direction: 'horizontal',
          origin: [1071, 1299],
          bubblesGap: 59,
          labelsGap: 141,
          bubbleWidth: 47,
          bubbleHeight: 47,
          emptyValue: '',
        },
        answer_area_col_3: {
          fieldType: 'QTYPE_MCQ4',
          fieldLabels: ['q4', 'q9', 'q14', 'q19', 'q24', 'q29'],
          direction: 'horizontal',
          origin: [1424, 1299],
          bubblesGap: 59,
          labelsGap: 141,
          bubbleWidth: 47,
          bubbleHeight: 47,
          emptyValue: '',
        },
        answer_area_col_4: {
          fieldType: 'QTYPE_MCQ4',
          fieldLabels: ['q5', 'q10', 'q15', 'q20', 'q25', 'q30'],
          direction: 'horizontal',
          origin: [1777, 1299],
          bubblesGap: 59,
          labelsGap: 141,
          bubbleWidth: 47,
          bubbleHeight: 47,
          emptyValue: '',
        },
      },
      customLabels: {},
      preProcessors: [],
    };

    const blob = await generateOmrSheetPdf({ template: t, examTitle: 'Test', schoolName: 'School' });

    // Save and inspect the content stream
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const text = new TextDecoder('latin1').decode(bytes);

    // Count fill colors in the stream:
    // 0. g = black (BAD), 1. g = white (GOOD)
    const blackFillCount = (text.match(/0\. g/g) ?? []).length;
    const whiteFillCount = (text.match(/1\. g/g) ?? []).length;
    const pathCount = (text.match(/B\n/g) ?? []).length;

    console.log('black fills (0. g):', blackFillCount);
    console.log('white fills (1. g):', whiteFillCount);
    console.log('B paths (fill+stroke circles):', pathCount);

    // For a 30-question template with 5 columns × 6 questions × 4 options = 120 answer bubbles
    // Plus student code (3 digits × 10 values = 30) and version code (3 × 10 = 30) = 180 bubbles total
    expect(pathCount).toBeGreaterThan(100);

    // We expect MORE white fills than black fills (only text + line strokes are black)
    // Most bubbles should be filled with white (not black)
    expect(whiteFillCount).toBeGreaterThan(blackFillCount);
  });
});
