const mongoose = require('mongoose');

jest.mock('../../../src/models', () => ({
  Class: { countDocuments: jest.fn(), find: jest.fn() },
  Exam: { countDocuments: jest.fn(), find: jest.fn(), aggregate: jest.fn() },
  Submission: { countDocuments: jest.fn(), find: jest.fn(), aggregate: jest.fn() },
  Appeal: { countDocuments: jest.fn() },
  User: { countDocuments: jest.fn() },
}));

const analyticsController = require('../../../src/controllers/analytics.controller');
const { Class, Exam, Submission, Appeal, User } = require('../../../src/models');

const SCHOOL_ID = new mongoose.Types.ObjectId().toString();
const SCHOOL_CLASS_A = new mongoose.Types.ObjectId();
const SCHOOL_CLASS_B = new mongoose.Types.ObjectId();
const SCHOOL_EXAM = new mongoose.Types.ObjectId();
const OTHER_EXAM = new mongoose.Types.ObjectId();
const SCHOOL_STUDENT = new mongoose.Types.ObjectId();
const SCHOOL_SUBMISSION_DOC = {
  _id: 'sub1',
  examId: { _id: SCHOOL_EXAM, title: 'Mid-term Math' },
  studentId: { _id: SCHOOL_STUDENT, name: 'Nguyen Van A', email: 'a@x.com' },
  finalScore: 8,
  totalScore: 10,
  status: 'scanned',
  createdAt: new Date('2026-06-01'),
};

function thenableChain(data) {
  const promise = Promise.resolve(data);
  const chain = {
    sort: function () { return chain; },
    limit: function () { return chain; },
    populate: function () { return chain; },
    select: function () { return chain; },
    lean: function () { return chain; },
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
  };
  return chain;
}

function makeRes() {
  const sendFn = jest.fn();
  return { res: { send: sendFn, status: jest.fn().mockReturnThis() }, sendFn };
}

function makeReq(user = {}) {
  return { user };
}

