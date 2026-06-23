# AMC Full Grading Pipeline Redesign

**Date:** 2026-06-23
**Status:** Draft
**Author:** Smart Grading Agent

## Context

Hệ thống hiện tại có 4 subsystem trong grading pipeline:

| # | Subsystem | Current | Target |
|---|-----------|---------|--------|
| 1 | Sheet Generation | PDFKit (`pdfGenerator.js`) | AMC ✅ Done |
| 2 | OMR Scanner | Udayraj-based OMREngine (Flutter) | Custom Dart + OpenCV |
| 3 | Scoring Engine | Binary all-or-nothing | Weighted per-question scoring |
| 4 | Results Display | Per-submission summary | Per-question score breakdown |

**Platform split:**
- **Mobile**: Scan + Score (điện thoại chấm điểm)
- **Backend**: AMC sheet generation + template extraction + result storage
- **Web**: Display only (giữ nguyên)

---

## Architecture Overview

```
[Backend: AMC generate exam]
         │
         ├──→ Exam PDF (LaTeX, AMC standard)
         │
         ├──→ amc-export-csv ──▶ AMC CSV (bubble coords)
         │          │
         │          ▼
         │  [amcCsvParser.js] ──▶ parsed coords
         │          │
         │          ▼
         │  [amcTemplateBridge.js] ──▶ template.json
         │          │
         │          ▼
         │  [MongoDB: ExamVersion.templateJson]
         │
[Mobile: AMC sheet PDF] ──▶ student captures photo
         │
         ▼
[GET /exams/:id/template] ──▶ template.json
         │
         ▼
[Mobile: OMREngine_v2.scan()]     ← New: Dart + OpenCV
         │
         ├── image preprocessing (deskew, crop, binarize)
         ├── bubble detection (template-based)
         └── answer extraction
         │
         ▼
[Mobile: ScoringEngine.grade()]   ← New: Weighted scoring
         │
         ├── detect answers → compare with answerKey
         ├── apply Question.score weights
         └── return OMRGradingResult
         │
         ▼
[POST /submissions] ──▶ { totalScore, answers[], questionScores[] }
         │
         ▼
[Backend: save to MongoDB]
         │
         ▼
[Web + Mobile: display results]
```

---

## Subsystem B: Mobile OMR Scanner + Weighted Scoring Engine

### B.1 Architecture

Viết lại hoàn toàn OMREngine bằng Dart + OpenCV (`opencv4dart`).

**AMC Bubble Layout trên AMC Sheet:**

```
┌────────────────────────────────────────────┐
│  SBD: [0][1][2][3][4][5][6][7][8][9]    │  ← Student ID (10 digits)
│  MD:  [0][1][2]                          │  ← Version code (3 digits)
├────────────────────────────────────────────┤
│  Q01: [A][B][C][D]  Q02: [A][B][C][D]    │
│  Q03: [A][B][C][D]  Q04: [A][B][C][D]    │
│  ...                                      │
└────────────────────────────────────────────┘
```

### B.2 Components (Mobile)

#### `lib/domain/omr/engine_v2/omr_image_processor.dart`

```dart
class OMRImageProcessor {
  Future<Mat> cropOMRRegion(Mat image, {required PaperBoundary boundary});
  Future<Mat> deskew(Mat image, {required double angle});
  Future<Mat> binarize(Mat image, {double threshold = 0.5});
  Future<Mat> normalize(Mat image, {int targetWidth = 2480, int targetHeight = 3508});
}
```

#### `lib/domain/omr/engine_v2/omr_bubble_detector.dart`

```dart
class OMRBubbleDetector {
  // Core: đo pixel intensity → detect marked bubble
  Future<String?> detectBubbleIntensity(
    Mat image,
    BubbleCoords coords, {
    double darkThreshold = 0.6,
  });

  // Detect student ID (10 digits)
  Future<String> detectStudentId(Mat image, BubbleTemplate template);

  // Detect version code (3 digits)
  Future<String> detectVersionCode(Mat image, BubbleTemplate template);

  // Detect all answer bubbles
  Future<Map<String, String>> detectAnswers(Mat image, BubbleTemplate template);
}
```

#### `lib/domain/omr/engine_v2/omr_template.dart`

```dart
class OMRTemplate {
  final String examId;
  final String versionCode;
  final BubbleTemplate studentIdTemplate;
  final BubbleTemplate versionCodeTemplate;
  final Map<String, AnswerBubbleTemplate> answers;
  final Map<String, String> answerKey;         // q1: "B", q2: "A"
  final Map<String, double> questionScores;    // q1: 1.0, q2: 1.5

  factory OMRTemplate.fromJson(Map<String, dynamic> json);
}
```

