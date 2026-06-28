# Spec: Student Scores Modal in Class Detail (Teacher View)

**Date:** 2026-06-28
**Status:** Approved (pending user review)
**Owner:** SMART GRADING web team
**Scope:** Client web only (no backend changes)

---

## 1. Problem

In the teacher's Class Detail page (`/classes/:id`), the existing `ClassExamsSection` shows the list of exams assigned to a class, but there is **no way for the teacher to see how each student scored on a given exam** directly from the class page.

Teachers currently have to leave the page and dig through other screens. We need a fast, in-context way to view per-student scores for any exam in a class, and to export the result to Excel for reporting.

---

## 2. Goals

- Add a "Xem điểm" action on each exam row in `ClassExamsSection`.
- Open a modal that shows per-student scores for the selected exam.
- Allow exporting the score table to Excel.
- Stay inside the existing role-aware teacher flow (no new routes, no nav changes).

## 3. Non-Goals

- No new backend endpoints (we use existing `/submissions/exam/:examId`).
- No editing of scores in the modal (read-only view).
- No drill-down to per-question detail inside this modal.
- No mobile redesign of the class page; modal is responsive but desktop-first.

---

## 4. User Flow

1. Teacher is on `/classes/:id` (ClassDetailPage).
2. Teacher scrolls to **Bài kiểm tra của lớp** section.
3. On any exam row, teacher clicks the new **"Xem điểm"** button.
4. A modal opens, showing the score table for that exam.
5. Teacher can click **"Xuất Excel"** to download a `.xlsx` of the table.
6. Teacher clicks **"Đóng"** (or X / overlay) to close.

---

## 5. Architecture

### Files added

| Path | Purpose |
| --- | --- |
| `client/web/src/presentation/components/shared/ExamScoresModal.tsx` | Modal component, fetches via React Query, renders table, handles export |
| `client/web/src/presentation/components/shared/ExamScoresModal.module.css` | Modal styling |
| `client/web/src/presentation/components/shared/__tests__/ExamScoresModal.test.tsx` | Component tests (RTL + Jest) |
| `client/web/src/presentation/components/shared/__tests__/ExamScoresModal.helpers.test.ts` | Unit tests for pure helpers (`getGradeLabel`, `formatScore`) |

### Files modified

| Path | Change |
| --- | --- |
| `client/web/src/pages/ClassExamsSection.tsx` | Add "Xem điểm" button per exam row, add local state `viewingExamId`, render `<ExamScoresModal>`. No new store methods. |

### Files NOT touched

- `client/web/src/pages/ClassDetailPage.tsx`
- `client/web/src/presentation/store/submissionStore.ts` (existing store kept; modal calls the API directly via `useQuery`)
- `client/web/src/presentation/routes/AppRoutes.tsx`
- Backend (`server/src/**`)

---

## 6. Component Design

### 6.1 `ExamScoresModal`

**Props**

```ts
interface ExamScoresModalProps {
  open: boolean;
  onClose: () => void;
  examId: string | null;        // null when closed
  examTitle: string;
  examSubject?: string;
  examDate?: string;
  classId: string;              // used to fetch class roster
  className?: string;           // used in Excel filename
}
```

**State / data flow**

- Use `@tanstack/react-query` (`useQuery`) — not the Zustand submission store — because data is local to the modal lifecycle and we want automatic caching keyed by `examId`.
- Two parallel queries:
  - `useQuery(['submissions', examId])` → `GET /submissions/exam/:examId`
  - `useQuery(['class', classId, 'students'])` → `GET /classes/:id` (existing endpoint exposed by `classStore.fetchClassById`); the returned `ClassItem.studentIds` is the roster. We do **not** assume a `subject` field on `BackendExam` — `examSubject` prop is passed by the caller (from the existing class exam data shape in `ClassExamsSection`) and is optional.

**Why we fetch the class roster**

`GET /submissions/exam/:examId` returns only students who submitted. To mark "Chưa nộp" for the rest of the class, we merge with the class roster and detect missing entries.

If fetching the roster fails, we degrade gracefully: show only submitted students, no "Chưa nộp" rows.

