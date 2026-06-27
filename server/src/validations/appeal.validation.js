const Joi = require('joi');

const id = Joi.object().keys({
  id: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
});

const createAppeal = {
  body: Joi.object().keys({
    submissionId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    questionId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    questionPosition: Joi.number().min(1).required(),
    reason: Joi.string().min(10).max(1000).required(),
    evidenceImageUrl: Joi.string().uri().allow(null, ''),
  }),
};

const reviewAppeal = {
  params: id,
  body: Joi.object().keys({
    decision: Joi.string().valid('approved', 'rejected').required(),
    note: Joi.string().max(1000),
  }),
};

const getAppeal = {
  params: id,
};

const getAppeals = {
  query: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    submissionId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    status: Joi.string().valid('pending', 'under_review', 'approved', 'rejected'),
    studentId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    limit: Joi.number().min(1).max(100),
    page: Joi.number().min(1),
  }),
};

const getStudentAppeals = {
  params: Joi.object().keys({
    studentId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  query: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    status: Joi.string().valid('pending', 'under_review', 'approved', 'rejected'),
  }),
};

const getExamAppeals = {
  params: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  query: Joi.object().keys({
    status: Joi.string().valid('pending', 'under_review', 'approved', 'rejected'),
  }),
};

const getMyAppeals = {
  query: Joi.object().keys({
    submissionId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    status: Joi.string().valid('pending', 'under_review', 'approved', 'rejected'),
    limit: Joi.number().min(1).max(100),
    page: Joi.number().min(1),
  }),
};

module.exports = {
  createAppeal,
  reviewAppeal,
  getAppeal,
  getAppeals,
  getStudentAppeals,
  getExamAppeals,
  getMyAppeals,
};
