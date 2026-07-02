const aiReportService = require('../../../src/services/aiReport.service');

describe('AIReportService', () => {
  describe('generateStudentReport', () => {
    it('should be a function', () => {
      expect(typeof aiReportService.generateStudentReport).toBe('function');
    });
  });

  describe('generateExamReport', () => {
    it('should be a function', () => {
      expect(typeof aiReportService.generateExamReport).toBe('function');
    });
  });

  describe('analyzeQuestionDifficulty', () => {
    it('should be a function', () => {
      expect(typeof aiReportService.analyzeQuestionDifficulty).toBe('function');
    });
  });

  describe('buildStudentContext', () => {
    it('should be a function', () => {
      expect(typeof aiReportService.buildStudentContext).toBe('function');
    });

    it('should compute correct counts from submission', () => {
      const mockSubmission = {
        examId: { title: 'Test Exam', numberOfQuestions: 5 },
        studentId: { name: 'Test Student', studentCode: '12345' },
        answers: [
          { selectedAnswer: 'A', isCorrect: true },
          { selectedAnswer: 'B', isCorrect: false },
          { selectedAnswer: 'C', isCorrect: true },
          { selectedAnswer: null, isCorrect: false },
          { selectedAnswer: 'D', isCorrect: true },
        ],
        totalScore: 6,
        maxScore: 10,
      };
      const ctx = aiReportService.buildStudentContext(mockSubmission);
      expect(ctx.totalQuestions).toBe(5);
      expect(ctx.correctCount).toBe(3);
      expect(ctx.incorrectCount).toBe(1);
      expect(ctx.unansweredCount).toBe(1);
    });

    it('should handle empty answers', () => {
      const mockSubmission = {
        examId: { title: 'Empty Exam' },
        studentId: { name: 'No Answer Student', studentCode: '000' },
        answers: [],
        totalScore: 0,
        maxScore: 10,
      };
      const ctx = aiReportService.buildStudentContext(mockSubmission);
      expect(ctx.totalQuestions).toBe(0);
      expect(ctx.correctCount).toBe(0);
      expect(ctx.incorrectCount).toBe(0);
      expect(ctx.unansweredCount).toBe(0);
    });
  });

  describe('buildExamContext', () => {
    it('should be a function', () => {
      expect(typeof aiReportService.buildExamContext).toBe('function');
    });

    it('should compute average score', () => {
      const mockExam = { title: 'Class Exam', subjectId: { name: 'Math' } };
      const mockSubmissions = [
        { studentId: { name: 'A' }, totalScore: 8, maxScore: 10 },
        { studentId: { name: 'B' }, totalScore: 6, maxScore: 10 },
        { studentId: { name: 'C' }, totalScore: 4, maxScore: 10 },
      ];
      const ctx = aiReportService.buildExamContext(mockExam, mockSubmissions);
      expect(ctx.totalStudents).toBe(3);
      expect(ctx.averageScore).toBeCloseTo(60);
    });
  });

  describe('getScoreDistribution', () => {
    it('should be a function', () => {
      expect(typeof aiReportService.getScoreDistribution).toBe('function');
    });

    it('should distribute scores into ranges', () => {
      const scores = [{ percentage: 30 }, { percentage: 50 }, { percentage: 70 }, { percentage: 90 }];
      const dist = aiReportService.getScoreDistribution(scores);
      expect(dist).toHaveLength(4);
      expect(dist.find((d) => d.range === '0-4').count).toBe(1);
      expect(dist.find((d) => d.range === '4-6').count).toBe(1);
      expect(dist.find((d) => d.range === '6-8').count).toBe(1);
      expect(dist.find((d) => d.range === '8-10').count).toBe(1);
    });
  });

  describe('parseStudentReportResponse', () => {
    it('should be a function', () => {
      expect(typeof aiReportService.parseStudentReportResponse).toBe('function');
    });

    it('should parse valid JSON', () => {
      const json = JSON.stringify({ summary: 'Good work', mistakes: [], suggestions: {} });
      const result = aiReportService.parseStudentReportResponse(json);
      expect(result.summary).toBe('Good work');
    });

    it('should extract JSON from text with surrounding content', () => {
      const text = 'Here is the analysis: {"summary":"Great","mistakes":[]} - that was helpful';
      const result = aiReportService.parseStudentReportResponse(text);
      expect(result.summary).toBe('Great');
    });

    it('should return fallback on invalid JSON', () => {
      const text = 'This is not JSON at all, just plain text.';
      const result = aiReportService.parseStudentReportResponse(text);
      expect(result.summary).toBe(text.substring(0, 500));
      expect(result.mistakes).toEqual([]);
    });
  });

  describe('buildStudentReportPrompt', () => {
    it('should be a function', () => {
      expect(typeof aiReportService.buildStudentReportPrompt).toBe('function');
    });

    it('should include student info in prompt', () => {
      const ctx = {
        studentName: 'Nguyen Van A',
        studentCode: '12345',
        examTitle: 'Toan HK1',
        totalScore: 7,
        maxScore: 10,
        percentage: 70,
        totalQuestions: 10,
        correctCount: 7,
        incorrectCount: 2,
        unansweredCount: 1,
        incorrectAnswers: [],
      };
      const prompt = aiReportService.buildStudentReportPrompt(ctx);
      expect(prompt).toContain('Nguyen Van A');
      expect(prompt).toContain('12345');
      expect(prompt).toContain('Toan HK1');
      expect(prompt).toContain('JSON');
    });
  });

  describe('provider configuration', () => {
    it('should import geminiService', () => {
      // geminiService is used internally - just verify it's importable
      expect(typeof aiReportService.generateStudentReport).toBe('function');
      expect(typeof aiReportService.generateExamReport).toBe('function');
    });
  });
});