### 6.2 Table columns

| STT | Học sinh | Mã HS | Điểm | Trạng thái | Xếp loại | Ngày nộp |
|-----|----------|-------|------|------------|----------|----------|

- **Học sinh**: `studentId.name` (from populated `BackendStudent`)
- **Mã HS**: `studentId.studentCode` (fallback "—")
- **Điểm**: `${totalScore} / ${maxScore}` (format with 1 decimal where applicable)
- **Trạng thái** (use the **actual** `BackendSubmission.status` values):
  - `completed` → badge xanh "Hoàn thành"
  - `scanned` → badge xám "Đã quét"
  - `manual_review` → badge vàng "Chờ chấm thủ công"
  - `appealed` → badge cam "Đang phúc khảo"
  - `pending` → badge vàng nhạt "Đang xử lý"
  - not in roster's submissions → "Chưa nộp" (gray, italic)
- **Xếp loại**: derived from `totalScore / maxScore` via `getGradeLabel`:
  - ≥ 0.9 → "Xuất sắc"
  - ≥ 0.8 → "Giỏi"
  - ≥ 0.65 → "Khá"
  - ≥ 0.5 → "Trung bình"
  - < 0.5 → "Yếu"
  - no submission → "—"
- **Ngày nộp**: `submittedAt` formatted `dd/MM/yyyy HH:mm`, "—" if missing

### 6.3 Header / footer

- **Header**: title `"Điểm bài thi: <examTitle>"` + subline `"<subject> · Ngày thi: <dd/MM/yyyy>"` + close X button
- **Toolbar above table**:
  - Left: `"<submittedCount> / <totalStudents> học sinh đã nộp"`
  - Right: **"Xuất Excel"** button (lucide `Download` icon), disabled when `isLoading || rows.length === 0`
- **Footer**: "Đóng" button on the right

### 6.4 Pure helpers (exported for testing)

```ts
// ExamScoresModal.helpers.ts
export function getGradeLabel(score: number, maxScore: number): string;
export function formatScore(score: number, maxScore: number): string; // "8.5 / 10"
export function formatDateTime(iso?: string): string;                  // "28/06/2026 14:32"
```

### 6.5 Excel export

- Library: `xlsx` (already a dependency).
- Sheet columns: `STT | Họ tên | Mã học sinh | Điểm | Xếp loại | Trạng thái | Ngày nộp`.
- File name: `Diem_<sanitizedExamTitle>_<sanitizedClassName>_<yyyyMMdd>.xlsx`.
- Sanitization: strip non-alphanumeric/underscore, collapse spaces.
- On success: `toast.success('Đã xuất danh sách điểm')` via `sonner`.
- Disabled while loading or when no rows.

---

## 7. States & Edge Cases

| State | Behavior |
| --- | --- |
| Loading | Centered spinner with "Đang tải điểm..." |
| Error (submissions) | Toast error + inline message "Không thể tải điểm. Vui lòng thử lại." Retry button |
| Error (class roster) | Hide "Chưa nộp" rows; show only submitted students; small note "Không tải được danh sách lớp" |
| Empty (no submissions yet) | Empty state with icon + "Chưa có học sinh nào nộp bài" |
| `maxScore === 0` | `getGradeLabel` returns "—", `formatScore` returns `"0 / 0"` |
| Student in roster but not in submissions | Show "Chưa nộp" row with all score cells "—" |
| Exam row click is exam-scoped only (does not affect selected-exam-id in assign modal) | Confirmed: separate state in `ClassExamsSection` |

---

## 8. Changes to `ClassExamsSection.tsx`

- Add a new icon import from `lucide-react`: `Eye` (for "Xem điểm").
- Add local state:
  ```ts
  const [viewingScoresForExamId, setViewingScoresForExamId] = useState<string | null>(null);
  ```
