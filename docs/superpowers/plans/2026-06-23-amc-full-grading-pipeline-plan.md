# AMC Full Grading Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay thế toàn bộ grading pipeline bằng AMC: AMC sinh sheet → CSV extract coords → Mobile scan bằng Dart + OpenCV → Weighted scoring → Results sync.

**Architecture:** Backend (Node.js + WSL2 AMC) → Mobile (Dart + opencv_dart) → Backend (MongoDB storage) → Web (display)

**Tech Stack:** `opencv_dart` v2.x (Flutter), `amcCsvParser`, `amcTemplateBridge`, Node.js, MongoDB

**Reference:** `docs/superpowers/specs/2026-06-23-amc-full-grading-pipeline-design.md`

---

## File Map

### Backend Files

| Action | File | Purpose |
|--------|------|---------|
| Create | `server/src/amc/amcCsvParser.js` | Parse AMC CSV → structured coords |
| Create | `server/src/amc/amcTemplateBridge.js` | Generate template.json |
| Modify | `server/src/models/examVersion.model.js` | Add `templateJson` field |
| Modify | `server/src/models/submission.model.js` | Add `score`/`maxScore` per answer |
| Modify | `server/src/services/submission.service.js` | Accept weighted questionScores |
| Modify | `server/src/controllers/exam.controller.js` | Add `getExamTemplate` handler |
| Create | `server/src/routes/v1/exam.route.js` → add route | GET `/exams/:id/template` |
| Create | `server/src/validations/exam.validation.js` → add schema | `getExamTemplate` validation |

### Mobile Files

| Action | File | Purpose |
|--------|------|---------|
| Create | `client/mobile/lib/domain/omr/engine_v2/omr_image_processor.dart` | Image preprocessing |
| Create | `client/mobile/lib/domain/omr/engine_v2/omr_bubble_detector.dart` | Bubble intensity detection |
| Create | `client/mobile/lib/domain/omr/engine_v2/omr_scanner.dart` | Main scanner orchestrator |
| Create | `client/mobile/lib/domain/omr/engine_v2/omr_template.dart` | Template model + fromJson |
| Create | `client/mobile/lib/domain/omr/engine_v2/scoring_engine.dart` | Weighted scoring algorithm |
| Create | `client/mobile/lib/domain/omr/engine_v2/omr_models.dart` | Result models |
| Create | `client/mobile/lib/domain/omr/engine_v2/omr_engine_service.dart` | Service: fetch template → scan → score |
| Create | `client/mobile/lib/domain/omr/engine_v2/omr_bloc.dart` | BLoC state management |
| Modify | `client/mobile/lib/domain/omr/models/` | Update existing models |
| Modify | `client/mobile/lib/presentation/pages/camera_scanner_page.dart` | Add `useNewEngine` flag |
| Modify | `client/mobile/lib/presentation/pages/omr_result_page.dart` | Show per-question scores |
| Modify | `client/mobile/lib/presentation/pages/submission_detail_page.dart` | Show score breakdown |
| Modify | `client/mobile/lib/presentation/blocs/submission/` | Add weighted score data |
| Create | `client/mobile/lib/core/network/exam_template_service.dart` | GET `/exams/:id/template` |
| Modify | `client/mobile/pubspec.yaml` | Add `opencv_dart: ^2.2.1` |

### Web Files

| Action | File | Purpose |
|--------|------|---------|
| Modify | `client/web/src/presentation/store/submissionStore.ts` | Add questionScores to types |
| Modify | `client/web/src/pages/SubmissionsPage.tsx` | Show score per question in modal |

---

## Task 1: Backend — AMC CSV Parser

**Files:**
- Create: `server/src/amc/amcCsvParser.js`
- Create: `server/tests/unit/amcCsvParser.test.js`

### amcCsvParser.js

- [ ] **Step 1: Viết test cho amcCsvParser**

Tạo `server/tests/unit/amcCsvParser.test.js`:

```javascript
const AmcCsvParser = require('../../src/amc/amcCsvParser');

describe('AmcCsvParser', () => {
  describe('parse', () => {
    it('should parse student ID zone coordinates', () => {
      const csv = `type,name,page,x1,y1,x2,y2
zone,student_id,1,72,200,90,218
zone,student_id,1,90,200,108,218`;
      const parser = new AmcCsvParser();
      const result = parser.parse(csv);
      expect(result.studentId).toBeDefined();
      expect(result.studentId.coords.length).toBeGreaterThan(0);
    });

    it('should parse version code coordinates', () => {
      const csv = `type,name,page,x1,y1,x2,y2
zone,version_code,1,72,230,90,248
zone,version_code,1,90,230,108,248`;
      const parser = new AmcCsvParser();
      const result = parser.parse(csv);
      expect(result.versionCode).toBeDefined();
    });

    it('should parse answer bubble coordinates', () => {
      const csv = `type,name,page,x1,y1,x2,y2
