const Joi = require('joi');

const id = Joi.object().keys({
  id: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
});

const scanSubmission = {
  body: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    classId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    // Cloudinary flow
    originalUrl: Joi.string().uri(),
    originalPublicId: Joi.string(),
    imageMeta: Joi.object().keys({
      width: Joi.number().integer().min(1),
      height: Joi.number().integer().min(1),
      bytes: Joi.number().integer().min(1),
      format: Joi.string().valid('jpg', 'jpeg', 'png', 'webp', 'heic'),
    }),
    // Legacy base64 flow (still allowed when UPLOAD_MODE=base64)
    image: Joi.string(),
    deviceInfo: Joi.object().keys({
      platform: Joi.string().valid('ios', 'android', 'web'),
      deviceModel: Joi.string(),
      appVersion: Joi.string(),
    }),
  }).or('originalUrl', 'image'),
};

const attachImage = {
  params: id,
  body: Joi.object().keys({
    type: Joi.string().valid('original', 'preprocessed', 'annotated').required(),
    url: Joi.string().uri().required(),
    publicId: Joi.string().required(),
    width: Joi.number().integer().min(1),
    height: Joi.number().integer().min(1),
    bytes: Joi.number().integer().min(1),
    format: Joi.string().valid('jpg', 'jpeg', 'png', 'webp', 'heic'),
  }),
};

const deleteImage = {
  params: Joi.object().keys({
    id: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    type: Joi.string().valid('original', 'preprocessed', 'annotated').required(),
  }),
};

const getUploadSignature = {
  query: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    submissionId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    type: Joi.string().valid('original', 'preprocessed', 'annotated').required(),
  }),
};

const getSubmission = { params: id };

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

const updateAnswers = {
  params: id,
  body: Joi.object().keys({
    answers: Joi.object().pattern(Joi.string(), Joi.string().valid('A', 'B', 'C', 'D')).required(),
  }),
};

const deleteSubmission = { params: id };

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

const getMySubmissions = {
  query: Joi.object().keys({
    status: Joi.string().valid('pending', 'scanning', 'scanned', 'manual_review', 'completed', 'appealed'),
    limit: Joi.number().min(1).max(100),
    page: Joi.number().min(1),
  }),
};

module.exports = {
  scanSubmission,
  attachImage,
  deleteImage,
  getUploadSignature,
  getSubmission,
  getSubmissions,
  getExamSubmissions,
  manualOverride,
  updateAnswers,
  deleteSubmission,
  getStudentSubmissions,
  getMySubmissions,
};
