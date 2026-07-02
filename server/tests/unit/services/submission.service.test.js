const submissionService = require('../../../src/services/submission.service');
const Exam = require('../../../src/models/exam.model');

jest.mock('../../../src/models/exam.model');

describe('SubmissionService - scan with classId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return accepted response with classId in payload', async () => {
    const examId = '507f1f77bcf86cd799439011';
    const classId = '507f1f77bcf86cd799439012';

    Exam.findById.mockResolvedValue({ _id: examId, title: 'Test Exam' });

    const result = await submissionService.scan({
      examId,
      classId,
      image: 'data:image/png;base64,XYZ',
    });

    expect(result.examId).toBe(examId);
    expect(result).toHaveProperty('classId', classId);
  });

  test('should accept scan without classId (backward compat)', async () => {
    const examId = '507f1f77bcf86cd799439011';

    Exam.findById.mockResolvedValue({ _id: examId, title: 'Test Exam' });

    const result = await submissionService.scan({
      examId,
      image: 'data:image/png;base64,XYZ',
    });

    expect(result.examId).toBe(examId);
    expect(result.classId).toBeUndefined();
  });
});