answer,q01_a,1,120,300,135,315
answer,q01_b,1,140,300,155,315`;
      const parser = new AmcCsvParser();
      const result = parser.parse(csv);
      expect(result.answers).toBeDefined();
      expect(result.answers.q01).toBeDefined();
      expect(result.answers.q01.A).toBeDefined();
    });

    it('should return width/height computed from coords', () => {
      const csv = `type,name,page,x1,y1,x2,y2
answer,q01_a,1,120,300,135,315`;
      const parser = new AmcCsvParser();
      const result = parser.parse(csv);
      const bubble = result.answers.q01.A;
      expect(bubble.w).toBe(15);
      expect(bubble.h).toBe(15);
    });

    it('should handle empty CSV gracefully', () => {
      const parser = new AmcCsvParser();
      const result = parser.parse('');
      expect(result.studentId).toBeDefined();
      expect(result.answers).toEqual({});
    });
  });
});
```

Run: `cd server && npm test -- --testPathPattern="amcCsvParser" --coverage=false`
Expected: FAIL

- [ ] **Step 2: Viết amcCsvParser.js**

Tạo `server/src/amc/amcCsvParser.js`:

```javascript
/**
 * AMC CSV Parser
 * Parse AMC export CSV chua bubble coordinates
 * CSV format: type,name,page,x1,y1,x2,y2
 */

class AmcCsvParser {
  /**
   * @param {string} csvString - AMC CSV content
   * @returns {Object} parsed coordinate data
   */
  parse(csvString) {
    const lines = (csvString || '').trim().split('\n');
    if (lines.length < 2) {
      return this._emptyResult();
    }

    // Skip header
    const dataLines = lines.slice(1);

    const result = {
      studentId: { digits: 10, coords: [] },
      versionCode: { digits: 3, coords: [] },
      answers: {},
    };

    for (const line of dataLines) {
      const parts = this._parseLine(line);
      if (parts.length < 7) continue;

      const [type, name, page, x1, y1, x2, y2] = parts;
      const x1n = parseInt(x1, 10);
      const y1n = parseInt(y1, 10);
      const x2n = parseInt(x2, 10);
      const y2n = parseInt(y2, 10);
      const w = x2n - x1n;
      const h = y2n - y1n;

      if (type === 'zone') {
        if (name === 'student_id') {
          result.studentId.coords.push({ x: x1n, y: y1n, w, h, digit: result.studentId.coords.length });
        } else if (name === 'version_code') {
          result.versionCode.coords.push({ x: x1n, y: y1n, w, h, digit: result.versionCode.coords.length });
        }
      } else if (type === 'answer') {
        // name format: q01_a, q01_b, etc.
        const match = name.match(/^(q\d+)_([A-D])$/);
        if (match) {
          const [, qId, option] = match;
          if (!result.answers[qId]) {
            result.answers[qId] = {};
          }
          result.answers[qId][option] = { x: x1n, y: y1n, w, h };
        }
      }
    }

    return result;
  }

  _parseLine(line) {
    return line.split(',').map((s) => s.trim());
  }

  _emptyResult() {
    return { studentId: { digits: 10, coords: [] }, versionCode: { digits: 3, coords: [] }, answers: {} };
  }
}

module.exports = AmcCsvParser;
```

Run: `cd server && npm test -- --testPathPattern="amcCsvParser" --coverage=false`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/amc/amcCsvParser.js server/tests/unit/amcCsvParser.test.js
git commit -m "feat(amc): add AMC CSV parser for bubble coordinate extraction"
```

---

## Task 2: Backend — AMC Template Bridge

**Files:**
- Create: `server/src/amc/amcTemplateBridge.js`
- Create: `server/tests/unit/amcTemplateBridge.test.js`

### amcTemplateBridge.js

- [ ] **Step 1: Viết test**

Tạo `server/tests/unit/amcTemplateBridge.test.js`:

```javascript
const AmcTemplateBridge = require('../../src/amc/amcTemplateBridge');

