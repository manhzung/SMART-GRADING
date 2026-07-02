const request = require('supertest');
const httpStatus = require('http-status');
const mongoose = require('mongoose');
const app = require('../../../src/app');
const setupTestDB = require('../../utils/setupTestDB');
const { User } = require('../../../src/models');
const { insertUsers, admin } = require('../../fixtures/user.fixture');
const { insertSchools, schoolA } = require('../../fixtures/school.fixture');
const { adminAccessToken } = require('../../fixtures/token.fixture');

setupTestDB();

describe('POST /api/v1/users/school-admin/:schoolId', () => {
  let teacherInSchool;
  let teacherInOtherSchool;
  let student;

  beforeEach(async () => {
    await insertUsers([admin]);
    await insertSchools([schoolA]);

    teacherInSchool = {
      _id: mongoose.Types.ObjectId(),
      name: 'Teacher A',
      email: 'teachera@school.test',
      password: 'password1',
      role: 'teacher',
      isEmailVerified: true,
      schoolId: schoolA._id,
      registrationStatus: 'approved',
      isActive: true,
    };

    teacherInOtherSchool = {
      _id: mongoose.Types.ObjectId(),
      name: 'Teacher B',
      email: 'teacherb@school.test',
      password: 'password1',
      role: 'teacher',
      isEmailVerified: true,
      schoolId: mongoose.Types.ObjectId(),
      registrationStatus: 'approved',
      isActive: true,
    };

    student = {
      _id: mongoose.Types.ObjectId(),
      name: 'Student',
      email: 'student@school.test',
      password: 'password1',
      role: 'student',
      isEmailVerified: true,
      schoolId: schoolA._id,
    };

    await insertUsers([teacherInSchool, teacherInOtherSchool, student]);
  });

  test('should promote a teacher of the school to school-admin', async () => {
    const res = await request(app)
      .post(`/api/v1/users/school-admin/${schoolA._id.toString()}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ userId: teacherInSchool._id.toString() })
      .expect(httpStatus.OK);

    expect(res.body.role).toBe('school-admin');
    expect(res.body.schoolId).toBe(schoolA._id.toString());

    const dbUser = await User.findById(teacherInSchool._id);
    expect(dbUser.role).toBe('school-admin');
    expect(dbUser.schoolId.toString()).toBe(schoolA._id.toString());
    expect(dbUser.registrationStatus).toBe('approved');
    expect(dbUser.isActive).toBe(true);
  });

  test('should reject when target user is not a teacher', async () => {
    await request(app)
      .post(`/api/v1/users/school-admin/${schoolA._id.toString()}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ userId: student._id.toString() })
      .expect(httpStatus.BAD_REQUEST);
  });

  test('should reject when teacher belongs to a different school', async () => {
    await request(app)
      .post(`/api/v1/users/school-admin/${schoolA._id.toString()}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ userId: teacherInOtherSchool._id.toString() })
      .expect(httpStatus.BAD_REQUEST);
  });

  test('should return 404 when target user does not exist', async () => {
    const fakeId = mongoose.Types.ObjectId().toString();
    await request(app)
      .post(`/api/v1/users/school-admin/${schoolA._id.toString()}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ userId: fakeId })
      .expect(httpStatus.NOT_FOUND);
  });
});
