const Joi = require('joi');

const id = Joi.object().keys({
  id: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
});

const name = Joi.string().min(2).max(100).trim();

const createSchool = {
  body: Joi.object().keys({
    name: name.required(),
    code: Joi.string().uppercase().min(2).max(20).trim().required(),
    address: Joi.object().keys({
      street: Joi.string().allow(''),
      ward: Joi.string().allow(''),
      district: Joi.string().allow(''),
      city: Joi.string().allow(''),
    }),
    phone: Joi.string().allow(null, ''),
    email: Joi.string().email().allow(null, ''),
    website: Joi.string().allow(null, ''),
    principalName: Joi.string().allow(null, ''),
    schoolType: Joi.string().valid('primary', 'secondary', 'high', 'university', 'other'),
    gradeLevels: Joi.array().items(Joi.number().min(1).max(12)),
    settings: Joi.object().keys({
      gradingScale: Joi.object().pattern(Joi.string(), Joi.number()),
      omrConfig: Joi.object().keys({
        bubbleSize: Joi.object().keys({ width: Joi.number(), height: Joi.number() }),
        marginTop: Joi.number(),
        marginBottom: Joi.number(),
        marginLeft: Joi.number(),
        marginRight: Joi.number(),
      }),
    }),
  }),
};

const updateSchool = {
  params: id,
  body: Joi.object().keys({
    name,
    address: Joi.object().keys({
      street: Joi.string().allow(''),
      ward: Joi.string().allow(''),
      district: Joi.string().allow(''),
      city: Joi.string().allow(''),
    }),
    phone: Joi.string().allow(null, ''),
    email: Joi.string().email().allow(null, ''),
    website: Joi.string().allow(null, ''),
    principalName: Joi.string().allow(null, ''),
    settings: Joi.object().keys({
      gradingScale: Joi.object().pattern(Joi.string(), Joi.number()),
      omrConfig: Joi.object().keys({
        bubbleSize: Joi.object().keys({ width: Joi.number(), height: Joi.number() }),
        marginTop: Joi.number(),
        marginBottom: Joi.number(),
        marginLeft: Joi.number(),
        marginRight: Joi.number(),
      }),
    }),
  }),
};

const getSchool = {
  params: id,
};

const getAvailableTeachers = {
  params: Joi.object().keys({
    schoolId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  query: Joi.object().keys({
    search: Joi.string().trim().max(100).allow(''),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

const deleteSchool = {
  params: id,
};

module.exports = {
  createSchool,
  updateSchool,
  getSchool,
  getAvailableTeachers,
  deleteSchool,
};
