# Appeal Workflow — Student & Teacher

**Date:** 2026-06-28
**Author:** Cursor Assistant
**Status:** Draft (awaiting approval)

---

## 1. Background & Goal

The system already has backend models, services, controllers, and routes for appeals (phúc khảo) and student submission views. The frontend has dedicated pages for both students (`MyScoresPage`, `MyAppealsPage`) and teachers (`AppealsPage`). Most of the data plumbing is in place.

**What is missing or broken today:**

| Area | Current state | Gap |
|------|---------------|-----|
| Student: create appeal | `POST /v1/appeals` exists in backend; no frontend action. `MyScoresPage` shows the existing appeals tab as read-only. | Students cannot create a new appeal from the score view. |
| Teacher: review flow | `AppealsPage` already wires `reviewAppeal` from `useAppealStore`. | Modal accepts note but does not surface score change; backend still allows `newScore/oldScore` payload. |
| Backend: review logic | `appealService.review` mutates `submission.totalScore` when `decision === 'approved'` and a new score is supplied. | Per the new requirement, an appeal is just a "letter" — it must NOT change scores. The teacher edits scores in a separate flow (manual override / re-grade). |
| Test coverage | Backend tests exist for `auth`, `submission`, `analytics`. No test for `appeal.service` or `appeal.controller`. Frontend has no test for `studentStore.createAppeal`. | No regression guard for the new behavior. |

**Goal of this design:**
Make the appeal workflow work end-to-end for both roles, scoped strictly to "submit letter → teacher responds with accept/reject + note", with NO score mutation. Keep existing well-tested code paths untouched wherever possible.

---

## 2. Scope

### In scope
1. Backend: clean up `appealService.review` so it never changes `submission.totalScore`; keep `newScore/oldScore` out of the validation schema; keep status transitions.
2. Backend: keep `appealService.create` as-is, but add explicit test coverage (already implements unique-per-question, status `appealed`, notify teacher).
3. Frontend: add `createAppeal` action to `useStudentStore`.
4. Frontend: add a "Tạo đơn phúc khảo" form into `MyScoresPage`'s modal → tab "Phúc khảo". Form has a single required `reason` field (10–1000 chars), validated before submit.
5. Tests:
   - `server/tests/unit/services/appeal.service.test.js` (RED-GREEN-REFACTOR for create + review).
   - `server/tests/unit/controllers/appeal.controller.test.js` (HTTP layer for create + review).
   - `client/web/src/__tests__/stores/studentStore-createAppeal.test.ts` (store action).

### Out of scope (explicit YAGNI)
- Score editing / re-grade flow. The teacher is expected to use existing manual override or update answers endpoints if they want to change a score.
- Email notifications to teachers — the existing `notificationService.notifyAppealSubmitted` / `notifyAppealResolved` already covers this; we don't touch them.
- New routes, new models, new roles. Everything stays inside the existing appeal + submission + notification triad.
- Visual redesign of `MyScoresPage` or `AppealsPage` — we only add a form to one tab and adjust the review modal payload.

---

## 3. Design

### 3.1 Backend

#### 3.1.1 `appealService.review` (modify)

Current behavior on `decision === 'approved'`:
- finds the matching `submission.answers` entry by questionId
- overwrites `answer.score` with `newScore`
- sets `answer.isCorrect = true`
- recomputes `submission.totalScore` and `finalScore`
- saves `submission`
- writes `appeal.teacherResponse.scoreAdjustment = { oldScore, newScore }`

**New behavior on `decision === 'approved'`:**
- Do NOT touch `submission.answers` or `submission.totalScore` / `finalScore`.
- Do NOT touch `submission.status` (leave it `appealed` if it was, otherwise unchanged).
- Only set `appeal.status = 'approved'` and `appeal.teacherResponse = { reviewedBy, reviewedAt, decision, note }` — no `scoreAdjustment` key at all.
- Still call `notificationService.notifyAppealResolved` so the student gets a notification.

**New behavior on `decision === 'rejected'`:**
- Same as approved but `decision = 'rejected'` and no decision-specific payload.
- Status of `submission` is NOT changed either (a rejection is informational; the score stands).

#### 3.1.2 `appeal.validation.reviewAppeal` (modify)

Drop `newScore` and `oldScore` from the body schema. Body becomes:

```
{
  decision: 'approved' | 'rejected'  // required
  note: string max 1000               // optional
}
```

#### 3.1.3 `appealService.create` (no change)

Already correct:
- Validates `Submission` exists.
- Enforces uniqueness per `(submissionId, questionId)`.
- Sets `currentAnswer` and `expectedAnswer` from the submission's answers.
- Marks `submission.status = 'appealed'`.
- Notifies the exam's `createdBy` teacher.

### 3.2 Frontend

#### 3.2.1 `useStudentStore` (extend)

Add:

```ts
createAppeal: (payload: {
  submissionId: string;
  examId: string;
  questionId: string;
  questionPosition: number;
  reason: string;
}) => Promise<StudentExamAppeal>;
```

Behavior:
- POSTs `/appeals` (the existing endpoint; backend derives `studentId` from auth token).
- On success, prepends the returned appeal to `submissionAppeals` (if the active submission matches) and to `appeals`.
- Refreshes `fetchSubmissionAppeals(submissionId)` so the modal's tab reflects the new state without a manual reload.
- On failure, throws so the form can show an inline error.

Add `isCreatingAppeal: boolean` for button disabled state.

#### 3.2.2 `MyScoresPage.tsx` (modify modal tab "Phúc khảo")

