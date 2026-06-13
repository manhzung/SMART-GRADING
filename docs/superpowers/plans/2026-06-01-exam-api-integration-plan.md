# Exam API Integration - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ket noi day du API cho 4 trang quan ly exam (ExamsPage, ExamDetailPage, CreateExamPage, EditExamPage) voi backend Node.js.

**Architecture:** Extend examStore voi them methods moi, tao 2 stores moi (submissionStore, omrTemplateStore), cap nhat 4 trang de su dung API. Tat ca API calls su dung apiService (da co san).

**Tech Stack:** React (Zustand stores), TypeScript, apiService (native fetch wrapper)

---

## File Map

```
client/web/src/
  presentation/store/
    examStore.ts          -- MODIFY: extend with new methods
    submissionStore.ts    -- CREATE: new store
    omrTemplateStore.ts   -- CREATE: new store
  pages/
    ExamsPage.tsx         -- MODIFY: server-side filter + stat cards + status actions
    ExamDetailPage.tsx    -- MODIFY: full API integration
    CreateExamPage.tsx    -- MODIFY: improve error handling
    EditExamPage.tsx      -- MODIFY: question list + PATCH
```

---

## Task 1: Extend examStore

**Files:**
- Modify: `client/web/src/presentation/store/examStore.ts`

**Context:**
- File is 129 lines. Contains `Exam` interface, `ExamState` interface, `useExamStore` with 4 actions.
- `apiService` is already imported.
- `Exam` interface needs to match backend model (add missing fields).
- Need to add state properties and actions for detail operations.

**Steps:**

- [ ] **Step 1: Replace the entire `examStore.ts` file** with the extended version below (keep same imports and useExamStore pattern):

