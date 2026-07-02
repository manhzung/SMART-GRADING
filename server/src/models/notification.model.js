const mongoose = require('mongoose');

const notificationDataSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
  },
  submissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
  },
  appealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appeal',
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
  },
  bankId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionBank',
  },
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  role: String,
}, { strict: false });

const notificationSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'exam_published',
        'exam_reminder',
        'score_available',
        'appeal_submitted',
        'appeal_resolved',
        'ai_report_ready',
        'system',
        'bank_request_submitted',
        'bank_request_approved',
        'bank_request_rejected',
        'bank_member_added',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      default: '',
    },
    data: notificationDataSchema,
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    channels: [
      {
        type: String,
        enum: ['in_app', 'email', 'push'],
        default: ['in_app'],
      },
    ],
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    expiresAt: Date,
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

notificationSchema.methods.markAsRead = async function () {
  this.isRead = true;
  this.readAt = new Date();
  await this.save();
};

notificationSchema.methods.sendEmail = async function () {
  if (!this.channels.includes('email')) {
    this.channels.push('email');
    await this.save();
  }
  return this;
};

notificationSchema.methods.sendPush = async function () {
  if (!this.channels.includes('push')) {
    this.channels.push('push');
    await this.save();
  }
  return this;
};

notificationSchema.statics.createForUser = async function (
  userId,
  type,
  title,
  body,
  data = {},
  options = {}
) {
  const notification = new this({
    userId,
    type,
    title,
    body,
    data,
    priority: options.priority || 'normal',
    channels: options.channels || ['in_app'],
    expiresAt: options.expiresAt,
  });
  await notification.save();
  return notification;
};

notificationSchema.statics.createBulk = async function (notifications) {
  return this.insertMany(notifications);
};

notificationSchema.statics.findUnreadByUser = async function (userId, limit = 50) {
  return this.find({
    userId,
    isRead: false,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({
    userId,
    isRead: false,
    isDeleted: false,
  });
};

notificationSchema.statics.markAllAsRead = async function (userId) {
  return this.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

notificationSchema.statics.cleanupOld = async function (daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true,
  });
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