#### `lib/domain/omr/engine_v2/omr_scanner.dart`

```dart
class OMRScanner {
  Future<OMRScanResult> scan({
    required Uint8List imageBytes,
    required OMRTemplate template,
    OMRScanOptions? options,
  });
  // Pipeline: normalize → deskew → binarize → detect answers
}
```

#### `lib/domain/omr/engine_v2/scoring_engine.dart`

```dart
class ScoringEngine {
  Future<ScoringResult> grade({
    required Map<String, String> detectedAnswers,
    required Map<String, String> answerKey,
    required Map<String, double> questionScores,
    required double totalScore,
  });
}

class ScoringResult {
  final double totalScore;
  final double maxScore;
  final double percentage;
  final String grade;
  final List<QuestionScore> questionScores;
  final int correctCount;
  final int incorrectCount;
  final int unmarkedCount;
}

class QuestionScore {
  final String questionId;
  final int position;
  final String? detectedAnswer;
  final String? correctAnswer;
  final bool isCorrect;
  final bool isUnmarked;
  final double score;
  final double maxScore;
}
```

### B.3 File Structure (Mobile)

```
client/mobile/lib/domain/omr/
├── engine_v2/
│   ├── omr_image_processor.dart   # Image preprocessing
│   ├── omr_bubble_detector.dart  # Bubble detection (intensity-based)
│   ├── omr_scanner.dart          # Main orchestrator
│   ├── omr_template.dart          # Template model + JSON parsing
│   ├── scoring_engine.dart        # Weighted scoring algorithm
│   ├── omr_result.dart            # Result models
│   └── omr_result_page.dart       # Result display widget
├── models/
│   ├── omr_bubble_template.dart   # Bubble template models
│   └── omr_processing_result.dart # Processing result models
├── services/
│   ├── omr_engine_service.dart     # Bridge: template fetch → scan → score
│   └── omr_template_service.dart  # GET /exams/:id/template
└── pages/
    ├── camera_scanner_page.dart    # Camera capture (reuse existing)
    └── omr_result_page.dart       # Result display (update existing)
```

### B.4 Error Handling

| Error | Handling |
|--------|---------|
| Image quality too low | Return error + guidance to retake |
| No bubbles detected | Return error + suggest alignment |
| Partial detection | Highlight undetected, allow manual input |
| Version mismatch | Auto-detect version code from template |
| Template not found | Fetch from backend first |

---

## Subsystem C: Backend AMC CSV → Template JSON Bridge

### C.1 Architecture

```
[AMC: generate papers + export CSV]
         │
         ▼
[amcCsvParser.js] ──▶ parse coordinates from CSV
         │
         ▼
[amcTemplateBridge.js] ──▶ template.json
         │
         ▼
[MongoDB: ExamVersion.templateJson]
         │
         ▼
[GET /exams/:id/template?versionCode=101]
```

### C.2 AMC CSV Format

AMC export CSV chứa tất cả bubble coordinates:

```csv
type,name,page,x1,y1,x2,y2
zone,student_id,1,72,200,90,218
zone,version_code,1,72,230,90,248
question,q01,1,120,300,150,330
answer,q01_a,1,120,300,135,315
answer,q01_b,1,140,300,155,315
answer,q01_c,1,160,300,175,315
answer,q01_d,1,180,300,195,315
...
```

### C.3 Components (Backend)

#### `server/src/amc/amcCsvParser.js`

```javascript
class AmcCsvParser {
  parse(csvString) {
    // Parse CSV lines
    // Extract: studentIdCoords, versionCoords, answerCoords
    // Return structured coordinate data
  }
}
```

#### `server/src/amc/amcTemplateBridge.js`

```javascript
class AmcTemplateBridge {
  generate(options) {
    const { csvData, examData, versionData } = options;
    // Combine CSV coords + answer key + question scores
    // Output: template.json matching mobile OMRTemplate format
  }
}
```

### C.4 Template JSON Format

```json
{
  "examId": "ObjectId",
  "versionCode": "101",
  "paperSize": "A4",
  "studentId": {
    "digits": 10,
    "coords": [
      { "x": 72, "y": 200, "w": 18, "h": 18, "digit": 0 },
      ...
    ]
  },
  "versionCode": {
    "digits": 3,
    "coords": [...]
  },
  "answers": {
    "q1": {
      "A": { "x": 120, "y": 300, "w": 15, "h": 15 },
      "B": { "x": 140, "y": 300, "w": 15, "h": 15 },
      "C": { "x": 160, "y": 300, "w": 15, "h": 15 },
      "D": { "x": 180, "y": 300, "w": 15, "h": 15 }
    },
    "q2": { ... }
  },
  "answerKey": {
    "q1": "B",
    "q2": "A",
    ...
  },
  "questionScores": {
    "q1": 1.0,
    "q2": 1.5,
    ...
  },
  "totalScore": 10.0,
  "numberOfQuestions": 50
}
```

