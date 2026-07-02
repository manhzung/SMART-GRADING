const httpStatus = require('http-status');
const { Notification } = require('../models');
const catchAsync = require('../utils/catchAsync');

const getAll = catchAsync(async (req, res) => {
  const { isRead, type, page = 1, limit = 20 } = req.query;
  const filter = { userId: req.user.id, isDeleted: false };
  if (isRead !== undefined) filter.isRead = isRead;
  if (type) filter.type = type;

  const skip = (page - 1) * limit;
  const [results, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  res.send({ results, page, limit, total, pages: Math.ceil(total / limit) });
});

const markAsRead = catchAsync(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  if (!notification) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Notification not found' });
  }
  res.send(notification);
});

const markAllAsRead = catchAsync(async (req, res) => {
  await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true, readAt: new Date() });
  res.status(httpStatus.NO_CONTENT).send();
});

const getUnreadCount = catchAsync(async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user.id, isRead: false });
  res.send({ unreadCount: count });
});

const remove = catchAsync(async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: true });
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  getAll,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  remove,
};
