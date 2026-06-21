const { convertTemplate } = require('../../../src/services/omrTemplateJson.service');

describe('omrTemplateJson.service - snapshot tests', () => {
  test('A4 default template converts to expected JSON', () => {
    const template = {
      name: 'A4 Default Test',
      pageConfig: { paperSize: 'A4', margins: { top: 15, bottom: 15, left: 15, right: 15 } },
      zones: {
        header: { enabled: true, height: 40 },
        studentCode: { enabled: true, digits: 3, digitConfig: { bubbleSize: { width: 2.5, height: 2.5 }, bubbleSpacing: { horizontal: 1, vertical: 1 } } },
        versionCode: { enabled: true, digits: 3, digitConfig: { bubbleSize: { width: 2, height: 2 }, bubbleSpacing: { horizontal: 0.5, vertical: 0.5 } } },
        answerArea: { enabled: true, startPosition: { x: 20, y: 90 }, gridConfig: { totalQuestions: 30, questionsPerRow: 5, bubbleConfig: { width: 4, height: 4, spacing: { betweenOptions: 1, betweenRows: 8, betweenQuestions: 3 } }, questionNumberConfig: { enabled: true, width: 8 } } },
        footer: { enabled: true, height: 12 },
      },
    };

    const result = convertTemplate(template);

    // Snapshot the entire output. If this changes, review carefully.
    expect(result).toMatchSnapshot();
  });

  test('A5 15-question template (matches omr_template.from15Question)', () => {
    const template = {
      name: '15q A5',
      pageConfig: { paperSize: 'A5' },
      zones: {
        header: { enabled: false },
        studentCode: { enabled: true, digits: 2, digitConfig: { bubbleSize: { width: 3, height: 3 }, bubbleSpacing: { horizontal: 1, vertical: 1 } } },
        versionCode: { enabled: true, digits: 2, digitConfig: { bubbleSize: { width: 3, height: 3 }, bubbleSpacing: { horizontal: 1, vertical: 1 } } },
        answerArea: { enabled: true, startPosition: { x: 20, y: 50 }, gridConfig: { totalQuestions: 15, questionsPerRow: 5, bubbleConfig: { width: 3, height: 3, spacing: { betweenOptions: 1, betweenRows: 4, betweenQuestions: 2 } }, questionNumberConfig: { enabled: false } } },
        footer: { enabled: false },
      },
    };

    const result = convertTemplate(template);
    expect(result).toMatchSnapshot();
  });
});

describe('Layout computation - Y flow', () => {
  test('header occupies top of page', () => {
    const template = {
      pageConfig: { paperSize: 'A4', margins: { top: 15 } },
      zones: {
        header: { enabled: true, height: 40 },
        studentCode: { enabled: false },
        versionCode: { enabled: false },
        answerArea: { enabled: true, startPosition: { x: 20, y: 60 }, gridConfig: { totalQuestions: 5, questionsPerRow: 5, bubbleConfig: { width: 4, height: 4, spacing: { betweenOptions: 1, betweenRows: 8 } }, questionNumberConfig: { enabled: false } } },
      },
    };
    const result = convertTemplate(template);
    // answer_area_col_0 origin Y = cell CENTER (gridY + lGap/2)mm in px
    // For A4 with header 40mm: mTop=15, hdrEndY=55, cbEndY=55 (no code blocks)
    // gridY = 55 + 6 = 61; lGap=8mm → cellHOffset = 8/2 = 4mm
    // final = 65mm * 11.811 = 767.7 → 768px
    expect(result.fieldBlocks.answer_area_col_0.origin[1]).toBe(768);
  });

  test('code blocks push answer area down', () => {
    const template = {
      pageConfig: { paperSize: 'A4', margins: { top: 15 } },
      zones: {
        header: { enabled: true, height: 40 },
        studentCode: { enabled: true, digits: 3, digitConfig: { bubbleSize: { width: 2.5, height: 2.5 }, bubbleSpacing: { horizontal: 1, vertical: 1 } } },
        versionCode: { enabled: false },
        answerArea: { enabled: true, startPosition: { x: 20, y: 90 }, gridConfig: { totalQuestions: 5, questionsPerRow: 5, bubbleConfig: { width: 4, height: 4, spacing: { betweenOptions: 1, betweenRows: 8 } }, questionNumberConfig: { enabled: false } } },
      },
    };
    const result = convertTemplate(template);
    // code block height ≈ 40mm; answer Y pushed down; must exceed the
    // threshold + cellHOffset (lGap/2 = 4mm = 47px added to every answer area block).
    expect(result.fieldBlocks.answer_area_col_0.origin[1]).toBeGreaterThan(1100);
  });

  test('centering offset applies when bc.height is undefined (operator precedence regression)', () => {
    // Without explicit parentheses around (bc.height || 4), the expression
    // ((bc.height || 4 + lGapMm - (bc.height || 4)) / 2) parses as
    // ((bc.height || (4 + lGapMm) - (bc.height || 4)) / 2) which is wrong.
    // This test uses no explicit bubble height to catch that bug.
    const template = {
      pageConfig: { paperSize: 'A4' },
      zones: {
        header: { enabled: false },
        studentCode: { enabled: false },
        versionCode: { enabled: false },
        answerArea: {
          enabled: true,
          gridConfig: {
            totalQuestions: 5,
            questionsPerRow: 5,
            bubbleConfig: {
              width: 4,
              // NOTE: no height — must use default (4mm)
              spacing: { betweenOptions: 1, betweenRows: 8 },
            },
            questionNumberConfig: { enabled: false },
          },
        },
      },
    };
    const result = convertTemplate(template);
    // mTop=15, no header/code blocks → hdrEndY=cbEndY=15, gridY=20mm
    // bc.height defaults to 4, lGap=8 → cellHOffset = 8/2 = 4mm
    // oy = mmToPx(20 + 4) = mmToPx(24) = round(24*11.811) = round(283.464) = 283px
    expect(result.fieldBlocks.answer_area_col_0.origin[1]).toBe(283);
  });
});