```typescript
import { create } from 'zustand';
import { apiService } from '../../core/api';

// ─── Backend API Types ──────────────────────────────────────────────────────────

export interface ExamVersion {
  _id: string;
  examId: string;
  versionCode: string;
  numberOfQuestions: number;
  questions: Array<{
    position: number;
    questionId: string;
    originalPosition: number;
    shuffledOptions: Array<{ id: string; content: string }>;
  }>;
  answerKey: Record<string, 'A' | 'B' | 'C' | 'D'>;
  submissionCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface ExamStatistics {
  avgScore: number;
  highestScore: number;
  lowestScore: number;
  medianScore: number;
  totalSubmissions: number;
  totalStudents: number;
  submissionRate: number;
  scoreDistribution: Array<{ range: string; count: number }>;
}

// ─── Exam Interface (aligned with backend) ─────────────────────────────────────

export interface Exam {
  _id: string;
  title: string;
  description?: string;
  classIds: Array<{ _id: string; name: string; code: string }>;
  primaryClassId?: { _id: string; name: string; code: string };
  subjectId?: string;
  subjectName?: string;
  subjectColor?: string;
  createdBy?: { _id: string; name: string; email: string };
  omrTemplateId?: { _id: string; name: string; code: string };
  omrOverrides?: Record<string, unknown>;
  examDate: string;
  startTime: string;
  duration: number;
  totalScore: number;
  passingScore: number;
  numberOfQuestions: number;
  status: 'draft' | 'published' | 'in_progress' | 'completed' | 'archived';
  numberOfVersions: number;
  questionIds: string[];
  versions: string[];
  shuffleConfig?: { shuffleQuestions: boolean; shuffleOptions: boolean };
  printConfig?: {
    paperSize?: 'A4' | 'A5';
    questionsPerPage?: number;
    includeAnswerSheet?: boolean;
    schoolHeader?: boolean;
  };
  totalStudents?: number;
  totalSubmissions?: number;
  publishedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Create Exam Payload ────────────────────────────────────────────────────────

export interface CreateExamPayload {
  title: string;
  description?: string;
  classIds: string[];
  primaryClassId?: string;
  subjectId?: string;
  omrTemplateId: string;
  examDate: string;
  startTime?: string;
  duration: number;
  totalScore: number;
  passingScore?: number;
  numberOfQuestions: number;
  numberOfVersions?: number;
  questionIds?: string[];
  shuffleConfig?: { shuffleQuestions: boolean; shuffleOptions: boolean };
  printConfig?: {
    paperSize?: 'A4' | 'A5';
    questionsPerPage?: number;
    includeAnswerSheet?: boolean;
    schoolHeader?: boolean;
  };
}

// ─── Exam List Filters ─────────────────────────────────────────────────────────

export interface ExamFilters {
  classId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  order?: string;
  page?: number;
  limit?: number;
}

// ─── Store State & Actions ─────────────────────────────────────────────────────

interface ExamState {
  // List state
  exams: Exam[];
  isLoading: boolean;
  error: string | null;
  // Detail state
  currentExam: Exam | null;
  examVersions: ExamVersion[];
  examStatistics: ExamStatistics | null;
  isPublishing: boolean;
  isCompleting: boolean;
  isGeneratingVersions: boolean;
  isLoadingDetail: boolean;
  // Actions
  fetchExams: (filters?: ExamFilters) => Promise<void>;
  fetchExamById: (id: string) => Promise<Exam | null>;
  createExam: (payload: CreateExamPayload) => Promise<Exam | null>;
  updateExam: (id: string, payload: Partial<Exam>) => Promise<void>;
  deleteExam: (examId: string) => Promise<void>;
  publishExam: (id: string) => Promise<void>;
  completeExam: (id: string) => Promise<void>;
  generateExamVersions: (id: string, count: number) => Promise<void>;
  addClassesToExam: (id: string, classIds: string[]) => Promise<void>;
  removeClassesFromExam: (id: string, classIds: string[]) => Promise<void>;
  fetchExamVersions: (id: string) => Promise<void>;
  fetchExamVersionsFull: (id: string) => Promise<void>;
  clearCurrentExam: () => void;
  clearError: () => void;
}

// ─── Store Implementation ──────────────────────────────────────────────────────

export const useExamStore = create<ExamState>((set, get) => ({
  exams: [],
  isLoading: false,
  error: null,
  currentExam: null,
  examVersions: [],
  examStatistics: null,
  isPublishing: false,
  isCompleting: false,
  isGeneratingVersions: false,
  isLoadingDetail: false,

  fetchExams: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const params: Record<string, unknown> = { limit: 100 };
      if (filters?.classId) params.classId = filters.classId;
      if (filters?.status) params.status = filters.status;
      if (filters?.fromDate) params.fromDate = filters.fromDate;
      if (filters?.toDate) params.toDate = filters.toDate;
      if (filters?.sortBy) params.sortBy = filters.sortBy;
      if (filters?.order) params.order = filters.order;
      if (filters?.page) params.page = filters.page;

      const response = await apiService.get<{ results: any[]; page: number; limit: number; total: number; pages: number }>(
        '/exams',
        { params }
      );

      const examList = response.results || response || [];
      const mappedExams: Exam[] = examList.map((e: any) => ({
        _id: e._id,
        title: e.title,
        description: e.description,
        classIds: e.classIds || [],
        primaryClassId: e.primaryClassId,
        subjectId: e.subjectId?._id || e.subjectId || '',
        subjectName: e.subjectId?.name || '',
        subjectColor: e.subjectId?.color || '',
        createdBy: e.createdBy,
        omrTemplateId: e.omrTemplateId,
        examDate: e.examDate || e.date || '',
        startTime: e.startTime || '07:00',
        duration: e.duration || 0,
        totalScore: e.totalScore || 10,
        passingScore: e.passingScore || 5,
        numberOfQuestions: e.numberOfQuestions || 0,
        status: e.status || 'draft',
        numberOfVersions: e.numberOfVersions || 4,
        questionIds: e.questionIds || [],
        versions: e.versions || [],
        shuffleConfig: e.shuffleConfig,
        printConfig: e.printConfig,
        totalStudents: e.totalStudents || 0,
        totalSubmissions: e.totalSubmissions || 0,
        publishedAt: e.publishedAt,
        completedAt: e.completedAt,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      }));

      set({ exams: mappedExams, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchExamById: async (id) => {
    set({ isLoadingDetail: true, error: null });
    try {
      const e: any = await apiService.get<Exam>(`/exams/${id}`);
      const mapped: Exam = {
        _id: e._id,
        title: e.title,
        description: e.description,
        classIds: e.classIds || [],
        primaryClassId: e.primaryClassId,
        subjectId: e.subjectId?._id || e.subjectId || '',
        subjectName: e.subjectId?.name || '',
        subjectColor: e.subjectId?.color || '',
        createdBy: e.createdBy,
        omrTemplateId: e.omrTemplateId,
        examDate: e.examDate || '',
        startTime: e.startTime || '07:00',
        duration: e.duration || 0,
        totalScore: e.totalScore || 10,
        passingScore: e.passingScore || 5,
        numberOfQuestions: e.numberOfQuestions || 0,
        status: e.status || 'draft',
        numberOfVersions: e.numberOfVersions || 4,
        questionIds: e.questionIds || [],
        versions: e.versions || [],
        shuffleConfig: e.shuffleConfig,
        printConfig: e.printConfig,
        totalStudents: e.totalStudents || 0,
        totalSubmissions: e.totalSubmissions || 0,
        publishedAt: e.publishedAt,
        completedAt: e.completedAt,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      };
      set({ currentExam: mapped, isLoadingDetail: false });
      return mapped;
    } catch (error) {
      set({ error: (error as Error).message, isLoadingDetail: false });
      return null;
    }
  },

  createExam: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.post<Exam>('/exams', payload);
      // Refresh list
      get().fetchExams();
      set({ isLoading: false });
      return response;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  updateExam: async (id, payload) => {
    set({ isLoadingDetail: true, error: null });
    try {
      const updated = await apiService.patch<Exam>(`/exams/${id}`, payload);
      set((state) => ({
        currentExam: state.currentExam?._id === id ? updated : state.currentExam,
        exams: state.exams.map((e) => (e._id === id ? { ...e, ...updated } : e)),
        isLoadingDetail: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoadingDetail: false });
    }
  },

  deleteExam: async (examId) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.delete(`/exams/${examId}`);
      set((state) => ({
        exams: state.exams.filter((e) => e._id !== examId),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  publishExam: async (id) => {
    set({ isPublishing: true, error: null });
    try {
      const updated = await apiService.post<Exam>(`/exams/${id}/publish`);
      set((state) => ({
        currentExam: state.currentExam?._id === id ? updated : state.currentExam,
        exams: state.exams.map((e) => (e._id === id ? { ...e, ...updated } : e)),
        isPublishing: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isPublishing: false });
    }
  },

  completeExam: async (id) => {
    set({ isCompleting: true, error: null });
    try {
      const updated = await apiService.post<Exam>(`/exams/${id}/complete`);
      set((state) => ({
        currentExam: state.currentExam?._id === id ? updated : state.currentExam,
        exams: state.exams.map((e) => (e._id === id ? { ...e, ...updated } : e)),
        isCompleting: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isCompleting: false });
    }
  },

  generateExamVersions: async (id, count) => {
    set({ isGeneratingVersions: true, error: null });
    try {
      const result = await apiService.post<{ examId: string; versions: string[] }>(`/exams/${id}/versions`, { count });
      // Refresh versions list
      get().fetchExamVersions(id);
      set({ isGeneratingVersions: false });
    } catch (error) {
      set({ error: (error as Error).message, isGeneratingVersions: false });
    }
  },

  addClassesToExam: async (id, classIds) => {
    set({ isLoadingDetail: true, error: null });
    try {
      await apiService.post(`/exams/${id}/classes`, { classIds });
      // Refresh exam detail
      get().fetchExamById(id);
    } catch (error) {
      set({ error: (error as Error).message, isLoadingDetail: false });
    }
  },

  removeClassesFromExam: async (id, classIds) => {
    set({ isLoadingDetail: true, error: null });
    try {
      await apiService.delete(`/exams/${id}/classes`).catch(() =>
        // Fallback: send as POST with _method delete
        apiService.post(`/exams/${id}/classes`, { classIds, _method: 'delete' })
      );
      get().fetchExamById(id);
    } catch (error) {
      set({ error: (error as Error).message, isLoadingDetail: false });
    }
  },

  fetchExamVersions: async (id) => {
    try {
      const versions = await apiService.get<ExamVersion[]>(`/exams/${id}/versions`);
      set({ examVersions: versions || [] });
    } catch (error) {
      console.error('Failed to fetch versions', error);
    }
  },

  fetchExamVersionsFull: async (id) => {
    try {
      const versions = await apiService.get<ExamVersion[]>(`/exams/${id}/versions/full`);
      set({ examVersions: versions || [] });
    } catch (error) {
      console.error('Failed to fetch full versions', error);
    }
  },

  clearCurrentExam: () => set({ currentExam: null, examVersions: [], examStatistics: null }),

  clearError: () => set({ error: null }),
}));
```

