# Kiến trúc Tạo Bài Thi & Chấm Điểm — SMART GRADING

> **Cập nhật:** 2026-06-24
> **Tình trạng:** Production-ready sau refactor AMC-first

---

## 1. Tổng Quan Kiến trúc

Hệ thống gồm 3 platform:

```
┌─────────────────────────────────────────────────────────────┐
│                        MOBILE APP                            │
│              (Flutter — OMR Scanner engine_v2)                │
│   Chụp ảnh đề thi → Quét OMR → Chấm điểm → Gửi kết quả    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP POST /submissions
                           │ (answers + score + studentCode + versionCode)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       BACKEND (Node.js)                      │
│                    Node.js / Express / MongoDB               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ exam.service │  │examPaper.    │  │submission.       │  │
│  │              │  │service       │  │service           │  │
│  │ CRUD Exam    │  │AMC Paper Gen │  │AMC vs Legacy     │  │
│  │              │  │              │  │path routing      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                           │                    ▲             │
│                           │ PDF + templateJson  │             │
│                           ▼                    │             │
│  ┌──────────────┐  ┌──────────────┐           │             │
│  │ OMRTemplate  │  │   AMC CLI     │           │             │
│  │ (MongoDB)   │  │ (WSL2/Linux)  │           │             │
│  │ templateJson │  │ pdfTeX + latex│           │             │
│  └──────────────┘  └──────────────┘           │             │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP GET /exams/:id/template
                           │ (templateJson — cho mobile)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                         WEB FRONTEND                         │
│                   (React / TypeScript / Zustand)              │
│  Tạo đề → Sinh mã đề → Compile AMC → Tải template.json     │
└─────────────────────────────────────────────────────────────┘
```

### Hai luồng chấm điểm song song

| | **AMC Exam** (mới) | **Legacy Exam** (pdfkit) |
|---|---|---|
| Tạo đề | AMC CLI (WSL2) | pdfkit (Node.js) |
| Scan OMR | Mobile app (engine_v2) | Backend (Python bridge) |
| Chấm điểm | Mobile app | Backend (Python bridge) |
| Dữ liệu OMR | `OMRTemplate.templateJson` | `OMRTemplate.zones` |
| Quyết định runtime | `exam.paperEngine === 'amc'` | `exam.paperEngine === 'pdfkit'` |

---

## 2. Luồng Tạo Bài Thi (Exam Creation)

### 2.1 Tạo Exam — Web API

```
Web → POST /exams
        │
        ├── Tạo Exam document (status: draft)
        ├── Gắn OMRTemplate (từ thư viện có sẵn)
        └── Trả về examId
```

**Backend endpoint:** `POST /api/exams`
- Validation: `exam.validation.js`
- Tạo `Exam` + gắn `omrTemplateId`

### 2.2 Gán Questions — Web API

```
Web → PUT /exams/:id/questions
        │
        ├── Lưu questionIds vào Exam
        ├── Lưu shuffleConfig (nếu có)
        └── Trả về exam đã cập nhật
```

### 2.3 Sinh Mã Đề (Version Generation) — Web API

```
Web → POST /api/exams/:id/versions/generate
        │
        ├── Kiểm tra exam đã có questions
        ├── Tạo N ExamVersion documents
        │   ├── Mỗi version có versionCode (VD: 101, 102, 103, 104)
        │   ├── Mỗi version có shuffled question order
        │   ├── Mỗi version có answerKey (Map<position, optionLetter>)
        │   │   VD: { "q1": "C", "q2": "A", "q3": "B", ... }
        │   └── Status: "draft"
        └── Trả về danh sách versions
```

**Điểm quan trọng:** `answerKey` được lưu trong `ExamVersion` — đây là **authoritative answer key** cho cả AMC và legacy.

### 2.4 Compile AMC — Quy trình quan trọng nhất