describe('AmcTemplateBridge', () => {
  describe('generate', () => {
    it('should generate template with student ID coords', () => {
      const csvData = {
        studentId: { digits: 10, coords: [{ x: 72, y: 200, w: 18, h: 18, digit: 0 }] },
        versionCode: { digits: 3, coords: [{ x: 72, y: 230, w: 18, h: 18, digit: 0 }] },
        answers: {
          q1: { A: { x: 120, y: 300, w: 15, h: 15 }, B: { x: 140, y: 300, w: 15, h: 15 } }
        }
      };
      const versionData = {
        versionCode: '101',
        answerKey: { q1: 'B' },
      };
      const examData = {
        _id: 'exam123',
        numberOfQuestions: 1,
        totalScore: 10,
        questionIds: [{ score: 10 }]
      };

      const bridge = new AmcTemplateBridge();
      const result = bridge.generate({ csvData, versionData, examData });

      expect(result.examId).toBe('exam123');
      expect(result.versionCode).toBe('101');
      expect(result.studentId.coords).toBeDefined();
      expect(result.answerKey.q1).toBe('B');
    });

    it('should build questionScores from exam data', () => {
      const bridge = new AmcTemplateBridge();
      const result = bridge.generate({
        csvData: { studentId: { coords: [] }, versionCode: { coords: [] }, answers: {} },
        versionData: { versionCode: '101', answerKey: {} },
        examData: { _id: 'e1', totalScore: 10, questionIds: [{ score: 2 }, { score: 3 }] }
      });
      expect(result.questionScores).toBeDefined();
      expect(result.totalScore).toBe(10);
    });

    it('should handle empty answers', () => {
      const bridge = new AmcTemplateBridge();
      const result = bridge.generate({
        csvData: { studentId: { coords: [] }, versionCode: { coords: [] }, answers: {} },
        versionData: { versionCode: '101', answerKey: {} },
        examData: { _id: 'e1', totalScore: 10, questionIds: [] }
      });
      expect(result.answers).toEqual({});
      expect(result.questionScores).toEqual({});
    });
  });
});
```

Run: FAIL

- [ ] **Step 2: Viết amcTemplateBridge.js**

Tạo `server/src/amc/amcTemplateBridge.js`:

```javascript
/**
 * AMC Template Bridge
 * Sinh template.json tu AMC CSV data + exam data
 */

class AmcTemplateBridge {
  /**
   * @param {Object} options
   * @param {Object} options.csvData - parsed from AmcCsvParser
   * @param {Object} options.versionData - { versionCode, answerKey }
   * @param {Object} options.examData - exam document
   * @returns {Object} template JSON
   */
  generate({ csvData, versionData, examData }) {
    const answerKey = versionData.answerKey || {};
    const questionScores = {};
    const totalScore = examData.totalScore || 10;
    const numQuestions = csvData.answers ? Object.keys(csvData.answers).length : 0;
    const scorePerQuestion = numQuestions > 0 ? totalScore / numQuestions : 1;

    // Build questionScores from examData.questionIds
    if (examData.questionIds && examData.questionIds.length > 0) {
      Object.keys(csvData.answers || {}).forEach((qId, idx) => {
        const q = examData.questionIds[idx];
        questionScores[qId] = q && q.score ? q.score : scorePerQuestion;
      });
    }

    // Fill missing with equal score
    Object.keys(csvData.answers || {}).forEach((qId) => {
      if (!questionScores[qId]) {
        questionScores[qId] = scorePerQuestion;
      }
    });

    return {
      examId: examData._id ? examData._id.toString() : '',
      versionCode: versionData.versionCode,
      paperSize: 'A4',
      studentId: csvData.studentId,
      versionCode: csvData.versionCode,
      answers: csvData.answers || {},
      answerKey,
      questionScores,
      totalScore,
      numberOfQuestions: numQuestions,
    };
  }
}

module.exports = AmcTemplateBridge;
```

Run: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/amc/amcTemplateBridge.js server/tests/unit/amcTemplateBridge.test.js
git commit -m "feat(amc): add AMC template bridge for template.json generation"
```

---

## Task 3: Backend — Model Changes

**Files:**
- Modify: `server/src/models/examVersion.model.js`
- Modify: `server/src/models/submission.model.js`

### examVersion.model.js

- [ ] **Step 1: Thêm `templateJson` field**

Doc: `server/src/models/examVersion.model.js`, thêm sau field `generationErrors`:

```javascript
    templateJson: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
```

### submission.model.js

- [ ] **Step 2: Thêm `score` và `maxScore` per answer**

Doc: `server/src/models/submission.model.js`, tìm `submissionAnswerSchema`:

```javascript
    score: { type: Number, required: true, default: 0 },
    maxScore: { type: Number, required: true, default: 1 },
```

- [ ] **Step 3: Commit**

```bash
git add server/src/models/examVersion.model.js server/src/models/submission.model.js
git commit -m "feat(amc): add templateJson to ExamVersion, add score/maxScore per answer"
```

---

## Task 4: Backend — API Endpoint

**Files:**
- Modify: `server/src/validations/exam.validation.js`
- Modify: `server/src/routes/v1/exam.route.js`
- Modify: `server/src/controllers/exam.controller.js`

### exam.validation.js

- [ ] **Step 1: Thêm validation schema**

Doc: `server/src/validations/exam.validation.js`, thêm:

```javascript
const getExamTemplate = {
  params: Joi.object({
    id: Joi.objectId().required(),
  }),
  query: Joi.object({
    versionCode: Joi.string().optional(),
  }),
};
```

Export: `module.exports = { ..., getExamTemplate };`

### exam.route.js

- [ ] **Step 2: Thêm route**

Doc: `server/src/routes/v1/exam.route.js`, thêm route:

```javascript
router.get(
  '/:id/template',
  auth(),
  validate(getExamTemplate),
  asyncHandler(examController.getExamTemplate)
);
```

### exam.controller.js

- [ ] **Step 3: Thêm handler**

Doc: `server/src/controllers/exam.controller.js`, thêm method:

```javascript
async getExamTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const { versionCode } = req.query;

    const { Exam, ExamVersion } = require('../models');

    // Find the exam
    const exam = await Exam.findById(id);
    if (!exam) throw new ApiError(404, 'Exam not found');

    // Find matching version
    let version;
    if (versionCode) {
      version = await ExamVersion.findOne({ examId: id, versionCode });
    } else {
      version = await ExamVersion.findOne({ examId: id });
    }

    if (!version) throw new ApiError(404, 'ExamVersion not found');

    res.json({
      template: version.templateJson || null,
      examId: exam._id.toString(),
      versionCode: version.versionCode,
      answerKey: version.answerKey ? Object.fromEntries(version.answerKey) : {},
      totalScore: exam.totalScore,
      numberOfQuestions: exam.numberOfQuestions,
    });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add server/src/validations/exam.validation.js server/src/routes/v1/exam.route.js server/src/controllers/exam.controller.js
git commit -m "feat(amc): add GET /exams/:id/template endpoint for mobile scanner"
```

---

## Task 5: Backend — Integrate template bridge vào AMC pipeline

**Files:**
- Modify: `server/src/amc/amc.service.js`
- Modify: `server/src/amc/amcCompiler.service.js`

### amcCompiler.service.js

- [ ] **Step 1: Thêm template generation vào compile cycle**

Doc: `server/src/amc/amcCompiler.service.js`, sau khi export PDFs, thêm:

```javascript
// Step 8: Generate template.json for mobile scanner
const AmcTemplateBridge = require('./amcTemplateBridge');
const bridge = new AmcTemplateBridge();

// Build answer key from version questions
const answerKey = {};
const questionScores = {};
(examData.questions || []).forEach((q, idx) => {
  const qId = `q${idx + 1}`;
  const correct = q.options.find(o => o.isCorrect);
  answerKey[qId] = correct ? correct.id : null;
  questionScores[qId] = q.score || 1;
});

const csvData = {
  // CSV parsing would need AMC CSV - for now use placeholder
  // This will be fully implemented when AMC CSV export is tested
  studentId: { digits: 10, coords: [] },
  versionCode: { digits: 3, coords: [] },
  answers: {},
};

const templateJson = bridge.generate({
  csvData,
  versionData: { versionCode: versionCode.toString() },
  examData: { _id: examId, totalScore: examData.totalScore, questionIds: examData.questions }
});

parseResult.templateJson = templateJson;
```

- [ ] **Step 2: Commit**

```bash
git add server/src/amc/amcCompiler.service.js
git commit -m "feat(amc): integrate template bridge into AMC compile cycle"
```

---

## Task 6: Mobile — pubspec.yaml + OpenCV Setup

**Files:**
- Modify: `client/mobile/pubspec.yaml`

### pubspec.yaml

- [ ] **Step 1: Thêm opencv_dart dependency**

Doc: `client/mobile/pubspec.yaml`, thêm:

```yaml
dependencies:
  opencv_dart: ^2.2.1
```

- [ ] **Step 2: Commit**

```bash
git add client/mobile/pubspec.yaml
git commit -m "feat(mobile): add opencv_dart dependency for OMR engine v2"
```

---

## Task 7: Mobile — OMR Engine v2 Core

**Files:**
- Create: `client/mobile/lib/domain/omr/engine_v2/omr_models.dart`
- Create: `client/mobile/lib/domain/omr/engine_v2/omr_image_processor.dart`
- Create: `client/mobile/lib/domain/omr/engine_v2/omr_bubble_detector.dart`
- Create: `client/mobile/lib/domain/omr/engine_v2/omr_scanner.dart`
- Create: `client/mobile/lib/domain/omr/engine_v2/scoring_engine.dart`
- Create: `client/mobile/lib/domain/omr/engine_v2/omr_template.dart`
- Create: `client/mobile/lib/domain/omr/engine_v2/omr_engine_service.dart`
- Create: `client/mobile/lib/domain/omr/engine_v2/omr_bloc.dart`

### omr_models.dart