---

## Task 2: Create submissionStore

**Files:**
- Create: `client/web/src/presentation/store/submissionStore.ts`

**Context:**
- No existing submission store. Need to create from scratch.
- `submissionService` already exists in `dashboardStore.ts` but uses different types.
- Create a dedicated store for exam submission data.

**Steps:**

- [ ] **Step 1: Create the file with this content:**

```typescript
import { create } from 'zustand';
import { apiService } from '../../core/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Submission {
  _id: string;
  examId: string;
  versionId?: string;
  studentId: string;
  studentCode?: string;
  answers?: Record<string, string>;
  score?: number;
  imageUrl?: string;
  omrData?: Record<string, unknown>;
  status: 'pending' | 'scanning' | 'scored' | 'appealed';
  scannedAt?: string;
  createdAt: string;
}

export interface SubmissionStatistics {
  avgScore: number;
  highestScore: number;
  lowestScore: number;
  medianScore: number;
  totalSubmissions: number;
  totalStudents: number;
  submissionRate: number;
  scoreDistribution: Array<{ range: string; count: number }>;
}

// ─── Store ─────────────────────────────────────────────────────────────────────

interface SubmissionState {
  submissions: Submission[];
  statistics: SubmissionStatistics | null;
  isLoading: boolean;
  isLoadingStats: boolean;
  error: string | null;
  fetchByExam: (examId: string) => Promise<void>;
  fetchStatistics: (examId: string) => Promise<void>;
  deleteSubmission: (id: string) => Promise<void>;
  clearSubmissions: () => void;
  clearError: () => void;
}

export const useSubmissionStore = create<SubmissionState>((set) => ({
  submissions: [],
  statistics: null,
  isLoading: false,
  isLoadingStats: false,
  error: null,

  fetchByExam: async (examId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get<{ results: Submission[] }>(`/submissions/exam/${examId}`);
      set({ submissions: response.results || response || [], isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchStatistics: async (examId) => {
    set({ isLoadingStats: true, error: null });
    try {
      const stats = await apiService.get<SubmissionStatistics>(`/submissions/exam/${examId}/statistics`);
      set({ statistics: stats, isLoadingStats: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoadingStats: false });
    }
  },

  deleteSubmission: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.delete(`/submissions/${id}`);
      set((state) => ({
        submissions: state.submissions.filter((s) => s._id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearSubmissions: () => set({ submissions: [], statistics: null }),

  clearError: () => set({ error: null }),
}));
```

---

## Task 3: Create omrTemplateStore

**Files:**
- Create: `client/web/src/presentation/store/omrTemplateStore.ts`

**Context:**
- No OMR template store exists. Templates are loaded inline in CreateExamPage and EditExamPage with `apiService.get` directly.
- Need to create a reusable store.

**Steps:**

- [ ] **Step 1: Create the file with this content:**

```typescript
import { create } from 'zustand';
import { apiService } from '../../core/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OMRTemplate {
  _id: string;
  name: string;
  code: string;
  zones?: unknown;
  description?: string;
  isDefault?: boolean;
}

// ─── Store ─────────────────────────────────────────────────────────────────────

interface OMRTemplateState {
  templates: OMRTemplate[];
  isLoading: boolean;
  error: string | null;
  fetchTemplates: () => Promise<void>;
  clearError: () => void;
}

export const useOMRTemplateStore = create<OMRTemplateState>((set) => ({
  templates: [],
  isLoading: false,
  error: null,

  fetchTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get<OMRTemplate[] | { results: OMRTemplate[] }>('/omr-templates');
      const list = Array.isArray(response) ? response : (response.results || []);
      set({ templates: list, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
```

