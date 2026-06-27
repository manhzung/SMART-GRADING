const express = require('express');
const validate = require('../../middlewares/validate');
const submissionValidation = require('../../validations/submission.validation');
const submissionController = require('../../controllers/submission.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router
  .route('/scan')
  .post(auth('scanSubmissions'), validate(submissionValidation.scanSubmission), submissionController.scan);

router
  .route('/me')
  .get(auth(), validate(submissionValidation.getMySubmissions), submissionController.getMy);

router
  .route('/')
  .get(auth(), validate(submissionValidation.getSubmissions), submissionController.getAll);

router
  .route('/:id')
  .get(auth(), validate(submissionValidation.getSubmission), submissionController.getById)
  .delete(auth('scanSubmissions'), validate(submissionValidation.getSubmission), submissionController.remove);

router
  .route('/:id/override')
  .post(auth('scanSubmissions'), validate(submissionValidation.manualOverride), submissionController.manualOverride);

router
  .route('/:id/answers')
  .patch(auth('scanSubmissions'), validate(submissionValidation.updateAnswers), submissionController.updateAnswers);

router
  .route('/exam/:examId')
  .get(auth(), validate(submissionValidation.getExamSubmissions), submissionController.getByExam);

router
  .route('/exam/:examId/statistics')
  .get(auth(), submissionController.getStatistics);

router
  .route('/student/:studentId')
  .get(auth(), validate(submissionValidation.getStudentSubmissions), submissionController.getByStudent);

router
  .route('/:id/attach-image')
  .post(auth('scanSubmissions'), validate(submissionValidation.attachImage), submissionController.attachImage);

router
  .route('/:id/image/:type')
  .delete(auth('scanSubmissions'), validate(submissionValidation.deleteImage), submissionController.deleteImage);

module.exports = router;
