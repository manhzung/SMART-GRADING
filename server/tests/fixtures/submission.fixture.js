const mongoose = require('mongoose');

const submissionOne = {
  _id: mongoose.Types.ObjectId(),
  examId: mongoose.Types.ObjectId(),
  versionId: mongoose.Types.ObjectId(),
  omrTemplateId: mongoose.Types.ObjectId(),
  studentId: mongoose.Types.ObjectId(),
  studentCode: 'HS001',
  totalScore: 0,
  maxScore: 10,
  finalScore: 0,
  status: 'pending',
};

const insertSubmissions = async (subs) => {
  const Submission = require('../../src/models/submission.model');
  await Submission.insertMany(subs);
};

module.exports = { submissionOne, insertSubmissions };
