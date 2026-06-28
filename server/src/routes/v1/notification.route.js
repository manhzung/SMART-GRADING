const express = require('express');
const validate = require('../../middlewares/validate');
const notificationValidation = require('../../validations/notification.validation');
const notificationController = require('../../controllers/notification.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router
  .route('/')
  .get(auth(), validate(notificationValidation.getNotifications), notificationController.getAll);

router
  .route('/unread-count')
  .get(auth(), notificationController.getUnreadCount);

router
  .route('/read-all')
  .patch(auth(), notificationController.markAllAsRead)
  .post(auth(), notificationController.markAllAsRead);

router
  .route('/:id/read')
  .post(auth(), validate(notificationValidation.markAsRead), notificationController.markAsRead);

router
  .route('/:id')
  .patch(auth(), validate(notificationValidation.markAsRead), notificationController.markAsRead)
  .delete(auth(), notificationController.remove);

module.exports = router;
