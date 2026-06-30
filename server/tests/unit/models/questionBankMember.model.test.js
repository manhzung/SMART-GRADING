const mongoose = require('mongoose');
const setupTestDB = require('../../utils/setupTestDB');
const QuestionBankMember = require('../../../src/models/questionBankMember.model');

setupTestDB();

describe('QuestionBankMember Model', () => {
  it('should create active member', async () => {
    const member = await QuestionBankMember.create({
      bankId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      role: 'viewer',
      status: 'active',
    });
    expect(member.status).toBe('active');
  });

  it('should enforce enum role', async () => {
    await expect(
      QuestionBankMember.create({
        bankId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        role: 'hacker',
        status: 'active',
      })
    ).rejects.toThrow();
  });
});
