import { describe, it, expect } from 'vitest';
import {
  calculateGrade,
  isPassing,
  prepareStudentScores,
  prepareGradeDistribution,
} from './examReportExport';
import type { BackendSubmission } from '../../presentation/store/submissionStore';
import type { ExamReport } from './types';

describe('Report Export Utilities', () => {
  describe('calculateGrade', () => {
    it('should return Giỏi for scores >= 8.5', () => {
      expect(calculateGrade(8.5)).toBe('Giỏi');
      expect(calculateGrade(9)).toBe('Giỏi');
      expect(calculateGrade(10)).toBe('Giỏi');
    });

    it('should return Khá for scores >= 7.0 and < 8.5', () => {
      expect(calculateGrade(7.0)).toBe('Khá');
      expect(calculateGrade(7.5)).toBe('Khá');
      expect(calculateGrade(8.4)).toBe('Khá');
    });

    it('should return Trung bình for scores >= 5.0 and < 7.0', () => {
      expect(calculateGrade(5.0)).toBe('Trung bình');
      expect(calculateGrade(6.0)).toBe('Trung bình');
      expect(calculateGrade(6.9)).toBe('Trung bình');
    });

    it('should return Yếu for scores >= 3.5 and < 5.0', () => {
      expect(calculateGrade(3.5)).toBe('Yếu');
      expect(calculateGrade(4.0)).toBe('Yếu');
      expect(calculateGrade(4.9)).toBe('Yếu');
    });

    it('should return Kém for scores < 3.5', () => {
      expect(calculateGrade(3.4)).toBe('Kém');
      expect(calculateGrade(2.0)).toBe('Kém');
      expect(calculateGrade(0)).toBe('Kém');
    });
  });

  describe('isPassing', () => {
    it('should return true for scores >= passing score', () => {
      expect(isPassing(5, 5)).toBe(true);
      expect(isPassing(6, 5)).toBe(true);
      expect(isPassing(10, 5)).toBe(true);
    });

    it('should return false for scores < passing score', () => {
      expect(isPassing(4.9, 5)).toBe(false);
      expect(isPassing(0, 5)).toBe(false);
    });

    it('should use default passing score of 5', () => {
      expect(isPassing(5)).toBe(true);
      expect(isPassing(4.99)).toBe(false);
    });
  });

  describe('prepareStudentScores', () => {
    const mockSubmissions: BackendSubmission[] = [
      {
        _id: 'sub001',
        examId: 'exam001',
        studentId: { _id: 's001', name: 'Student A', email: 'a@test.com' },
        classId: 'cls001',
        versionCode: 'A',
        answers: {},
        score: 8.5,
        status: 'graded',
        submittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: 'sub002',
        examId: 'exam001',
        studentId: { _id: 's002', name: 'Student B', email: 'b@test.com' },
        classId: 'cls001',
        versionCode: 'A',
        answers: {},
        score: 4.5,
        status: 'graded',
        submittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: 'sub003',
        examId: 'exam001',
        studentId: { _id: 's003', name: 'Student C', email: 'c@test.com' },
        classId: 'cls001',
        versionCode: 'A',
        answers: {},
        score: undefined,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    it('should filter graded submissions and calculate scores', () => {
      const result = prepareStudentScores(mockSubmissions);
      expect(result).toHaveLength(2); // Only graded submissions
    });

    it('should sort by score descending', () => {
      const result = prepareStudentScores(mockSubmissions);
      expect(result[0].score).toBeGreaterThan(result[1].score);
    });

    it('should calculate grade and status correctly', () => {
      const result = prepareStudentScores(mockSubmissions);
      const passingStudent = result.find((s) => s.name === 'Student A');
      const failingStudent = result.find((s) => s.name === 'Student B');

      expect(passingStudent?.grade).toBe('Giỏi');
      expect(passingStudent?.status).toBe('pass');
      expect(failingStudent?.grade).toBe('Yếu');
      expect(failingStudent?.status).toBe('fail');
    });

    it('should handle empty submissions', () => {
      const result = prepareStudentScores([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('prepareGradeDistribution', () => {
    const mockReport: ExamReport = {
      _id: 'rpt001',
      examId: 'exam001',
      examTitle: 'Test Exam',
      totalStudents: 45,
      totalSubmissions: 45,
      submissionRate: 100,
      averageScore: 7.2,
      highestScore: 9.5,
      lowestScore: 4.0,
      passRate: 89,
      gradeDistribution: [
        { grade: 'Giỏi (8.5-10)', count: 10, percentage: 22 },
        { grade: 'Khá (7.0-8.4)', count: 18, percentage: 40 },
        { grade: 'Trung bình (5.0-6.9)', count: 12, percentage: 27 },
        { grade: 'Yếu (3.5-4.9)', count: 4, percentage: 9 },
        { grade: 'Kém (<3.5)', count: 1, percentage: 2 },
      ],
      scoreHistogram: [
        { range: '0-2', count: 1 },
        { range: '2-4', count: 2 },
        { range: '4-6', count: 8 },
        { range: '6-8', count: 18 },
        { range: '8-10', count: 16 },
      ],
      generatedAt: new Date().toISOString(),
    };

    it('should return grade distribution data', () => {
      const result = prepareGradeDistribution(mockReport);
      expect(result).toHaveLength(5);
    });

    it('should preserve grade information', () => {
      const result = prepareGradeDistribution(mockReport);
      expect(result[0]).toEqual({
        grade: 'Giỏi (8.5-10)',
        count: 10,
        percentage: 22,
      });
    });
  });
});
