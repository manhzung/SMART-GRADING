const express = require('express');
const validate = require('../../middlewares/validate');
const reportValidation = require('../../validations/report.validation');
const reportController = require('../../controllers/report.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router
  .route('/exam/:examId/generate')
  .post(auth('manageExams'), validate(reportValidation.generateExamReport), reportController.generateExamReport);

router.route('/exam/:examId').get(auth(), validate(reportValidation.getExamReport), reportController.getExamReport);

router
  .route('/exam/:examId/export')
  .get(auth(), validate(reportValidation.exportExamReport), reportController.exportExamReport);

router
  .route('/student/:studentId/progress')
  .get(auth(), validate(reportValidation.getStudentProgress), reportController.getStudentProgress);

router
  .route('/student/:studentId/history')
  .get(auth(), validate(reportValidation.getProgressHistory), reportController.getProgressHistory);

router
  .route('/class/:classId/leaderboard')
  .get(auth(), validate(reportValidation.getClassLeaderboard), reportController.getClassLeaderboard);

module.exports = router;
