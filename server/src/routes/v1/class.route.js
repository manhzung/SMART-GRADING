const express = require('express');
const validate = require('../../middlewares/validate');
const classValidation = require('../../validations/class.validation');
const classController = require('../../controllers/class.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router
  .route('/')
  .post(auth('manageClasses'), validate(classValidation.createClass), classController.create)
  .get(auth(), classController.getAll);

router
  .route('/school/:schoolId')
  .get(auth(), validate(classValidation.getClassesBySchool), classController.getAll);

router
  .route('/:id')
  .get(auth(), validate(classValidation.getClass), classController.getById)
  .patch(auth('manageClasses'), validate(classValidation.updateClass), classController.update)
  .delete(auth('manageClasses'), validate(classValidation.getClass), classController.remove);

router
  .route('/:id/students')
  .post(auth('manageClasses'), validate(classValidation.addStudents), classController.addStudents)
  .delete(auth('manageClasses'), validate(classValidation.removeStudents), classController.removeStudents);

router
  .route('/:id/students/import')
  .post(auth('manageClasses'), validate(classValidation.importStudents), classController.importStudents);

router
  .route('/:id/subject-teachers')
  .patch(auth('manageClasses'), validate(classValidation.manageSubjectTeachers), classController.manageSubjectTeachers);

router
  .route('/:id/transfer-ownership')
  .patch(auth(), validate(classValidation.transferHomeroomTeacher), classController.transferHomeroomTeacher);

// ── Exam ↔ Class management (reverse side: Class → Exams) ────────────────────
router
  .route('/:id/exams')
  .get(auth(), validate(classValidation.getClassExams), classController.getClassExams)
  .post(auth('manageExams'), validate(classValidation.assignExamsToClass), classController.assignExamsToClass);

router
  .route('/:id/exams/:examId')
  .delete(auth('manageExams'), validate(classValidation.removeExamFromClass), classController.removeExamFromClass);

router
  .route('/:id/statistics')
  .get(auth(), classController.getClassStatistics);

router
  .route('/:id/available-students')
  .get(auth('manageClasses'), validate(classValidation.getAvailableStudents), classController.getAvailableStudents);

module.exports = router;
