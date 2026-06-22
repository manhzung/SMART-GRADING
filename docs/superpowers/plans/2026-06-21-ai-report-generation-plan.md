# Backend AI Report Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build AI-powered exam report generation using GenAI to automatically analyze exam results, identify common mistakes, evaluate question difficulty, and provide detailed feedback on class/student performance.

**Architecture:** The `AIReportService` generates reports by collecting submission data, building a structured prompt with exam statistics and student answers, calling the LLM, and storing the structured response in the `AIReport` model. Reports can be generated per-submission (individual student) or per-exam (class-wide analysis).

**Tech Stack:** Node.js/Express, `GeminiService` from Plan 1, `AIReport` model (already exists), `Submission` model.

---

## File Structure

```
server/src/
├── services/
│   └── aiReport.service.js      # AI report generation logic
├── controllers/
│   └── aiReport.controller.js   # HTTP endpoints
├── routes/v1/
│   └── aiReport.route.js       # Route definitions for /api/v1/ai-reports/*
└── tests/
    └── unit/services/aiReport.service.test.js
```

**Prerequisites:** Plan 1 (AI Chat System) must be completed first — `GeminiService` and AI config are shared.

---

## Task 1: Create AIReportService

**Files:**
- Create: `server/src/services/aiReport.service.js`
- Create: `server/tests/unit/services/aiReport.service.test.js`

- [ ] **Step 1: Write failing test**

Create `server/tests/unit/services/aiReport.service.test.js`:

```javascript
const aiReportService = require('../../../src/services/aiReport.service');

describe('AIReportService', () => {
  describe('generateStudentReport', () => {
    it('should be a function', () => {
      expect(typeof aiReportService.generateStudentReport).toBe('function');
    });
  });

  describe('generateExamReport', () => {
    it('should be a function', () => {
      expect(typeof aiReportService.generateExamReport).toBe('function');
    });
  });

  describe('analyzeQuestionDifficulty', () => {
    it('should be a function', () => {
      expect(typeof aiReportService.analyzeQuestionDifficulty).toBe('function');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd c:\TAILIEU\DATN\SMART GRADING\server && npm test -- tests/unit/services/aiReport.service.test.js --testPathIgnorePatterns=[]`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write AIReportService**

Create `server/src/services/aiReport.service.js`:

