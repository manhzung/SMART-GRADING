/**
 * Unit tests for AMC Source Generator
 * Focus: shuffle logic for 4 versions (deterministic, different per version)
 */

const {
  shuffleQuestionsForVersion,
  seededShuffle,
  versionCodeToSeed,
  generateAmcSourceForVersion,
  escapeLatex,
} = require('../../src/amc/amcSourceGenerator');

describe('AMC Source Generator - Shuffle Logic', () => {
  describe('seededShuffle', () => {
    it('should produce same result for same seed', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const r1 = seededShuffle(arr, 42);
      const r2 = seededShuffle(arr, 42);
      expect(r1).toEqual(r2);
    });

    it('should produce different results for different seeds', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const r1 = seededShuffle(arr, 42);
      const r2 = seededShuffle(arr, 43);
      expect(r1).not.toEqual(r2);
    });

    it('should not mutate original array', () => {
      const arr = [1, 2, 3, 4, 5];
      const original = [...arr];
      seededShuffle(arr, 42);
      expect(arr).toEqual(original);
    });

    it('should preserve all elements (no duplicates, no losses)', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled = seededShuffle(arr, 123);
      expect(shuffled.sort()).toEqual([...arr].sort());
    });
  });

  describe('versionCodeToSeed', () => {
    it('should convert string number to integer', () => {
      expect(versionCodeToSeed('101')).toBe(101);
      expect(versionCodeToSeed('102')).toBe(102);
    });

    it('should handle numeric input', () => {
      expect(versionCodeToSeed(101)).toBe(101);
    });

    it('should hash non-numeric version codes', () => {
      const seedA = versionCodeToSeed('A');
      const seedB = versionCodeToSeed('B');
      expect(seedA).not.toBe(seedB);
      expect(Number.isInteger(seedA)).toBe(true);
    });
  });

  describe('shuffleQuestionsForVersion', () => {
    const sampleQuestions = [
      {
        _id: 'q1',
        content: 'Question 1',
        options: [
          { id: 'A', content: '1A', isCorrect: true },
          { id: 'B', content: '1B', isCorrect: false },
          { id: 'C', content: '1C', isCorrect: false },
          { id: 'D', content: '1D', isCorrect: false },
        ],
      },
      {
        _id: 'q2',
        content: 'Question 2',
        options: [
          { id: 'A', content: '2A', isCorrect: false },
          { id: 'B', content: '2B', isCorrect: true },
          { id: 'C', content: '2C', isCorrect: false },
          { id: 'D', content: '2D', isCorrect: false },
        ],
      },
      {
        _id: 'q3',
        content: 'Question 3',
        options: [
          { id: 'A', content: '3A', isCorrect: false },
          { id: 'B', content: '3B', isCorrect: false },
          { id: 'C', content: '3C', isCorrect: true },
          { id: 'D', content: '3D', isCorrect: false },
        ],
      },
    ];

    it('should produce deterministic order for same version code', () => {
      const r1 = shuffleQuestionsForVersion(sampleQuestions, '101');
      const r2 = shuffleQuestionsForVersion(sampleQuestions, '101');
      expect(r1.map(q => q._id)).toEqual(r2.map(q => q._id));
    });

    it('should produce different orders for different version codes', () => {
      // Use a larger sample (10 questions = 10! = 3.6M permutations)
      // so collisions across 4 versions are vanishingly unlikely
      const largeSample = Array.from({ length: 10 }, (_, i) => ({
        _id: `q${i + 1}`,
        content: `Q${i + 1}`,
        options: [
          { id: 'A', content: 'A', isCorrect: true },
          { id: 'B', content: 'B', isCorrect: false },
        ],
      }));

      const r101 = shuffleQuestionsForVersion(largeSample, '101');
      const r102 = shuffleQuestionsForVersion(largeSample, '102');
      const r103 = shuffleQuestionsForVersion(largeSample, '103');
      const r104 = shuffleQuestionsForVersion(largeSample, '104');

      const orders = [r101, r102, r103, r104].map(r => r.map(q => q._id).join(','));
      const uniqueOrders = new Set(orders);
      // With 10 questions, 4 versions should all be different
      expect(uniqueOrders.size).toBe(4);
    });

    it('should shuffle options within each question', () => {
      const result = shuffleQuestionsForVersion(sampleQuestions, '101', {
        shuffleOptions: true,
        shuffleQuestions: false, // Keep question order to isolate option shuffle
      });

      // For each question, options should be shuffled but content preserved
      result.forEach((sq, idx) => {
        const origOpts = sampleQuestions[idx].options;
        const shuffledContents = sq.options.map(o => o.content).sort();
        const origContents = origOpts.map(o => o.content).sort();
        expect(shuffledContents).toEqual(origContents);
      });
    });

    it('should preserve correct answer after shuffle', () => {
      const result = shuffleQuestionsForVersion(sampleQuestions, '101');

      // For each question, exactly one option should be isCorrect: true
      result.forEach((sq, idx) => {
        const origQ = sampleQuestions.find(q => q._id === sq._id);
        const origCorrectContent = origQ.options.find(o => o.isCorrect).content;
        const newCorrect = sq.options.find(o => o.isCorrect);
        expect(newCorrect).toBeDefined();
        expect(newCorrect.content).toBe(origCorrectContent);
      });
    });

    it('should respect shuffleQuestions: false', () => {
      const result = shuffleQuestionsForVersion(sampleQuestions, '101', {
        shuffleQuestions: false,
        shuffleOptions: true,
      });

      // Order should match input
      expect(result.map(q => q._id)).toEqual(['q1', 'q2', 'q3']);
    });

    it('should respect shuffleOptions: false', () => {
      const result = shuffleQuestionsForVersion(sampleQuestions, '101', {
        shuffleQuestions: true,
        shuffleOptions: false,
      });

      result.forEach((sq, idx) => {
        const origQ = sampleQuestions.find(q => q._id === sq._id);
        expect(sq.options.map(o => o.id)).toEqual(
          origQ.options.map(o => o.id)
        );
      });
    });
  });

  describe('generateAmcSourceForVersion', () => {
    it('should include \\begin{document} before content (regression test)', () => {
      const tex = generateAmcSourceForVersion({
        exam: { title: 'Test', subjectName: 'Toan', className: '12A1', duration: 45, totalScore: 10 },
        questions: [
          {
            content: 'Test question?',
            options: [
              { content: 'A', isCorrect: true },
              { content: 'B', isCorrect: false },
            ],
          },
        ],
        config: { schoolHeader: 'Test School' },
      });

      expect(tex).toMatch(/\\begin\{document\}/);
      const beginDocIdx = tex.indexOf('\\begin{document}');
      const oneCopyIdx = tex.indexOf('\\onecopy');
      expect(beginDocIdx).toBeLessThan(oneCopyIdx);
    });

    it('should include version code in header when provided', () => {
      const tex = generateAmcSourceForVersion({
        exam: {
          title: 'Test',
          subjectName: 'Toan',
          className: '12A1',
          duration: 45,
          totalScore: 10,
          versionCode: '101',
        },
        questions: [],
        config: {},
      });

      expect(tex).toContain('MA DE: 101');
    });

    it('should escape LaTeX special characters', () => {
      const escaped = escapeLatex('Test & 100% $5 #hash _under ^caret');
      expect(escaped).toContain('\\&');
      expect(escaped).toContain('\\%');
      expect(escaped).toContain('\\$');
      expect(escaped).toContain('\\#');
      expect(escaped).toContain('\\_');
      expect(escaped).toContain('\\textasciicircum{}');
    });
  });
});
