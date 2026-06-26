# Grading Flow Redesign — Post-AMC Integration

## Status: DRAFT — Chờ review

---

## 1. Vấn đề hiện tại

### 1.1 Hai hệ thống OMR chạy song song

| Thành phần | Legacy (trước AMC) | AMC-based (mới) |
|---|---|---|
| **Tọa độ bubble** | `OMRTemplate.zones` (mm config, tính toán gap) | `OMRTemplate.templateJson` (per-bubble `{x,y,w,h}` từ `.calage.xy`) |
| **Chuyển đổi** | `convertTemplate()` zones → Flutter `FieldBlock[]` | `templateBuilder.js` calage → `templateJson` |
| **Scanner (mobile)** | `engine/` (FieldBlock gap-based) | `engine_v2/` (per-bubble coords) |
| **Scanner (server)** | Python OMRChecker (nhận `zones`) | Python nhận `templateJson` |
| **Điểm số** | `ExamVersion.answerKey` (Map) | `ExamVersion.answerKey` (Map) |

### 1.2 Điểm nghẽn trong `submission.service.js`

```js
// DÒNG 40-43: gọi Python với hai format khác nhau tùy trường hợp
pythonResult = await pythonBridge.processImage({
  image: imageBase64,
  template: omrTemplate?.templateJson || omrTemplate?.zones || {},
});
```

→ Python không biết nhận format nào. Legacy flow dùng `zones` (tính algorithmically), AMC flow dùng `templateJson` (per-bubble coords). **Confusion!**

### 1.3 `ExamVersion.templateJson` — đã loại bỏ khỏi web (đúng)

`ExamVersion.templateJson` là bản copy trùng lặp của `OMRTemplate.templateJson`. Đã bỏ khỏi web client. Trên BE vẫn còn trong schema nhưng không còn được dùng.

### 1.4 Scoring trùng lặp

- `Submission.answers[i].score` được tính ở **Node.js** (`submission.service.js` dòng 123-132) = `scorePerQuestion`
- Mobile engine có `ScoringEngine` riêng
- Python có `scoring` riêng
→ Ba nơi tính điểm, không nhất quán.

### 1.5 `getExamTemplate` endpoint

```js
// exam.controller.js — trả về template + answerKey
res.json({
  template: templateJson,       // từ OMRTemplate
  examId, versionCode,
  answerKey: answerKeyObj,      // từ ExamVersion
  totalScore, numberOfQuestions,
});
```

→ Mobile dùng endpoint này để scan. Nhưng answerKey ở đây chỉ là `Map<position, optionLetter>` (ví dụ `{1: "A", 2: "B"}`), trong khi mobile engine dùng `answers: {q1: {A: {x,y,w,h}, ...}}` từ `templateJson`. **Hai format khác nhau!**

---

## 2. Thiết kế lại — Nguyên tắc

### 2.1 Một nguồn chân lý duy nhất

```
OMRTemplate.templateJson  ← AMC buildTemplate() tạo ra
    ↓
    ├── Mobile scanner (engine_v2) — dùng answers{} + answerKey{}
    │   └── POST /submissions với detected bubbles
    │
    └── Server grading — dùng answerKey{} để chấm điểm
```

**Mọi thứ lấy từ `OMRTemplate.templateJson`. Không còn `OMRTemplate.zones` cho AMC exams.**

### 2.2 Luồng chấm điểm mới