```javascript
const { AIReport, Submission, Exam, Question } = require('../models');
const geminiService = require('./gemini.service');
const ApiError = require('../utils/ApiError');

class AIReportService {
  /**
   * Generate AI report for a single student's submission
   */
  async generateStudentReport(submissionId, model = 'gemini') {
    const submission = await Submission.findById(submissionId)
      .populate('examId', 'title subjectId numberOfQuestions')
      .populate('studentId', 'name studentCode');

    if (!submission) {
      throw new ApiError(404, 'Submission not found');
    }

    // Check if report already exists
    let report = await AIReport.findOne({
      studentId: submission.studentId._id || submission.studentId,
      examId: submission.examId._id || submission.examId,
    });

    if (report) {
      return report;
    }

    // Build context from submission
    const context = this.buildStudentContext(submission);

    // Generate report via LLM
    const prompt = this.buildStudentReportPrompt(context);
    const startTime = Date.now();

    let aiResponse;
    try {
      aiResponse = await geminiService.generateContent(prompt);
    } catch (error) {
      throw new ApiError(503, `AI service unavailable: ${error.message}`);
    }

    const processingTimeMs = Date.now() - startTime;

    // Parse structured response
    const parsed = this.parseStudentReportResponse(aiResponse);

    // Create or update report
    report = await AIReport.findOneAndUpdate(
      {
        studentId: submission.studentId._id || submission.studentId,
        examId: submission.examId._id || submission.examId,
      },
      {
        studentId: submission.studentId._id || submission.studentId,
        examId: submission.examId._id || submission.examId,
        submissionId: submission._id,
        mistakes: parsed.mistakes || [],
        suggestions: parsed.suggestions || {
          overallAdvice: '',
          practiceQuestions: [],
          resources: [],
        },
        statistics: parsed.statistics || {
          totalQuestions: submission.answers?.length || 0,
          correctCount: submission.answers?.filter((a) => a.isCorrect).length || 0,
          incorrectCount: submission.answers?.filter((a) => !a.isCorrect).length || 0,
          score: submission.totalScore || 0,
          weakAreas: [],
          strongAreas: [],
        },
        modelUsed: model,
        promptTokens: 0,
        responseTokens: 0,
        processingTimeMs,
      },
      { upsert: true, new: true }
    );

    return report;
  }

  /**
   * Generate AI report for entire exam (class-wide analysis)
   */
  async generateExamReport(examId, model = 'gemini') {
    const exam = await Exam.findById(examId).populate('classIds', 'name');
    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    const submissions = await Submission.find({
      examId,
      status: 'completed',
    })
      .populate('studentId', 'name studentCode')
      .populate('answers.questionId', 'content topicId topicName');

    if (submissions.length === 0) {
      throw new ApiError(400, 'No completed submissions found for this exam');
    }

    // Build exam context
    const context = this.buildExamContext(exam, submissions);

    // Generate class analysis prompt
    const prompt = this.buildExamReportPrompt(context);
    const startTime = Date.now();

    let aiResponse;
    try {
      aiResponse = await geminiService.generateContent(prompt);
    } catch (error) {
      throw new ApiError(503, `AI service unavailable: ${error.message}`);
    }

    const processingTimeMs = Date.now() - startTime;

    // Parse response
    const parsed = this.parseExamReportResponse(aiResponse);

    return {
      examId,
      overallAnalysis: parsed.overallAnalysis || aiResponse,
      recommendations: parsed.recommendations || [],
      weakTopics: parsed.weakTopics || [],
      strongTopics: parsed.strongTopics || [],
      questionAnalysis: parsed.questionAnalysis || [],
      hardestQuestions: parsed.hardestQuestions || [],
      easiestQuestions: parsed.easiestQuestions || [],
      processingTimeMs,
      modelUsed: model,
      submissionCount: submissions.length,
    };
  }

  /**
   * Analyze difficulty of individual questions based on submission data
   */
  async analyzeQuestionDifficulty(examId) {
    const submissions = await Submission.find({
      examId,
      status: 'completed',
    }).populate('answers.questionId', 'content');

    if (submissions.length === 0) {
      return [];
    }

    // Aggregate per-question accuracy
    const questionStats = {};

    submissions.forEach((sub) => {
      if (!sub.answers) return;
      sub.answers.forEach((answer, idx) => {
        const qId = answer.questionId?._id?.toString() || answer.questionId?.toString();
        if (!qId) return;
        if (!questionStats[qId]) {
          questionStats[qId] = {
            questionId: qId,
            content: answer.questionId?.content || `Question ${idx + 1}`,
            total: 0,
            correct: 0,
            incorrect: 0,
            empty: 0,
          };
        }
        questionStats[qId].total++;
        if (answer.isCorrect) questionStats[qId].correct++;
        else if (!answer.selectedAnswer) questionStats[qId].empty++;
        else questionStats[qId].incorrect++;
      });
    });

    // Calculate accuracy and classify difficulty
    return Object.values(questionStats).map((q) => ({
      ...q,
      accuracy: q.total > 0 ? (q.correct / q.total) * 100 : 0,
      difficulty:
        q.accuracy >= 70 ? 'easy' : q.accuracy >= 40 ? 'medium' : 'hard',
    }));
  }

  // ─── Private helpers ────────────────────────────────────────────────────────────

  buildStudentContext(submission) {
    const exam = submission.examId;
    const student = submission.studentId;
    const answers = submission.answers || [];

    const correctAnswers = answers.filter((a) => a.isCorrect);
    const incorrectAnswers = answers.filter((a) => !a.isCorrect && a.selectedAnswer);
    const unanswered = answers.filter((a) => !a.selectedAnswer);

    return {
      studentName: student?.name || 'Unknown',
      studentCode: student?.studentCode || 'N/A',
      examTitle: exam?.title || 'Unknown Exam',
      totalScore: submission.totalScore || 0,
      maxScore: submission.maxScore || (exam?.numberOfQuestions || answers.length) * 1,
      percentage: submission.maxScore
        ? ((submission.totalScore || 0) / submission.maxScore) * 100
        : 0,
      totalQuestions: answers.length,
      correctCount: correctAnswers.length,
      incorrectCount: incorrectAnswers.length,
      unansweredCount: unanswered.length,
      correctAnswers: correctAnswers.map((a) => ({
        position: a.position || a.questionId?.position,
        questionContent: a.questionId?.content || `Question`,
        answer: a.selectedAnswer,
      })),
      incorrectAnswers: incorrectAnswers.map((a) => ({
        position: a.position || a.questionId?.position,
        questionContent: a.questionId?.content || `Question`,
        studentAnswer: a.selectedAnswer,
        correctAnswer: a.correctAnswer,
      })),
    };
  }

  buildExamContext(exam, submissions) {
    const scores = submissions.map((s) => ({
      studentName: s.studentId?.name || 'Unknown',
      score: s.totalScore || 0,
      maxScore: s.maxScore || 10,
      percentage: s.maxScore ? ((s.totalScore || 0) / s.maxScore) * 100 : 0,
    }));

    const avgScore =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + s.percentage, 0) / scores.length
        : 0;

    // Find hardest and easiest questions
    const questionStats = {};
    submissions.forEach((sub) => {
      if (!sub.answers) return;
      sub.answers.forEach((answer, idx) => {
        const qId = answer.questionId?._id?.toString() || `q${idx + 1}`;
        if (!questionStats[qId]) {
          questionStats[qId] = { total: 0, correct: 0 };
        }
        questionStats[qId].total++;
        if (answer.isCorrect) questionStats[qId].correct++;
      });
    });

    const sortedQuestions = Object.entries(questionStats)
      .map(([qId, stats]) => ({
        questionId: qId,
        accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);

    return {
      examTitle: exam.title || 'Unknown Exam',
      subjectName: exam.subjectId?.name || 'General',
      className: exam.classIds?.[0]?.name || 'Class',
      totalStudents: submissions.length,
      averageScore: avgScore,
      scoreDistribution: this.getScoreDistribution(scores),
      topStudent: scores.sort((a, b) => b.percentage - a.percentage)[0],
      bottomStudent: scores.sort((a, b) => a.percentage - b.percentage)[0],
      hardestQuestions: sortedQuestions.slice(0, 5).map((q) => q.questionId),
      easiestQuestions: sortedQuestions.slice(-5).reverse().map((q) => q.questionId),
    };
  }

  getScoreDistribution(scores) {
    const ranges = [
      { label: '0-4', min: 0, max: 40 },
      { label: '4-6', min: 40, max: 60 },
      { label: '6-8', min: 60, max: 80 },
      { label: '8-10', min: 80, max: 100 },
    ];
    return ranges.map((r) => ({
      range: r.label,
      count: scores.filter((s) => s.percentage >= r.min && s.percentage < r.max).length,
    }));
  }

  buildStudentReportPrompt(context) {
    let prompt = `Bạn là một chuyên gia giáo dục. Hãy phân tích kết quả bài thi của học sinh và đưa ra báo cáo chi tiết.\n\n`;
    prompt += `THÔNG TIN HỌC SINH VÀ BÀI THI:\n`;
    prompt += `- Học sinh: ${context.studentName} (MSSV: ${context.studentCode})\n`;
    prompt += `- Bài thi: ${context.examTitle}\n`;
    prompt += `- Điểm: ${context.totalScore.toFixed(2)}/${context.maxScore} (${context.percentage.toFixed(1)}%)\n`;
    prompt += `- Tổng câu: ${context.totalQuestions} | Đúng: ${context.correctCount} | Sai: ${context.incorrectCount} | Bỏ trống: ${context.unansweredCount}\n\n`;

    if (context.incorrectAnswers.length > 0) {
      prompt += `CÁC CÂU SAI:\n`;
      context.incorrectAnswers.forEach((a, i) => {
        prompt += `${i + 1}. Câu ${a.position || i + 1}: ${a.questionContent}\n`;
        prompt += `   Đáp án học sinh: ${a.studentAnswer} | Đáp án đúng: ${a.correctAnswer}\n\n`;
      });
    }

    prompt += `Hãy phân tích và trả lời bằng JSON có cấu trúc như sau:\n`;
    prompt += `{\n`;
    prompt += `  "summary": "Tổng quan 2-3 câu về kết quả bài thi",\n`;
    prompt += `  "mistakes": [\n`;
    prompt += `    {\n`;
    prompt += `      "position": 1,\n`;
    prompt += `      "mistakeType": "concept_misunderstanding|calculation_error|careless_mistake|weak_topic|time_pressure",\n`;
    prompt += `      "explanation": "Giải thích ngắn gọn tại sao sai"\n`;
    prompt += `    }\n`;
    prompt += `  ],\n`;
    prompt += `  "suggestions": {\n`;
    prompt += `    "overallAdvice": "Lời khuyên tổng quan để cải thiện",\n`;
    prompt += `    "weakAreas": ["Chủ đề yếu 1", "Chủ đề yếu 2"],\n`;
    prompt += `    "strongAreas": ["Chủ đề mạnh 1"]\n`;
    prompt += `  },\n`;
    prompt += `  "statistics": {\n`;
    prompt += `    "totalQuestions": ${context.totalQuestions},\n`;
    prompt += `    "correctCount": ${context.correctCount},\n`;
    prompt += `    "incorrectCount": ${context.incorrectCount},\n`;
    prompt += `    "score": ${context.totalScore.toFixed(2)},\n`;
    prompt += `    "weakAreas": ["Chủ đề yếu"],\n`;
    prompt += `    "strongAreas": ["Chủ đề mạnh"]\n`;
    prompt += `  }\n`;
    prompt += `}\n\n`;
    prompt += `Chỉ trả lời JSON, không thêm giải thích.`;
    return prompt;
  }

  buildExamReportPrompt(context) {
    let prompt = `Bạn là một chuyên gia giáo dục. Hãy phân tích kết quả bài thi của cả lớp và đưa ra đánh giá chi tiết.\n\n`;
    prompt += `THÔNG TIN BÀI THI:\n`;
    prompt += `- Bài thi: ${context.examTitle}\n`;
    prompt += `- Môn: ${context.subjectName}\n`;
    prompt += `- Lớp: ${context.className}\n`;
    prompt += `- Tổng học sinh: ${context.totalStudents}\n`;
    prompt += `- Điểm trung bình: ${context.averageScore.toFixed(1)}%\n\n`;

    prompt += `PHÂN BỐ ĐIỂM:\n`;
    context.scoreDistribution.forEach((d) => {
      prompt += `- ${d.range}: ${d.count} học sinh\n`;
    });

    prompt += `\nCÂU HỎI KHÓ NHẤT (nhiều học sinh sai nhất): ${context.hardestQuestions.join(', ')}\n`;
    prompt += `CÂU HỎI DỄ NHẤT (nhiều học sinh đúng nhất): ${context.easiestQuestions.join(', ')}\n\n`;

    prompt += `Hãy phân tích và trả lời bằng JSON có cấu trúc như sau:\n`;
    prompt += `{\n`;
    prompt += `  "overallAnalysis": "Đánh giá tổng quan về kết quả bài thi lớp",\n`;
    prompt += `  "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"],\n`;
    prompt += `  "weakTopics": [{ "topicName": "Tên chủ đề", "affectedStudents": 5 }],\n`;
    prompt += `  "strongTopics": [{ "topicName": "Tên chủ đề", "studentCount": 15 }],\n`;
    prompt += `  "questionAnalysis": [\n`;
    prompt += `    { "questionId": "id", "difficulty": "easy|medium|hard", "accuracy": 75.5 }\n`;
    prompt += `  ],\n`;
    prompt += `  "hardestQuestions": ["questionId1", "questionId2"],\n`;
    prompt += `  "easiestQuestions": ["questionId3", "questionId4"]\n`;
    prompt += `}\n\n`;
    prompt += `Chỉ trả lời JSON, không thêm giải thích.`;
    return prompt;
  }

  parseStudentReportResponse(responseText) {
    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fall through to default
    }
    return {
      summary: responseText.substring(0, 500),
      mistakes: [],
      suggestions: { overallAdvice: responseText, practiceQuestions: [], resources: [] },
      statistics: { totalQuestions: 0, correctCount: 0, incorrectCount: 0, score: 0, weakAreas: [], strongAreas: [] },
    };
  }

  parseExamReportResponse(responseText) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fall through
    }
    return {
      overallAnalysis: responseText.substring(0, 500),
      recommendations: [],
      weakTopics: [],
      strongTopics: [],
      questionAnalysis: [],
      hardestQuestions: [],
      easiestQuestions: [],
    };
  }
}

module.exports = new AIReportService();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd c:\TAILIEU\DATN\SMART GRADING\server && npm test -- tests/unit/services/aiReport.service.test.js --testPathIgnorePatterns=[]`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/aiReport.service.js server/tests/unit/services/aiReport.service.test.js
git commit -m "feat(ai-report): add AI report generation service"
```

---

## Task 2: Create AIReportController and Route

**Files:**
- Create: `server/src/controllers/aiReport.controller.js`
- Create: `server/src/routes/v1/aiReport.route.js`
- Modify: `server/src/routes/v1/index.js` (add aiReport route)

- [ ] **Step 1: Write AIReportController**

Create `server/src/controllers/aiReport.controller.js`:

```javascript
const httpStatus = require('http-status');
const aiReportService = require('../services/aiReport.service');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

