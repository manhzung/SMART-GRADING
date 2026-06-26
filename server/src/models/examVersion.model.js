const mongoose = require('mongoose');

const shuffledOptionSchema = new mongoose.Schema({
  id: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  isCorrect: {
    type: Boolean,
    required: true,
  },
});

const examQuestionSchema = new mongoose.Schema({
  position: {
    type: Number,
    required: true,
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  originalPosition: {
    type: Number,
    required: true,
  },
  shuffledOptions: [shuffledOptionSchema],
});

const examVersionSchema = mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    versionCode: {
      type: String,
      required: true,
    },
    numberOfQuestions: {
      type: Number,
      required: true,
    },
    questions: [examQuestionSchema],
    answerKey: {
      type: Map,
      of: String,
      required: true,
    },
    pdfUrl: {
      type: String,
      default: null,
    },
    answerSheetPdfUrl: {
      type: String,
      default: null,
    },
    corrigePdfUrl: {
      type: String,
      default: null,
    },
    submissionCount: {
      type: Number,
      default: 0,
    },
    paperEngine: {
      type: String,
      enum: ['pdfkit', 'amc', 'auto'],
      default: 'auto',
    },
    amcProjectPath: {
      type: String,
      default: null,
    },
    generatedAt: {
      type: Date,
      default: null,
    },
    generationErrors: [
      {
        type: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

examVersionSchema.index({ examId: 1, versionCode: 1 }, { unique: true });
examVersionSchema.index({ examId: 1 });

examVersionSchema.methods.getAnswerForPosition = function (position) {
  return this.answerKey.get(position.toString());
};

examVersionSchema.methods.getQuestionAtPosition = function (position) {
  return this.questions.find((q) => q.position === position);
};

examVersionSchema.methods.incrementSubmissionCount = async function () {
  this.submissionCount += 1;
  await this.save();
};

examVersionSchema.statics.findByExamAndCode = async function (examId, versionCode) {
  return this.findOne({ examId, versionCode });
};

examVersionSchema.statics.generateVersionCode = function (index) {
  return (101 + index).toString();
};

const ExamVersion = mongoose.model('ExamVersion', examVersionSchema);

module.exports = ExamVersion;
