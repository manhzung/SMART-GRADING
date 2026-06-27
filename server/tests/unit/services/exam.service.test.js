const ExamService = require('../../../src/services/exam.service');
const { Exam, ExamVersion, Submission, Class } = require('../../../src/models');
const mongoose = require('mongoose');
const {
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
} = require('../../fixtures/exam.fixture');
const setupTestDB = require('../../utils/setupTestDB');

setupTestDB();

describe('Exam Service - getUpcomingExams', () => {
  let examService;

  beforeEach(async () => {
    examService = Object.create(ExamService);
    // Insert Class documents so populate('classIds') has something to resolve to
    await Class.insertMany([
      { _id: classId1, name: '10A1', code: '10A1-2026', schoolId: teacherOneId, academicYear: '2026-2027', gradeLevel: 10 },
      { _id: classId2, name: '10A2', code: '10A2-2026', schoolId: teacherOneId, academicYear: '2026-2027', gradeLevel: 10 },
    ]);
    await insertExams([
      examUpcoming1,
      examUpcoming2,
      examPast,
      examOtherTeacher,
      examDraft,
    ]);
  });

  it('should return only upcoming exams (examDate >= now) for the given teacher', async () => {
    const teacherOne = { id: teacherOneId.toString(), role: 'teacher' };
    const results = await examService.getUpcomingExams(teacherOne, 10);

    const titles = results.map((e) => e.title).sort();
    expect(titles).toEqual([
      'Draft Exam - Should Still Appear',
      'Math Test - Chapter 3',
      'Math Test - Chapter 4',
    ]);
  });

  it('should NOT return exams from other teachers', async () => {
    const teacherOne = { id: teacherOneId.toString(), role: 'teacher' };
    const results = await examService.getUpcomingExams(teacherOne, 10);
    const otherTeacherExam = results.find((e) => e.title === 'Other Teacher Exam');
    expect(otherTeacherExam).toBeUndefined();
  });

  it('should NOT return past exams (examDate < now)', async () => {
    const teacherOne = { id: teacherOneId.toString(), role: 'teacher' };
    const results = await examService.getUpcomingExams(teacherOne, 10);
    const past = results.find((e) => e.title === 'Past Math Test');
    expect(past).toBeUndefined();
  });

  it('should return exams of all statuses (draft, published, in_progress)', async () => {
    const teacherOne = { id: teacherOneId.toString(), role: 'teacher' };
    const results = await examService.getUpcomingExams(teacherOne, 10);
    const statuses = results.map((e) => e.status).sort();
    expect(statuses).toEqual(['draft', 'in_progress', 'published']);
  });

  it('should sort by examDate ASC (nearest first)', async () => {
    const teacherOne = { id: teacherOneId.toString(), role: 'teacher' };
    const results = await examService.getUpcomingExams(teacherOne, 10);

    // Order by date: Draft (5d) < Math Ch.3 (7d) < Math Ch.4 (14d)
    expect(results[0].title).toBe('Draft Exam - Should Still Appear');
    expect(results[1].title).toBe('Math Test - Chapter 3');
    expect(results[2].title).toBe('Math Test - Chapter 4');
  });

  it('should respect limit parameter', async () => {
    const teacherOne = { id: teacherOneId.toString(), role: 'teacher' };
    const results = await examService.getUpcomingExams(teacherOne, 2);
    expect(results).toHaveLength(2);
  });

  it('should populate classIds and primaryClassId', async () => {
    const teacherOne = { id: teacherOneId.toString(), role: 'teacher' };
    const results = await examService.getUpcomingExams(teacherOne, 10);

    const first = results[0];
    expect(first.classIds).toBeDefined();
    expect(first.classIds.length).toBeGreaterThan(0);
    // Populated fields should be objects, not raw ObjectIds
    expect(typeof first.classIds[0]).toBe('object');
    expect(first.classIds[0].name).toBeDefined();
    expect(first.primaryClassId).toBeDefined();
    expect(typeof first.primaryClassId).toBe('object');
  });
});

describe('Exam Service - delete (hard delete)', () => {
  let examService;

  beforeEach(async () => {
    examService = Object.create(ExamService);
    await Class.insertMany([
      { _id: classId1, name: '10A1', code: '10A1-2026', schoolId: teacherOneId, academicYear: '2026-2027', gradeLevel: 10 },
      { _id: classId2, name: '10A2', code: '10A2-2026', schoolId: teacherOneId, academicYear: '2026-2027', gradeLevel: 10 },
    ]);
    await insertExams([examUpcoming1, examUpcoming2, examDraft]);
  });

  it('should remove the exam from the database (not just soft-archive it)', async () => {
    const targetId = examIdUpcoming1.toString();

    await examService.delete(targetId);

    const found = await Exam.findById(targetId);
    expect(found).toBeNull();
  });

  it('should return the deleted exam document', async () => {
    const result = await examService.delete(examIdUpcoming2.toString());

    expect(result).toBeTruthy();
    expect(result._id.toString()).toBe(examIdUpcoming2.toString());
    expect(result.title).toBe('Math Test - Chapter 4');
  });

  it('should return null when deleting a non-existent exam', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const result = await examService.delete(nonExistentId);

    expect(result).toBeNull();
  });

  it('should cascade-delete associated ExamVersions', async () => {
    const examId = examIdUpcoming1;
    await ExamVersion.insertMany([
      {
        examId,
        versionCode: '101',
        numberOfQuestions: 20,
        questionIds: [],
        answerKey: { '1': 'A' },
        distribution: {},
        submissionCount: 0,
      },
      {
        examId,
        versionCode: '102',
        numberOfQuestions: 20,
        questionIds: [],
        answerKey: { '1': 'B' },
        distribution: {},
        submissionCount: 0,
      },
    ]);

    await examService.delete(examId.toString());

    const remainingVersions = await ExamVersion.find({ examId });
    expect(remainingVersions).toHaveLength(0);
  });

  it('should cascade-delete associated Submissions', async () => {
    const examId = examIdUpcoming1;
    const studentId = new mongoose.Types.ObjectId();
    const versionId = new mongoose.Types.ObjectId();
    const omrTemplateId = new mongoose.Types.ObjectId();
    await Submission.insertMany([
      {
        examId,
        studentId,
        studentCode: 'S001',
        classId: classId1,
        versionId,
        omrTemplateId,
        versionCode: '101',
        answers: [{ position: 1, selectedAnswer: 'A', isCorrect: true, score: 1, maxScore: 1 }],
        totalScore: 1,
        maxScore: 1,
        finalScore: 1,
        status: 'pending',
      },
    ]);

    await examService.delete(examId.toString());

    const remainingSubs = await Submission.find({ examId });
    expect(remainingSubs).toHaveLength(0);
  });

  it('should not affect other exams when deleting one', async () => {
    await examService.delete(examIdUpcoming1.toString());

    const stillThere = await Exam.findById(examIdUpcoming2);
    expect(stillThere).toBeTruthy();
    expect(stillThere.title).toBe('Math Test - Chapter 4');
  });
});
