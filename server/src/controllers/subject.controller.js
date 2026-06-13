const httpStatus = require('http-status');
const subjectService = require('../services/subject.service');
const catchAsync = require('../utils/catchAsync');

const create = catchAsync(async (req, res) => {
  const subject = await subjectService.create(req.body);
  res.status(httpStatus.CREATED).send(subject);
});

const getAll = catchAsync(async (req, res) => {
  const result = await subjectService.getAll(req.query);
  res.send(result);
});

const getById = catchAsync(async (req, res) => {
  const subject = await subjectService.getById(req.params.id);
  res.send(subject);
});

const update = catchAsync(async (req, res) => {
  const subject = await subjectService.update(req.params.id, req.body);
  res.send(subject);
});

const remove = catchAsync(async (req, res) => {
  await subjectService.delete(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  create,
  getAll,
  getById,
  update,
  remove,
};
