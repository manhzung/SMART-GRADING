# Appeals API Integration Design

**Date:** 2026-06-07
**Platform:** React Web
**Backend:** Node.js/Express (MongoDB)

## 1. Overview

Replace mock data in `AppealsPage.tsx` with real API calls to the existing backend. The backend already has full CRUD + review endpoints for appeals; we need to build the frontend service layer and wire it up.

## 2. Backend API Summary

### Endpoints (all at `/api/v1/appeals`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | required | List appeals (paginated, filterable) |
| GET | `/:id` | required | Get single appeal (populated) |
| POST | `/:id/review` | required (`reviewAppeals`) | Review an appeal |
| GET | `/student/:studentId` | required | List by student |
| GET | `/exam/:examId` | required | List by exam |
| GET | `/exam/:examId/pending-count` | required | Pending count per exam |

### Backend Appeal Model

```javascript
{
  _id: ObjectId,
  submissionId: ObjectId,       // ref Submission
  examId: ObjectId,              // ref Exam
  studentId: ObjectId,           // ref User (populated: name, studentCode)
  questionId: ObjectId,          // ref Question (populated: content)
  questionPosition: Number,
  reason: String,
  evidenceImageUrl: String,
  status: 'pending' | 'under_review' | 'approved' | 'rejected',
  teacherResponse: {
    reviewedBy: ObjectId,        // ref User (populated)
    reviewedAt: Date,
    decision: 'approved' | 'rejected',
    note: String,
    scoreAdjustment: { oldScore: Number, newScore: Number }
  },
  createdAt: Date,
  updatedAt: Date
}
```

### GET /appeals response shape

```json
{
  "results": [Appeal],
  "page": 1,
  "limit": 10,
  "total": 42,
  "pages": 5
}
```

### POST /appeals/:id/review body

```json
{
  "decision": "approved" | "rejected",
  "note": "string (optional)",
  "newScore": 8.5,
  "oldScore": 7.0
}
```

## 3. Frontend Architecture

### File: `src/presentation/store/appealStore.ts` (new)

Zustand store following the same pattern as `examStore.ts`.

#### State

```typescript
interface AppealState {
  appeals: BackendAppeal[];
  currentAppeal: BackendAppeal | null;
  stats: AppealStats;
  isLoading: boolean;
  isLoadingDetail: boolean;
  isReviewing: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: AppealFilters;
}
```

#### BackendAppeal interface

```typescript
interface BackendAppeal {
  _id: string;
  submissionId: string;
  examId: { _id: string; title: string } | string;
  studentId: { _id: string; name: string; studentCode?: string } | string;
  questionId: { _id: string; content: string } | string;
  questionPosition: number;
  reason: string;
  evidenceImageUrl?: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  teacherResponse?: {
    reviewedBy: { _id: string; name: string } | string;
    reviewedAt: string;
    decision: 'approved' | 'rejected';
    note?: string;
    scoreAdjustment?: { oldScore: number; newScore: number };
  };
  studentNotified?: boolean;
  createdAt: string;
  updatedAt: string;
}
```

#### Actions

```typescript
fetchAppeals(filters?: AppealFilters): Promise<void>
fetchAppealById(id: string): Promise<void>
reviewAppeal(id: string, data: ReviewPayload): Promise<void>
setFilters(filters: Partial<AppealFilters>): void
setPage(page: number): void
setPageSize(size: number): void
clearError(): void
clearCurrentAppeal(): void
```

### File: `src/pages/AppealsPage.tsx` (modify)

Replace mock data initialization with API calls. Main changes:

1. Import from `appealStore` instead of `mockData`
2. Replace `useEffect` that sets mock data with `fetchAppeals()`
3. Replace `updateAppealStatus()` with `reviewAppeal()` from store
4. Keep existing UI — only the data layer changes
5. Add loading states using `isLoading` from store
6. Handle errors with `error` state + toast

### Data Mapping

