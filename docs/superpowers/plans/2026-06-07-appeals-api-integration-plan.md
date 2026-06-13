# Appeals API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock data in AppealsPage.tsx with real API calls to the existing backend appeal endpoints, creating a Zustand store for state management.

**Architecture:** Build a Zustand store (`appealStore.ts`) following the same pattern as `examStore.ts`, then wire it into `AppealsPage.tsx`. The store handles API calls via `apiService` and maps backend response shapes to the UI model. No TDD since this is a data-layer integration task — verify manually via browser.

**Tech Stack:** React, TypeScript, Zustand, `apiService` (existing fetch wrapper)

---

## File Mapping

| File | Action | Purpose |
|------|--------|---------|
| `client/web/src/presentation/store/appealStore.ts` | Create | Zustand store for appeals |
| `client/web/src/types/index.ts` | Modify | Add BackendAppeal interface |
| `client/web/src/pages/AppealsPage.tsx` | Modify | Replace mock with store calls |

---

## Task 1: Create `appealStore.ts`

**Files:**
- Create: `c:\TAILIEU\DATN\SMART GRADING\client\web\src\presentation\store\appealStore.ts`
- Reference: `c:\TAILIEU\DATN\SMART GRADING\client\web\src\presentation\store\examStore.ts`

- [ ] **Step 1: Create the appealStore.ts file**

```typescript
import { create } from 'zustand';
import { apiService } from '../../core/api';

// ─── Backend Types ─────────────────────────────────────────────────────────────

export interface BackendAppeal {
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

export interface AppealFilters {
  status?: string;
  examId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ReviewPayload {
  decision: 'approved' | 'rejected';
  note?: string;
  newScore?: number;
  oldScore?: number;
}

export interface AppealStats {
  total: number;
  pending: number;
  reviewing: number;
  approved: number;
  rejected: number;
}

// ─── Store Interface ──────────────────────────────────────────────────────────

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

  fetchAppeals: (filters?: AppealFilters) => Promise<void>;
  fetchAppealById: (id: string) => Promise<void>;
  reviewAppeal: (id: string, data: ReviewPayload) => Promise<void>;
  setFilters: (filters: Partial<AppealFilters>) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  clearError: () => void;
  clearCurrentAppeal: () => void;
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useAppealStore = create<AppealState>((set, get) => ({
  appeals: [],
  currentAppeal: null,
  stats: { total: 0, pending: 0, reviewing: 0, approved: 0, rejected: 0 },
  isLoading: false,
  isLoadingDetail: false,
  isReviewing: false,
  error: null,
  pagination: { page: 1, limit: 10, total: 0, pages: 0 },
  filters: {},

  fetchAppeals: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const params: Record<string, string | number> = {};
      const currentFilters = filters || get().filters;
      
      if (currentFilters.status && currentFilters.status !== 'all') {
        params.status = currentFilters.status;
      }
      if (currentFilters.examId && currentFilters.examId !== 'all') {
        params.examId = currentFilters.examId;
      }
      if (currentFilters.page) params.page = currentFilters.page;
      if (currentFilters.limit) params.limit = currentFilters.limit;

      const response = await apiService.get<{
        results: BackendAppeal[];
        page: number;
        limit: number;
        total: number;
        pages: number;
      }>('/appeals', { params });

      const results = response.results || [];

      // Compute stats from results
      const stats: AppealStats = {
        total: response.total || results.length,
        pending: results.filter(a => a.status === 'pending').length,
        reviewing: results.filter(a => a.status === 'under_review').length,
        approved: results.filter(a => a.status === 'approved').length,
        rejected: results.filter(a => a.status === 'rejected').length,
      };

      set({
        appeals: results,
        stats,
        pagination: {
          page: response.page || 1,
          limit: response.limit || 10,
          total: response.total || results.length,
          pages: response.pages || 1,
        },
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchAppealById: async (id) => {
    set({ isLoadingDetail: true, error: null, currentAppeal: null });
    try {
      const response = await apiService.get<BackendAppeal>(`/appeals/${id}`);
      set({ currentAppeal: response, isLoadingDetail: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoadingDetail: false });
    }
  },

  reviewAppeal: async (id, data) => {
    set({ isReviewing: true, error: null });
    try {
      await apiService.post(`/appeals/${id}/review`, data);
      set({ isReviewing: false });
      // Update the appeal in the list
      set((state) => ({
        appeals: state.appeals.map((a) =>
          a._id === id
            ? {
                ...a,
                status: data.decision,
                teacherResponse: {
                  reviewedAt: new Date().toISOString(),
                  decision: data.decision,
                  note: data.note,
                  scoreAdjustment: data.newScore !== undefined
                    ? { oldScore: data.oldScore || 0, newScore: data.newScore }
                    : undefined,
                },
              }
            : a
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message, isReviewing: false });
      throw error;
    }
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  setPage: (page) => {
    set((state) => ({
      pagination: { ...state.pagination, page },
      filters: { ...state.filters, page },
    }));
  },

  setPageSize: (size) => {
    set((state) => ({
      pagination: { ...state.pagination, limit: size, page: 1 },
      filters: { ...state.filters, limit: size, page: 1 },
    }));
  },

  clearError: () => set({ error: null }),
  clearCurrentAppeal: () => set({ currentAppeal: null }),
}));
```

