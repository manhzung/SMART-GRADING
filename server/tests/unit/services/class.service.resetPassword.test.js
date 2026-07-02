const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const ClassService = require('../../../src/services/class.service');
const User = require('../../../src/models/user.model');
const { classA, classIdA, insertClasses } = require('../../fixtures/class.fixture');
const { admin, teacherOne, insertUsers } = require('../../fixtures/user.fixture');
const { schoolA, insertSchools } = require('../../fixtures/school.fixture');
const setupTestDB = require('../../utils/setupTestDB');

setupTestDB();

describe('Class Service - resetStudentPassword', () => {
  let classService;
  let studentInClass;

  beforeEach(async () => {
    classService = Object.create(ClassService);
    await insertSchools([schoolA]);
    await insertUsers([admin, teacherOne]);

    studentInClass = {
      _id: mongoose.Types.ObjectId(),
      name: 'Student In Class',
      email: 'inclass.student@schoola.vn',
      password: 'OldPass123!',
      studentCode: 'STU-IC-001',
      role: 'student',
      schoolId: schoolA._id,
    };
    await insertUsers([studentInClass]);

    classA.schoolId = schoolA._id;
    classA.homeroomTeacherId = teacherOne._id;
    classA.studentIds = [studentInClass._id];
    await insertClasses([classA]);
  });

  test('homeroom teacher can reset password', async () => {
    await classService.resetStudentPassword(classIdA, studentInClass._id.toString(), 'NewPass456!', teacherOne);
    const updated = await User.findById(studentInClass._id).select('+password');
    expect(await bcrypt.compare('NewPass456!', updated.password)).toBe(true);
    expect(await bcrypt.compare('OldPass123!', updated.password)).toBe(false);
  });

  test('admin can reset password', async () => {
    await classService.resetStudentPassword(classIdA, studentInClass._id.toString(), 'AdminReset1!', admin);
    const updated = await User.findById(studentInClass._id).select('+password');
    expect(await bcrypt.compare('AdminReset1!', updated.password)).toBe(true);
  });

  test('non-homeroom teacher is rejected', async () => {
    const otherTeacher = {
      _id: mongoose.Types.ObjectId(),
      name: 'Other Teacher',
      email: 'other.teacher@schoola.vn',
      password: 'password1',
      role: 'teacher',
      schoolId: schoolA._id,
    };
    await insertUsers([otherTeacher]);
    await expect(
      classService.resetStudentPassword(classIdA, studentInClass._id.toString(), 'Xyz12345!', otherTeacher)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test('student not in class is rejected', async () => {
    const outsider = {
      _id: mongoose.Types.ObjectId(),
      name: 'Outsider',
      email: 'outsider@schoola.vn',
      password: 'password1',
      role: 'student',
      schoolId: schoolA._id,
    };
    await insertUsers([outsider]);
    await expect(
      classService.resetStudentPassword(classIdA, outsider._id.toString(), 'Xyz12345!', teacherOne)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test('weak password is rejected (no letter)', async () => {
    await expect(
      classService.resetStudentPassword(classIdA, studentInClass._id.toString(), '12345678', teacherOne)
    ).rejects.toThrow();
  });

  test('weak password is rejected (too short)', async () => {
    await expect(
      classService.resetStudentPassword(classIdA, studentInClass._id.toString(), 'Aa1!', teacherOne)
    ).rejects.toThrow();
  });
});
