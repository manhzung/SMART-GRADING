jest.mock('../../../src/services/appeal.service');

const httpMocks = require('node-mocks-http');
const appealController = require('../../../src/controllers/appeal.controller');
const appealService = require('../../../src/services/appeal.service');

const APPEAL_ID = '64a1b2c3d4e5f67890123456';
const USER_ID = 'teacher-user-id';

const APPEAL_BODY = {
  _id: APPEAL_ID,
  submissionId: 'sub123',
  examId: 'exam456',
  studentId: 'student789',
  questionId: 'q001',
  questionPosition: 1,
  currentAnswer: 'A',
  expectedAnswer: 'B',
  status: 'pending',
  teacherResponse: null,
  createdAt: new Date(),
};

describe('AppealController', () => {
  let capturedErr;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedErr = null;
  });

  const next = (err) => {
    capturedErr = err;
  };

  describe('create', () => {
    it('success - returns 201 with appeal body', async () => {
      appealService.create.mockResolvedValue(APPEAL_BODY);

      const req = httpMocks.createRequest({
        method: 'POST',
        body: {
          submissionId: 'sub123',
          examId: 'exam456',
          studentId: 'student789',
          questionId: 'q001',
        },
      });
      const res = httpMocks.createResponse();

      appealController.create(req, res, next);
      await new Promise((r) => setTimeout(r, 30));

      expect(capturedErr).toBeNull();
      expect(appealService.create).toHaveBeenCalledWith(req.body);
      expect(res.statusCode).toBe(201);
      expect(res._getData()).toMatchObject({
        _id: APPEAL_ID,
        status: 'pending',
      });
    });

    it('throws on duplicate - propagates service error', async () => {
      appealService.create.mockRejectedValue(new Error('Appeal already exists for this question'));

      const req = httpMocks.createRequest({
        method: 'POST',
        body: { submissionId: 'sub123' },
      });
      const res = httpMocks.createResponse();

      appealController.create(req, res, next);
      await new Promise((r) => setTimeout(r, 30));

      expect(capturedErr).not.toBeNull();
      expect(capturedErr.message).toBe('Appeal already exists for this question');
    });
  });

  describe('review', () => {
    const REVIEW_BODY = { decision: 'approved', note: 'OK' };

    it('success approved - returns 200 with appeal', async () => {
      const reviewedAppeal = {
        ...APPEAL_BODY,
        status: 'approved',
        teacherResponse: {
          reviewedBy: USER_ID,
          reviewedAt: expect.any(Date),
          decision: 'approved',
          note: 'OK',
        },
      };
      appealService.review.mockResolvedValue(reviewedAppeal);

      const req = httpMocks.createRequest({
        method: 'POST',
        params: { id: APPEAL_ID },
        body: REVIEW_BODY,
        user: { id: USER_ID },
      });
      const res = httpMocks.createResponse();

      appealController.review(req, res, next);
      await new Promise((r) => setTimeout(r, 30));

      expect(capturedErr).toBeNull();
      expect(appealService.review).toHaveBeenCalledWith(APPEAL_ID, REVIEW_BODY, USER_ID);
      expect(res.statusCode).toBe(200);
      expect(res._getData()).toMatchObject({ _id: APPEAL_ID, status: 'approved' });
    });

    it('success rejected - returns 200 with appeal', async () => {
      const rejectedAppeal = {
        ...APPEAL_BODY,
        status: 'rejected',
        teacherResponse: {
          reviewedBy: USER_ID,
          reviewedAt: expect.any(Date),
          decision: 'rejected',
          note: 'Từ chối',
        },
      };
      appealService.review.mockResolvedValue(rejectedAppeal);

      const req = httpMocks.createRequest({
        method: 'POST',
        params: { id: APPEAL_ID },
        body: { decision: 'rejected', note: 'Từ chối' },
        user: { id: USER_ID },
      });
      const res = httpMocks.createResponse();

      appealController.review(req, res, next);
      await new Promise((r) => setTimeout(r, 30));

      expect(capturedErr).toBeNull();
      expect(appealService.review).toHaveBeenCalledWith(APPEAL_ID, { decision: 'rejected', note: 'Từ chối' }, USER_ID);
      expect(res.statusCode).toBe(200);
      expect(res._getData()).toMatchObject({ _id: APPEAL_ID, status: 'rejected' });
    });

    it('404 not found - propagates service error', async () => {
      appealService.review.mockRejectedValue(new Error('Appeal not found'));

      const req = httpMocks.createRequest({
        method: 'POST',
        params: { id: 'nonexistent-id' },
        body: REVIEW_BODY,
        user: { id: USER_ID },
      });
      const res = httpMocks.createResponse();

      appealController.review(req, res, next);
      await new Promise((r) => setTimeout(r, 30));

      expect(capturedErr).not.toBeNull();
      expect(capturedErr.message).toBe('Appeal not found');
    });

    it('400 already reviewed - propagates service error', async () => {
      appealService.review.mockRejectedValue(new Error('Appeal already reviewed'));

      const req = httpMocks.createRequest({
        method: 'POST',
        params: { id: APPEAL_ID },
        body: REVIEW_BODY,
        user: { id: USER_ID },
      });
      const res = httpMocks.createResponse();

      appealController.review(req, res, next);
      await new Promise((r) => setTimeout(r, 30));

      expect(capturedErr).not.toBeNull();
      expect(capturedErr.message).toBe('Appeal already reviewed');
    });
  });
});
