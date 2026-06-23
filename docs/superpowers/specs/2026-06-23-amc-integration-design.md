# AMC Integration Design

**Date:** 2026-06-23
**Status:** Draft
**Author:** Smart Grading Agent

## Context

Hệ thống hiện tại dùng `pdfGenerator.js` (PDFKit) để sinh đề thi + OMR sheet. Giới hạn: layout cứng (5 câu/hàng, 4 hàng/trang = 20 câu/page), format không chuẩn AMC, không tương thích với AMC scoring.

Mục tiêu: tích hợp AMC (Auto-Multiple-Choice) để sinh đề thi LaTeX chuẩn + OMR sheet chuẩn quốc tế.

---

## Scope

### In Scope
- Cài đặt AMC + TeXLive + Ghostscript + ImageMagick trên Windows Server
- Tạo `server/src/amc/` module: source generator, runner service, output parser, validator
- Thay thế `pdfGenerator.js` trong exam version generation flow
- Feature flag để toggle giữa `pdfkit` và `amc` engine
- API endpoints mới: `/exams/:id/generate-papers`
- Migration: examVersion model thêm `pdfUrl`, `answerSheetPdfUrl`, `paperEngine`
- Rollback tự động khi AMC lỗi

### Out of Scope
- Thay đổi OMR scanning (OMRChecker Python giữ nguyên)
- Thay đổi exam model schema (ngoài các field mới trên)
- AMC scoring tự động (vẫn dùng OMRChecker)
- AMC GUI workflow (quản lý project AMC bằng giao diện)
- Multi-language support cho đề thi

---

## Architecture

### Environment: WSL2

AMC không có Windows native installer. Trên Windows Server, chạy AMC trong **WSL2 (Windows Subsystem for Linux với Ubuntu)**. Node.js gọi `wsl` command để tương tác với AMC CLI trong WSL.

**Prerequisites trên WSL2 (Ubuntu):**
- TeXLive (LaTeX distribution)
- AMC (`auto-multiple-choice`)
- Ghostscript
- ImageMagick

**WSL2 storage:** AMC working files sống trong WSL2 filesystem (`/home/<user>/amc-projects/`). PDFs được copy ra Windows filesystem qua `/mnt/c/`.

### Data Flow

```
[Exam Created / Version Generated]
          │
          ▼
[amcSourceGenerator.js] ──▶ AMC .tex source file
          │                     (đề thi + OMR sheet)
          ▼
[amcRunner.service.js] ──▶ amc --backend  (scan questions)
          │
          ▼
[amcCompiler.service.js] ──▶ amc --compile  (pdflatex × N versions)
          │
          ▼
[amcOutputParser.js] ──▶ exam PDF + OMR PDF + metadata
          │
          ▼
[Storage] ──▶ update examVersion.pdfUrl / answerSheetPdfUrl
```

### File Structure

```
server/src/
├── amc/
│   ├── amcSourceGenerator.js     # Gen .tex source từ exam data
│   ├── amcRunner.service.js       # Chạy AMC CLI commands
│   ├── amcCompiler.service.js    # Compile + parse output
│   ├── amcOutputParser.js         # Parse AMC stdout/log → metadata
│   ├── amcValidator.js            # Validate output quality
│   └── amc.service.js             # Facade: orchestrates all above
├── utils/
│   └── pdfGenerator.js            # DEPRECATED - giữ lại cho rollback
```

### AMC Working Directory

```
uploads/amc/
└── {examId}/
    ├── project.tex               # AMC source
    ├── project.database/          # AMC internal DB
    ├── {versionCode}.pdf         # Exam + OMR output
    └── logs/                     # Compilation logs
```

---

## Components

### 1. amcSourceGenerator.js

Nhận exam data + question data, sinh AMC `.tex` source.

**Input interface:**
```typescript
interface AmcSourceInput {
  exam: {
    title: string;
    subjectName: string;
    className: string;
    examDate: Date;
    duration: number;
    totalScore: number;
    numberOfVersions: number;
  };
  questions: {
    content: string;
    options: { id: string; content: string }[];
    correctAnswer: string;
    score: number;
  }[];
  config: {
    paperSize: 'A4' | 'A5';
    includeAnswerSheet: boolean;
    schoolHeader: string;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
  };
}
```

