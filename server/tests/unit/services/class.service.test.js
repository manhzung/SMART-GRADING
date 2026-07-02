const mongoose = require('mongoose');
const ClassService = require('../../../src/services/class.service');
const {
  classA,
  classB,
  classIdA,
  insertClasses,
} = require('../../fixtures/class.fixture');
const {
  admin,
  teacherOne,
  teacherTwo,
  studentOne,
  insertUsers,
} = require('../../fixtures/user.fixture');
const { schoolA, insertSchools } = require('../../fixtures/school.fixture');
const setupTestDB = require('../../utils/setupTestDB');

setupTestDB();

describe('Class Service - getAvailableStudents', () => {
  let classService;
  let otherStudent;
  let extraStudent;

  beforeEach(async () => {
    classService = Object.create(ClassService);
    otherStudent = {
      _id: mongoose.Types.ObjectId(),
      name: 'Other Student In School',
      email: 'other.student@schoola.vn',
      password: 'password1',
      role: 'student',
      isEmailVerified: false,
      schoolId: schoolA._id,
    };
    extraStudent = {
      _id: mongoose.Types.ObjectId(),
      name: 'Extra Student',
      email: 'extra.student@schoola.vn',
      password: 'password1',
      role: 'student',
      isEmailVerified: false,
      schoolId: schoolA._id,
    };
    classA.schoolId = schoolA._id;
    classB.schoolId = schoolA._id;
    classA.homeroomTeacherId = teacherOne._id;
    classA.studentIds = [studentOne._id];
    teacherOne.schoolId = schoolA._id;
    teacherTwo.schoolId = schoolA._id;
    admin.schoolId = schoolA._id;
    studentOne.schoolId = schoolA._id;

    await insertSchools([schoolA]);
    await insertUsers([admin, teacherOne, teacherTwo, studentOne, otherStudent, extraStudent]);
    await insertClasses([classA, classB]);
  });

  it('should return students in same school excluding those already in class (admin caller)', async () => {
    const result = await classService.getAvailableStudents(classIdA.toString(), {}, admin);
    expect(result.results).toHaveLength(2);
    const emails = result.results.map((s) => s.email).sort();
    expect(emails).toEqual(['extra.student@schoola.vn', 'other.student@schoola.vn']);
    expect(result.total).toBe(2);
  });

  it('should return students in same school excluding those already in class (homeroom teacher caller)', async () => {
    const result = await classService.getAvailableStudents(classIdA.toString(), {}, teacherOne);
    expect(result.results).toHaveLength(2);
  });

  it('should throw 403 when teacher is from a different school (school boundary check)', async () => {
    // Override teacherTwo to be in a different school
    teacherTwo.schoolId = new mongoose.Types.ObjectId();
    await mongoose.model('User').updateOne({ _id: teacherTwo._id }, { $set: { schoolId: teacherTwo.schoolId } });

    await expect(
      classService.getAvailableStudents(classIdA.toString(), {}, teacherTwo)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('should NOT throw 403 for teacher in same school but not homeroom (view-only access)', async () => {
    // teacherTwo is in same school, just not homeroom of this class
    // _authorizeClassAccess('view') allows any teacher in same school
    const result = await classService.getAvailableStudents(classIdA.toString(), {}, teacherTwo);
    expect(result.results).toHaveLength(2);
  });

  it('should throw 404 when class does not exist', async () => {
    const nonExistentId = mongoose.Types.ObjectId().toString();
    await expect(
      classService.getAvailableStudents(nonExistentId, {}, admin)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('should filter by search keyword (case-insensitive, partial match)', async () => {
    const result = await classService.getAvailableStudents(classIdA.toString(), { search: 'OTHER' }, admin);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].name).toContain('Other');
  });

  it('should respect limit and page query params (limit=1, page=1)', async () => {
    const result = await classService.getAvailableStudents(
      classIdA.toString(),
      { page: 1, limit: 1 },
      admin
    );
    expect(result.results).toHaveLength(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(1);
    expect(result.total).toBe(2);
    expect(result.pages).toBe(2);
  });

  it('should escape regex special characters in search', async () => {
    // Search with regex special chars should not throw
    const result = await classService.getAvailableStudents(
      classIdA.toString(),
      { search: '.*+?^${}()|' },
      admin
    );
    expect(result.results).toHaveLength(0);
  });
});

describe('Class Service - create with optional schoolId', () => {
  let classService;
  let schoollessTeacher;
  let schoollessTeacherUser;

  beforeEach(async () => {
    classService = Object.create(ClassService);

    schoollessTeacherUser = {
      _id: mongoose.Types.ObjectId(),
      name: 'School-less Teacher',
      email: 'schoolless@example.com',
      password: 'password1',
      role: 'teacher',
      isEmailVerified: true,
      schoolId: null,
      registrationStatus: 'approved',
      isActive: true,
    };

    await insertUsers([schoollessTeacherUser]);
  });

  it('should allow a school-less teacher to create a class without a schoolId', async () => {
    const data = {
      name: 'Free Class',
      code: 'FREE-2026',
      academicYear: '2026-2027',
      schoolId: null,
    };

    const created = await classService.create(data, schoollessTeacherUser);
    expect(created).toBeDefined();
    expect(created.schoolId).toBeNull();
  });

  it('should allow a school-less teacher to create a class with empty-string schoolId (normalized to null)', async () => {
    const data = {
      name: 'Free Class 2',
      code: 'FREE2-2026',
      academicYear: '2026-2027',
      schoolId: '',
    };

    const created = await classService.create(data, schoollessTeacherUser);
    expect(created).toBeDefined();
    expect(created.schoolId).toBeNull();
  });

  it('should reject a school-less teacher from creating a class for a specific school', async () => {
    await insertSchools([schoolA]);
    const data = {
      name: '10A1',
      code: '10A1-2026',
      academicYear: '2026-2027',
      schoolId: schoolA._id.toString(),
    };

    await expect(classService.create(data, schoollessTeacherUser)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('should reject a teacher from a different school creating a class for their target school', async () => {
    await insertSchools([schoolA]);
    teacherOne.schoolId = new mongoose.Types.ObjectId();
    await mongoose.model('User').updateOne(
      { _id: teacherOne._id },
      { $set: { schoolId: teacherOne.schoolId } }
    );

    const data = {
      name: '10A1',
      code: '10A1-2026',
      academicYear: '2026-2027',
      schoolId: schoolA._id.toString(),
    };

    await expect(classService.create(data, teacherOne)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
