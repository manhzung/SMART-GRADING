const httpStatus = require('http-status');
const schoolService = require('../services/school.service');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const pick = require('../utils/pick');

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

const getAvailableTeachers = catchAsync(async (req, res) => {
  const result = await schoolService.getAvailableTeachers(req.params.schoolId, req.query, req.user);
  res.send(result);
});

// ── School Approval Controllers ─────────────────────────────────────────────────

const getPendingSchools = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền xem trường chờ duyệt');
  }
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await schoolService.getPendingSchools(options);
  res.send(result);
});

const approveSchool = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền duyệt trường');
  }
  const school = await schoolService.approveSchool(req.params.id, req.user.id);
  res.send(school);
});

const rejectSchool = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền từ chối trường');
  }
  const { reason } = req.body || {};
  const school = await schoolService.rejectSchool(req.params.id, reason, req.user.id);
  res.send(school);
});

module.exports = {
  create,
  getAll,
  getById,
  update,
  remove,
  getGradeDistribution,
  getAvailableTeachers,
  getPendingSchools,
  approveSchool,
  rejectSchool,
};
