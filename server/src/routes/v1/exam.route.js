const express = require('express');
const validate = require('../../middlewares/validate');
const examValidation = require('../../validations/exam.validation');
const examController = require('../../controllers/exam.controller');
const submissionController = require('../../controllers/submission.controller');
const auth = require('../../middlewares/auth');

const { validateGeneratePapers } = examValidation;

const router = express.Router();

router
  .route('/')
  .post(auth('manageExams'), validate(examValidation.createExam), examController.create)
  .get(auth(), validate(examValidation.getExams), examController.getAll);

router.get('/upcoming', auth(), validate(examValidation.getUpcoming), examController.getUpcoming);

router
  .route('/:id')
  .get(auth(), validate(examValidation.getExam), examController.getById)
  .patch(auth('manageExams'), validate(examValidation.updateExam), examController.update)
  .delete(auth('manageExams'), validate(examValidation.getExam), examController.remove);

router
  .route('/:id/publish')
  .post(auth('manageExams'), validate(examValidation.publishExam), examController.publish);

router
  .route('/:id/complete')
  .post(auth('manageExams'), examController.complete);

router
  .route('/:id/classes')
  .post(auth('manageExams'), validate(examValidation.addClassesToExam), examController.addClasses)
  .delete(auth('manageExams'), validate(examValidation.removeClassesFromExam), examController.removeClasses);

router
  .route('/:id/versions')
  .get(auth(), validate(examValidation.getExamVersions), examController.getVersions)
  .post(auth('manageExams'), validate(examValidation.generateVersions), examController.generateVersions);

router
  .route('/:id/versions/full')
  .get(auth(), examController.getVersionsWithQuestions);

router
  .route('/:id/export')
  .get(auth(), validate(examValidation.exportExam), examController.exportExamPDF);

router
  .route('/:id/versions/:versionCode/pdf')
  .get(auth(), examController.exportVersionPDF);

router
  .route('/:id/versions/export')
  .get(auth(), examController.exportVersionsZip);

router
  .route('/:id/results/export')
  .get(auth(), examController.exportResults);

router
  .route('/:id/submissions')
  .get(auth(), submissionController.getByExam);

router
  .route('/:id/submissions/statistics')
  .get(auth(), submissionController.getStatistics);

router.post(
  '/:id/generate-papers',
  auth(),
  validate(validateGeneratePapers),
  examController.generatePapers
);

module.exports = router;
