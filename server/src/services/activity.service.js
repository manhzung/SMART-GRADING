const { Exam, Submission, Class, Appeal } = require('../models');

/**
 * Activity types for the mobile dashboard
 */
const ActivityType = {
  EXAM_CREATED: 'exam_created',
  EXAM_PUBLISHED: 'exam_published',
  EXAM_COMPLETED: 'exam_completed',
  SUBMISSION_GRADED: 'submission_graded',
  SUBMISSION_SCANNED: 'submission_scanned',
  CLASS_CREATED: 'class_created',
  STUDENT_ADDED: 'student_added',
  APPEAL_SUBMITTED: 'appeal_submitted',
  APPEAL_RESOLVED: 'appeal_resolved',
};

/**
 * Generate recent activities for a user
 * @param {Object} user - The user object
 * @param {number} limit - Max number of activities to return
 */
async function getRecentActivities(user, limit = 10) {
  const activities = [];

  if (!user) return activities;

  const userId = user.id;

  try {
    // Get recent exams created by user
    const recentExams = await Exam.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('primaryClassId', 'name')
      .lean();

    for (const exam of recentExams) {
      activities.push({
        type: ActivityType.EXAM_CREATED,
        title: 'Tạo đề thi mới',
        description: `"${exam.title}" đã được tạo`,
        entityId: exam._id.toString(),
        entityType: 'exam',
        icon: 'assignment',
        iconColor: '#6366F1',
        iconBgColor: '#EEF2FF',
        timestamp: exam.createdAt,
        metadata: {
          examTitle: exam.title,
          status: exam.status,
          className: exam.primaryClassId?.name,
        },
      });

      // Add published activity if published
      if (exam.publishedAt) {
        activities.push({
          type: ActivityType.EXAM_PUBLISHED,
          title: 'Xuất bản đề thi',
          description: `"${exam.title}" đã được xuất bản`,
          entityId: exam._id.toString(),
          entityType: 'exam',
          icon: 'publish',
          iconColor: '#10B981',
          iconBgColor: '#D1FAE5',
          timestamp: exam.publishedAt,
          metadata: {
            examTitle: exam.title,
          },
        });
      }

      // Add completed activity if completed
      if (exam.completedAt) {
        activities.push({
          type: ActivityType.EXAM_COMPLETED,
          title: 'Hoàn thành chấm thi',
          description: `"${exam.title}" đã hoàn thành chấm`,
          entityId: exam._id.toString(),
          entityType: 'exam',
          icon: 'check_circle',
          iconColor: '#059669',
          iconBgColor: '#ECFDF5',
          timestamp: exam.completedAt,
          metadata: {
            examTitle: exam.title,
            totalSubmissions: exam.totalSubmissions,
          },
        });
      }
    }

    // Get recent submissions graded by user (teacher who graded)
    const recentSubmissions = await Submission.find({ gradedBy: userId })
      .sort({ gradedAt: -1 })
      .limit(limit)
      .populate('examId', 'title')
      .populate('studentId', 'name studentCode')
      .lean();

    for (const sub of recentSubmissions) {
      const scorePercent = sub.maxScore > 0 ? Math.round((sub.totalScore / sub.maxScore) * 100) : 0;
      activities.push({
        type: ActivityType.SUBMISSION_GRADED,
        title: 'Chấm bài hoàn tất',
        description: `${sub.studentId?.name || 'Học sinh'} - ${scorePercent}%`,
        entityId: sub._id.toString(),
        entityType: 'submission',
        icon: 'score',
        iconColor: '#F59E0B',
        iconBgColor: '#FEF3C7',
        timestamp: sub.gradedAt || sub.updatedAt,
        metadata: {
          studentName: sub.studentId?.name,
          studentCode: sub.studentId?.studentCode,
          score: sub.totalScore,
          maxScore: sub.maxScore,
          percentage: scorePercent,
        },
      });
    }

    // Get recent classes created by user
    const recentClasses = await Class.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    for (const cls of recentClasses) {
      activities.push({
        type: ActivityType.CLASS_CREATED,
        title: 'Tạo lớp học mới',
        description: `"${cls.name}" - ${cls.studentCount || 0} học sinh`,
        entityId: cls._id.toString(),
        entityType: 'class',
        icon: 'school',
        iconColor: '#3B82F6',
        iconBgColor: '#EFF6FF',
        timestamp: cls.createdAt,
        metadata: {
          className: cls.name,
          studentCount: cls.studentCount,
        },
      });
    }

    // Get recent appeals for user's exams
    const userExamIds = recentExams.map(e => e._id);
    if (userExamIds.length > 0) {
      const recentAppeals = await Appeal.find({ examId: { $in: userExamIds } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('studentId', 'name studentCode')
        .populate('examId', 'title')
        .lean();

      for (const appeal of recentAppeals) {
        activities.push({
          type: appeal.status === 'resolved' ? ActivityType.APPEAL_RESOLVED : ActivityType.APPEAL_SUBMITTED,
          title: appeal.status === 'resolved' ? 'Phúc khảo hoàn tất' : 'Yêu cầu phúc khảo mới',
          description: `${appeal.studentId?.name || 'Học sinh'} - ${appeal.examId?.title || 'Đề thi'}`,
          entityId: appeal._id.toString(),
          entityType: 'appeal',
          icon: appeal.status === 'resolved' ? 'verified' : 'feedback',
          iconColor: appeal.status === 'resolved' ? '#10B981' : '#EF4444',
          iconBgColor: appeal.status === 'resolved' ? '#D1FAE5' : '#FEE2E2',
          timestamp: appeal.updatedAt || appeal.createdAt,
          metadata: {
            studentName: appeal.studentId?.name,
            examTitle: appeal.examId?.title,
            status: appeal.status,
            newScore: appeal.newScore,
          },
        });
      }
    }

    // Sort all activities by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Return only the requested limit
    return activities.slice(0, limit);
  } catch (error) {
    console.error('Error generating activities:', error);
    return [];
  }
}

module.exports = {
  ActivityType,
  getRecentActivities,
};
