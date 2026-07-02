const httpStatus = require('http-status');
const questionService = require('../services/question.service');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

const create = catchAsync(async (req, res) => {
  const question = await questionService.create(req.body, req.user?.id, req.user?.schoolId, req.user?.role);
  res.status(httpStatus.CREATED).send(question);
});

const getAll = catchAsync(async (req, res) => {
  // Non-admins MUST select a bank before listing questions. This prevents
  // accidental exposure of legacy/unbanked questions and enforces the new
  // per-bank permission model.
  // Exception: if ?allBanks=true is passed, search across all banks in the school.
  if (req.user?.role !== 'admin' && !req.query.bankId && !req.query.allBanks) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'bankId is required. Please select or create a question bank first.');
  }
  const result = await questionService.getAll(req.query, req.user);
  res.send(result);
});

/**
 * Search questions across ALL banks in the user's school.
 * Respects role-based permissions (school scoping).
 */
const searchAllBanks = catchAsync(async (req, res) => {
  const result = await questionService.getAllSchoolQuestions(req.query, req.user);
  res.send(result);
});

const getById = catchAsync(async (req, res) => {
  const question = await questionService.getById(req.params.id, req.user);
  if (!question) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Question not found' });
  }
  res.send(question);
});

const update = catchAsync(async (req, res) => {
  const question = await questionService.update(req.params.id, req.body, req.user);
  if (!question) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Question not found' });
  }
  res.send(question);
});

const approve = catchAsync(async (req, res) => {
  const question = await questionService.approve(req.params.id, req.user.id, req.user.schoolId, req.user.role);
  res.send(question);
});

const reject = catchAsync(async (req, res) => {
  const { reason } = req.body || {};
  const question = await questionService.reject(req.params.id, req.user.id, req.user.schoolId, req.user.role, reason);
  res.send(question);
});

const remove = catchAsync(async (req, res) => {
  const question = await questionService.delete(req.params.id, req.user);
  if (!question) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Question not found' });
  }
  res.status(httpStatus.NO_CONTENT).send();
});

const questionGenService = require('../services/questionGen.service');

const generate = catchAsync(async (req, res) => {
  const { topicId, count, difficulty, requirements, gradeLevel, subjectId } = req.body;
  const { Question } = require('../models');

  let topicName = '';
  if (topicId) {
    const existingQuestion = await Question.findOne({ topicId }).select('topicName').lean().sort({ createdAt: -1 });
    topicName = existingQuestion?.topicName || '';
  }

  // Generate questions WITHOUT saving to DB - let client decide which to save
  const generated = await questionGenService.generateQuestions({
    topicId,
    topicName: topicName || requirements || '',
    count: count || 5,
    difficulty: difficulty || 'medium',
    requirements: requirements || '',
    gradeLevel: gradeLevel || 10,
    subjectId: subjectId || null,
    createdBy: req.user?.id,
    schoolId: req.user?.schoolId || null,
  });

  // Return generated questions for preview (don't save to DB yet)
  res.status(httpStatus.OK).send({
    success: true,
    data: {
      count: generated.length,
      questions: generated.map((q) => ({
        content: q.content,
        type: q.type,
        options: q.options,
        difficulty: q.difficulty,
        topicId: q.topicId,
        topicName: q.topicName,
        source: q.source,
        explanation: q.explanation || '',
        tags: q.tags,
      })),
    },
  });
});

/**
 * Generate similar questions based on source questions
 */
const generateSimilar = catchAsync(async (req, res) => {
  const { sourceQuestionIds, count, difficulty } = req.body;
  console.log('[generateSimilar] Received:', { sourceQuestionIds, count, difficulty });
  const { Question } = require('../models');

  // Fetch source questions
  const sourceQuestions = await Question.find({ _id: { $in: sourceQuestionIds } }).lean();

  if (sourceQuestions.length === 0) {
    throw new ApiError(404, 'Không tìm thấy câu hỏi nguồn');
  }

  // Build context from source questions
  const sourceContext = sourceQuestions
    .map(
      (q, idx) =>
        `Câu ${idx + 1}: ${q.content}\n` +
        `Đáp án: ${q.options.find((o) => o.isCorrect)?.content || 'N/A'}\n` +
        `Độ khó: ${q.difficulty}`
    )
    .join('\n\n');

  // Generate similar questions
  const generated = await questionGenService.generateSimilarQuestions({
    sourceContext,
    count: count || 5,
    difficulty: difficulty || sourceQuestions[0].difficulty || 'medium',
    createdBy: req.user?.id,
    schoolId: req.user?.schoolId || null,
    tags: sourceQuestions[0].tags || [],
    sourceQuestionIds,
  });

  res.status(httpStatus.OK).send({
    success: true,
    data: {
      count: generated.length,
      questions: generated,
    },
  });
});

