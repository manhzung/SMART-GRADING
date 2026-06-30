const { QuestionBank, QuestionBankMember } = require('../models');
const ApiError = require('../utils/ApiError');

class QuestionBankService {
  async createBank({ name, description, type, schoolId, createdBy }) {
    const bank = await QuestionBank.create({ name, description, type, schoolId, createdBy });
    await QuestionBankMember.create({ bankId: bank._id, userId: createdBy, role: 'owner', status: 'active' });
    return bank;
  }

  async inviteMember(bankId, userId, invitedBy) {
    const exists = await QuestionBankMember.findOne({ bankId, userId, status: 'active' });
    if (exists) {
      throw new ApiError(400, 'User is already a member');
    }

    const member = await QuestionBankMember.create({ bankId, userId, role: 'viewer', status: 'pending', invitedBy });
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
}

module.exports = new QuestionBankService();
