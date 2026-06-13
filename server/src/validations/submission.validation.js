const Joi = require('joi');

const id = Joi.object().keys({
  id: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
});

const scanSubmission = {
  body: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    image: Joi.string().required(), // Base64 encoded image
    deviceInfo: Joi.object().keys({
      platform: Joi.string().valid('ios', 'android', 'web'),
      deviceModel: Joi.string(),
      appVersion: Joi.string(),
    }),
  }),
};

const getSubmission = {
  params: id,
};

const getSubmissions = {
  query: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    studentId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    versionId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    status: Joi.string().valid('pending', 'scanning', 'scanned', 'manual_review', 'completed', 'appealed'),
    fromDate: Joi.date().iso(),
    toDate: Joi.date().iso(),
    limit: Joi.number().min(1).max(100),
    page: Joi.number().min(1),
  }),
};

const getExamSubmissions = {
  params: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  query: Joi.object().keys({
    status: Joi.string().valid('pending', 'scanning', 'scanned', 'manual_review', 'completed', 'appealed'),
    limit: Joi.number().min(1).max(100),
    page: Joi.number().min(1),
  }),
};

const manualOverride = {
  params: id,
  body: Joi.object().keys({
    position: Joi.number().min(1).required(),
    correctedAnswer: Joi.string().valid('A', 'B', 'C', 'D').required(),
    reason: Joi.string().min(1).max(500).required(),
  }),
};

const deleteSubmission = {
  params: id,
};

const getStudentSubmissions = {
  params: Joi.object().keys({
    studentId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  query: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    limit: Joi.number().min(1).max(100),
    page: Joi.number().min(1),
  }),
};

module.exports = {
  scanSubmission,
  getSubmission,
  getSubmissions,
  getExamSubmissions,
  manualOverride,
  deleteSubmission,
  getStudentSubmissions,
};
