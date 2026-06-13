const mongoose = require('mongoose');

const scoreHistorySchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
  },
  submissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
  },
  score: {
    type: Number,
    required: true,
  },
  maxScore: {
    type: Number,
    required: true,
  },
  percentage: {
    type: Number,
    required: true,
  },
  grade: {
    type: String,
    default: null,
  },
  correctCount: Number,
  incorrectCount: Number,
  totalQuestions: Number,
  examDate: {
    type: Date,
    required: true,
  },
});

const topicPerformanceSchema = new mongoose.Schema({
  topicId: mongoose.Schema.Types.ObjectId,
  topicName: String,
  correctCount: {
    type: Number,
    default: 0,
  },
  totalCount: {
    type: Number,
    default: 0,
  },
  accuracy: {
    type: Number,
    default: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

const studentProgressSchema = mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    // ══════════════════════════════════════════════════════════════════
    // LỊCH SỬ ĐIỂM (theo yêu cầu tài liệu)
    // "Biểu đồ đường theo dõi xu hướng điểm số"
    // ══════════════════════════════════════════════════════════════════
    scoreHistory: [scoreHistorySchema],
    // Điểm trung bình tất cả các bài
    overallAverageScore: {
      type: Number,
      default: 0,
    },
    overallPercentage: {
      type: Number,
      default: 0,
    },
    // Tổng số bài thi đã tham gia
    totalExams: {
      type: Number,
      default: 0,
    },
    // Tổng số câu đúng/sai
    totalCorrect: {
      type: Number,
      default: 0,
    },
    totalIncorrect: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    // ══════════════════════════════════════════════════════════════════
    // HIỆU SUẤT THEO CHỦ ĐỀ
    // ══════════════════════════════════════════════════════════════════
    topicPerformance: [topicPerformanceSchema],
    // ══════════════════════════════════════════════════════════════════
    // XẾP HẠNG & THÀNH TÍCH
    // ══════════════════════════════════════════════════════════════════
    rankings: [
      {
        examId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Exam',
          required: true,
        },
        rank: {
          type: Number,
          required: true,
        },
        totalStudents: {
          type: Number,
          required: true,
        },
        percentile: {
          type: Number,
          required: true,
        },
      },
    ],
    // Số lần cải thiện điểm liên tiếp
    consecutiveImprovements: {
      type: Number,
      default: 0,
    },
    // Ngày cập nhật cuối
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

studentProgressSchema.index({ studentId: 1 }, { unique: true });
studentProgressSchema.index({ schoolId: 1 });
studentProgressSchema.index({ 'scoreHistory.examDate': -1 });
studentProgressSchema.index({ overallAverageScore: -1 });

studentProgressSchema.methods.addExamResult = async function (examResult) {
  const existingIndex = this.scoreHistory.findIndex(
    (h) => h.examId.toString() === examResult.examId.toString()
  );

  if (existingIndex >= 0) {
    this.scoreHistory[existingIndex] = examResult;
  } else {
    this.scoreHistory.push(examResult);
    this.scoreHistory.sort((a, b) => new Date(b.examDate) - new Date(a.examDate));
  }

  this.recalculateStats();
  this.lastUpdated = new Date();
  await this.save();
};

studentProgressSchema.methods.recalculateStats = function () {
  if (this.scoreHistory.length === 0) return;

  this.totalExams = this.scoreHistory.length;
  this.totalCorrect = this.scoreHistory.reduce((sum, h) => sum + (h.correctCount || 0), 0);
  this.totalIncorrect = this.scoreHistory.reduce((sum, h) => sum + (h.incorrectCount || 0), 0);
  this.totalQuestions = this.totalCorrect + this.totalIncorrect;

  const totalPercentage = this.scoreHistory.reduce((sum, h) => sum + h.percentage, 0);
  this.overallPercentage = totalPercentage / this.scoreHistory.length;

  const totalScoreSum = this.scoreHistory.reduce(
    (sum, h) => sum + (h.score / h.maxScore) * 10,
    0
  );
  this.overallAverageScore = totalScoreSum / this.scoreHistory.length;
};

studentProgressSchema.methods.getScoreTrend = function (examCount = 5) {
  const recentHistory = this.scoreHistory.slice(0, examCount);
  if (recentHistory.length < 2) return 'stable';

  let improvements = 0;
  for (let i = 1; i < recentHistory.length; i++) {
    if (recentHistory[i].percentage > recentHistory[i - 1].percentage) {
      improvements++;
    }
  }

  if (improvements >= recentHistory.length * 0.6) return 'up';
  if (improvements <= recentHistory.length * 0.2) return 'down';
  return 'stable';
};

studentProgressSchema.methods.getWeakTopics = function (limit = 5) {
  return this.topicPerformance
    .filter((t) => t.accuracy < 60)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit);
};

studentProgressSchema.methods.getStrongTopics = function (limit = 5) {
  return this.topicPerformance
    .filter((t) => t.accuracy >= 80)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, limit);
};

studentProgressSchema.statics.findOrCreate = async function (studentId, schoolId) {
  let progress = await this.findOne({ studentId });
  if (!progress) {
    progress = new this({ studentId, schoolId });
    await progress.save();
  }
  return progress;
};

studentProgressSchema.statics.getLeaderboard = async function (classId, limit = 10) {
  return this.aggregate([
    { $unwind: '$scoreHistory' },
    { $match: { 'scoreHistory.examId': classId } },
    {
      $group: {
        _id: '$studentId',
        studentId: { $first: '$studentId' },
        averageScore: { $avg: '$scoreHistory.percentage' },
        totalExams: { $sum: 1 },
      },
    },
    { $sort: { averageScore: -1 } },
    { $limit: limit },
  ]);
};

const StudentProgress = mongoose.model('StudentProgress', studentProgressSchema);

module.exports = StudentProgress;
