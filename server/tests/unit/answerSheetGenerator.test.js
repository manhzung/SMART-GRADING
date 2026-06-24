/**
 * Unit tests for Answer Sheet Generator
 */

const { generateAnswerSheet, generateAnswerKey, computeBubbleCoordinates } = require('../../src/amc/answerSheetGenerator');

describe('Answer Sheet Generator', () => {
  describe('computeBubbleCoordinates', () => {
    it('should return coordinates for each question', () => {
      const coords = computeBubbleCoordinates(10);
      expect(Object.keys(coords)).toHaveLength(10);
      expect(coords.q1).toBeDefined();
      expect(coords.q10).toBeDefined();
    });

    it('should have 4 bubbles (A, B, C, D) for each question', () => {
      const coords = computeBubbleCoordinates(5);
      Object.values(coords).forEach((qCoord) => {
        expect(qCoord.A).toBeDefined();
        expect(qCoord.B).toBeDefined();
        expect(qCoord.C).toBeDefined();
        expect(qCoord.D).toBeDefined();
      });
    });

    it('should arrange bubbles in horizontal row', () => {
      const coords = computeBubbleCoordinates(3);
      const q1 = coords.q1;
      // A, B, C, D should be horizontally aligned (same y)
      expect(q1.A.y).toBe(q1.B.y);
      expect(q1.B.y).toBe(q1.C.y);
      expect(q1.C.y).toBe(q1.D.y);
      // X should increase
      expect(q1.A.x).toBeLessThan(q1.B.x);
      expect(q1.B.x).toBeLessThan(q1.C.x);
      expect(q1.C.x).toBeLessThan(q1.D.x);
    });

    it('should space questions vertically', () => {
      const coords = computeBubbleCoordinates(5);
      expect(coords.q1.A.y).toBeLessThan(coords.q2.A.y);
      expect(coords.q2.A.y).toBeLessThan(coords.q3.A.y);
    });

    it('should handle large question counts by using multiple columns', () => {
      const coords = computeBubbleCoordinates(60);
      // Each question should have a column assignment
      const columnSet = new Set();
      Object.values(coords).forEach(c => columnSet.add(c.column));
      // Should have multiple columns for 60 questions
      expect(columnSet.size).toBeGreaterThan(1);
    });

    it('should handle edge case: 0 questions', () => {
      const coords = computeBubbleCoordinates(0);
      expect(Object.keys(coords)).toHaveLength(0);
    });

    it('should handle edge case: 1 question', () => {
      const coords = computeBubbleCoordinates(1);
      expect(coords.q1).toBeDefined();
      expect(coords.q1.A).toBeDefined();
    });
  });

  describe('generateAnswerSheet', () => {
    const baseExam = {
      _id: 'exam123',
      title: 'Kiem tra cuoi ky',
      subjectName: 'Toan',
      className: '12A1',
      duration: 45,
      totalScore: 10,
      examDate: '2026-06-24',
      schoolHeader: 'TRUONG THPT ABC',
    };

    it('should generate a valid PDF buffer', async () => {
      const result = await generateAnswerSheet({
        exam: baseExam,
        numQuestions: 10,
        versionCodes: ['101', '102', '103', '104'],
      });

      expect(Buffer.isBuffer(result.pdfBuffer)).toBe(true);
      expect(result.pdfBuffer.length).toBeGreaterThan(100);

      // PDF starts with %PDF
      expect(result.pdfBuffer.toString('utf8', 0, 4)).toBe('%PDF');
    });

    it('should include coordinates in result', async () => {
      const result = await generateAnswerSheet({
        exam: baseExam,
        numQuestions: 5,
        versionCodes: ['101', '102'],
      });

      expect(result.coordinates).toBeDefined();
      expect(Object.keys(result.coordinates)).toHaveLength(5);
    });

    it('should include templateJson for OMR', async () => {
      const result = await generateAnswerSheet({
        exam: baseExam,
        numQuestions: 10,
        versionCodes: ['101', '102', '103', '104'],
      });

      expect(result.templateJson).toBeDefined();
      expect(result.templateJson.examId).toBe('exam123');
      expect(result.templateJson.numQuestions).toBe(10);
      expect(result.templateJson.bubbleCount).toBe(4);
      expect(result.templateJson.versionCodes).toHaveLength(4);
      expect(result.templateJson.coordinates).toBeDefined();
    });

    it('should handle missing optional fields', async () => {
      const result = await generateAnswerSheet({
        exam: { _id: 'e1', title: 'Test' },
        numQuestions: 5,
        versionCodes: ['101'],
      });

      expect(result.pdfBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('generateAnswerKey', () => {
    it('should format version data as teacher reference JSON', () => {
      const versionData = {
        questions: [
          {
            position: 1,
            questionId: 'q1_id',
            originalPosition: 3,
            shuffledOptions: [
              { id: 'A', content: 'Option A', isCorrect: false },
              { id: 'B', content: 'Option B', isCorrect: true },
              { id: 'C', content: 'Option C', isCorrect: false },
              { id: 'D', content: 'Option D', isCorrect: false },
            ],
          },
          {
            position: 2,
            questionId: 'q2_id',
            originalPosition: 1,
            shuffledOptions: [
              { id: 'A', content: 'Right', isCorrect: true },
              { id: 'B', content: 'Wrong1', isCorrect: false },
              { id: 'C', content: 'Wrong2', isCorrect: false },
              { id: 'D', content: 'Wrong3', isCorrect: false },
            ],
          },
        ],
        answerKey: new Map([['1', 'B'], ['2', 'A']]),
      };

      const result = generateAnswerKey('101', versionData);

      expect(result.versionCode).toBe('101');
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].correctOptionId).toBe('B');
      expect(result.questions[0].correctOptionContent).toBe('Option B');
      expect(result.questions[1].correctOptionId).toBe('A');
      expect(result.answerKey).toEqual({ 1: 'B', 2: 'A' });
    });

    it('should handle questions with no correct option (edge case)', () => {
      const versionData = {
        questions: [
          {
            position: 1,
            questionId: 'q1',
            originalPosition: 1,
            shuffledOptions: [
              { id: 'A', content: 'opt1', isCorrect: false },
              { id: 'B', content: 'opt2', isCorrect: false },
            ],
          },
        ],
        answerKey: new Map(),
      };

      const result = generateAnswerKey('101', versionData);
      expect(result.questions[0].correctOptionId).toBe(null);
    });
  });
});