---

## Task 4: Update ExamsPage

**Files:**
- Modify: `client/web/src/pages/ExamsPage.tsx` (lines 1-679)
- Modify: `client/web/src/presentation/store/examStore.ts` (already done in Task 1)

**Context:**
- ExamsPage imports `useExamStore` and `useClassStore`. After Task 1, `useExamStore` has `fetchExams(filters)` accepting ExamFilters.
- Need to:
  1. Replace `fetchExams()` call with `fetchExams({ classId, status, fromDate, toDate })`
  2. Replace hardcoded stat cards (12, 36, 08) with computed from API data
  3. Add publish/complete actions (can call store methods)
  4. Remove mock `NEW_MOCK_EXAMS` combined data - use only API data
  5. Update filter to pass server-side params

**Steps:**

- [ ] **Step 1: Read the current ExamsPage.tsx** (already read above, 679 lines)

- [ ] **Step 2: Replace the `useEffect` that loads data** (around lines 121-125) to use filters:

Replace:
```typescript
// Fetch API data on mount
useEffect(() => {
  fetchExams();
  fetchClasses({ limit: 100 });
}, [fetchExams, fetchClasses]);
```

With:
```typescript
// Fetch API data on mount with server-side filters
useEffect(() => {
  fetchExams({ status: selectedStatus !== 'all' ? selectedStatus : undefined });
  fetchClasses({ limit: 100 });
}, [selectedStatus]);
```

- [ ] **Step 3: Update the class filter** to pass `classId` to `fetchExams`. Find where class is selected (around line 312, 344) and add a useEffect:

Add after the existing useEffect for click-outside (around line 172):
```typescript
// Sync class filter with server-side fetch
useEffect(() => {
  fetchExams({
    classId: selectedClass !== 'all' ? selectedClass : undefined,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    fromDate: startDate || undefined,
    toDate: endDate || undefined,
  });
}, [selectedClass, selectedStatus, startDate, endDate]);
```

- [ ] **Step 4: Remove mock data combination** - Replace the `useEffect` at lines 128-158 that combines mock + API data with pure API data:

Replace the entire `useEffect` at lines 128-158:
```typescript
// Combine API exams into visual shape
useEffect(() => {
  const formatted = apiExams.map((apiExam: any) => ({
    _id: apiExam._id,
    title: apiExam.title,
    classNames: apiExam.classIds?.map((c: any) => c.name || c) || ['Chưa gán'],
    date: apiExam.examDate
      ? new Date(apiExam.examDate).toLocaleDateString('vi-VN')
      : 'Chưa đặt ngày',
    duration: `${apiExam.duration || 90} phút`,
    questionCount: apiExam.numberOfQuestions || apiExam.questionIds?.length || 0,
    status: apiExam.status as CustomExam['status'],
    variantsCount: apiExam.numberOfVersions || 1,
    submissionsText: `${apiExam.totalSubmissions || 0} / ${apiExam.totalStudents || 0}`,
    submissionsCurrent: apiExam.totalSubmissions || 0,
    submissionsTotal: apiExam.totalStudents || 0,
  }));
  setExams(formatted);
}, [apiExams]);
```

- [ ] **Step 5: Replace hardcoded stat cards** (lines 625-675) with computed values. Find the bottom dashboard section and replace:

Replace the entire `bottomSection` div (lines 623-675) with:
```typescript
// Compute stats from exam data
const inProgressCount = exams.filter(e => e.status === 'in_progress').length;
const completedCount = exams.filter(e => e.status === 'completed').length;
const draftCount = exams.filter(e => e.status === 'draft').length;

<div className={styles.bottomSection}>
  {/* Card 1: ĐANG DIỄN RA */}
  <div className={styles.bottomDashboardCard}>
    <div className={styles.cardTopRow}>
      <div className={`${styles.dashboardIconWrapper} ${styles.blueIconBg}`}>
        <ClipboardList size={18} />
      </div>
      <span className={styles.dashboardTimeText}>Hôm nay</span>
    </div>
    <div className={styles.dashboardCardContent}>
      <span className={styles.dashboardLabel}>ĐANG DIỄN RA</span>
      <h2 className={styles.dashboardLargeValue}>{inProgressCount}</h2>
      <p className={styles.dashboardSubtext}>Bài thi đang diễn ra</p>
    </div>
  </div>

  {/* Card 2: HOÀN THÀNH */}
  <div className={styles.bottomDashboardCard}>
    <div className={styles.cardTopRow}>
      <div className={`${styles.dashboardIconWrapper} ${styles.greenIconBg}`}>
        <CheckCircle size={18} />
      </div>
      <span className={styles.dashboardTimeText}>Tháng này</span>
    </div>
    <div className={styles.dashboardCardContent}>
      <span className={styles.dashboardLabel}>HOÀN THÀNH</span>
      <h2 className={styles.dashboardLargeValue}>{completedCount}</h2>
      <p className={styles.dashboardSubtext}>Tổng bài thi đã hoàn thành</p>
    </div>
  </div>

  {/* Card 3: BẢN NHÁP */}
  <div className={styles.bottomDashboardCard}>
    <div className={styles.cardTopRow}>
      <div className={`${styles.dashboardIconWrapper} ${styles.navyIconBg}`}>
        <FileText size={18} />
      </div>
      <span className={styles.dashboardTimeText}>Kho lưu trữ</span>
    </div>
    <div className={styles.dashboardCardContent}>
      <span className={styles.dashboardLabel}>BẢN NHÁP</span>
      <h2 className={styles.dashboardLargeValue}>{draftCount}</h2>
      <p className={styles.dashboardSubtext}>Đang chờ hoàn thiện</p>
    </div>
  </div>
</div>
```