**Output:** String chứa `.tex` source theo AMC format chuẩn.

**AMC LaTeX format (sample):**
```latex
\begin{document}
\element{default}{
  \begin{question}{1}
    Nội dung câu hỏi?
    \begin{choices}
      \wrongchoice{Sai A}
      \correctchoice{Đúng B}
      \wrongchoice{Sai C}
      \wrongchoice{Sai D}
    \end{choices}
  \end{question}
}
\end{document}
```

**Key responsibilities:**
- Chuyển đổi question content sang LaTeX (escape special chars, support math)
- Map options: `isCorrect: true` → `\correctchoice`, false → `\wrongchoice`
- Áp dụng shuffle config (AMC tự shuffle nếu cấu hình)
- Điều chỉnh số câu trên mỗi trang theo `paperSize`
- Ghi file vào `uploads/amc/{examId}/project.tex`

### 2. amcRunner.service.js

Quản lý AMC CLI lifecycle.

**Methods:**
```typescript
class AmcRunnerService {
  // Kiểm tra AMC + TeXLive đã được cài đặt
  async validateEnvironment(): Promise<EnvironmentCheck>

  // Tạo project directory + chạy backend scan
  async backendScan(projectDir: string, texSource: string): Promise<void>

  // Compile N versions
  async compileVersions(projectDir: string, numVersions: number, timeoutSeconds: number): Promise<CompilationResult>

  // Export PDFs
  async exportPdfs(projectDir: string, numVersions: number): Promise<string[]>

  // Cleanup working directory
  async cleanup(projectDir: string): Promise<void>
}
```

**Environment checks trên startup:**
- `pdflatex --version` → TeXLive
- `amc --version` → AMC
- `gs --version` → Ghostscript
- `convert --version` → ImageMagick

**Error handling:**
- AMC CLI not found → throw `AmcEnvironmentError`
- Compilation timeout → kill process, cleanup, throw `AmcTimeoutError`
- Partial failure → log details, return partial results

### 3. amcCompiler.service.js

Wrapper quản lý compile cycle: backendScan → compile → export.

```typescript
class AmcCompilerService {
  async compile(options: {
    projectDir: string;
    texSource: string;
    numVersions: number;
    timeoutSeconds?: number; // default: 120s per version
  }): Promise<CompilationResult>
}
```

### 4. amcOutputParser.js

Parse AMC stdout/stderr và filesystem output.

**Output interface:**
```typescript
interface AmcOutput {
  versionPdfs: {
    versionCode: string;
    pdfPath: string;
    pageCount: number;
    omrPdfPath: string | null; // có thể combined
  }[];
  totalVersions: number;
  compilationTime: number;
  errors: string[];
}
```

### 5. amcValidator.js

Validate output PDFs từ AMC.

**Checks:**
- File exists và readable
- Page count hợp lý (>= số câu hỏi / 5)
- PDF không corrupt
- OMR zones visible (basic image check)

### 6. amc.service.js (Facade)

Entry point cho toàn bộ AMC pipeline.

```typescript
class AmcService {
  async generateExamPapers(
    examId: string,
    versionCodes: string[],
    options?: { timeoutSeconds?: number }
  ): Promise<ExamPaperResult>

  async regenerateVersion(
    examId: string,
    versionCode: string
  ): Promise<VersionPaperResult>

  async cleanupExam(examId: string): Promise<void>
}
```

---

## API Changes

### New Endpoint

**POST /api/v1/exams/:id/generate-papers**

Regenerate exam papers cho một exam (gọi sau khi tạo versions hoặc khi cần regenerate).

```typescript
// Request body
{
  paperEngine: 'pdfkit' | 'amc' | 'auto'; // default: 'auto'
  forceRegenerate: boolean; // default: false
}

// Response
{
  success: boolean;
  engine: 'pdfkit' | 'amc';
  versions: {
    versionCode: string;
    pdfUrl: string;
    answerSheetPdfUrl: string | null;
    status: 'ready' | 'failed';
    error?: string;
  }[];
  fallback: boolean; // true nếu AMC fail và dùng pdfkit
}
```

### ExamVersion Model Changes

Thêm các field mới:

```javascript
examVersionSchema.add({
  pdfUrl: { type: String },           // URL đề thi PDF
  answerSheetPdfUrl: { type: String }, // URL OMR sheet riêng (hoặc combined)
  paperEngine: {
    type: String,
    enum: ['pdfkit', 'amc'],
    default: 'pdfkit'
  },
  amcProjectPath: { type: String },    // Đường dẫn AMC working dir
  generatedAt: { type: Date },
  generationErrors: [String]
});
```

### Exam Model Changes

```javascript
examSchema.add({
  paperEngine: {
    type: String,
    enum: ['pdfkit', 'amc', 'auto'],
    default: 'auto'
  }
});
```

### Export Endpoints (Updated)

| Route | Behavior Change |
|-------|----------------|
| `GET /exams/:id/export` | Serve từ `examVersion.pdfUrl` thay vì generate on-the-fly. Nếu chưa có → trigger generation. |
| `GET /exams/:id/versions/:code/pdf` | Serve từ `examVersion.pdfUrl` |
| `GET /exams/:id/versions/export-all` | Zip các file đã có trong storage |

### exam.service.js Changes

`generateExamVersions()` → thêm step cuối:
```javascript
// Sau khi tạo ExamVersion records
if (exam.paperEngine === 'amc' || exam.paperEngine === 'auto') {
  try {
    await amcService.generateExamPapers(exam._id, versionCodes);
  } catch (err) {
    if (exam.paperEngine === 'auto') {
      // Fallback to pdfkit
      await fallbackPdfkitGeneration(exam, versionCodes);
    } else {
      throw err;
    }
  }
}
```

---

## Migration Plan

### Phase 1: Infrastructure Setup ( không ảnh hưởng production)

1. Cài đặt trên server:
   - TeXLive (LaTeX distribution for Windows)
   - AMC (Auto-Multiple-Choice)
   - Ghostscript
   - ImageMagick
2. Verify: `amc --version`, `pdflatex --version`
3. Tạo `server/src/amc/` với skeleton module

### Phase 2: Core Implementation (development)

1. `amcSourceGenerator.js` — test với sample exam data
2. `amcRunner.service.js` — test full CLI pipeline
3. `amcOutputParser.js` + `amcValidator.js`
4. `amc.service.js` facade
5. Integration vào `exam.service.js` — behind feature flag

### Phase 3: Feature Flag Rollout

1. Thêm `paperEngine` field vào exam model
2. API endpoint `POST /exams/:id/generate-papers`
3. Toggle trong CreateExamPage (advanced settings)
4. Auto-detect: nếu server có AMC → dùng AMC, không thì pdfkit

### Phase 4: Deprecation

1. Default chuyển sang `'amc'`
2. `pdfGenerator.js` giữ lại với comment DEPRECATED
3. Legacy exams vẫn hoạt động bình thường

---

## Rollback Strategy

| Scenario | Action |
|----------|--------|
| AMC CLI not found | `validateEnvironment()` return false → auto-use pdfkit |
| AMC CLI lỗi | Fallback tự động sang pdfkit, log warning |
| 1 version lỗi | Generate lại version đó, không block toàn bộ |
| Compile timeout | Kill process, retry 1 lần, fail thì fallback |
| Toàn bộ AMC lỗi | Set `paperEngine: 'pdfkit'` → rollback ngay |

---

## Testing

- **Unit test:** `amcSourceGenerator` — verify output `.tex` format correctness
- **Integration test:** `amcRunner` — verify full CLI pipeline end-to-end
- **E2E:** tạo exam → generate versions → download PDF → verify content bằng OMR scan

---

## Open Questions

| # | Question | Resolution |
|---|----------|------------|
| 1 | AMC trên Windows | **WSL2** — AMC không có Windows native. Chạy trong Ubuntu WSL2. Node.js gọi `wsl` command để tương tác với AMC CLI trong WSL. |
| 2 | Math rendering | **Không cần** — question.content là plain text, không có math field. Nếu cần trong tương lai, thêm sau. |
| 3 | OMR combined vs separate | **Combined** — giữ format giống hệt hệ thống cũ (đề + OMR trong 1 PDF). Tách `answerSheetPdfUrl` bằng page splitting sau khi generate. |
| 4 | Version code mapping | AMC sinh `001.pdf`, `002.pdf`... → Map với `ExamVersion.versionCode` theo thứ tự index. |
