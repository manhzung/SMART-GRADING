const mongoose = require('mongoose');
const authService = require('../../../src/services/auth.service');
const { User } = require('../../../src/models');
const { studentOne, password, insertUsers } = require('../../fixtures/user.fixture');
const { schoolA, insertSchools } = require('../../fixtures/school.fixture');
const setupTestDB = require('../../utils/setupTestDB');

setupTestDB();

describe('Auth Service - loginUserWithEmailAndPassword', () => {
  beforeEach(async () => {
    await insertSchools([schoolA]);
    await insertUsers([{ ...studentOne, schoolId: schoolA._id }]);
  });

  it('should throw "Incorrect email or password" when email does not exist', async () => {
    await expect(authService.loginUserWithEmailAndPassword('nobody@example.com', password)).rejects.toThrow(
      /Incorrect email or password/
    );
  });

  it('should throw "Incorrect email or password" when password is wrong', async () => {
    await expect(authService.loginUserWithEmailAndPassword(studentOne.email, 'wrongpass1')).rejects.toThrow(
      /Incorrect email or password/
    );
  });

  it('should auto-verify and return the user in non-production mode even when isEmailVerified is false (regression: tokenService destructure bug)', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      await User.updateOne({ _id: studentOne._id }, { $set: { registrationStatus: 'approved' } });
      const user = await authService.loginUserWithEmailAndPassword(studentOne.email, password);
      expect(user).toBeDefined();
      expect(user.email).toBe(studentOne.email);
      expect(user.isEmailVerified).toBe(true);

      const persisted = await User.findById(user.id);
      expect(persisted).toBeDefined();
      expect(persisted.isEmailVerified).toBe(true);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('should reject login when registrationStatus is "pending"', async () => {
    await User.updateOne({ _id: studentOne._id }, { $set: { registrationStatus: 'pending' } });
    await expect(authService.loginUserWithEmailAndPassword(studentOne.email, password)).rejects.toThrow(
      /chờ Super Admin phê duyệt/
    );
  });

  it('should reject login when registrationStatus is "rejected"', async () => {
    await User.updateOne({ _id: studentOne._id }, { $set: { registrationStatus: 'rejected' } });
    await expect(authService.loginUserWithEmailAndPassword(studentOne.email, password)).rejects.toThrow(/bị từ chối/);
  });

  it('should allow login when registrationStatus is "approved"', async () => {
    await User.updateOne({ _id: studentOne._id }, { $set: { registrationStatus: 'approved' } });
    const user = await authService.loginUserWithEmailAndPassword(studentOne.email, password);
    expect(user).toBeDefined();
    expect(user.email).toBe(studentOne.email);
  });
});
