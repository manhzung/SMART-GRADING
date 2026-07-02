const request = require('supertest');
const mongoose = require('mongoose');
const httpStatus = require('http-status');
const app = require('../../src/app');
const { Exam } = require('../../src/models');
const { teacherOne, teacherTwo, insertUsers } = require('../fixtures/user.fixture');
const { examUpcoming1, examUpcoming2, examPast, examOtherTeacher, insertExams } = require('../fixtures/exam.fixture');
const { schoolA, insertSchools } = require('../fixtures/school.fixture');
const setupTestDB = require('../utils/setupTestDB');
const { teacherOneAccessToken, teacherTwoAccessToken } = require('../fixtures/token.fixture');

setupTestDB();

describe('Exam route - GET /v1/exams/upcoming', () => {
  beforeEach(async () => {
    teacherOne.schoolId = schoolA._id;
    teacherTwo.schoolId = schoolA._id;
    examUpcoming1.createdBy = teacherOne._id;
    examUpcoming2.createdBy = teacherOne._id;
    examPast.createdBy = teacherOne._id;
    examOtherTeacher.createdBy = teacherTwo._id;

    await insertSchools([schoolA]);
    await insertUsers([teacherOne, teacherTwo]);
    await insertExams([examUpcoming1, examUpcoming2, examPast, examOtherTeacher]);
  });

  it('should return 401 if no token is provided', async () => {
    await request(app).get('/api/v1/exams/upcoming').expect(httpStatus.UNAUTHORIZED);
  });

  it('should return upcoming exams for the authenticated teacher', async () => {
    const res = await request(app)
      .get('/api/v1/exams/upcoming?limit=5')
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .expect(httpStatus.OK);

    expect(res.body).toHaveProperty('results');
    expect(res.body).toHaveProperty('limit', 5);
    expect(res.body).toHaveProperty('count');
    expect(Array.isArray(res.body.results)).toBe(true);

    const titles = res.body.results.map((e) => e.title).sort();
    expect(titles).toEqual(['Math Test - Chapter 3', 'Math Test - Chapter 4']);
    expect(res.body.count).toBe(2);
  });

  it('should NOT return exams from other teachers', async () => {
    const res = await request(app)
      .get('/api/v1/exams/upcoming')
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .expect(httpStatus.OK);

    const otherTeacherExam = res.body.results.find((e) => e.title === 'Other Teacher Exam');
    expect(otherTeacherExam).toBeUndefined();
  });

  it('should return 400 if limit is invalid', async () => {
    await request(app)
      .get('/api/v1/exams/upcoming?limit=0')
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .expect(httpStatus.BAD_REQUEST);
  });

  it('should return empty results if no upcoming exams exist', async () => {
    await Exam.deleteMany({ createdBy: teacherOne._id });

    const res = await request(app)
      .get('/api/v1/exams/upcoming')
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .expect(httpStatus.OK);

    expect(res.body.results).toEqual([]);
    expect(res.body.count).toBe(0);
  });

  it('should respect limit parameter', async () => {
    const res = await request(app)
      .get('/api/v1/exams/upcoming?limit=1')
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .expect(httpStatus.OK);

    expect(res.body.results).toHaveLength(1);
    expect(res.body.limit).toBe(1);
  });
});
