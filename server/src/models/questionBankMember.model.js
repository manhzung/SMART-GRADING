const mongoose = require('mongoose');

const questionBankMemberSchema = new mongoose.Schema(
  {
    bankId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionBank', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['owner', 'manager', 'viewer'], default: 'viewer' },
    status: { type: String, enum: ['active', 'pending'], default: 'active' },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    invitedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

questionBankMemberSchema.index({ bankId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('QuestionBankMember', questionBankMemberSchema);
