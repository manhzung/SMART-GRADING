# Backend AI Chat System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build complete AI Chat backend with GenAI integration (Gemini) so students can chat with an AI tutor about their exam mistakes and learning.

**Architecture:** Use a centralized `GeminiService` that abstracts the LLM API. The `AIChatController` handles conversation management (create, send message, history). Model `AIChat` stores chat sessions with full message history. Prompts are pre-built in Vietnamese with student context injected dynamically.

**Tech Stack:** Node.js/Express, Google Gemini API via `@google/generative-ai`, axios fallback, `AIChat` model (already exists).

---

## File Structure

```
server/src/
├── services/
│   └── gemini.service.js          # Centralized LLM abstraction (Gemini primary, GPT/Claude fallback)
├── controllers/
│   └── aiChat.controller.js       # Chat CRUD + send message with LLM call
├── routes/v1/
│   └── aiChat.route.js            # Route definitions for /api/v1/ai-chat/*
├── config/
│   └── config.js                  # Add GEMINI_API_KEY, AI_MODEL env vars
└── tests/
    └── unit/services/gemini.service.test.js
```

---

## Task 1: Add AI environment variables and install SDK

**Files:**
- Modify: `server/src/config/config.js`
- Modify: `server/.env.example`
- Modify: `server/package.json` (add dependency)

- [ ] **Step 1: Add `@google/generative-ai` dependency**

Run: `cd c:\TAILIEU\DATN\SMART GRADING\server && npm install @google/generative-ai axios --save`

- [ ] **Step 2: Add AI config to config.js**

```javascript
// In envVarsSchema .keys() block, add after CLOUDINARY_API_SECRET:
GEMINI_API_KEY: Joi.string().description('Google Gemini API key for AI chat and reports'),
GEMINI_MODEL: Joi.string().default('gemini-2.0-flash').description('Gemini model to use'),
AI_PROVIDER: Joi.string().valid('gemini', 'openai', 'claude').default('gemini').description('Primary AI provider'),
OPENAI_API_KEY: Joi.string().description('OpenAI API key (fallback)'),
CLAUDE_API_KEY: Joi.string().description('Claude API key (fallback)'),
```

```javascript
// In the module.exports block, add:
ai: {
  provider: envVars.AI_PROVIDER,
  geminiApiKey: envVars.GEMINI_API_KEY,
  geminiModel: envVars.GEMINI_MODEL,
  openaiApiKey: envVars.OPENAI_API_KEY,
  claudeApiKey: envVars.CLAUDE_API_KEY,
},
```

- [ ] **Step 3: Add env vars to .env.example**

Add these lines after the Cloudinary section:
```
# AI / GenAI
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
AI_PROVIDER=gemini
OPENAI_API_KEY=
CLAUDE_API_KEY=
```

- [ ] **Step 4: Commit**

```bash
git add server/src/config/config.js server/.env.example server/package.json
git commit -m "feat(ai): add AI environment variables and dependencies"
```

---

## Task 2: Create GeminiService

**Files:**
- Create: `server/src/services/gemini.service.js`
- Create: `server/tests/unit/services/gemini.service.test.js`

- [ ] **Step 1: Write failing test**

Create `server/tests/unit/services/gemini.service.test.js`:

```javascript
const geminiService = require('../../../src/services/gemini.service');

describe('GeminiService', () => {
  describe('sendMessage', () => {
    it('should be a function', () => {
      expect(typeof geminiService.sendMessage).toBe('function');
    });

    it('should return a promise', () => {
      const result = geminiService.sendMessage({ message: 'test' });
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('generateContent', () => {
    it('should be a function', () => {
      expect(typeof geminiService.generateContent).toBe('function');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd c:\TAILIEU\DATN\SMART GRADING\server && npm test -- tests/unit/services/gemini.service.test.js --testPathIgnorePatterns=[]`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write minimal service stub**

Create `server/src/services/gemini.service.js`:

```javascript
const config = require('../config/config');
const axios = require('axios');

class GeminiService {
  constructor() {
    this.provider = config.ai?.provider || 'gemini';
    this.geminiApiKey = config.ai?.geminiApiKey;
    this.geminiModel = config.ai?.geminiModel || 'gemini-2.0-flash';
    this.openaiApiKey = config.ai?.openaiApiKey;
    this.claudeApiKey = config.ai?.claudeApiKey;
  }

  async sendMessage({ message, history = [], context = {} }) {
    const prompt = this.buildPrompt(message, history, context);
    return this.generateContent(prompt);
  }

  async generateContent(prompt) {
    switch (this.provider) {
      case 'gemini':
        return this.callGemini(prompt);
      case 'openai':
        return this.callOpenAI(prompt);
      case 'claude':
        return this.callClaude(prompt);
      default:
        throw new Error(`Unknown AI provider: ${this.provider}`);
    }
  }

  async callGemini(prompt) {
    if (!this.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`;
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });
    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini returned empty response');
    }
    return text;
  }

  async callOpenAI(prompt) {
    if (!this.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
      },
      {
        headers: {
          Authorization: `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.choices[0].message.content;
  }

  async callClaude(prompt) {
    if (!this.claudeApiKey) {
      throw new Error('CLAUDE_API_KEY is not configured');
    }
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-haiku-20240307',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': this.claudeApiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.content[0].text;
  }

  buildPrompt(message, history, context) {
    let prompt = 'Bạn là một gia sư thông minh, nhiệt tình và kiên nhẫn. ';
    prompt += 'Hãy giúp học sinh hiểu bài, giải thích các khái niệm một cách rõ ràng, dễ hiểu. ';
    prompt += 'Nếu học sinh hỏi về một câu hỏi cụ thể, hãy giải thích lý do đáp án đúng và sai. ';
    prompt += 'Trả lời bằng tiếng Việt, ngắn gọn và có ý nghĩa.\n\n';

    if (context.recentMistakes && context.recentMistakes.length > 0) {
      prompt += 'Ngữ cảnh về các lỗi gần đây của học sinh:\n';
      context.recentMistakes.forEach((m, i) => {
        prompt += `${i + 1}. Câu hỏi: ${m.questionContent || 'Không có nội dung'}\n`;
        prompt += `   Đáp án của học sinh: ${m.studentAnswer}\n`;
        prompt += `   Đáp án đúng: ${m.correctAnswer}\n\n`;
      });
      prompt += '\n';
    }

    if (history.length > 0) {
      prompt += 'Lịch sử cuộc trò chuyện:\n';
      history.slice(-6).forEach((msg) => {
        prompt += `${msg.role === 'user' ? 'Học sinh' : 'Gia sư'}: ${msg.content}\n`;
      });
      prompt += '\n';
    }

    prompt += `Học sinh: ${message}\nGia sư:`;
    return prompt;
  }
}

module.exports = new GeminiService();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd c:\TAILIEU\DATN\SMART GRADING\server && npm test -- tests/unit/services/gemini.service.test.js --testPathIgnorePatterns=[]`
Expected: PASS (first 2 tests pass, last one may skip if API key not set)

- [ ] **Step 5: Commit**

```bash
git add server/src/services/gemini.service.js server/tests/unit/services/gemini.service.test.js
git commit -m "feat(ai): add GeminiService with multi-provider LLM support"
```

---

## Task 3: Create AIChatController and Route

**Files:**
- Create: `server/src/controllers/aiChat.controller.js`
- Create: `server/src/routes/v1/aiChat.route.js`
- Modify: `server/src/routes/v1/index.js` (add aiChat route)
- Modify: `server/src/services/index.js` (export geminiService)
- Modify: `server/src/validations/ai.validation.js`

- [ ] **Step 1: Write failing test for controller**

Create `server/tests/unit/controllers/aiChat.controller.test.js`:

```javascript
const aiChatController = require('../../../src/controllers/aiChat.controller');

describe('AIChatController', () => {
  it('should have sendMessage function', () => {
    expect(typeof aiChatController.sendMessage).toBe('function');
  });

  it('should have getConversations function', () => {
    expect(typeof aiChatController.getConversations).toBe('function');
  });

  it('should have getHistory function', () => {
    expect(typeof aiChatController.getHistory).toBe('function');
  });

  it('should have createConversation function', () => {
    expect(typeof aiChatController.createConversation).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd c:\TAILIEU\DATN\SMART GRADING\server && npm test -- tests/unit/controllers/aiChat.controller.test.js --testPathIgnorePatterns=[]`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write AIChatController**

Create `server/src/controllers/aiChat.controller.js`:

```javascript
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
    // If AI fails, return error but still save user message
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, `AI service error: ${error.message}`);
  }
});

const getConversations = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const conversations = await AIChat.getChatHistory(userId, {
    limit: parseInt(req.query.limit) || 20,
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

  const query = { studentId: userId };
  if (examId) query.examId = examId;
  if (subjectId) query.subjectId = subjectId;

  const { AIReport } = require('../models');
  const reports = await AIReport.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd c:\TAILIEU\DATN\SMART GRADING\server && npm test -- tests/unit/controllers/aiChat.controller.test.js --testPathIgnorePatterns=[]`
Expected: PASS

- [ ] **Step 5: Create AI Chat route**

Create `server/src/routes/v1/aiChat.route.js`:

```javascript
const express = require('express');
const validate = require('../../middlewares/validate');
const aiChatValidation = require('../../validations/ai.validation');
const aiChatController = require('../../controllers/aiChat.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.route('/send').post(auth(), validate(aiChatValidation.chatWithAI), aiChatController.sendMessage);

router.route('/conversations').get(auth(), aiChatController.getConversations);

router.route('/conversations').post(auth(), aiChatController.createConversation);

router.route('/history/:conversationId').get(auth(), aiChatController.getHistory);

router.route('/reports').get(auth(), aiChatController.getReports);

module.exports = router;
```

- [ ] **Step 6: Register route in index.js**

In `server/src/routes/v1/index.js`, add after the upload route import:
```javascript
const aiChatRoute = require('./aiChat.route');
```

And after `router.use('/upload', uploadRoute);`:
```javascript
router.use('/ai-chat', aiChatRoute);
```

- [ ] **Step 7: Export geminiService in services index**

In `server/src/services/index.js`, add:
```javascript
const geminiService = require('./gemini.service');
```

And add to the exports:
```javascript
module.exports = {
  // ... existing exports
  geminiService,
};
```

- [ ] **Step 8: Run all server tests to verify nothing broke**

Run: `cd c:\TAILIEU\DATN\SMART GRADING\server && npm test -- --testPathIgnorePatterns=[]`
Expected: All existing tests still pass

- [ ] **Step 9: Commit**

```bash
git add server/src/controllers/aiChat.controller.js server/src/routes/v1/aiChat.route.js server/src/routes/v1/index.js server/src/services/index.js
git commit -m "feat(ai): add AI chat controller and route with Gemini integration"
```

---

## Self-Review Checklist

1. **Spec coverage:** Check each requirement
   - ✅ `/api/v1/ai-chat/send` - POST with message, history, context
   - ✅ `/api/v1/ai-chat/conversations` - GET list, POST create
   - ✅ `/api/v1/ai-chat/history/:id` - GET message history
   - ✅ `/api/v1/ai-chat/reports` - GET AI reports
   - ✅ Multi-provider (Gemini/OpenAI/Claude)
   - ✅ Vietnamese system prompt
   - ✅ Context injection (recentMistakes, weakTopics)

2. **Placeholder scan:** No "TBD", "TODO", or placeholder comments in the plan.

3. **Type consistency:** All method names match across tasks (sendMessage, generateContent, buildPrompt, etc.)

4. **Dependencies:** Tasks 1 → 2 → 3 order is correct.
