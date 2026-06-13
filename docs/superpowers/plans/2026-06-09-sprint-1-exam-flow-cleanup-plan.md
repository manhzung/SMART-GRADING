# Sprint 1 Exam Flow Cleanup Implementation Plan

**Goal:** Hoàn thiện luồng quản lý bài thi trên web bằng cách loại bỏ các fallback/mock lớn ở `ExamsPage`, `CreateExamPage`, và `ExamDetailPage`, để giáo viên có thể tạo đề, xem đề, và quản lý đề dựa trên dữ liệu thật từ store/API.

**Architecture:** Giữ nguyên kiến trúc React + Zustand hiện tại, ưu tiên sửa ở tầng page-level trước để tận dụng các store/API đã có. Thay vì thêm subsystem mới, Sprint 1 sẽ gom logic chuyển đổi dữ liệu về các helper thuần, bỏ UI giả lập, và chuẩn hóa trạng thái loading/empty/error để ba màn hoạt động nhất quán.

**Tech Stack:** React 19, TypeScript, Zustand, Vite, Vitest, Testing Library, existing `apiService`

---

### Task 1: Add pure helpers for exam UI mapping

**Files:**
- Create: `client/web/src/pages/examPageAdapters.ts`
- Test: `client/web/src/pages/examPageAdapters.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import {
  buildExamFilters,
  mapExamListItem,
  mapExamDetailData,
  resolveAssignedQuestions,
} from './examPageAdapters';

describe('mapExamListItem', () => {
  it('maps backend exam fields to list card data', () => {
    const result = mapExamListItem({
      _id: 'exam-1',
      title: 'Đề giữa kỳ Toán 10',
      classIds: [{ _id: 'c1', name: '10A1' }],
      examDate: '2026-06-09T00:00:00.000Z',
      duration: 45,
      numberOfQuestions: 20,
      status: 'published',
      numberOfVersions: 3,
      totalSubmissions: 10,
      totalStudents: 30,
    });

    expect(result).toMatchObject({
      _id: 'exam-1',
      title: 'Đề giữa kỳ Toán 10',
      classNames: ['10A1'],
      duration: '45 phút',
      questionCount: 20,
      status: 'published',
      variantsCount: 3,
      submissionsCurrent: 10,
      submissionsTotal: 30,
    });
  });
});

describe('buildExamFilters', () => {
  it('filters by class, status, and date range without fake totals', () => {
    const exams = [
      mapExamListItem({ _id: '1', title: 'A', classIds: [{ _id: 'c1', name: '10A1' }], examDate: '2026-06-09T00:00:00.000Z', duration: 45, numberOfQuestions: 10, status: 'published', numberOfVersions: 1, totalSubmissions: 5, totalStudents: 20 }),
      mapExamListItem({ _id: '2', title: 'B', classIds: [{ _id: 'c2', name: '10A2' }], examDate: '2026-05-01T00:00:00.000Z', duration: 45, numberOfQuestions: 10, status: 'draft', numberOfVersions: 1, totalSubmissions: 0, totalStudents: 20 }),
    ];

    const result = buildExamFilters(exams, {
      selectedClass: '10A1',
      selectedStatus: 'published',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    });

    expect(result.map((item) => item._id)).toEqual(['1']);
  });
});

describe('resolveAssignedQuestions', () => {
  it('prefers store questions and removes seed-only placeholders', () => {
    const result = resolveAssignedQuestions([
      { _id: 'q1', id: 'q1', text: 'Câu 1', formula: '', difficulty: 'Easy', isAiGenerated: false, isPremium: false, options: [], usedInExams: 0, successRate: 0, explanation: '', isApproved: true, source: 'manual', tags: [], score: 1, usageCount: 0, createdAt: '' },
    ], ['q1']);

    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('q1');
  });
});

describe('mapExamDetailData', () => {
  it('maps exam detail from real exam payload without mock fallback', () => {
    const result = mapExamDetailData({
      _id: 'exam-1',
      title: 'Đề giữa kỳ Toán 10',
      description: 'Mô tả',
      status: 'published',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-02T00:00:00.000Z',
      createdBy: { _id: 'u1', name: 'Giáo viên A' },
      totalSubmissions: 12,
      totalStudents: 30,
      examDate: '2026-06-09T00:00:00.000Z',
      startTime: '08:00',
      duration: 45,
      totalScore: 10,
      passingScore: 5,
      numberOfQuestions: 2,
      questionIds: [
        {
          _id: 'q1',
          content: 'Câu 1',
          type: 'single_choice',
          options: [{ id: 'A', text: '1', isCorrect: true }],
          difficulty: 'easy',
          score: 1,
        },
      ],
      classIds: [{ _id: 'c1', name: '10A1', code: '10A1' }],
      primaryClassId: 'c1',
      omrTemplateId: { _id: 'omr1', name: 'Mẫu 60 câu' },
    }, []);

    expect(result?.title).toBe('Đề giữa kỳ Toán 10');
    expect(result?.questions).toHaveLength(1);
    expect(result?.classes[0].name).toBe('10A1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/examPageAdapters.test.ts`