Đây là bước trung tâm, sinh ra **đề thi PDF** và **template.json cho mobile**.

```
Web → POST /api/exams/:id/compile
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│           examPaper.service.js — orchestrate             │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│  1. amcSourceGenerator.js — Tạo source file (.tex)      │
│                                                         │
│     Mỗi version → 1 file .tex với:                      │
│     - preamble AMC (option layout, bubble style)          │
│     - câu hỏi + đáp án (shuffled per version)           │
│     - student ID bubble field (6 chữ số)                 │
│     - version code bubble field (2 chữ số)                │
│     - answer section (các ô A, B, C, D)                  │
│     - header zone (ô đánh dấu)                          │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│  2. amcCompiler.service.js — Gọi AMC CLI (WSL2)         │
│                                                         │
│     wslRun(`amc-compile --verbose ...`)                  │
│                                                         │
│     Tạo thư mục output:                                 │
│     /uploads/amc/{examId}/                               │
│       ├── project/          ← source + config            │
│       ├── {examId}-sujet.pdf  ← đề thi (tất cả versions)│
│       ├── {examId}-calage.csv ← calibrated coords (px)  │
│       └── {examId}-copies/*.pdf  ← từng bản in           │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│  3. amcOutputParser.js — Đọc output AMC                │
│                                                         │
│     Đọc file .calage.xy:                                │
│     - Scale factor (pixel vs point units)                │
│     - Bubble coordinates per question per option          │
│     - Student ID zone coordinates                        │
│     - Version code zone coordinates                     │
│                                                         │
│     Đọc file exam-answers.csv:                          │
│     - Mapped answer key per version                     │
│     VD: version,question,answer                          │
│         101,1,C                                         │
│         101,2,A                                         │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│  4. templateBuilder.js — Xây dựng templateJson          │
│                                                         │
│     Chuyển đổi AMC coords → templateJson structure:     │
│                                                         │
│     {                                                   │
│       "examId": "...",                                  │
│       "studentId": { "digits": 6, "coords": [...] },    │
│       "versionCodeZone": { "digits": 2, "coords": [...] },│
│       "answers": {                                      │
│         "q1": { "A": {x,y,w,h}, "B": {...}, ... },     │
│         "q2": { "A": {...}, "B": {...}, ... },          │
│         ...                                             │
│       },                                                │
│       "answerKey": { "q1": "C", "q2": "A", ... },      │
│       "questionScores": { "q1": 0.5, "q2": 0.5, ... }, │
│       "totalScore": 10,                                 │
│       "numberOfQuestions": 20,                           │
│       "scale": 0.75,                                   │
│       "pageWidth": 2480,                                │
│       "pageHeight": 3508                                │
│     }                                                   │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│  5. Lưu vào MongoDB                                    │
│                                                         │
│     OMRTemplate.findByIdAndUpdate(templateId, {         │
│       templateJson: templateJson,   ← SINGLE SOURCE OF TRUTH│
│       status: 'active'                                  │
│     })                                                   │
│                                                         │
│     ExamVersion.updateMany({                             │
│       pdfUrl: cloudinaryUrl,       ← đề thi PDF          │
│       answerSheetPdfUrl: sheetUrl, ← phiếu trả lời       │
│       status: 'ready',                                   │
│       generatedAt: now()                                 │
│     })                                                   │
└─────────────────────────────────────────────────────────┘
```

#### Chi tiết file `templateJson`

