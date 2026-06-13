import { describe, expect, it } from 'vitest';
import {
  buildExamFilters,
  mapExamDetailData,
  mapExamListItem,
  resolveAssignedQuestions,
} from './examPageAdapters';

describe('mapExamListItem', () => {
  it('maps backend exam fields to list card data', () => {
    const result = mapExamListItem({
      _id: 'exam-1',
      title: 'Đề giữa kỳ Toán 10',
      classIds: [{ _id: 'c1', name: '10A1' }],
      examDate: '2026-06-09T00:00:00.000Z',
      duration: 45,
      numberOfQuestions: 20,
      status: 'published',
      numberOfVersions: 3,
      totalSubmissions: 10,
      totalStudents: 30,
    });

    expect(result).toMatchObject({
      _id: 'exam-1',
      title: 'Đề giữa kỳ Toán 10',
      classNames: ['10A1'],
      duration: '45 phút',
      questionCount: 20,
      status: 'published',
      variantsCount: 3,
      submissionsCurrent: 10,
      submissionsTotal: 30,
    });
  });
});

describe('buildExamFilters', () => {
  it('filters by class, status, and date range without fake totals', () => {
    const exams = [
      mapExamListItem({ _id: '1', title: 'A', classIds: [{ _id: 'c1', name: '10A1' }], examDate: '2026-06-09T00:00:00.000Z', duration: 45, numberOfQuestions: 10, status: 'published', numberOfVersions: 1, totalSubmissions: 5, totalStudents: 20 }),
      mapExamListItem({ _id: '2', title: 'B', classIds: [{ _id: 'c2', name: '10A2' }], examDate: '2026-05-01T00:00:00.000Z', duration: 45, numberOfQuestions: 10, status: 'draft', numberOfVersions: 1, totalSubmissions: 0, totalStudents: 20 }),
    ];

    const result = buildExamFilters(exams, {
      selectedClass: '10A1',
      selectedStatus: 'published',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    });

    expect(result.map((item) => item._id)).toEqual(['1']);
  });
});

describe('resolveAssignedQuestions', () => {
  it('returns only assigned store questions for create exam page', () => {
    const result = resolveAssignedQuestions([
      { _id: 'q1', id: 'q1', text: 'Câu 1', formula: '', difficulty: 'Easy', isAiGenerated: false, isPremium: false, options: [], usedInExams: 0, successRate: 0, explanation: '', isApproved: true, source: 'manual', tags: [], score: 1, usageCount: 0, createdAt: '' },
      { _id: 'q2', id: 'q2', text: 'Câu 2', formula: '', difficulty: 'Medium', isAiGenerated: false, isPremium: false, options: [], usedInExams: 0, successRate: 0, explanation: '', isApproved: true, source: 'manual', tags: [], score: 1, usageCount: 0, createdAt: '' },
    ], ['q2']);

    expect(result.map((question) => question._id)).toEqual(['q2']);
  });
});

describe('mapExamDetailData', () => {
  it('maps exam detail from real exam payload without mock fallback', () => {
    const result = mapExamDetailData({
      _id: 'exam-1',
      title: 'Đề giữa kỳ Toán 10',
      description: 'Mô tả',
      status: 'published',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-02T00:00:00.000Z',
      createdBy: { _id: 'u1', name: 'Giáo viên A' },
      totalSubmissions: 12,
      totalStudents: 30,
      examDate: '2026-06-09T00:00:00.000Z',
      startTime: '08:00',
      duration: 45,
      totalScore: 10,
      passingScore: 5,
      numberOfQuestions: 2,
      questionIds: [
        {
          _id: 'q1',
          content: 'Câu 1',
          type: 'single_choice',
          options: [{ id: 'A', text: '1', isCorrect: true }],
          difficulty: 'easy',
          score: 1,
        },
      ],
      classIds: [{ _id: 'c1', name: '10A1', code: '10A1' }],
      primaryClassId: 'c1',
      omrTemplateId: { _id: 'omr1', name: 'Mẫu 60 câu' },
    }, []);

    expect(result?.title).toBe('Đề giữa kỳ Toán 10');
    expect(result?.questions).toHaveLength(1);
    expect(result?.classes[0].name).toBe('10A1');
  });

  it('returns null when no real exam detail is available', () => {
    expect(mapExamDetailData(null, [])).toBeNull();
  });
});