const generateForSubmission = catchAsync(async (req, res) => {
  const { submissionId } = req.params;
  const { model } = req.body;

  const report = await aiReportService.generateStudentReport(submissionId, model);
  res.send({ success: true, data: report });
});

const generateForExam = catchAsync(async (req, res) => {
  const { examId } = req.params;
  const { model } = req.body;

  const report = await aiReportService.generateExamReport(examId, model);

  // Save exam-level insights to ExamReport model
  const { ExamReport } = require('../models');
  await ExamReport.findOneAndUpdate(
    { examId },
    {
      insights: {
        overallAnalysis: report.overallAnalysis,
        recommendations: report.recommendations,
        weakTopics: report.weakTopics,
        strongTopics: report.strongTopics,
      },
    },
    { upsert: true }
  );

  res.send({ success: true, data: report });
});

const getQuestionDifficulty = catchAsync(async (req, res) => {
  const { examId } = req.params;
  const analysis = await aiReportService.analyzeQuestionDifficulty(examId);
  res.send({ success: true, data: analysis });
});

const getStudentReports = catchAsync(async (req, res) => {
  const { studentId } = req.params;
  const { examId, limit = 10 } = req.query;

  const { AIReport } = require('../models');
  const query = { studentId };
  if (examId) query.examId = examId;

  const reports = await AIReport.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .populate('examId', 'title examDate')
    .populate('submissionId', 'totalScore');

  res.send({ success: true, data: reports });
});

