const request = require('supertest');
const httpStatus = require('http-status');
const mongoose = require('mongoose');
const app = require('../../../src/app');
const setupTestDB = require('../../utils/setupTestDB');
const { admin, teacherOne, teacherTwo, studentOne, insertUsers } = require('../../fixtures/user.fixture');
const { schoolA, schoolB, insertSchools } = require('../../fixtures/school.fixture');
const {
  adminAccessToken,
  teacherOneAccessToken,
} = require('../../fixtures/token.fixture');

setupTestDB();

describe('GET /api/v1/schools/:schoolId/available-teachers', () => {
  beforeEach(async () => {
    teacherOne.schoolId = schoolA._id;
    teacherTwo.schoolId = schoolA._id;
    admin.schoolId = schoolA._id;
    studentOne.schoolId = schoolA._id;

    await insertSchools([schoolA, schoolB]);
    await insertUsers([admin, teacherOne, teacherTwo, studentOne]);
  });

  test('should return 401 if no access token', async () => {
    await request(app)
      .get(`/api/v1/schools/${schoolA._id.toString()}/available-teachers`)
      .expect(httpStatus.UNAUTHORIZED);
  });

  test('should return 200 with all teachers in school for admin', async () => {
    const res = await request(app)
      .get(`/api/v1/schools/${schoolA._id.toString()}/available-teachers`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(httpStatus.OK);

    expect(res.body.results).toHaveLength(2);
    const names = res.body.results.map((t) => t.name).sort();
    expect(names).toContain(teacherOne.name);
    expect(names).toContain(teacherTwo.name);
    // Should NOT include the student
    expect(res.body.results.find((t) => t.role === 'student')).toBeUndefined();
  });

  test('should return 200 with teachers for teacher in same school', async () => {
    const res = await request(app)
      .get(`/api/v1/schools/${schoolA._id.toString()}/available-teachers`)
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .expect(httpStatus.OK);

    expect(res.body.results).toHaveLength(2);
  });

  test('should respect search query (search by email)', async () => {
    // Email is the deterministic field; faker name is random
    const res = await request(app)
      .get(`/api/v1/schools/${schoolA._id.toString()}/available-teachers?search=${encodeURIComponent(teacherOne.email.split('@')[0])}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(httpStatus.OK);

    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].email).toBe(teacherOne.email);
  });

  test('should return 400 for invalid school id', async () => {
    await request(app)
      .get('/api/v1/schools/invalid-id/available-teachers')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(httpStatus.BAD_REQUEST);
  });

  test('should return 404 for non-existent school', async () => {
    const nonExistentId = mongoose.Types.ObjectId().toString();
    await request(app)
      .get(`/api/v1/schools/${nonExistentId}/available-teachers`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(httpStatus.NOT_FOUND);
  });

  test('should return 403 if teacher is from a different school', async () => {
    // Move teacherOne to schoolB
    teacherOne.schoolId = schoolB._id;
    await mongoose.model('User').updateOne({ _id: teacherOne._id }, { $set: { schoolId: schoolB._id } });

    await request(app)
      .get(`/api/v1/schools/${schoolA._id.toString()}/available-teachers`)
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .expect(httpStatus.FORBIDDEN);
  });
});
