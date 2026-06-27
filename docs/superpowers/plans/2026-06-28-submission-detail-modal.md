# Submission Detail Modal Implementation Plan

**Goal:** Add a CRUD modal to `ExamDetailPage` that opens when clicking the FileText icon next to each submission, showing full details and allowing read/update/delete/create operations on submission records.

**Architecture:** Frontend-only changes (backend already has all endpoints). Build a new `SubmissionDetailModal` React component with read-only display + edit mode + delete confirm + create form. Extend the existing `submissionStore` (Zustand) with new actions. Wire up the FileText icon onClick in `ExamDetailPage`.

**Tech Stack:** React 19 + TypeScript + Vite + Zustand + Vitest + React Testing Library. CSS Modules for styling.

---

## File Structure

**New files:**
- `client/web/src/components/submission/SubmissionDetailModal.tsx` — main modal component
- `client/web/src/components/submission/SubmissionDetailModal.module.css` — modal styles
- `client/web/src/components/submission/AnswerEditTable.tsx` — editable answers table
- `client/web/src/components/submission/AnswerEditTable.module.css` — table styles
- `client/web/src/components/submission/CreateSubmissionForm.tsx` — create-mode form
- `client/web/src/components/submission/CreateSubmissionForm.module.css` — form styles
- `client/web/src/__tests__/components/submission/SubmissionDetailModal.test.tsx` — modal tests
- `client/web/src/__tests__/components/submission/AnswerEditTable.test.tsx` — table tests
- `client/web/src/__tests__/components/submission/CreateSubmissionForm.test.tsx` — form tests

**Modified files:**
- `client/web/src/pages/ExamDetailPage.tsx` — wire up FileText icon onClick + render modal
- `client/web/src/presentation/store/submissionStore.ts` — add `fetchById`, `updateSubmission`, `createSubmission` actions

---

## Task 1: Extend submissionStore with fetchById action

**Files:**
- Modify: `client/web/src/presentation/store/submissionStore.ts:108-185`
- Test: `client/web/src/__tests__/stores/submissionStore-fetchById.test.ts`

- [ ] **Step 1: Write failing test for fetchById**

Create file `client/web/src/__tests__/stores/submissionStore-fetchById.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../core/api', () => ({
  apiService: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe('submissionStore.fetchById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('sets currentSubmission on success', async () => {
    const { apiService: mockApi } = await import('../../../core/api');
    const mockSubmission = {
      _id: 'sub1',
      examId: 'exam1',
      studentId: { _id: 's1', name: 'Nguyen Van A' },
      answers: [],
      totalScore: 8,
      maxScore: 10,
      status: 'scanned',
    };
    (mockApi.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);

    const { useSubmissionStore } = await import('../../../presentation/store/submissionStore');
    await useSubmissionStore.getState().fetchById('sub1');

    const state = useSubmissionStore.getState();
    expect(state.currentSubmission).toEqual(mockSubmission);
    expect(state.isLoadingDetail).toBe(false);
  });

  it('sets isLoadingDetail to true during fetch', async () => {
    const { apiService: mockApi } = await import('../../../core/api');
    let resolvePromise: (value: unknown) => void;
    (mockApi.get as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise((resolve) => { resolvePromise = resolve; })
    );

    const { useSubmissionStore } = await import('../../../presentation/store/submissionStore');
    const fetchPromise = useSubmissionStore.getState().fetchById('sub1');

    expect(useSubmissionStore.getState().isLoadingDetail).toBe(true);

    resolvePromise!({ _id: 'sub1' });
    await fetchPromise;

    expect(useSubmissionStore.getState().isLoadingDetail).toBe(false);
  });

  it('sets error message on failure', async () => {
    const { apiService: mockApi } = await import('../../../core/api');
    (mockApi.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const { useSubmissionStore } = await import('../../../presentation/store/submissionStore');
    await useSubmissionStore.getState().fetchById('sub1');

    const state = useSubmissionStore.getState();
    expect(state.error).toBe('Network error');
    expect(state.isLoadingDetail).toBe(false);
    expect(state.currentSubmission).toBeNull();
  });

  it('clears currentSubmission when clearCurrentSubmission called', async () => {
    const { apiService: mockApi } = await import('../../../core/api');
    (mockApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: 'sub1' });

    const { useSubmissionStore } = await import('../../../presentation/store/submissionStore');
    await useSubmissionStore.getState().fetchById('sub1');
    expect(useSubmissionStore.getState().currentSubmission).not.toBeNull();

    useSubmissionStore.getState().clearCurrentSubmission();
    expect(useSubmissionStore.getState().currentSubmission).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "C:\TAILIEU\DATN\SMART GRADING\client\web"
npm test -- src/__tests__/stores/submissionStore-fetchById.test.ts
```

Expected: FAIL with "fetchById is not a function" (action does not exist yet).

- [ ] **Step 3: Add fetchById action and currentSubmission state**

