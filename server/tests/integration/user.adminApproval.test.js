const request = require('supertest');
const mongoose = require('mongoose');
const moment = require('moment');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User } = require('../../src/models');
const { tokenTypes } = require('../../src/config/tokens');
const tokenService = require('../../src/services/token.service');
const {
  admin,
  teacherOne,
  schoolIdA,
  schoolIdB,
  insertUsers,
} = require('../fixtures/user.fixture');

setupTestDB();

describe('User Admin Approval routes', () => {
  let adminAccessToken;
  let teacherOneAccessToken;

  beforeEach(async () => {
    await insertUsers([admin, teacherOne]);
    const accessTokenExpires = moment().add(30, 'minutes');
    adminAccessToken = tokenService.generateToken(admin._id, accessTokenExpires, tokenTypes.ACCESS);
    teacherOneAccessToken = tokenService.generateToken(teacherOne._id, accessTokenExpires, tokenTypes.ACCESS);
  });

  describe('GET /api/v1/users/admin/teachers/pending', () => {
    beforeEach(async () => {
      const pendingTeacherA = {
        name: 'Pending Teacher A',
        email: 'pendingta@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolIdA,
      };
      const pendingTeacherB = {
        name: 'Pending Teacher B',
        email: 'pendingtb@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolIdB,
      };
      await insertUsers([pendingTeacherA, pendingTeacherB]);
    });

    it('should return 200 and pending teachers for the specified school', async () => {
      const res = await request(app)
        .get('/api/v1/users/admin/teachers/pending')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ schoolId: schoolIdA.toString() })
        .expect(httpStatus.OK);

      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].name).toBe('Pending Teacher A');
    });

    it('should return 401 when no token provided', async () => {
      await request(app)
        .get('/api/v1/users/admin/teachers/pending')
        .query({ schoolId: schoolIdA.toString() })
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return 403 when user is not admin', async () => {
      const res = await request(app)
        .get('/api/v1/users/admin/teachers/pending')
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .query({ schoolId: schoolIdA.toString() })
        .expect(httpStatus.FORBIDDEN);

      expect(res.body.message).toBe('Chỉ admin mới có quyền truy cập');
    });

    it('should return 400 when schoolId is missing', async () => {
      const res = await request(app)
        .get('/api/v1/users/admin/teachers/pending')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message).toBe('schoolId is required');
    });
  });

  describe('POST /api/v1/users/admin/teachers/:userId/approve', () => {
    let pendingTeacherId;

    beforeEach(async () => {
      const pendingTeacher = await User.create({
        name: 'Pending Teacher',
        email: 'pending@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolIdA,
        isActive: false,
      });
      pendingTeacherId = pendingTeacher._id.toString();
    });

    it('should return 200 and approve the teacher', async () => {
      const res = await request(app)
        .post(`/api/v1/users/admin/teachers/${pendingTeacherId}/approve`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.registrationStatus).toBe('approved');
      expect(res.body.isActive).toBe(true);
      expect(res.body.schoolId).toBe(schoolIdA.toString());

      const dbUser = await User.findById(pendingTeacherId);
      expect(dbUser.registrationStatus).toBe('approved');
    });

    it('should return 401 when no token provided', async () => {
      await request(app)
        .post(`/api/v1/users/admin/teachers/${pendingTeacherId}/approve`)
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return 403 when user is not admin', async () => {
      const res = await request(app)
        .post(`/api/v1/users/admin/teachers/${pendingTeacherId}/approve`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .expect(httpStatus.FORBIDDEN);

      expect(res.body.message).toBe('Chỉ admin mới có quyền duyệt giáo viên');
    });

    it('should return 404 when userId does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/v1/users/admin/teachers/${fakeId}/approve`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND);

      expect(res.body.message).toBe('User not found');
    });

    it('should return 400 when teacher is already approved', async () => {
      await User.findByIdAndUpdate(pendingTeacherId, { registrationStatus: 'approved' });
      const res = await request(app)
        .post(`/api/v1/users/admin/teachers/${pendingTeacherId}/approve`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message).toBe('Tài khoản không trong trạng thái chờ duyệt');
    });
  });

  describe('POST /api/v1/users/admin/teachers/:userId/reject', () => {
    let pendingTeacherId;

    beforeEach(async () => {
      const pendingTeacher = await User.create({
        name: 'Pending Teacher',
        email: 'pending@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolIdA,
      });
      pendingTeacherId = pendingTeacher._id.toString();
    });

    it('should return 200 and reject the teacher with reason', async () => {
      const res = await request(app)
        .post(`/api/v1/users/admin/teachers/${pendingTeacherId}/reject`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ reason: 'Không đủ điều kiện' })
        .expect(httpStatus.OK);

      expect(res.body.registrationStatus).toBe('rejected');
      expect(res.body.rejectedReason).toBe('Không đủ điều kiện');

      const dbUser = await User.findById(pendingTeacherId);
      expect(dbUser.registrationStatus).toBe('rejected');
      expect(dbUser.rejectedReason).toBe('Không đủ điều kiện');
    });

    it('should return 200 and reject the teacher without reason', async () => {
      const res = await request(app)
        .post(`/api/v1/users/admin/teachers/${pendingTeacherId}/reject`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.registrationStatus).toBe('rejected');
      expect(res.body.rejectedReason).toBeNull();
    });

    it('should return 403 when user is not admin', async () => {
      const res = await request(app)
        .post(`/api/v1/users/admin/teachers/${pendingTeacherId}/reject`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({ reason: 'Test' })
        .expect(httpStatus.FORBIDDEN);

      expect(res.body.message).toBe('Chỉ admin mới có quyền từ chối giáo viên');
    });

    it('should return 404 when userId does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/v1/users/admin/teachers/${fakeId}/reject`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND);

      expect(res.body.message).toBe('User not found');
    });
  });
});
