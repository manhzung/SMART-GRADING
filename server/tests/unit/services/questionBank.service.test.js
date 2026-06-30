const mongoose = require('mongoose');
const setupTestDB = require('../../utils/setupTestDB');
const QuestionBankService = require('../../../src/services/questionBank.service');
const { QuestionBank, QuestionBankMember, User } = require('../../../src/models');

setupTestDB();

describe('QuestionBank Service', () => {
  let service;
  let ownerId;
  let bankId;

  beforeEach(async () => {
    service = Object.create(QuestionBankService);
    ownerId = new mongoose.Types.ObjectId();
    bankId = new mongoose.Types.ObjectId();
    await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
  });

  it('adds owner as active member when creating bank', async () => {
    const newBank = await service.createBank({ name: 'New', type: 'personal', createdBy: ownerId });
    const member = await QuestionBankMember.findOne({ bankId: newBank._id, userId: ownerId });
    expect(member).toBeTruthy();
    expect(member.role).toBe('owner');
    expect(member.status).toBe('active');
  });

  it('throws when inviting user already active', async () => {
    const userId = new mongoose.Types.ObjectId();
    await QuestionBankMember.create({ bankId, userId, role: 'viewer', status: 'active' });
    await expect(service.inviteMember(bankId.toString(), userId.toString(), ownerId)).rejects.toThrow('already a member');
  });

  it('approves pending member', async () => {
    const userId = new mongoose.Types.ObjectId();
    await QuestionBankMember.create({ bankId, userId, role: 'viewer', status: 'pending' });
    await service.approveMember(bankId.toString(), userId.toString(), ownerId);
    const member = await QuestionBankMember.findOne({ bankId, userId });
    expect(member.status).toBe('active');
  });
});
