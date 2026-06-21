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
    it('should include count and difficulty in prompt', () => {
      const prompt = questionGenService.buildQuestionPrompt({
        count: 5,
        difficulty: 'easy',
        topicName: 'Algebra',
        gradeLevel: 10,
      });
      expect(prompt).toContain('5');
      expect(prompt).toContain('easy');
      expect(prompt).toContain('Algebra');
      expect(prompt).toContain('Lop 10');
    });

    it('should default to medium difficulty', () => {
      const prompt = questionGenService.buildQuestionPrompt({ count: 3 });
      expect(prompt).toContain('medium');
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
  });
});