- On each exam row (the existing card/row render), add a small icon button labeled "Xem điểm" next to the existing actions (e.g. "Xem chi tiết" if present, otherwise next to delete/menu).
- Render at the end of the component:
  ```tsx
  {viewingScoresForExamId && (
    <ExamScoresModal
      open={!!viewingScoresForExamId}
      onClose={() => setViewingScoresForExamId(null)}
      examId={viewingScoresForExamId}
      examTitle={selectedExam?.title ?? ''}
      examSubject={selectedExam?.subjectName}
      examDate={selectedExam?.examDate}
      classId={classId}
      className={className}
    />
  )}
  ```
- `selectedExam` is derived from `classExams.find(e => e._id === viewingScoresForExamId)`. `examSubject` is sourced from whatever field the existing class-exam shape uses for the subject name (may be `subjectName`, `subject?.name`, or omitted → modal hides the subline).
- No new props on `ClassExamsSection`. Existing `classId` prop is reused; existing `className` prop (optional) is reused for Excel filename.

The exact placement of the new button should follow the existing row layout — if the row uses a flex action group at the right, the button goes there; otherwise it's appended at the end of the row.

---

## 9. Accessibility

- Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the title.
- Close on `Escape` key.
- Focus trap inside the modal while open (basic: focus the close button on open, restore focus on close).
- Table has `<thead>` + `<tbody>` semantics; status uses text in badges (not color-only).

---

## 10. Testing Strategy (TDD)

### 10.1 Unit tests — `ExamScoresModal.helpers.test.ts`

- `getGradeLabel`:
  - 9.5/10 → "Xuất sắc"
  - 8/10 → "Giỏi"
  - 6.5/10 → "Khá"
  - 5/10 → "Trung bình"
  - 4.99/10 → "Yếu"
  - 0/0 → "—"
  - 7/0 → "—" (defensive)
- `formatScore`:
  - 8.5, 10 → "8.5 / 10"
  - 10, 10 → "10 / 10"
  - 0, 0 → "0 / 0"
- `formatDateTime`:
  - "2026-06-28T07:32:00.000Z" → contains "28/06/2026" (exact HH:mm depends on TZ; assert length + date pattern only)

### 10.2 Component tests — `ExamScoresModal.test.tsx`

Mock `@tanstack/react-query` `useQuery` to return controlled states.

- Renders title with `examTitle`.
- Loading state → spinner text visible.
- Success with 2 submitted + 1 missing student → 3 rows; missing one shows "Chưa nộp".
- Success with empty submissions + non-empty roster → empty state shown.
- Status badge text maps correctly per status (`completed` → "Hoàn thành", etc.).
- "Xuất Excel" disabled while loading.
- "Xuất Excel" enabled when data ready; clicking it calls `xlsx.writeFile` (mocked).
- Close button calls `onClose`.
- `Escape` key calls `onClose`.

### 10.3 Verification commands

- `cd client/web && npm test -- --testPathPattern ExamScoresModal`
- `cd client/web && npm test` (full)
- `cd client/web && npm run lint`

---

## 11. Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| `BackendSubmission.studentId` not always populated (sometimes just a string) | Fallback: show `<id>` truncated; roster check ensures "Chưa nộp" row still works |
| Class roster endpoint shape changes | Wrap in try/catch, degrade to submitted-only view |
| Filename with Vietnamese diacritics causes issues across OS | Sanitize aggressively, fall back to ASCII transliteration if `xlsx` complains |
| Many exams → many parallel queries if multiple modals open | Modal is one-at-a-time; no concurrency issue |

---

## 12. Out of Scope (Future)

- Score matrix view (rows = students, cols = exams) for whole class.
- Per-question drill-down in the modal.
- Inline score editing from the modal.
- Bulk regrade from the modal.

---

## 13. Acceptance Criteria

1. Teacher on `/classes/:id` sees a **"Xem điểm"** button on every exam row in `ClassExamsSection`.
2. Clicking it opens a modal titled "Điểm bài thi: <title>".
3. The table has exactly the 7 columns listed in §6.2, in that order.
4. Students in the class but with no submission appear as "Chưa nộp" rows.
5. **"Xuất Excel"** downloads a `.xlsx` matching §6.5.
6. `Escape`, overlay click, and "Đóng" all close the modal.
7. All new unit + component tests pass; existing tests still pass.
8. `npm run lint` passes with no new warnings.