const getTags = catchAsync(async (req, res) => {
  const { Question, QuestionBank } = require('../models');
  const QuestionBankService = require('../services/questionBank.service');
  const user = req.user;

  const filter = {};
  if (req.query.bankId) {
    filter.bankId = req.query.bankId;
  } else if (user?.role !== 'admin') {
    // If not admin, find all bank IDs this user has access to
    const queries = [
      QuestionBankService.listApprovedBanksForUser(user.id),
      QuestionBank.find({ createdBy: user.id }).select('_id').lean(),
    ];

    if (user?.role === 'school-admin' && user?.schoolId) {
      queries.push(QuestionBank.find({ schoolId: user.schoolId }).select('_id').lean());
    }

    const [approvedBanks, ownedBanks, schoolBanks = []] = await Promise.all(queries);

    const bankIds = new Set();
    approvedBanks.forEach(b => {
      if (b && b._id) bankIds.add(b._id.toString());
    });
    ownedBanks.forEach(b => {
      if (b && b._id) bankIds.add(b._id.toString());
    });
    schoolBanks.forEach(b => {
      if (b && b._id) bankIds.add(b._id.toString());
    });

    const bankIdList = Array.from(bankIds);
    filter.bankId = { $in: bankIdList };

    if (user?.schoolId) {
      filter.schoolId = user.schoolId;
    }
    if (user?.role === 'student') {
      filter.isApproved = true;
    }
  }

  const tags = await Question.distinct('tags', filter);
  const sortedTags = tags.filter(Boolean).sort((a, b) => a.localeCompare(b));
  res.send({ tags: sortedTags });
});

const getBankStats = catchAsync(async (req, res) => {
  const stats = await questionService.getBankStats(req.user);
  res.send(stats);
});

/**
 * Get questions filtered by tags
 * User can select questions to create exam
 */
const getByTags = catchAsync(async (req, res) => {
  const { tags, difficulty, limit, excludeIds } = req.query;

  const filter = questionService.buildRoleFilter(req.user);

  // Parse tags (comma-separated)
  if (tags) {
    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    filter.tags = { $in: tagList };
  }

  // Filter by difficulty
  if (difficulty) {
    filter.difficulty = difficulty.toLowerCase();
  }

  // Exclude specific IDs (questions already selected)
  if (excludeIds) {
    const excludeList = excludeIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    filter._id = { $nin: excludeList };
  }

  const questions = await Question.find(filter)
    .select('content options difficulty tags topicName usageCount correctRate source createdAt')
    .limit(parseInt(limit, 10) || 20)
    .sort({ usageCount: -1, createdAt: -1 }) // Prioritize popular questions
    .lean();

  // Hide correct answers for non-admin/teacher
  const isPrivileged = req.user?.role === 'admin' || req.user?.role === 'teacher';
  const sanitizedQuestions = questions.map((q) => {
    if (!isPrivileged) {
      return {
        ...q,
        options: q.options.map(({ isCorrect, ...rest }) => rest),
        correctAnswer: undefined,
      };
    }
    return q;
  });

  // Group by difficulty for UI display
  const byDifficulty = {
    easy: sanitizedQuestions.filter((q) => q.difficulty === 'easy'),
    medium: sanitizedQuestions.filter((q) => q.difficulty === 'medium'),
    hard: sanitizedQuestions.filter((q) => q.difficulty === 'hard'),
  };

  res.send({
    success: true,
    data: {
      total: sanitizedQuestions.length,
      byDifficulty,
      questions: sanitizedQuestions,
    },
  });
});

const getByBank = catchAsync(async (req, res) => {
  const result = await questionService.getAll({ bankId: req.params.bankId }, req.user);
  res.send(result);
});

module.exports = {
  create,
  getAll,
  getById,
  update,
  approve,
  reject,
  remove,
  generate,
  generateSimilar,
  getTags,
  getBankStats,
  getByTags,
  getByBank,
  searchAllBanks,
};
