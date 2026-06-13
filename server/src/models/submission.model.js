const mongoose = require('mongoose');

const detectedAnswerSchema = new mongoose.Schema({
  optionId: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
  },
  isSelected: Boolean,
  intensity: Number,
  position: {
    x: Number,
    y: Number,
  },
});

const answerWarningSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['double_fill', 'empty', 'unclear', 'too_light'],
  },
  message: String,
  severity: {
    type: String,
    enum: ['info', 'warning', 'error'],
    default: 'warning',
  },
});

const omrDataSchema = new mongoose.Schema({
  position: {
    row: Number,
    col: Number,
  },
  bubble: {
    x: Number,
    y: Number,
    width: Number,
    height: Number,
  },
  fillIntensity: {
    average: Number,
    min: Number,
    max: Number,
    percentage: Number,
  },
  detectedAnswers: [detectedAnswerSchema],
  warnings: [answerWarningSchema],
});

const submissionAnswerSchema = new mongoose.Schema({
  position: {
    type: Number,
    required: true,
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  selectedAnswer: {
    type: String,
    enum: ['A', 'B', 'C', 'D', null],
    default: null,
  },
  correctAnswer: {
    type: String,
    required: true,
  },
  isCorrect: {
    type: Boolean,
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  omrData: omrDataSchema,
});

const imageEntrySchema = new mongoose.Schema({
  publicId: { type: String, index: true },
  url: String,
  width: Number,
  height: Number,
  bytes: Number,
  format: {
    type: String,
    enum: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
  },
  dpi: Number,
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const annotatedMarkerSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['correct', 'incorrect', 'double_fill', 'empty'],
  },
  x: Number,
  y: Number,
  radius: Number,
  color: String,
}, { _id: false });

const imageSchema = new mongoose.Schema({
  original: imageEntrySchema,
  preprocessed: imageEntrySchema,
  annotated: {
    ...imageEntrySchema.obj,
    markers: [annotatedMarkerSchema],
  },
}, { _id: false });

const scanMetadataSchema = new mongoose.Schema({
  deviceInfo: {
    platform: String,
    deviceModel: String,
    appVersion: String,
  },
  scannedAt: Date,
  processingTimeMs: Number,
  ocr: {
    versionCode: {
      detected: String,
      confidence: Number,
      rawText: String,
    },
    studentCode: {
      detected: String,
      confidence: Number,
      rawText: String,
    },
  },
});

const omrSummarySchema = new mongoose.Schema({
  totalQuestions: Number,
  correctCount: Number,
  incorrectCount: Number,
  emptyCount: Number,
  doubleFillCount: Number,
  accuracy: Number,
  warnings: [
    {
      type: String,
      positions: [Number],
      message: String,
    },
  ],
  ocrConfidence: Number,
});

const manualOverrideSchema = new mongoose.Schema({
  position: Number,
  originalAnswer: String,
  correctedAnswer: String,
  reason: String,
  overriddenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  overriddenAt: Date,
});

const submissionSchema = mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    versionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamVersion',
      required: true,
    },
    omrTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OMRTemplate',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentCode: {
      type: String,
      required: true,
    },
    answers: [submissionAnswerSchema],
    totalScore: {
      type: Number,
      required: true,
    },
    maxScore: {
      type: Number,
      required: true,
    },
    finalScore: {
      type: Number,
      required: true,
    },
    images: imageSchema,
    scanMetadata: scanMetadataSchema,
    status: {
      type: String,
      enum: [
        'pending',
        'scanning',
        'scanned',
        'manual_review',
        'completed',
        'appealed',
      ],
      default: 'pending',
    },
    omrSummary: omrSummarySchema,
    manualOverrides: [manualOverrideSchema],
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    scannedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
  },
  {
    timestamps: true,
  }
);

submissionSchema.index({ examId: 1, studentCode: 1 }, { unique: true });
submissionSchema.index({ studentId: 1, examId: 1 });
submissionSchema.index({ status: 1 });
submissionSchema.index({ omrTemplateId: 1 });
submissionSchema.index({ scannedAt: -1 });
submissionSchema.index({ 'images.original.publicId': 1 });
submissionSchema.index({ 'images.preprocessed.publicId': 1 });
submissionSchema.index({ 'images.annotated.publicId': 1 });

submissionSchema.methods.recalculateScore = async function () {
  const total = this.answers.reduce((sum, a) => sum + a.score, 0);
  this.totalScore = total;
  this.finalScore = total;
  await this.save();
  return this;
};

submissionSchema.methods.markAsComplete = async function () {
  this.status = 'completed';
  await this.save();
};

submissionSchema.statics.findByExamAndStudent = async function (examId, studentId) {
  return this.findOne({ examId, studentId });
};

submissionSchema.statics.findPendingByExam = async function (examId) {
  return this.find({ examId, status: 'pending' }).populate('studentId', 'name studentCode');
};

submissionSchema.statics.getExamStatistics = async function (examId) {
  const stats = await this.aggregate([
    { $match: { examId: mongoose.Types.ObjectId(examId) } },
    {
      $group: {
        _id: null,
        avgScore: { $avg: '$totalScore' },
        maxScore: { $max: '$totalScore' },
        minScore: { $min: '$totalScore' },
        totalSubmissions: { $sum: 1 },
      },
    },
  ]);
  return stats[0] || null;
};

const Submission = mongoose.model('Submission', submissionSchema);

module.exports = Submission;
