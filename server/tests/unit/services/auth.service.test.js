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
      /Incorrect email or password/,
    );
  });

  it('should throw "Incorrect email or password" when password is wrong', async () => {
    await expect(authService.loginUserWithEmailAndPassword(studentOne.email, 'wrongpass1')).rejects.toThrow(
      /Incorrect email or password/,
    );
  });

  it('should auto-verify and return the user in non-production mode even when isEmailVerified is false (regression: tokenService destructure bug)', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
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
});
