const mongoose = require('mongoose');
const setupTestDB = require('../../utils/setupTestDB');
const { User } = require('../../../src/models');

setupTestDB();

const userService = require('../../../src/services/user.service');

describe('Admin Teacher Approval Service', () => {
  describe('getPendingTeachersForSchool', () => {
    it('returns paginated pending teachers for a specific school', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const teacher = await User.create({
        name: 'Teacher A',
        email: 'ta@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolId,
      });
      const result = await userService.getPendingTeachersForSchool(schoolId);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]._id.toString()).toBe(teacher._id.toString());
    });

    it('returns empty list when no pending teachers', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const result = await userService.getPendingTeachersForSchool(schoolId);
      expect(result.results).toHaveLength(0);
    });

    it('does not return teachers from other schools', async () => {
      const schoolA = new mongoose.Types.ObjectId();
      const schoolB = new mongoose.Types.ObjectId();
      await User.create({
        name: 'Teacher A',
        email: 'ta@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolA,
      });
      await User.create({
        name: 'Teacher B',
        email: 'tb@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolB,
      });
      const result = await userService.getPendingTeachersForSchool(schoolA);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('Teacher A');
    });

    it('does not return approved or rejected teachers', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      await User.create({
        name: 'Teacher Pending',
        email: 'pending@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolId,
      });
      await User.create({
        name: 'Teacher Approved',
        email: 'approved@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'approved',
        registeredSchoolId: schoolId,
      });
      await User.create({
        name: 'Teacher Rejected',
        email: 'rejected@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'rejected',
        registeredSchoolId: schoolId,
      });
      const result = await userService.getPendingTeachersForSchool(schoolId);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('Teacher Pending');
    });

    it('supports pagination options', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      for (let i = 0; i < 5; i++) {
        await User.create({
          name: `Teacher ${i}`,
          email: `t${i}@example.com`,
          password: 'Password123',
          role: 'teacher',
          registrationStatus: 'pending',
          registeredSchoolId: schoolId,
        });
      }
      const result = await userService.getPendingTeachersForSchool(schoolId, { limit: 2, page: 1, sortBy: 'createdAt:asc' });
      expect(result.results).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.pages).toBe(3);
      expect(result.results.map((r) => r.name)).toEqual(['Teacher 0', 'Teacher 1']);
    });
  });

  describe('adminApproveTeacher', () => {
    it('approves a pending teacher and assigns schoolId from registeredSchoolId', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const teacher = await User.create({
        name: 'Teacher',
        email: 'teacher@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolId,
        isActive: false,
      });
      const result = await userService.adminApproveTeacher(teacher._id.toString());
      expect(result.registrationStatus).toBe('approved');
      expect(result.schoolId.toString()).toBe(schoolId.toString());
      expect(result.isActive).toBe(true);
    });

    it('throws 404 when user not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(userService.adminApproveTeacher(fakeId.toString())).rejects.toThrow('User not found');
    });

    it('throws 400 when user is not a teacher', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@example.com',
        password: 'Password123',
        role: 'admin',
        registrationStatus: 'pending',
        registeredSchoolId: schoolId,
      });
      await expect(userService.adminApproveTeacher(admin._id.toString())).rejects.toThrow(
        'Chỉ có thể duyệt tài khoản giáo viên'
      );
    });

    it('throws 400 when teacher is not pending', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const teacher = await User.create({
        name: 'Teacher',
        email: 'teacher@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'approved',
        registeredSchoolId: schoolId,
      });
      await expect(userService.adminApproveTeacher(teacher._id.toString())).rejects.toThrow(
        'Tài khoản không trong trạng thái chờ duyệt'
      );
    });

    it('throws 400 when teacher has no registeredSchoolId', async () => {
      const teacher = await User.create({
        name: 'Teacher',
        email: 'teacher@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: null,
      });
      await expect(userService.adminApproveTeacher(teacher._id.toString())).rejects.toThrow(
        'Giáo viên chưa đăng ký vào trường nào'
      );
    });
  });

  describe('adminRejectTeacher', () => {
    it('rejects a pending teacher with reason', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const teacher = await User.create({
        name: 'Teacher',
        email: 'teacher@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolId,
      });
      const result = await userService.adminRejectTeacher(teacher._id.toString(), 'Không đủ điều kiện');
      expect(result.registrationStatus).toBe('rejected');
      expect(result.rejectedReason).toBe('Không đủ điều kiện');
    });

    it('rejects a pending teacher without reason', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const teacher = await User.create({
        name: 'Teacher',
        email: 'teacher@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolId,
      });
      const result = await userService.adminRejectTeacher(teacher._id.toString());
      expect(result.registrationStatus).toBe('rejected');
      expect(result.rejectedReason).toBeNull();
    });

    it('throws 404 when user not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(userService.adminRejectTeacher(fakeId.toString())).rejects.toThrow('User not found');
    });

    it('throws 400 when user is not a teacher', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const student = await User.create({
        name: 'Student',
        email: 'student@example.com',
        password: 'Password123',
        role: 'student',
        registrationStatus: 'pending',
        registeredSchoolId: schoolId,
      });
      await expect(userService.adminRejectTeacher(student._id.toString())).rejects.toThrow(
        'Chỉ có thể từ chối tài khoản giáo viên'
      );
    });

    it('throws 400 when teacher is not pending', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const teacher = await User.create({
        name: 'Teacher',
        email: 'teacher@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'approved',
        registeredSchoolId: schoolId,
      });
      await expect(userService.adminRejectTeacher(teacher._id.toString())).rejects.toThrow(
        'Tài khoản không trong trạng thái chờ duyệt'
      );
    });
  });
});
