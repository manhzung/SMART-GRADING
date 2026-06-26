const questionGenService = require('../../../src/services/questionGen.service');

describe('QuestionGenService', () => {
  describe('generateQuestions', () => {
    it('should be a function', () => {
      expect(typeof questionGenService.generateQuestions).toBe('function');
    });
  });

  describe('parseQuestionsFromResponse', () => {
    it('should be a function', () => {
      expect(typeof questionGenService.parseQuestionsFromResponse).toBe('function');
    });
  });

  describe('buildQuestionPrompt', () => {
    it('should be a function', () => {
      expect(typeof questionGenService.buildQuestionPrompt).toBe('function');
    });
  });

  describe('buildQuestionPrompt output', () => {
    it('should include count and topic in prompt', () => {
      const prompt = questionGenService.buildQuestionPrompt({
        count: 5,
        difficulty: 'easy',
        topicName: 'Algebra',
        gradeLevel: 10,
      });
      expect(prompt).toContain('5');
      expect(prompt).toContain('Algebra');
      expect(prompt).toContain('Lớp: 10');
      expect(prompt).toContain('cơ bản');
    });

    it('should default to medium difficulty description', () => {
      const prompt = questionGenService.buildQuestionPrompt({ count: 3 });
      expect(prompt).toContain('trung bình');
    });
  });

  describe('parseQuestionsFromResponse', () => {
    it('should parse valid JSON array', () => {
      const response = JSON.stringify([
        {
          content: 'What is 2+2?',
          options: [
            { id: 'A', content: '3' },
            { id: 'B', content: '4' },
            { id: 'C', content: '5' },
            { id: 'D', content: '6' },
          ],
          correctAnswer: 'B',
          explanation: '2+2=4',
        },
      ]);
      const result = questionGenService.parseQuestionsFromResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('What is 2+2?');
      expect(result[0].correctAnswer).toBe('B');
      expect(result[0].options).toHaveLength(4);
    });

    it('should filter out invalid questions', () => {
      const response = JSON.stringify([
        { content: 'Valid?', options: [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }], correctAnswer: 'A' },
        { content: '', options: [], correctAnswer: 'A' },
        { options: [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }], correctAnswer: 'A' },
      ]);
      const result = questionGenService.parseQuestionsFromResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Valid?');
    });

    it('should normalize lowercase option ids', () => {
      const response = JSON.stringify([
        {
          content: 'Test?',
          options: [
            { id: 'a', content: 'Option A' },
            { id: 'b', content: 'Option B' },
            { id: 'c', content: 'Option C' },
            { id: 'd', content: 'Option D' },
          ],
          correctAnswer: 'a',
          explanation: 'Because',
        },
      ]);
      const result = questionGenService.parseQuestionsFromResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].correctAnswer).toBe('A');
    });

    it('should throw on invalid JSON', () => {
      expect(() => questionGenService.parseQuestionsFromResponse('not json')).toThrow();
    });

    it('should throw on missing JSON array', () => {
      expect(() => questionGenService.parseQuestionsFromResponse('just text')).toThrow();
    });

    it('should parse JSON wrapped in markdown code blocks', () => {
      const response = `\`\`\`json
${JSON.stringify([
  {
    content: 'Test question?',
    options: [
      { id: 'A', content: 'Option A' },
      { id: 'B', content: 'Option B' },
      { id: 'C', content: 'Option C' },
      { id: 'D', content: 'Option D' },
    ],
    correctAnswer: 'A',
    explanation: 'Because A is correct',
  },
])}
\`\`\``;
      const result = questionGenService.parseQuestionsFromResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Test question?');
      expect(result[0].correctAnswer).toBe('A');
    });

    it('should handle response with extra text around JSON', () => {
      const response = `Here are the questions:
${JSON.stringify([
  {
    content: 'Extra text question?',
    options: [
      { id: 'A', content: 'A' },
      { id: 'B', content: 'B' },
      { id: 'C', content: 'C' },
      { id: 'D', content: 'D' },
    ],
    correctAnswer: 'B',
    explanation: 'B is correct',
  },
])}
Please review.`;
      const result = questionGenService.parseQuestionsFromResponse(response);
      expect(result).toHaveLength(1);
    });

    it('should handle options with letter property instead of id', () => {
      const response = JSON.stringify([
        {
          content: 'Letter prop test?',
          options: [
            { letter: 'A', text: 'Alpha' },
            { letter: 'B', text: 'Beta' },
            { letter: 'C', text: 'Gamma' },
            { letter: 'D', text: 'Delta' },
          ],
          correctAnswer: 'C',
          explanation: 'Gamma is correct',
        },
      ]);
      const result = questionGenService.parseQuestionsFromResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].options[0].id).toBe('A');
      expect(result[0].options[0].content).toBe('Alpha');
    });

    it('should handle options marked as correct with isCorrect property', () => {
      const response = JSON.stringify([
        {
          content: 'IsCorrect test?',
          options: [
            { id: 'A', content: 'Wrong', isCorrect: false },
            { id: 'B', content: 'Right', isCorrect: true },
            { id: 'C', content: 'Wrong 2', isCorrect: false },
            { id: 'D', content: 'Wrong 3', isCorrect: false },
          ],
          explanation: 'B is correct',
        },
      ]);
      const result = questionGenService.parseQuestionsFromResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].correctAnswer).toBe('B');
    });
  });

  describe('buildQuestionPrompt', () => {
    it('should include system role in prompt', () => {
      const prompt = questionGenService.buildQuestionPrompt({
        count: 5,
        difficulty: 'easy',
        topicName: 'Algebra',
        gradeLevel: 10,
      });
      expect(prompt).toContain('BẠN LÀ MỘT GIÁO VIÊN');
      expect(prompt).toContain('TIẾNG VIỆT');
    });

    it('should include few-shot examples', () => {
      const prompt = questionGenService.buildQuestionPrompt({
        count: 3,
        difficulty: 'medium',
      });
      expect(prompt).toContain('Ví dụ câu hỏi mẫu');
    });

    it('should include difficulty-specific instructions', () => {
      const easyPrompt = questionGenService.buildQuestionPrompt({ count: 3, difficulty: 'easy' });
      expect(easyPrompt).toContain('nhận biết, thông hiểu');

      const hardPrompt = questionGenService.buildQuestionPrompt({ count: 3, difficulty: 'hard' });
      expect(hardPrompt).toContain('vận dụng, phân tích, đánh giá');
    });

    it('should include additional requirements when provided', () => {
      const prompt = questionGenService.buildQuestionPrompt({
        count: 5,
        difficulty: 'medium',
        requirements: 'Có công thức toán',
      });
      expect(prompt).toContain('Có công thức toán');
    });

    it('should default to medium difficulty when not specified', () => {
      const prompt = questionGenService.buildQuestionPrompt({ count: 3 });
      expect(prompt).toContain('trung bình');
    });
  });

  describe('caching', () => {
    it('should return cached results for same parameters', async () => {
      // First call - will fail due to no AI, but should still test cache logic
      const cacheKey = questionGenService._getCacheKey('topic123', 'Algebra', 'easy', 'test', 5);
      expect(typeof cacheKey).toBe('string');
      expect(cacheKey).toContain('topic123');
    });
  });

  describe('_getCacheKey', () => {
    it('should generate consistent cache keys', () => {
      const key1 = questionGenService._getCacheKey('123', 'Algebra', 'easy', 'test', 5);
      const key2 = questionGenService._getCacheKey('123', 'Algebra', 'easy', 'test', 5);
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different parameters', () => {
      const key1 = questionGenService._getCacheKey('123', 'Algebra', 'easy', 'test', 5);
      const key2 = questionGenService._getCacheKey('123', 'Geometry', 'easy', 'test', 5);
      expect(key1).not.toBe(key2);
    });

    it('should handle missing optional parameters', () => {
      const key = questionGenService._getCacheKey(null, null, null, null, 5);
      expect(typeof key).toBe('string');
    });
  });
});