describe('Answer area - field block generation', () => {
  test('50 questions, 5/row → 10 columns (one block per column)', () => {
    // Current behavior: one FieldBlock per column, each holds multiple questions.
    // For 50 questions / 5 per row = 10 rows, 5 columns → 5 FieldBlocks total.
    // (Each block contains all questions in its column.)
    const template = {
      pageConfig: { paperSize: 'A4' },
      zones: {
        header: { enabled: false },
        studentCode: { enabled: false },
        versionCode: { enabled: false },
        answerArea: { enabled: true, startPosition: { x: 20 }, gridConfig: { totalQuestions: 50, questionsPerRow: 5, bubbleConfig: { width: 4, height: 4, spacing: { betweenOptions: 1, betweenRows: 8, betweenQuestions: 3 } }, questionNumberConfig: { width: 8 } } },
      },
    };
    const result = convertTemplate(template);
    const colBlocks = Object.keys(result.fieldBlocks).filter((k) => k.startsWith('answer_area_col_'));
    // One block per questionPerRow column
    expect(colBlocks).toHaveLength(5);
    // First column should have 10 questions (q1, q6, q11, ..., q46)
    expect(result.fieldBlocks.answer_area_col_0.fieldLabels).toHaveLength(10);
    expect(result.fieldBlocks.answer_area_col_0.fieldLabels[0]).toBe('q1');
    expect(result.fieldBlocks.answer_area_col_0.fieldLabels[9]).toBe('q46');
  });

  test('bubblesGap = bubbleW + betweenOptions (horizontal step)', () => {
    const template = {
      pageConfig: { paperSize: 'A4' },
      zones: {
        header: { enabled: false },
        answerArea: { enabled: true, gridConfig: { totalQuestions: 5, questionsPerRow: 5, bubbleConfig: { width: 4, height: 4, spacing: { betweenOptions: 1, betweenRows: 8, betweenQuestions: 3 } }, questionNumberConfig: { width: 8 } } },
      },
    };
    const result = convertTemplate(template);
    // bubbleW = round(4 * 11.811) = 47; betweenOptions = round(1 * 11.811) = 12
    // bubblesGap = 47 + 12 = 59
    expect(result.fieldBlocks.answer_area_col_0.bubblesGap).toBe(59);
  });

  test('labelsGap = bubbleH + betweenRows (vertical step)', () => {
    const template = {
      pageConfig: { paperSize: 'A4' },
      zones: {
        header: { enabled: false },
        answerArea: { enabled: true, gridConfig: { totalQuestions: 5, questionsPerRow: 5, bubbleConfig: { width: 4, height: 4, spacing: { betweenOptions: 1, betweenRows: 8 } }, questionNumberConfig: { enabled: false } } },
      },
    };
    const result = convertTemplate(template);
    // bubbleH = 47; betweenRows = round(8 * 11.811) = 94
    // labelsGap = 47 + 94 = 141
    expect(result.fieldBlocks.answer_area_col_0.labelsGap).toBe(141);
  });
});

describe('autoAlign field in output', () => {
  test('omr template without autoAlign config → output autoAlign = true (default)', () => {
    const template = {
      pageConfig: { paperSize: 'A4' },
      zones: { answerArea: { enabled: false } },
    };
    const result = convertTemplate(template);
    expect(result.autoAlign).toBe(true);
  });

  test('omr template with autoAlign = false in scannerConfig → output autoAlign = false', () => {
    const template = {
      pageConfig: { paperSize: 'A4' },
      scannerConfig: { autoAlign: false },
      zones: { answerArea: { enabled: false } },
    };
    const result = convertTemplate(template);
    expect(result.autoAlign).toBe(false);
  });

  test('omr template with autoAlign = true in scannerConfig → output autoAlign = true', () => {
    const template = {
      pageConfig: { paperSize: 'A4' },
      scannerConfig: { autoAlign: true },
      zones: { answerArea: { enabled: false } },
    };
    const result = convertTemplate(template);
    expect(result.autoAlign).toBe(true);
  });
});