Expected: FAIL because `examPageAdapters.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { Exam, ExamVersion } from '../presentation/store/examStore';
import type { Question } from '../presentation/store/questionStore';

export interface ExamListItem {
  _id: string;
  title: string;
  classNames: string[];
  date: string;
  duration: string;
  questionCount: number;
  status: 'draft' | 'in_progress' | 'completed' | 'published' | 'archived';
  variantsCount: number;
  submissionsText: string;
  submissionsCurrent: number;
  submissionsTotal: number;
}

export interface ExamFilterInput {
  selectedClass: string;
  selectedStatus: string;
  startDate: string;
  endDate: string;
}

export interface ExamDetailData {
  _id: string;
  title: string;
  code: string;
  status: 'draft' | 'published' | 'in_progress' | 'completed' | 'archived';
  createdDate: string;
  updatedDate: string;
  creator: string;
  description: string;
  submissionsCount: number;
  totalStudents: number;
  examDate: string;
  startTime: string;
  duration: number;
  totalQuestions: number;
  scoreScale: string;
  passingScore: number;
  monitoring: string;
  omrTemplateName: string;
  classes: Array<{ _id: string; name: string; description: string; studentCount: number; isPrimary: boolean }>;
  questions: Array<{ stt: string; content: string; correctAnswer: string; difficulty: 'easy' | 'medium' | 'hard'; score: number; type: string }>;
  versions: Array<{ code: string; status: string; updatedAt: string }>;
  history: Array<{ action: string; timestamp: string; user: string; type: 'edit' | 'class' | 'create' }>;
}

const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa đặt ngày';

export function mapExamListItem(exam: Partial<Exam>): ExamListItem {
  const classNames = (exam.classIds || []).map((item) => typeof item === 'string' ? item : item.name).filter(Boolean);
  const questionCount = exam.numberOfQuestions || exam.questionIds?.length || 0;
  const submissionsCurrent = exam.totalSubmissions || 0;
  const submissionsTotal = exam.totalStudents || 0;

  return {
    _id: exam._id || '',
    title: exam.title || 'Chưa có tiêu đề',
    classNames: classNames.length ? classNames : ['Chưa gán'],
    date: formatDate(exam.examDate || exam.date),
    duration: `${exam.duration || 0} phút`,
    questionCount,
    status: (exam.status || 'draft') as ExamListItem['status'],
    variantsCount: exam.numberOfVersions || 0,
    submissionsText: `${submissionsCurrent} / ${submissionsTotal}`,
    submissionsCurrent,
    submissionsTotal,
  };
}

export function buildExamFilters(exams: ExamListItem[], filters: ExamFilterInput) {
  return exams.filter((exam) => {
    if (filters.selectedClass !== 'all' && !exam.classNames.some((name) => name.includes(filters.selectedClass))) {
      return false;
    }
    if (filters.selectedStatus !== 'all' && exam.status !== filters.selectedStatus) {
      return false;
    }
    if (filters.startDate || filters.endDate) {
      const parts = exam.date.split('/');
      if (parts.length === 3) {
        const current = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        if (filters.startDate && current < new Date(filters.startDate)) return false;
        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          if (current > end) return false;
        }
      }
    }
    return true;
  });
}

export function resolveAssignedQuestions(storeQuestions: Question[], assignedIds: string[]) {
  return storeQuestions.filter((question) => assignedIds.includes(question._id));
}

export function mapExamDetailData(exam: Exam | null, versions: ExamVersion[]): ExamDetailData | null {
  if (!exam) return null;

  const mappedQuestions = (exam.questionIds || [])
    .filter((question): question is NonNullable<Exam['questionIds']>[number] & Record<string, unknown> => typeof question === 'object' && question !== null)
    .map((question: any, index: number) => ({
      stt: String(index + 1),
      content: question.content || `Câu hỏi ${index + 1}`,
      correctAnswer: question.correctAnswer || question.options?.find((option: any) => option.isCorrect)?.id || 'A',
      difficulty: (question.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
      score: question.score || 1,
      type: question.type === 'multiple_choice' ? 'TRẮC NGHIỆM' : 'TRẮC NGHIỆM',
    }));

  const mappedClasses = (exam.classIds || []).map((item: any) => ({
    _id: item._id || item,
    name: item.name || 'Lớp học',
    description: item.code ? `Mã lớp: ${item.code}` : 'Chưa có mã lớp',
    studentCount: item.studentCount || 0,
    isPrimary: typeof exam.primaryClassId === 'object' ? exam.primaryClassId?._id === item._id : exam.primaryClassId === item._id,
  }));

  return {
    _id: exam._id,
    title: exam.title,
    code: exam._id,
    status: exam.status,
    createdDate: formatDate(exam.createdAt),
    updatedDate: formatDate(exam.updatedAt),
    creator: exam.createdBy?.name || '',
    description: exam.description || '',
    submissionsCount: exam.totalSubmissions || 0,
    totalStudents: exam.totalStudents || 0,
    examDate: formatDate(exam.examDate),
    startTime: exam.startTime || '',
    duration: exam.duration || 0,
    totalQuestions: exam.numberOfQuestions || mappedQuestions.length,
    scoreScale: String(exam.totalScore || 10),
    passingScore: exam.passingScore || 5,
    monitoring: 'Bật AI',
    omrTemplateName: exam.omrTemplateId?.name || '',
    classes: mappedClasses,
    questions: mappedQuestions,
    versions: versions.map((version) => ({
      code: version.versionCode,
      status: 'Sẵn sàng',
      updatedAt: formatDate(version.createdAt),
    })),
    history: [],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/examPageAdapters.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/web/src/pages/examPageAdapters.ts client/web/src/pages/examPageAdapters.test.ts
git commit -m "test: add adapters for exam pages"
```

