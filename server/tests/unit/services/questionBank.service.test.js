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
    await expect(service.inviteMember(bankId.toString(), userId.toString(), ownerId)).rejects.toThrow(
      /already an? active member/i
    );
  });

  it('approves pending member', async () => {
    const userId = new mongoose.Types.ObjectId();
    await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
    await QuestionBankMember.create({ bankId, userId, role: 'viewer', status: 'pending' });
    await service.approveMember(bankId.toString(), userId.toString(), ownerId);
    const member = await QuestionBankMember.findOne({ bankId, userId });
    expect(member.status).toBe('active');
  });

  describe('listMembers', () => {
    it('lists members filtered by status', async () => {
      const userIdA = new mongoose.Types.ObjectId();
      const userIdB = new mongoose.Types.ObjectId();
      await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
      await QuestionBankMember.insertMany([
        { bankId, userId: userIdA, role: 'manager', status: 'active' },
        { bankId, userId: userIdB, role: 'viewer', status: 'pending' },
      ]);

      const active = await service.listMembers(bankId.toString(), { status: 'active' });
      expect(active).toHaveLength(1);

      const all = await service.listMembers(bankId.toString(), {});
      expect(all).toHaveLength(2);
    });

    it('getMembership returns the document', async () => {
      await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
      await QuestionBankMember.create({ bankId, userId: ownerId, role: 'owner', status: 'active' });
      const m = await service.getMembership(bankId.toString(), ownerId.toString());
      expect(m.role).toBe('owner');
    });
  });

  describe('invite + setMemberRole', () => {
    it('invites a new user as pending viewer', async () => {
      const userId = new mongoose.Types.ObjectId();
      await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
      const member = await service.inviteMember(bankId.toString(), userId.toString(), ownerId);
      expect(member.status).toBe('pending');
      expect(member.role).toBe('viewer');
    });

    it('updates pending member to active manager', async () => {
      const userId = new mongoose.Types.ObjectId();
      await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
      await QuestionBankMember.create({ bankId, userId, role: 'viewer', status: 'pending' });
      const updated = await service.setMemberRole(bankId.toString(), userId.toString(), 'manager', ownerId);
      expect(updated.role).toBe('manager');
      expect(updated.status).toBe('active');
    });

    it('rejects promoting to owner via setMemberRole', async () => {
      const userId = new mongoose.Types.ObjectId();
      await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
      await QuestionBankMember.create({ bankId, userId, role: 'viewer', status: 'active' });
      await expect(service.setMemberRole(bankId.toString(), userId.toString(), 'owner', ownerId)).rejects.toThrow(
        /Cannot promote via setMemberRole/i
      );
    });
  });

  describe('removeMember + leaveBank', () => {
    it('removes a member', async () => {
      const userId = new mongoose.Types.ObjectId();
      await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
      await QuestionBankMember.create({ bankId, userId, role: 'viewer', status: 'active' });
      await service.removeMember(bankId.toString(), userId.toString());
      const m = await QuestionBankMember.findOne({ bankId, userId });
      expect(m).toBeNull();
    });

    it('throws when owner tries to leave', async () => {
      await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
      await QuestionBankMember.create({ bankId, userId: ownerId, role: 'owner', status: 'active' });
      await expect(service.leaveBank(bankId.toString(), ownerId.toString())).rejects.toThrow(/transfer ownership/i);
    });

    it('non-owner can leave', async () => {
      const userId = new mongoose.Types.ObjectId();
      await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
      await QuestionBankMember.create({ bankId, userId, role: 'manager', status: 'active' });
      await service.leaveBank(bankId.toString(), userId.toString());
      const m = await QuestionBankMember.findOne({ bankId, userId });
      expect(m).toBeNull();
    });
  });

  describe('requestAccess + respondToRequest', () => {
    it('creates a pending request', async () => {
      const requester = new mongoose.Types.ObjectId();
      await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
      const req = await service.requestAccess(bankId.toString(), requester.toString());
      expect(req.status).toBe('pending');
    });

    it('throws when active member requests access again', async () => {
      await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
      await QuestionBankMember.create({ bankId, userId: ownerId, role: 'owner', status: 'active' });
      await expect(service.requestAccess(bankId.toString(), ownerId.toString())).rejects.toThrow(
        /already an? active member/i
      );
    });

    it('approves pending request', async () => {
      const requester = new mongoose.Types.ObjectId();
      await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
      await QuestionBankMember.create({ bankId, userId: requester, role: 'viewer', status: 'pending' });
      const result = await service.respondToRequest(bankId.toString(), requester.toString(), 'approve', ownerId.toString());
      expect(result.status).toBe('active');
    });

    it('rejects pending request (removes it)', async () => {
      const requester = new mongoose.Types.ObjectId();
      await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
      await QuestionBankMember.create({ bankId, userId: requester, role: 'viewer', status: 'pending' });
      await service.respondToRequest(bankId.toString(), requester.toString(), 'reject', ownerId.toString());
      const m = await QuestionBankMember.findOne({ bankId, userId: requester });
      expect(m).toBeNull();
    });
  });

  describe('transferOwnership', () => {
    it('transfers ownership to another active member', async () => {
      const targetId = new mongoose.Types.ObjectId();
      await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
      await QuestionBankMember.insertMany([
        { bankId, userId: ownerId, role: 'owner', status: 'active' },
        { bankId, userId: targetId, role: 'manager', status: 'active' },
      ]);
      await service.transferOwnership(bankId.toString(), ownerId.toString(), targetId.toString());
      const oldOwner = await QuestionBankMember.findOne({ bankId, userId: ownerId });
      const newOwner = await QuestionBankMember.findOne({ bankId, userId: targetId });
      expect(oldOwner.role).toBe('manager');
      expect(newOwner.role).toBe('owner');
    });

    it('rejects transfer when target not active', async () => {
      const targetId = new mongoose.Types.ObjectId();
      await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
      await QuestionBankMember.insertMany([
        { bankId, userId: ownerId, role: 'owner', status: 'active' },
        { bankId, userId: targetId, role: 'viewer', status: 'pending' },
      ]);
      await expect(service.transferOwnership(bankId.toString(), ownerId.toString(), targetId.toString())).rejects.toThrow(
        /Target must be an? active member/i
      );
    });
  });

  describe('school bank constraints', () => {
    it('rejects school bank without any school-admin owner', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const schoolAdminId = new mongoose.Types.ObjectId();
      await QuestionBank.create({
        _id: bankId,
        name: 'SchoolBank',
        type: 'school',
        schoolId,
        createdBy: ownerId,
      });
      await QuestionBankMember.create({ bankId, userId: ownerId, role: 'owner', status: 'active' });
      await expect(
        service.ensureSchoolBankHasAdmin(bankId.toString(), [{ userId: schoolAdminId, role: 'school-admin' }])
      ).rejects.toThrow(/at least one school admin/i);
    });

    it('passes when school bank has a school-admin owner', async () => {
      const schoolAdminId = new mongoose.Types.ObjectId();
      await QuestionBank.create({
        _id: bankId,
        name: 'SchoolBank',
        type: 'school',
        schoolId: new mongoose.Types.ObjectId(),
        createdBy: ownerId,
      });
      await QuestionBankMember.create({ bankId, userId: ownerId, role: 'owner', status: 'active' });
      await QuestionBankMember.create({ bankId, userId: schoolAdminId, role: 'owner', status: 'active' });
      await expect(
        service.ensureSchoolBankHasAdmin(bankId.toString(), [{ userId: schoolAdminId, role: 'school-admin' }])
      ).resolves.toBeUndefined();
    });
  });

  describe('listBanksForUser', () => {
    it('returns only banks the user is active in', async () => {
      const bankIdA = new mongoose.Types.ObjectId();
      const bankIdB = new mongoose.Types.ObjectId();
      const bankIdC = new mongoose.Types.ObjectId();
      await QuestionBank.insertMany([
        { _id: bankIdA, name: 'A', createdBy: ownerId },
        { _id: bankIdB, name: 'B', createdBy: ownerId },
        { _id: bankIdC, name: 'C', createdBy: ownerId },
      ]);
      await QuestionBankMember.insertMany([
        { bankId: bankIdA, userId: ownerId, role: 'owner', status: 'active' },
        { bankId: bankIdB, userId: ownerId, role: 'manager', status: 'active' },
        { bankId: bankIdC, userId: ownerId, role: 'viewer', status: 'pending' },
      ]);
      const banks = await service.listBanksForUser(ownerId.toString());
      const ids = banks.map((b) => b._id.toString()).sort();
      expect(ids).toEqual([bankIdA.toString(), bankIdB.toString()].sort());
    });
  });

  describe('listApprovedBanksForUser', () => {
    it('returns only active membership banks and ignores pending', async () => {
      const userId = new mongoose.Types.ObjectId();
      const bankIdA = new mongoose.Types.ObjectId();
      const bankIdB = new mongoose.Types.ObjectId();
      const bankIdC = new mongoose.Types.ObjectId();
      await QuestionBank.insertMany([
        { _id: bankIdA, name: 'Approved A', createdBy: ownerId },
        { _id: bankIdB, name: 'Approved B', createdBy: ownerId },
        { _id: bankIdC, name: 'Pending C', createdBy: ownerId },
      ]);
      await QuestionBankMember.insertMany([
        { bankId: bankIdA, userId, role: 'owner', status: 'active' },
        { bankId: bankIdB, userId, role: 'viewer', status: 'active' },
        { bankId: bankIdC, userId, role: 'viewer', status: 'pending' },
      ]);

      const banks = await service.listApprovedBanksForUser(userId.toString());
      const ids = banks.map((bank) => bank._id.toString()).sort();
      expect(ids).toEqual([bankIdA.toString(), bankIdB.toString()].sort());
    });

    it('returns empty array when user has no active membership', async () => {
      const userId = new mongoose.Types.ObjectId();
      const banks = await service.listApprovedBanksForUser(userId.toString());
      expect(banks).toEqual([]);
    });
  });
});
