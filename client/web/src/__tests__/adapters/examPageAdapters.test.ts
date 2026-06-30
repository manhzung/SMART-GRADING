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
    expect(mapped!.versions[0].status).toBe('PDF Generated');
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

  it('marks omrTemplateReady=false when omrTemplateId is missing', () => {
    const exam = {
      _id: 'exam1',
      title: 'Sample',
      questionIds: [],
      classIds: [],
      status: 'draft' as const,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-02',
    };
    const mapped = mapExamDetailData(exam, []);
    expect(mapped!.omrTemplateReady).toBe(false);
  });

  it('marks omrTemplateReady=true when OMRTemplate has templateJson with studentId coords and answers', () => {
    const exam = {
      _id: 'exam1',
      title: 'Sample',
      questionIds: [],
      classIds: [],
      status: 'draft' as const,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-02',
      omrTemplateId: {
        _id: 'tpl1',
        name: 'A4-20Q',
        templateJson: {
          studentId: { coords: [{ x: 1, y: 1 }] },
          versionCode: { coords: [{ x: 1, y: 2 }] },
          answers: [
            { questionId: 1, options: ['A', 'B', 'C', 'D'] },
            { questionId: 2, options: ['A', 'B', 'C', 'D'] },
          ],
        },
      },
    };
    const mapped = mapExamDetailData(exam, []);
    expect(mapped!.omrTemplateReady).toBe(true);
  });

  it('marks omrTemplateReady=false when OMRTemplate has no templateJson', () => {
    const exam = {
      _id: 'exam1',
      title: 'Sample',
      questionIds: [],
      classIds: [],
      status: 'draft' as const,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-02',
      omrTemplateId: { _id: 'tpl1', name: 'A4-20Q' },
    };
    const mapped = mapExamDetailData(exam, []);
    expect(mapped!.omrTemplateReady).toBe(false);
  });

  it('marks omrTemplateReady=false when templateJson is missing answers section', () => {
    const exam = {
      _id: 'exam1',
      title: 'Sample',
      questionIds: [],
      classIds: [],
      status: 'draft' as const,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-02',
      omrTemplateId: {
        _id: 'tpl1',
        name: 'A4-20Q',
        templateJson: {
          studentId: { coords: [{ x: 1, y: 1 }] },
          // answers missing
        },
      },
    };
    const mapped = mapExamDetailData(exam, []);
    expect(mapped!.omrTemplateReady).toBe(false);
  });

  it('uses examTemplate.template as primary source for omrTemplateReady check', () => {
    // When examTemplate (from fetchExamTemplate) is provided, it takes priority
    const exam = {
      _id: 'exam1',
      title: 'Sample',
      questionIds: [],
      classIds: [],
      status: 'draft' as const,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-02',
      // omrTemplateId has no templateJson (fallback path)
      omrTemplateId: { _id: 'tpl1', name: 'A4-20Q' },
    };

    // examTemplate with full templateJson (primary source)
    const examTemplate = {
      examId: 'exam1',
      template: {
        examId: 'exam1',
        title: 'Sample',
        paperSize: 'A4',
        scanDpi: 300,
        scale: 1.0,
        pageWidth: 2480,
        pageHeight: 3508,
        bubbleWidth: 30,
        bubbleHeight: 30,
        studentId: { digits: 6, coords: [{ x: 100, y: 200, w: 30, h: 30 }] },
        versionCodeZone: { digits: 2, coords: [{ x: 300, y: 200, w: 30, h: 30 }] },
        answers: {
          q1: { A: { x: 100, y: 300, w: 30, h: 30 }, B: { x: 140, y: 300, w: 30, h: 30 } },
        },
        answerKey: { q1: 'A' },
        questionScores: { q1: 0.5 },
        totalScore: 10,
        numberOfQuestions: 1,
        autoAlign: false,
        generatedAt: '2025-01-01T00:00:00Z',
        source: 'amc',
      },
    } as any;

    const mapped = mapExamDetailData(exam, [], examTemplate);
    expect(mapped!.omrTemplateReady).toBe(true);
  });

  it('omrTemplateReady=false when examTemplate.template has no answers', () => {
    const exam = {
      _id: 'exam1',
      title: 'Sample',
      questionIds: [],
      classIds: [],
      status: 'draft' as const,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-02',
    };

    const examTemplate = {
      examId: 'exam1',
      template: {
        studentId: { coords: [{ x: 1, y: 1 }] },
        // answers is empty object
        answers: {},
      },
    } as any;

    const mapped = mapExamDetailData(exam, [], examTemplate);
    expect(mapped!.omrTemplateReady).toBe(false);
  });
});