```json5
{
  "examId": "exam_abc123",
  "title": "Đề kiểm tra giữa kỳ",
  "paperSize": "A4",
  "scanDpi": 300,
  "scale": 0.75,                    // AMC internal scale factor
  "pageWidth": 2480,                // pixel dimensions at scan DPI
  "pageHeight": 3508,
  "bubbleWidth": 30,
  "bubbleHeight": 30,

  // Số báo danh — 6 chữ số
  "studentId": {
    "digits": 6,
    "coords": [
      { "x": 1700, "y": 120, "w": 28, "h": 28 },  // digit 1
      { "x": 1750, "y": 120, "w": 28, "h": 28 },  // digit 2
      { "x": 1800, "y": 120, "w": 28, "h": 28 },  // digit 3
      { "x": 1850, "y": 120, "w": 28, "h": 28 },  // digit 4
      { "x": 1900, "y": 120, "w": 28, "h": 28 },  // digit 5
      { "x": 1950, "y": 120, "w": 28, "h": 28 },  // digit 6
    ]
  },

  // Mã đề — 2 chữ số (version code)
  "versionCodeZone": {
    "digits": 2,
    "coords": [
      { "x": 2100, "y": 120, "w": 28, "h": 28 },  // digit 1
      { "x": 2150, "y": 120, "w": 28, "h": 28 },  // digit 2
    ]
  },

  // Tọa độ bubble cho từng câu hỏi
  "answers": {
    "q1": {
      "A": { "x": 100, "y": 300, "w": 28, "h": 28 },
      "B": { "x": 140, "y": 300, "w": 28, "h": 28 },
      "C": { "x": 180, "y": 300, "w": 28, "h": 28 },
      "D": { "x": 220, "y": 300, "w": 28, "h": 28 }
    },
    "q2": {
      "A": { "x": 100, "y": 350, "w": 28, "h": 28 },
      "B": { "x": 140, "y": 350, "w": 28, "h": 28 },
      "C": { "x": 180, "y": 350, "w": 28, "h": 28 },
      "D": { "x": 220, "y": 350, "w": 28, "h": 28 }
    }
    // ... q3, q4, ... q20
  },

  // Đáp án đúng cho từng câu (từ ExamVersion.answerKey)
  "answerKey": {
    "q1": "C",
    "q2": "A",
    "q3": "B",
    // ...
  },

  // Điểm cho từng câu
  "questionScores": {
    "q1": 0.5,
    "q2": 0.5,
    // ...
  },

  "totalScore": 10,
  "numberOfQuestions": 20,
  "autoAlign": true,
  "generatedAt": "2026-06-24T12:00:00Z",
  "source": "amc"
}
```

---

## 3. Luồng Chấm Điểm (Grading Flow)

### 3.1 AMC Exam — Mobile-first (Client-side scanning)

