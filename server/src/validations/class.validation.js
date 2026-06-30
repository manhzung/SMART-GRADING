const Joi = require('joi');

const id = Joi.object().keys({
  id: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
});

const createClass = {
  body: Joi.object().keys({
    name: Joi.string().min(2).max(50).trim().required(),
    code: Joi.string().min(2).max(20).trim().required(),
    gradeLevel: Joi.number().min(0).max(12).required(),
    academicYear: Joi.string().pattern(/^\d{4}-\d{4}$/).required(),
    schoolId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    homeroomTeacherId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null, ''),
    studentIds: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)),
  }),
};

const updateClass = {
  params: id,
  body: Joi.object().keys({
    name: Joi.string().min(2).max(50).trim(),
    gradeLevel: Joi.number().min(0).max(12),
    academicYear: Joi.string().pattern(/^\d{4}-\d{4}$/),
    homeroomTeacherId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null, ''),
  }),
};

const addStudents = {
  params: id,
  body: Joi.object().keys({
    studentIds: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).min(1).required(),
  }),
};

const removeStudents = {
  params: id,
  body: Joi.object().keys({
    studentIds: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).min(1).required(),
  }),
};

const getClass = {
  params: id,
};

const getClassesBySchool = {
  params: Joi.object().keys({
    schoolId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  query: Joi.object().keys({
    academicYear: Joi.string().pattern(/^\d{4}-\d{4}$/),
    gradeLevel: Joi.number().min(1).max(12),
  }),
};

const importStudents = {
  params: id,
  body: Joi.object().keys({
    students: Joi.array().items(
      Joi.object().keys({
        name: Joi.string().min(2).max(100).required(),
        email: Joi.string().email().required(),
        studentCode: Joi.string().trim(),
        phone: Joi.string().allow(null, ''),
        dateOfBirth: Joi.string().allow(null, ''),
      })
    ).min(1).required(),
  }),
};

const manageSubjectTeachers = {
  params: id,
  body: Joi.object().keys({
    action: Joi.string().valid('add', 'remove').required(),
    subjectId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null, ''),
    teacherId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  }),
};

const transferHomeroomTeacher = {
  params: id,
  body: Joi.object().keys({
    currentTeacherId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    newTeacherId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null, ''),
  }),
};

const getClassExams = {
  params: id,
};

const assignExamsToClass = {
  params: id,
  body: Joi.object().keys({
    examIds: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).min(1).required(),
  }),
};

const removeExamFromClass = {
  params: Joi.object().keys({
    id: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
};

const getAvailableStudents = {
  params: id,
  query: Joi.object().keys({
    search: Joi.string().trim().max(100).allow(''),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

module.exports = {
  createClass,
  updateClass,
  addStudents,
  removeStudents,
  getClass,
  getClassesBySchool,
  importStudents,
  manageSubjectTeachers,
  transferHomeroomTeacher,
  getClassExams,
  assignExamsToClass,
  removeExamFromClass,
  getAvailableStudents,
};