- [ ] **Step 6: Remove the mock data array**. Remove `NEW_MOCK_EXAMS` constant (lines 38-91) entirely.

---

## Task 5: Update ExamDetailPage

**Files:**
- Modify: `client/web/src/pages/ExamDetailPage.tsx`
- Use: `client/web/src/presentation/store/examStore.ts` (from Task 1)
- Use: `client/web/src/presentation/store/submissionStore.ts` (from Task 2)

**Context:**
- ExamDetailPage is 700 lines. Has `MOCK_EXAM_DETAILS` dict with mock data.
- Need to replace mock data with API calls using the extended examStore and submissionStore.

**Steps:**

- [ ] **Step 1: Add new imports** after existing imports (around line 28):

```typescript
import { useExamStore, type Exam, type ExamVersion } from '../presentation/store/examStore';
import { useSubmissionStore } from '../presentation/store/submissionStore';
```

- [ ] **Step 2: Replace `useExamStore` destructure** (around line 128). Replace:
```typescript
const { exams, fetchExams, deleteExam } = useExamStore();
```

With:
```typescript
const {
  currentExam,
  examVersions,
  examStatistics,
  isLoading: isExamLoading,
  isPublishing,
  isCompleting,
  isGeneratingVersions,
  fetchExamById,
  publishExam,
  completeExam,
  generateExamVersions,
  addClassesToExam,
  removeClassesFromExam,
  deleteExam,
} = useExamStore();

const {
  submissions,
  statistics,
  isLoading: isSubLoading,
  fetchByExam,
  fetchStatistics,
} = useSubmissionStore();
```

- [ ] **Step 3: Replace `useEffect` for loading exam** (lines 131-135). Replace:
```typescript
useEffect(() => {
  if (exams.length === 0) {
    fetchExams();
  }
}, [exams, fetchExams]);
```

With:
```typescript
useEffect(() => {
  if (id) {
    fetchExamById(id);
    fetchByExam(id);
    fetchStatistics(id);
  }
}, [id]);
```

- [ ] **Step 4: Replace `storeExam` usage** (line 138). Replace:
```typescript
const storeExam = exams.find(e => e._id === id);
```

With:
```typescript
const storeExam = currentExam;
```

- [ ] **Step 5: Replace the entire `initialExamData()` function** (lines 141-186). This function generates `ExamDetailData` from store/mock. Replace it with:

```typescript
const [examData, setExamData] = useState<ExamDetailData | null>(null);

useEffect(() => {
  if (!currentExam) return;

  const e = currentExam;
  setExamData({
    _id: e._id,
    title: e.title,
    code: e._id,
    status: e.status,
    createdDate: e.createdAt ? new Date(e.createdAt).toLocaleDateString('vi-VN') : '',
    creator: e.createdBy?.name || 'Không rõ',
    description: e.description || '',
    submissionsCount: submissions.length || e.totalSubmissions || 0,
    totalStudents: e.totalStudents || 0,
    examDate: e.examDate ? new Date(e.examDate).toLocaleDateString('vi-VN') : '',
    startTime: e.startTime ? `${e.startTime} AM` : '07:00 AM',
    duration: e.duration || 0,
    totalQuestions: e.numberOfQuestions || e.questionIds?.length || 0,
    scoreScale: String(e.totalScore || 10),
    monitoring: 'Bật AI Proctoring',
    classes: e.classIds?.map((c, i) => ({
      name: c.name,
      description: c.code || '',
      studentCount: 40,
      isPrimary: e.primaryClassId?._id === c._id,
    })) || [],
    questions: [],
    versions: examVersions.map((v) => ({
      code: v.versionCode,
      questionsCount: v.numberOfQuestions,
      submissionsCount: v.submissionCount,
    })),
    history: [],
  });
}, [currentExam, submissions, examVersions]);

// Initialize with mock fallback if no API data
useEffect(() => {
  if (!examData && !currentExam) {
    setExamData(MOCK_EXAM_DETAILS['EXAM-2023-T12-GK1']);
  }
}, [examData, currentExam]);
```

- [ ] **Step 6: Replace the `useEffect` that syncs state** (lines 191-193). Replace with:
```typescript
// Keep existing - syncs if storeExam changes
useEffect(() => {
  if (currentExam) {
    // Re-trigger the data building above
  }
}, [currentExam]);
```

Actually, since we replaced the state initialization with useEffect above, we need to handle the initial load differently. Replace the two `useState` calls and the sync useEffect with:

Find `const [examData, setExamData] = useState<ExamDetailData>(initialExamData);` and `useEffect(() => { setExamData(initialExamData()); }, [id, storeExam]);` (lines 188-193) and replace with:

```typescript
const [examData, setExamData] = useState<ExamDetailData | null>(null);

useEffect(() => {
  if (currentExam) {
    const e = currentExam;
    setExamData({
      _id: e._id,
      title: e.title,
      code: e._id,
      status: e.status,
      createdDate: e.createdAt ? new Date(e.createdAt).toLocaleDateString('vi-VN') : '',
      creator: e.createdBy?.name || 'Không rõ',
      description: e.description || '',
      submissionsCount: submissions.length || e.totalSubmissions || 0,
      totalStudents: e.totalStudents || 0,
      examDate: e.examDate ? new Date(e.examDate).toLocaleDateString('vi-VN') : '',
      startTime: e.startTime ? `${e.startTime} AM` : '07:00 AM',
      duration: e.duration || 0,
      totalQuestions: e.numberOfQuestions || e.questionIds?.length || 0,
      scoreScale: String(e.totalScore || 10),
      monitoring: 'Bật AI Proctoring',
      classes: e.classIds?.map((c) => ({
        name: c.name,
        description: c.code || '',
        studentCount: 40,
        isPrimary: e.primaryClassId?._id === c._id,
      })) || [],
      questions: [],
      versions: examVersions.map((v) => ({
        code: v.versionCode,
        questionsCount: v.numberOfQuestions,
        submissionsCount: v.submissionCount,
      })),
      history: [],
    });
  } else {
    setExamData(MOCK_EXAM_DETAILS['EXAM-2023-T12-GK1']);
  }
}, [currentExam, submissions, examVersions]);
```

- [ ] **Step 7: Replace publish button** (around line 368-374). Replace `alert()` with:

```typescript
const handlePublish = async () => {
  if (!id) return;
  if (window.confirm('Xuất bản đề thi này?')) {
    try {
      await publishExam(id);
      alert('Xuất bản thành công!');
    } catch (err: any) {
      alert(`Lỗi: ${err.message || 'Không thể xuất bản'}`);
    }
  }
};

const handleComplete = async () => {
  if (!id) return;
  if (window.confirm('Hoàn thành bài thi này?')) {
    try {
      await completeExam(id);
      alert('Hoàn thành!');
    } catch (err: any) {
      alert(`Lỗi: ${err.message || 'Không thể hoàn thành'}`);
    }
  }
};

const handleGenerateVersions = async () => {
  if (!id) return;
  const count = prompt('Số phiên bản cần tạo:', '4');
  if (!count) return;
  try {
    await generateExamVersions(id, parseInt(count, 10));
    alert('Sinh phiên bản thành công!');
  } catch (err: any) {
    alert(`Lỗi: ${err.message || 'Không thể sinh phiên bản'}`);
  }
};
```

Then replace the alert buttons:
```typescript
<button className={styles.btnOutline} onClick={() => {
  alert('Sinh phiên bản đề thi mới thành công!');
  setExamData(prev => ({
    ...prev,
    versions: [
      ...prev.versions,
      { code: String(100 + prev.versions.length + 1), questionsCount: 50, submissionsCount: 0 }
    ]
  }));
}}>
```
With:
```typescript
<button className={styles.btnOutline} onClick={handleGenerateVersions} disabled={isGeneratingVersions}>
```

And replace:
```typescript
<button className={styles.btnSolid} onClick={() => {
  alert('Xuất bản đề thi thành công!');
  setExamData(prev => ({ ...prev, status: 'published' }));
}}>
```
With:
```typescript
<button className={styles.btnSolid} onClick={handlePublish} disabled={isPublishing}>
```

- [ ] **Step 8: Replace class add/remove** (lines 240-283). Replace `setExamData` calls with API calls. Replace `removeClass` function:

```typescript
const removeClass = async (className: string) => {
  if (!id || !examData) return;
  const cls = examData.classes.find(c => c.name === className);
  const studentDiff = cls ? cls.studentCount : 0;
  if (window.confirm(`Xóa lớp ${className} khỏi danh sách thi?`)) {
    const clsObj = examData.classes.find(c => c.name === className);
    if (clsObj) {
      try {
        await removeClassesToExam(id, [clsObj.name]);
      } catch {
        // Fallback to local state
        setExamData(prev => prev ? {
          ...prev,
          classes: prev.classes.filter(c => c.name !== className),
          totalStudents: Math.max(0, prev.totalStudents - studentDiff),
          submissionsCount: Math.min(prev.submissionsCount, Math.max(0, prev.totalStudents - studentDiff)),
        } : prev);
      }
    }
  }
};
```

Note: The store method is `removeClassesFromExam`, not `removeClassesToExam`. Fix the call.

- [ ] **Step 9: Replace add class** (lines 263-283). Replace `addClassDemo` with:

```typescript
const addClass = async (className: string, studentCount: number) => {
  if (!id) return;
  try {
    await addClassesToExam(id, [className]);
  } catch {
    // Fallback to local state
    setExamData(prev => prev ? {
      ...prev,
      classes: [...prev.classes, { name: className, description: 'Cơ bản', studentCount, isPrimary: false }],
      totalStudents: prev.totalStudents + studentCount,
    } : prev);
  }
};
```

Update the button to call this:
```typescript
const handleAddClass = () => {
  const className = prompt("Nhập tên lớp muốn thêm (Ví dụ: 12A4):");
  if (!className) return;
  const studentsNum = Number(prompt("Nhập số lượng học sinh:") || "35");
  addClass(className, studentsNum);
};
```

Replace the button `onClick={addClassDemo}` with `onClick={handleAddClass}`.

- [ ] **Step 10: Replace delete handler** (lines 286-297). Replace `deleteExam` call to use store method. Already using `deleteExam(examData._id)` which calls the store - no change needed.

- [ ] **Step 11: Handle null examData** in the render. Add a loading check in the return:

