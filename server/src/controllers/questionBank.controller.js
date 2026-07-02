const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const QuestionBankService = require('../services/questionBank.service');
const { QuestionBank, QuestionBankMember, User } = require('../models');

const createBank = catchAsync(async (req, res) => {
  const type = req.body.type || 'personal';

  if (req.user.role === 'teacher' && type !== 'personal') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Teachers can only create personal banks');
  }

  if (type === 'school' && req.user.role !== 'admin' && req.user.role !== 'school-admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới được tạo ngân hàng câu hỏi cho trường');
  }

  let schoolId = req.body.schoolId || null;
  if (type === 'school' && !schoolId) {
    schoolId = req.user.schoolId || null;
  }
  if (type === 'school' && !schoolId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'School banks require a schoolId or a user associated with a school');
  }

  const bank = await QuestionBankService.createBank({
    name: req.body.name,
    description: req.body.description,
    type,
    schoolId,
    createdBy: req.user.id,
  });
  res.status(httpStatus.CREATED).send(bank);
});

const listBanks = catchAsync(async (req, res) => {
  if (req.user.role === 'admin') {
    const banks = await QuestionBank.find()
      .select('name description type schoolId createdAt')
      .sort({ createdAt: -1 })
      .lean();
    return res.send(banks);
  }

  const queries = [
    QuestionBankService.listApprovedBanksForUser(req.user.id),
    QuestionBank.find({ createdBy: req.user.id }).lean(),
  ];

  if (req.user.role === 'school-admin' && req.user.schoolId) {
    queries.push(QuestionBank.find({ schoolId: req.user.schoolId }).lean());
  }

  const results = await Promise.all(queries);
  const approvedBanks = results[0];
  const ownedBanks = results[1];
  const schoolBanks = results[2] || [];

  const bankMap = new Map();
  [...approvedBanks, ...ownedBanks, ...schoolBanks].forEach((b) => {
    if (b && b._id) {
      bankMap.set(b._id.toString(), b);
    }
  });

  const banks = Array.from(bankMap.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.send(banks);
});

const listAllBanks = catchAsync(async (req, res) => {
  const { search, type, limit = 50, page = 1 } = req.query;

  const filter = {};

  if (req.user.role === 'school-admin' && req.user.schoolId) {
    filter.schoolId = req.user.schoolId;
  }

  if (type) {
    filter.type = type;
  }

  if (search) {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }],
    });
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [banks, total] = await Promise.all([
    QuestionBank.find(filter)
      .select('name description type schoolId createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean(),
    QuestionBank.countDocuments(filter),
  ]);

  res.send({
    results: banks,
    total,
    page: parseInt(page, 10),
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
});

const getBank = catchAsync(async (req, res) => {
  const bank = await QuestionBank.findById(req.params.bankId);
  if (!bank) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bank not found');
  }

  const membership = await QuestionBankMember.findOne({
    bankId: req.params.bankId,
    userId: req.user.id,
    status: 'active',
  }).lean();

  res.send({ bank, membership: membership || null });
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
  const member = await QuestionBankService.inviteMember(req.params.bankId, userId, req.user.id);
  res.status(httpStatus.CREATED).send(member);
});

const updateMember = catchAsync(async (req, res) => {
  const member = await QuestionBankService.setMemberRole(req.params.bankId, req.params.userId, req.body.role);
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
  const member = await QuestionBankService.requestAccess(req.params.bankId, req.user.id);
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
  await QuestionBankService.transferOwnership(req.params.bankId, req.user.id, req.body.toUserId);
  res.status(httpStatus.OK).send({ success: true });
});

module.exports = {
  createBank,
  listBanks,
  listAllBanks,
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
