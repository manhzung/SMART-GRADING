const request = require('supertest');
const mongoose = require('mongoose');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const {
  QuestionBank,
  QuestionBankMember,
  Question: QuestionModel,
} = require('../../src/models');
const { teacherOne, insertUsers } = require('../fixtures/user.fixture');
const { teacherOneAccessToken } = require('../fixtures/token.fixture');

setupTestDB();

describe('QuestionBank API', () => {
  let bankId;

  beforeEach(async () => {
    await insertUsers([teacherOne]);
  });

  it('creates a personal bank for the authenticated user', async () => {
    const res = await request(app)
      .post('/api/v1/banks')
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .send({ name: 'Personal' });

    if (res.status !== httpStatus.CREATED) {
      // eslint-disable-next-line no-console
      console.log('CREATE BANK RESPONSE:', res.status, res.body);
    }

    expect(res.status).toBe(httpStatus.CREATED);
    expect(res.body.type).toBe('personal');
    expect(res.body.name).toBe('Personal');
    bankId = res.body._id;
  });

  it('returns created bank by id', async () => {
    const created = await request(app)
      .post('/api/v1/banks')
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .send({ name: 'Personal2' });
    bankId = created.body._id;

    const res = await request(app)
      .get(`/api/v1/banks/${bankId}`)
      .set('Authorization', `Bearer ${teacherOneAccessToken}`);
    expect(res.status).toBe(httpStatus.OK);
    expect(res.body._id).toBe(bankId);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/banks').send({ name: 'NoAuth' });
    expect(res.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('lists questions in bank', async () => {
    const created = await request(app)
      .post('/api/v1/banks')
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .send({ name: 'BankWithQuestions' });
    bankId = created.body._id;

    await QuestionModel.create({
      content: 'InBank',
      options: [{ id: 'A', content: 'A', isCorrect: true }],
      createdBy: teacherOne._id,
      schoolId: teacherOne.schoolId,
      bankId,
    });

    const res = await request(app)
      .get(`/api/v1/banks/${bankId}/questions`)
      .set('Authorization', `Bearer ${teacherOneAccessToken}`);

    expect(res.status).toBe(httpStatus.OK);
    expect(res.body.results).toHaveLength(1);
  });
});
