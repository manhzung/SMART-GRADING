const express = require('express');
const validate = require('../../middlewares/validate');
const submissionValidation = require('../../validations/submission.validation');
const uploadController = require('../../controllers/upload.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.get(
  '/signature',
  auth('scanSubmissions'),
  validate(submissionValidation.getUploadSignature),
  uploadController.getUploadSignature
);

module.exports = router;
