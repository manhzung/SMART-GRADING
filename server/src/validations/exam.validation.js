const Joi = require('joi');

const id = Joi.object().keys({
  id: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
});

const createExam = {
  body: Joi.object().keys({
    title: Joi.string().min(3).max(200).trim().required(),
    description: Joi.string().allow(''),
    subjectId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    subjectName: Joi.string().allow(''),
    classIds: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).min(1).required(),
    primaryClassId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    omrTemplateId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    examDate: Joi.date().iso().required(),
    startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).default('07:00'),
    duration: Joi.number().min(5).max(300).required(),
    totalScore: Joi.number().min(1).required(),
    passingScore: Joi.number().min(0).default(5),
    numberOfQuestions: Joi.number().min(1).required(),
    numberOfVersions: Joi.number().min(1).max(50).default(4),
    questionIds: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).min(1),
    printConfig: Joi.object().keys({
      paperSize: Joi.string().valid('A4', 'A5'),
      questionsPerPage: Joi.number().min(1).max(10),
      includeAnswerSheet: Joi.boolean(),
      schoolHeader: Joi.boolean(),
    }),
    shuffleConfig: Joi.object().keys({
      shuffleQuestions: Joi.boolean(),
      shuffleOptions: Joi.boolean(),
    }),
  }),
};

const updateExam = {
  params: id,
  body: Joi.object().keys({
    title: Joi.string().min(3).max(200).trim(),
    description: Joi.string().allow(''),
    subjectId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    subjectName: Joi.string().allow(''),
    examDate: Joi.date().iso(),
    startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
    duration: Joi.number().min(5).max(300),
    passingScore: Joi.number().min(0),
    totalScore: Joi.number().min(1),
    numberOfQuestions: Joi.number().min(1),
    numberOfVersions: Joi.number().min(1).max(50),
    primaryClassId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    questionIds: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).min(1),
    status: Joi.string().valid('draft', 'published', 'in_progress', 'completed', 'archived'),
    shuffleConfig: Joi.object().keys({
      shuffleQuestions: Joi.boolean(),
      shuffleOptions: Joi.boolean(),
    }),
    printConfig: Joi.object().keys({
      paperSize: Joi.string().valid('A4', 'A5'),
      questionsPerPage: Joi.number().min(1).max(10),
      includeAnswerSheet: Joi.boolean(),
      schoolHeader: Joi.boolean(),
    }),
  }),
};

const addClassesToExam = {
  params: id,
  body: Joi.object().keys({
    classIds: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).min(1).required(),
  }),
};

const removeClassesFromExam = {
  params: id,
  body: Joi.object().keys({
    classIds: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).min(1).required(),
  }),
};

const publishExam = {
  params: id,
};

const getExam = {
  params: id,
};

const getExams = {
  query: Joi.object().keys({
    classId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    subjectId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    status: Joi.string().valid('draft', 'published', 'in_progress', 'completed', 'archived'),
    fromDate: Joi.date().iso(),
    toDate: Joi.date().iso(),
    search: Joi.string().min(1).max(200),
    sortBy: Joi.string().valid('examDate', 'createdAt'),
    order: Joi.string().valid('asc', 'desc'),
    limit: Joi.number().min(1).max(100),
    page: Joi.number().min(1),
  }),
};

const getExamVersions = {
  params: id,
};

const generateVersions = {
  params: id,
  body: Joi.object().keys({
    count: Joi.number().min(1).max(50).default(4),
  }),
};

const exportExam = {
  params: id,
  query: Joi.object().keys({
    format: Joi.string().valid('pdf', 'excel').default('pdf'),
  }),
};

const getUpcoming = {
  query: Joi.object().keys({
    limit: Joi.number().integer().min(1).max(10).default(5),
  }),
};

const validateGeneratePapers = {
  params: Joi.object({
    id: Joi.object().keys({ id: Joi.string().regex(/^[0-9a-fA-F]{24}$/) }),
  }),
  body: Joi.object({
    paperEngine: Joi.string().valid('pdfkit', 'amc', 'auto').default('auto'),
    forceRegenerate: Joi.boolean().default(false),
  }),
};

const getExamTemplate = {
  params: Joi.object({
    id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  }),
  query: Joi.object({
    versionCode: Joi.string().optional(),
  }),
};

module.exports = {
  createExam,
  updateExam,
  addClassesToExam,
  removeClassesFromExam,
  publishExam,
  getExam,
  getExams,
  getUpcoming,
  getExamVersions,
  generateVersions,
  exportExam,
  validateGeneratePapers,
  getExamTemplate,
};
