const Joi = require('joi');

const id = Joi.object().keys({
  id: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
});

const createOMRTemplate = {
  body: Joi.object().keys({
    name: Joi.string().min(2).max(100).trim().required(),
    code: Joi.string().uppercase().min(2).max(20).trim().required(),
    description: Joi.string().allow(''),
    pageConfig: Joi.object().keys({
      paperSize: Joi.string().valid('A4', 'A5', 'A3', 'custom'),
      customSize: Joi.object().keys({
        width: Joi.number(),
        height: Joi.number(),
      }),
      defaultDPI: Joi.number().default(300),
      margins: Joi.object().keys({
        top: Joi.number(),
        bottom: Joi.number(),
        left: Joi.number(),
        right: Joi.number(),
      }),
    }),
    zones: Joi.object(),
    scannerConfig: Joi.object().keys({
      orientation: Joi.string().valid('portrait', 'landscape'),
      binarizationThreshold: Joi.number().min(0).max(255),
      preprocessing: Joi.object().keys({
        deskew: Joi.boolean(),
        crop: Joi.boolean(),
        denoise: Joi.boolean(),
        contrastEnhance: Joi.boolean(),
      }),
    }),
    validationRules: Joi.object().keys({
      allowMultipleAnswers: Joi.boolean(),
      allowEmpty: Joi.boolean(),
      warnDoubleFill: Joi.boolean(),
      minIntensityWarning: Joi.number(),
    }),
    level: Joi.string().valid('system', 'school', 'custom'),
    isDefault: Joi.boolean(),
    tags: Joi.array().items(Joi.string()),
  }),
};

const updateOMRTemplate = {
  params: id,
  body: Joi.object().keys({
    name: Joi.string().min(2).max(100).trim(),
    description: Joi.string().allow(''),
    pageConfig: Joi.object(),
    zones: Joi.object(),
    scannerConfig: Joi.object(),
    validationRules: Joi.object(),
    isDefault: Joi.boolean(),
    tags: Joi.array().items(Joi.string()),
  }),
};

const getOMRTemplate = {
  params: id,
};

const getOMRTemplates = {
  query: Joi.object().keys({
    level: Joi.string().valid('system', 'school', 'custom'),
    isActive: Joi.boolean(),
    tags: Joi.string(),
    sortBy: Joi.string().valid('name', 'code', 'usageCount'),
    limit: Joi.number().min(1).max(100),
    page: Joi.number().min(1),
  }),
};

const generatePdf = {
  params: id,
  query: Joi.object().keys({
    examTitle: Joi.string().max(200),
    schoolName: Joi.string().allow('').max(200),
  }),
};

const generateVersionSheetsPdf = {
  params: id,
  body: Joi.object().keys({
    versions: Joi.array().items(Joi.string().max(20)).min(1).max(50).required(),
    examTitle: Joi.string().max(200),
    schoolName: Joi.string().allow('').max(200),
  }),
};

module.exports = {
  createOMRTemplate,
  updateOMRTemplate,
  getOMRTemplate,
  getOMRTemplates,
  generatePdf,
  generateVersionSheetsPdf,
};
