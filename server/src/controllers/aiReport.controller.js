const httpStatus = require('http-status');
const aiReportService = require('../services/aiReport.service');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

const generateForSubmission = catchAsync(async (req, res) => {
  const { submissionId } = req.params;
  const { model } = req.body;

  const report = await aiReportService.generateStudentReport(submissionId, model);
  res.send({ success: true, data: report });
});

const generateForExam = catchAsync(async (req, res) => {
  const { examId } = req.params;
  const { model } = req.body;

  const report = await aiReportService.generateExamReport(examId, model);

  const { ExamReport } = require('../models');
  await ExamReport.findOneAndUpdate(
    { examId },
    {
      insights: {
        overallAnalysis: report.overallAnalysis,
        recommendations: report.recommendations,
        weakTopics: report.weakTopics,
        strongTopics: report.strongTopics,
      },
    },
    { upsert: true }
  );

  res.send({ success: true, data: report });
});

const getQuestionDifficulty = catchAsync(async (req, res) => {
  const { examId } = req.params;
  const analysis = await aiReportService.analyzeQuestionDifficulty(examId);
  res.send({ success: true, data: analysis });
});

const getStudentReports = catchAsync(async (req, res) => {
  const { studentId } = req.params;
  const { examId, limit = 10 } = req.query;

  const { AIReport } = require('../models');
  const query = { studentId };
  if (examId) query.examId = examId;

  const reports = await AIReport.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit, 10))
    .populate('examId', 'title examDate')
    .populate('submissionId', 'totalScore');

  res.send({ success: true, data: reports });
});

module.exports = {
  generateForSubmission,
  generateForExam,
  getQuestionDifficulty,
  getStudentReports,
};