describe('AnalyticsController.getDashboardStats - schoolId scoping', () => {
  let capturedErr;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedErr = null;

    // Class.find(...).select() returns the school's classes (used by our fix)
    const classChain = thenableChain([{ _id: SCHOOL_CLASS_A }, { _id: SCHOOL_CLASS_B }]);
    Class.find.mockReturnValue(classChain);

    User.countDocuments.mockResolvedValue(20);
    Class.countDocuments.mockResolvedValue(2);

    // Exams scoped to school's classes
    Exam.countDocuments.mockImplementation(async (filter) => {
      const ids = filter.classIds && filter.classIds.$in;
      if (!ids) return 14;
      return ids.some((i) => i.toString() === SCHOOL_CLASS_A.toString()) ? 1 : 0;
    });

    Exam.find.mockImplementation((filter) => {
      const ids = filter && filter.classIds && filter.classIds.$in;
      let results;
      if (ids) {
        results = ids.some((i) => i.toString() === SCHOOL_CLASS_A.toString())
          ? [{ _id: SCHOOL_EXAM, classIds: [SCHOOL_CLASS_A], createdAt: new Date() }]
          : [];
      } else {
        results = [
          { _id: SCHOOL_EXAM, classIds: [SCHOOL_CLASS_A], createdAt: new Date() },
          { _id: OTHER_EXAM, classIds: ['other-class'], createdAt: new Date() },
        ];
      }
      return thenableChain(results);
    });

    // Submissions scoped via examId $in
    Submission.countDocuments.mockImplementation(async (filter) => {
      const ids = filter && filter.examId && filter.examId.$in;
      if (!ids) return 25;
      return ids.some((i) => i.toString() === SCHOOL_EXAM.toString()) ? 1 : 0;
    });

    Submission.find.mockImplementation((filter) => {
      const ids = filter && filter.examId && filter.examId.$in;
      let results;
      if (ids) {
        results = ids.some((i) => i.toString() === SCHOOL_EXAM.toString())
          ? [SCHOOL_SUBMISSION_DOC]
          : [];
      } else {
        results = [SCHOOL_SUBMISSION_DOC, { _id: 'sub2', examId: OTHER_EXAM }];
      }
      return thenableChain(results);
    });

    Submission.aggregate.mockResolvedValue([]);

    Appeal.countDocuments.mockImplementation(async (filter) => {
      const ids = filter && filter.examId && filter.examId.$in;
      if (!ids) return 0;
      return ids.some((i) => i.toString() === SCHOOL_EXAM.toString()) ? 2 : 0;
    });
  });

  const next = (err) => { capturedErr = err; };

  it('returns recentSubmissions scoped to the user school', async () => {
    const req = makeReq({ id: 'user1', schoolId: SCHOOL_ID, role: 'teacher' });
    const { res, sendFn } = makeRes();

    await analyticsController.getDashboardStats(req, res, next);
    await new Promise((r) => setTimeout(r, 30));

    expect(capturedErr).toBeNull();
    expect(sendFn).toHaveBeenCalledTimes(1);
    const payload = sendFn.mock.calls[0][0];

    // Bug reproduction: dashboard should reflect scoped counts, not 0 / total
    expect(payload.totalSubmissions).toBe(1);
    expect(payload.totalExams).toBe(1);
    expect(payload.pendingAppeals).toBe(2);
    expect(Array.isArray(payload.recentSubmissions)).toBe(true);
    expect(payload.recentSubmissions).toHaveLength(1);
    expect(payload.recentSubmissions[0]).toEqual(
      expect.objectContaining({
        id: SCHOOL_SUBMISSION_DOC._id,
        exam: expect.objectContaining({ id: SCHOOL_EXAM }),
      })
    );
  });

  it('does NOT inject raw schoolId filter into Submission/Exam/Appeal (which lack the field)', async () => {
    const req = makeReq({ id: 'user1', schoolId: SCHOOL_ID, role: 'teacher' });
    const { res, sendFn } = makeRes();

    await analyticsController.getDashboardStats(req, res, next);
    await new Promise((r) => setTimeout(r, 30));

    expect(capturedErr).toBeNull();

    const submissionFilters = Submission.countDocuments.mock.calls.map((c) => c[0]);
    const submissionFindFilters = Submission.find.mock.calls.map((c) => c[0]);
    const examFindFilters = Exam.find.mock.calls.map((c) => c[0]);
    const examCountFilters = Exam.countDocuments.mock.calls.map((c) => c[0]);
    const appealFilters = Appeal.countDocuments.mock.calls.map((c) => c[0]);

    for (const f of [...submissionFilters, ...submissionFindFilters, ...examFindFilters, ...examCountFilters, ...appealFilters]) {
      if (!f) continue;
      expect(f).not.toHaveProperty('schoolId');
    }
  });

  it('returns recentSubmissions=[] only when there really are no submissions for the school', async () => {
    Submission.countDocuments.mockImplementation(async (filter) => {
      const ids = filter && filter.examId && filter.examId.$in;
      if (ids) return 0;
      return 25;
    });
    Submission.find.mockImplementation(() => thenableChain([]));

    const req = makeReq({ id: 'user1', schoolId: SCHOOL_ID, role: 'teacher' });
    const { res, sendFn } = makeRes();

    await analyticsController.getDashboardStats(req, res, next);
    await new Promise((r) => setTimeout(r, 30));

    expect(capturedErr).toBeNull();
    const payload = sendFn.mock.calls[0][0];

    expect(payload.recentSubmissions).toEqual([]);
    expect(payload.totalSubmissions).toBe(0);
  });

  it('admin without schoolId sees global counts', async () => {
    Exam.countDocuments.mockResolvedValue(14);
    Submission.countDocuments.mockResolvedValue(25);
    Appeal.countDocuments.mockResolvedValue(0);

    const req = makeReq({ id: 'admin1', schoolId: null, role: 'admin' });
    const { res, sendFn } = makeRes();

    await analyticsController.getDashboardStats(req, res, next);
    await new Promise((r) => setTimeout(r, 30));

    expect(capturedErr).toBeNull();
    const payload = sendFn.mock.calls[0][0];

    expect(payload.totalExams).toBe(14);
    expect(payload.totalSubmissions).toBe(25);
  });
});