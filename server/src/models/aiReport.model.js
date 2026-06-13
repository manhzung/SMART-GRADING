const mongoose = require('mongoose');

const weakTopicSchema = new mongoose.Schema({
  topicId: mongoose.Schema.Types.ObjectId,
  topicName: String,
});

const mistakeSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
  },
  position: Number,
  mistakeType: {
    type: String,
    enum: [
      'concept_misunderstanding',
      'calculation_error',
      'careless_mistake',
      'weak_topic',
      'time_pressure',
    ],
  },
  weakTopics: [weakTopicSchema],
  studentAnswer: String,
  correctAnswer: String,
});

const practiceQuestionSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
  },
  reason: String,
});

const resourceSchema = new mongoose.Schema({
  title: String,
  url: String,
  type: {
    type: String,
    enum: ['video', 'article', 'exercise', 'book'],
  },
});

const suggestionsSchema = new mongoose.Schema({
  overallAdvice: String,
  practiceQuestions: [practiceQuestionSchema],
  resources: [resourceSchema],
});

const statisticsSchema = new mongoose.Schema({
  totalQuestions: Number,
  correctCount: Number,
  incorrectCount: Number,
  score: Number,
  weakAreas: [String],
  strongAreas: [String],
});

const aiReportSchema = mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
    },
    mistakes: [mistakeSchema],
    suggestions: suggestionsSchema,
    statistics: statisticsSchema,
    modelUsed: {
      type: String,
      enum: ['gemini', 'gpt', 'claude'],
    },
    promptTokens: Number,
    responseTokens: Number,
    processingTimeMs: Number,
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
  },
  {
    timestamps: true,
  }
);

aiReportSchema.index({ studentId: 1, examId: 1 }, { unique: true });
aiReportSchema.index({ studentId: 1, createdAt: -1 });
aiReportSchema.index({ isRead: 1 });

aiReportSchema.methods.markAsRead = async function () {
  this.isRead = true;
  this.readAt = new Date();
  await this.save();
};

aiReportSchema.statics.findByStudent = async function (studentId, options = {}) {
  const query = { studentId };
  if (options.examId) {
    query.examId = options.examId;
  }
  return this.find(query).sort({ createdAt: -1 }).limit(options.limit || 10);
};

aiReportSchema.statics.getRecentUnreadReports = async function (studentId) {
  return this.find({ studentId, isRead: false })
    .sort({ createdAt: -1 })
    .populate('examId', 'title');
};

aiReportSchema.statics.generateReport = async function (submission, model = 'gemini') {
  const mistakes = submission.answers
    .filter((a) => !a.isCorrect)
    .map((a) => ({
      questionId: a.questionId,
      position: a.position,
      mistakeType: 'unknown',
      studentAnswer: a.selectedAnswer,
      correctAnswer: a.correctAnswer,
    }));

  const stats = {
    totalQuestions: submission.answers.length,
    correctCount: submission.answers.filter((a) => a.isCorrect).length,
    incorrectCount: submission.answers.filter((a) => !a.isCorrect).length,
    score: submission.totalScore,
    weakAreas: [],
    strongAreas: [],
  };

  const report = new this({
    studentId: submission.studentId,
    examId: submission.examId,
    submissionId: submission._id,
    mistakes,
    suggestions: {
      overallAdvice: '',
      practiceQuestions: [],
      resources: [],
    },
    statistics: stats,
    modelUsed: model,
  });

  await report.save();
  return report;
};

const AIReport = mongoose.model('AIReport', aiReportSchema);

module.exports = AIReport;