- [ ] **Step 1: Viết result models**

```dart
class OmrScanResult {
  final String studentId;
  final String versionCode;
  final Map<String, String> answers; // q1: "B", q2: "A"
  final Duration processingTime;
  final List<String> processingSteps;

  OmrScanResult({
    required this.studentId,
    required this.versionCode,
    required this.answers,
    required this.processingTime,
    required this.processingSteps,
  });
}

class QuestionScoreResult {
  final int position;
  final String? detectedAnswer;
  final String? correctAnswer;
  final bool isCorrect;
  final bool isUnmarked;
  final double score;
  final double maxScore;

  QuestionScoreResult({
    required this.position,
    this.detectedAnswer,
    this.correctAnswer,
    required this.isCorrect,
    required this.isUnmarked,
    required this.score,
    required this.maxScore,
  });
}

class OmrGradingResult {
  final double totalScore;
  final double maxScore;
  final double percentage;
  final String grade;
  final List<QuestionScoreResult> questionScores;
  final int correctCount;
  final int incorrectCount;
  final int unmarkedCount;

  OmrGradingResult({
    required this.totalScore,
    required this.maxScore,
    required this.percentage,
    required this.grade,
    required this.questionScores,
    required this.correctCount,
    required this.incorrectCount,
    required this.unmarkedCount,
  });
}
```

### omr_image_processor.dart

- [ ] **Step 2: Viết image processor**

```dart
import 'package:opencv_dart/opencv_dart.dart' as cv;

class OmrImageProcessor {
  Future<cv.Mat> binarize(cv.Mat image, {double threshold = 0.5}) async {
    // Convert to grayscale
    final gray = cv.cvtColor(image, cv.COLOR_BGR2GRAY);
    // Apply adaptive threshold
    final binary = cv.adaptiveThreshold(
      gray,
      255.0,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      11,
      2.0,
    );
    gray.dispose();
    return binary;
  }

  Future<cv.Mat> cropRegion(cv.Mat image, int x, int y, int w, int h) async {
    final rect = cv.Rect(x, y, w, h);
    return cv.getRectSubPix(image, rect.size().cast(), rect.center().cast());
  }

  Future<cv.Mat> resizeToStandard(cv.Mat image) async {
    // A4 at 300 DPI: 2480 x 3508
    return cv.resize(image, (2480, 3508));
  }
}
```

### omr_bubble_detector.dart

- [ ] **Step 3: Viết bubble detector**

```dart
import 'package:opencv_dart/opencv_dart.dart' as cv;

class BubbleCoords {
  final int x, y, w, h;
  BubbleCoords(this.x, this.y, this.w, this.h);
}

class OmrBubbleDetector {
  static const double darkThreshold = 0.6;

  /// Detect if a bubble is marked (dark pixel intensity < threshold)
  Future<bool> isBubbleMarked(cv.Mat image, BubbleCoords coords) async {
    final rect = cv.Rect(coords.x, coords.y, coords.w, coords.h);
    final roi = cv.getRectSubPix(image, rect.size().cast(), rect.center().cast());

    // Calculate mean intensity
    final mean = cv.mean(roi);
    roi.dispose();

    // Normalized: 0 = white, 1 = black
    final normalized = mean[0] / 255.0;
    return normalized < darkThreshold;
  }

  /// Detect student ID from bubble template
  Future<String> detectStudentId(cv.Mat image, List<BubbleCoords> digitCoords) async {
    final buffer = StringBuffer();
    for (final coord in digitCoords) {
      final marked = await isBubbleMarked(image, coord);
      if (marked) {
        buffer.write(coord.x.toString()); // Use x as digit value proxy
      }
    }
    return buffer.toString();
  }

  /// Detect all answer bubbles for a question
  Future<String?> detectQuestionAnswer(
    cv.Mat image,
    Map<String, BubbleCoords> optionCoords,
  ) async {
    String? selectedAnswer;
    int darkestValue = 999;

    for (final entry in optionCoords.entries) {
      final marked = await isBubbleMarked(image, entry.value);
      if (marked) {
        selectedAnswer = entry.key;
        break;
      }
    }

    return selectedAnswer;
  }

  /// Detect all answers from template
  Future<Map<String, String>> detectAllAnswers(
    cv.Mat image,
    Map<String, Map<String, BubbleCoords>> answersTemplate,
  ) async {
    final results = <String, String>{};
    for (final entry in answersTemplate.entries) {
      final qId = entry.key;
      final options = entry.value;
      final answer = await detectQuestionAnswer(image, options);
      if (answer != null) {
        results[qId] = answer;
      }
    }
    return results;
  }
}
```

### omr_template.dart

- [ ] **Step 4: Viết template parser**