module.exports = {
  generateForSubmission,
  generateForExam,
  getQuestionDifficulty,
  getStudentReports,
};
```

- [ ] **Step 2: Create AI Report route**

Create `server/src/routes/v1/aiReport.route.js`:

```javascript
const express = require('express');
const validate = require('../../middlewares/validate');
const aiReportValidation = require('../../validations/ai.validation');
const aiReportController = require('../../controllers/aiReport.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.route('/submission/:submissionId').post(auth(), aiReportController.generateForSubmission);

router.route('/exam/:examId').post(auth(), validate(aiReportValidation.generateReport), aiReportController.generateForExam);

router.route('/exam/:examId/difficulty').get(auth(), aiReportController.getQuestionDifficulty);

router.route('/student/:studentId').get(auth(), aiReportController.getStudentReports);

module.exports = router;
```

- [ ] **Step 3: Register route in index.js**

In `server/src/routes/v1/index.js`, add after the aiChatRoute import (Plan 1):
```javascript
const aiReportRoute = require('./aiReport.route');
```

And add to the router.use chain:
```javascript
router.use('/ai-reports', aiReportRoute);
```

- [ ] **Step 4: Run all server tests**

Run: `cd c:\TAILIEU\DATN\SMART GRADING\server && npm test -- --testPathIgnorePatterns=[]`
Expected: All existing tests pass

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/aiReport.controller.js server/src/routes/v1/aiReport.route.js server/src/routes/v1/index.js
git commit -m "feat(ai-report): add AI report controller and route"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - ✅ Generate per-student AI report from submission
   - ✅ Generate per-exam class-wide analysis
   - ✅ Analyze question difficulty from submissions
   - ✅ Save AI insights to ExamReport model
   - ✅ Vietnamese prompts with structured JSON output

2. **Placeholder scan:** No "TBD", "TODO", or placeholder comments.

3. **Type consistency:** Method names consistent across controller and service (generateStudentReport, generateExamReport, analyzeQuestionDifficulty).

4. **Dependencies:** Depends on Plan 1 (`GeminiService`).
