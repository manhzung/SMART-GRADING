const AmcTemplateBridge = require('../../src/amc/amcTemplateBridge');

describe('AmcTemplateBridge', () => {
  describe('generate', () => {
    it('should generate template with student ID coords (scaled to scanDpi)', () => {
      const csvData = {
        studentId: { digits: 10, coords: [{ x: 72, y: 200, w: 18, h: 18, digit: 0 }] },
        versionCode: { digits: 3, coords: [{ x: 72, y: 230, w: 18, h: 18, digit: 0 }] },
        answers: {
          q1: { A: { x: 120, y: 300, w: 15, h: 15 }, B: { x: 140, y: 300, w: 15, h: 15 } },
        },
      };
      const versionData = {
        versionCode: '101',
        answerKey: { q1: 'B' },
      };
      const examData = {
        _id: 'exam123',
        numberOfQuestions: 1,
        totalScore: 10,
        questionIds: [{ score: 10 }],
      };

      const bridge = new AmcTemplateBridge();
      const result = bridge.generate({ csvData, versionData, examData });

      expect(result.examId).toBe('exam123');
      expect(result.versionCode).toBe('101');
      expect(result.studentId.coords).toBeDefined();
      expect(result.studentId.coords[0].x).toBe(300);
      expect(result.studentId.coords[0].digit).toBe(0);
      expect(result.answerKey.q1).toBe('B');
      expect(result.answers.q1.A.x).toBe(500);
      expect(result.scanDpi).toBe(300);
      expect(result.scale).toBeCloseTo(300 / 72);
    });

    it('should respect custom scanDpi for coordinate scaling', () => {
      const bridge = new AmcTemplateBridge();
      const result = bridge.generate({
        csvData: {
          studentId: { coords: [] },
          versionCode: { coords: [] },
          answers: { q1: { A: { x: 72, y: 72, w: 18, h: 18 } } },
        },
        versionData: { versionCode: '101', answerKey: { q1: 'A' } },
        examData: { _id: 'e1', totalScore: 10, questionIds: [] },
        scanDpi: 600,
      });
      expect(result.scanDpi).toBe(600);
      expect(result.answers.q1.A.x).toBe(600);
    });

    it('should build questionScores from exam data', () => {
      const bridge = new AmcTemplateBridge();
      const result = bridge.generate({
        csvData: { studentId: { coords: [] }, versionCode: { coords: [] }, answers: {} },
        versionData: { versionCode: '101', answerKey: {} },
        examData: { _id: 'e1', totalScore: 10, questionIds: [{ score: 2 }, { score: 3 }] },
      });
      expect(result.questionScores).toBeDefined();
      expect(result.totalScore).toBe(10);
    });

    it('should handle empty answers', () => {
      const bridge = new AmcTemplateBridge();
      const result = bridge.generate({
        csvData: { studentId: { coords: [] }, versionCode: { coords: [] }, answers: {} },
        versionData: { versionCode: '101', answerKey: {} },
        examData: { _id: 'e1', totalScore: 10, questionIds: [] },
      });
      expect(result.answers).toEqual({});
      expect(result.questionScores).toEqual({});
    });

    it('should include preProcessors for Engine v2 compatibility', () => {
      const bridge = new AmcTemplateBridge();
      const result = bridge.generate({
        csvData: { studentId: { coords: [] }, versionCode: { coords: [] }, answers: {} },
        versionData: { versionCode: '101', answerKey: {} },
        examData: { _id: 'e1', totalScore: 10, questionIds: [] },
      });
      expect(result.preProcessors).toBeDefined();
      const names = result.preProcessors.map((p) => p.name);
      expect(names).toContain('CropPage');
      expect(names).toContain('Levels');
    });
  });
});
