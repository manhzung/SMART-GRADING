const httpStatus = require('http-status');
const { AIChat } = require('../models');
const geminiService = require('../services/gemini.service');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

const sendMessage = catchAsync(async (req, res) => {
  const { message, history, context } = req.body;
  const userId = req.user.id;

  if (!message || message.trim().length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Message is required');
  }

  // Find or create active conversation
  let chat = await AIChat.findOne({
    studentId: userId,
    examId: context?.examId || null,
    isActive: true,
  });

  if (!chat) {
    chat = await AIChat.findOrCreateByStudent(userId, context?.examId || null, {
      recentMistakes: context?.recentMistakes || [],
      weakTopics: context?.weakTopics || [],
      gradeLevel: context?.gradeLevel || 10,
    });
  } else if (context?.recentMistakes && context.recentMistakes.length > 0) {
    chat.context.recentMistakes = context.recentMistakes;
    await chat.save();
  }

  // Add user message
  await chat.addUserMessage(message);

  // Build formatted history for LLM
  const llmHistory = chat.messages
    .filter((m) => m.role !== 'system')
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content }));

  try {
    // Call GenAI
    const aiResponse = await geminiService.sendMessage({
      message,
      history: llmHistory,
      context: chat.context,
    });

    // Save assistant response
    await chat.addAssistantMessage(aiResponse, {
      sources: [],
      relatedQuestionIds: context?.questionIds || [],
    });

    res.send({
      success: true,
      data: {
        id: chat._id,
        message: aiResponse,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, `AI service error: ${error.message}`);
  }
});

const getConversations = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const conversations = await AIChat.getChatHistory(userId, {
    limit: parseInt(req.query.limit, 10) || 20,
  });
  res.send({ success: true, data: conversations });
});

const getHistory = catchAsync(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;

  const chat = await AIChat.findOne({ _id: conversationId, studentId: userId });
  if (!chat) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Conversation not found');
  }

  res.send({
    success: true,
    data: {
      _id: chat._id,
      examId: chat.examId,
      context: chat.context,
      messages: chat.messages,
      isActive: chat.isActive,
    },
  });
});

const createConversation = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { examId, context } = req.body;

  const chat = await AIChat.findOrCreateByStudent(userId, examId || null, context || {});
  res.send({
    success: true,
    data: {
      _id: chat._id,
      examId: chat.examId,
      context: chat.context,
    },
  });
});

const getReports = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { examId, subjectId, limit = 10 } = req.query;

  const { AIReport } = require('../models');
  const query = { studentId: userId };
  if (examId) query.examId = examId;
  if (subjectId) query.subjectId = subjectId;

  const reports = await AIReport.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit, 10))
    .populate('examId', 'title');

  res.send({ success: true, data: reports });
});

module.exports = {
  sendMessage,
  getConversations,
  getHistory,
  createConversation,
  getReports,
};
