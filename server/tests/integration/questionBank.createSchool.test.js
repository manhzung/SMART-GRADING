const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { QuestionBank } = require('../../src/models');
const { teacherOne, teacherTwo, insertUsers } = require('../fixtures/user.fixture');
const { teacherOneAccessToken, teacherTwoAccessToken } = require('../fixtures/token.fixture');

setupTestDB();

describe('QuestionBank create - schoolId auto-fill', () => {
  beforeEach(async () => {
    await QuestionBank.deleteMany({});
    await insertUsers([teacherOne, teacherTwo]);
  });

  it('auto-fills schoolId from authenticated user when type=school and no schoolId is sent', async () => {
    const res = await request(app)
      .post('/api/v1/banks')
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .send({ name: 'Auto School Bank', type: 'school' });

    expect(res.status).toBe(httpStatus.CREATED);
    expect(res.body.type).toBe('school');
    expect(res.body.schoolId).not.toBeNull();
    expect(String(res.body.schoolId)).toBe(String(teacherOne.schoolId));
  });

  it('uses explicit schoolId when provided', async () => {
    const res = await request(app)
      .post('/api/v1/banks')
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .send({
        name: 'With Explicit School',
        type: 'school',
        schoolId: String(teacherTwo.schoolId),
      });

    expect(res.status).toBe(httpStatus.CREATED);
    expect(String(res.body.schoolId)).toBe(String(teacherTwo.schoolId));
  });

  it('returns 400 when user has no schoolId and tries to create a school bank', async () => {
    // Create a teacher user that is not linked to any school
    const User = require('../../src/models/user.model');
    const tokenService = require('../../src/services/token.service');
    const { tokenTypes } = require('../../src/config/tokens');
    const config = require('../../src/config/config');
    const moment = require('moment');

    const orphanUser = await User.create({
      name: 'Orphan',
      email: 'orphan@test.com',
      password: 'Password123!',
      role: 'teacher',
      isEmailVerified: false,
      // no schoolId
    });

    const orphanToken = tokenService.generateToken(
      orphanUser._id,
      moment().add(config.jwt.accessExpirationMinutes, 'minutes'),
      tokenTypes.ACCESS
    );

    const res = await request(app)
      .post('/api/v1/banks')
      .set('Authorization', `Bearer ${orphanToken}`)
      .send({ name: 'Orphan School Bank', type: 'school' });

    expect(res.status).toBe(httpStatus.BAD_REQUEST);
  });

  it('personal bank keeps schoolId=null when none provided', async () => {
    const res = await request(app)
      .post('/api/v1/banks')
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .send({ name: 'Personal Bank', type: 'personal' });

    expect(res.status).toBe(httpStatus.CREATED);
    expect(res.body.type).toBe('personal');
    expect(res.body.schoolId).toBeNull();
  });
});
