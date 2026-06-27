# Submission Detail Modal (Web) - Design

**Date:** 2026-06-28
**Platform:** React (Web)
**Status:** Approved by user
**Author:** Brainstorming session

---

## 1. Problem

Currently in web app at `http://localhost:5173/exams/:examId`:

- The "Danh sách bài nộp" (submissions list) table has a FileText icon in the rightmost action column for each submission card/row
- The icon currently has **no onClick handler** — it's a dead UI element
- Clicking the icon does nothing; users cannot see full details of a student's submission from this page
- Users must navigate away (no direct route exists) to view submission details
- There is no way to correct errors (e.g., wrong OMR detection, manual grading adjustments) without using the scanner mobile app

Goal: turn this dead icon into a fully functional modal that supports **Read + Update + Create + Delete** on submission records.

## 2. Goal

Add a modal at `ExamDetailPage` that:
1. Opens when user clicks the FileText icon (rightmost column) on a submission row
2. Displays complete submission detail: student info, exam info, score, status, per-question answers, scanned images
3. Allows teacher to **edit** individual answers (with reason) and save — backend re-grades and updates score automatically
4. Allows teacher to **delete** a submission (with confirm dialog)
5. Allows teacher to **create** a new submission manually from the exam detail page

## 3. Design Decisions

- **Approach B**: Build a fully new modal `SubmissionDetailModal` (per user choice: "Approach B - Modal hoàn toàn mới"). Do NOT wrap existing `SubmissionDetailPage` — that page is used by `/submissions/:id` route (separate concern).
- **CRUD scope** = Read + Update + Delete + Create (per user choice: "full_crud" was option but user selected `read_heavy` originally then changed to full CRUD via "Approach B" indicates full features). Selected mode: "Xem + Sửa điểm (override đáp án) + Delete + Create" — full CRUD.
- **Modal content** = Full info: student info + answer table + image gallery (per user choice `full_info`)
- **Override workflow** = Simple modify: edit directly, type reason, system records automatically (per user choice `simple_modify`)
- **Reuse existing endpoints** — backend already has all required routes:
  - `GET /submissions/:id` (getById)
  - `PATCH /submissions/:id/answers` (updateAnswers)
  - `POST /submissions/:id/override` (manualOverride)
  - `DELETE /submissions/:id` (remove)
  - `POST /submissions` (create)
- **No backend changes needed** — only frontend work
- **TDD**: Write Vitest tests first, watch fail, then implement (RED-GREEN-REFACTOR)
- **State management**: Extend existing `submissionStore` (Zustand) with new actions

## 4. Architecture

### 4.1 Component Hierarchy

```
ExamDetailPage
 └─ <SubmissionDetailModal
      submissionId?: string         // for view/edit/delete modes
      initialMode?: 'view'|'edit'|'create'   // default 'view' when submissionId provided, 'create' otherwise
      onClose
      onSaved
    >
     │
     ├─ ModalHeader
     │   ├─ Title (dynamic: "Chi tiết bài nộp" / "Sửa bài nộp" / "Tạo bài nộp")
     │   ├─ Mode switcher (View ↔ Edit toggle, only when editing existing)
     │   └─ Close button (X)
     │
     ├─ ModalBody (3 sections)
     │   │
     │   ├─ InfoSection (read-only metadata)
     │   │   ├─ Student info (name, studentCode, class, email)
     │   │   ├─ Exam info (title, versionCode, scanned date)
     │   │   ├─ Score (total / max, percentage, status badge)
     │   │   └─ Stats (correct, incorrect, unanswered counts)
     │   │
     │   ├─ AnswerEditTable (toggleable edit mode)
     │   │   ├─ Headers: # | Câu hỏi | Đáp án HS | Đáp án đúng | Điểm | [Action]
     │   │   ├─ Row per answer (submission.answers[])
     │   │   ├─ View mode: read-only display
     │   │   ├─ Edit mode: <select A/B/C/D> per row + "Lý do sửa" textarea
     │   │   └─ Inline validation
     │   │
     │   └─ ImageGallery (existing component, reused)
     │       ├─ Original (bài làm scan)
     │       ├─ Preprocessed (sau xử lý)
     │       └─ Annotated (sau chấm)
     │
     ├─ ModalFooter
     │   ├─ [view mode]    Edit | Delete | Close
     │   ├─ [edit mode]    Save | Cancel
     │   └─ [create mode]  Create | Cancel
     │
     └─ ConfirmDialog (inline, on Delete click)
         └─ "Xóa bài nộp của [studentName]?"
```

### 4.2 New Files

