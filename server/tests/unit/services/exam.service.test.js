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
const ExamService = require('../../../src/services/exam.service');
const { Exam, ExamVersion, Submission, Class } = require('../../../src/models');
const mongoose = require('mongoose');
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
      'Past Math Test',
    ]);
  });

  it('should NOT return exams from other teachers', async () => {
    const teacherOne = { id: teacherOneId.toString(), role: 'teacher' };
    const results = await examService.getUpcomingExams(teacherOne, 10);
    const otherTeacherExam = results.find((e) => e.title === 'Other Teacher Exam');
    expect(otherTeacherExam).toBeUndefined();
  });

  it('should return past exams with active statuses (completed, etc.)', async () => {
    const teacherOne = { id: teacherOneId.toString(), role: 'teacher' };
    const results = await examService.getUpcomingExams(teacherOne, 10);
    const past = results.find((e) => e.title === 'Past Math Test');
    expect(past).toBeDefined();
  });

  it('should return exams of all statuses (draft, published, in_progress, completed)', async () => {
    const teacherOne = { id: teacherOneId.toString(), role: 'teacher' };
    const results = await examService.getUpcomingExams(teacherOne, 10);
    const statuses = results.map((e) => e.status).sort();
    expect(statuses).toEqual(['completed', 'draft', 'in_progress', 'published']);
  });

  it('should sort by examDate DESC (nearest/most recent first)', async () => {
    const teacherOne = { id: teacherOneId.toString(), role: 'teacher' };
    const results = await examService.getUpcomingExams(teacherOne, 10);

    // Order by date DESC: Math Ch.4 (14d) < Math Ch.3 (7d) < Draft (5d) < Past (-7d)
    expect(results[0].title).toBe('Math Test - Chapter 4');
    expect(results[1].title).toBe('Math Test - Chapter 3');
    expect(results[2].title).toBe('Draft Exam - Should Still Appear');
    expect(results[3].title).toBe('Past Math Test');
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

describe('Exam Service - role-based access (getAll/getById/getUpcomingExams)', () => {
  let examService;
  const schoolAdminId = mongoose.Types.ObjectId();
  const otherSchoolId = mongoose.Types.ObjectId();
  const otherClassId = mongoose.Types.ObjectId();
  const studentId = mongoose.Types.ObjectId();
  let examInSchoolAdminClass;
  let examInOtherSchoolClass;
  let examByOtherTeacherInSameSchool;

  beforeEach(async () => {
    examService = Object.create(ExamService);
    await Class.insertMany([
      { _id: classId1, name: '10A1', code: '10A1-2026', schoolId: schoolAdminId, academicYear: '2026-2027', gradeLevel: 10 },
      { _id: classId2, name: '10A2', code: '10A2-2026', schoolId: schoolAdminId, academicYear: '2026-2027', gradeLevel: 10 },
      { _id: otherClassId, name: '10B1', code: '10B1-2026', schoolId: otherSchoolId, academicYear: '2026-2027', gradeLevel: 10 },
    ]);

    examInSchoolAdminClass = {
      _id: mongoose.Types.ObjectId(),
      title: 'School Admin Class Exam',
      classIds: [classId1],
      primaryClassId: classId1,
      createdBy: teacherOneId,
      omrTemplateId: mongoose.Types.ObjectId(),
      examDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      startTime: '07:00',
      duration: 60,
      totalScore: 10,
      numberOfQuestions: 20,
      status: 'published',
    };

    examInOtherSchoolClass = {
      _id: mongoose.Types.ObjectId(),
      title: 'Other School Exam',
      classIds: [otherClassId],
      primaryClassId: otherClassId,
      createdBy: teacherTwoId,
      omrTemplateId: mongoose.Types.ObjectId(),
      examDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      startTime: '07:00',
      duration: 60,
      totalScore: 10,
      numberOfQuestions: 20,
      status: 'published',
    };

    examByOtherTeacherInSameSchool = {
      _id: mongoose.Types.ObjectId(),
      title: 'Other Teacher Same School Exam',
      classIds: [classId2],
      primaryClassId: classId2,
      createdBy: teacherTwoId,
      omrTemplateId: mongoose.Types.ObjectId(),
      examDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      startTime: '07:00',
      duration: 60,
      totalScore: 10,
      numberOfQuestions: 20,
      status: 'published',
    };

    await insertExams([
      examInSchoolAdminClass,
      examInOtherSchoolClass,
      examByOtherTeacherInSameSchool,
    ]);
  });

  describe('getAll - role scoping', () => {
    it('returns all exams for admin without schoolId', async () => {
      const admin = { id: 'admin1', role: 'admin', schoolId: null };
      const result = await examService.getAll({}, admin);
      expect(result.results).toHaveLength(3);
    });

    it('returns only school-scoped exams for school-admin', async () => {
      const schoolAdmin = { id: schoolAdminId.toString(), role: 'school-admin', schoolId: schoolAdminId };
      const result = await examService.getAll({}, schoolAdmin);
      const titles = result.results.map((e) => e.title).sort();
      expect(titles).toEqual([
        'Other Teacher Same School Exam',
        'School Admin Class Exam',
      ]);
    });

    it('returns only exams created by the teacher', async () => {
      const teacher = { id: teacherOneId.toString(), role: 'teacher' };
      const result = await examService.getAll({}, teacher);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toBe('School Admin Class Exam');
    });
  });

  describe('getById - authorization', () => {
    it('allows admin to view any exam', async () => {
      const admin = { id: 'admin1', role: 'admin', schoolId: null };
      const exam = await examService.getById(examInOtherSchoolClass._id.toString(), admin);
      expect(exam).toBeTruthy();
      expect(exam.title).toBe('Other School Exam');
    });

    it('allows school-admin to view exam in their school', async () => {
      const schoolAdmin = { id: schoolAdminId.toString(), role: 'school-admin', schoolId: schoolAdminId };
      const exam = await examService.getById(examInSchoolAdminClass._id.toString(), schoolAdmin);
      expect(exam).toBeTruthy();
      expect(exam.title).toBe('School Admin Class Exam');
    });

    it('denies school-admin from viewing exam in another school', async () => {
      const schoolAdmin = { id: schoolAdminId.toString(), role: 'school-admin', schoolId: schoolAdminId };
      await expect(
        examService.getById(examInOtherSchoolClass._id.toString(), schoolAdmin)
      ).rejects.toThrow('You can only view exams in your own school');
    });

    it('allows teacher to view their own exam', async () => {
      const teacher = { id: teacherOneId.toString(), role: 'teacher' };
      const exam = await examService.getById(examInSchoolAdminClass._id.toString(), teacher);
      expect(exam).toBeTruthy();
      expect(exam.title).toBe('School Admin Class Exam');
    });

    it('denies teacher from viewing exam created by another teacher in same school', async () => {
      const teacher = { id: teacherOneId.toString(), role: 'teacher' };
      await expect(
        examService.getById(examByOtherTeacherInSameSchool._id.toString(), teacher)
      ).rejects.toThrow('You can only view exams for your classes');
    });

    it('allows teacher to view exam for their homeroom class', async () => {
      await Class.findByIdAndUpdate(classId1, { homeroomTeacherId: teacherOneId });
      const teacher = { id: teacherOneId.toString(), role: 'teacher' };
      const exam = await examService.getById(examByOtherTeacherInSameSchool._id.toString(), teacher);
      expect(exam).toBeTruthy();
      expect(exam.title).toBe('Other Teacher Same School Exam');
    });
  });

  describe('getUpcomingExams - role scoping', () => {
    it('returns all upcoming exams for admin', async () => {
      const admin = { id: 'admin1', role: 'admin', schoolId: null };
      const results = await examService.getUpcomingExams(admin, 10);
      expect(results).toHaveLength(3);
    });

    it('returns school-scoped upcoming exams for school-admin', async () => {
      const schoolAdmin = { id: schoolAdminId.toString(), role: 'school-admin', schoolId: schoolAdminId };
      const results = await examService.getUpcomingExams(schoolAdmin, 10);
      const titles = results.map((e) => e.title).sort();
      expect(titles).toEqual([
        'Other Teacher Same School Exam',
        'School Admin Class Exam',
      ]);
    });

    it('returns only own upcoming exams for teacher', async () => {
      const teacher = { id: teacherOneId.toString(), role: 'teacher' };
      const results = await examService.getUpcomingExams(teacher, 10);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('School Admin Class Exam');
    });
  });
});
