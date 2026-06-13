const mongoose = require('mongoose');
const { Exam } = require('../../src/models');

const examIdUpcoming1 = mongoose.Types.ObjectId();
const examIdUpcoming2 = mongoose.Types.ObjectId();
const examIdPast = mongoose.Types.ObjectId();
const examIdOtherTeacher = mongoose.Types.ObjectId();
const examIdDraft = mongoose.Types.ObjectId();

const teacherOneId = mongoose.Types.ObjectId();
const teacherTwoId = mongoose.Types.ObjectId();
const classId1 = mongoose.Types.ObjectId();
const classId2 = mongoose.Types.ObjectId();

const examUpcoming1 = {
  _id: examIdUpcoming1,
  title: 'Math Test - Chapter 3',
  classIds: [classId1],
  primaryClassId: classId1,
  createdBy: teacherOneId,
  omrTemplateId: mongoose.Types.ObjectId(),
  examDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  startTime: '07:00',
  duration: 60,
  totalScore: 10,
  numberOfQuestions: 20,
  status: 'published',
};

const examUpcoming2 = {
  _id: examIdUpcoming2,
  title: 'Math Test - Chapter 4',
  classIds: [classId1, classId2],
  primaryClassId: classId2,
  createdBy: teacherOneId,
  omrTemplateId: mongoose.Types.ObjectId(),
  examDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
  startTime: '07:00',
  duration: 60,
  totalScore: 10,
  numberOfQuestions: 20,
  status: 'in_progress',
};

const examPast = {
  _id: examIdPast,
  title: 'Past Math Test',
  classIds: [classId1],
  primaryClassId: classId1,
  createdBy: teacherOneId,
  omrTemplateId: mongoose.Types.ObjectId(),
  examDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
  startTime: '07:00',
  duration: 60,
  totalScore: 10,
  numberOfQuestions: 20,
  status: 'completed',
};

const examOtherTeacher = {
  _id: examIdOtherTeacher,
  title: 'Other Teacher Exam',
  classIds: [classId1],
  primaryClassId: classId1,
  createdBy: teacherTwoId,
  omrTemplateId: mongoose.Types.ObjectId(),
  examDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  startTime: '07:00',
  duration: 60,
  totalScore: 10,
  numberOfQuestions: 20,
  status: 'published',
};

const examDraft = {
  _id: examIdDraft,
  title: 'Draft Exam - Should Still Appear',
  classIds: [classId1],
  primaryClassId: classId1,
  createdBy: teacherOneId,
  omrTemplateId: mongoose.Types.ObjectId(),
  examDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  startTime: '07:00',
  duration: 60,
  totalScore: 10,
  numberOfQuestions: 20,
  status: 'draft',
};

const insertExams = async (exams) => {
  await Exam.insertMany(exams);
};

module.exports = {
  examUpcoming1,
  examUpcoming2,
  examPast,
  examOtherTeacher,
  examDraft,
  examIdUpcoming1,
  examIdUpcoming2,
  examIdPast,
  examIdOtherTeacher,
  examIdDraft,
  teacherOneId,
  teacherTwoId,
  classId1,
  classId2,
  insertExams,
};
