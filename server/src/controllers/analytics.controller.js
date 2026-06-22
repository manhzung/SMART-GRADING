const httpStatus = require('http-status');
const mongoose = require('mongoose');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { User, Class, Exam, Submission, Appeal } = require('../models');

const getDashboardStats = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  const schoolId = req.user?.schoolId;
  const userRole = req.user?.role;

  const baseFilter = schoolId ? { schoolId } : {};

  let classFilter = { isActive: true, ...baseFilter };
  if (userId && userRole === 'teacher') {
    classFilter = {
      isActive: true,
      ...baseFilter,
      $or: [{ homeroomTeacherId: userId }, { 'subjectTeachers.teacherId': userId }],
    };
  } else if (userId && userRole === 'student') {
    classFilter = {
      isActive: true,
      ...baseFilter,
      studentIds: userId,
    };
  }

  const [
    totalClasses,
    totalExams,
    totalStudents,
    totalSubmissions,
    pendingAppeals,
    publishedExams,
  ] = await Promise.all([
    Class.countDocuments(classFilter),
    Exam.countDocuments({ ...baseFilter }),
    User.countDocuments({ role: 'student', isActive: true, ...(schoolId ? { schoolId } : {}) }),
    Submission.countDocuments({ ...baseFilter }),
    Appeal.countDocuments({ status: 'pending', ...(schoolId ? { schoolId } : {}) }),
    Exam.countDocuments({ status: 'published', ...baseFilter }),
  ]);

  const recentSubmissions = await Submission.find(baseFilter)
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('studentId', 'name email')
    .populate('examId', 'title');

  const avgScoreResult = await Submission.aggregate([
    { $match: { ...baseFilter, totalScore: { $exists: true } } },
    { $group: { _id: null, avg: { $avg: '$totalScore' }, max: { $max: '$totalScore' } } },
  ]);

  const avgScore = avgScoreResult[0] ? Math.round((avgScoreResult[0].avg + Number.EPSILON) * 100) / 100 : 0;

  const passRateResult = await Submission.aggregate([
    { $match: baseFilter },
    {
      $lookup: {
        from: 'exams',
        localField: 'examId',
        foreignField: '_id',
        as: 'exam',
      },
    },
    { $unwind: '$exam' },
    {
      $match: {
        totalScore: { $exists: true },
        finalScore: { $exists: true },
      },
    },
    {
      $addFields: {
        isPass: {
          $gte: [
            { $multiply: [{ $divide: ['$finalScore', '$totalScore'] }, 10] },
            '$exam.passingScore',
          ],
        },
      },
    },
    { $group: { _id: null, passCount: { $sum: { $cond: ['$isPass', 1, 0] } }, total: { $sum: 1 } } },
  ]);

  const passRate = passRateResult[0]
    ? Math.round((passRateResult[0].passCount / passRateResult[0].total) * 100)
    : 0;

  res.send({
    totalClasses,
    totalExams,
    totalStudents,
    totalSubmissions,
    pendingAppeals,
    publishedExams,
    avgScore,
    passRate,
    recentSubmissions: recentSubmissions.map((s) => ({
      id: s._id,
      student: s.studentId ? { id: s.studentId._id, name: s.studentId.name } : null,
      exam: s.examId ? { id: s.examId._id, title: s.examId.title } : null,
      score: s.finalScore,
      maxScore: s.totalScore,
      status: s.status,
      createdAt: s.createdAt,
    })),
  });
});