```
┌─────────────────────────────────────────────────────────────────┐
│  BƯỚC 1: TẠO ĐỀ (Web)                                          │
│  Teacher tạo exam + chọn OMRTemplate (A4-50Q, A5-20Q, ...)     │
└─────────────────────────────┬───────────────────────────────────┘
                              │ createExam()
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  BƯỚC 2: SINH PHIÊN BẢN (Web)                                  │
│  generateVersions() → ExamVersion với answerKey per version     │
│  (shuffle questions/options, lưu vào DB)                         │
└─────────────────────────────┬───────────────────────────────────┘
                              │ generatePapers()
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  BƯỚC 3: COMPILE AMC (Backend)                                  │
│  examPaperService.generateAllPapers()                            │
│  1. AMC tex → PDF (4 đề)                                        │
│  2. AMC answer-sheet.tex → calage.xy + PDF                       │
│  3. templateBuilder.buildTemplate(calage, csvData)              │
│     → OMRTemplate.templateJson (per-bubble coords @ scan DPI)    │
│  4. Lưu templateJson vào OMRTemplate.templateJson ← SNOTI      │
│  5. Upload PDF lên Cloudinary                                   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ OMRTemplate.templateJson đã sẵn sàng
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  BƯỚC 4: IN ĐỀ + PHIẾU TRẢ LỜI (Web)                         │
│  • Tải đề PDF (ExamVersion.pdfUrl)                             │
│  • Tải OMR template JSON (GET /exams/:id/template)               │
│    → Trả { template, answerKey, totalScore }                     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  BƯỚC 5: HỌC SINH LÀM BÀI                                     │
│  • Điền phiếu OMR trên giấy                                     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  BƯỚC 6: SCAN PHIẾU (Mobile)                                   │
│  1. Camera chụp ảnh phiếu OMR                                   │
│  2. engine_v2/OmrEngineService.scanAndGrade()                   │
│     ├── OmrScanner.scan(): đọc bubble tại {x,y,w,h} từ templateJson│
│     ├── ScoringEngine.grade(): chấm điểm bằng templateJson.answerKey│
│     └── Trả OmrGradingResult { totalScore, verdicts[] }         │
│  3. POST /submissions với:                                      │
│     { examId, versionCode, studentCode, answers{}, score }        │
└─────────────────────────────┬───────────────────────────────────┘
                              │ submitResultOnly()
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  BƯỚC 7: LƯU SUBMISSION (Backend)                              │
│  submissionService.createFromOMR()                                │
│  1. Tạo Submission record với answers[] đã chấm                  │
│  2. Cập nhật exam.totalSubmissions                              │
│  3. Thông báo điểm cho học sinh                                │
│  *** KHÔNG gọi Python bridge nữa — đã chấm ở mobile ***         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Chi tiết kỹ thuật

### 3.1 `OMRTemplate.templateJson` — định dạng chuẩn

```js
{
  examId: "...",
  title: "Kiểm tra giữa kỳ 1",
  paperSize: "A4",
  scanDpi: 300,
  scale: 4.167,          // 300/72
  pageWidth: 2480,        // px @ 300 DPI
  pageHeight: 3508,

  studentId: {            // Số báo danh
    digits: 7,
    coords: [
      { x: 50, y: 100, w: 25, h: 25 },  // digit 1, value 0-9
      { x: 80, y: 100, w: 25, h: 25 },  // digit 2
      // ...
    ]
  },

  versionCodeZone: {      // Mã đề
    digits: 2,
    coords: [
      { x: 50, y: 200, w: 25, h: 25 },  // về 1-4
      { x: 80, y: 200, w: 25, h: 25 },
    ]
  },

  answers: {
    "q1": { "A": { x: 50, y: 300, w: 25, h: 25 }, "B": {...}, "C": {...}, "D": {...} },
    "q2": { "A": {...}, "B": {...}, "C": {...}, "D": {...} },
    // ...
  },

  answerKey: {             // Đáp án chuẩn — dùng để GRADE
    "q1": "A",
    "q2": "C",
    // ...
  },

  questionScores: {         // Điểm per câu
    "q1": 0.5,
    "q2": 0.5,
    // ...
  },

  totalScore: 10,
  numberOfQuestions: 20,
  preProcessors: [...],
  autoAlign: false,
  generatedAt: "2026-06-24T10:00:00Z",
  source: "amc-calage"
}
```

### 3.2 Endpoint contract

#### `GET /exams/:id/template` → Mobile scan

```json
{
  "template": { /* full OMRTemplate.templateJson */ },
  "examId": "...",
  "versionCode": "101",
  "answerKey": { "1": "A", "2": "C", "3": "B" },  // để verify sau scan
  "totalScore": 10,
  "numberOfQuestions": 20
}
```

#### `GET /omr-templates/exam/:examId` → Legacy Flutter FieldBlocks

```json
{
  "data": { /* FieldBlock[] layout — chỉ cho legacy exams không dùng AMC */ }
}
```

#### `POST /submissions` → Mobile submit

```json
{
  "examId": "...",
  "versionCode": "101",
  "studentCode": "0012001",
  "answers": { "1": "A", "2": "C", "3": null },
  "totalScore": 8.5,
  "maxScore": 10,
  "images": { "original": { "url": "...cloudinary..." } }
}
```

### 3.3 Xóa hoàn toàn Python bridge cho AMC

```js
// submission.service.js — THAY ĐỔI
async scan(data) {
  // VỚI AMC exams: mobile scan + grade rồi gửi kết quả lên
  // → KHÔNG cần gọi Python nữa
  const isAmcExam = await this._isAmcExam(examId);
  if (isAmcExam) {
    // Mobile đã scan + grade → chỉ lưu
    return this.createFromOMR(data, req.user.id);
  }
  // VỚI Legacy exams (không có AMC): vẫn gọi Python
  // → fallback cho legacy
  return this._scanWithPython(data);
}
```

### 3.4 `Submission` model — đơn giản hóa

```js
{
  examId,        // ref
  versionId,     // ref → ExamVersion
  omrTemplateId, // ref → OMRTemplate
  studentId,
  studentCode,
  classId,
  answers: [
    {
      position: 1,
      questionId: "...",
      selectedAnswer: "A",    // detected từ mobile
      correctAnswer: "A",     // từ ExamVersion.answerKey
      isCorrect: true,
      score: 0.5,
      maxScore: 0.5,
    }
  ],
  totalScore: 8.5,
  maxScore: 10,
  percentage: 85,
  status: 'scanned' | 'completed',
  images: { original: {...} },
  scanMetadata: {...},
  manualOverrides: [...],
}
```

### 3.5 `ExamVersion` — sau khi bỏ `templateJson`

```js
{
  examId,           // ref
  versionCode: "101",
  numberOfQuestions: 20,
  questions: [
    { position, questionId, originalPosition, shuffledOptions }
  ],
  answerKey: Map("1" → "A", "2" → "C"),  // ← CHỈ nguồn của đáp án
  pdfUrl: "cloudinary://...",
  answerSheetPdfUrl: "cloudinary://...",
  submissionCount: 0,
  generatedAt: Date,
  generationErrors: [],
}
```

### 3.6 `OMRTemplate` — sau khi bỏ `zones` cho AMC exams

```js
{
  name: "A4-50Q AMC",
  code: "A4-50Q",
  description: "...",
  pageConfig: {...},      // chỉ dùng cho legacy PDF generator
  templateJson: {          // AMC: per-bubble coords + answerKey
    studentId: {...},
    answers: {...},
    answerKey: {...},
  },
  // XÓA hoàn toàn: zones, scannerConfig, validationRules (cho AMC)
}
```

---

## 4. Phân tách rõ ràng: Legacy vs AMC

| Trường hợp | Exam.paperEngine | Nguồn templateJson | Scanner | Grading |
|---|---|---|---|---|
| Exam cũ (trước AMC) | `pdfkit` / null | `OMRTemplate.zones` | Python OMRChecker | Python |
| Exam mới (AMC) | `amc` | `OMRTemplate.templateJson` | Mobile engine_v2 | Mobile (hoặc Node.js) |

**Sau redesign:**
- Legacy exams vẫn hoạt động như cũ (Python scan + grade)
- AMC exams: mobile scan rồi submit kết quả lên BE

---

## 5. Backward Compatibility

### 5.1 Legacy exams (không có `paperEngine: 'amc'`)
- `OMRTemplate.zones` vẫn tồn tại và dùng cho:
  - Web: `exportOmrTemplatePdf()` (PDF generator)
  - Server: `pythonBridge.processImage()` khi mobile submit
- **Không xóa `zones`** — chỉ không dùng cho AMC exams

### 5.2 Dữ liệu hiện có
- `ExamVersion.templateJson` đang tồn tại → đánh dấu deprecated, không dùng
- `OMRTemplate.templateJson` đang có giá trị → tiếp tục dùng
- `Submission` records đang có → không cần migrate

---

## 6. TODO — Thứ tự triển khai

### Phase 1: Backend — Dọn dẹp luồng
- [ ] `submission.service.js` — tách rõ AMC vs Legacy path
- [ ] `exam.controller.js` — đảm bảo `getExamTemplate` trả về đúng format
- [ ] `examPaper.service.js` — verify `templateJson` được lưu đúng vào `OMRTemplate`
- [ ] Xóa `ExamVersion.templateJson` khỏi schema (optional, đánh dấu deprecated)
- [ ] Thêm `isAmcExam()` helper

### Phase 2: Mobile — Đồng bộ engine_v2
- [ ] Mobile: verify `engine_v2` dùng đúng `templateJson.answerKey` để grade
- [ ] Mobile: `OmrTemplate.fromJson()` parse đúng `studentId.coords` vs `answers[q1][A]`
- [ ] Mobile: submit kết quả (answers + score) qua `POST /submissions`

### Phase 3: Web — UI updates
- [ ] `ExamDetailPage` — hiển thị "OMR: Sẵn sàng" dựa trên `OMRTemplate.templateJson`
- [ ] Nút tải `templateJson` cho mobile

### Phase 4: Cleanup
- [ ] Xóa dead code: Python bridge cho AMC path
- [ ] Xóa `ExamVersion.templateJson` khỏi `getVersions` select
- [ ] Xóa `convertTemplate()` cho AMC exams (chỉ giữ cho legacy)

---

## 7. Files cần thay đổi

### Backend
| File | Thay đổi |
|---|---|
| `submission.service.js` | Tách AMC vs Legacy path; bỏ Python cho AMC |
| `examPaper.service.js` | Verify lưu templateJson đúng; comment rõ ràng |
| `examVersion.model.js` | Bỏ `templateJson` field (optional) |
| `exam.controller.js` | `getExamTemplate` đảm bảo format chuẩn |

### Mobile
| File | Thay đổi |
|---|---|
| `engine_v2/omr_engine_service.dart` | Verify grading dùng `templateJson.answerKey` |
| `core/network/exam_template_service.dart` | Verify parse đúng format |
| `core/network/omr_submission_sync_service.dart` | Submit answers + score |

### Web
| File | Thay đổi |
|---|---|
| `examStore.ts` | Đã làm ở session trước |
| `examPageAdapters.ts` | Đã làm ở session trước |
| `ExamDetailPage.tsx` | Đã làm ở session trước |
| `submissionStore.ts` | Thêm `gradingResult.answerKey` nếu cần |
