const mongoose = require('mongoose');

const examSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    // ══════════════════════════════════════════════════════════════════
    // HỖ TRỢ NHIỀU LỚP (theo yêu cầu tài liệu)
    // "1 bài kiểm tra có thể áp dụng cho nhiều lớp"
    // ══════════════════════════════════════════════════════════════════
    classIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true,
      },
    ],
    // Lớp chính (hiển thị mặc định)
    primaryClassId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    omrTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OMRTemplate',
      required: true,
    },
    omrOverrides: {
      numberOfQuestions: Number,
      customBubbleConfig: {
        bubbleSize: {
          width: Number,
          height: Number,
        },
      },
    },
    examDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      default: '07:00',
    },
    duration: {
      type: Number,
      required: true,
    },
    totalScore: {
      type: Number,
      required: true,
    },
    subjectName: {
      type: String,
      default: null,
    },
    subjectColor: {
      type: String,
      default: '#64748b',
    },
    passingScore: {
      type: Number,
      default: 5,
    },
    numberOfQuestions: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'in_progress', 'completed', 'archived'],
      default: 'draft',
    },
    printConfig: {
      paperSize: {
        type: String,
        enum: ['A4', 'A5'],
        default: 'A4',
      },
      questionsPerPage: {
        type: Number,
        default: 5,
      },
      includeAnswerSheet: {
        type: Boolean,
        default: true,
      },
      schoolHeader: {
        type: Boolean,
        default: true,
      },
      includeInstructions: {
        type: Boolean,
        default: true,
      },
    },
    numberOfVersions: {
      type: Number,
      min: 1,
      max: 50,
      default: 4,
    },
    questionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
    versions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamVersion',
      },
    ],
    shuffleConfig: {
      shuffleQuestions: {
        type: Boolean,
        default: true,
      },
      shuffleOptions: {
        type: Boolean,
        default: true,
      },
    },
    notifiedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    publishedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    // Tổng số học sinh tham gia (từ tất cả các lớp)
    totalStudents: {
      type: Number,
      default: 0,
    },
    totalSubmissions: {
      type: Number,
      default: 0,
    },
    changeHistory: [
      {
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: Date,
        changes: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
  }
);

examSchema.index({ classIds: 1 });
examSchema.index({ primaryClassId: 1 });
examSchema.index({ status: 1 });
examSchema.index({ omrTemplateId: 1 });
examSchema.index({ createdBy: 1 });
examSchema.index({ examDate: 1, status: 1 });

examSchema.methods.publish = async function () {
  this.status = 'published';
  this.publishedAt = new Date();
  await this.save();
};

examSchema.methods.complete = async function () {
  this.status = 'completed';
  this.completedAt = new Date();
  await this.save();
};

examSchema.methods.addClass = async function (classId) {
  if (!this.classIds.includes(classId)) {
    this.classIds.push(classId);
    await this.save();
  }
};

examSchema.methods.removeClass = async function (classId) {
  this.classIds = this.classIds.filter((id) => id.toString() !== classId.toString());
  await this.save();
};

examSchema.statics.findByClass = async function (classId) {
  return this.find({ classIds: classId, status: { $ne: 'archived' } }).sort({ examDate: -1 });
};

examSchema.statics.findMultiClass = async function (classIds) {
  return this.find({ classIds: { $in: classIds }, status: { $ne: 'archived' } }).sort({ examDate: -1 });
};

examSchema.statics.getUpcomingExams = async function (classId) {
  const now = new Date();
  return this.find({
    classIds: classId,
    examDate: { $gte: now },
    status: { $in: ['published', 'in_progress'] },
  }).sort({ examDate: 1 });
};

examSchema.statics.getRecentExams = async function (classId, limit = 10) {
  return this.find({ classIds: classId, status: 'completed' })
    .sort({ completedAt: -1 })
    .limit(limit);
};

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam;