```
┌──────────────────────────────────────────────────────────────────┐
│                        MOBILE APP                                 │
│                                                                  │
│  Bước 1: Tải templateJson từ backend                             │
│  ─────────────────────────────────────                           │
│  GET /api/exams/{examId}/template                                │
│          │                                                       │
│          ▼                                                       │
│  Backend trả về ExamTemplateData:                                │
│  {                                                              │
│    examId: "...",                                                │
│    template: { ...templateJson... }    ← OMRTemplate.templateJson │
│  }                                                              │
│                                                                  │
│  Bước 2: Chụp ảnh đề thi                                       │
│  ─────────────────────────────                                   │
│  Camera capture → Uint8List imageBytes                            │
│                                                                  │
│  Bước 3: Scan OMR (engine_v2)                                   │
│  ─────────────────────────────────────                           │
│  OmrEngineService.scanAndGrade(                                  │
│    imageBytes, templateJson                                       │
│  )                                                               │
│       │                                                          │
│       ├── OmrTemplate.fromJson(templateJson)                    │
│       │      Parse coords: studentId, versionCode, answers      │
│       │                                                          │
│       ├── OmrScanner.scan()                                      │
│       │      ├── decode image                                    │
│       │      ├── grayscale                                       │
│       │      ├── crop & warp (tìm góc + biến đổi phối cảnh)     │
│       │      ├── normalize (cân bằng sáng)                       │
│       │      ├── detectStudentId() → "123456"                     │
│       │      ├── detectVersionCode() → "102"                      │
│       │      └── detectAllAnswers() → { "q1": "C", "q2": "A" }  │
│       │                                                          │
│       └── ScoringEngine.grade()                                  │
│              ├── So sánh detected vs answerKey                   │
│              │   detected["q1"] = "C" vs answerKey["q1"] = "C"  │
│              │   → isCorrect = true, score = 0.5                  │
│              ├── Tính totalScore, percentage                     │
│              └── Trả về OmrGradingResult                        │
│                                                                  │
│  Bước 4: Gửi kết quả lên backend                                │
│  ─────────────────────────────────────                           │
│  POST /api/submissions                                           │
│  {                                                              │
│    "examId": "exam_abc123",                                     │
│    "studentCode": "123456",           ← từ detectStudentId       │
│    "versionCode": "102",             ← từ detectVersionCode     │
│    "answers": "{\"q1\":\"C\",\"q2\":\"A\",...}",  ← jsonEncode    │
│    "score": "5.5",                   ← từ OmrGradingResult      │
│    "maxScore": "10",                                              │
│    "classId": "class_xyz"                                         │
│  }                                                              │
└──────────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────┐
│                        BACKEND                                    │
│                                                                  │
│  submission.controller.js — scan()                                │
│  ─────────────────────────────────────                           │
│  1. Parse answers (string → object)                              │
│     if (typeof req.body.answers === 'string')                     │
│       req.body.answers = JSON.parse(req.body.answers)            │
│                                                                  │
│  2. submissionService.scan(req.body)                             │
│       │                                                          │
│       ├── exam = await Exam.findById(examId)                    │
│       │                                                          │
│       ├── isAmc = exam.paperEngine === 'amc'                    │
│       │                                                          │
│       └── if (isAmc) → _createFromMobileGraded(exam, data)      │
│              │                                                    │
│              ├── _resolveStudent(studentCode, classId)            │
│              │      → Tìm/verify student từ mã số               │
│              │                                                    │
│              ├── _buildGradedAnswers(answers, examId)            │
│              │      → Map thành Submission answer objects        │
│              │      → Xác định correctAnswer từ ExamVersion    │
│              │                                                    │
│              └── _upsertSubmission(examId, versionCode, ...)    │
│                     → Tạo/cập nhật Submission document          │
│                                                                  │
│  Trả về: { submissionId, totalScore, maxScore, status }
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Legacy Exam — Backend-side (Server-side scanning)

```
┌──────────────────────────────────────────────────────────────────┐
│                        BACKEND                                    │
│                                                                  │
│  POST /api/submissions                                           │
│       │                                                          │
│       ├── exam = await Exam.findById(examId)                    │
│       │                                                          │
│       ├── isAmc = exam.paperEngine === 'amc'                    │
│       │                                                          │
│       └── if (!isAmc) → _scanWithPython(exam, data)             │
│              │                                                    │
│              ├── pythonBridge.processImage(imageBytes, zones)    │
│              │      │                                              │
│              │      ├── Gọi Python script (OMRChecker)           │
│              │      ├── zones = OMRTemplate.zones (legacy mm-based)│
│              │      └── Trả về detectedAnswers, confidence       │
│              │                                                    │
│              ├── _buildGradedAnswers(...)                        │
│              │      → Dùng answerKey từ ExamVersion            │
│              │                                                    │
│              └── _upsertSubmission(...)                         │
│                     → Lưu Submission với pythonResult metadata  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Mô hình Dữ liệu (Data Models)

### 4.1 Exam

```javascript
// server/src/models/exam.model.js
{
  _id: ObjectId,
  title: String,
  status: 'draft' | 'published' | 'in_progress' | 'completed' | 'archived',
  paperEngine: 'pdfkit' | 'amc' | 'auto',    // ← QUYẾT ĐỊNH LUỒNG CHẤM
  omrTemplateId: ObjectId → OMRTemplate,
  numberOfQuestions: Number,
  totalScore: Number,
  questionIds: Array<ObjectId>,
  shuffleConfig: { enabled: Boolean, seed: String },
  classIds: Array<ObjectId>,
  // ...
}
```