| File | Purpose |
|------|---------|
| `client/web/src/components/submission/SubmissionDetailModal.tsx` | Main modal component |
| `client/web/src/components/submission/SubmissionDetailModal.module.css` | Styling (matches existing modal pattern) |
| `client/web/src/components/submission/AnswerEditTable.tsx` | Editable answers table |
| `client/web/src/components/submission/AnswerEditTable.module.css` | Table styles |
| `client/web/src/components/submission/CreateSubmissionForm.tsx` | Create-mode form |
| `client/web/src/components/submission/CreateSubmissionForm.module.css` | Form styles |
| `client/web/src/components/submission/__tests__/SubmissionDetailModal.test.tsx` | Modal tests |
| `client/web/src/components/submission/__tests__/AnswerEditTable.test.tsx` | Table tests |

### 4.3 Modified Files

| File | Change |
|------|--------|
| `client/web/src/pages/ExamDetailPage.tsx` | Add onClick handler on FileText icon; add modal render; pass selected submission ID |
| `client/web/src/presentation/store/submissionStore.ts` | Add actions: `fetchById`, `updateSubmission`, `createSubmission` |

## 5. Data Flow

### 5.1 Read Flow

```
User clicks FileText icon on row
  ↓
setSelectedSubmissionId(sub._id)   [state in ExamDetailPage]
  ↓
<SubmissionDetailModal submissionId={id} initialMode="view" /> mounts
  ↓
useEffect → store.fetchById(id)
  ↓
GET /submissions/:id
  ↓
Backend returns Submission with populated refs (examId, versionId, studentId, classId, answers.questionId)
  ↓
Render InfoSection + AnswerEditTable (read-only) + ImageGallery
```

### 5.2 Update Flow (Override Answer)

```
User clicks "Edit" button
  ↓
setMode('edit') — AnswerEditTable enables inputs
  ↓
User changes answer dropdown (e.g., q5: A → B), types reason "HS tô sai"
  ↓
User clicks "Save"
  ↓
If single answer changed: store.updateSubmission(id, { position, correctedAnswer, reason })
  ↓
POST /submissions/:id/override
  ↓
Backend records manualOverride, re-grades, returns updated submission
  ↓
Frontend refreshes modal data, exits edit mode, shows toast "Đã cập nhật"

Alternative: Multiple answers changed → use PATCH /submissions/:id/answers
  → Backend re-grades all at once, returns { success, totalScore, maxScore }
```

### 5.3 Delete Flow

```
User clicks "Delete" button
  ↓
Show inline ConfirmDialog "Xóa bài nộp của [studentName]? Hành động này không thể hoàn tác."
  ↓
Confirm → store.deleteSubmission(id)
  ↓
DELETE /submissions/:id
  ↓
Backend deletes Submission doc + cleans Cloudinary images (original, preprocessed, annotated)
  ↓
Frontend removes from local list, closes modal, refreshes ExamDetail list, shows toast
```

### 5.4 Create Flow

```
User clicks "Thêm bài nộp" button (in ExamDetail header — future, out of scope here; modal supports mode='create' but trigger is TBD)
  ↓
<SubmissionDetailModal initialMode="create" examId={currentExamId} />
  ↓
CreateSubmissionForm renders:
  - Exam: pre-filled (readonly)
  - Student: dropdown of students in exam's classIds
  - Version: dropdown of examVersions
  - Answers: empty AnswerEditTable
  - Image upload: optional (file input → base64 OR Cloudinary upload signature)
  ↓
User clicks "Create"
  ↓
store.createSubmission(payload)
  ↓
POST /submissions (or /submissions/scan if image provided)
  ↓
Backend creates submission, returns full Submission
  ↓
Frontend closes modal, refreshes list, shows toast "Đã tạo bài nộp"
```

## 6. API Contracts (existing, no changes)

| Operation | Method | Endpoint | Payload | Response |
|-----------|--------|----------|---------|----------|
| Get detail | GET | `/submissions/:id` | - | Full Submission (populated) |
| Update single | POST | `/submissions/:id/override` | `{ position: int, correctedAnswer: 'A'\|'B'\|'C'\|'D', reason: string }` | Updated Submission |
| Update batch | PATCH | `/submissions/:id/answers` | `{ answers: {"1": "B", "2": "A"} }` | `{ success, totalScore, maxScore }` |
| Delete | DELETE | `/submissions/:id` | - | 204 No Content |
| Create | POST | `/submissions` | `{ examId, versionCode, studentCode, classId, answers, ... }` | Created Submission |

All requests require Bearer token (existing auth middleware).

## 7. Error Handling

