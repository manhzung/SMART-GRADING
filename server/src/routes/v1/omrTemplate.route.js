const express = require('express');
const validate = require('../../middlewares/validate');
const omrTemplateValidation = require('../../validations/omrTemplate.validation');
const omrTemplateController = require('../../controllers/omrTemplate.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router
  .route('/')
  .post(auth('manageOMRTemplates'), validate(omrTemplateValidation.createOMRTemplate), omrTemplateController.create)
  .get(auth(), validate(omrTemplateValidation.getOMRTemplates), omrTemplateController.getAll);

router
  .route('/default')
  .get(auth(), omrTemplateController.getDefault);

router
  .route('/:id')
  .get(auth(), validate(omrTemplateValidation.getOMRTemplate), omrTemplateController.getById)
  .patch(auth('manageOMRTemplates'), validate(omrTemplateValidation.updateOMRTemplate), omrTemplateController.update)
  .delete(auth('manageOMRTemplates'), validate(omrTemplateValidation.getOMRTemplate), omrTemplateController.remove);

router
  .route('/:id/full')
  .get(auth(), omrTemplateController.getFullById);

router
  .route('/:id/json')
  .get(auth(), omrTemplateController.getJsonById);

router
  .route('/:id/duplicate')
  .post(auth('manageOMRTemplates'), omrTemplateController.duplicate);

router
  .route('/:id/pdf')
  .get(
    auth(),
    validate(omrTemplateValidation.generatePdf),
    omrTemplateController.generatePdf,
  );

router
  .route('/:id/pdf/versions')
  .post(
    auth('exportOMRTemplates'),
    validate(omrTemplateValidation.generateVersionSheetsPdf),
    omrTemplateController.generateVersionSheetsPdf,
  );

router
  .route('/exam/:examId')
  .get(auth(), omrTemplateController.getByExamId);

router
  .route('/exam/:examId/json')
  .get(auth(), omrTemplateController.getScanJsonByExamId);

module.exports = router;
