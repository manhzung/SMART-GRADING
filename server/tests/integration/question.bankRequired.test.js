const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { Question, QuestionBank, QuestionBankMember } = require('../../src/models');
const { teacherOne, admin, insertUsers } = require('../fixtures/user.fixture');
const { teacherOneAccessToken, adminAccessToken } = require('../fixtures/token.fixture');

setupTestDB();

describe('GET /questions - bankId required for non-admins', () => {
  beforeEach(async () => {
    await Question.deleteMany({});
    await QuestionBank.deleteMany({});
    await QuestionBankMember.deleteMany({});
    await insertUsers([teacherOne, admin]);
    // Seed one unbanked question that a teacher could accidentally see
    await Question.create({
      content: 'Legacy unbanked Q?',
      type: 'single_choice',
      options: [
        { id: 'A', content: 'a', isCorrect: true },
        { id: 'B', content: 'b', isCorrect: false },
      ],
      difficulty: 'easy',
      schoolId: teacherOne.schoolId,
      createdBy: teacherOne._id,
      isApproved: true,
    });
  });

  it('returns 400 when teacher calls GET /questions without bankId', async () => {
    const res = await request(app).get('/api/v1/questions').set('Authorization', `Bearer ${teacherOneAccessToken}`);

    expect(res.status).toBe(httpStatus.BAD_REQUEST);
    expect(res.body.message).toMatch(/bankId/i);
  });

  it('returns 200 when teacher supplies a valid bankId', async () => {
    const bank = await QuestionBank.create({
      name: 'My Bank',
      type: 'personal',
      createdBy: teacherOne._id,
    });
    const res = await request(app)
      .get('/api/v1/questions')
      .query({ bankId: bank._id.toString() })
      .set('Authorization', `Bearer ${teacherOneAccessToken}`);

    expect(res.status).toBe(httpStatus.OK);
  });

  it('admin can still GET /questions without bankId (system view)', async () => {
    const res = await request(app).get('/api/v1/questions').set('Authorization', `Bearer ${adminAccessToken}`);

    expect(res.status).toBe(httpStatus.OK);
  });
});