const getAnalytics = catchAsync(async (req, res) => {
  const { period = 'month' } = req.query;
  const schoolId = req.user?.schoolId;

  const now = new Date();
  let startDate;
  if (period === 'week') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === 'semester') {
    startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  } else {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const baseFilter = schoolId ? { schoolId } : {};
  const dateFilter = { createdAt: { $gte: startDate } };
  const filter = { ...baseFilter, ...dateFilter };

  const subjectPerformance = await Exam.aggregate([
    { $match: { ...filter } },
    {
      $lookup: {
        from: 'submissions',
        localField: '_id',
        foreignField: 'examId',
        as: 'submissions',
      },
    },
    {
      $lookup: {
        from: 'subjects',
        localField: 'classIds',
        foreignField: '_id',
        as: 'subjects',
      },
    },
    {
      $addFields: {
        avgScore: {
          $cond: {
            if: { $gt: [{ $size: '$submissions' }, 0] },
            then: {
              $divide: [
                { $sum: '$submissions.finalScore' },
                { $sum: '$submissions.totalScore' },
              ],
            },
            else: 0,
          },
        },
        submissionCount: { $size: '$submissions' },
      },
    },
    {
      $project: {
        title: 1,
        avgScore: { $multiply: [{ $ifNull: ['$avgScore', 0] }, 10] },
        submissionCount: 1,
        status: 1,
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: 10 },
  ]);

  const gradeDistribution = await Submission.aggregate([
    { $match: baseFilter },
    {
      $addFields: {
        scorePercent: {
          $cond: {
            if: { $and: [{ $gt: ['$totalScore', 0] }, '$finalScore'] },
            then: { $multiply: [{ $divide: ['$finalScore', '$totalScore'] }, 10] },
            else: 0,
          },
        },
      },
    },
    {
      $addFields: {
        grade:
          '$scorePercent' >= 8.5
            ? 'A'
            : '$scorePercent' >= 7.0
            ? 'B'
            : '$scorePercent' >= 5.0
            ? 'C'
            : 'D',
      },
    },
    { $group: { _id: '$grade', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const gradeMap = { A: 0, B: 0, C: 0, D: 0 };
  gradeDistribution.forEach((g) => {
    if (g._id in gradeMap) gradeMap[g._id] = g.count;
  });

  const recentTrends = await Submission.aggregate([
    { $match: baseFilter },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        avgScore: { $avg: '$finalScore' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 30 },
  ]);

  const studentRankings = await Submission.aggregate([
    { $match: baseFilter },
    {
      $lookup: {
        from: 'users',
        localField: 'studentId',
        foreignField: '_id',
        as: 'student',
      },
    },
    { $unwind: '$student' },
    {
      $group: {
        _id: '$studentId',
        name: { $first: '$student.name' },
        email: { $first: '$student.email' },
        avgScore: { $avg: '$finalScore' },
        totalExams: { $sum: 1 },
      },
    },
    { $sort: { avgScore: -1 } },
    { $limit: 10 },
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        avgScore: { $round: [{ $multiply: ['$avgScore', 10] }, 2] },
        totalExams: 1,
        trend: { $literal: 'up' },
      },
    },
  ]);

  const summary = {
    totalExams: await Exam.countDocuments({ ...baseFilter }),
    totalSubmissions: await Submission.countDocuments({ ...baseFilter, createdAt: { $gte: startDate } }),
    avgScore:
      (
        await Submission.aggregate([
          { $match: { ...baseFilter, createdAt: { $gte: startDate }, finalScore: { $exists: true } } },
          { $group: { _id: null, avg: { $avg: '$finalScore' } } },
        ])
      )[0]?.avg || 0,
    totalStudents: await User.countDocuments({ role: 'student', isActive: true, ...(schoolId ? { schoolId } : {}) }),
  };

  res.send({
    summary,
    subjectPerformance: subjectPerformance.map((e) => ({
      subject: e.title,
      avgScore: Math.round((e.avgScore + Number.EPSILON) * 100) / 100,
      examCount: e.submissionCount,
    })),
    gradeDistribution: [
      { grade: 'A', count: gradeMap.A, color: '#22C55E' },
      { grade: 'B', count: gradeMap.B, color: '#3B82F6' },
      { grade: 'C', count: gradeMap.C, color: '#F59E0B' },
      { grade: 'D', count: gradeMap.D, color: '#EF4444' },
    ],
    studentRankings,
    recentTrends: recentTrends.map((t) => ({
      date: t._id,
      avgScore: Math.round((t.avgScore + Number.EPSILON) * 100) / 100,
      submissions: t.count,
    })),
  });
});

module.exports = {
  getDashboardStats,
  getAnalytics,
};
