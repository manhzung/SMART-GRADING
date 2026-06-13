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
