const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { QuestionBank, QuestionBankMember, Question } = require('../../src/models');
const { teacherOne, insertUsers } = require('../fixtures/user.fixture');
const { teacherOneAccessToken } = require('../fixtures/token.fixture');

setupTestDB();

describe('Question validation - bankId support', () => {
  let bankId;

  beforeEach(async () => {
    await Question.deleteMany({});
    await QuestionBank.deleteMany({});
    await QuestionBankMember.deleteMany({});
    await insertUsers([teacherOne]);
  });

  async function createBank() {
    const res = await request(app)
      .post('/api/v1/banks')
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .send({ name: 'Test Bank' });
    return res.body._id;
  }

  it('accepts bankId in POST /questions body', async () => {
    bankId = await createBank();

    const res = await request(app)
      .post('/api/v1/questions')
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .send({
        content: 'Q?',
        type: 'single_choice',
        bankId,
        options: [
          { id: 'A', content: 'a', isCorrect: true },
          { id: 'B', content: 'b', isCorrect: false },
        ],
      });

    expect(res.status).toBe(httpStatus.CREATED);
    expect(res.body.bankId).toBe(bankId);
  });

  it('accepts bankId query on GET /questions', async () => {
    const res = await request(app)
      .get('/api/v1/questions')
      .query({ bankId: '6a442bb965b3be90ec93db54' })
      .set('Authorization', `Bearer ${teacherOneAccessToken}`);

    expect(res.status).toBe(httpStatus.OK);
  });

  it('rejects invalid bankId (not ObjectId format)', async () => {
    const res = await request(app)
      .post('/api/v1/questions')
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .send({
        content: 'Q?',
        type: 'single_choice',
        bankId: 'not-an-id',
        options: [
          { id: 'A', content: 'a', isCorrect: true },
          { id: 'B', content: 'b', isCorrect: false },
        ],
      });

    expect(res.status).toBe(httpStatus.BAD_REQUEST);
  });
});