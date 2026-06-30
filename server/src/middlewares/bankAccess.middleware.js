const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { QuestionBankMember } = require('../models');

const checkBankAccess = async (req, res, next) => {
  const bankId = req.params?.bankId;
  const userId = req.user?.id;

  if (!bankId || !mongoose.Types.ObjectId.isValid(bankId)) {
    return res.status(httpStatus.BAD_REQUEST).json({
      message: 'Valid bankId is required',
    });
  }

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(httpStatus.UNAUTHORIZED).json({
      message: 'Authentication required',
    });
  }

  const member = await QuestionBankMember.findOne({
    bankId,
    userId,
    status: 'active',
  });

  if (!member) {
    return res.status(httpStatus.FORBIDDEN).json({
      message: 'You do not have access to this question bank',
    });
  }

  return next();
};

module.exports = {
  checkBankAccess,
};
