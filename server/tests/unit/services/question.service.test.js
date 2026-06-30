const mongoose = require('mongoose');
const QuestionService = require('../../../src/services/question.service');
const ApiError = require('../../../src/utils/ApiError');
const {
  questionOne,
  questionTwo,
  questionUsedInExam,
  insertQuestions,
} = require('../../fixtures/question.fixture');
const {
  admin,
  teacherOne,
  teacherTwo,
  studentOne,
  insertUsers,
} = require('../../fixtures/user.fixture');
const setupTestDB = require('../../utils/setupTestDB');

setupTestDB();

describe('Question Service', () => {
  let questionService;
  let dbQuestions;

  beforeEach(async () => {
    questionService = Object.create(QuestionService);
    await insertUsers([admin, teacherOne, teacherTwo, studentOne]);

    // Gán schoolId cho questions từ fixtures
    const q1 = { ...questionOne, createdBy: teacherOne._id, schoolId: teacherOne.schoolId };
    const q2 = { ...questionTwo, createdBy: teacherOne._id, schoolId: teacherOne.schoolId };
    const q3 = { ...questionUsedInExam, createdBy: teacherOne._id, schoolId: teacherOne.schoolId };
    await insertQuestions([q1, q2, q3]);
    dbQuestions = await mongoose.model('Question').find().lean();
  });

  describe('buildRoleFilter', () => {
    it('admin should see all questions (empty filter)', () => {
      const filter = questionService.buildRoleFilter(admin);
      expect(filter).toEqual({});
    });

    it('teacher should only see questions from their school', () => {
      const filter = questionService.buildRoleFilter(teacherOne);
      expect(filter).toEqual({ schoolId: teacherOne.schoolId });
    });

    it('student should only see approved questions from their school', () => {
      const filter = questionService.buildRoleFilter(studentOne);
      expect(filter).toEqual({ schoolId: studentOne.schoolId, isApproved: true });
    });

    it('teacher from different school should see empty filter for their school', () => {
      const filter = questionService.buildRoleFilter(teacherTwo);
      expect(filter).toEqual({ schoolId: teacherTwo.schoolId });
    });
  });

  describe('getAll', () => {
    it('admin should see all questions regardless of school', async () => {
      const result = await questionService.getAll({}, admin);
      expect(result.total).toBe(3);
    });

    it('teacher should only see questions from their school', async () => {
      const result = await questionService.getAll({}, teacherOne);
      // teacherOne schoolId = schoolIdA, all 3 questions are in schoolIdA
      expect(result.total).toBe(3);
    });

    it('teacher from different school should see 0 questions', async () => {
      const result = await questionService.getAll({}, teacherTwo);
      expect(result.total).toBe(0);
    });

    it('student should only see approved questions', async () => {
      const result = await questionService.getAll({}, studentOne);
      expect(result.total).toBe(2); // q1 (approved) + q3 (approved), q2 is not approved
      result.results.forEach((q) => {
        expect(q.isApproved).toBe(true);
      });
    });

    it('no user param should return all questions (backward compat)', async () => {
      const result = await questionService.getAll({});
      expect(result.total).toBe(3);
    });

    it('student should not see pending questions', async () => {
      const result = await questionService.getAll({}, studentOne);
      const hasPending = result.results.some((q) => q.isApproved === false);
      expect(hasPending).toBe(false);
    });
  });

  describe('getById', () => {
    it('should return question with answers for teacher', async () => {
      const question = await questionService.getById(
        dbQuestions[0]._id.toString(),
        teacherOne
      );
      expect(question.options[0].isCorrect).toBe(false);
      expect(question.options[1].isCorrect).toBe(true);
      expect(question.correctAnswer).toBe('B');
    });

    it('should NOT return isCorrect for student', async () => {
      const question = await questionService.getById(
        dbQuestions[0]._id.toString(),
        studentOne
      );
      expect(question.options[0].isCorrect).toBeUndefined();
      expect(question.options[1].isCorrect).toBeUndefined();
      expect(question.correctAnswer).toBeUndefined();
    });

    it('should return full question for admin', async () => {
      const question = await questionService.getById(
        dbQuestions[0]._id.toString(),
        admin
      );
      expect(question.options[1].isCorrect).toBe(true);
      expect(question.correctAnswer).toBe('B');
    });

    it('should return null for non-existent question', async () => {
      const question = await questionService.getById(
        mongoose.Types.ObjectId().toString()
      );
      expect(question).toBeNull();
    });
  });

  describe('create', () => {
    it('teacher should create question with isApproved=false', async () => {
      const data = {
        content: 'New question?',
        type: 'single_choice',
        options: [
          { id: 'A', content: 'Yes', isCorrect: true },
          { id: 'B', content: 'No', isCorrect: false },
        ],
        difficulty: 'easy',
      };
      const question = await questionService.create(
        data,
        teacherOne._id.toString(),
        teacherOne.schoolId.toString(),
        'teacher'
      );
      expect(question.isApproved).toBe(false);
      expect(question.schoolId?.toString()).toBe(teacherOne.schoolId.toString());
      expect(question.createdBy?.toString()).toBe(teacherOne._id.toString());
    });

    it('admin should create question with isApproved=true', async () => {
      const data = {
        content: 'Admin question?',
        type: 'single_choice',
        options: [
          { id: 'A', content: 'Yes', isCorrect: true },
          { id: 'B', content: 'No', isCorrect: false },
        ],
        difficulty: 'easy',
      };
      const question = await questionService.create(
        data,
        admin._id.toString(),
        admin.schoolId?.toString(),
        'admin'
      );
      expect(question.isApproved).toBe(true);
      expect(question.approvedAt).not.toBeNull();
    });
  });

  describe('update', () => {
    it('owner teacher should be able to update', async () => {
      const updated = await questionService.update(
        dbQuestions[0]._id.toString(),
        { content: 'Updated content' },
        teacherOne
      );
      expect(updated.content).toBe('Updated content');
    });

    it('admin should be able to update any question', async () => {
      const updated = await questionService.update(
        dbQuestions[0]._id.toString(),
        { content: 'Admin updated' },
        admin
      );
      expect(updated.content).toBe('Admin updated');
    });

    it('teacher from different school should NOT be able to update', async () => {
      await expect(
        questionService.update(
          dbQuestions[0]._id.toString(),
          { content: 'Hacked' },
          teacherTwo
        )
      ).rejects.toThrow('Bạn không có quyền sửa câu hỏi này');
    });

    it('student should NOT be able to update', async () => {
      await expect(
        questionService.update(
          dbQuestions[0]._id.toString(),
          { content: 'Hacked' },
          studentOne
        )
      ).rejects.toThrow('Bạn không có quyền sửa câu hỏi này');
    });

    it('should NOT allow changing schoolId', async () => {
      const updated = await questionService.update(
        dbQuestions[0]._id.toString(),
        { content: 'Updated', schoolId: teacherTwo.schoolId },
        admin
      );
      expect(updated.schoolId?.toString()).toBe(teacherOne.schoolId.toString());
    });

    it('should throw 404 for non-existent question', async () => {
      await expect(
        questionService.update(
          mongoose.Types.ObjectId().toString(),
          { content: 'Test' },
          admin
        )
      ).rejects.toThrow('Question not found');
    });
  });

  describe('delete', () => {
    it('owner teacher should be able to delete unused question', async () => {
      const deleted = await questionService.delete(
        dbQuestions[0]._id.toString(),
        teacherOne
      );
      expect(deleted.isActive).toBe(false);
    });

    it('admin should be able to delete any question', async () => {
      const deleted = await questionService.delete(
        dbQuestions[0]._id.toString(),
        admin
      );
      expect(deleted.isActive).toBe(false);
    });

    it('teacher from different school should NOT be able to delete', async () => {
      await expect(
        questionService.delete(dbQuestions[0]._id.toString(), teacherTwo)
      ).rejects.toThrow('Bạn không có quyền xóa câu hỏi này');
    });

    it('student should NOT be able to delete', async () => {
      await expect(
        questionService.delete(dbQuestions[0]._id.toString(), studentOne)
      ).rejects.toThrow('Bạn không có quyền xóa câu hỏi này');
    });

    it('teacher should NOT be able to delete used question', async () => {
      // dbQuestions[2] is questionUsedInExam with usageCount=3
      await expect(
        questionService.delete(dbQuestions[2]._id.toString(), teacherOne)
      ).rejects.toThrow('Không thể xóa câu hỏi đã được sử dụng trong đề thi');
    });

    it('admin should be able to delete used question', async () => {
      const deleted = await questionService.delete(
        dbQuestions[2]._id.toString(),
        admin
      );
      expect(deleted.isActive).toBe(false);
    });

    it('should throw 404 for non-existent question', async () => {
      await expect(
        questionService.delete(mongoose.Types.ObjectId().toString(), admin)
      ).rejects.toThrow('Question not found');
    });
  });

  describe('approve', () => {
    it('teacher should be able to approve question from their school', async () => {
      const q = await mongoose.model('Question').findById(dbQuestions[1]._id);
      q.isApproved = false;
      await q.save();

      const approved = await questionService.approve(
        dbQuestions[1]._id.toString(),
        teacherOne._id.toString(),
        teacherOne.schoolId.toString(),
        'teacher'
      );
      expect(approved.isApproved).toBe(true);
      expect(approved.approvedBy?.toString()).toBe(teacherOne._id.toString());
    });

    it('should filter by bankId in getAll', async () => {
      const Question = mongoose.model('Question');
      const bankId = new mongoose.Types.ObjectId();
      await Question.create({
        content: 'InBank',
        options: [{ id: 'A', content: 'A', isCorrect: true }],
        createdBy: teacherOne._id,
        schoolId: teacherOne.schoolId,
        bankId,
      });
      const result = await questionService.getAll({ bankId: bankId.toString() }, teacherOne);
      expect(result.total).toBe(1);
    });
  });
});

