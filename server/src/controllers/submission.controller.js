const httpStatus = require('http-status');
const submissionService = require('../services/submission.service');
const catchAsync = require('../utils/catchAsync');

const scan = catchAsync(async (req, res) => {
  // ── Normalize payload ──────────────────────────────────────────────
  // Mobile AMC flow sends multipart with answers as jsonEncode()'d string.
  // Normalize it to an object before passing to service.
  let payload = { ...req.body };

  if (typeof payload.answers === 'string') {
    try {
      payload.answers = JSON.parse(payload.answers);
    } catch {
      // Not JSON — legacy format, leave as-is
    }
  }

  const result = await submissionService.scan(payload);
  res.status(httpStatus.ACCEPTED).send({
    id: result.submissionId,
    status: result.status,
    submissionId: result.submissionId,
    totalScore: result.totalScore,
    maxScore: result.maxScore,
    answerCount: result.answerCount,
    detectedAnswers: result.detectedAnswers || {},
    confidence: result.pythonResult?.metadata?.confidence ?? 0,
    templateId: result.examId,
  });
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

const getByExamGroupedByClass = catchAsync(async (req, res) => {
  const { examId } = req.params;
  const result = await submissionService.getExamSubmissionsByClass(examId);
  res.send(result);
});

const getByStudent = catchAsync(async (req, res) => {
  const { studentId } = req.params;
  const result = await submissionService.getByStudent(studentId, req.query);
  res.send(result);
});

const getMy = catchAsync(async (req, res) => {
  console.log('[DEBUG getMy] req.user:', req.user);
  console.log('[DEBUG getMy] req.user.id:', req.user.id);
  console.log('[DEBUG getMy] req.user._id:', req.user._id);
  console.log('[DEBUG getMy] typeof req.user.id:', typeof req.user.id);
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

const create = catchAsync(async (req, res) => {
  const auditContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
  const submission = await submissionService.create(req.body, req.user?.id, auditContext);
  res.status(httpStatus.CREATED).send(submission);
});

module.exports = {
  scan,
  getById,
  getAll,
  getByExam,
  getByExamGroupedByClass,
  getByStudent,
  getMy,
  manualOverride,
  updateAnswers,
  getStatistics,
  remove,
  attachImage,
  deleteImage,
  create,
};