### 4.2 ExamVersion

```javascript
// server/src/models/examVersion.model.js
{
  _id: ObjectId,
  examId: ObjectId → Exam,
  versionCode: String,           // VD: "101", "102"
  numberOfQuestions: Number,
  answerKey: Map<String, String>, // VD: { "q1": "C", "q2": "A" }
                                  // ← Authoritative answer key
  paperEngine: 'amc',
  pdfUrl: String,                // URL đề thi PDF (Cloudinary)
  answerSheetPdfUrl: String,     // URL phiếu trả lời
  status: 'draft' | 'ready',
  generatedAt: Date,
  generationErrors: Array<String>,

  // @deprecated Dùng OMRTemplate.templateJson thay thế
  templateJson: Mixed  // ← KHÔNG CÒN SỬ DỤNG
}
```

### 4.3 OMRTemplate

```javascript
// server/src/models/omrTemplate.model.js
{
  _id: ObjectId,
  name: String,
  paperSize: 'A4' | 'A5',
  studentIdDigits: Number,      // VD: 6
  versionCodeDigits: Number,    // VD: 2
  // Legacy zones (dùng cho pdfkit/paperEngine=pdfkit)
  zones: [{
    name: String,
    fieldType: 'student_id' | 'version_code' | 'answers',
    originX: Number,
    originY: Number,
    bubbleWidth: Number,
    bubbleHeight: Number,
    bubblesGap: Number,
    // ...
  }],
  // AMC template (dùng cho paperEngine=amc)
  templateJson: {
    // ← SINGLE SOURCE OF TRUTH cho mobile OMR
    // Xem cấu trúc chi tiết ở mục 2.4
  },
  status: 'active' | 'inactive'
}
```

### 4.4 Submission

```javascript
// server/src/models/submission.model.js
{
  _id: ObjectId,
  examId: ObjectId → Exam,
  versionId: ObjectId → ExamVersion,
  omrTemplateId: ObjectId → OMRTemplate,
  studentId: ObjectId → User,
  studentCode: String,           // Mã số sinh viên (từ mobile scan)
  versionCode: String,          // Mã đề (từ mobile scan)
  classId: ObjectId,

  // Câu trả lời
  answers: [{
    position: Number,            // Thứ tự câu (1, 2, 3...)
    selectedAnswer: String,     // Đáp án đã chọn ("A", "B", "C", "D")
    correctAnswer: String,      // Đáp án đúng
    isCorrect: Boolean,
    score: Number,              // Điểm đạt được
    maxScore: Number             // Điểm tối đa
  }],

  totalScore: Number,
  maxScore: Number,
  finalScore: Number,
  status: 'pending' | 'graded' | 'reviewed' | 'published',

  // Metadata
  images: [{
    type: 'original' | 'annotated' | 'cropped',
    url: String,
    cloudinaryId: String
  }],
  scanMetadata: {
    processingTime: Number,     // ms
    confidence: Number,         // 0-1 (legacy python)
    detectedAt: Date,
    scannerVersion: 'v1' | 'v2'
  },
  // Legacy
  omrSummary: {
    totalMarked: Number,
    totalUnmarked: Number,
    pythonResult: Mixed
  },
  manualOverrides: [{
    overriddenBy: ObjectId,
    overriddenAt: Date,
    originalScore: Number,
    newScore: Number,
    reason: String
  }]
}
```

---

## 5. API Endpoints

### 5.1 Exam Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `POST` | `/api/exams` | Tạo exam mới |
| `GET` | `/api/exams/:id` | Lấy chi tiết exam |
| `PUT` | `/api/exams/:id/questions` | Gán questions |
| `POST` | `/api/exams/:id/versions/generate` | Sinh mã đề |
| `POST` | `/api/exams/:id/compile` | Compile AMC → sinh PDF + templateJson |
| `GET` | `/api/exams/:id/versions` | Danh sách versions |
| `GET` | `/api/exams/:id/template` | **Lấy templateJson cho mobile** |

