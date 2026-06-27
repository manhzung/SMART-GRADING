const express = require('express');
const validate = require('../../middlewares/validate');
const questionValidation = require('../../validations/question.validation');
const questionController = require('../../controllers/question.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router
  .route('/tags')
  .get(auth(), questionController.getTags);

router
  .route('/')
  .post(auth('manageQuestions'), validate(questionValidation.createQuestion), questionController.create)
  .get(auth(), validate(questionValidation.getQuestions), questionController.getAll);

router
  .route('/generate')
  .post(auth('manageQuestions'), validate(questionValidation.generateQuestions), questionController.generate);

router
  .route('/generate-similar')
  .post(auth('manageQuestions'), validate(questionValidation.generateSimilarQuestions), questionController.generateSimilar);

router
  .route('/by-tags')
  .get(auth(), validate(questionValidation.getQuestionsByTags), questionController.getByTags);

router
  .route('/stats')
  .get(auth(), questionController.getBankStats);

router
  .route('/:id')
  .get(auth(), validate(questionValidation.getQuestion), questionController.getById)
  .patch(auth('manageQuestions'), validate(questionValidation.updateQuestion), questionController.update)
  .delete(auth('manageQuestions'), validate(questionValidation.getQuestion), questionController.remove);

router
  .route('/:id/approve')
  .post(auth('manageQuestions'), validate(questionValidation.getQuestion), questionController.approve);

module.exports = router;
