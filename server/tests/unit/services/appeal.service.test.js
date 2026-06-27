const mongoose = require('mongoose');
const appealService = require('../../../src/services/appeal.service');
const { Submission } = require('../../../src/models');
const { studentOne, insertUsers } = require('../../fixtures/user.fixture');
const { schoolA, insertSchools } = require('../../fixtures/school.fixture');
const { examPast, insertExams } = require('../../fixtures/exam.fixture');
const { questionOne, insertQuestions } = require('../../fixtures/question.fixture');
const { appealOne, insertAppeals } = require('../../fixtures/appeal.fixture');
const setupTestDB = require('../../utils/setupTestDB');

setupTestDB();

describe('AppealService - create()', () => {
  let examWithTeacher;
  let submissionWithStudent;

  beforeEach(() => {
    // Build exam with createdBy = teacherOne._id (for notification lookup)
    examWithTeacher = {
      ...examPast,
      _id: new mongoose.Types.ObjectId(),
      createdBy: studentOne._id,
      title: 'Math Test',
    };

    // Build submission with examId and studentId pointing to real data
    submissionWithStudent = {
      _id: new mongoose.Types.ObjectId(),
      examId: examWithTeacher._id,
      versionId: new mongoose.Types.ObjectId(),
      omrTemplateId: new mongoose.Types.ObjectId(),
      studentId: studentOne._id,
      studentCode: 'HS001',
      totalScore: 8,
      maxScore: 10,
      finalScore: 8,
      status: 'pending',
      answers: [
        {
          position: 1,
          questionId: questionOne._id,
          selectedAnswer: 'A',
          correctAnswer: 'B',
          isCorrect: false,
          score: 0,
          maxScore: 1,
        },
      ],
    };
  });

  describe('create() success', () => {
    beforeEach(async () => {
      await insertSchools([schoolA]);
      await insertUsers([studentOne]);
      await insertExams([examWithTeacher]);
      await insertQuestions([questionOne]);
    });

    it('should create an appeal and mark submission as appealed', async () => {
      await Submission.create(submissionWithStudent);

      const appealData = {
        submissionId: submissionWithStudent._id,
        examId: examWithTeacher._id,
        studentId: studentOne._id,
        questionId: questionOne._id,
        questionPosition: 1,
        reason: 'My answer should be correct.',
      };

      const appeal = await appealService.create(appealData);

      expect(appeal).toBeDefined();
      expect(appeal._id).toBeDefined();
      expect(appeal.status).toBe('pending');
      expect(appeal.currentAnswer).toBe('A');
      expect(appeal.expectedAnswer).toBe('B');
      expect(appeal.reason).toBe('My answer should be correct.');

      // Submission status should be updated to 'appealed'
      const updatedSubmission = await Submission.findById(submissionWithStudent._id);
      expect(updatedSubmission.status).toBe('appealed');
    });
  });

  describe('create() throws 404 when submission not found', () => {
    beforeEach(async () => {
      await insertSchools([schoolA]);
      await insertUsers([studentOne]);
      await insertExams([examWithTeacher]);
    });

    it('should throw 404 when submission does not exist', async () => {
      const nonExistentSubmissionId = new mongoose.Types.ObjectId();

      const appealData = {
        submissionId: nonExistentSubmissionId,
        examId: examWithTeacher._id,
        studentId: studentOne._id,
        questionId: questionOne._id,
        questionPosition: 1,
        reason: 'My answer should be correct.',
      };

      await expect(appealService.create(appealData)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Submission not found',
      });
    });
  });

  describe('create() throws 400 when appeal already exists', () => {
    beforeEach(async () => {
      await insertSchools([schoolA]);
      await insertUsers([studentOne]);
      await insertExams([examWithTeacher]);
      await insertQuestions([questionOne]);
      await Submission.create(submissionWithStudent);

      // Insert an existing appeal for the same submissionId + questionId
      await insertAppeals([
        {
          ...appealOne,
          submissionId: submissionWithStudent._id,
          examId: examWithTeacher._id,
          studentId: studentOne._id,
          questionId: questionOne._id,
          questionPosition: 1,
          reason: 'Already appealed.',
          status: 'pending',
        },
      ]);
    });

    it('should throw 400 when appeal already exists for same submissionId and questionId', async () => {
      const appealData = {
        submissionId: submissionWithStudent._id,
        examId: examWithTeacher._id,
        studentId: studentOne._id,
        questionId: questionOne._id,
        questionPosition: 1,
        reason: 'My answer should be correct.',
      };

      await expect(appealService.create(appealData)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Appeal already exists for this question',
      });
    });
  });
});
