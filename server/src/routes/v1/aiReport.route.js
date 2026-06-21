const express = require('express');
const validate = require('../../middlewares/validate');
const aiReportValidation = require('../../validations/ai.validation');
const aiReportController = require('../../controllers/aiReport.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router
  .route('/submission/:submissionId')
  .post(auth(), aiReportController.generateForSubmission);

router
  .route('/exam/:examId')
  .post(auth(), validate(aiReportValidation.generateReport), aiReportController.generateForExam);

router
  .route('/exam/:examId/difficulty')
  .get(auth(), aiReportController.getQuestionDifficulty);

router
  .route('/student/:studentId')
  .get(auth(), aiReportController.getStudentReports);

module.exports = router;