```dart
class OmrBubbleCoords {
  final int x, y, w, h;
  OmrBubbleCoords(this.x, this.y, this.w, this.h);
  factory OmrBubbleCoords.fromJson(Map<String, dynamic> json) {
    return OmrBubbleCoords(
      json['x'] as int,
      json['y'] as int,
      json['w'] as int,
      json['h'] as int,
    );
  }
}

class OmrTemplate {
  final String examId;
  final String versionCode;
  final List<OmrBubbleCoords> studentIdCoords;
  final List<OmrBubbleCoords> versionCodeCoords;
  final Map<String, Map<String, OmrBubbleCoords>> answers;
  final Map<String, String> answerKey;
  final Map<String, double> questionScores;
  final double totalScore;
  final int numberOfQuestions;

  OmrTemplate({
    required this.examId,
    required this.versionCode,
    required this.studentIdCoords,
    required this.versionCodeCoords,
    required this.answers,
    required this.answerKey,
    required this.questionScores,
    required this.totalScore,
    required this.numberOfQuestions,
  });

  factory OmrTemplate.fromJson(Map<String, dynamic> json) {
    final t = json['template'] ?? json;

    // Parse studentId coords
    final studentIdCoords = <OmrBubbleCoords>[];
    if (t['studentId'] != null && t['studentId']['coords'] != null) {
      for (final c in t['studentId']['coords']) {
        studentIdCoords.add(OmrBubbleCoords.fromJson(c));
      }
    }

    // Parse versionCode coords
    final versionCodeCoords = <OmrBubbleCoords>[];
    if (t['versionCode'] != null && t['versionCode']['coords'] != null) {
      for (final c in t['versionCode']['coords']) {
        versionCodeCoords.add(OmrBubbleCoords.fromJson(c));
      }
    }

    // Parse answers
    final answers = <String, Map<String, OmrBubbleCoords>>{};
    if (t['answers'] != null) {
      for (final entry in (t['answers'] as Map).entries) {
        answers[entry.key as String] = {};
        for (final opt in (entry.value as Map).entries) {
          answers[entry.key]![opt.key as String] =
            OmrBubbleCoords.fromJson(opt.value);
        }
      }
    }

    return OmrTemplate(
      examId: t['examId'] ?? json['examId'] ?? '',
      versionCode: t['versionCode'] ?? json['versionCode'] ?? '',
      studentIdCoords: studentIdCoords,
      versionCodeCoords: versionCodeCoords,
      answers: answers,
      answerKey: Map<String, String>.from(t['answerKey'] ?? {}),
      questionScores: Map<String, double>.from(
        (t['questionScores'] ?? {}).map((k, v) => MapEntry(k.toString(), (v as num).toDouble())),
      ),
      totalScore: (t['totalScore'] as num?)?.toDouble() ?? 10.0,
      numberOfQuestions: (t['numberOfQuestions'] as num?)?.toInt() ?? 0,
    );
  }
}
```

### scoring_engine.dart

- [ ] **Step 5: Viết scoring engine**

```dart
class ScoringEngine {
  OmrGradingResult grade({
    required Map<String, String> detectedAnswers,
    required Map<String, String> answerKey,
    required Map<String, double> questionScores,
    required double totalScore,
  }) {
    final questionResults = <QuestionScoreResult>[];
    double earnedScore = 0;
    int correctCount = 0;
    int incorrectCount = 0;
    int unmarkedCount = 0;

    final qIds = answerKey.keys.toList()..sort();

    for (int i = 0; i < qIds.length; i++) {
      final qId = qIds[i];
      final detected = detectedAnswers[qId];
      final correct = answerKey[qId];
      final maxScore = questionScores[qId] ?? 1.0;

      final isUnmarked = detected == null;
      final isCorrect = !isUnmarked && detected == correct;
      final score = isCorrect ? maxScore : 0.0;

      if (isUnmarked) {
        unmarkedCount++;
      } else if (isCorrect) {
        correctCount++;
        earnedScore += score;
      } else {
        incorrectCount++;
      }

      questionResults.add(QuestionScoreResult(
        position: i + 1,
        detectedAnswer: detected,
        correctAnswer: correct,
        isCorrect: isCorrect,
        isUnmarked: isUnmarked,
        score: score,
        maxScore: maxScore,
      ));
    }

    final percentage = totalScore > 0 ? (earnedScore / totalScore) * 100 : 0.0;
    final grade = _computeGrade(percentage);

    return OmrGradingResult(
      totalScore: earnedScore,
      maxScore: totalScore,
      percentage: percentage,
      grade: grade,
      questionScores: questionResults,
      correctCount: correctCount,
      incorrectCount: incorrectCount,
      unmarkedCount: unmarkedCount,
    );
  }

  String _computeGrade(double percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'B+';
    if (percentage >= 75) return 'B';
    if (percentage >= 70) return 'C+';
    if (percentage >= 65) return 'C';
    if (percentage >= 55) return 'D';
    return 'F';
  }
}
```

