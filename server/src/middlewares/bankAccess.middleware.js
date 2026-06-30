const httpStatus = require('http-status');
const { QuestionBankMember } = require('../models');
const ApiError = require('../utils/ApiError');

const checkBankAccess = async (req, res, next) => {
  const { bankId } = req.params;
  const userId = req.user && req.user.id;

  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  const membership = await QuestionBankMember.findOne({
    bankId,
    userId,
    status: 'active',
  });

  if (!membership) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to this bank');
  }

  req.membership = membership;
  next();
};

const requireBankRole = (roles) => async (req, res, next) => {
  if (!req.membership || !roles.includes(req.membership.role)) {
    return next(new ApiError(httpStatus.FORBIDDEN, 'Insufficient bank permissions'));
  }
  next();
};

module.exports = { checkBankAccess, requireBankRole };