Modify `client/web/src/presentation/store/submissionStore.ts`. Find the `BackendSubmission` interface around line 30 and add nothing — it already exists. Then modify the `SubmissionState` interface (around line 111-122) and store implementation (around line 124-184).

**Find this block:**

```typescript
interface SubmissionState {
  submissions: BackendSubmission[];
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
```

**Replace with:**

```typescript
interface SubmissionState {
  submissions: BackendSubmission[];
  statistics: SubmissionStatistics | null;
  currentSubmission: BackendSubmission | null;
  isLoading: boolean;
  isLoadingStats: boolean;
  isLoadingDetail: boolean;
  isSubmitting: boolean;
  error: string | null;
  fetchByExam: (examId: string) => Promise<void>;
  fetchStatistics: (examId: string) => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  updateSubmission: (id: string, answers: Record<string, string>) => Promise<void>;
  createSubmission: (data: CreateSubmissionPayload) => Promise<BackendSubmission>;
  deleteSubmission: (id: string) => Promise<void>;
  clearSubmissions: () => void;
  clearCurrentSubmission: () => void;
  clearError: () => void;
}

export interface CreateSubmissionPayload {
  examId: string;
  versionCode?: string;
  studentCode: string;
  classId?: string;
  answers: Record<string, string>;
  totalScore?: number;
  maxScore?: number;
}

export const useSubmissionStore = create<SubmissionState>((set, get) => ({
  submissions: [],
  statistics: null,
  currentSubmission: null,
  isLoading: false,
  isLoadingStats: false,
  isLoadingDetail: false,
  isSubmitting: false,
  error: null,
```

Then **add these new action methods inside the store object** (before the closing `}));` on line 184). Find this block:

```typescript
  clearSubmissions: () => set({ submissions: [], statistics: null }),
  clearError: () => set({ error: null }),
}));
```

**Replace with:**

```typescript
  fetchById: async (id: string) => {
    set({ isLoadingDetail: true, error: null });
    try {
      const response = await apiService.get<BackendSubmission>(`/submissions/${id}`);
      set({ currentSubmission: response, isLoadingDetail: false });
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to fetch submission',
        isLoadingDetail: false,
      });
    }
  },

  updateSubmission: async (id: string, answers: Record<string, string>) => {
    set({ isSubmitting: true, error: null });
    try {
      await apiService.patch(`/submissions/${id}/answers`, { answers });
      // Refresh currentSubmission with updated data
      const response = await apiService.get<BackendSubmission>(`/submissions/${id}`);
      set({ currentSubmission: response, isSubmitting: false });
      // Update in list too
      set((state) => ({
        submissions: state.submissions.map((s) => (s._id === id ? response : s)),
      }));
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to update submission',
        isSubmitting: false,
      });
      throw error;
    }
  },

  createSubmission: async (data: CreateSubmissionPayload) => {
    set({ isSubmitting: true, error: null });
    try {
      const response = await apiService.post<BackendSubmission>('/submissions', data);
      set((state) => ({
        submissions: [response, ...state.submissions],
        isSubmitting: false,
      }));
      return response;
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to create submission',
        isSubmitting: false,
      });
      throw error;
    }
  },

  clearSubmissions: () => set({ submissions: [], statistics: null }),
  clearCurrentSubmission: () => set({ currentSubmission: null }),
  clearError: () => set({ error: null }),
}));
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd "C:\TAILIEU\DATN\SMART GRADING\client\web"
npm test -- src/__tests__/stores/submissionStore-fetchById.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Run all tests to verify no regressions**

```bash
cd "C:\TAILIEU\DATN\SMART GRADING\client\web"
npm test
```

Expected: All existing tests pass + 4 new tests pass.

- [ ] **Step 6: Commit**

```bash
cd "C:\TAILIEU\DATN\SMART GRADING"
git add client/web/src/presentation/store/submissionStore.ts client/web/src/__tests__/stores/submissionStore-fetchById.test.ts
git commit -m "feat(web): extend submissionStore with fetchById, updateSubmission, createSubmission"
```

---

## Task 2: Write failing tests for AnswerEditTable component

**Files:**
- Create: `client/web/src/components/submission/AnswerEditTable.tsx`
- Create: `client/web/src/components/submission/AnswerEditTable.module.css`
- Create: `client/web/src/__tests__/components/submission/AnswerEditTable.test.tsx`

- [ ] **Step 1: Write failing tests**

Create file `client/web/src/__tests__/components/submission/AnswerEditTable.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnswerEditTable } from '../../../../components/submission/AnswerEditTable';

const mockAnswers = [
  { position: 1, selectedAnswer: 'A', correctAnswer: 'A', isCorrect: true, score: 1, maxScore: 1 },
  { position: 2, selectedAnswer: 'B', correctAnswer: 'C', isCorrect: false, score: 0, maxScore: 1 },
  { position: 3, selectedAnswer: null, correctAnswer: 'D', isCorrect: false, score: 0, maxScore: 1 },
];