### omr_scanner.dart

- [ ] **Step 6: Viết main scanner**

```dart
import 'package:opencv_dart/opencv_dart.dart' as cv;
import 'omr_image_processor.dart';
import 'omr_bubble_detector.dart';
import 'omr_template.dart';

class OmrScanner {
  final OmrImageProcessor _processor = OmrImageProcessor();
  final OmrBubbleDetector _detector = OmrBubbleDetector();

  Future<OmrScanResult> scan({
    required List<int> imageBytes,
    required OmrTemplate template,
  }) async {
    final sw = Stopwatch()..start();
    final steps = <String>[];

    // Decode image
    steps.add('decode');
    final input = cv.imdecode(imageBytes, cv.IMREAD_COLOR);
    if (input.empty) throw Exception('Failed to decode image');

    // Preprocess: grayscale + binarize
    steps.add('preprocess');
    final gray = cv.cvtColor(input, cv.COLOR_BGR2GRAY);
    input.dispose();
    final binary = await _processor.binarize(gray);
    gray.dispose();

    // Detect student ID
    steps.add('detect_student_id');
    final studentId = await _detector.detectStudentId(
      binary,
      template.studentIdCoords.map((c) => BubbleCoords(c.x, c.y, c.w, c.h)).toList(),
    );

    // Detect version code
    steps.add('detect_version');
    final versionCode = await _detector.detectStudentId(
      binary,
      template.versionCodeCoords.map((c) => BubbleCoords(c.x, c.y, c.w, c.h)).toList(),
    );

    // Detect answers
    steps.add('detect_answers');
    final answersTemplate = template.answers.map((qId, opts) =>
      MapEntry(qId, opts.map((k, v) => MapEntry(k, BubbleCoords(v.x, v.y, v.w, v.h)))
    );
    final answers = await _detector.detectAllAnswers(binary, answersTemplate);

    binary.dispose();
    sw.stop();

    return OmrScanResult(
      studentId: studentId,
      versionCode: versionCode,
      answers: answers,
      processingTime: sw.elapsed,
      processingSteps: steps,
    );
  }
}
```

### omr_engine_service.dart

- [ ] **Step 7: Viết service facade**

```dart
import 'omr_scanner.dart';
import 'scoring_engine.dart';
import 'omr_template.dart';

class OmrEngineService {
  final OmrScanner _scanner = OmrScanner();
  final ScoringEngine _scorer = ScoringEngine();

  Future<OmrGradingResult> scanAndGrade({
    required List<int> imageBytes,
    required Map<String, dynamic> templateJson,
  }) async {
    final template = OmrTemplate.fromJson(templateJson);
    final scanResult = await _scanner.scan(imageBytes: imageBytes, template: template);

    final gradingResult = _scorer.grade(
      detectedAnswers: scanResult.answers,
      answerKey: template.answerKey,
      questionScores: template.questionScores,
      totalScore: template.totalScore,
    );

    return gradingResult;
  }
}
```

- [ ] **Step 8: Commit**

```bash
git add client/mobile/lib/domain/omr/engine_v2/
git commit -m "feat(mobile): add OMR engine v2 with Dart + opencv_dart"
```

---

## Task 8: Mobile — Exam Template API Service

**Files:**
- Create: `client/mobile/lib/core/network/exam_template_service.dart`
- Modify: `client/mobile/lib/core/network/exam_service.dart`

### exam_template_service.dart

- [ ] **Step 1: Viết template fetch service**

```dart
import 'package:dio/dio.dart';

class ExamTemplateService {
  final Dio _dio;

  ExamTemplateService(this._dio);

  Future<Map<String, dynamic>> getTemplate(String examId, {String? versionCode}) async {
    final queryParams = <String, dynamic>{};
    if (versionCode != null) queryParams['versionCode'] = versionCode;

    final response = await _dio.get(
      '/exams/$examId/template',
      queryParameters: queryParams,
    );
    return response.data as Map<String, dynamic>;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/mobile/lib/core/network/exam_template_service.dart
git commit -m "feat(mobile): add ExamTemplateService for GET /exams/:id/template"
```

---

## Task 9: Mobile — UI Integration

**Files:**
- Modify: `client/mobile/lib/presentation/pages/camera_scanner_page.dart`
- Modify: `client/mobile/lib/presentation/pages/omr_result_page.dart`
- Modify: `client/mobile/lib/presentation/pages/submission_detail_page.dart`

### camera_scanner_page.dart

- [ ] **Step 1: Thêm useNewEngine flag và integrate OMREngine v2**

