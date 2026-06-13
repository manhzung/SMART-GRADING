const request = require('supertest');
const httpStatus = require('http-status');
const mongoose = require('mongoose');
const app = require('../../../src/app');
const setupTestDB = require('../../utils/setupTestDB');
const { classA, classB, classIdA, insertClasses } = require('../../fixtures/class.fixture');
const { admin, teacherOne, teacherTwo, studentOne, insertUsers } = require('../../fixtures/user.fixture');
const { schoolA, insertSchools } = require('../../fixtures/school.fixture');
const {
  adminAccessToken,
  teacherOneAccessToken,
  teacherTwoAccessToken,
} = require('../../fixtures/token.fixture');

setupTestDB();

describe('GET /api/v1/classes/:id/available-students', () => {
  let otherStudent;

  beforeEach(async () => {
    otherStudent = {
      _id: mongoose.Types.ObjectId(),
      name: 'Other Student',
      email: 'other.student@test.com',
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
    await insertUsers([admin, teacherOne, teacherTwo, studentOne, otherStudent]);
    await insertClasses([classA, classB]);
  });

  test('should return 401 if no access token', async () => {
    await request(app)
      .get(`/api/v1/classes/${classIdA.toString()}/available-students`)
      .expect(httpStatus.UNAUTHORIZED);
  });

  test('should return 403 if teacher is from a different school (school boundary)', async () => {
    // Move teacherTwo to a different school
    teacherTwo.schoolId = new mongoose.Types.ObjectId();
    await mongoose.model('User').updateOne({ _id: teacherTwo._id }, { $set: { schoolId: teacherTwo.schoolId } });

    await request(app)
      .get(`/api/v1/classes/${classIdA.toString()}/available-students`)
      .set('Authorization', `Bearer ${teacherTwoAccessToken}`)
      .expect(httpStatus.FORBIDDEN);
  });

  test('should return 200 with available students for homeroom teacher', async () => {
    const res = await request(app)
      .get(`/api/v1/classes/${classIdA.toString()}/available-students`)
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .expect(httpStatus.OK);

    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].email).toBe('other.student@test.com');
    expect(res.body.total).toBe(1);
  });

  test('should return 200 with available students for admin', async () => {
    const res = await request(app)
      .get(`/api/v1/classes/${classIdA.toString()}/available-students`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(httpStatus.OK);

    expect(res.body.results).toHaveLength(1);
  });

  test('should respect search query', async () => {
    const res = await request(app)
      .get(`/api/v1/classes/${classIdA.toString()}/available-students?search=other`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(httpStatus.OK);

    expect(res.body.results).toHaveLength(1);
  });

  test('should return 400 for invalid class id', async () => {
    await request(app)
      .get('/api/v1/classes/invalid-id/available-students')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(httpStatus.BAD_REQUEST);
  });

  test('should return 404 for non-existent class', async () => {
    const nonExistentId = mongoose.Types.ObjectId().toString();
    await request(app)
      .get(`/api/v1/classes/${nonExistentId}/available-students`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(httpStatus.NOT_FOUND);
  });
});
