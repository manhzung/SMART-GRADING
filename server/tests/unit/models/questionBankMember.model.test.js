const mongoose = require('mongoose');
const setupTestDB = require('../../utils/setupTestDB');

setupTestDB();

describe('QuestionBankMember Model', () => {
  it('should create active member', async () => {
    const QuestionBankMember = require('../../../src/models/questionBankMember.model');
    const member = await QuestionBankMember.create({
      bankId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      role: 'viewer',
      status: 'active',
    });
    expect(member.status).toBe('active');
  });

  it('should enforce enum role', async () => {
    const QuestionBankMember = require('../../../src/models/questionBankMember.model');
    await expect(
      QuestionBankMember.create({
        bankId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        role: 'hacker',
        status: 'active',
      })
    ).rejects.toThrow();
  });

  it('should enforce unique bankId + userId', async () => {
    const QuestionBankMember = require('../../../src/models/questionBankMember.model');
    const bankId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    await QuestionBankMember.create({ bankId, userId, role: 'owner', status: 'active' });
    await expect(
      QuestionBankMember.create({ bankId, userId, role: 'manager', status: 'active' })
    ).rejects.toThrow();
  });
});