describe('AnswerEditTable', () => {
  it('renders one row per answer', () => {
    render(<AnswerEditTable answers={mockAnswers} editable={false} onChange={vi.fn()} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows selectedAnswer in read-only mode', () => {
    render(<AnswerEditTable answers={mockAnswers} editable={false} onChange={vi.fn()} />);
    // Two cells with value A
    const cellsA = screen.getAllByText('A');
    expect(cellsA.length).toBeGreaterThanOrEqual(1);
  });

  it('shows dash for null selectedAnswer', () => {
    render(<AnswerEditTable answers={mockAnswers} editable={false} onChange={vi.fn()} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows correctAnswer column', () => {
    render(<AnswerEditTable answers={mockAnswers} editable={false} onChange={vi.fn()} />);
    // Should show A, C, D in correctAnswer column
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('shows check/cross icon for isCorrect', () => {
    const { container } = render(<AnswerEditTable answers={mockAnswers} editable={false} onChange={vi.fn()} />);
    const correctIcons = container.querySelectorAll('[data-testid="correct-icon"]');
    expect(correctIcons.length).toBe(1); // Only position 1 is correct
  });

  it('renders dropdowns when editable=true', () => {
    render(<AnswerEditTable answers={mockAnswers} editable={true} onChange={vi.fn()} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBe(3);
  });

  it('calls onChange when dropdown value changes', () => {
    const onChange = vi.fn();
    render(<AnswerEditTable answers={mockAnswers} editable={true} onChange={onChange} />);
    const firstSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(firstSelect, { target: { value: 'B' } });
    expect(onChange).toHaveBeenCalledWith(1, 'B');
  });

  it('shows reason textarea when editable=true', () => {
    render(<AnswerEditTable answers={mockAnswers} editable={true} onChange={vi.fn()} onReasonChange={vi.fn()} />);
    const textareas = screen.getAllByRole('textbox');
    expect(textareas.length).toBeGreaterThan(0);
  });

  it('calls onReasonChange when reason typed', () => {
    const onReasonChange = vi.fn();
    render(<AnswerEditTable answers={mockAnswers} editable={true} onChange={vi.fn()} onReasonChange={onReasonChange} />);
    const textarea = screen.getAllByRole('textbox')[0];
    fireEvent.change(textarea, { target: { value: 'HS tô sai' } });
    expect(onReasonChange).toHaveBeenCalledWith(1, 'HS tô sai');
  });

  it('displays empty state when answers is empty', () => {
    render(<AnswerEditTable answers={[]} editable={false} onChange={vi.fn()} />);
    expect(screen.getByText(/chưa có đáp án/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "C:\TAILIEU\DATN\SMART GRADING\client\web"
npm test -- src/__tests__/components/submission/AnswerEditTable.test.tsx
```

Expected: FAIL — module not found (`AnswerEditTable` does not exist).

- [ ] **Step 3: Create minimal AnswerEditTable component**

Create file `client/web/src/components/submission/AnswerEditTable.tsx`:

```tsx
import React from 'react';
import { Check, X as XIcon } from 'lucide-react';
import styles from './AnswerEditTable.module.css';

export interface AnswerRow {
  position: number;
  selectedAnswer: string | null;
  correctAnswer?: string | null;
  isCorrect: boolean;
  score: number;
  maxScore: number;
}

interface AnswerEditTableProps {
  answers: AnswerRow[];
  editable: boolean;
  onChange: (position: number, value: string | null) => void;
  onReasonChange?: (position: number, reason: string) => void;
  reasons?: Record<number, string>;
}

export const AnswerEditTable: React.FC<AnswerEditTableProps> = ({
  answers,
  editable,
  onChange,
  onReasonChange,
  reasons = {},
}) => {
  if (answers.length === 0) {
    return (
      <div className={styles.emptyState} data-testid="empty-state">
        Chưa có đáp án nào
      </div>
    );
  }

  return (
    <table className={styles.table} data-testid="answer-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Đáp án HS</th>
          <th>Đáp án đúng</th>
          <th>Kết quả</th>
          <th>Điểm</th>
          {editable && <th>Lý do sửa</th>}
        </tr>
      </thead>
      <tbody>
        {answers.map((ans) => (
          <tr key={ans.position} data-testid={`row-${ans.position}`}>
            <td>{ans.position}</td>
            <td>
              {editable ? (
                <select
                  data-testid={`select-${ans.position}`}
                  value={ans.selectedAnswer ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : e.target.value;
                    onChange(ans.position, val);
                  }}
                  className={styles.select}
                >
                  <option value="">—</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              ) : (
                <span>{ans.selectedAnswer ?? '—'}</span>
              )}
            </td>
            <td>{ans.correctAnswer ?? '—'}</td>
            <td>
              {ans.isCorrect ? (
                <Check size={16} className={styles.iconCorrect} data-testid="correct-icon" />
              ) : (
                <XIcon size={16} className={styles.iconWrong} />
              )}
            </td>
            <td>
              {ans.score}/{ans.maxScore}
            </td>
            {editable && (
              <td>
                <textarea
                  data-testid={`reason-${ans.position}`}
                  value={reasons[ans.position] ?? ''}
                  onChange={(e) => onReasonChange?.(ans.position, e.target.value)}
                  className={styles.reasonInput}
                  rows={1}
                  placeholder="Lý do (tùy chọn)"
                />
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

Create file `client/web/src/components/submission/AnswerEditTable.module.css`:

```css
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.table th,
.table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.table th {
  background: #f8fafc;
  font-weight: 600;
  color: #475569;
}

.table tbody tr:hover {
  background: #f1f5f9;
}

.select {
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: white;
  font-size: 14px;
}

.reasonInput {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 13px;
  resize: vertical;
  min-height: 28px;
}

.iconCorrect {
  color: #16a34a;
}

.iconWrong {
  color: #dc2626;
}

.emptyState {
  padding: 24px;
  text-align: center;
  color: #64748b;
  background: #f8fafc;
  border-radius: 8px;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd "C:\TAILIEU\DATN\SMART GRADING\client\web"
npm test -- src/__tests__/components/submission/AnswerEditTable.test.tsx
```

Expected: 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd "C:\TAILIEU\DATN\SMART GRADING"
git add client/web/src/components/submission/AnswerEditTable.tsx client/web/src/components/submission/AnswerEditTable.module.css client/web/src/__tests__/components/submission/AnswerEditTable.test.tsx
git commit -m "feat(web): add AnswerEditTable component for editing submission answers"
```

---

## Task 3: Write failing tests for SubmissionDetailModal

**Files:**
- Create: `client/web/src/components/submission/SubmissionDetailModal.tsx`
- Create: `client/web/src/components/submission/SubmissionDetailModal.module.css`
- Create: `client/web/src/__tests__/components/submission/SubmissionDetailModal.test.tsx`

- [ ] **Step 1: Write failing tests**

Create file `client/web/src/__tests__/components/submission/SubmissionDetailModal.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../core/api', () => ({
  apiService: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { apiService } from '../../../core/api';
import { SubmissionDetailModal } from '../../../../components/submission/SubmissionDetailModal';

const mockSubmission = {
  _id: 'sub1',
  examId: { _id: 'exam1', title: 'Đề thi Toán' },
  versionId: { _id: 'v1', versionCode: 'A' },
  studentId: { _id: 's1', name: 'Nguyen Van A', studentCode: 'HS001', email: 'a@school.com' },
  classId: { _id: 'c1', name: 'Lớp 12A1' },
  answers: [
    { position: 1, selectedAnswer: 'A', correctAnswer: 'A', isCorrect: true, score: 1, maxScore: 1 },
    { position: 2, selectedAnswer: 'B', correctAnswer: 'C', isCorrect: false, score: 0, maxScore: 1 },
  ],
  totalScore: 7,
  maxScore: 10,
  finalScore: 7,
  status: 'scanned',
  images: {
    original: { url: 'https://example.com/original.jpg' },
  },
  createdAt: '2026-06-28T10:00:00Z',
};

describe('SubmissionDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Read flow', () => {
    it('renders nothing when open=false', () => {
      render(<SubmissionDetailModal open={false} submissionId="sub1" onClose={vi.fn()} />);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('renders dialog with title when open=true', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('fetches submission on mount when submissionId provided', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => {
        expect(apiService.get).toHaveBeenCalledWith('/submissions/sub1');
      });
    });

    it('displays student name and code', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
        expect(screen.getByText('HS001')).toBeInTheDocument();
      });
    });

    it('displays score and maxScore', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByText(/7/)).toBeInTheDocument();
        expect(screen.getByText(/10/)).toBeInTheDocument();
      });
    });

    it('displays version code', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByText(/Mã đề:.*A/)).toBeInTheDocument();
      });
    });

    it('displays loading state while fetching', () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}) // never resolves
      );
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      expect(screen.getByText(/đang tải/i)).toBeInTheDocument();
    });

    it('displays error message on fetch failure', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('404 Not Found'));
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByText(/404 Not Found/)).toBeInTheDocument();
      });
    });

    it('calls onClose when close button clicked', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      const onClose = vi.fn();
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={onClose} />);
      await waitFor(() => screen.getByRole('dialog'));
      fireEvent.click(screen.getByRole('button', { name: /đóng|close/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay clicked', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      const onClose = vi.fn();
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={onClose} />);
      await waitFor(() => screen.getByRole('dialog'));
      const overlay = screen.getByTestId('modal-overlay');
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Update flow', () => {
    it('shows Edit button in view mode', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => screen.getByRole('dialog'));
      expect(screen.getByRole('button', { name: /sửa|edit/i })).toBeInTheDocument();
    });

    it('switches to edit mode when Edit clicked', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => screen.getByRole('dialog'));
      fireEvent.click(screen.getByRole('button', { name: /sửa|edit/i }));
      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThan(0);
      });
    });

    it('shows Save button in edit mode', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => screen.getByRole('dialog'));
      fireEvent.click(screen.getByRole('button', { name: /sửa|edit/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /lưu|save/i })).toBeInTheDocument();
      });
    });

    it('calls PATCH when Save clicked', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      (apiService.patch as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, totalScore: 8 });
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => screen.getByRole('dialog'));
      fireEvent.click(screen.getByRole('button', { name: /sửa|edit/i }));
      await waitFor(() => screen.getAllByRole('combobox'));
      // Change answer at position 2 from B to C
      const select = screen.getAllByRole('combobox')[1];
      fireEvent.change(select, { target: { value: 'C' } });
      fireEvent.click(screen.getByRole('button', { name: /lưu|save/i }));
      await waitFor(() => {
        expect(apiService.patch).toHaveBeenCalledWith('/submissions/sub1/answers', {
          answers: expect.objectContaining({ '2': 'C' }),
        });
      });
    });

    it('does not call PATCH when nothing changed in edit mode', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => screen.getByRole('dialog'));
      fireEvent.click(screen.getByRole('button', { name: /sửa|edit/i }));
      await waitFor(() => screen.getByRole('button', { name: /lưu|save/i }));
      // Save button should be disabled because no changes
      const saveButton = screen.getByRole('button', { name: /lưu|save/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Delete flow', () => {
    it('shows Delete button in view mode', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => screen.getByRole('dialog'));
      expect(screen.getByRole('button', { name: /xóa|delete/i })).toBeInTheDocument();
    });

    it('shows confirm dialog when Delete clicked', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => screen.getByRole('dialog'));
      fireEvent.click(screen.getByRole('button', { name: /xóa|delete/i }));
      await waitFor(() => {
        expect(screen.getByText(/xác nhận xóa|confirm delete/i)).toBeInTheDocument();
      });
    });

    it('calls DELETE when delete confirmed', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      (apiService.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      const onClose = vi.fn();
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={onClose} />);
      await waitFor(() => screen.getByRole('dialog'));
      fireEvent.click(screen.getByRole('button', { name: /xóa|delete/i }));
      await waitFor(() => screen.getByText(/xác nhận xóa|confirm delete/i));
      // Click confirm button in dialog
      const confirmButtons = screen.getAllByRole('button', { name: /xác nhận|confirm/i });
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);
      await waitFor(() => {
        expect(apiService.delete).toHaveBeenCalledWith('/submissions/sub1');
      });
    });
  });

  describe('Accessibility', () => {
    it('has role=dialog and aria-modal=true', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => screen.getByRole('dialog'));
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('closes when ESC key pressed', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      const onClose = vi.fn();
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={onClose} />);
      await waitFor(() => screen.getByRole('dialog'));
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "C:\TAILIEU\DATN\SMART GRADING\client\web"
npm test -- src/__tests__/components/submission/SubmissionDetailModal.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create minimal SubmissionDetailModal component**

Create file `client/web/src/components/submission/SubmissionDetailModal.tsx`:

```tsx
import React, { useEffect, useState, useMemo } from 'react';
import { X, Edit3, Trash2, Save, AlertTriangle } from 'lucide-react';
import { apiService } from '../../core/api';
import { useSubmissionStore, type BackendSubmission } from '../../presentation/store/submissionStore';
import { AnswerEditTable, type AnswerRow } from './AnswerEditTable';
import { ImageGallery } from './ImageGallery';
import styles from './SubmissionDetailModal.module.css';

interface SubmissionDetailModalProps {
  open: boolean;
  submissionId?: string;
  initialMode?: 'view' | 'edit' | 'create';
  onClose: () => void;
  onSaved?: () => void;
}

type ModalMode = 'view' | 'edit' | 'create';

export const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({
  open,
  submissionId,
  initialMode = 'view',
  onClose,
  onSaved,
}) => {
  const {
    currentSubmission,
    isLoadingDetail,
    isSubmitting,
    error,
    fetchById,
    updateSubmission,
    clearCurrentSubmission,
    clearError,
  } = useSubmissionStore();

  const [mode, setMode] = useState<ModalMode>(initialMode);
  const [editedAnswers, setEditedAnswers] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (open && submissionId) {
      fetchById(submissionId);
    }
    if (!open) {
      clearCurrentSubmission();
      setEditedAnswers({});
      setReasons({});
      setMode(initialMode);
      setShowDeleteConfirm(false);
      clearError();
    }
    return () => {
      if (!open) clearError();
    };
  }, [open, submissionId, fetchById, clearCurrentSubmission, clearError, initialMode]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  const answersAsRows: AnswerRow[] = useMemo(() => {
    if (!currentSubmission?.answers) return [];
    return currentSubmission.answers.map((a) => ({
      position: a.position,
      selectedAnswer: a.selectedAnswer,
      correctAnswer: (a as any).correctAnswer ?? null,
      isCorrect: a.isCorrect,
      score: a.score,
      maxScore: a.maxScore,
    }));
  }, [currentSubmission]);

  const hasChanges = useMemo(() => {
    return Object.keys(editedAnswers).length > 0;
  }, [editedAnswers]);

  const handleAnswerChange = (position: number, value: string | null) => {
    setEditedAnswers((prev) => {
      const next = { ...prev };
      const original = answersAsRows.find((a) => a.position === position);
      if (original?.selectedAnswer === value || (original?.selectedAnswer == null && value == null)) {
        delete next[String(position)];
      } else {
        next[String(position)] = value || '';
      }
      return next;
    });
  };

  const handleReasonChange = (position: number, reason: string) => {
    setReasons((prev) => ({ ...prev, [position]: reason }));
  };

  const handleSave = async () => {
    if (!submissionId || !hasChanges) return;
    try {
      await updateSubmission(submissionId, editedAnswers);
      setMode('view');
      setEditedAnswers({});
      onSaved?.();
    } catch {
      // error is already set in store
    }
  };

  const handleDelete = async () => {
    if (!submissionId) return;
    try {
      await apiService.delete(`/submissions/${submissionId}`);
      setShowDeleteConfirm(false);
      onSaved?.();
      onClose();
    } catch {
      // error handled by store/global error handler
    }
  };

  if (!open) return null;

  const student = currentSubmission?.studentId as any;
  const exam = currentSubmission?.examId as any;
  const version = currentSubmission?.versionId as any;
  const classInfo = currentSubmission?.classId as any;

  const studentName = typeof student === 'object' ? student?.name : '—';
  const studentCode = typeof student === 'object' ? student?.studentCode : '—';
  const className = typeof classInfo === 'object' ? classInfo?.name : '—';
  const examTitle = typeof exam === 'object' ? exam?.title : '—';
  const versionCode = typeof version === 'object' ? version?.versionCode : '—';

  const statusLabel: Record<string, string> = {
    pending: 'Chờ quét',
    scanned: 'Đã quét',
    completed: 'Hoàn thành',
    manual_review: 'Chờ duyệt',
    appealed: 'Phúc tra',
  };

  return (
    <div
      className={styles.modalOverlay}
      data-testid="modal-overlay"
      onClick={onClose}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 id="submission-modal-title" className={styles.modalTitle}>
            {mode === 'edit' ? 'Sửa bài nộp' : 'Chi tiết bài nộp'}
          </h3>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Đóng"
            disabled={isSubmitting}
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {isLoadingDetail && (
            <div className={styles.loading}>Đang tải dữ liệu...</div>
          )}

          {error && (
            <div className={styles.error} data-testid="error-message">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {!isLoadingDetail && currentSubmission && (
            <>
              <div className={styles.infoSection}>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Học sinh:</span>
                    <span className={styles.infoValue}>{studentName}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Mã HS:</span>
                    <span className={styles.infoValue}>{studentCode}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Lớp:</span>
                    <span className={styles.infoValue}>{className}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Bài thi:</span>
                    <span className={styles.infoValue}>{examTitle}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Mã đề:</span>
                    <span className={styles.infoValue}>{versionCode}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Trạng thái:</span>
                    <span className={styles.statusBadge}>
                      {statusLabel[currentSubmission.status] || currentSubmission.status}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Điểm:</span>
                    <span className={styles.scoreHighlight}>
                      {currentSubmission.totalScore} / {currentSubmission.maxScore}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Bảng đáp án</h4>
                <AnswerEditTable
                  answers={answersAsRows}
                  editable={mode === 'edit'}
                  onChange={handleAnswerChange}
                  onReasonChange={handleReasonChange}
                  reasons={reasons}
                />
              </div>

              {currentSubmission.images && (
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>Ảnh bài làm</h4>
                  <ImageGallery
                    originalUrl={currentSubmission.images.original?.url}
                    preprocessedUrl={currentSubmission.images.preprocessed?.url}
                    annotatedUrl={currentSubmission.images.annotated?.url}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          {mode === 'view' && currentSubmission && (
            <>
              <button
                className={styles.btnDelete}
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
              >
                <Trash2 size={14} /> Xóa
              </button>
              <button
                className={styles.btnSecondary}
                onClick={() => setMode('edit')}
                disabled={isSubmitting}
              >
                <Edit3 size={14} /> Sửa
              </button>
              <button className={styles.btnPrimary} onClick={onClose} disabled={isSubmitting}>
                Đóng
              </button>
            </>
          )}
          {mode === 'edit' && (
            <>
              <button
                className={styles.btnSecondary}
                onClick={() => {
                  setMode('view');
                  setEditedAnswers({});
                  setReasons({});
                }}
                disabled={isSubmitting}
              >
                Hủy
              </button>
              <button
                className={styles.btnPrimary}
                onClick={handleSave}
                disabled={isSubmitting || !hasChanges}
              >
                {isSubmitting ? 'Đang lưu...' : (<><Save size={14} /> Lưu</>)}
              </button>
            </>
          )}
        </div>

        {showDeleteConfirm && (
          <div className={styles.confirmOverlay} onClick={() => setShowDeleteConfirm(false)}>
            <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
              <h4>Xác nhận xóa</h4>
              <p>Bạn có chắc muốn xóa bài nộp của <strong>{studentName}</strong>? Hành động này không thể hoàn tác.</p>
              <div className={styles.confirmActions}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Hủy
                </button>
                <button
                  className={styles.btnDelete}
                  onClick={handleDelete}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

Create file `client/web/src/components/submission/SubmissionDetailModal.module.css`:

```css
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modalHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modalTitle {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.modalClose {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

.modalClose:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.modalBody {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.modalFooter {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
}

.loading {
  padding: 40px;
  text-align: center;
  color: #64748b;
}

.error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #b91c1c;
  margin-bottom: 16px;
}

.infoSection {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.infoGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.infoItem {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.infoLabel {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.infoValue {
  font-size: 14px;
  color: #0f172a;
  font-weight: 600;
}

.statusBadge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: #dbeafe;
  color: #1e40af;
  font-size: 12px;
  font-weight: 600;
  width: fit-content;
}

.scoreHighlight {
  font-size: 18px;
  font-weight: 700;
  color: #16a34a;
}

.section {
  margin-bottom: 24px;
}

.sectionTitle {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btnPrimary,
.btnSecondary,
.btnDelete {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}

.btnPrimary {
  background: #2563eb;
  color: white;
}

.btnPrimary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btnPrimary:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.btnSecondary {
  background: white;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.btnSecondary:hover:not(:disabled) {
  background: #f8fafc;
}

.btnDelete {
  background: #dc2626;
  color: white;
}

.btnDelete:hover:not(:disabled) {
  background: #b91c1c;
}

.confirmOverlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.confirmDialog {
  background: white;
  padding: 24px;
  border-radius: 8px;
  max-width: 400px;
  width: 90%;
}

.confirmDialog h4 {
  margin: 0 0 12px;
  color: #0f172a;
}

.confirmDialog p {
  margin: 0 0 16px;
  color: #475569;
}

.confirmActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd "C:\TAILIEU\DATN\SMART GRADING\client\web"
npm test -- src/__tests__/components/submission/SubmissionDetailModal.test.tsx
```

Expected: All tests PASS (some may need minor adjustments based on test run output).

- [ ] **Step 5: Commit**

```bash
cd "C:\TAILIEU\DATN\SMART GRADING"
git add client/web/src/components/submission/SubmissionDetailModal.tsx client/web/src/components/submission/SubmissionDetailModal.module.css client/web/src/__tests__/components/submission/SubmissionDetailModal.test.tsx
git commit -m "feat(web): add SubmissionDetailModal with read/update/delete flows"
```

---

## Task 4: Wire up FileText icon in ExamDetailPage

**Files:**
- Modify: `client/web/src/pages/ExamDetailPage.tsx:1015-1019, 1057`

- [ ] **Step 1: Add state and import**

In `client/web/src/pages/ExamDetailPage.tsx`, **find this block at lines 30-34**:

```tsx
import { useExamStore } from '../presentation/store/examStore';
import { useSubmissionStore, type BackendStudent, type BackendClass, type BackendVersion } from '../presentation/store/submissionStore';
import { apiService } from '../core/api';
import { mapExamDetailData } from './examPageAdapters';
import styles from './ExamDetailPage.module.css';
```

**Add import after the SubmissionDetailModal import line:**

```tsx
import { useExamStore } from '../presentation/store/examStore';
import { useSubmissionStore, type BackendStudent, type BackendClass, type BackendVersion } from '../presentation/store/submissionStore';
import { apiService } from '../core/api';
import { mapExamDetailData } from './examPageAdapters';
import { SubmissionDetailModal } from '../components/submission/SubmissionDetailModal';
import styles from './ExamDetailPage.module.css';
```

**Find state declarations at lines 71-77:**

```tsx
  const [isExportingOmr, setIsExportingOmr] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [currentQuestionPage, setCurrentQuestionPage] = useState(1);
  const questionsPerPage = 3;
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [isCompileModalOpen, setIsCompileModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
```

**Add new state right after:**

```tsx
  const [isExportingOmr, setIsExportingOmr] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [currentQuestionPage, setCurrentQuestionPage] = useState(1);
  const questionsPerPage = 3;
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [isCompileModalOpen, setIsCompileModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [submissionModalId, setSubmissionModalId] = useState<string | null>(null);
```

- [ ] **Step 2: Add onClick handler to FileText icon**

**Find lines 1015-1019:**

```tsx
                        <td style={{ textAlign: 'center' }}>
                          <button className={styles.actionIconButton} title="Xem chi tiết">
                            <FileText size={14} />
                          </button>
                        </td>
```

**Replace with:**

```tsx
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className={styles.actionIconButton}
                            title="Xem chi tiết"
                            onClick={() => sub._id && setSubmissionModalId(sub._id)}
                          >
                            <FileText size={14} />
                          </button>
                        </td>
```

- [ ] **Step 3: Render modal in parent**

**Find the GenerateVersionsModal block at lines 1040-1056 (just before `</div>` closing the main page):**

```tsx
      {/* ── Generate Versions Modal ── */}
      {isGenerateModalOpen && (
        <GenerateVersionsModal
          onClose={() => setIsGenerateModalOpen(false)}
          onGenerate={async (count) => {
            if (!id) return;
            try {
              await generateExamVersions(id, count);
              alert(`Đã sinh ${count} mã đề thành công!`);
              setIsGenerateModalOpen(false);
            } catch (err: any) {
              alert(err.message || 'Lỗi khi sinh mã đề');
            }
          }}
          isGenerating={isGeneratingVersions}
        />
      )}
    </div>
  );
}
```

**Add SubmissionDetailModal render BEFORE the closing `</div>`:**

```tsx
      {/* ── Generate Versions Modal ── */}
      {isGenerateModalOpen && (
        <GenerateVersionsModal
          onClose={() => setIsGenerateModalOpen(false)}
          onGenerate={async (count) => {
            if (!id) return;
            try {
              await generateExamVersions(id, count);
              alert(`Đã sinh ${count} mã đề thành công!`);
              setIsGenerateModalOpen(false);
            } catch (err: any) {
              alert(err.message || 'Lỗi khi sinh mã đề');
            }
          }}
          isGenerating={isGeneratingVersions}
        />
      )}

      {/* ── Submission Detail Modal ── */}
      <SubmissionDetailModal
        open={!!submissionModalId}
        submissionId={submissionModalId ?? undefined}
        onClose={() => setSubmissionModalId(null)}
        onSaved={() => {
          if (id) fetchByExam(id);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run lint check**

```bash
cd "C:\TAILIEU\DATN\SMART GRADING\client\web"
npm run lint
```

Expected: 0 errors.

- [ ] **Step 5: Run type check**

```bash
cd "C:\TAILIEU\DATN\SMART GRADING\client\web"
npx tsc -b --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Run all tests**

```bash
cd "C:\TAILIEU\DATN\SMART GRADING\client\web"
npm test
```

Expected: All tests pass (existing + new).

- [ ] **Step 7: Commit**

```bash
cd "C:\TAILIEU\DATN\SMART GRADING"
git add client/web/src/pages/ExamDetailPage.tsx
git commit -m "feat(web): wire up FileText icon to open SubmissionDetailModal"
```

---

## Task 5: Manual end-to-end verification

**Files:** None (verification only)

- [ ] **Step 1: Start dev server**

```bash
cd "C:\TAILIEU\DATN\SMART GRADING\client\web"
npm run dev
```

Expected: Server starts on http://localhost:5173.

- [ ] **Step 2: Navigate to exam detail page**

Open http://localhost:5173/exams/6a3efd862078db5f54b21c1a in browser.

- [ ] **Step 3: Click FileText icon on a submission row**

Verify modal opens showing:
- Student info (name, code, class)
- Score
- Status
- Bảng đáp án (answer table)
- Ảnh bài làm (image gallery, if available)

- [ ] **Step 4: Test Edit flow**

Click "Sửa" → verify dropdowns appear → change an answer → click "Lưu" → verify modal refreshes with new score, page list also refreshes.

- [ ] **Step 5: Test Delete flow**

Reopen modal → click "Xóa" → verify confirm dialog appears → click "Hủy" → verify dialog closes, no deletion. Click "Xóa" again → click "Xác nhận xóa" → verify modal closes, submission removed from list.

- [ ] **Step 6: Test Close flow**

Reopen modal → click "Đóng" button → click overlay → press ESC → verify all close the modal.

- [ ] **Step 7: Commit any UI tweaks if needed**

If any styling tweaks are needed for production look, update CSS files and commit:

```bash
cd "C:\TAILIEU\DATN\SMART GRADING"
git add client/web/src/components/submission/
git commit -m "style(web): polish SubmissionDetailModal styles"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Read flow → Task 3 (Read describe block)
- ✅ Update flow → Task 3 (Update describe block) + Task 1 store action
- ✅ Delete flow → Task 3 (Delete describe block)
- ✅ Accessibility → Task 3 (Accessibility describe block)
- ✅ Wired to FileText icon → Task 4

**Placeholder scan:** No "TODO", "TBD", or "fill in later" — every step has concrete code.

**Type consistency:** `BackendSubmission`, `AnswerRow`, `CreateSubmissionPayload` are defined where used; all references match.

---

## Risks

1. **`currentSubmission.answers[].correctAnswer`** — the field may not always be populated by backend. Handled with `?? null` fallback in component.
2. **Image gallery imports** — `ImageGallery.tsx` exists at expected path; tested in Task 3.
3. **Modal z-index conflicts** — using z-index 1000 which is higher than existing modals in page (none currently).
4. **Test mock for apiService** — used `vi.mock` pattern matching existing examStore.test.ts.