### Task 2: Remove fake filter totals and hard-coded class options from ExamsPage

**Files:**
- Modify: `client/web/src/pages/ExamsPage.tsx`
- Modify: `client/web/src/pages/examPageAdapters.ts`
- Test: `client/web/src/pages/examPageAdapters.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
it('keeps pagination total equal to filtered result count', () => {
  const exams = [
    mapExamListItem({ _id: '1', title: 'A', classIds: [{ _id: 'c1', name: '10A1' }], examDate: '2026-06-09T00:00:00.000Z', duration: 45, numberOfQuestions: 10, status: 'published', numberOfVersions: 1, totalSubmissions: 5, totalStudents: 20 }),
  ];

  const filtered = buildExamFilters(exams, {
    selectedClass: 'all',
    selectedStatus: 'all',
    startDate: '',
    endDate: '',
  });

  expect(filtered).toHaveLength(1);
  expect(filtered.length).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/examPageAdapters.test.ts`
Expected: FAIL if helper signatures or assumptions do not yet support final `ExamsPage` behavior.

- [ ] **Step 3: Write minimal implementation**

```typescript
// In ExamsPage.tsx
const formattedExams = apiExams.map(mapExamListItem);
const filteredExams = buildExamFilters(formattedExams, {
  selectedClass,
  selectedStatus,
  startDate,
  endDate,
});
const totalItems = filteredExams.length;
const totalPages = Math.ceil(totalItems / pageSize) || 1;
const indexOfLastItem = currentPage * pageSize;
const indexOfFirstItem = indexOfLastItem - pageSize;
const currentItems = filteredExams.slice(indexOfFirstItem, indexOfLastItem);

const classOptions = classes.map((item) => item.name);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/examPageAdapters.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/web/src/pages/ExamsPage.tsx client/web/src/pages/examPageAdapters.ts client/web/src/pages/examPageAdapters.test.ts
git commit -m "fix: align exams page filters with real data"
```

