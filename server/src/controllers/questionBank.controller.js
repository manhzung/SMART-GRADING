const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const QuestionBankService = require('../services/questionBank.service');
const { QuestionBank, QuestionBankMember, User } = require('../models');

const createBank = catchAsync(async (req, res) => {
  const bank = await QuestionBankService.createBank({
    name: req.body.name,
    description: req.body.description,
    type: req.body.type || 'personal',
    schoolId: req.body.schoolId || null,
    createdBy: req.user.id,
  });
  res.status(httpStatus.CREATED).send(bank);
});

const listBanks = catchAsync(async (req, res) => {
  const banks = await QuestionBankService.listBanksForUser(req.user.id);
  res.send(banks);
});

const getBank = catchAsync(async (req, res) => {
  const bank = await QuestionBank.findById(req.params.bankId);
  if (!bank) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bank not found');
  }
  res.send(bank);
});

const listMembers = catchAsync(async (req, res) => {
  const members = await QuestionBankService.listMembers(req.params.bankId, {
    status: req.query.status,
  });
  res.send(members);
});

const inviteMember = catchAsync(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'userId is required');
  }
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  const member = await QuestionBankService.inviteMember(
    req.params.bankId,
    userId,
    req.user.id
  );
  res.status(httpStatus.CREATED).send(member);
});

const updateMember = catchAsync(async (req, res) => {
  const member = await QuestionBankService.setMemberRole(
    req.params.bankId,
    req.params.userId,
    req.body.role
  );
  res.send(member);
});

const removeMember = catchAsync(async (req, res) => {
  await QuestionBankService.removeMember(req.params.bankId, req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

const leaveBank = catchAsync(async (req, res) => {
  await QuestionBankService.leaveBank(req.params.bankId, req.user.id);
  res.status(httpStatus.NO_CONTENT).send();
});

const requestAccess = catchAsync(async (req, res) => {
  const member = await QuestionBankService.requestAccess(
    req.params.bankId,
    req.user.id
  );
  res.status(httpStatus.CREATED).send(member);
});

const listPending = catchAsync(async (req, res) => {
  const pending = await QuestionBankMember.find({
    bankId: req.params.bankId,
    status: 'pending',
  }).populate('userId', 'name email role');
  res.send(pending);
});

const respondRequest = catchAsync(async (req, res) => {
  const result = await QuestionBankService.respondToRequest(
    req.params.bankId,
    req.params.userId,
    req.body.decision,
    req.user.id
  );
  res.send(result);
});

const transferOwnership = catchAsync(async (req, res) => {
  await QuestionBankService.transferOwnership(
    req.params.bankId,
    req.user.id,
    req.body.toUserId
  );
  res.status(httpStatus.OK).send({ success: true });
});

module.exports = {
  createBank,
  listBanks,
  getBank,
  listMembers,
  inviteMember,
  updateMember,
  removeMember,
  leaveBank,
  requestAccess,
  listPending,
  respondRequest,
  transferOwnership,
};
