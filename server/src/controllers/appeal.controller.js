const httpStatus = require('http-status');
const appealService = require('../services/appeal.service');
const catchAsync = require('../utils/catchAsync');

const create = catchAsync(async (req, res) => {
  const appeal = await appealService.create({ ...req.body, studentId: req.user.id });
  res.status(httpStatus.CREATED).send(appeal);
});

const getById = catchAsync(async (req, res) => {
  const appeal = await appealService.getById(req.params.id);
  if (!appeal) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Appeal not found' });
  }
  res.send(appeal);
});

const getAll = catchAsync(async (req, res) => {
  const result = await appealService.getAll(req.query);
  res.send(result);
});

const getByStudent = catchAsync(async (req, res) => {
  const { studentId } = req.params;
  const result = await appealService.getByStudent(studentId, req.query);
  res.send(result);
});

const getMy = catchAsync(async (req, res) => {
  const result = await appealService.getMy(req.user.id, req.query);
  res.send(result);
});

const getByExam = catchAsync(async (req, res) => {
  const { examId } = req.params;
  const result = await appealService.getByExam(examId, req.query);
  res.send(result);
});

const review = catchAsync(async (req, res) => {
  const appeal = await appealService.review(req.params.id, req.body, req.user.id);
  res.send(appeal);
});

const getPendingCount = catchAsync(async (req, res) => {
  const { examId } = req.params;
  const count = await appealService.getPendingCount(examId);
  res.send({ pendingCount: count });
});

module.exports = {
  create,
  getById,
  getAll,
  getByStudent,
  getMy,
  getByExam,
  review,
  getPendingCount,
};