### 5.2 Submission Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `POST` | `/api/submissions` | Tạo submission (AMC: mobile graded; Legacy: backend scan) |
| `GET` | `/api/submissions/:id` | Chi tiết submission |
| `GET` | `/api/submissions/exam/:id` | Tất cả submissions của exam |
| `PUT` | `/api/submissions/:id/override` | Chấm lại thủ công |
| `GET` | `/api/submissions/statistics/:examId` | Thống kê điểm |

### 5.3 GET /exams/:id/template — Chi tiết

**Request:**
```
GET /api/exams/{examId}/template?versionCode=102
```

**Response (AMC exam):**
```json5
{
  "examId": "exam_abc123",
  "template": {
    // ← OMRTemplate.templateJson (full structure)
    // Xem mục 2.4
  },
  "answerKey": { "q1": "C", "q2": "A", ... },
  "questionScores": { "q1": 0.5, "q2": 0.5, ... },
  "totalScore": 10,
  "numberOfQuestions": 20,
  "versionCode": "102",
  "source": "amc"
}
```

**Mobile sử dụng:**
1. `template.answers` → tọa độ bubble để scan
2. `template.answerKey` → đáp án đúng để chấm điểm
3. `template.studentId` → tọa độ số báo danh
4. `template.versionCodeZone` → tọa độ mã đề

---

## 6. Luồng Chi Tiết: Tạo → Compile → Scan → Grade

### Bước 1: Chuẩn bị (Web)

```
Giáo viên tạo Exam
  → Gán Questions
  → Sinh Versions (VD: 4 versions)
  → Mỗi version: shuffled questions + answerKey
```

### Bước 2: Compile (Web → Backend → WSL2)

```
Giáo viên bấm "Compile AMC"
  → POST /api/exams/:id/compile
  → examPaper.service.js orchestrate:
      1. amcSourceGenerator tạo .tex cho mỗi version
      2. amcCompiler chạy AMC CLI (WSL2)
      3. amcOutputParser đọc .calage.xy + answers.csv
      4. templateBuilder xây dựng templateJson
      5. Lưu PDF lên Cloudinary
      6. Lưu templateJson vào OMRTemplate
      7. Cập nhật ExamVersion với pdfUrl
  → Hoàn thành: đề thi + phiếu OMR + templateJson
```

### Bước 3: Tải Template (Mobile)

```
Học sinh mở app → Chọn bài thi
  → GET /api/exams/:id/template
  → Nhận templateJson (coords + answerKey)
  → Lưu offline (SharedPreferences)
```

### Bước 4: Scan (Mobile)

```
Học sinh chụp ảnh đề thi
  → OmrEngineService.scanAndGrade(imageBytes, templateJson)
      ├── OmrScanner.scan():
      │     1. Crop & warp → chuẩn hóa góc
      │     2. detectStudentId() → "123456"
      │     3. detectVersionCode() → "102"
      │     4. detectAllAnswers() → {q1:"C", q2:"A", ...}
      └── ScoringEngine.grade():
            So sánh detected vs answerKey → tính điểm
  → Hiển thị kết quả trên app
```

### Bước 5: Submit (Mobile → Backend)

```
Học sinh bấm "Nộp bài"
  → POST /api/submissions
      {
        examId, studentCode, versionCode,
        answers: jsonEncode({q1:"C",...}),
        score, maxScore
      }
  → Backend:
      ├── Parse answers string → object
      ├── Kiểm tra exam.paperEngine === 'amc'
      ├── _resolveStudent(studentCode)
      ├── _buildGradedAnswers(answers)
      │     Với mỗi câu: selectedAnswer, correctAnswer, isCorrect, score
      └── _upsertSubmission → Lưu Submission
  → Trả về submissionId, totalScore
```

