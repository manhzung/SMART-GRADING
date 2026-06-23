# SPEC: AMC Integration — Exam Detail Page

**Date:** 2026-06-23
**Author:** Agent

---

## 1. Concept & Vision

Phần **Phiên bản đề thi** trong ExamDetailPage cần hiển thị đầy đủ thông tin về AMC pipeline: engine đang dùng, trạng thái compile, lỗi nếu có, và cho phép trigger compile AMC. Giao diện cần rõ ràng với teacher nhìn vào biết ngay: đề nào đã generate PDF, đề nào chưa, engine nào được dùng, và làm sao để compile lại hoặc compile lần đầu.

---

## 2. Design Language

### Color Palette

| Purpose | Color | Usage |
|---------|-------|-------|
| AMC Engine Badge | `#2563EB` (blue-600) | Engine badge `AMC` |
| PDFKit Badge | `#7C3AED` (violet-600) | Engine badge `PDFKit` |
| Auto Badge | `#D97706` (amber-600) | Engine badge `Auto` |
| PDF Ready | `#16A34A` (green-600) | Status badge `Đã sinh` |
| PDF Pending | `#DC2626` (red-600) | Status badge `Chưa sinh` |
| PDF Compiling | `#2563EB` (blue-600) | Status badge `Đang compile` |
| Error | `#DC2626` (red-600) | Error message |
| Loading | `#6B7280` (gray-500) | Skeleton loader |

### Typography

Dùng font chữ hiện tại của dự án. Kích thước:
- Badge labels: 11px, uppercase, font-weight 600
- Body text: 13px
- Section title: 15px, font-weight 600
- Version code: 16px, font-weight 700

### Spacing & Layout

- Version card: grid responsive 2-3 columns (tùy viewport)
- Card padding: 16px
- Gap between cards: 16px
- Badge gap: 8px

---

## 3. Data Model

### ExamVersion (from Backend)

```typescript
interface ExamVersion {
  _id: string;
  examId: string;
  versionCode: string;           // "101", "102"...
  numberOfQuestions: number;
  questions: ExamVersionQuestion[];
  distribution: Record<string, number>;
  submissionCount: number;
  createdAt: string;

  // AMC fields (currently missing in frontend)
  paperEngine?: 'pdfkit' | 'amc' | 'auto';
  pdfUrl?: string | null;       // null = chưa generate
  answerSheetPdfUrl?: string | null;
  amcProjectPath?: string | null;
  generatedAt?: string | null;
  generationErrors?: string[];
  templateJson?: object | null;  // null = placeholder coords
}
```

### Frontend Adapted Type

```typescript
interface ExamVersionAMC {
  code: string;
  status: 'Sẵn sàng' | 'Đã sinh PDF' | 'Chưa sinh' | 'Đang compile' | 'Lỗi';
  updatedAt: string;
  engine: 'amc' | 'pdfkit' | 'auto';
  pdfUrl: string | null;
  generatedAt: string | null;
  hasErrors: boolean;
  errors: string[];
  templateReady: boolean;        // true nếu templateJson != null
}
```

---

## 4. API Design

### Generate Papers (Compile)

```
POST /api/v1/exams/:id/generate-papers
Body: { paperEngine?: 'pdfkit' | 'amc' | 'auto', forceRegenerate?: boolean }
Response: {
  success: boolean,
  engine: string,
  fallback: boolean,
  versions: Array<{
    versionCode: string,
    pdfUrl: string,
    status: 'ready' | 'failed',
    errors: string[]
  }>,
  totalCompilationTime: number
}
```

**Bug fix cần thiết:** Validation `validateGeneratePapers` hiện tại sai cấu trúc params:

```javascript
// HIỆN TẠI (sai)
params: Joi.object({ id: Joi.object().keys({ id: Joi.string()... }) })

// CẦN SỬA thành:
params: Joi.object({ id: Joi.string().regex(...) })
```

---

## 5. UI Components

### 5.1 Version Card — AMC Panel

Mỗi card trong grid `Phiên bản đề thi` cần thêm phần AMC:

```
┌─────────────────────────────────────────────────────────┐
│  MÃ ĐỀ: 101                                    [✓]     │
│─────────────────────────────────────────────────────────│
│  Trạng thái:  Đã sinh PDF    Engine: AMC              │
│  Cập nhật:    23/06/2026                               │
│  ─────────────────────────────────────────────────────│
│  [PDF] Đề thi    [Đáp án]    [🔄 Compile lại]          │
│─────────────────────────────────────────────────────────│
│  ⚠️ Lỗi: AMC exit code 1 tại question 15             │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Version Card States

| State | Visual |
|-------|--------|
| Chưa compile (`pdfUrl == null`) | Badge `Chưa sinh`, nút `Compile AMC` màu xanh |
| Đang compile | Badge `Đang compile`, spinner, nút disabled |
| Đã compile thành công | Badge `Đã sinh PDF`, nút `Tải PDF`, nút `Compile lại` |
| Có lỗi (`generationErrors.length > 0`) | Badge `Lỗi` màu đỏ, hiển thị lỗi đầu tiên |

### 5.3 Compile Modal

Trigger bởi nút "Compile AMC" ở header section (ngoài cards).

```
┌────────────────────────────────────────────────────────┐
│  Compile đề thi với AMC                          [X] │
│────────────────────────────────────────────────────────│
│  Engine:  ○ Auto (Khuyến nghị)                       │
│           ○ AMC    ○ PDFKit                           │
│                                                        │
│  □ Buộc tạo lại (xóa PDF cũ)                        │
│                                                        │
│  Cảnh báo: Quá trình compile có thể mất 1-3 phút.    │
│                                                        │
│              [Hủy]  [Bắt đầu Compile]                │
└────────────────────────────────────────────────────────┘
```

### 5.4 Template Status Indicator

Một badge nhỏ bên dưới mỗi version card:
- `Coords: Placeholder` — templateJson có coords rỗng (trạng thái hiện tại)
- `Coords: Ready` — templateJson có đầy đủ coordinates (sau khi import AMC CSV)

---

## 6. Component Inventory

### EngineBadge
- Props: `engine: 'amc' | 'pdfkit' | 'auto'`
- Visual: Small pill badge với màu tương ứng

### VersionStatusBadge
- Props: `status: 'generated' | 'pending' | 'compiling' | 'error'`
- Visual: Colored badge

### CompileModal
- Props: `examId: string`, `onClose: () => void`, `onSuccess: () => void`
- States: idle, compiling (with progress), success, error
- Calls `generatePapers` API

### AMCErrorPanel
- Props: `errors: string[]`
- Visual: Collapsible panel với icon warning, danh sách lỗi

### CompileProgressBar
- Props: `progress: number` (0-100)
- Visual: Animated progress bar, hiển thị version đang compile

---

## 7. File Changes

| File | Change |
|------|--------|
| `server/src/validations/exam.validation.js` | Fix `validateGeneratePapers` params structure |
| `client/web/src/presentation/store/examStore.ts` | Add AMC fields to `ExamVersion` interface; add `generatePapers` action; add `isCompiling` state |
| `client/web/src/pages/examPageAdapters.ts` | Add AMC fields to `ExamDetailData.versions`; update `mapExamDetailData` |
| `client/web/src/pages/ExamDetailPage.tsx` | Rewrite version cards grid với AMC panel; add compile modal; add compile button in header |
| `client/web/src/pages/ExamDetailPage.module.css` | Add styles for AMC UI elements |

---

## 8. Implementation Order

1. Fix backend validation bug (`validateGeneratePapers` params)
2. Update `ExamVersion` interface in store (add AMC fields)
3. Add `generatePapers` action + `isCompiling` state to store
4. Update adapter: `mapExamDetailData` enriches versions with AMC data
5. Build AMC version card UI + status badges
6. Build compile modal with engine selector
7. Wire compile modal to store action
8. Add `AMCErrorPanel` component
9. CSS styling
10. Test end-to-end

---

## 9. Error Handling

- **AMC not available:** Show warning banner: "AMC không khả dụng trên server này. Sử dụng PDFKit thay thế."
- **Compile timeout (>120s):** Show error: "Compile mã đề vượt quá thời gian. Thử lại hoặc dùng PDFKit."
- **Partial failure (some versions fail):** Version cards show individual status; banner at top says "N lỗi trong N đề"
- **Network error:** Toast notification với retry option
- **Validation error (400):** Show specific message from backend
