const httpStatus = require('http-status');
const classService = require('../services/class.service');
const catchAsync = require('../utils/catchAsync');

const create = catchAsync(async (req, res) => {
  const classData = await classService.create(req.body, req.user);
  res.status(httpStatus.CREATED).send(classData);
});

const getAll = catchAsync(async (req, res) => {
  const schoolId = req.query.schoolId || req.params.schoolId || (req.user && req.user.schoolId);
  const { schoolId: _, ...query } = req.query;
  const result = await classService.getBySchool(schoolId, query, req.user);
  res.send(result);
});

const getById = catchAsync(async (req, res) => {
  const classData = await classService.getById(req.params.id, req.user);
  res.send(classData);
});

const update = catchAsync(async (req, res) => {
  const classData = await classService.update(req.params.id, req.body, req.user);
  res.send(classData);
});

const addStudents = catchAsync(async (req, res) => {
  const classData = await classService.addStudents(req.params.id, req.body.studentIds, req.user);
  res.send(classData);
});

const removeStudents = catchAsync(async (req, res) => {
  const classData = await classService.removeStudents(req.params.id, req.body.studentIds, req.user);
  res.send(classData);
});

const importStudents = catchAsync(async (req, res) => {
  const result = await classService.importStudents(req.params.id, req.body.students, req.user);
  res.send(result);
});

const remove = catchAsync(async (req, res) => {
  await classService.delete(req.params.id, req.user);
  res.status(httpStatus.NO_CONTENT).send();
});

const manageSubjectTeachers = catchAsync(async (req, res) => {
  const { action, subjectId, teacherId } = req.body;
  const classData = await classService.manageSubjectTeachers(req.params.id, action, { subjectId, teacherId }, req.user);
  res.send(classData);
});

const transferHomeroomTeacher = catchAsync(async (req, res) => {
  const { currentTeacherId, newTeacherId } = req.body;
  const classData = await classService.transferHomeroomTeacher(req.params.id, currentTeacherId, newTeacherId, req.user);
  res.send(classData);
});

// ── Exam ↔ Class management ─────────────────────────────────────────────────
const getClassExams = catchAsync(async (req, res) => {
  const exams = await classService.getClassExams(req.params.id, req.user);
  res.send(exams);
});

const assignExamsToClass = catchAsync(async (req, res) => {
  const { examIds } = req.body;
  const result = await classService.assignExamsToClass(req.params.id, examIds, req.user);
  res.send(result);
});

const removeExamFromClass = catchAsync(async (req, res) => {
  await classService.removeExamFromClass(req.params.id, req.params.examId, req.user);
  res.status(httpStatus.NO_CONTENT).send();
});

const getAvailableStudents = catchAsync(async (req, res) => {
  const result = await classService.getAvailableStudents(req.params.id, req.query, req.user);
  res.send(result);
});

const getClassStatistics = catchAsync(async (req, res) => {
  const stats = await classService.getClassStatistics(req.params.id, req.user);
  res.send(stats);
});

module.exports = {
  create,
  getAll,
  getById,
  update,
  addStudents,
  removeStudents,
  importStudents,
  remove,
  manageSubjectTeachers,
  transferHomeroomTeacher,
  getClassExams,
  assignExamsToClass,
  removeExamFromClass,
  getClassStatistics,
  getAvailableStudents,
};