### Bước 6: Xem Kết Quả (Web)

```
Giáo viên mở ExamDetailPage
  → GET /api/submissions/statistics/:id
  → GET /api/submissions/exam/:id
  → Hiển thị:
      - Danh sách submissions
      - Thống kê điểm (trung bình, cao nhất, thấp nhất)
      - Biểu đồ phân bố điểm
      - Chi tiết từng câu hỏi (tỉ lệ đúng/sai)
```

---

## 7. So sánh: AMC vs Legacy

| Khía cạnh | AMC Exam (mới) | Legacy Exam (pdfkit) |
|---|---|---|
| **Tạo đề** | AMC CLI + LaTeX (WSL2) | pdfkit (Node.js) |
| **Tọa độ OMR** | Từ `.calage.xy` của AMC | Từ công thức mm-based thủ công |
| **Đáp án đúng** | AMC CSV → `ExamVersion.answerKey` | `ExamVersion.answerKey` |
| **Scan OMR** | Mobile (engine_v2) | Backend (Python bridge) |
| **Chấm điểm** | Mobile (ScoringEngine) | Backend |
| **Mobile template** | `OMRTemplate.templateJson` | `OMRTemplate.zones` |
| **Độ chính xác** | Rất cao (AMC chuẩn) | Thấp hơn (tính toán thủ công) |
| **Quyết định runtime** | `exam.paperEngine === 'amc'` | `exam.paperEngine !== 'amc'` |

---

## 8. Xử lý lỗi (Error Handling)

### AMC Compile thất bại

```
examPaper.service.js compile():
  try {
    await amcCompiler.run(...)
  } catch (err) {
    ExamVersion.updateMany({
      status: 'error',
      generationErrors: [err.message]
    })
    throw err
  }
```

### Mobile scan thất bại

```
OmrScanner.scan():
  - Image decode fail → throw 'Failed to decode image'
  - Corner detection fail → fallback resize-to-target
  - Low confidence → gắn flag vào result
```

### Backend submission thất bại

```
OMRSubmissionSyncService.submitResultOnly():
  - Network error → lưu vào pending_submissions (SharedPreferences)
  - Background sync khi có network
```

### Offline mode

```
Mobile:
  1. Scan + grade bình thường
  2. Lưu vào OMRLocalStorage (pending_submissions)
  3. Khi online → syncPendingSubmissions()
```

---

## 9. Data Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    KHI TẠO BÀI THI                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Exam (draft)                                                │
│     │                                                        │
│     ├─→ PUT questions ──→ Exam.questionIds                  │
│     │                                                        │
│     └─→ POST generate versions                               │
│              │                                               │
│              ├─→ ExamVersion[101] (answerKey: {q1:C, q2:A}) │
│              ├─→ ExamVersion[102] (answerKey: {q1:B, q2:C}) │
│              └─→ ExamVersion[103] (answerKey: {q1:A, q2:D}) │
│                                                             │
│     └─→ POST compile                                         │
│              │                                               │
│              ├─→ AMC CLI → PDF đề thi (Cloudinary)          │
│              ├─→ .calage.xy → templateJson                  │
│              │        │                                     │
│              │        └─→ OMRTemplate.templateJson         │
│              │              (SINGLE SOURCE OF TRUTH)         │
│              │                                               │
│              └─→ ExamVersion[xxx].pdfUrl = cloudinaryUrl   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    KHI CHẤM ĐIỂM                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Mobile: GET /exams/:id/template                            │
│              │                                               │
│              └─→ { template: templateJson, answerKey }      │
│                                                             │
│  Mobile: scanAndGrade(image, templateJson)                  │
│              │                                               │
│              ├─→ OmrScanner → detectedAnswers               │
│              │      {q1: "C", q2: "A"}                     │
│              │                                               │
│              └─→ ScoringEngine                              │
│                     with answerKey                          │
│                     → gradedResult                          │
│                                                             │
│  Mobile: POST /submissions                                  │
│              │                                               │
│              ├─→ exam.paperEngine === 'amc' ?               │
│              │                                                │
│              │  YES → _createFromMobileGraded                │
│              │        │                                     │
│              │        ├─→ _resolveStudent(studentCode)      │
│              │        ├─→ _buildGradedAnswers(detected)    │
│              │        │      Lấy correctAnswer từ           │
│              │        │      ExamVersion.answerKey           │
│              │        └─→ Submission document               │
│              │                                                │
│              │  NO  → _scanWithPython (legacy)               │
│              │        │                                     │
│              │        └─→ pythonBridge.processImage()       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Cấu trúc File quan trọng