State additions:
- `showCreateForm: boolean` — toggles the inline form.
- `formReason: string` — controlled input.
- `formError: string | null` — server-side error display.
- `selectedQuestion: { questionId, position } | null` — currently `null` means "general question" → keep simple by storing just `questionPosition` and `questionId` from the chosen question.

UX:
- Above the existing "Bạn chưa gửi đơn phúc khảo nào" / appeal list, show a button "+ Tạo đơn phúc khảo".
- Clicking it expands an inline form with:
  - Select "Câu cần phúc khảo" — populated from `selectedSubmission.answers`. Each `<option>` shows `Câu {position}`. (If the submission has 0 answers, disable the button.)
  - Textarea "Lý do" (10–1000 chars, required).
  - Submit "Gửi đơn" / Cancel "Hủy".
- After success: collapse form, refresh the list, show toast "Đã gửi đơn phúc khảo".
- After failure: keep form open, show error message under textarea.

Disable the create button when:
- `selectedSubmission.answers` is empty.
- Or `selectedSubmission.status` is `pending` / `scanning` (not yet graded).

#### 3.2.3 `AppealsPage.tsx` (no functional change, small cleanup)

The current modal already passes only `decision` and `note` to `reviewAppeal`. We just need to verify nothing else sends `newScore/oldScore`. No code change required if confirmed.

### 3.3 Tests

#### 3.3.1 Backend service tests (`appeal.service.test.js`)
Following the pattern of `submission.service.test.js` (uses `setupTestDB` + fixtures):

- `create()`:
  - creates an appeal and marks submission `appealed`
  - rejects when submission missing
  - rejects when an appeal for the same `(submissionId, questionId)` already exists
  - calls notification service with exam teacher id
- `review()` approved:
  - sets `appeal.status = 'approved'`
  - writes `teacherResponse.decision = 'approved'`
  - writes `teacherResponse.note`
  - does NOT mutate `submission.totalScore` or any `answer.score`
  - calls notification service
- `review()` rejected:
  - sets `appeal.status = 'rejected'`
  - writes `teacherResponse.decision = 'rejected'`
  - does NOT mutate `submission.totalScore`
- `review()` on already-reviewed appeal → throws

#### 3.3.2 Backend controller tests (`appeal.controller.test.js`)
Using `node-mocks-http` + mocked service (matches pattern of `analytics.controller.test.js`):

- `create`: 201 + body on success; 400 if service throws "Appeal already exists"
- `review`: 200 + body on success; 404 if service throws "Appeal not found"; 400 if already reviewed

#### 3.3.3 Frontend store test (`studentStore-createAppeal.test.ts`)
Following the pattern of `submissionStore-fetchById.test.ts`:

- `createAppeal` posts to `/appeals` with the right body
- on success, the new appeal is prepended into `submissionAppeals` (when matching the active submission) and `appeals`
- sets `isCreatingAppeal = false` after completion
- on failure, sets `isCreatingAppeal = false` and re-throws

---

## 4. Files Touched

**Backend**
- `server/src/services/appeal.service.js` (modify `review`)
- `server/src/validations/appeal.validation.js` (drop `newScore/oldScore` from `reviewAppeal` body)
- `server/tests/unit/services/appeal.service.test.js` (new)
- `server/tests/unit/controllers/appeal.controller.test.js` (new)
- `server/tests/fixtures/appeal.fixture.js` (new, if needed by service tests)

**Frontend**
- `client/web/src/presentation/store/studentStore.ts` (add `createAppeal`, `isCreatingAppeal`)
- `client/web/src/pages/MyScoresPage.tsx` (add form to tab "Phúc khảo")
- `client/web/src/pages/MyScoresPage.module.css` (add styles for the form)
- `client/web/src/__tests__/stores/studentStore-createAppeal.test.ts` (new)

**No changes** to:
- routes, models, notification service
- `AppealsPage.tsx`, `MyAppealsPage.tsx`, `useAppealStore.ts` (the teacher flow already works)

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Removing score mutation breaks existing data: appeals already in DB have `teacherResponse.scoreAdjustment`. | We don't delete the field on the model; we just stop writing to it. Existing records keep their historic adjustment values. |
| Removing `newScore/oldScore` from Joi breaks teacher clients that still send them. | The teacher's only frontend (`AppealsPage`) doesn't send them. No external clients documented. We log + ignore extras via Joi's `unknown: false` default. |
| Student creates appeal for a question they answered correctly (no point in appealing). | Acceptable: the teacher can reject. We don't add validation for "question was wrong" since OMR scoring is not infallible. |
| Race: student opens modal, scores change in another tab, then submits appeal. | Edge case. The backend re-fetches the submission at `create` time, so any stale `questionId`/`examId` is still authoritative. |

---

## 6. Verification Plan

1. Run `cd server && npm test -- appeal` → all new + existing tests pass.
2. Run `cd server && npm run lint` → no new warnings.
3. Run `cd client/web && npm test -- studentStore` → all new + existing tests pass.
4. Run `cd client/web && npm run lint` → no new warnings.
5. Run `cd client/web && npm run build` → TypeScript compiles.
6. Manual smoke: open `/my-scores`, click into a graded submission, open tab "Phúc khảo", create an appeal with a 12-char reason → list updates, no console errors.
7. Manual smoke: open `/appeals` as a teacher, review the new appeal with a note → student sees the response in `MyAppealsPage`.

---

## 7. Out-of-Scope Future Work (not for this PR)

- Bulk review (approve/reject many appeals at once).
- Auto-marking appeal as `under_review` when a teacher first opens the detail modal.
- Appeal SLA / deadline per exam.
- Score editing flow separation (already exists via `manualOverride` and `updateAnswers`).