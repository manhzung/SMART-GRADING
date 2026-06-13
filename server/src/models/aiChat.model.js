const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    sources: [String],
    relatedQuestionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
  },
});

const recentMistakeSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
  },
  questionContent: String,
  studentAnswer: String,
  correctAnswer: String,
});

const contextSchema = new mongoose.Schema({
  recentMistakes: [recentMistakeSchema],
  weakTopics: [String],
  gradeLevel: Number,
});

const aiChatSchema = mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
    },
    context: contextSchema,
    messages: [messageSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastMessageAt: Date,
    modelUsed: {
      type: String,
      enum: ['gemini', 'gpt', 'claude'],
      default: 'gemini',
    },
  },
  {
    timestamps: true,
  }
);

aiChatSchema.index({ studentId: 1, lastMessageAt: -1 });
aiChatSchema.index({ studentId: 1, isActive: 1 });

aiChatSchema.methods.addMessage = async function (role, content, metadata = {}) {
  this.messages.push({
    role,
    content,
    timestamp: new Date(),
    metadata,
  });
  this.lastMessageAt = new Date();
  await this.save();
  return this.messages[this.messages.length - 1];
};

aiChatSchema.methods.addUserMessage = async function (content) {
  return this.addMessage('user', content);
};

aiChatSchema.methods.addAssistantMessage = async function (content, metadata = {}) {
  return this.addMessage('assistant', content, metadata);
};

aiChatSchema.statics.findOrCreateByStudent = async function (studentId, examId = null, context = {}) {
  let chat = await this.findOne({
    studentId,
    examId: examId || null,
    isActive: true,
  });

  if (!chat) {
    chat = new this({
      studentId,
      examId: examId || null,
      context: context || {},
      messages: [
        {
          role: 'system',
          content:
            'Bạn là một gia sư thông minh. Hãy giúp học sinh hiểu bài và cải thiện kết quả học tập.',
          timestamp: new Date(),
        },
      ],
    });
    await chat.save();
  }

  return chat;
};

aiChatSchema.statics.getChatHistory = async function (studentId, options = {}) {
  const query = { studentId };
  if (options.examId) {
    query.examId = options.examId;
  }

  return this.find(query)
    .sort({ lastMessageAt: -1 })
    .limit(options.limit || 10)
    .populate('examId', 'title');
};

const AIChat = mongoose.model('AIChat', aiChatSchema);

module.exports = AIChat;