```
server/src/
├── models/
│   ├── exam.model.js              ← paperEngine field
│   ├── examVersion.model.js       ← answerKey (authoritative)
│   ├── omrTemplate.model.js      ← templateJson (single source)
│   └── submission.model.js        ← answers[], studentCode, versionCode
│
├── controllers/
│   ├── exam.controller.js         ← getExamTemplate() endpoint
│   └── submission.controller.js   ← scan() với JSON.parse answers
│
├── services/
│   ├── exam.service.js            ← CRUD + getVersions
│   ├── examPaper.service.js      ← orchestrate AMC compile
│   ├── submission.service.js      ← AMC vs Legacy path routing
│   └── pythonBridge.service.js    ← singleton instance, legacy only
│
└── amc/
    ├── amcSourceGenerator.js      ← tạo .tex source
    ├── amcCompiler.service.js     ← gọi AMC CLI (WSL2)
    ├── amcOutputParser.js         ← đọc .calage.xy + answers.csv
    ├── templateBuilder.js        ← xây dựng templateJson
    └── amcRunner.service.js      ← runner utilities

client/mobile/lib/
├── domain/omr/engine_v2/
│   ├── omr_engine_service.dart   ← scanAndGrade() → OmScanAndGradeResult
│   ├── omr_scanner.dart          ← scan() → OmrScanResult
│   ├── omr_template.dart         ← fromJson() → OmrTemplate
│   ├── scoring_engine.dart       ← grade() → OmrGradingResult
│   └── omr_models.dart          ← data classes
├── core/network/
│   ├── omr_submission_sync_service.dart  ← POST /submissions
│   └── exam_template_service.dart        ← GET /exams/:id/template
├── core/storage/
│   └── omr_local_storage.dart    ← PendingSubmission (offline)
└── presentation/blocs/omr_scanner/
    └── omr_scanner_bloc.dart     ← state machine, submit flow

client/web/src/
├── pages/
│   ├── ExamDetailPage.tsx        ← compile button, OMR status
│   └── examPageAdapters.ts       ← isOmrTemplateReady(), mapExamDetailData
└── presentation/store/
    └── examStore.ts              ← OMRTemplateJson interface, fetchExamTemplate
```

---

## 11. Checklist trước khi release

- [ ] **Backend**: `exam.paperEngine` được set đúng khi tạo exam
- [ ] **Backend**: `POST /exams/:id/compile` chạy thành công, không lỗi
- [ ] **Backend**: `GET /exams/:id/template` trả về đầy đủ `templateJson`
- [ ] **Backend**: `POST /submissions` (AMC path) lưu đúng studentCode + versionCode
- [ ] **Mobile**: App tải templateJson thành công
- [ ] **Mobile**: Scan cho kết quả đúng với answerKey
- [ ] **Mobile**: Submit gửi đúng payload lên backend
- [ ] **Web**: OMR status badge hiển thị "Sẵn sàng" sau compile
- [ ] **Web**: Nút "Tải OMR Template (mobile)" hoạt động
