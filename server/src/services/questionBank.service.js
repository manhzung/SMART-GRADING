const { QuestionBank, QuestionBankMember, User } = require('../models');
const ApiError = require('../utils/ApiError');
const notificationService = require('./notification.service');

class QuestionBankService {
  async createBank({ _id, name, description, type, schoolId, createdBy }) {
    const payload = { name, description, type, schoolId, createdBy };
    if (_id) payload._id = _id;

    const bank = await QuestionBank.create(payload);
    await QuestionBankMember.create({
      bankId: bank._id,
      userId: createdBy,
      role: 'owner',
      status: 'active',
    });
    return bank;
  }

  async inviteMember(bankId, userId, invitedBy) {
    const exists = await QuestionBankMember.findOne({ bankId, userId, status: 'active' });
    if (exists) {
      throw new ApiError(400, 'User is already an active member');
    }

    const member = await QuestionBankMember.create({
      bankId,
      userId,
      role: 'viewer',
      status: 'pending',
      invitedBy,
      invitedAt: new Date(),
    });

    try {
      const bank = await QuestionBank.findById(bankId).select('name').lean();
      await notificationService.notifyBankMemberAdded({
        bankId,
        bankName: bank?.name || 'Bank',
        userId,
        role: 'viewer',
      });
    } catch (err) {
      // Notifications are best-effort
    }

    return member;
  }

  async approveMember(bankId, userId, approvedBy) {
    const member = await QuestionBankMember.findOne({ bankId, userId, status: 'pending' });
    if (!member) {
      throw new ApiError(404, 'Pending member not found');
    }

    member.status = 'active';
    member.approvedBy = approvedBy;
    member.approvedAt = new Date();
    await member.save();
    return member;
  }

  async listMembers(bankId, { status } = {}) {
    const filter = { bankId };
    if (status) filter.status = status;
    return QuestionBankMember.find(filter).populate('userId', 'name email role schoolId').lean();
  }

  async getMembership(bankId, userId) {
    return QuestionBankMember.findOne({ bankId, userId }).lean();
  }

  async setMemberRole(bankId, userId, role) {
    if (role === 'owner') {
      throw new ApiError(400, 'Cannot promote via setMemberRole');
    }
    const member = await QuestionBankMember.findOne({ bankId, userId });
    if (!member) {
      throw new ApiError(404, 'Member not found');
    }
    member.role = role;
    if (member.status === 'pending') member.status = 'active';
    await member.save();
    return member;
  }

  async removeMember(bankId, userId) {
    const result = await QuestionBankMember.deleteOne({ bankId, userId });
    if (result.deletedCount === 0) {
      throw new ApiError(404, 'Member not found');
    }
    return true;
  }

  async leaveBank(bankId, userId) {
    const member = await QuestionBankMember.findOne({ bankId, userId });
    if (!member) {
      throw new ApiError(404, 'Member not found');
    }
    if (member.role === 'owner') {
      throw new ApiError(400, 'Owner must transfer ownership before leaving');
    }
    await QuestionBankMember.deleteOne({ _id: member._id });
    return true;
  }

  async requestAccess(bankId, userId) {
    const existing = await QuestionBankMember.findOne({ bankId, userId });
    if (existing && existing.status === 'active') {
      throw new ApiError(400, 'User is already an active member');
    }

    let member;
    if (existing) {
      member = existing;
    } else {
      member = await QuestionBankMember.create({
        bankId,
        userId,
        role: 'viewer',
        status: 'pending',
      });
    }

    // Best-effort: notify all owners/managers of the bank about the request
    try {
      const bank = await QuestionBank.findById(bankId).select('name').lean();
      const owners = await QuestionBankMember.find({ bankId, role: 'owner', status: 'active' }).lean();
      const requester = await User.findById(userId).select('name').lean();
      await Promise.all(
        owners.map((o) =>
          notificationService.notifyBankRequestSubmitted({
            bankId,
            bankName: bank?.name || 'Bank',
            requesterName: requester?.name || 'A user',
            ownerId: o.userId,
            requesterId: userId,
          })
        )
      );
    } catch (err) {
      // Notifications are best-effort
    }

    return member;
  }

  async respondToRequest(bankId, userId, decision, approverId) {
    const member = await QuestionBankMember.findOne({ bankId, userId, status: 'pending' });
    if (!member) {
      throw new ApiError(404, 'Pending request not found');
    }

    try {
      const bank = await QuestionBank.findById(bankId).select('name').lean();
      const bankName = bank?.name || 'Bank';

      if (decision === 'approve') {
        member.status = 'active';
        member.approvedBy = approverId;
        member.approvedAt = new Date();
        await member.save();
        await notificationService.notifyBankRequestApproved({
          bankId,
          bankName,
          userId,
        });
        return member;
      }

      if (decision === 'reject') {
        await QuestionBankMember.deleteOne({ _id: member._id });
        await notificationService.notifyBankRequestRejected({
          bankId,
          bankName,
          userId,
        });
        return { status: 'rejected' };
      }
    } catch (err) {
      // If notification fails, still throw original errors below
      if (err instanceof ApiError) throw err;
    }

    throw new ApiError(400, 'Invalid decision');
  }

  async transferOwnership(bankId, fromUserId, toUserId) {
    const target = await QuestionBankMember.findOne({
      bankId,
      userId: toUserId,
      status: 'active',
    });
    if (!target) {
      throw new ApiError(400, 'Target must be an active member');
    }

    const currentOwner = await QuestionBankMember.findOne({
      bankId,
      userId: fromUserId,
      role: 'owner',
    });
    if (!currentOwner) {
      throw new ApiError(403, 'Only current owner can transfer ownership');
    }

    currentOwner.role = 'manager';
    target.role = 'owner';
    await Promise.all([currentOwner.save(), target.save()]);
  }

  async ensureSchoolBankHasAdmin(bankId, candidateOwners) {
    const bank = await QuestionBank.findById(bankId);
    if (!bank) {
      throw new ApiError(404, 'Bank not found');
    }
    if (bank.type !== 'school') return;

    const owners = await QuestionBankMember.find({ bankId, role: 'owner', status: 'active' });
    const ownerIds = new Set(owners.map((o) => o.userId.toString()));
    const hasAdmin = candidateOwners.some(
      (c) => c.role === 'school-admin' && ownerIds.has(c.userId.toString())
    );

    if (!hasAdmin) {
      throw new ApiError(400, 'School bank must have at least one school admin owner');
    }
  }

  async listBanksForUser(userId) {
    const memberships = await QuestionBankMember.find({
      userId,
      status: 'active',
    }).lean();
    const bankIds = memberships.map((m) => m.bankId);
    if (bankIds.length === 0) return [];
    return QuestionBank.find({ _id: { $in: bankIds } }).lean();
  }

  async listApprovedBanksForUser(userId) {
    return this.listBanksForUser(userId);
  }

  async listSchoolBanks(schoolId) {
    return QuestionBank.find({ schoolId }).lean();
  }
}

module.exports = new QuestionBankService();
