const Joi = require('joi');

const id = Joi.object().keys({
  id: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
});

const optionSchema = Joi.object().keys({
  id: Joi.string().valid('A', 'B', 'C', 'D').required(),
  content: Joi.string().required(),
  isCorrect: Joi.boolean(),
});

const createQuestion = {
  body: Joi.object().keys({
    content: Joi.string().min(1).required(),
    type: Joi.string().valid('single_choice', 'multiple_choice').default('single_choice'),
    options: Joi.array().items(optionSchema).min(2).max(4).required(),
    score: Joi.number().min(0.5).max(10).default(1),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
    topicId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    explanation: Joi.string().allow('', null),
    imageUrl: Joi.string().uri().allow(null, ''),
    tags: Joi.array().items(Joi.string()),
    source: Joi.string().valid('ai', 'manual', 'imported').default('manual'),
    aiPrompt: Joi.string().allow(null, ''),
    bankId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null, ''),
  }),
};

const updateQuestion = {
  params: id,
  body: Joi.object().keys({
    content: Joi.string().min(1),
    type: Joi.string().valid('single_choice', 'multiple_choice'),
    options: Joi.array().items(optionSchema).min(2).max(4),
    score: Joi.number().min(0.5).max(10),
    difficulty: Joi.string().valid('easy', 'medium', 'hard'),
    topicId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    explanation: Joi.string().allow('', null),
    imageUrl: Joi.string().uri().allow(null, ''),
    tags: Joi.array().items(Joi.string()),
    isApproved: Joi.boolean(),
    bankId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null, ''),
  }),
};

const getQuestion = {
  params: id,
};

const getQuestions = {
  query: Joi.object().keys({
    topicId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    bankId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    difficulty: Joi.string(), // accepts single "easy" or comma-separated "easy,medium,hard"
    isApproved: Joi.string(), // accepts "true" or "false" as strings
    source: Joi.string().valid('ai', 'manual', 'imported'),
    tags: Joi.string(),
    search: Joi.string(),
    sortBy: Joi.string().valid('createdAt', 'difficulty', 'usageCount'),
    order: Joi.string().valid('asc', 'desc'),
    limit: Joi.number().min(1).max(100),
    page: Joi.number().min(1),
  }),
};

const generateQuestions = {
  body: Joi.object().keys({
    topicId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    count: Joi.number().min(1).max(50).default(5),
    difficulty: Joi.string().valid('easy', 'medium', 'hard'),
    requirements: Joi.string().allow(''),
    gradeLevel: Joi.number().min(1).max(12),
  }),
};

const generateSimilarQuestions = {
  body: Joi.object().keys({
    sourceQuestionIds: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).min(1).max(10).required(),
    count: Joi.number().min(1).max(50).default(5),
    difficulty: Joi.string().valid('easy', 'medium', 'hard'),
  }),
};

const getQuestionsByTags = {
  query: Joi.object().keys({
    tags: Joi.string().required().description('Comma-separated tags, e.g. "toan,pt-bac-2"'),
    difficulty: Joi.string().valid('easy', 'medium', 'hard'),
    limit: Joi.number().min(1).max(100).default(20),
    excludeIds: Joi.string().description('Comma-separated question IDs to exclude'),
  }),
};

const selectQuestionsForExam = {
  body: Joi.object().keys({
    questionIds: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).min(1).required(),
    title: Joi.string().min(1).required(),
    classIds: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).min(1).required(),
    subjectName: Joi.string().required(),
    examDate: Joi.date().required(),
    duration: Joi.number().min(5).max(300).default(45),
    totalScore: Joi.number().min(1).max(100).default(10),
    numberOfVersions: Joi.number().min(1).max(50).default(4),
    shuffleConfig: Joi.object().keys({
      shuffleQuestions: Joi.boolean().default(true),
      shuffleOptions: Joi.boolean().default(true),
    }),
  }),
};

module.exports = {
  createQuestion,
  updateQuestion,
  getQuestion,
  getQuestions,
  generateQuestions,
  generateSimilarQuestions,
  getQuestionsByTags,
  selectQuestionsForExam,
};
