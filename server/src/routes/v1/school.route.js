const express = require('express');
const validate = require('../../middlewares/validate');
const schoolValidation = require('../../validations/school.validation');
const schoolController = require('../../controllers/school.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router
  .route('/')
  .post(auth('manageSchools'), validate(schoolValidation.createSchool), schoolController.create)
  .get(validate(schoolValidation.getSchool), schoolController.getAll);

router
  .route('/:id')
  .get(auth(), validate(schoolValidation.getSchool), schoolController.getById)
  .patch(auth('manageSchools'), validate(schoolValidation.updateSchool), schoolController.update)
  .delete(auth('manageSchools'), validate(schoolValidation.deleteSchool), schoolController.remove);

router
  .route('/:id/grade-distribution')
  .post(auth(), schoolController.getGradeDistribution);

router
  .route('/:schoolId/available-teachers')
  .get(auth('manageClasses'), validate(schoolValidation.getAvailableTeachers), schoolController.getAvailableTeachers);

// ── School Approval Routes ───────────────────────────────────────────────────────

router
  .route('/pending')
  .get(auth('manageSchools'), schoolController.getPendingSchools);

router
  .route('/:id/approve')
  .post(auth('manageSchools'), schoolController.approveSchool);

router
  .route('/:id/reject')
  .post(auth('manageSchools'), schoolController.rejectSchool);

module.exports = router;
