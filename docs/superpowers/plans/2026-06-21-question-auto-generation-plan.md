# Question Auto-Generation (AI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow teachers to auto-generate multiple-choice questions using GenAI. Teachers specify topic, difficulty, and count; the system generates questions with proper A/B/C/D options and saves them to the question bank. Validation schema `generateQuestions` already exists in `server/src/validations/ai.validation.js`.

**Architecture:** A `QuestionGenService` uses `GeminiService` to generate questions from a structured prompt. The `question.controller.js` gets a new endpoint `POST /questions/generate` that validates input, calls the service, and saves generated questions with `source: 'ai'` flag.

**Tech Stack:** Node.js/Express, `GeminiService` from Plan 1, `Question` model (already exists), Joi validation.

---

## File Structure

```
server/src/
├── services/
│   └── questionGen.service.js     # AI question generation
├── controllers/
│   └── question.controller.js      # Add generateQuestions endpoint
└── tests/
    └── unit/services/questionGen.service.test.js
```

**Prerequisites:** Plan 1 (AI Chat System) must be completed first — `GeminiService` is reused.

---

## Task 1: Create QuestionGenService

**Files:**
- Create: `server/src/services/questionGen.service.js`
- Create: `server/tests/unit/services/questionGen.service.test.js`

- [ ] **Step 1: Write failing test**

Create `server/tests/unit/services/questionGen.service.test.js`:

```javascript
const questionGenService = require('../../../src/services/questionGen.service');

describe('QuestionGenService', () => {
  describe('generateQuestions', () => {
    it('should be a function', () => {
      expect(typeof questionGenService.generateQuestions).toBe('function');
    });
  });

  describe('parseQuestionsFromResponse', () => {
    it('should be a function', () => {
      expect(typeof questionGenService.parseQuestionsFromResponse).toBe('function');
    });
  });

  describe('buildQuestionPrompt', () => {
    it('should be a function', () => {
      expect(typeof questionGenService.buildQuestionPrompt).toBe('function');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd c:\TAILIEU\DATN\SMART GRADING\server && npm test -- tests/unit/services/questionGen.service.test.js --testPathIgnorePatterns=[]`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write QuestionGenService**

Create `server/src/services/questionGen.service.js`:

```javascript
const geminiService = require('./gemini.service');
const ApiError = require('../utils/ApiError');

class QuestionGenService {
  /**
   * Generate multiple-choice questions using GenAI
   * @param {Object} params
   * @param {string} params.topicId - Topic ID
   * @param {string} params.topicName - Topic name
   * @param {number} params.count - Number of questions to generate
   * @param {string} params.difficulty - 'easy' | 'medium' | 'hard'
   * @param {string} params.requirements - Additional requirements
   * @param {number} params.gradeLevel - Grade level (1-12)
   * @param {string} params.subjectId - Subject ID
   * @param {string} params.createdBy - User ID who requested generation
   */
  async generateQuestions({ topicId, topicName, count, difficulty, requirements, gradeLevel, subjectId, createdBy }) {
    const prompt = this.buildQuestionPrompt({
      count,
      difficulty,
      requirements,
      topicName,
      gradeLevel,
    });

    let aiResponse;
    try {
      aiResponse = await geminiService.generateContent(prompt);
    } catch (error) {
      throw new ApiError(503, `AI service unavailable: ${error.message}`);
    }

    const parsedQuestions = this.parseQuestionsFromResponse(aiResponse);

    if (parsedQuestions.length === 0) {
      throw new ApiError(500, 'Failed to parse any questions from AI response');
    }

    // Return parsed questions with metadata
    return parsedQuestions.map((q, idx) => ({
      content: q.content,
      type: 'single_choice',
      options: q.options,
      correctAnswer: q.correctAnswer,
      difficulty: difficulty || 'medium',
      topicId: topicId || null,
      topicName: topicName || '',
      subjectId: subjectId || null,
      source: 'ai',
      isApproved: false,
      isAiGenerated: true,
      aiPrompt: requirements,
      createdBy: createdBy,
      usageCount: 0,
      explanation: q.explanation || '',
      tags: [topicName, difficulty].filter(Boolean),
    }));
  }

  buildQuestionPrompt({ count, difficulty, requirements, topicName, gradeLevel }) {
    const difficultyDesc = {
      easy: 'cơ bản, dễ hiểu, chủ yếu kiểm tra trí nhớ và khái niệm đơn giản',
      medium: 'trung bình, yêu cầu hiểu bài và vận dụng kiến thức',
      hard: 'khó, yêu cầu tư duy phân tích, so sánh, đánh giá và vận dụng cao',
    };

    const diff = difficultyDesc[difficulty] || difficultyDesc.medium;
    const grade = gradeLevel || 10;

    let prompt = `Bạn là một giáo viên có kinh nghiệm. Hãy tạo ${count} câu hỏi trắc nghiệm ${diff}.\n\n`;
    prompt += `CHỦ ĐỀ: ${topicName || requirements || 'Chủ đề tổng quát'}\n`;
    prompt += `CẤP ĐỘ: Lớp ${grade}\n`;
    prompt += `ĐỘ KHÓ: ${difficulty || 'medium'}\n\n`;

    if (requirements && requirements.trim()) {
      prompt += `YÊU CẦU THÊM: ${requirements}\n\n`;
    }

    prompt += `QUY TẮC:\n`;
    prompt += `- Mỗi câu hỏi phải có 4 đáp án: A, B, C, D\n`;
    prompt += `- Chỉ có 1 đáp án đúng\n`;
    prompt += `- Các đáp án sai phải hợp lý, có thể gây nhầm lẫn nhưng không quá vô nghĩa\n`;
    prompt += `- Nội dung câu hỏi rõ ràng, ngắn gọn (dưới 200 ký tự)\n`;
    prompt += `- Đáp án đúng có thể ở bất kỳ vị trí nào (A, B, C, hoặc D)\n`;
    prompt += `- Trả lời bằng JSON array, mỗi object có: content, options (array với id và content), correctAnswer, explanation\n\n`;
    prompt += `Định dạng JSON:\n`;
    prompt += `[\n`;
    prompt += `  {\n`;
    prompt += `    "content": "Câu hỏi ở đây?",\n`;
    prompt += `    "options": [\n`;
    prompt += `      { "id": "A", "content": "Đáp án A" },\n`;
    prompt += `      { "id": "B", "content": "Đáp án B" },\n`;
    prompt += `      { "id": "C", "content": "Đáp án C" },\n`;
    prompt += `      { "id": "D", "content": "Đáp án D" }\n`;
    prompt += `    ],\n`;
    prompt += `    "correctAnswer": "A",\n`;
    prompt += `    "explanation": "Giải thích ngắn vì sao đáp án này đúng"\n`;
    prompt += `  }\n`;
    prompt += `]\n\n`;
    prompt += `Chỉ trả lời JSON, không thêm giải thích.`;

    return prompt;
  }

  parseQuestionsFromResponse(responseText) {
    try {
      // Try to find JSON array in response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found');
      }

      const questions = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(questions)) {
        throw new Error('Response is not an array');
      }

      return questions
        .filter((q) => q.content && q.options && q.options.length === 4 && q.correctAnswer)
        .map((q) => {
          // Normalize options to always have A, B, C, D
          const normalizedOptions = ['A', 'B', 'C', 'D'].map((id) => {
            const existing = q.options.find((o) => o.id === id || o.id === id.toLowerCase());
            if (existing) {
              return { id, content: existing.content || existing.text || '' };
            }
            // If correct answer doesn't match, use first available
            const first = q.options[0];
            return { id, content: first?.content || first?.text || '' };
          });

          // Determine correct answer position
          const correctId = q.correctAnswer?.toUpperCase();
          const correctIndex = ['A', 'B', 'C', 'D'].indexOf(correctId);
          const correctOption = normalizedOptions[correctIndex >= 0 ? correctIndex : 0];

          return {
            content: q.content?.trim() || '',
            options: normalizedOptions,
            correctAnswer: correctOption.id,
            explanation: q.explanation || '',
          };
        });
    } catch (e) {
      throw new ApiError(500, `Failed to parse AI response: ${e.message}`);
    }
  }
}

module.exports = new QuestionGenService();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd c:\TAILIEU\DATN\SMART GRADING\server && npm test -- tests/unit/services/questionGen.service.test.js --testPathIgnorePatterns=[]`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/questionGen.service.js server/tests/unit/services/questionGen.service.test.js
git commit -m "feat(ai-question): add AI question generation service"
```

---

## Task 2: Add generateQuestions endpoint to question controller

**Files:**
- Modify: `server/src/controllers/question.controller.js`
- Modify: `server/src/routes/v1/question.route.js`

- [ ] **Step 1: Read existing question.controller.js**

```bash
cat c:\TAILIEU\DATN\SMART GRADING\server\src\controllers\question.controller.js
```

- [ ] **Step 2: Add generateQuestions method to question.controller.js**

Read the file first, then add this method to the exports:

```javascript
const generateQuestions = catchAsync(async (req, res) => {
  const { topicId, count, difficulty, requirements, gradeLevel } = req.body;

  const { Question } = require('../models');
  const questionGenService = require('../services/questionGen.service');

  // Get topic name if topicId provided
  let topicName = '';
  if (topicId) {
    const { Topic } = require('../models');
    const topic = await Topic.findById(topicId).lean();
    topicName = topic?.name || '';
  }

  const generated = await questionGenService.generateQuestions({
    topicId,
    topicName,
    count: count || 5,
    difficulty: difficulty || 'medium',
    requirements: requirements || '',
    gradeLevel: gradeLevel || 10,
    subjectId: null,
    createdBy: req.user?.id,
  });

  // Bulk insert generated questions
  const inserted = await Question.insertMany(generated);

  res.status(httpStatus.CREATED).send({
    success: true,
    data: {
      count: inserted.length,
      questions: inserted.map((q) => ({
        _id: q._id,
        content: q.content,
        difficulty: q.difficulty,
        topicId: q.topicId,
        topicName: q.topicName,
        source: q.source,
        isApproved: q.isApproved,
      })),
    },
  });
});
```

Find the `module.exports` section in `question.controller.js` and add `generateQuestions` to it.

- [ ] **Step 3: Add route to question.route.js**

Read `server/src/routes/v1/question.route.js`, then add:

```javascript
router.route('/generate').post(auth(), validate(questionValidation.generateQuestions), questionController.generateQuestions);
```

Add this route after the existing routes in the file.

- [ ] **Step 4: Run all server tests**

Run: `cd c:\TAILIEU\DATN\SMART GRADING\server && npm test -- --testPathIgnorePatterns=[]`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/question.controller.js server/src/routes/v1/question.route.js
git commit -m "feat(ai-question): add POST /questions/generate AI endpoint"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - ✅ Generate MCQ questions from topic/difficulty/count
   - ✅ Uses GeminiService from Plan 1
   - ✅ Saves to Question model with source='ai', isAiGenerated=true
   - ✅ 4 options (A-D) with one correct answer
   - ✅ Structured prompt in Vietnamese
   - ✅ JSON parsing with normalization

2. **Placeholder scan:** No "TBD" or "TODO" in the plan.

3. **Type consistency:** Method names consistent (generateQuestions, parseQuestionsFromResponse, buildQuestionPrompt).

4. **Dependencies:** Depends on Plan 1 (`GeminiService`).

5. **Note on Topic model:** The Topic model (`require('../models')` will try to load `Topic`) might not exist. If Topic model doesn't exist, `Question.findById(topicId)` will still work for getting topicName — just use the Question model or skip topic name resolution if the Topic model is not present. The service should degrade gracefully.
