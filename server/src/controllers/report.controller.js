const httpStatus = require('http-status');
const reportService = require('../services/report.service');
const catchAsync = require('../utils/catchAsync');

const generateExamReport = catchAsync(async (req, res) => {
  const { examId } = req.params;
  const report = await reportService.generateExamReport(examId, req.user?.id);
  res.send(report);
});

const getExamReport = catchAsync(async (req, res) => {
  const { examId } = req.params;
  const report = await reportService.getExamReport(examId);
  if (!report) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Report not found' });
  }
  res.send(report);
});

const exportExamReport = catchAsync(async (req, res) => {
  const { examId } = req.params;
  const { format } = req.query;
  const result = await reportService.exportReport(examId, format);
  res.send(result);
});

const getStudentProgress = catchAsync(async (req, res) => {
  const { studentId } = req.params;
  const progress = await reportService.getStudentProgress(studentId);
  if (!progress) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Progress not found' });
  }
  res.send(progress);
});

const getProgressHistory = catchAsync(async (req, res) => {
  const { studentId } = req.params;
  const result = await reportService.getProgressHistory(studentId, req.query);
  res.send(result);
});

const getClassLeaderboard = catchAsync(async (req, res) => {
  const { classId } = req.params;
  const result = await reportService.getClassLeaderboard(classId, req.query);
  res.send(result);
});

module.exports = {
  generateExamReport,
  getExamReport,
  exportExamReport,
  getStudentProgress,
  getProgressHistory,
  getClassLeaderboard,
};
