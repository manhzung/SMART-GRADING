const mongoose = require('mongoose');
const toJSON = require('./plugins/toJSON.plugin');

const optionSchema = new mongoose.Schema({
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
    default: false,
  },
  order: {
    type: Number,
    default: 0,
  },
});

const questionSchema = mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['single_choice', 'multiple_choice'],
      default: 'single_choice',
    },
    options: [optionSchema],
    correctAnswer: {
      type: String,
      enum: ['A', 'B', 'C', 'D'],
    },
    correctAnswers: [
      {
        type: String,
        enum: ['A', 'B', 'C', 'D'],
      },
    ],
    score: {
      type: Number,
      default: 1,
      min: 0.5,
      max: 10,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    topicName: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: false,
      default: null,
    },
    source: {
      type: String,
      enum: ['ai', 'manual', 'imported'],
      default: 'manual',
    },
    aiPrompt: String,
    explanation: {
      type: String,
      default: null,
    },
    imageUrl: String,
    tags: [String],
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    correctRate: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

toJSON(questionSchema);

questionSchema.index({ schoolId: 1 });
questionSchema.index({ createdBy: 1 });
questionSchema.index({ schoolId: 1, isApproved: 1 });
questionSchema.index({ topicId: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ content: 'text' });
questionSchema.index({ createdBy: 1 });

questionSchema.pre('save', function (next) {
  if (this.type === 'single_choice') {
    const correctOption = this.options.find((opt) => opt.isCorrect);
    if (correctOption) {
      this.correctAnswer = correctOption.id;
    }
  }
  next();
});

questionSchema.methods.getCorrectAnswer = function () {
  if (this.type === 'single_choice') {
    const correctOption = this.options.find((opt) => opt.isCorrect);
    return correctOption ? correctOption.id : null;
  }
  return this.correctAnswers || [];
};

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;