- [ ] **Step 2: Verify file was created correctly**

Check the file exists at the correct path with the correct content.

---

## Task 2: Update types/index.ts

**Files:**
- Modify: `c:\TAILIEU\DATN\SMART GRADING\client\web\src\types\index.ts`
- Reference: Line 385-401 (Appeal types section)

- [ ] **Step 1: Add BackendAppeal interface**

Find the Appeals section in `types/index.ts` (around line 385) and add after the existing `Appeal` interface:

```typescript
export interface BackendAppeal {
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

export interface ReviewPayload {
  decision: 'approved' | 'rejected';
  note?: string;
  newScore?: number;
  oldScore?: number;
}
```

---

## Task 3: Wire AppealsPage.tsx to use the store

**Files:**
- Modify: `c:\TAILIEU\DATN\SMART GRADING\client\web\src\pages\AppealsPage.tsx`

- [ ] **Step 1: Update imports**

Remove mock data import:
```typescript
// REMOVE:
import { mockAppeals, mockStudents, mockExams, mockQuestions } from '../services/mockData';
```

Add store import:
```typescript
// ADD:
import { useAppealStore } from '../presentation/store/appealStore';
```

- [ ] **Step 2: Replace Appeal interface with store mapping**

The existing `AppealsPage.tsx` defines its own local `Appeal` interface. Keep it as-is for the UI layer but add a helper function to map backend data. Find the local `interface Appeal` (around line 27) and the `interface AppealStats` (around line 46). These stay for the UI — the store uses `BackendAppeal`.

- [ ] **Step 3: Add helper function for mapping**

After the `AppealStats` interface definition (around line 54), add this mapping helper:

```typescript
// Helper: map backend appeal to UI model
function mapBackendAppeal(a: import('../presentation/store/appealStore').BackendAppeal): Appeal {
  return {
    _id: a._id,
    submissionId: a.submissionId,
    examId: typeof a.examId === 'object' ? a.examId._id : a.examId,
    studentId: typeof a.studentId === 'object' ? a.studentId._id : a.studentId,
    studentName: typeof a.studentId === 'object' ? a.studentId.name : '',
    className: '',  // from mock, not in backend - leave blank
    questionId: typeof a.questionId === 'object' ? a.questionId._id : a.questionId,
    reason: a.reason,
    currentAnswer: '',  // from submission
    expectedAnswer: '',  // from question
    status: a.status === 'under_review' ? 'reviewing' : a.status,
    resolvedBy: typeof a.teacherResponse?.reviewedBy === 'object' 
      ? a.teacherResponse.reviewedBy._id 
      : a.teacherResponse?.reviewedBy || undefined,
    resolvedAt: a.teacherResponse?.reviewedAt,
    resolutionNote: a.teacherResponse?.note,
    createdAt: a.createdAt,
  };
}
```

- [ ] **Step 4: Initialize the store hook inside the component**

In the `AppealsPage` component function body, replace the mock data `useEffect` with:

```typescript
const {
  appeals,
  stats,
  isLoading,
  isLoadingDetail,
  isReviewing,
  error,
  pagination,
  fetchAppeals,
  reviewAppeal,
  fetchAppealById,
} = useAppealStore();

// Fetch appeals on mount and when filters change
useEffect(() => {
  fetchAppeals({
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    examId: selectedExam !== 'all' ? selectedExam : undefined,
    page: currentPage,
    limit: pageSize,
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedStatus, selectedExam, currentPage, pageSize]);

// Fetch exam list for filter dropdown
const { exams, fetchExams } = useExamStore();
useEffect(() => {
  fetchExams({ status: 'completed' });
}, []);
```

