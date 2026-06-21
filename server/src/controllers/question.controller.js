const httpStatus = require('http-status');
const questionService = require('../services/question.service');
const catchAsync = require('../utils/catchAsync');

const create = catchAsync(async (req, res) => {
  const question = await questionService.create(
    req.body,
    req.user?.id,
    req.user?.schoolId,
    req.user?.role
  );
  res.status(httpStatus.CREATED).send(question);
});

const getAll = catchAsync(async (req, res) => {
  const result = await questionService.getAll(req.query, req.user);
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
  const question = await questionService.approve(
    req.params.id,
    req.user.id,
    req.user.schoolId,
    req.user.role
  );
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
  const { topicId, count, difficulty, requirements, gradeLevel } = req.body;
  const { Question } = require('../models');

  const generated = await questionGenService.generateQuestions({
    topicId,
    topicName: '',
    count: count || 5,
    difficulty: difficulty || 'medium',
    requirements: requirements || '',
    gradeLevel: gradeLevel || 10,
    subjectId: null,
    createdBy: req.user?.id,
  });

  const inserted = await Question.insertMany(generated);

  res.status(httpStatus.CREATED).send({
    success: true,
    data: {
      count: inserted.length,
      questions: inserted.map((q) => ({
        _id: q._id,
        content: q.content,
        difficulty: q.difficulty,
        topicId: q.topicId,
        topicName: q.topicName,
        source: q.source,
        isApproved: q.isApproved,
      })),
    },
  });
});

const getTags = catchAsync(async (req, res) => {
  const { Question } = require('../models');
  const user = req.user;

  const filter = {};
  if (user?.role === 'teacher' && user?.schoolId) {
    filter.schoolId = user.schoolId;
  } else if (user?.role === 'student') {
    filter.schoolId = user.schoolId;
    filter.isApproved = true;
  }

  const tags = await Question.distinct('tags', filter);
  const sortedTags = tags.filter(Boolean).sort((a, b) => a.localeCompare(b));
  res.send({ tags: sortedTags });
});

const getBankStats = catchAsync(async (req, res) => {
  const stats = await questionService.getBankStats(req.user);
  res.send(stats);
});

module.exports = {
  create,
  getAll,
  getById,
  update,
  approve,
  remove,
  generate,
  getTags,
  getBankStats,
};
