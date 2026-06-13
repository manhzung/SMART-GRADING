const mongoose = require('mongoose');
const Submission = require('../../../src/models/submission.model');
const setupTestDB = require('../../utils/setupTestDB');

setupTestDB();

describe('Submission Model - classId', () => {
  const validPayload = {
    examId: new mongoose.Types.ObjectId(),
    versionId: new mongoose.Types.ObjectId(),
    omrTemplateId: new mongoose.Types.ObjectId(),
    studentId: new mongoose.Types.ObjectId(),
    studentCode: 'STU001',
    answers: [
      {
        position: 1,
        questionId: new mongoose.Types.ObjectId(),
        correctAnswer: 'A',
        isCorrect: true,
        score: 1,
      },
    ],
    totalScore: 1,
    maxScore: 1,
    finalScore: 1,
  };

  test('should save submission with classId when provided', async () => {
    const classId = new mongoose.Types.ObjectId();
    const submission = new Submission({ ...validPayload, classId });
    const saved = await submission.save();

    expect(saved.classId).toBeDefined();
    expect(saved.classId.toString()).toBe(classId.toString());
  });

  test('should save submission without classId (backward compat)', async () => {
    const submission = new Submission(validPayload);
    const saved = await submission.save();

    expect(saved.classId).toBeUndefined();
  });
});
