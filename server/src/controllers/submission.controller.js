const httpStatus = require('http-status');
const submissionService = require('../services/submission.service');
const catchAsync = require('../utils/catchAsync');

const scan = catchAsync(async (req, res) => {
  const result = await submissionService.scan(req.body);
  res.status(httpStatus.ACCEPTED).send(result);
});

const getById = catchAsync(async (req, res) => {
  const submission = await submissionService.getById(req.params.id);
  if (!submission) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Submission not found' });
  }
  res.send(submission);
});

const getAll = catchAsync(async (req, res) => {
  const result = await submissionService.getAll(req.query);
  res.send(result);
});

const getByExam = catchAsync(async (req, res) => {
  const { examId, id } = req.params;
  const result = await submissionService.getByExam(examId || id, req.query);
  res.send(result);
});

const getByStudent = catchAsync(async (req, res) => {
  const { studentId } = req.params;
  const result = await submissionService.getByStudent(studentId, req.query);
  res.send(result);
});

const getMy = catchAsync(async (req, res) => {
  const result = await submissionService.getMy(req.user.id, req.query);
  res.send(result);
});

const manualOverride = catchAsync(async (req, res) => {
  const submission = await submissionService.manualOverride(req.params.id, req.body, req.user.id);
  res.send(submission);
});

const updateAnswers = catchAsync(async (req, res) => {
  const result = await submissionService.updateAnswers(req.params.id, req.body.answers);
  res.send(result);
});

const getStatistics = catchAsync(async (req, res) => {
  const { examId } = req.params;
  const stats = await submissionService.getStatistics(examId);
  res.send(stats);
});

const remove = catchAsync(async (req, res) => {
  await submissionService.delete(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

const attachImage = catchAsync(async (req, res) => {
  const auditContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
  const submission = await submissionService.attachImage(
    req.params.id, req.user.id, req.body, auditContext
  );
  res.send(submission);
});

const deleteImage = catchAsync(async (req, res) => {
  const auditContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
  const { submission } = await submissionService.deleteImage(
    req.params.id, req.user.id, req.params.type, auditContext
  );
  res.send(submission);
});

module.exports = {
  scan,
  getById,
  getAll,
  getByExam,
  getByStudent,
  getMy,
  manualOverride,
  updateAnswers,
  getStatistics,
  remove,
  attachImage,
  deleteImage,
};