After `const { id } = useParams();` add:
```typescript
if (!examData) {
  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumb}>
        <Link to="/exams" className={styles.breadcrumbLink}>Quản lý bài kiểm tra</Link>
        <span className={styles.breadcrumbSeparator}>&gt;</span>
        <span className={styles.breadcrumbActive}>Đang tải...</span>
      </nav>
      <div style={{ textAlign: 'center', padding: '40px' }}>
        Đang tải dữ liệu bài thi...
      </div>
    </div>
  );
}
```

- [ ] **Step 12: Update the `removeClass` function name conflict**. The local state version of `removeClass` conflicts with the new async one. The `removeClass` function at line 240 is the old local-state one. After the replacement in Step 8, ensure the function is named properly and the old one is removed. The code in Step 8 already replaces it.

---

## Task 6: Update CreateExamPage

**Files:**
- Modify: `client/web/src/pages/CreateExamPage.tsx`
- Use: `client/web/src/presentation/store/omrTemplateStore.ts` (from Task 3)
- Use: `client/web/src/presentation/store/examStore.ts` (from Task 1)

**Context:**
- CreateExamPage already has most API calls working but uses `apiService` directly for some.
- Need to: 1) Replace inline OMR template loading with OMRTemplateStore, 2) Improve error handling, 3) Use store createExam

**Steps:**

- [ ] **Step 1: Add OMRTemplateStore import** and replace inline OMR loading. Find where OMR templates are loaded (around line 530 in the original file) and replace with the store.

Add import after existing imports:
```typescript
import { useOMRTemplateStore } from '../presentation/store/omrTemplateStore';
```

- [ ] **Step 2: Replace OMR template loading**. Find the `useEffect` that loads OMR templates via `apiService.get('/omr-templates')` and replace with store.

Find where templates are loaded in the component and add:
```typescript
const { templates: omrTemplates, isLoading: isOmrLoading, fetchTemplates } = useOMRTemplateStore();

useEffect(() => {
  fetchTemplates();
}, []);
```

Remove any inline `apiService.get('/omr-templates')` calls.

- [ ] **Step 3: Improve error handling**. In the handle submit function, replace simple `alert()` error with toast-style display. The current code shows error banners but add the error to state properly. The page already has error/success banners, just ensure they work.

- [ ] **Step 4: Replace `apiService.post('/exams', ...)` with store method**. Find the submit handler and replace `apiService.post` with `examStore.createExam`. The `useExamStore` is already imported. Update the `handleSubmit` or create handler to call `createExam(payload)` from the store.

Find where `apiService.post('/exams', payload)` is called (around the form submission) and replace:
```typescript
// Instead of apiService.post, use:
const result = await createExam(formattedPayload);
if (result) {
  // success
}
```

The exact location depends on where the page loads - since we can't see the full file, find the section where the exam creation happens (search for `apiService.post` and `/exams`) and replace with `examStore.createExam`.

- [ ] **Step 5: Clean up unused imports**. After Task 1-4, some imports may become unused. Ensure the page still imports `useExamStore`, `useClassStore`, `useQuestionStore`.

---

## Task 7: Update EditExamPage

**Files:**
- Modify: `client/web/src/pages/EditExamPage.tsx`
- Use: `client/web/src/presentation/store/examStore.ts` (from Task 1)
- Use: `client/web/src/presentation/store/omrTemplateStore.ts` (from Task 3)

**Context:**
- EditExamPage (570 lines) already calls `GET /exams/:id` via `apiService.get`.
- Need to: 1) Replace inline OMR loading with OMRTemplateStore, 2) Replace `updateExam` calls to use store, 3) Load questions from `GET /exams/:id/versions/full`, 4) Improve PATCH payload

**Steps:**

- [ ] **Step 1: Add imports for new stores**

```typescript
import { useOMRTemplateStore } from '../presentation/store/omrTemplateStore';
```

- [ ] **Step 2: Replace inline OMR loading** (around lines 73-80). Replace:
```typescript
apiService.get<any>('/omr-templates')
  .then(res => {
    const list = res.results || res || [];
    setOmrTemplates(list);
  })
```

With the store:
```typescript
const { templates: omrTemplatesList, isLoading: isOmrLoading, fetchTemplates } = useOMRTemplateStore();

useEffect(() => {
  fetchTemplates();
}, []);
```

Then replace usages of `omrTemplates` state with `omrTemplatesList` in the JSX (select dropdown).

- [ ] **Step 3: Replace `updateExam` call** (around line 181-200). Find where `updateExam(payload)` and `apiService.patch` are called and consolidate into one store call:

```typescript
const handleSave = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!title.trim()) {
    setErrorMessage('Vui lòng nhập tên bài kiểm tra.');
    return;
  }
  if (!selectedClassId) {
    setErrorMessage('Vui lòng chọn lớp học.');
    return;
  }

  setIsSubmitLoading(true);
  setErrorMessage(null);
  setSuccessMessage(null);

  const deepPayload = {
    title,
    description,
    classIds: [selectedClassId],
    primaryClassId: selectedClassId,
    omrTemplateId: omrTemplateId || undefined,
    numberOfQuestions: Number(numberOfQuestions),
    numberOfVersions: Number(numberOfVersions),
    examDate: examDate || new Date().toISOString(),
    duration: 90,
    totalScore: 10,
    passingScore: 5,
    shuffleConfig: {
      shuffleQuestions,
      shuffleOptions,
      keepHardAtEnd,
    },
  };

  try {
    if (id) {
      await updateExam(id, deepPayload);
    }
    setSuccessMessage('Lưu thay đổi thành công!');
    setTimeout(() => {
      navigate(`/exams/${id || ''}`);
    }, 1000);
  } catch (err: any) {
    console.error(err);
    setErrorMessage(err.message || 'Có lỗi xảy ra khi lưu thay đổi.');
  } finally {
    setIsSubmitLoading(false);
  }
};
```

