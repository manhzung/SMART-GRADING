const mongoose = require('mongoose');

const appealSchema = mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
    },
    questionPosition: {
      type: Number,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    evidenceImageUrl: String,
    currentAnswer: String,
    expectedAnswer: String,
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected'],
      default: 'pending',
    },
    teacherResponse: {
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reviewedAt: Date,
      decision: {
        type: String,
        enum: ['approved', 'rejected'],
      },
      note: String,
    },
    studentNotified: {
      type: Boolean,
      default: false,
    },
    studentNotifiedAt: Date,
  },
  {
    timestamps: true,
  }
);

appealSchema.index(
  { submissionId: 1, questionId: 1 },
  { unique: true, partialFilterExpression: { questionId: { $exists: true, $type: 'objectId' } } }
);
appealSchema.index({ status: 1 });
appealSchema.index({ studentId: 1, status: 1 });
appealSchema.index({ createdAt: -1 });

appealSchema.statics.findPendingAppeals = async function (examId) {
  return this.find({ examId, status: 'pending' })
    .populate('studentId', 'name studentCode')
    .populate('questionId', 'content')
    .sort({ createdAt: 1 });
};

appealSchema.statics.findByStudent = async function (studentId, examId = null) {
  const query = { studentId };
  if (examId) {
    query.examId = examId;
  }
  return this.find(query).sort({ createdAt: -1 });
};

const Appeal = mongoose.model('Appeal', appealSchema);

module.exports = Appeal;