### Task 3: Remove seed-question dependency from CreateExamPage

**Files:**
- Modify: `client/web/src/pages/CreateExamPage.tsx`
- Modify: `client/web/src/pages/examPageAdapters.ts`
- Test: `client/web/src/pages/examPageAdapters.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
it('returns only assigned store questions for create exam page', () => {
  const questions = [
    { _id: 'q1', id: 'q1', text: 'Câu 1', formula: '', difficulty: 'Easy', isAiGenerated: false, isPremium: false, options: [], usedInExams: 0, successRate: 0, explanation: '', isApproved: true, source: 'manual', tags: [], score: 1, usageCount: 0, createdAt: '' },
    { _id: 'q2', id: 'q2', text: 'Câu 2', formula: '', difficulty: 'Medium', isAiGenerated: false, isPremium: false, options: [], usedInExams: 0, successRate: 0, explanation: '', isApproved: true, source: 'manual', tags: [], score: 1, usageCount: 0, createdAt: '' },
  ];

  const result = resolveAssignedQuestions(questions, ['q2']);
  expect(result.map((question) => question._id)).toEqual(['q2']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/examPageAdapters.test.ts`
Expected: FAIL if `resolveAssignedQuestions` still assumes mock seed behavior.

- [ ] **Step 3: Write minimal implementation**

```typescript
// In CreateExamPage.tsx
const [assignedQuestionIds, setAssignedQuestionIds] = useState<string[]>([]);

useEffect(() => {
  fetchQuestions({ limit: 100, page: 1 });
}, [fetchQuestions]);

const allAvailableQuestions = storeQuestions;
const mainCardQuestions = useMemo(() => {
  let list = resolveAssignedQuestions(allAvailableQuestions, assignedQuestionIds);
  if (assignedQuestionsLocalSearch.trim()) {
    const query = assignedQuestionsLocalSearch.toLowerCase();
    list = list.filter((item) => item.text.toLowerCase().includes(query));
  }
  return list;
}, [allAvailableQuestions, assignedQuestionIds, assignedQuestionsLocalSearch]);

const payloadQuestionIds = assignedQuestionIds;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/examPageAdapters.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/web/src/pages/CreateExamPage.tsx client/web/src/pages/examPageAdapters.ts client/web/src/pages/examPageAdapters.test.ts
git commit -m "fix: use real question assignments on create exam"
```

### Task 4: Remove mock detail fallback from ExamDetailPage

**Files:**
- Modify: `client/web/src/pages/ExamDetailPage.tsx`
- Modify: `client/web/src/pages/examPageAdapters.ts`
- Test: `client/web/src/pages/examPageAdapters.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
it('returns null when no real exam detail is available', () => {
  const result = mapExamDetailData(null, []);
  expect(result).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/examPageAdapters.test.ts`
