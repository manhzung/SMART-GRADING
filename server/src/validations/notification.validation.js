const Joi = require('joi');

const id = Joi.object().keys({
  id: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
});

const createNotification = {
  body: Joi.object().keys({
    userId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    type: Joi.string().valid(
      'exam_published', 'exam_reminder', 'score_available',
      'appeal_submitted', 'appeal_resolved', 'ai_report_ready', 'system'
    ).required(),
    title: Joi.string().min(1).max(200).required(),
    body: Joi.string().max(1000),
    data: Joi.object(),
    channels: Joi.array().items(Joi.string().valid('in_app', 'email', 'push')),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent'),
  }),
};

const getNotifications = {
  query: Joi.object().keys({
    isRead: Joi.boolean(),
    type: Joi.string(),
    limit: Joi.number().min(1).max(100),
    page: Joi.number().min(1),
  }),
};

const markAsRead = {
  params: id,
};

const markAllAsRead = {};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
};
