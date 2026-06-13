const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const subjectController = require('../../controllers/subject.controller');

const router = express.Router();

router
  .route('/')
  .post(auth('manageSubjects'), subjectController.create)
  .get(auth(), subjectController.getAll);

router
  .route('/:id')
  .get(auth(), subjectController.getById)
  .patch(auth('manageSubjects'), subjectController.update)
  .delete(auth('manageSubjects'), subjectController.remove);

module.exports = router;
