const mongoose = require('mongoose');

const scoreDistributionSchema = new mongoose.Schema({
  range: {
    type: String,
    required: true,
  },
  minScore: Number,
  maxScore: Number,
  count: {
    type: Number,
    default: 0,
  },
  percentage: {
    type: Number,
    default: 0,
  },
});

const questionAnalysisSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  position: {
    type: Number,
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
  },
  correctCount: {
    type: Number,
    default: 0,
  },
  incorrectCount: {
    type: Number,
    default: 0,
  },
  emptyCount: {
    type: Number,
    default: 0,
  },
  accuracy: {
    type: Number,
    default: 0,
  },
  topicId: mongoose.Schema.Types.ObjectId,
  topicName: String,
});

const classSummarySchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  className: String,
  totalStudents: {
    type: Number,
    default: 0,
  },
  submittedCount: {
    type: Number,
    default: 0,
  },
  averageScore: {
    type: Number,
    default: 0,
  },
  highestScore: {
    type: Number,
    default: 0,
  },
  lowestScore: {
    type: Number,
    default: 0,
  },
});

const examReportSchema = mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      unique: true,
    },
    // ══════════════════════════════════════════════════════════════════
    // THỐNG KÊ TỔNG QUÁT (theo yêu cầu UC 5)
    // "Điểm trung bình, điểm cao nhất, điểm thấp nhất,
    //  tỷ lệ học sinh đạt Giỏi/Khá/Trung bình/Yếu"
    // ══════════════════════════════════════════════════════════════════
    statistics: {
      totalStudents: {
        type: Number,
        default: 0,
      },
      submittedCount: {
        type: Number,
        default: 0,
      },
      averageScore: {
        type: Number,
        default: 0,
      },
      averagePercentage: {
        type: Number,
        default: 0,
      },
      medianScore: {
        type: Number,
        default: 0,
      },
      highestScore: {
        type: Number,
        default: 0,
      },
      lowestScore: {
        type: Number,
        default: 0,
      },
      standardDeviation: {
        type: Number,
        default: 0,
      },
    },
    // ══════════════════════════════════════════════════════════════════
    // PHÂN BỔ ĐIỂM
    // ══════════════════════════════════════════════════════════════════
    scoreDistribution: [scoreDistributionSchema],
    // ══════════════════════════════════════════════════════════════════
    // TỶ LỆ ĐẠT/KHÔNG ĐẠT
    // ══════════════════════════════════════════════════════════════════
    gradeDistribution: {
      excellent: {
        count: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
      },
      good: {
        count: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
      },
      average: {
        count: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
      },
      poor: {
        count: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
      },
      passed: {
        count: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
      },
      failed: {
        count: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
      },
    },
    // ══════════════════════════════════════════════════════════════════
    // PHÂN TÍCH CÂU HỎI (theo yêu cầu UC 5)
    // "Phân tích độ khó từng câu hỏi (thống kê câu nào nhiều HS sai nhất)"
    // ══════════════════════════════════════════════════════════════════
    questionAnalysis: [questionAnalysisSchema],
    // Những câu khó nhất (nhiều HS sai)
    hardestQuestions: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question',
        },
        position: Number,
        accuracy: Number,
        incorrectCount: Number,
      },
    ],
    // Những câu dễ nhất
    easiestQuestions: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question',
        },
        position: Number,
        accuracy: Number,
        correctCount: Number,
      },
    ],
    // ══════════════════════════════════════════════════════════════════
    // THỐNG KÊ THEO LỚP
    // ══════════════════════════════════════════════════════════════════
    classSummary: [classSummarySchema],
    // ══════════════════════════════════════════════════════════════════
    // TOP & BOTTOM
    // ══════════════════════════════════════════════════════════════════
    topStudents: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        studentName: String,
        studentCode: String,
        score: Number,
        percentage: Number,
        rank: Number,
      },
    ],
    bottomStudents: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        studentName: String,
        studentCode: String,
        score: Number,
        percentage: Number,
        rank: Number,
      },
    ],
    // ══════════════════════════════════════════════════════════════════
    // CẢNH BÁO & LỖI THƯỜNG GẶP
    // ══════════════════════════════════════════════════════════════════
    warnings: {
      doubleFillCount: {
        type: Number,
        default: 0,
      },
      emptyAnswerCount: {
        type: Number,
        default: 0,
      },
      unclearAnswerCount: {
        type: Number,
        default: 0,
      },
    },
    // ══════════════════════════════════════════════════════════════════
    // AI INSIGHTS
    // ══════════════════════════════════════════════════════════════════
    insights: {
      overallAnalysis: String,
      recommendations: [String],
      weakTopics: [
        {
          topicId: mongoose.Schema.Types.ObjectId,
          topicName: String,
          affectedStudents: Number,
        },
      ],
      strongTopics: [
        {
          topicId: mongoose.Schema.Types.ObjectId,
          topicName: String,
          studentCount: Number,
        },
      ],
    },
    // Người tạo báo cáo
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Trạng thái
    status: {
      type: String,
      enum: ['generating', 'completed', 'failed'],
      default: 'generating',
    },
    generatedAt: {
      type: Date,
      default: null,
    },
    // File export
    pdfUrl: String,
    excelUrl: String,
  },
  {
    timestamps: true,
  }
);

examReportSchema.index({ examId: 1 }, { unique: true });
examReportSchema.index({ status: 1 });
examReportSchema.index({ createdAt: -1 });

examReportSchema.methods.markAsComplete = async function () {
  this.status = 'completed';
  this.generatedAt = new Date();
  await this.save();
};

examReportSchema.methods.markAsFailed = async function () {
  this.status = 'failed';
  await this.save();
};

examReportSchema.statics.findByExam = async function (examId) {
  return this.findOne({ examId });
};

examReportSchema.statics.generateReport = async function (examId, submissions, createdBy) {
  const report = new this({
    examId,
    createdBy,
    status: 'generating',
  });

  if (submissions.length === 0) {
    report.markAsFailed();
    return report;
  }

  const scores = submissions.map((s) => ({
    score: s.totalScore,
    maxScore: s.maxScore,
    percentage: (s.totalScore / s.maxScore) * 100,
  }));

  const totalStudents = submissions.length;
  const sumScore = scores.reduce((sum, s) => sum + s.percentage, 0);
  const avgScore = sumScore / totalStudents;

  report.statistics = {
    totalStudents,
    submittedCount: totalStudents,
    averagePercentage: avgScore,
    averageScore: (avgScore / 100) * scores[0].maxScore,
    highestScore: Math.max(...scores.map((s) => s.score)),
    lowestScore: Math.min(...scores.map((s) => s.score)),
  };

  const sortedScores = [...scores].sort((a, b) => b.percentage - a.percentage);
  const medianIndex = Math.floor(totalStudents / 2);
  report.statistics.medianScore = sortedScores[medianIndex]?.percentage || 0;

  await report.save();
  return report;
};

const ExamReport = mongoose.model('ExamReport', examReportSchema);

module.exports = ExamReport;
