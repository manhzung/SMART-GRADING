const express = require('express');
const validate = require('../../middlewares/validate');
const appealValidation = require('../../validations/appeal.validation');
const appealController = require('../../controllers/appeal.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router
  .route('/')
  .post(auth('submitAppeals'), validate(appealValidation.createAppeal), appealController.create)
  .get(auth(), validate(appealValidation.getAppeals), appealController.getAll);

router
  .route('/:id')
  .get(auth(), validate(appealValidation.getAppeal), appealController.getById);

router
  .route('/:id/review')
  .post(auth('reviewAppeals'), validate(appealValidation.reviewAppeal), appealController.review);

router
  .route('/student/:studentId')
  .get(auth(), validate(appealValidation.getStudentAppeals), appealController.getByStudent);

router
  .route('/exam/:examId')
  .get(auth(), validate(appealValidation.getExamAppeals), appealController.getByExam);

router
  .route('/exam/:examId/pending-count')
  .get(auth(), appealController.getPendingCount);

module.exports = router;
