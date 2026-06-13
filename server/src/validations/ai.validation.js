const Joi = require('joi');

const id = Joi.object().keys({
  id: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
});

const generateQuestions = {
  body: Joi.object().keys({
    topicId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    count: Joi.number().min(1).max(50).default(5),
    difficulty: Joi.string().valid('easy', 'medium', 'hard'),
    requirements: Joi.string().min(10).required(),
    gradeLevel: Joi.number().min(1).max(12),
  }),
};

const chatWithAI = {
  body: Joi.object().keys({
    message: Joi.string().min(1).max(2000).required(),
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    context: Joi.object(),
  }),
};

const generateReport = {
  params: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
};

module.exports = {
  generateQuestions,
  chatWithAI,
  generateReport,
};
