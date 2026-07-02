const httpStatus = require('http-status');
const { QuestionBankMember, QuestionBank } = require('../models');
const ApiError = require('../utils/ApiError');

const checkBankAccess = async (req, res, next) => {
  try {
    const { bankId } = req.params;
    const userId = req.user && req.user.id;

    if (!userId) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized'));
    }

    // Admin has access to all banks
    if (req.user.role === 'admin') {
      return next();
    }

    const bank = await QuestionBank.findById(bankId);
    if (
      bank &&
      req.user.role === 'school-admin' &&
      bank.schoolId &&
      req.user.schoolId &&
      bank.schoolId.toString() === req.user.schoolId.toString()
    ) {
      req.membership = { role: 'owner', status: 'active' };
      return next();
    }

    const membership = await QuestionBankMember.findOne({
      bankId,
      userId,
      status: 'active',
    });

    if (!membership) {
      return next(new ApiError(httpStatus.FORBIDDEN, 'You do not have access to this bank'));
    }

    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
};

const requireBankRole = (roles) => async (req, res, next) => {
  if (!req.membership || !roles.includes(req.membership.role)) {
    return next(new ApiError(httpStatus.FORBIDDEN, 'Insufficient bank permissions'));
  }
  next();
};

module.exports = { checkBankAccess, requireBankRole };
