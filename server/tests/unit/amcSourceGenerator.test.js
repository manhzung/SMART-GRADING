const { generateAmcSource, escapeLatex } = require('../../src/amc/amcSourceGenerator');

describe('amcSourceGenerator', () => {
  const sampleInput = {
    exam: {
      title: 'Kiem tra giua ky',
      subjectName: 'Toan',
      className: '10A1',
      examDate: new Date('2026-06-15'),
      duration: 45,
      totalScore: 10,
      numberOfVersions: 4,
    },
    questions: [
      {
        content: 'Gia tri cua 2 + 2 la bao nhieu?',
        options: [
          { id: 'A', content: '3', isCorrect: false },
          { id: 'B', content: '4', isCorrect: true },
          { id: 'C', content: '5', isCorrect: false },
          { id: 'D', content: '6', isCorrect: false },
        ],
        correctAnswer: 'B',
        score: 1,
      },
      {
        content: 'Ten thu do cua nuoc Viet Nam la gi?',
        options: [
          { id: 'A', content: 'Da Nang', isCorrect: false },
          { id: 'B', content: 'Ho Chi Minh', isCorrect: false },
          { id: 'C', content: 'Ha Noi', isCorrect: true },
          { id: 'D', content: 'Hue', isCorrect: false },
        ],
        correctAnswer: 'C',
        score: 1,
      },
    ],
    config: {
      paperSize: 'A4',
      includeAnswerSheet: true,
      schoolHeader: 'Truong THPT Viet Nam',
      shuffleQuestions: true,
      shuffleOptions: true,
    },
  };

  describe('generateAmcSource', () => {
    it('should generate valid LaTeX source with documentclass', () => {
      const result = generateAmcSource(sampleInput);
      expect(result).toContain('\\documentclass');
      expect(result).toContain('article');
    });

    it('should include AMC packages', () => {
      const result = generateAmcSource(sampleInput);
      expect(result).toContain('auto-multiple-choice');
    });

    it('should escape special LaTeX characters', () => {
      const input = {
        ...sampleInput,
        questions: [
          {
            ...sampleInput.questions[0],
            content: 'Gia tri cua $x$ & y la % voi #tag',
            options: sampleInput.questions[0].options,
            correctAnswer: 'B',
            score: 1,
          },
        ],
      };
      const result = generateAmcSource(input);
      expect(result).toContain('\\$');
      expect(result).toContain('\\&');
      expect(result).not.toContain('$x$');
    });

    it('should mark correct answer with correctchoice', () => {
      const result = generateAmcSource(sampleInput);
      expect(result).toContain('\\correctchoice{4}');
      expect(result).toContain('\\wrongchoice{3}');
    });

    it('should use question environment with element', () => {
      const result = generateAmcSource(sampleInput);
      expect(result).toContain('\\begin{question}');
      expect(result).toContain('\\end{question}');
      expect(result).toContain('\\begin{choices}');
      expect(result).toContain('\\end{choices}');
    });

    it('should include student info section', () => {
      const result = generateAmcSource(sampleInput);
      expect(result).toContain('Ho va ten');
    });

    it('should include exam metadata in header', () => {
      const result = generateAmcSource(sampleInput);
      expect(result).toContain('Kiem tra giua ky');
      expect(result).toContain('Toan');
      expect(result).toContain('10A1');
    });

    it('should handle empty exam title gracefully', () => {
      const input = {
        ...sampleInput,
        exam: { ...sampleInput.exam, title: '' },
      };
      const result = generateAmcSource(input);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(100);
    });

    it('should handle 50 questions without error', () => {
      const questions = Array.from({ length: 50 }, (_, i) => ({
        content: `Cau hoi so ${i + 1}?`,
        options: [
          { id: 'A', content: 'A', isCorrect: i % 4 === 0 },
          { id: 'B', content: 'B', isCorrect: i % 4 === 1 },
          { id: 'C', content: 'C', isCorrect: i % 4 === 2 },
          { id: 'D', content: 'D', isCorrect: i % 4 === 3 },
        ],
        correctAnswer: ['A', 'B', 'C', 'D'][i % 4],
        score: 1,
      }));
      const input = { ...sampleInput, questions };
      const result = generateAmcSource(input);
      expect(result).toBeTruthy();
      expect(result).toContain('\\question');
      expect((result.match(/\\question/g) || []).length).toBe(50);
    });
  });

  describe('escapeLatex', () => {
    it('should escape backslash', () => {
      expect(escapeLatex('path\\to\\file')).toContain('textbackslash');
    });

    it('should escape ampersand', () => {
      expect(escapeLatex('A & B')).toContain('\\&');
    });

    it('should escape percent', () => {
      expect(escapeLatex('100%')).toContain('\\%');
    });

    it('should escape dollar', () => {
      expect(escapeLatex('$100')).toContain('\\$');
    });

    it('should escape hash', () => {
      expect(escapeLatex('#tag')).toContain('\\#');
    });

    it('should escape curly braces', () => {
      const result = escapeLatex('{text}');
      expect(result).toContain('\\{');
      expect(result).toContain('\\}');
    });

    it('should return empty string for null/undefined', () => {
      expect(escapeLatex(null)).toBe('');
      expect(escapeLatex(undefined)).toBe('');
    });
  });
});
