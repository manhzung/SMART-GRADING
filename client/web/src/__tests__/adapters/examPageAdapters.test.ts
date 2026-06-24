import { describe, it, expect } from 'vitest';
import { mapExamDetailData } from '../../pages/examPageAdapters';

describe('examPageAdapters.mapExamDetailData', () => {
  it('maps answerSheetPdfUrl from ExamVersion', () => {
    const exam = {
      _id: 'exam1',
      title: 'Sample',
      questionIds: [],
      classIds: [],
      status: 'draft' as const,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-02',
    };

    const versions = [
      {
        _id: 'v1',
        examId: 'exam1',
        versionCode: '101',
        pdfUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/exams/exam1/v101-sujet.pdf',
        answerSheetPdfUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/exams/exam1/answer-sheet.pdf',
        templateJson: null,
        generationErrors: [],
        createdAt: '2025-01-01',
      },
    ];

    const mapped = mapExamDetailData(exam, versions as any);
    expect(mapped).not.toBeNull();
    expect(mapped!.versions).toHaveLength(1);
    expect(mapped!.versions[0].pdfUrl).toBe(
      'https://res.cloudinary.com/demo/raw/upload/v1/exams/exam1/v101-sujet.pdf',
    );
    expect(mapped!.versions[0].answerSheetPdfUrl).toBe(
      'https://res.cloudinary.com/demo/raw/upload/v1/exams/exam1/answer-sheet.pdf',
    );
    expect(mapped!.versions[0].status).toBe('Đã sinh PDF');
  });

  it('returns null answerSheetPdfUrl when missing', () => {
    const exam = {
      _id: 'exam1',
      title: 'Sample',
      questionIds: [],
      classIds: [],
      status: 'draft' as const,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-02',
    };

    const versions = [
      {
        _id: 'v1',
        examId: 'exam1',
        versionCode: '101',
        pdfUrl: '/uploads/amc/exam1/v1.pdf',
        answerSheetPdfUrl: null,
        templateJson: null,
        generationErrors: [],
        createdAt: '2025-01-01',
      },
    ];

    const mapped = mapExamDetailData(exam, versions as any);
    expect(mapped!.versions[0].answerSheetPdfUrl).toBeNull();
  });

  it('returns null when exam is missing', () => {
    expect(mapExamDetailData(null, [])).toBeNull();
  });
});