Expected: FAIL if `ExamDetailPage` still depends on inline mock fallback behavior.

- [ ] **Step 3: Write minimal implementation**

```typescript
// In ExamDetailPage.tsx
const examData = useMemo(
  () => mapExamDetailData(currentExam, examVersions),
  [currentExam, examVersions]
);

if (isExamLoading || isSubLoading) {
  return <LoadingState />;
}

if (!examData) {
  return <EmptyState />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/examPageAdapters.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/web/src/pages/ExamDetailPage.tsx client/web/src/pages/examPageAdapters.ts client/web/src/pages/examPageAdapters.test.ts
git commit -m "fix: remove exam detail mock fallback"
```

### Task 5: Align EditExamPage fallback behavior with real exam data

**Files:**
- Modify: `client/web/src/pages/EditExamPage.tsx`
- Test: `client/web/src/pages/examPageAdapters.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
it('maps real exam fields for downstream edit flow', () => {
  const result = mapExamListItem({
    _id: 'exam-2',
    title: 'Đề cuối kỳ',
    classIds: [{ _id: 'c1', name: '12A1' }],
    examDate: '2026-06-09T00:00:00.000Z',
    duration: 90,
    numberOfQuestions: 50,
    status: 'draft',
    numberOfVersions: 4,
    totalSubmissions: 0,
    totalStudents: 40,
  });

  expect(result.title).toBe('Đề cuối kỳ');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/examPageAdapters.test.ts`
Expected: FAIL if upstream mapping remains inconsistent.

- [ ] **Step 3: Write minimal implementation**

```typescript
// In EditExamPage.tsx
if (!exam && !id) {
  navigate('/exams');
  return;
}

// Remove synthetic `q-mock-*` payload generation and preserve existing questionIds when editing.
const payloadQuestionIds = existingExam?.questionIds
  ?.map((question) => typeof question === 'string' ? question : question._id)
  .filter(Boolean) || [];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/examPageAdapters.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/web/src/pages/EditExamPage.tsx client/web/src/pages/examPageAdapters.test.ts
git commit -m "refactor: reduce edit exam mock dependencies"
```

### Task 6: Verify Sprint 1 pages with focused tests and lint

**Files:**
- Modify: `client/web/src/pages/ExamsPage.tsx`
- Modify: `client/web/src/pages/CreateExamPage.tsx`
- Modify: `client/web/src/pages/ExamDetailPage.tsx`
- Modify: `client/web/src/pages/EditExamPage.tsx`
- Modify: `client/web/src/pages/examPageAdapters.ts`
- Modify: `client/web/src/pages/examPageAdapters.test.ts`

- [ ] **Step 1: Run focused test suite**

Run: `npm test -- src/pages/examPageAdapters.test.ts`
Expected: PASS with all adapter tests green.

- [ ] **Step 2: Run lint on touched pages**

Run: `npm run lint -- src/pages/ExamsPage.tsx src/pages/CreateExamPage.tsx src/pages/ExamDetailPage.tsx src/pages/EditExamPage.tsx src/pages/examPageAdapters.ts src/pages/examPageAdapters.test.ts`
Expected: 0 errors on touched files.

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 4: Review empty/loading/error states manually in code**

Check that each page has:
- a loading state tied to store fetches,
- an empty state when no real data exists,
- no visual dependency on mock-only arrays for primary content.

- [ ] **Step 5: Commit**

```bash
git add client/web/src/pages/ExamsPage.tsx client/web/src/pages/CreateExamPage.tsx client/web/src/pages/ExamDetailPage.tsx client/web/src/pages/EditExamPage.tsx client/web/src/pages/examPageAdapters.ts client/web/src/pages/examPageAdapters.test.ts
git commit -m "react: clean up sprint 1 exam flow pages"
```