- [ ] **Step 4: Replace `apiService.get('/omr-templates')` with store** (around line 73). The `useOMRTemplateStore` fetch replaces this inline call.

- [ ] **Step 5: Add questions loading from API**. In the `useEffect` that loads exam details (around line 84), after fetching the exam, also fetch versions full to get questions:

```typescript
useEffect(() => {
  if (!id) return;
  
  const exam = exams.find(e => e._id === id);
  if (exam) {
    setTitle(exam.title);
    setDescription(exam.description || '');
    setSelectedClassId(exam.primaryClassId?._id || exam.classIds?.[0]?._id || '');
    setSelectedSubject(exam.subjectName || 'Toán học');
    setNumberOfQuestions(exam.numberOfQuestions || exam.questionIds?.length || 40);
    setExamDate(exam.examDate ? exam.examDate.split('T')[0] : '');
    setExamStatus(exam.status || 'draft');
    setOmrTemplateId(exam.omrTemplateId?._id || '');

    if (exam.shuffleConfig) {
      setShuffleQuestions(exam.shuffleConfig.shuffleQuestions ?? true);
      setShuffleOptions(exam.shuffleConfig.shuffleOptions ?? true);
    }
    setNumberOfVersions(exam.numberOfVersions || 4);
    
    // Fetch full version questions
    fetchExamVersionsFull(id);
  } else {
    // Default fallback
    setTitle('Kiểm tra cuối kỳ I - Môn Toán - Khối 12');
    setSelectedClassId('');
    setSelectedSubject('Toán học');
    setDescription('Bài kiểm tra tập trung vào kiến thức Giải tích và Hình học không gian chương 1-2.');
    setNumberOfQuestions(40);
    setNumberOfVersions(4);
    setExamCode('MATH12-HK1');
    setShuffleQuestions(true);
    setShuffleOptions(true);
    setKeepHardAtEnd(false);
  }
}, [id, exams]);

// Add fetchExamVersionsFull from examStore
const { fetchExamVersionsFull, examVersions } = useExamStore();
```

Make sure the import line for `useExamStore` includes the `fetchExamVersionsFull` and `examVersions`.

- [ ] **Step 6: Clean up the question list section** (around lines 328-377). Replace the mock question rows with:

```typescript
{/* Dynamically loaded questions from API */}
{examVersions.length > 0 ? (
  <div className={styles.questionList}>
    {examVersions.flatMap(v => v.questions).slice(0, numberOfQuestions).map((q, idx) => (
      <div key={`${q.questionId}-${idx}`} className={styles.questionRow}>
        <div className={styles.questionHeader}>
          <span className={styles.questionTitle}>Câu {idx + 1}</span>
        </div>
        <p className={styles.questionText}>
          {q.questionId ? `Câu hỏi ID: ${q.questionId.substring(0, 8)}...` : 'Đang tải...'}
        </p>
      </div>
    ))}
    {examVersions.flatMap(v => v.questions).length === 0 && (
      <p style={{ padding: '16px', color: '#666' }}>Chưa có câu hỏi nào được gán.</p>
    )}
  </div>
) : (
  <div className={styles.dragPlaceholder}>
    <FilePlus size={32} className={styles.placeholderIcon} />
    <span className={styles.placeholderText}>Chưa tải được danh sách câu hỏi</span>
  </div>
)}
```

Also add `fetchExamVersionsFull` and `examVersions` to the `useExamStore` destructure in the component.

---

## Task 8: Verify Build

**Files:** All modified files

**Steps:**

- [ ] **Step 1: Run TypeScript type check**

In the `client/web` directory, run:
```bash
npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 2: Run ESLint if available**

```bash
npm run lint
```

- [ ] **Step 3: Run the dev server**

```bash
npm run dev
```

Verify all pages load without errors:
- `/exams` - Exam list should load with server-side filtered data
- `/exams/new` - Create exam form should load with OMR templates from API
- `/exams/:id` - Exam detail should show real data (or fallback mock)
- `/exams/:id/edit` - Edit exam form should pre-fill with real data

---

## Spec Coverage Check

| Requirement | Task | Status |
|-------------|------|--------|
| Server-side filtering (status, class, date) | Task 4 (ExamsPage) | |
| Dynamic stat cards from API | Task 4 (ExamsPage) | |
| Remove mock exam data | Task 4 (ExamsPage) | |
| publishExam API | Task 5 (ExamDetailPage) | |
| completeExam API | Task 5 (ExamDetailPage) | |
| generateExamVersions API | Task 5 (ExamDetailPage) | |
| addClassesToExam API | Task 5 (ExamDetailPage) | |
| removeClassesFromExam API | Task 5 (ExamDetailPage) | |
| fetchExamById API | Task 5 (ExamDetailPage) | |
| fetchExamVersions API | Task 5 (ExamDetailPage) | |
| fetchByExam submission API | Task 5 (ExamDetailPage) | |
| fetchStatistics submission API | Task 5 (ExamDetailPage) | |
| examStore extended | Task 1 | |
| submissionStore created | Task 2 | |
| omrTemplateStore created | Task 3 | |
| CreateExamPage error handling | Task 6 | |
| EditExamPage questions from API | Task 7 | |
| EditExamPage PATCH via store | Task 7 | |