| Scenario | UX |
|----------|-----|
| Network error | Red toast "Lỗi mạng, vui lòng thử lại" |
| 404 Not found | Inline message "Không tìm thấy bài nộp" + Close button (modal stays open) |
| 403 Forbidden | Inline message "Bạn không có quyền thực hiện thao tác này" |
| 400 Validation | Inline field-level errors (red border + helper text) |
| Loading | Skeleton/spinner in modal body, buttons disabled with spinner |
| Submit success | Green toast "Đã lưu thành công" + auto-close modal + refresh parent list |

## 8. Testing Strategy

**Framework:** Vitest + React Testing Library (already configured)

**Test files:**
1. `SubmissionDetailModal.test.tsx` — full modal flow
2. `AnswerEditTable.test.tsx` — table component in isolation

**Test categories:**

```
describe('SubmissionDetailModal', () => {
  describe('Read flow', () => {
    it('opens modal when triggered by parent')
    it('fetches submission via GET /submissions/:id on mount')
    it('displays student info, score, status correctly')
    it('renders all answers in table')
    it('shows images in gallery when present')
    it('handles 404 gracefully')
    it('closes modal on close button click')
    it('closes modal on overlay click')
    it('closes modal on ESC key')
  })
  describe('Update flow', () => {
    it('switches to edit mode on Edit click')
    it('disables Save when no changes made')
    it('submits updates via PATCH /submissions/:id/answers')
    it('submits override via POST /submissions/:id/override for single change')
    it('refreshes modal data after save')
    it('refreshes parent list after save')
    it('handles validation errors inline')
  })
  describe('Delete flow', () => {
    it('shows confirm dialog before delete')
    it('cancels delete on dialog cancel')
    it('removes submission via DELETE')
    it('updates parent list after delete')
  })
  describe('Create flow', () => {
    it('opens in create mode with empty form')
    it('validates required fields before submit')
    it('submits via POST and adds to parent list')
  })
  describe('Accessibility', () => {
    it('has role="dialog" and aria-modal')
    it('traps focus inside modal')
    it('returns focus to trigger on close')
  })
})
```

**Coverage target**: ≥80% statements, ≥70% branches for new files.

## 9. Accessibility

- Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to title
- Focus trap: focus moves to close button on open; restored to trigger element on close
- ESC key closes modal
- Tab navigation restricted to modal contents
- Answer dropdowns: native `<select>` with associated `<label>`
- Delete button: red color + Trash2 icon + confirm dialog
- Loading states: `aria-busy="true"` on modal body
- Error messages: `aria-live="polite"` region for screen reader announcements

## 10. Out of Scope (Future Enhancements)

- Image upload in create mode (will require Cloudinary upload signature flow)
- Bulk operations (e.g., select multiple rows, batch override)
- Appeals workflow integration (already partially in mobile)
- Export single submission as PDF
- Real-time updates via WebSocket when scanner completes
- Audit log viewing (who/when changed what)

## 11. Implementation Order

Following TDD (RED → GREEN → REFACTOR):

1. **Phase 1 — Store extension (TDD)**
   - Test: `fetchById` updates state
   - Test: `updateSubmission` calls correct endpoint
   - Test: `createSubmission` calls correct endpoint
   - Implement store actions

2. **Phase 2 — AnswerEditTable (TDD)**
   - Test: renders rows from answers prop
   - Test: switches to edit mode via prop
   - Test: emits change events
   - Test: validates input
   - Implement component

3. **Phase 3 — SubmissionDetailModal (TDD)**
   - Test: renders InfoSection
   - Test: renders AnswerEditTable
   - Test: renders ImageGallery
   - Test: opens in correct mode
   - Test: handles loading/error states
   - Implement component

4. **Phase 4 — CreateSubmissionForm (TDD)**
   - Test: validates required fields
   - Test: submits correct payload
   - Implement component

5. **Phase 5 — Integration in ExamDetailPage**
   - Wire up FileText icon onClick
   - Render modal in parent
   - Verify end-to-end flow

6. **Phase 6 — Manual E2E test**
   - Open page, click icon, verify modal
   - Edit answer, save, verify list refreshes
   - Delete, verify confirm dialog
   - Close, verify focus return

## 12. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Modal interferes with table sorting/pagination | Use portal pattern or fixed overlay (not inline) |
| Edit save fails silently | Show error inline, keep modal open, log to console |
| Delete accidentally removes data | Confirm dialog required, irreversible action warning |
| Image gallery large files slow modal | Use thumbnail URLs; lazy load |
| Focus trap complex | Use existing focus-trap library if available, else implement minimal trap |
| Test mocks not matching real API | Use MSW (Mock Service Worker) for network mocking |