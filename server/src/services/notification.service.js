const { Notification, User, Exam, Submission } = require('../models');

class NotificationService {
  /**
   * Notify students when an exam is published
   * @param {string} examId - The published exam ID
   * @param {string[]} studentIds - Array of student user IDs
   * @param {string} examTitle - Exam title for notification body
   * @param {Date} examDate - Exam date for notification body
   */
  async notifyExamPublished(examId, studentIds, examTitle, examDate) {
    if (!studentIds || studentIds.length === 0) return;

    const formattedDate = examDate
      ? new Date(examDate).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : 'sắp tới';

    const notifications = studentIds.map((userId) => ({
      userId,
      type: 'exam_published',
      title: 'Bài thi đã được xuất bản',
      body: `Bài thi "${examTitle}" sẽ diễn ra vào ngày ${formattedDate}. Vui lòng chuẩn bị để làm bài.`,
      data: { examId },
      channels: ['in_app'],
      priority: 'high',
    }));

    await Notification.insertMany(notifications);
  }

  /**
   * Notify a teacher when a student submits an appeal
   * @param {string} examId - The exam ID
   * @param {string} teacherId - Teacher user ID
   * @param {string} studentName - Student name for notification body
   * @param {string} examTitle - Exam title
   * @param {number} questionPosition - Question number being appealed
   */
  async notifyAppealSubmitted(examId, teacherId, studentName, examTitle, questionPosition) {
    await Notification.create({
      userId: teacherId,
      type: 'appeal_submitted',
      title: 'Yêu cầu phúc tra mới',
      body: `Học sinh ${studentName} đã gửi yêu cầu phúc tra câu ${questionPosition} trong bài thi "${examTitle}".`,
      data: { examId },
      channels: ['in_app'],
      priority: 'normal',
    });
  }

  /**
   * Notify a student when their appeal is resolved
   * @param {string} studentId - Student user ID
   * @param {string} examId - The exam ID
   * @param {string} examTitle - Exam title
   * @param {string} decision - 'approved' or 'rejected'
   * @param {string} questionPosition - Question number appealed
   */
  async notifyAppealResolved(studentId, examId, examTitle, decision, questionPosition) {
    const isApproved = decision === 'approved';
    await Notification.create({
      userId: studentId,
      type: 'appeal_resolved',
      title: isApproved ? 'Yêu cầu phúc tra đã được chấp nhận' : 'Yêu cầu phúc tra đã bị từ chối',
      body: isApproved
        ? `Yêu cầu phúc tra câu ${questionPosition} trong bài thi "${examTitle}" đã được chấp nhận.`
        : `Yêu cầu phúc tra câu ${questionPosition} trong bài thi "${examTitle}" đã bị từ chối.`,
      data: { examId },
      channels: ['in_app'],
      priority: 'normal',
    });
  }

  /**
   * Notify student when their score is available after OMR scan
   * @param {string} studentId - Student user ID
   * @param {string} submissionId - Submission ID
   * @param {string} examId - Exam ID
   * @param {string} examTitle - Exam title
   * @param {number} score - The score achieved
   * @param {number} maxScore - Maximum possible score
   */
  async notifyScoreAvailable(studentId, submissionId, examId, examTitle, score, maxScore) {
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    await Notification.create({
      userId: studentId,
      type: 'score_available',
      title: 'Kết quả bài thi đã có',
      body: `Bài thi "${examTitle}" — Điểm: ${score}/${maxScore} (${percentage}%).`,
      data: { examId, submissionId },
      channels: ['in_app'],
      priority: 'high',
    });
  }

  /**
   * Notify when AI report is ready
   * @param {string} studentId - Student user ID
   * @param {string} examId - Exam ID
   * @param {string} submissionId - Submission ID
   * @param {string} examTitle - Exam title
   */
  async notifyAIReportReady(studentId, examId, submissionId, examTitle) {
    await Notification.create({
      userId: studentId,
      type: 'ai_report_ready',
      title: 'Báo cáo AI đã sẵn sàng',
      body: `Báo cáo phân tích chi tiết cho bài thi "${examTitle}" đã được tạo.`,
      data: { examId, submissionId },
      channels: ['in_app'],
      priority: 'low',
    });
  }

  /**
   * Remind students before exam day
   * @param {string[]} studentIds - Array of student user IDs
   * @param {string} examId - Exam ID
   * @param {string} examTitle - Exam title
   * @param {Date} examDate - Exam date
   */
  async scheduleExamReminder(studentIds, examId, examTitle, examDate) {
    if (!studentIds || studentIds.length === 0 || !examDate) return;

    const reminderDate = new Date(examDate);
    reminderDate.setDate(reminderDate.getDate() - 1);
    const now = new Date();

    if (reminderDate <= now) return; // Too late to schedule

    const delayMs = reminderDate.getTime() - now.getTime();

    setTimeout(async () => {
      try {
        const notifications = studentIds.map((userId) => ({
          userId,
          type: 'exam_reminder',
          title: 'Nhắc nhở bài thi ngày mai',
          body: `Bài thi "${examTitle}" sẽ diễn ra vào ngày mai. Vui lòng chuẩn bị đầy đủ.`,
          data: { examId },
          channels: ['in_app'],
          priority: 'high',
          expiresAt: examDate,
        }));
        await Notification.insertMany(notifications);
      } catch (err) {
        const logger = require('../config/logger');
        logger.error('Failed to send exam reminders', { error: err.message, examId });
      }
    }, delayMs);
  }

  /**
   * Send a system notification to a user
   */
  async sendSystemNotification(userId, title, body, data = {}) {
    await Notification.create({
      userId,
      type: 'system',
      title,
      body,
      data,
      channels: ['in_app'],
      priority: 'normal',
    });
  }

  /**
   * Notify bank owner(s) when a user requests access
   */
  async notifyBankRequestSubmitted({ bankId, bankName, requesterName, ownerId, requesterId }) {
    await Notification.create({
      userId: ownerId,
      type: 'bank_request_submitted',
      title: 'New bank access request',
      body: `${requesterName} requested access to bank "${bankName}".`,
      data: { bankId, requesterId },
      channels: ['in_app'],
      priority: 'normal',
    });
  }

  /**
   * Notify a user that their access request was approved
   */
  async notifyBankRequestApproved({ bankId, bankName, userId }) {
    await Notification.create({
      userId,
      type: 'bank_request_approved',
      title: 'Bank access approved',
      body: `Your request to access bank "${bankName}" was approved.`,
      data: { bankId },
      channels: ['in_app'],
      priority: 'normal',
    });
  }

  /**
   * Notify a user that their access request was rejected
   */
  async notifyBankRequestRejected({ bankId, bankName, userId }) {
    await Notification.create({
      userId,
      type: 'bank_request_rejected',
      title: 'Bank access rejected',
      body: `Your request to access bank "${bankName}" was rejected.`,
      data: { bankId },
      channels: ['in_app'],
      priority: 'normal',
    });
  }

  /**
   * Notify a user they have been added as a bank member
   */
  async notifyBankMemberAdded({ bankId, bankName, userId, role }) {
    await Notification.create({
      userId,
      type: 'bank_member_added',
      title: `Added to bank as ${role}`,
      body: `You were added to bank "${bankName}" with role ${role}.`,
      data: { bankId },
      channels: ['in_app'],
      priority: 'normal',
    });
  }
}

module.exports = new NotificationService();
