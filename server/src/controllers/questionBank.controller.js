const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const QuestionBankService = require('../services/questionBank.service');
const { QuestionBank } = require('../models');

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

const getBank = catchAsync(async (req, res) => {
  const bank = await QuestionBank.findById(req.params.bankId);
  if (!bank) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bank not found');
  }
  res.send(bank);
});

module.exports = {
  createBank,
  getBank,
};
