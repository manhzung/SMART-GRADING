/**
 * AMC Service Integration Tests
 * Requires: WSL2 + AMC installed on the server
 * These tests document expected behavior and validate the full pipeline.
 * Skip if AMC is not available.
 */

const amcRunner = require('../../src/amc/amcRunner.service');
const { generateAmcSource } = require('../../src/amc/amcSourceGenerator');

describe('AMC Integration', () => {
  let amcAvailable = false;

  beforeAll(async () => {
    try {
      const envCheck = await amcRunner.validateEnvironment();
      amcAvailable = envCheck.isValid;
      if (!amcAvailable) {
        console.log('AMC not available on this server — integration tests will be skipped.');
        console.log('Install AMC in WSL2 to run these tests.');
        console.log(
          'Missing tools:',
          Object.entries(envCheck.tools)
            .filter(([, v]) => !v)
            .map(([k]) => k)
        );
      }
    } catch (err) {
      console.log('AMC environment check failed:', err.message);
      amcAvailable = false;
    }
  });

  describe('Environment Validation', () => {
    it('should detect AMC tools via WSL2', async () => {
      if (!amcAvailable) {
        console.log('SKIPPED: AMC not available');
        return;
      }
      const result = await amcRunner.validateEnvironment();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('tools');
      expect(result.tools).toHaveProperty('texlive');
      expect(result.tools).toHaveProperty('amc');
      expect(result.tools).toHaveProperty('ghostscript');
    });
  });

  describe('Source Generation', () => {
    it('should generate valid AMC source for a simple exam', () => {
      const input = {
        exam: {
          title: 'Test Exam',
          subjectName: 'Math',
          className: '10A1',
          examDate: new Date('2026-06-15'),
          duration: 45,
          totalScore: 10,
          numberOfVersions: 4,
        },
        questions: [
          {
            content: 'What is 2 + 2?',
            options: [
              { id: 'A', content: '3', isCorrect: false },
              { id: 'B', content: '4', isCorrect: true },
              { id: 'C', content: '5', isCorrect: false },
              { id: 'D', content: '6', isCorrect: false },
            ],
            correctAnswer: 'B',
            score: 1,
          },
        ],
        config: {
          paperSize: 'A4',
          includeAnswerSheet: true,
          schoolHeader: 'Test School',
          shuffleQuestions: true,
          shuffleOptions: true,
        },
      };

      const result = generateAmcSource(input);
      expect(result).toContain('\\documentclass');
      expect(result).toContain('automultiplechoice');
      expect(result).toContain('Test Exam');
      expect(result).toContain('What is 2 + 2?');
      expect(result).toContain('\\correctchoice{4}');
    });

    it('should handle 50-question exam without error', () => {
      const questions = Array.from({ length: 50 }, (_, i) => ({
        content: `Question ${i + 1}: What is ${i} + 1?`,
        options: [
          { id: 'A', content: `${i}`, isCorrect: false },
          { id: 'B', content: `${i + 1}`, isCorrect: i % 4 === 1 },
          { id: 'C', content: `${i + 2}`, isCorrect: false },
          { id: 'D', content: `${i + 3}`, isCorrect: false },
        ],
        correctAnswer: ['A', 'B', 'C', 'D'][i % 4],
        score: 1,
      }));

      const result = generateAmcSource({
        exam: {
          title: 'Long Exam',
          subjectName: 'Test',
          className: '10A',
          examDate: new Date(),
          duration: 90,
          totalScore: 50,
          numberOfVersions: 1,
        },
        questions,
        config: {
          paperSize: 'A4',
          includeAnswerSheet: true,
          schoolHeader: 'School',
          shuffleQuestions: false,
          shuffleOptions: false,
        },
      });

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(5000);
      expect((result.match(/\\begin\{question\}/g) || []).length).toBe(50);
    });
  });

  describe('CLI Commands (AMC only)', () => {
    it('should create and cleanup WSL project directory', async () => {
      if (!amcAvailable) {
        console.log('SKIPPED: AMC not available');
        return;
      }
      // This is a basic connectivity test
      const projectDir = '/home/amc/amc-projects/__test__integration';
      await amcRunner.cleanup(projectDir); // cleanup first
      const exists = await amcRunner.wslExec(`ls -la /home/amc/amc-projects/`);
      expect(exists.exitCode).toBe(0);
      await amcRunner.cleanup(projectDir); // cleanup after
    }, 30000);
  });
});
