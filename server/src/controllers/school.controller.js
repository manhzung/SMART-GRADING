const httpStatus = require('http-status');
const schoolService = require('../services/school.service');
const catchAsync = require('../utils/catchAsync');

const create = catchAsync(async (req, res) => {
  const school = await schoolService.create(req.body);
  res.status(httpStatus.CREATED).send(school);
});

const getAll = catchAsync(async (req, res) => {
  const result = await schoolService.getAll(req.query);
  res.set('Cache-Control', 'no-cache');
  res.send(result);
});

const getById = catchAsync(async (req, res) => {
  const school = await schoolService.getById(req.params.id);
  if (!school) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'School not found' });
  }
  res.send(school);
});

const update = catchAsync(async (req, res) => {
  const school = await schoolService.update(req.params.id, req.body);
  if (!school) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'School not found' });
  }
  res.send(school);
});

const remove = catchAsync(async (req, res) => {
  const school = await schoolService.delete(req.params.id);
  if (!school) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'School not found' });
  }
  res.status(httpStatus.NO_CONTENT).send();
});

const getGradeDistribution = catchAsync(async (req, res) => {
  const { scores } = req.body;
  const distribution = await schoolService.getGradeDistribution(req.params.id, scores);
  if (!distribution) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'School not found' });
  }
  res.send(distribution);
});

module.exports = {
  create,
  getAll,
  getById,
  update,
  remove,
  getGradeDistribution,
};
