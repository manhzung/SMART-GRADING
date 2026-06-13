const mongoose = require('mongoose');
const { Class } = require('../../src/models');

const classIdA = mongoose.Types.ObjectId();
const classIdB = mongoose.Types.ObjectId();
const schoolIdA = mongoose.Types.ObjectId();
const homeroomTeacherIdA = mongoose.Types.ObjectId();
const subjectTeacherIdA = mongoose.Types.ObjectId();
const studentIdInA = mongoose.Types.ObjectId();
const studentIdOutside = mongoose.Types.ObjectId();
const studentIdInB = mongoose.Types.ObjectId();

const classA = {
  _id: classIdA,
  name: '10A1',
  code: '10A1-2026',
  gradeLevel: 10,
  academicYear: '2026-2027',
  schoolId: schoolIdA,
  homeroomTeacherId: homeroomTeacherIdA,
  subjectTeachers: [{ teacherId: subjectTeacherIdA, subjectId: null, addedAt: new Date() }],
  studentIds: [studentIdInA],
  isActive: true,
};

const classB = {
  _id: classIdB,
  name: '11B2',
  code: '11B2-2026',
  gradeLevel: 11,
  academicYear: '2026-2027',
  schoolId: schoolIdA,
  homeroomTeacherId: mongoose.Types.ObjectId(),
  subjectTeachers: [],
  studentIds: [studentIdInB],
  isActive: true,
};

const insertClasses = async (classes) => {
  await Class.insertMany(classes);
};

module.exports = {
  classA,
  classB,
  classIdA,
  classIdB,
  schoolIdA,
  homeroomTeacherIdA,
  subjectTeacherIdA,
  studentIdInA,
  studentIdOutside,
  studentIdInB,
  insertClasses,
};
