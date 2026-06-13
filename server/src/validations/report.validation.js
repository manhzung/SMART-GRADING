const Joi = require('joi');

const id = Joi.object().keys({
  id: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
});

const generateExamReport = {
  params: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
};

const getExamReport = {
  params: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
};

const exportExamReport = {
  params: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  query: Joi.object().keys({
    format: Joi.string().valid('pdf', 'excel').default('pdf'),
  }),
};

const getStudentProgress = {
  params: Joi.object().keys({
    studentId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
};

const getProgressHistory = {
  params: Joi.object().keys({
    studentId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  query: Joi.object().keys({
    fromDate: Joi.date().iso(),
    toDate: Joi.date().iso(),
    limit: Joi.number().min(1).max(50),
  }),
};

const getClassLeaderboard = {
  params: Joi.object().keys({
    classId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  query: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    limit: Joi.number().min(1).max(100).default(10),
  }),
};

module.exports = {
  generateExamReport,
  getExamReport,
  exportExamReport,
  getStudentProgress,
  getProgressHistory,
  getClassLeaderboard,
};
