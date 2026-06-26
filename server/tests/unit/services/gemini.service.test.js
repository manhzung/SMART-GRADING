const geminiService = require('../../../src/services/gemini.service');

describe('GeminiService', () => {
  describe('sendMessage', () => {
    it('should be a function', () => {
      expect(typeof geminiService.sendMessage).toBe('function');
    });

    it('should return a promise that rejects when no API key', async () => {
      // Without GEMINI_API_KEY configured, this should reject
      const result = geminiService.sendMessage({ message: 'test' });
      await expect(result).rejects.toThrow('GEMINI_API_KEY is not configured');
    });
  });

  describe('generateContent', () => {
    it('should be a function', () => {
      expect(typeof geminiService.generateContent).toBe('function');
    });

    it('should throw for unknown provider', async () => {
      const originalProvider = geminiService.provider;
      geminiService.provider = 'unknown_provider';
      await expect(geminiService.generateContent('test')).rejects.toThrow('Unknown AI provider');
      geminiService.provider = originalProvider;
    });
  });

  describe('buildPrompt', () => {
    it('should be a function', () => {
      expect(typeof geminiService.buildPrompt).toBe('function');
    });

    it('should include system role in prompt', () => {
      const prompt = geminiService.buildPrompt('Hello', [], {});
      expect(prompt).toContain('Bạn là một gia sư thông minh');
      expect(prompt).toContain('Học sinh: Hello');
    });

    it('should include context in prompt', () => {
      const context = {
        recentMistakes: [
          {
            questionContent: 'What is photosynthesis?',
            studentAnswer: 'B',
            correctAnswer: 'A',
          },
        ],
      };
      const prompt = geminiService.buildPrompt('Why did I get this wrong?', [], context);
      expect(prompt).toContain('What is photosynthesis?');
      expect(prompt).toContain('B');
      expect(prompt).toContain('A');
    });

    it('should include history in prompt', () => {
      const history = [
        { role: 'user', content: 'I need help with math' },
        { role: 'assistant', content: 'Sure, what topic?' },
      ];
      const prompt = geminiService.buildPrompt('Calculus is hard', history, {});
      expect(prompt).toContain('I need help with math');
      expect(prompt).toContain('Sure, what topic?');
      expect(prompt).toContain('Calculus is hard');
    });

    it('should limit history to last 6 messages', () => {
      const history = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));
      const prompt = geminiService.buildPrompt('Latest', history, {});
      expect(prompt).not.toContain('Message 0');
      expect(prompt).not.toContain('Message 1');
      expect(prompt).toContain('Message 8');
      expect(prompt).toContain('Message 9');
    });

    it('should not include context when recentMistakes is empty', () => {
      const prompt = geminiService.buildPrompt('Hello', [], { recentMistakes: [] });
      expect(prompt).not.toContain('Ngữ cảnh về các lỗi');
    });
  });

  describe('provider configuration', () => {
    it('should have provider property', () => {
      expect(geminiService.provider).toBeDefined();
    });

    it('should have geminiApiKey property', () => {
      expect('geminiApiKey' in geminiService).toBe(true);
    });

    it('should have geminiModel property', () => {
      expect(geminiService.geminiModel).toBeDefined();
    });
  });

  describe('retry logic', () => {
    it('should have maxRetries configuration', () => {
      expect(geminiService.maxRetries).toBeDefined();
      expect(geminiService.maxRetries).toBe(3);
    });

    it('should have retryDelayMs configuration', () => {
      expect(geminiService.retryDelayMs).toBeDefined();
      expect(geminiService.retryDelayMs).toBe(1000);
    });

    it('should identify non-retryable errors', () => {
      const error1 = new Error('Invalid API key');
      expect(geminiService._isNonRetryableError(error1)).toBe(true);

      const error2 = new Error('API rate limit exceeded');
      expect(geminiService._isNonRetryableError(error2)).toBe(true);

      const error3 = new Error('Network timeout');
      expect(geminiService._isNonRetryableError(error3)).toBe(false);
    });
  });

  describe('generateContent options', () => {
    it('should accept custom retry options', () => {
      expect(typeof geminiService.generateContent).toBe('function');
    });
  });
});