### C.5 API Endpoint

```
GET /api/v1/exams/:id/template?versionCode=101
Response: {
  template: { /* OMRTemplateJSON */ },
  examId: string,
  versionCode: string,
  answerKey: { q1: "B", q2: "A", ... },
  questionScores: { q1: 1.0, q2: 1.5, ... },
  totalScore: number,
  numberOfQuestions: number,
}
```

### C.6 Model Changes

**ExamVersion model** — thêm `templateJson` field:

```javascript
examVersionSchema.add({
  templateJson: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
});
```

### C.7 Trigger Point

`amc.service.js` `generateExamPapers()` — sau khi AMC sinh PDF, gọi `amcTemplateBridge.generate()` và lưu vào `ExamVersion.templateJson`.

---

## Subsystem D: Results Sync + Display

### D.1 API Changes

**POST /submissions** — thêm `questionScores`:

```javascript
// Request body
{
  examId, versionId, studentId, classId,
  answers: [{ position, selectedAnswer, isCorrect }],
  totalScore, maxScore,
  questionScores: [
    { position: 1, score: 1.0, maxScore: 1.0 },
    { position: 2, score: 0, maxScore: 1.5 },
    ...
  ]
}
```

**Submission model** — thêm `questionScores`:

```javascript
submissionAnswerSchema.add({
  score: { type: Number, required: true },       // diểm của câu này
  maxScore: { type: Number, required: true },   // điểm tối đa của câu này
});
```

### D.2 Mobile Display Changes

**`SubmissionDetailPage`** — thêm score breakdown:

```
Score: 7.5 / 10.0  (75%)  Grade: B

Câu 1  [B] ✓  +1.0 / 1.0
Câu 2  [A] ✗  +0.0 / 1.5
Câu 3  [C] ✓  +1.5 / 1.5
...
```

### D.3 Web Display Changes

**`SubmissionsPage` detail modal** — thêm cột điểm per câu:

| Câu | Đáp án SV | Đáp án đúng | Kết quả | Điểm |
|-----|-----------|-------------|---------|------|
| 1 | B | B | ✓ | +1.0 |
| 2 | A | C | ✗ | +0.0 |
| 3 | C | C | ✓ | +1.5 |

---

## Migration Plan

### Phase 1: Backend Template Bridge
1. Implement `amcCsvParser.js` và `amcTemplateBridge.js`
2. Thêm `templateJson` field vào `ExamVersion`
3. Integrate vào `amc.service.js` pipeline
4. API endpoint `GET /exams/:id/template`

### Phase 2: Mobile OMR Engine v2
1. Tạo `lib/domain/omr/engine_v2/` với skeleton
2. Implement `OMRImageProcessor`, `OMRBubbleDetector`, `OMRScanner`
3. Implement `ScoringEngine` với weighted algorithm
4. Implement `OMRTemplate.fromJson()`
5. Integrate vào `CameraScannerPage` (flag `useNewEngine = true`)
6. Unit tests

### Phase 3: Results Sync
1. Backend: thêm `questionScores` vào Submission model và API
2. Mobile: cập nhật `SubmissionDetailPage` display
3. Web: cập nhật detail modal display

### Phase 4: Deprecation
1. Xóa `lib/domain/omr/engine/` (Udayraj-based)
2. Đổi tên `engine_v2/` → `engine/`
3. OMRChecker (Python) giữ lại cho Web nếu cần

---

## Rollback Strategy

| Scenario | Action |
|----------|--------|
| Mobile scanner fails | Fallback về `useNewEngine = false` → dùng engine cũ |
| Template extraction fails | Use preset AMC bubble layout (fixed coords) |
| Backend API down | Mobile queue submissions, sync when online |
| Weighted scoring wrong | Easy fix vì scoring logic isolated trong `ScoringEngine` |

---

## Testing

- **Unit tests**: Mỗi Dart class có unit tests riêng
- **Golden tests**: AMC sheets thật → so sánh output với ground truth
- **Benchmark**: Performance trên device thật (Android/iOS)
- **Integration**: Full pipeline từ backend template → mobile scan → score → submit

---

## Open Questions

1. **opencv4dart availability**: opencv4dart có stable trên Flutter không? Cần verify trước khi implement.
2. **AMC CSV exact format**: AMC CSV format có thể thay đổi giữa các phiên bản. Cần test với AMC version thực tế.
3. **DPI assumption**: Template coords giả sử 300 DPI. Cần verify AMC export DPI.
