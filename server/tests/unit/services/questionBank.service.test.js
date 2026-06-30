const mongoose = require('mongoose');
const setupTestDB = require('../../utils/setupTestDB');

setupTestDB();

const QuestionBankService = require('../../../src/services/questionBank.service');
const { QuestionBank, QuestionBankMember } = require('../../../src/models');

describe('QuestionBank Service', () => {
  let service;
  let ownerId;
  let bankId;

  beforeEach(() => {
    service = Object.create(QuestionBankService);
    ownerId = new mongoose.Types.ObjectId();
    bankId = new mongoose.Types.ObjectId();
  });

  it('adds owner as active member when creating bank', async () => {
    const newBankId = new mongoose.Types.ObjectId();
    await service.createBank({ _id: newBankId, name: 'New', type: 'personal', createdBy: ownerId });
    const member = await QuestionBankMember.findOne({ bankId: newBankId, userId: ownerId });
    expect(member).toBeTruthy();
    expect(member.role).toBe('owner');
    expect(member.status).toBe('active');
  });

  it('throws when inviting user already active', async () => {
    const userId = new mongoose.Types.ObjectId();
    await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
    await QuestionBankMember.create({ bankId, userId, role: 'viewer', status: 'active' });
    await expect(
      service.inviteMember(bankId.toString(), userId.toString(), ownerId)
    ).rejects.toThrow(/already an? active member/i);
  });

  it('approves pending member', async () => {
    const userId = new mongoose.Types.ObjectId();
    await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
    await QuestionBankMember.create({ bankId, userId, role: 'viewer', status: 'pending' });
    await service.approveMember(bankId.toString(), userId.toString(), ownerId);
    const member = await QuestionBankMember.findOne({ bankId, userId });
    expect(member.status).toBe('active');
  });
});