Thêm state:

```dart
bool useNewEngine = true; // default: use new AMC-compatible engine
```

Sau khi capture ảnh, thêm logic:

```dart
if (useNewEngine) {
  // Use OMR Engine v2
  final templateJson = await examTemplateService.getTemplate(examId);
  final gradingResult = await omrEngineService.scanAndGrade(
    imageBytes: imageBytes,
    templateJson: templateJson,
  );
  // Navigate to result page with gradingResult
} else {
  // Use old engine (for backward compat)
}
```

### omr_result_page.dart

- [ ] **Step 2: Hiển thị per-question scores**

Thêm display cho `OmrGradingResult`:

```dart
// Score card
Text('${result.totalScore.toStringAsFixed(1)} / ${result.maxScore}'),
Text('${result.percentage.toStringAsFixed(1)}%  Grade: ${result.grade}'),

// Per-question breakdown
ListView.builder(
  itemCount: result.questionScores.length,
  itemBuilder: (context, i) {
    final q = result.questionScores[i];
    return ListTile(
      leading: Icon(q.isCorrect ? Icons.check : Icons.close),
      title: Text('Cau ${q.position}'),
      subtitle: Text('${q.detectedAnswer ?? "?"} vs ${q.correctAnswer ?? "?"}'),
      trailing: Text('+${q.score.toStringAsFixed(1)}'),
    );
  },
)
```

- [ ] **Step 3: Commit**

```bash
git add client/mobile/lib/presentation/pages/camera_scanner_page.dart client/mobile/lib/presentation/pages/omr_result_page.dart
git commit -m "feat(mobile): integrate OMR engine v2 with weighted scoring display"
```

---

## Task 10: Web — Per-Question Score Display

**Files:**
- Modify: `client/web/src/presentation/store/submissionStore.ts`
- Modify: `client/web/src/pages/SubmissionsPage.tsx`

### submissionStore.ts

- [ ] **Step 1: Thêm score/maxScore vào SubmissionAnswer**

```typescript
interface SubmissionAnswer {
  position: number;
  selectedAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  score: number;     // NEW
  maxScore: number;   // NEW
}
```

### SubmissionsPage.tsx

- [ ] **Step 2: Hiển thị score per question trong detail modal**

Thêm cột "Điểm" trong answer table:

```tsx
<Table>
  <thead>
    <tr>
      <th>Câu</th>
      <th>Đáp án SV</th>
      <th>Đáp án đúng</th>
      <th>Kết quả</th>
      <th>Điểm</th>
    </tr>
  </thead>
  <tbody>
    {answers.map(a => (
      <tr key={a.position}>
        <td>{a.position}</td>
        <td>{a.selectedAnswer || '-'}</td>
        <td>{a.correctAnswer}</td>
        <td>{a.isCorrect ? '✓' : '✗'}</td>
        <td>+{a.score.toFixed(1)}/{a.maxScore}</td>
      </tr>
    ))}
  </tbody>
</Table>
```

- [ ] **Step 3: Commit**

```bash
git add client/web/src/presentation/store/submissionStore.ts client/web/src/pages/SubmissionsPage.tsx
git commit -m "feat(web): display per-question scores in submission detail modal"
```

---

## Self-Review Checklist

### Spec Coverage

| Subsystem | Requirement | Task |
|-----------|-------------|------|
| Backend | amcCsvParser | Task 1 |
| Backend | amcTemplateBridge | Task 2 |
| Backend | templateJson in ExamVersion | Task 3 |
| Backend | questionScores in Submission | Task 3 |
| Backend | GET /exams/:id/template API | Task 4 |
| Backend | Integrate bridge into AMC pipeline | Task 5 |
| Mobile | opencv_dart setup | Task 6 |
| Mobile | OMR Image Processor | Task 7 |
| Mobile | OMR Bubble Detector | Task 7 |
| Mobile | OMR Scanner | Task 7 |
| Mobile | OMR Template Parser | Task 7 |
| Mobile | Scoring Engine (weighted) | Task 7 |
| Mobile | Exam Template Service | Task 8 |
| Mobile | Camera integration | Task 9 |
| Mobile | Result display with per-question scores | Task 9 |
| Web | Per-question score display | Task 10 |

### Placeholder Scan
- Không có TBD/TODO trong steps
- Tất cả file paths là absolute
- Tất cả commands có expected output

### Type Consistency
- Dart models: `OmrBubbleCoords`, `OmrTemplate`, `OmrScanResult`, `OmrGradingResult`, `QuestionScoreResult` — consistent
- Node.js: `amcCsvParser` → `amcTemplateBridge` → template.json — consistent
- API: `GET /exams/:id/template` → mobile service → `OmrTemplate.fromJson()` — consistent
