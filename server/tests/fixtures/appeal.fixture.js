const mongoose = require('mongoose');

const appealOne = {
  _id: mongoose.Types.ObjectId(),
  submissionId: mongoose.Types.ObjectId(),
  examId: mongoose.Types.ObjectId(),
  studentId: mongoose.Types.ObjectId(),
  questionId: mongoose.Types.ObjectId(),
  questionPosition: 1,
  reason: 'My answer should be correct according to the formula provided in the lecture.',
  currentAnswer: 'x = 15',
  expectedAnswer: 'x = 15',
  status: 'pending',
};

const appealTwo = {
  _id: mongoose.Types.ObjectId(),
  submissionId: mongoose.Types.ObjectId(),
  examId: mongoose.Types.ObjectId(),
  studentId: mongoose.Types.ObjectId(),
  questionId: mongoose.Types.ObjectId(),
  questionPosition: 2,
  reason: 'I believe my calculation is correct based on the textbook formula.',
  currentAnswer: '42.5',
  expectedAnswer: '42.5',
  status: 'approved',
  teacherResponse: {
    reviewedBy: mongoose.Types.ObjectId(),
    reviewedAt: new Date(),
    decision: 'approved',
    note: 'Student answer is correct. Score adjusted accordingly.',
    scoreAdjustment: {
      oldScore: 0,
      newScore: 2,
    },
  },
};

const insertAppeals = async (appeals) => {
  const Appeal = require('../../src/models/appeal.model');
  await Appeal.insertMany(appeals);
};

module.exports = {
  appealOne,
  appealTwo,
  insertAppeals,
};