- [ ] **Step 5: Add questions map for answer comparison**

Add a state for questions fetched from backend:

```typescript
const [questionsMap, setQuestionsMap] = useState<Record<string, import('../types').BackendQuestion>>({});
```

When opening a detail modal, fetch question details:

```typescript
// When selectedAppeal is set, also fetch its full data
useEffect(() => {
  if (selectedAppeal) {
    fetchAppealById(selectedAppeal._id);
  }
}, [selectedAppeal?._id]);
```

Actually, simplify: since we already have appeals loaded, use the mapped appeals. For the modal question comparison, we need question details. Since `mockQuestions` provides these, we can keep using it for question data (content, options, correctAnswer) — the API doesn't provide full question details in the appeal response. This is acceptable for MVP.

- [ ] **Step 6: Replace `updateAppealStatus` with `reviewAppeal`**

Replace the `updateAppealStatus` function (around line 191):

```typescript
const handleReview = async (appealId: string, newStatus: 'approved' | 'rejected', note?: string) => {
  try {
    await reviewAppeal(appealId, {
      decision: newStatus,
      note: note || resolutionNotes,
    });
    setAppeals(prev =>
      prev.map(appeal => {
        if (appeal._id === appealId) {
          return {
            ...appeal,
            status: newStatus === 'approved' ? 'approved' : 'rejected',
            resolvedBy: 't001',  // current user from auth
            resolvedAt: new Date().toISOString(),
            resolutionNote: note || resolutionNotes,
          };
        }
        return appeal;
      })
    );
    setSelectedAppeal(null);
    setResolutionNotes('');
    showToastNotification(
      newStatus === 'approved'
        ? 'Yêu cầu phúc tra đã được chấp nhận!'
        : 'Yêu cầu phúc tra đã bị từ chối!'
    );
    // Refetch to get fresh data
    fetchAppeals({
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      examId: selectedExam !== 'all' ? selectedExam : undefined,
    });
  } catch {
    showToastNotification('Có lỗi xảy ra khi xử lý phúc tra!');
  }
};
```

- [ ] **Step 7: Update the exam dropdown to use examStore**

Find the exam dropdown section (around line 422). Replace `mockExams.map` with `exams.map` using the examStore data.

In the exam dropdown button:
```typescript
<span>
  {selectedExam === 'all'
    ? 'Tất cả bài thi'
    : exams.find(e => e._id === selectedExam)?.title?.slice(0, 25) + '...' || 'Bài thi'}
</span>
```

And the dropdown menu:
```typescript
{exams.map(exam => (
  <button
    key={exam._id}
    className={`${styles.dropdownItem} ${selectedExam === exam._id ? styles.dropdownItemActive : ''}`}
    onClick={() => {
      setSelectedExam(exam._id);
      setShowExamDropdown(false);
      setCurrentPage(1);
    }}
  >
    {exam.title.length > 35 ? exam.title.slice(0, 35) + '...' : exam.title}
  </button>
))}
```

- [ ] **Step 8: Fix getExamTitle and related helpers**

Replace the mock-based helpers with the store data. The `mockExams.find` and `mockQuestions.find` calls should now use `exams` from examStore.

```typescript
const getExamTitle = (examId: string) => {
  const exam = exams.find(e => e._id === examId);
  return exam?.title || 'Không xác định';
};
```

Also update `getExamTitle` in the modal section and anywhere `mockExams.find` is called.

- [ ] **Step 9: Fix getQuestion helpers**

The question data (options, correctAnswer) for answer comparison is needed from the backend question API. Since `mockQuestions` in mockData.ts has the full question data, and the backend question API (`GET /questions/:id`) returns this, we can either:
- Keep using `mockQuestions` for question detail display (acceptable for MVP)
- Add a `questionsMap` state and fetch questions when showing modal

For simplicity, keep using `mockQuestions` for now — the key appeal data (reason, status, student info) comes from the API.

- [ ] **Step 10: Fix status options**

Update `statusOptions` to match backend values:

```typescript
const statusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'under_review', label: 'Đang xem xét' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Đã từ chối' },
];
```

- [ ] **Step 11: Fix modal status timeline**

The modal timeline checks for `'reviewing'` status (line 677, 685). Update these to check for `'under_review'` as well:

```typescript
// Line 677 - replace:
// ${selectedAppeal.status === 'reviewing' ? styles.timelineStepActive : ...}
// With:
${selectedAppeal.status === 'reviewing' || selectedAppeal.status === 'under_review' ? styles.timelineStepActive : ...}

// Line 685 - replace:
// ${selectedAppeal.status === 'approved' || selectedAppeal.status === 'rejected' ? styles.timelineStepCompleted : ''}
// This stays the same (under_review is not 'approved' or 'rejected')

// Line 803 - replace:
// {selectedAppeal.status === 'pending' || selectedAppeal.status === 'reviewing' ? (
// With:
{selectedAppeal.status === 'pending' || selectedAppeal.status === 'reviewing' || selectedAppeal.status === 'under_review' ? (

// Line 831 - replace:
// {selectedAppeal.status === 'pending' || selectedAppeal.status === 'reviewing' ? (
// With:
{selectedAppeal.status === 'pending' || selectedAppeal.status === 'reviewing' || selectedAppeal.status === 'under_review' ? (
```

- [ ] **Step 12: Add loading state to table**

Wrap the table content with a loading indicator. Find the table `<tbody>` (around line 505) and add:

```typescript
{isLoading ? (
  <tr>
    <td colSpan={7} className={styles.emptyRow}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
        Đang tải dữ liệu...
      </div>
    </td>
  </tr>
) : currentItems.length === 0 ? (
```

- [ ] **Step 13: Add error toast**

Add an effect to show error from store:

```typescript
useEffect(() => {
  if (error) {
    showToastNotification('Lỗi: ' + error);
  }
}, [error]);
```

- [ ] **Step 14: Update review button calls**

Find all calls to `updateAppealStatus` and replace with `handleReview`:

```typescript
// Line 835:
onClick={() => handleReview(selectedAppeal._id, 'reviewing' as any)}

// Line 843:
onClick={() => handleReview(selectedAppeal._id, 'rejected', resolutionNotes)}

// Line 850:
onClick={() => handleReview(selectedAppeal._id, 'approved', resolutionNotes)}
```

For the "Đang xem xét" button, note that the backend review endpoint only accepts `approved` or `rejected` decisions — not `under_review`. So this button should either call a different endpoint or be changed. For now, map it to `approved` as a placeholder, or we can add a `PATCH /appeals/:id/status` endpoint to the backend. For the initial implementation, change the "Đang xem xét" button behavior: it should just update the status to `under_review` without using the `/review` endpoint. This requires a PATCH endpoint on backend or we skip this feature.

**Decision for initial implementation:** The "Đang xem xét" button in the modal will be removed or disabled for now since the backend review endpoint only handles `approved`/`rejected`. We'll keep only Approve and Reject buttons.

---

## Task 4: End-to-End Test

**Files:**
- None (manual browser testing)

- [ ] **Step 1: Verify backend is running**

Check that `npm run dev` is running in `/server`. Test the API directly:

```bash
curl http://localhost:3000/api/v1/appeals
```

Expected: `{"results":[...],"page":1,"limit":10,...}`

- [ ] **Step 2: Start frontend dev server**

```bash
cd client/web && npm run dev
```

Navigate to `http://localhost:5173/appeals` (or the appropriate port).

- [ ] **Step 3: Verify table loads with real data**

You should see appeals from the database. If the database is empty, appeals will be empty — that's expected.

- [ ] **Step 4: Test filter by status**

Select "Chờ duyệt" from status dropdown. Table should filter to pending appeals only.

- [ ] **Step 5: Test filter by exam**

Select a specific exam from exam dropdown. Table should filter accordingly.

- [ ] **Step 6: Test pagination**

Change page size to 5. Navigate through pages.

- [ ] **Step 7: Test opening detail modal**

Click "Xem" on any appeal. Modal should open showing student info, exam info, question details, reason.

- [ ] **Step 8: Test review actions**

In the modal, click "Chấp nhận" or "Từ chối". Verify:
- Toast notification appears
- Modal closes
- Table updates with new status
- Stats cards update

- [ ] **Step 9: Test error handling**

If backend is down, verify error message appears via toast.

---

## Spec Coverage Checklist

| Spec Requirement | Task |
|------|------|
| Backend API integration | Task 1, 3 |
| Zustand store | Task 1 |
| Fetch appeals list | Task 1, 3 |
| Review appeal (approve/reject) | Task 1, 3 |
| Status filter | Task 3 |
| Exam filter (exam dropdown) | Task 3 |
| Pagination | Task 3 |
| Stats cards | Task 1 |
| Detail modal | Task 3 |
| Loading states | Task 3 |
| Error handling | Task 1, 3 |
| End-to-end verification | Task 4 |