The backend populates `studentId`, `examId`, `questionId` as objects. Map to flat structure for UI:

```typescript
function mapBackendAppeal(a: BackendAppeal): AppealUI {
  return {
    _id: a._id,
    submissionId: a.submissionId,
    examId: typeof a.examId === 'object' ? a.examId._id : a.examId,
    examTitle: typeof a.examId === 'object' ? a.examId.title : '',
    studentId: typeof a.studentId === 'object' ? a.studentId._id : a.studentId,
    studentName: typeof a.studentId === 'object' ? a.studentId.name : '',
    studentCode: typeof a.studentId === 'object' ? a.studentId.studentCode : '',
    questionId: typeof a.questionId === 'object' ? a.questionId._id : a.questionId,
    questionContent: typeof a.questionId === 'object' ? a.questionId.content : '',
    questionPosition: a.questionPosition,
    reason: a.reason,
    currentAnswer: '',  // From submission, need separate fetch or include in appeal
    expectedAnswer: '',
    status: a.status,  // keep under_review as-is
    resolvedBy: typeof a.teacherResponse?.reviewedBy === 'object' 
      ? a.teacherResponse.reviewedBy._id : '',
    resolvedAt: a.teacherResponse?.reviewedAt,
    resolutionNote: a.teacherResponse?.note,
    createdAt: a.createdAt,
  };
}
```

### Note on `currentAnswer` and `expectedAnswer`

The backend appeal model does not store `currentAnswer` or `expectedAnswer`. These come from the submission. The `AppealsPage.tsx` currently shows answer comparison in the modal. Two options:

1. **Fetch submission separately** when opening modal detail (`fetchAppealById` already populates submissionId)
2. **Extend backend** to include answer data in appeal response

**Decision:** Option 1 — fetch submission by `submissionId` when opening detail modal, or modify backend `getById` to include submission answers via populate. For initial implementation, we'll use `fetchAppealById` and add a `fetchSubmission(submissionId)` helper. If backend needs modification, we'll note it.

### Status Handling

Backend uses `under_review`, frontend UI currently shows `reviewing`. Keep UI as-is: display `under_review` → show "Đang xem xét" in Vietnamese.

## 4. Exam List for Filter Dropdown

The AppealsPage has an exam filter dropdown. Currently uses `mockExams`. Need to fetch exams from `useExamStore` or `examStore`. Exams likely already fetched elsewhere; if not, add `fetchExams()` call.

## 5. Error Handling

- Network errors: show toast with error message
- 401 Unauthorized: redirect to login
- 400 Bad request: show server error message
- Loading state: show spinner/skeleton in table

## 6. Testing Strategy

1. Start backend server (`npm run dev` in `/server`)
2. Start frontend dev server (`npm run dev` in `/client/web`)
3. Navigate to `/appeals`
4. Verify table loads with real data
5. Test filter by status
6. Test filter by exam
7. Test date range filter
8. Test pagination
9. Test opening detail modal
10. Test review actions (approve/reject)
11. Verify stats cards update correctly

## 7. Backend Modification Needed

The `getById` in `appeal.service.js` populates `submissionId` but the submission answers may not be included. Check if we need to extend the populate or add a new endpoint. For the initial implementation, we may need to modify `appeal.service.js` to also populate submission answers so the modal can show answer comparison.

### Potential backend change: `getById`

```javascript
// Current:
.populate('submissionId', 'studentCode totalScore')

// Desired:
.populate({
  path: 'submissionId',
  select: 'answers totalScore studentId',
  populate: { path: 'studentId', select: 'name studentCode' }
})
```

This change should be made to `appeal.service.js` to support the answer comparison feature in the modal.

## 8. Implementation Order

1. Create `appealStore.ts` with basic state + `fetchAppeals`
2. Wire up `AppealsPage.tsx` to use store
3. Add `reviewAppeal` action
4. Modify backend populate if needed for answer comparison
5. Add loading/error states
6. End-to-end test
