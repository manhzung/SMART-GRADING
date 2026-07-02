const request = require('supertest');
const mongoose = require('mongoose');
const httpStatus = require('http-status');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { QuestionBank, QuestionBankMember, Question: QuestionModel, User } = require('../../src/models');
const { teacherOne, teacherTwo, userOne, userTwo, admin, insertUsers } = require('../fixtures/user.fixture');
const { teacherOneAccessToken, teacherTwoAccessToken, adminAccessToken } = require('../fixtures/token.fixture');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();

describe('QuestionBank API', () => {
  let bankId;

  beforeEach(async () => {
    await insertUsers([teacherOne, teacherTwo]);
  });

  async function createBank(token = teacherOneAccessToken, name = 'Personal') {
    const res = await request(app).post('/api/v1/banks').set('Authorization', `Bearer ${token}`).send({ name });
    return res.body._id;
  }

  it('creates a personal bank for the authenticated user', async () => {
    const res = await request(app)
      .post('/api/v1/banks')
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .send({ name: 'Personal' });

    expect(res.status).toBe(httpStatus.CREATED);
    expect(res.body.type).toBe('personal');
    expect(res.body.name).toBe('Personal');
    bankId = res.body._id;
  });

  it('returns created bank by id', async () => {
    bankId = await createBank(teacherOneAccessToken, 'Personal2');

    const res = await request(app).get(`/api/v1/banks/${bankId}`).set('Authorization', `Bearer ${teacherOneAccessToken}`);
    expect(res.status).toBe(httpStatus.OK);
    expect(res.body.bank._id).toBe(bankId);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/banks').send({ name: 'NoAuth' });
    expect(res.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('lists questions in bank', async () => {
    bankId = await createBank(teacherOneAccessToken, 'BankWithQuestions');

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

  describe('member flows', () => {
    it('invites a new member as pending viewer', async () => {
      bankId = await createBank();
      const res = await request(app)
        .post(`/api/v1/banks/${bankId}/members`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({ userId: teacherTwo._id.toString() });

      expect(res.status).toBe(httpStatus.CREATED);
      expect(res.body.status).toBe('pending');
      expect(res.body.role).toBe('viewer');
    });

    it('updates a member role (owner only)', async () => {
      bankId = await createBank();
      await QuestionBankMember.create({
        bankId,
        userId: teacherTwo._id,
        role: 'manager',
        status: 'active',
      });

      const res = await request(app)
        .patch(`/api/v1/banks/${bankId}/members/${teacherTwo._id.toString()}`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({ role: 'viewer' });

      expect(res.status).toBe(httpStatus.OK);
      expect(res.body.role).toBe('viewer');
    });

    it('forbids member role update by viewer', async () => {
      bankId = await createBank();
      await QuestionBankMember.create({
        bankId,
        userId: teacherTwo._id,
        role: 'viewer',
        status: 'active',
      });

      const res = await request(app)
        .patch(`/api/v1/banks/${bankId}/members/${teacherOne._id.toString()}`)
        .set('Authorization', `Bearer ${teacherTwoAccessToken}`)
        .send({ role: 'manager' });

      expect(res.status).toBe(httpStatus.FORBIDDEN);
    });

    it('removes a member', async () => {
      bankId = await createBank();
      await QuestionBankMember.create({
        bankId,
        userId: teacherTwo._id,
        role: 'viewer',
        status: 'active',
      });

      const res = await request(app)
        .delete(`/api/v1/banks/${bankId}/members/${teacherTwo._id.toString()}`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`);

      expect(res.status).toBe(httpStatus.NO_CONTENT);
      const exists = await QuestionBankMember.findOne({
        bankId,
        userId: teacherTwo._id,
      });
      expect(exists).toBeNull();
    });

    it('owner can leave after transfer', async () => {
      bankId = await createBank();
      await QuestionBankMember.create({
        bankId,
        userId: teacherTwo._id,
        role: 'viewer',
        status: 'active',
      });

      const transfer = await request(app)
        .post(`/api/v1/banks/${bankId}/transfer`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({ toUserId: teacherTwo._id.toString() });
      expect(transfer.status).toBe(httpStatus.OK);

      const leave = await request(app)
        .post(`/api/v1/banks/${bankId}/leave`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`);
      expect(leave.status).toBe(httpStatus.NO_CONTENT);
    });

    it('blocks owner leaving without transfer', async () => {
      bankId = await createBank();
      const res = await request(app)
        .post(`/api/v1/banks/${bankId}/leave`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`);
      expect(res.status).toBe(httpStatus.BAD_REQUEST);
    });
  });

  describe('access request flow', () => {
    it('non-member requests access → pending', async () => {
      bankId = await createBank();
      const res = await request(app)
        .post(`/api/v1/banks/${bankId}/request-access`)
        .set('Authorization', `Bearer ${teacherTwoAccessToken}`);
      expect(res.status).toBe(httpStatus.CREATED);
      expect(res.body.status).toBe('pending');
    });

    it('owner approves pending request', async () => {
      bankId = await createBank();
      await request(app)
        .post(`/api/v1/banks/${bankId}/request-access`)
        .set('Authorization', `Bearer ${teacherTwoAccessToken}`);

      const res = await request(app)
        .post(`/api/v1/banks/${bankId}/requests/${teacherTwo._id.toString()}/respond`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({ decision: 'approve' });

      expect(res.status).toBe(httpStatus.OK);
      expect(res.body.status).toBe('active');
    });

    it('owner rejects pending request (removes)', async () => {
      bankId = await createBank();
      await QuestionBankMember.create({
        bankId,
        userId: teacherTwo._id,
        role: 'viewer',
        status: 'pending',
      });

      const res = await request(app)
        .post(`/api/v1/banks/${bankId}/requests/${teacherTwo._id.toString()}/respond`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({ decision: 'reject' });

      expect(res.status).toBe(httpStatus.OK);
      const exists = await QuestionBankMember.findOne({
        bankId,
        userId: teacherTwo._id,
      });
      expect(exists).toBeNull();
    });
  });

  describe('list my banks', () => {
    it('lists banks for the authenticated user', async () => {
      // teacherOne is school-admin; use teacherTwo (pure teacher with schoolIdB) for this test
      await createBank(teacherTwoAccessToken, 'Bank A');
      await createBank(teacherTwoAccessToken, 'Bank B');

      const res = await request(app).get('/api/v1/banks').set('Authorization', `Bearer ${teacherTwoAccessToken}`);

      expect(res.status).toBe(httpStatus.OK);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('list banks by role (bank approval requirement)', () => {
    beforeEach(async () => {
      // Inline token generation per test to avoid fixture pollution
    });

    it('teacher only sees approved membership banks from GET /api/v1/banks', async () => {
      // Teacher has NO membership in BankA (just created by school-admin)
      const bankIdA = await createBank(teacherOneAccessToken, 'SchoolAdminBank');

      // Teacher gets approved membership in BankB
      const bankIdB = await createBank(teacherOneAccessToken, 'SharedBank');
      await QuestionBankMember.create({
        bankId: bankIdB,
        userId: require('mongoose').Types.ObjectId(),
        role: 'viewer',
        status: 'active',
      });

      // Use pureTeacherToken as the teacher user (schoolIdA but role=teacher)
      const teacherUser = {
        _id: require('mongoose').Types.ObjectId(),
        name: 'Pure Teacher',
        email: 'pureteacher3@test.com',
        password: require('../fixtures/user.fixture').hashedPassword,
        role: 'teacher',
        isEmailVerified: false,
        schoolId: teacherOne.schoolId,
      };
      await require('../fixtures/user.fixture').insertUsers([teacherUser]);
      const expires = moment().add(9999, 'minutes');
      const teacherT = tokenService.generateToken(teacherUser._id, expires, tokenTypes.ACCESS);

      // Teacher sends request for BankA but not yet approved
      await request(app).post(`/api/v1/banks/${bankIdA}/request-access`).set('Authorization', `Bearer ${teacherT}`);

      // Teacher gets approved membership in BankB
      const bankIdC = await createBank(teacherOneAccessToken, 'ApprovedBank');
      await request(app).post(`/api/v1/banks/${bankIdC}/request-access`).set('Authorization', `Bearer ${teacherT}`);
      await request(app)
        .post(`/api/v1/banks/${bankIdC}/requests/${teacherUser._id.toString()}/respond`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({ decision: 'approve' });

      // Teacher's own bank is visible (they are owner)
      const ownBankId = await createBank(teacherT, 'TeacherOwnBank');

      const res = await request(app).get('/api/v1/banks').set('Authorization', `Bearer ${teacherT}`);

      expect(res.status).toBe(httpStatus.OK);
      const bankNames = res.body.map((b) => b.name);
      expect(bankNames).toContain('ApprovedBank');
      expect(bankNames).toContain('TeacherOwnBank');
      expect(bankNames).not.toContain('SchoolAdminBank');
    });

    it('teacher does not see pending banks from GET /api/v1/banks', async () => {
      // Create a bank owned by school-admin
      const bankIdA = await createBank(teacherOneAccessToken, 'PendingBank');

      // Create another bank and make teacherTwo an approved member
      const bankIdB = await createBank(teacherOneAccessToken, 'VisibleBank');
      await request(app)
        .post(`/api/v1/banks/${bankIdB}/request-access`)
        .set('Authorization', `Bearer ${teacherTwoAccessToken}`);
      await request(app)
        .post(`/api/v1/banks/${bankIdB}/requests/${teacherTwo._id.toString()}/respond`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({ decision: 'approve' });

      // Teacher sends request for BankA but stays pending
      await request(app)
        .post(`/api/v1/banks/${bankIdA}/request-access`)
        .set('Authorization', `Bearer ${teacherTwoAccessToken}`);

      const res = await request(app).get('/api/v1/banks').set('Authorization', `Bearer ${teacherTwoAccessToken}`);

      expect(res.status).toBe(httpStatus.OK);
      const bankNames = res.body.map((b) => b.name);
      expect(bankNames).toContain('VisibleBank');
      expect(bankNames).not.toContain('PendingBank');
    });

    it('school-admin still sees all school banks from GET /api/v1/banks', async () => {
      // Create school banks owned by this school-admin (schoolIdA)
      const bank1 = await request(app)
        .post('/api/v1/banks')
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({ name: 'SchoolBank1', type: 'school', schoolId: teacherOne.schoolId });
      const bank2 = await request(app)
        .post('/api/v1/banks')
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({ name: 'SchoolBank2', type: 'school', schoolId: teacherOne.schoolId });

      const res = await request(app).get('/api/v1/banks').set('Authorization', `Bearer ${teacherOneAccessToken}`);

      expect(res.status).toBe(httpStatus.OK);
      const bankNames = res.body.map((b) => b.name);
      expect(bankNames).toContain('SchoolBank1');
      expect(bankNames).toContain('SchoolBank2');
    });

    it('admin still sees all banks from GET /api/v1/banks', async () => {
      // Insert admin user so the adminAccessToken resolves to a real user
      await insertUsers([admin]);

      const bank1 = await request(app)
        .post('/api/v1/banks')
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({ name: 'SchoolBankByAdmin', type: 'school', schoolId: teacherOne.schoolId });
      const bank2 = await request(app)
        .post('/api/v1/banks')
        .set('Authorization', `Bearer ${teacherTwoAccessToken}`)
        .send({ name: 'PersonalByTeacher' });

      const res = await request(app).get('/api/v1/banks').set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(httpStatus.OK);
      const bankNames = res.body.map((b) => b.name);
      expect(bankNames).toContain('SchoolBankByAdmin');
      expect(bankNames).toContain('PersonalByTeacher');
    });
  });
});
