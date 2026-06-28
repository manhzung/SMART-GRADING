# ExamScoresModal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Xem điểm" action on each exam row in `ClassExamsSection` that opens a modal showing per-student scores for that exam, with Excel export.

**Architecture:** Pure frontend change. A new shared component `ExamScoresModal` fetches `GET /submissions/exam/:examId` and `GET /classes/:id` via React Query (`useQuery`), renders a 7-column table, and uses the `xlsx` library to export. `ClassExamsSection` gains local state for the open exam id and renders the modal. No backend, routing, or store changes.

**Tech Stack:** React 19, TypeScript, `@tanstack/react-query` (already in `classStore` consumers), `xlsx` (already a dep), Vitest + @testing-library/react, CSS Modules.

**Spec:** `docs/superpowers/specs/2026-06-28-exam-scores-modal-design.md`

**Reference patterns to follow:**
- Component test pattern: `client/web/src/__tests__/components/submission/SubmissionDetailModal.test.tsx` (mocks `core/api`)
- Modal styling pattern: `client/web/src/pages/ClassExamsSection.tsx` (overlay + header + toolbar + footer structure, see lines 344-499)
- `BackendSubmission` shape: `client/web/src/presentation/store/submissionStore.ts` (lines 30-63)

---

## File Structure

**Created:**
- `client/web/src/presentation/components/shared/ExamScoresModal.helpers.ts` — pure helper functions
- `client/web/src/presentation/components/shared/ExamScoresModal.tsx` — modal component
- `client/web/src/presentation/components/shared/ExamScoresModal.module.css` — modal styles
- `client/web/src/__tests__/components/shared/ExamScoresModal.helpers.test.ts` — helper unit tests
- `client/web/src/__tests__/components/shared/ExamScoresModal.test.tsx` — component tests

**Modified:**
- `client/web/src/pages/ClassExamsSection.tsx` — add `viewingScoresForExamId` state, add "Xem điểm" button to the action column of each exam row, render `<ExamScoresModal>` at the bottom of the component

**Not touched:** backend, `AppRoutes.tsx`, `submissionStore.ts`, `classStore.ts`, `ClassDetailPage.tsx`.

---

## Task 1: Pure helper functions (TDD)

**Files:**
- Create: `client/web/src/presentation/components/shared/ExamScoresModal.helpers.ts`
- Test: `client/web/src/__tests__/components/shared/ExamScoresModal.helpers.test.ts`

This task implements three small pure helpers in one pass. Each gets a failing test first, then the impl. The three cycles below are all under 2 minutes each.

### Step 1.1: Write failing tests for helpers

Create file `client/web/src/__tests__/components/shared/ExamScoresModal.helpers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getGradeLabel, formatScore, formatDateTime } from '../../../presentation/components/shared/ExamScoresModal.helpers';

describe('getGradeLabel', () => {
  it('returns "Xuất sắc" for ratio >= 0.9', () => {
    expect(getGradeLabel(9.5, 10)).toBe('Xuất sắc');
    expect(getGradeLabel(9, 10)).toBe('Xuất sắc');
  });
  it('returns "Giỏi" for ratio in [0.8, 0.9)', () => {
    expect(getGradeLabel(8, 10)).toBe('Giỏi');
    expect(getGradeLabel(8.99, 10)).toBe('Giỏi');
  });
  it('returns "Khá" for ratio in [0.65, 0.8)', () => {
    expect(getGradeLabel(6.5, 10)).toBe('Khá');
    expect(getGradeLabel(7.99, 10)).toBe('Khá');
  });
  it('returns "Trung bình" for ratio in [0.5, 0.65)', () => {
    expect(getGradeLabel(5, 10)).toBe('Trung bình');
    expect(getGradeLabel(6.49, 10)).toBe('Trung bình');
  });
  it('returns "Yếu" for ratio < 0.5', () => {
    expect(getGradeLabel(4.99, 10)).toBe('Yếu');
    expect(getGradeLabel(0, 10)).toBe('Yếu');
  });
  it('returns "—" when maxScore is 0', () => {
    expect(getGradeLabel(0, 0)).toBe('—');
  });
  it('returns "—" when maxScore is negative (defensive)', () => {
    expect(getGradeLabel(5, -1)).toBe('—');
  });
});

describe('formatScore', () => {
  it('formats two integers', () => {
    expect(formatScore(8, 10)).toBe('8 / 10');
  });
  it('formats one decimal', () => {
    expect(formatScore(8.5, 10)).toBe('8.5 / 10');
  });
  it('handles zero', () => {
    expect(formatScore(0, 10)).toBe('0 / 10');
    expect(formatScore(0, 0)).toBe('0 / 0');
  });
});

describe('formatDateTime', () => {
  it('returns "—" for undefined', () => {
    expect(formatDateTime(undefined)).toBe('—');
  });
  it('returns "—" for invalid date string', () => {
    expect(formatDateTime('not-a-date')).toBe('—');
  });
  it('formats a valid ISO string to dd/MM/yyyy HH:mm', () => {
    const out = formatDateTime('2026-06-28T07:32:00.000Z');
    // Don't assert HH:mm exactly (TZ-dependent); assert the date part only.
    expect(out).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });
});
```

- [ ] Write the test file above.

### Step 1.2: Run tests to verify they fail

Run: `cd client/web && npm test -- --testPathPattern ExamScoresModal.helpers`
Expected: FAIL — module `ExamScoresModal.helpers` does not exist.

- [ ] Confirm FAIL.

### Step 1.3: Implement helpers

Create file `client/web/src/presentation/components/shared/ExamScoresModal.helpers.ts`:

```ts
export function getGradeLabel(score: number, maxScore: number): string {
  if (!maxScore || maxScore <= 0) return '—';
  const ratio = score / maxScore;
  if (ratio >= 0.9) return 'Xuất sắc';
  if (ratio >= 0.8) return 'Giỏi';
  if (ratio >= 0.65) return 'Khá';
  if (ratio >= 0.5) return 'Trung bình';
  return 'Yếu';
}

function trimTrailing(num: number): string {
  // Strip trailing zeros but keep up to 1 decimal: 8.50 -> 8.5, 8.00 -> 8
  const s = num.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

export function formatScore(score: number, maxScore: number): string {
  return `${trimTrailing(score)} / ${trimTrailing(maxScore)}`;
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}
```

- [ ] Write the helper file.

### Step 1.4: Run tests to verify they pass

Run: `cd client/web && npm test -- --testPathPattern ExamScoresModal.helpers`
Expected: PASS — all helper tests green.

- [ ] Confirm PASS.

### Step 1.5: Commit

```bash
git add client/web/src/presentation/components/shared/ExamScoresModal.helpers.ts \
        client/web/src/__tests__/components/shared/ExamScoresModal.helpers.test.ts
git commit -m "feat(scores-modal): add pure helpers (getGradeLabel, formatScore, formatDateTime)"
```

- [ ] Commit.

---

## Task 2: Modal skeleton — title, close button, open/close behavior

**Files:**
- Create: `client/web/src/presentation/components/shared/ExamScoresModal.tsx`
- Test: `client/web/src/__tests__/components/shared/ExamScoresModal.test.tsx`

### Step 2.1: Write failing tests for modal skeleton

Create file `client/web/src/__tests__/components/shared/ExamScoresModal.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock xlsx before importing the component
vi.mock('xlsx', () => ({
  default: { utils: { book_new: vi.fn(), aoa_to_sheet: vi.fn() }, writeFile: vi.fn() },
  utils: { book_new: vi.fn(), aoa_to_sheet: vi.fn() },
  writeFile: vi.fn(),
}));

// Mock core/api used by the component for class + submissions fetch
vi.mock('../../../core/api', () => ({
  apiService: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { apiService } from '../../../core/api';
import { ExamScoresModal } from '../../../presentation/components/shared/ExamScoresModal';

const noDataQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderModal = (props: Partial<React.ComponentProps<typeof ExamScoresModal>> = {}) => {
  const qc = noDataQueryClient();
  // Default: no data resolved (queries stay pending until we mock)
  (apiService.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
  return render(
    <QueryClientProvider client={qc}>
      <ExamScoresModal
        open={true}
        onClose={vi.fn()}
        examId="exam1"
        examTitle="Kiểm tra 45 phút Toán"
        examSubject="Toán"
        examDate="2026-06-28"
        classId="class1"
        className="Lớp 10A1"
        {...props}
      />
    </QueryClientProvider>,
  );
};

describe('ExamScoresModal — skeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when open=false', () => {
    renderModal({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders dialog with exam title when open=true', () => {
    renderModal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Kiểm tra 45 phút Toán')).toBeInTheDocument();
  });

  it('shows subject and date in subline when provided', () => {
    renderModal();
    expect(screen.getByText(/Toán/)).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole('button', { name: /đóng/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] Write the test file.

### Step 2.2: Run tests to verify they fail

Run: `cd client/web && npm test -- --testPathPattern ExamScoresModal.test`
Expected: FAIL — `ExamScoresModal` module does not exist.

- [ ] Confirm FAIL.

### Step 2.3: Implement minimal modal shell

Create file `client/web/src/presentation/components/shared/ExamScoresModal.tsx`:

```tsx
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { apiService } from '../../../core/api';
import styles from './ExamScoresModal.module.css';
import {
  getGradeLabel,
  formatScore,
  formatDateTime,
} from './ExamScoresModal.helpers';

// ─── Types (local — matches BackendSubmission shape) ─────────────────────────
export interface ExamScoresModalStudent {
  _id: string;
  name: string;
  email: string;
  studentCode?: string;
}

export interface ExamScoresModalSubmission {
  _id: string;
  examId: string;
  studentId: ExamScoresModalStudent | string;
  totalScore: number;
  maxScore: number;
  status: 'scanned' | 'completed' | 'manual_review' | 'appealed' | 'pending';
  submittedAt?: string;
}

export interface ExamScoresModalClass {
  _id: string;
  name: string;
  studentIds: ExamScoresModalStudent[] | string[];
}

// ─── Component ──────────────────────────────────────────────────────────────
export interface ExamScoresModalProps {
  open: boolean;
  onClose: () => void;
  examId: string;
  examTitle: string;
  examSubject?: string;
  examDate?: string;
  classId: string;
  className?: string;
}

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  completed: { label: 'Hoàn thành', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  scanned: { label: 'Đã quét', bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' },
  manual_review: { label: 'Chờ chấm thủ công', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  appealed: { label: 'Đang phúc khảo', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  pending: { label: 'Đang xử lý', bg: '#fefce8', color: '#a16207', border: '#fde047' },
};

export function ExamScoresModal(props: ExamScoresModalProps) {
  const { open, onClose, examId, examTitle, examSubject, examDate, classId, className } = props;

  // Escape key closes the modal
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Fetch submissions for this exam
  const submissionsQuery = useQuery({
    queryKey: ['submissions', examId],
    queryFn: async () => {
      const res = await apiService.get<{ results: ExamScoresModalSubmission[] }>(
        `/submissions/exam/${examId}`,
      );
      return (res.results || res) as ExamScoresModalSubmission[];
    },
    enabled: open && !!examId,
  });

  // Fetch class for roster
  const classQuery = useQuery({
    queryKey: ['class', classId],
    queryFn: async () => apiService.get<ExamScoresModalClass>(`/classes/${classId}`),
    enabled: open && !!classId,
  });

  if (!open) return null;

  const isLoading = submissionsQuery.isLoading || submissionsQuery.isFetching;
  const submissions: ExamScoresModalSubmission[] = submissionsQuery.data ?? [];
  const classData = classQuery.data;
  const rosterIds: string[] = Array.isArray(classData?.studentIds)
    ? classData!.studentIds.map((s) => (typeof s === 'string' ? s : s._id))
    : [];

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exam-scores-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal} data-testid="exam-scores-modal">
        <div className={styles.header}>
          <div>
            <h2 id="exam-scores-title" className={styles.title}>
              Điểm bài thi: {examTitle}
            </h2>
            <p className={styles.subline}>
              {[examSubject, examDate ? `Ngày thi: ${examDate}` : null]
                .filter(Boolean)
                .join(' · ') || ' '}
            </p>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Đóng"
            data-testid="close-btn"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.toolbar}>
          <span className={styles.submittedCount}>
            {isLoading
              ? 'Đang tải...'
              : `${submissions.length}${rosterIds.length ? ` / ${rosterIds.length}` : ''} học sinh đã nộp`}
          </span>
          <button className={styles.exportBtn} disabled data-testid="export-btn">
            Xuất Excel
          </button>
        </div>

        <div className={styles.body}>
          {isLoading ? (
            <div className={styles.loading} data-testid="loading">
              <div className={styles.spinner} />
              <p>Đang tải điểm...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className={styles.empty} data-testid="empty">
              <p>Chưa có học sinh nào nộp bài.</p>
            </div>
          ) : (
            <table className={styles.table} data-testid="scores-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Học sinh</th>
                  <th>Mã HS</th>
                  <th>Điểm</th>
                  <th>Trạng thái</th>
                  <th>Xếp loại</th>
                  <th>Ngày nộp</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s, idx) => {
                  const student =
                    typeof s.studentId === 'string' ? null : s.studentId;
                  const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.pending;
                  return (
                    <tr key={s._id}>
                      <td>{idx + 1}</td>
                      <td>{student?.name ?? '—'}</td>
                      <td>{student?.studentCode ?? '—'}</td>
                      <td>{formatScore(s.totalScore, s.maxScore)}</td>
                      <td>
                        <span
                          className={styles.badge}
                          style={{
                            backgroundColor: badge.bg,
                            color: badge.color,
                            borderColor: badge.border,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td>{getGradeLabel(s.totalScore, s.maxScore)}</td>
                      <td>{formatDateTime(s.submittedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
```

Create file `client/web/src/presentation/components/shared/ExamScoresModal.module.css` (placeholder so the import resolves — full styling comes in Task 6):

```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #fff;
  border-radius: 12px;
  width: 900px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.subline {
  margin: 4px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.closeBtn {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  border-radius: 6px;
}
.closeBtn:hover {
  background: #f3f4f6;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-bottom: 1px solid #f3f4f6;
}

.submittedCount {
  font-size: 13px;
  color: #6b7280;
}

.exportBtn {
  background: #2563eb;
  color: #fff;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}
.exportBtn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.body {
  flex: 1;
  overflow: auto;
  padding: 0 24px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}
.table th,
.table td {
  padding: 10px 8px;
  text-align: left;
  border-bottom: 1px solid #f3f4f6;
  font-size: 14px;
}
.table th {
  font-weight: 600;
  color: #374151;
  background: #f9fafb;
}

.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid;
}

.loading,
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #6b7280;
  gap: 12px;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
}

.cancelBtn {
  background: #f3f4f6;
  color: #374151;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}
.cancelBtn:hover {
  background: #e5e7eb;
}
```

- [ ] Write the modal + CSS files.

### Step 2.4: Run tests to verify they pass

Run: `cd client/web && npm test -- --testPathPattern ExamScoresModal.test`
Expected: PASS — all 5 skeleton tests green.

- [ ] Confirm PASS.

### Step 2.5: Commit

```bash
git add client/web/src/presentation/components/shared/ExamScoresModal.tsx \
        client/web/src/presentation/components/shared/ExamScoresModal.module.css \
        client/web/src/__tests__/components/shared/ExamScoresModal.test.tsx
git commit -m "feat(scores-modal): add modal skeleton with title, close, escape, loading/empty/table states"
```

- [ ] Commit.

---

## Task 3: Excel export

**Files:**
- Modify: `client/web/src/presentation/components/shared/ExamScoresModal.tsx`
- Modify: `client/web/src/__tests__/components/shared/ExamScoresModal.test.tsx`

### Step 3.1: Add failing tests for export

Append to the test file, inside the `describe('ExamScoresModal — skeleton', ...)` block (add a new describe block right after):

```tsx
import xlsx from 'xlsx';
// ... (add this import at the top, next to the existing imports)

describe('ExamScoresModal — export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enables export button when submissions are loaded', async () => {
    (apiService.get as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (String(url).includes('/submissions/exam/')) {
        return { results: [mockSubmission] };
      }
      if (String(url).includes('/classes/')) {
        return { _id: 'class1', name: 'Lớp 10A1', studentIds: ['s1'] };
      }
      return null;
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ExamScoresModal
          open={true}
          onClose={vi.fn()}
          examId="exam1"
          examTitle="KT 45p"
          classId="class1"
          className="Lớp 10A1"
        />
      </QueryClientProvider>,
    );
    await screen.findByTestId('scores-table');
    expect(screen.getByTestId('export-btn')).not.toBeDisabled();
  });

  it('calls xlsx.writeFile when export button is clicked', async () => {
    (apiService.get as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (String(url).includes('/submissions/exam/')) {
        return { results: [mockSubmission] };
      }
      if (String(url).includes('/classes/')) {
        return { _id: 'class1', name: 'Lớp 10A1', studentIds: ['s1'] };
      }
      return null;
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ExamScoresModal
          open={true}
          onClose={vi.fn()}
          examId="exam1"
          examTitle="KT 45p"
          classId="class1"
          className="Lớp 10A1"
        />
      </QueryClientProvider>,
    );
    await screen.findByTestId('scores-table');
    fireEvent.click(screen.getByTestId('export-btn'));
    expect(xlsx.writeFile).toHaveBeenCalledTimes(1);
    const args = (xlsx.writeFile as ReturnType<typeof vi.fn>).mock.calls[0];
    // Filename pattern: Diem_KT_45p_Lop_10A1_<date>.xlsx
    expect(String(args[1])).toMatch(/^Diem_.+_.+_\d{8}\.xlsx$/);
  });
});

// Add this mock near the top of the test file (outside any describe)
const mockSubmission = {
  _id: 'sub1',
  examId: 'exam1',
  studentId: { _id: 's1', name: 'Nguyen Van A', studentCode: 'HS001', email: 'a@s' },
  totalScore: 8,
  maxScore: 10,
  status: 'completed' as const,
  submittedAt: '2026-06-28T07:32:00.000Z',
};
```

> **Note:** the `mockSubmission` constant must be declared once near the top of the test file (outside the describe blocks). Place it right after the `vi.mock('xlsx', ...)` block.

- [ ] Append the tests + the `mockSubmission` constant.

### Step 3.2: Run tests to verify the new ones fail

Run: `cd client/web && npm test -- --testPathPattern ExamScoresModal.test`
Expected: the new "export" tests FAIL (button stays disabled, writeFile not called). The previous 5 tests still PASS.

- [ ] Confirm FAIL on the new tests.

### Step 3.3: Implement export logic

In `client/web/src/presentation/components/shared/ExamScoresModal.tsx`:

1. Add to the top imports:

```tsx
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
```

2. Add a helper near the top of the file (after the `STATUS_BADGE` constant):

```tsx
function sanitizeFilenamePart(s: string): string {
  // Replace any non-alphanumeric (allow Vietnamese letters) with _, collapse repeats
  const stripped = s.normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, '_');
  return stripped.replace(/^_+|_+$/g, '').slice(0, 60) || 'item';
}
```

3. Add a `handleExport` function inside the component (just above the `return`):

```tsx
const handleExport = () => {
  if (!submissions.length) return;
  const header = ['STT', 'Họ tên', 'Mã học sinh', 'Điểm', 'Xếp loại', 'Trạng thái', 'Ngày nộp'];
  const rows = submissions.map((s, idx) => {
    const student = typeof s.studentId === 'string' ? null : s.studentId;
    const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.pending;
    return [
      idx + 1,
      student?.name ?? '—',
      student?.studentCode ?? '—',
      formatScore(s.totalScore, s.maxScore),
      getGradeLabel(s.totalScore, s.maxScore),
      badge.label,
      formatDateTime(s.submittedAt),
    ];
  });
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Điểm');
  const today = new Date();
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const filename = `Diem_${sanitizeFilenamePart(examTitle)}_${sanitizeFilenamePart(className ?? '')}_${ymd}.xlsx`;
  XLSX.writeFile(wb, filename);
  toast.success('Đã xuất danh sách điểm');
};
```

4. Update the export button:

```tsx
<button
  className={styles.exportBtn}
  onClick={handleExport}
  disabled={isLoading || submissions.length === 0}
  data-testid="export-btn"
>
  Xuất Excel
</button>
```

- [ ] Make the edits above.

### Step 3.4: Run tests to verify they pass

Run: `cd client/web && npm test -- --testPathPattern ExamScoresModal.test`
Expected: all tests PASS (skeleton 5 + export 2).

- [ ] Confirm PASS.

### Step 3.5: Commit

```bash
git add client/web/src/presentation/components/shared/ExamScoresModal.tsx \
        client/web/src/__tests__/components/shared/ExamScoresModal.test.tsx
git commit -m "feat(scores-modal): wire up Excel export via xlsx + sonner toast"
```

- [ ] Commit.

---

## Task 4: "Chưa nộp" rows + roster merge

**Files:**
- Modify: `client/web/src/presentation/components/shared/ExamScoresModal.tsx`
- Modify: `client/web/src/__tests__/components/shared/ExamScoresModal.test.tsx`

Currently the table only renders students who submitted. The spec requires also showing students from the class roster who have NOT submitted, as "Chưa nộp" rows.

### Step 4.1: Add failing test for "Chưa nộp" rendering

Append to the test file (new describe block):

```tsx
describe('ExamScoresModal — Chưa nộp roster merge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "Chưa nộp" rows for students in class but not in submissions', async () => {
    (apiService.get as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (String(url).includes('/submissions/exam/')) {
        // only s1 submitted
        return {
          results: [
            {
              _id: 'sub1',
              examId: 'exam1',
              studentId: { _id: 's1', name: 'Nguyen Van A', studentCode: 'HS001', email: 'a@s' },
              totalScore: 8,
              maxScore: 10,
              status: 'completed',
              submittedAt: '2026-06-28T07:32:00.000Z',
            },
          ],
        };
      }
      if (String(url).includes('/classes/')) {
        return {
          _id: 'class1',
          name: 'Lớp 10A1',
          // s1 (submitted) and s2 (not submitted)
          studentIds: [
            { _id: 's1', name: 'Nguyen Van A', studentCode: 'HS001', email: 'a@s' },
            { _id: 's2', name: 'Tran Thi B', studentCode: 'HS002', email: 'b@s' },
          ],
        };
      }
      return null;
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ExamScoresModal
          open={true}
          onClose={vi.fn()}
          examId="exam1"
          examTitle="KT 45p"
          classId="class1"
          className="Lớp 10A1"
        />
      </QueryClientProvider>,
    );
    await screen.findByTestId('scores-table');
    expect(screen.getByText('Tran Thi B')).toBeInTheDocument();
    // Two "Chưa nộp" badges: one for missing student; "—" appears in score cells
    expect(screen.getAllByText('Chưa nộp').length).toBeGreaterThanOrEqual(1);
  });

  it('does not duplicate a student who is both in roster and in submissions', async () => {
    (apiService.get as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (String(url).includes('/submissions/exam/')) {
        return {
          results: [
            {
              _id: 'sub1',
              examId: 'exam1',
              studentId: { _id: 's1', name: 'Nguyen Van A', studentCode: 'HS001', email: 'a@s' },
              totalScore: 8,
              maxScore: 10,
              status: 'completed',
              submittedAt: '2026-06-28T07:32:00.000Z',
            },
          ],
        };
      }
      if (String(url).includes('/classes/')) {
        return {
          _id: 'class1',
          name: 'Lớp 10A1',
          studentIds: [
            { _id: 's1', name: 'Nguyen Van A', studentCode: 'HS001', email: 'a@s' },
          ],
        };
      }
      return null;
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ExamScoresModal
          open={true}
          onClose={vi.fn()}
          examId="exam1"
          examTitle="KT 45p"
          classId="class1"
          className="Lớp 10A1"
        />
      </QueryClientProvider>,
    );
    await screen.findByTestId('scores-table');
    expect(screen.getAllByText('Nguyen Van A').length).toBe(1);
  });
});
```

- [ ] Append the new describe block.

### Step 4.2: Run tests to verify they fail

Run: `cd client/web && npm test -- --testPathPattern ExamScoresModal.test`
Expected: new "Chưa nộp" tests FAIL; all other tests still PASS.

- [ ] Confirm FAIL on the new tests.

### Step 4.3: Implement roster merge

In `client/web/src/presentation/components/shared/ExamScoresModal.tsx`, replace the `submissions` body construction (just above the `return`) and the table `<tbody>` to merge the roster with submissions.

Replace this block:

```tsx
const submissions: ExamScoresModalSubmission[] = submissionsQuery.data ?? [];
const classData = classQuery.data;
const rosterIds: string[] = Array.isArray(classData?.studentIds)
  ? classData!.studentIds.map((s) => (typeof s === 'string' ? s : s._id))
  : [];
```

with:

```tsx
const submissions: ExamScoresModalSubmission[] = submissionsQuery.data ?? [];
const classData = classQuery.data;

interface DisplayRow {
  key: string;
  student: ExamScoresModalStudent | null;
  submission: ExamScoresModalSubmission | null;
}

const rows: DisplayRow[] = (() => {
  const roster: ExamScoresModalStudent[] = Array.isArray(classData?.studentIds)
    ? (classData!.studentIds as Array<ExamScoresModalStudent | string>).map((s) =>
        typeof s === 'string' ? { _id: s, name: '', email: '' } : s,
      )
    : [];

  const submittedIds = new Set(
    submissions
      .map((s) => (typeof s.studentId === 'string' ? s.studentId : s.studentId._id))
      .filter(Boolean),
  );

  const out: DisplayRow[] = [];

  // Submitted students first
  for (const sub of submissions) {
    const student = typeof sub.studentId === 'string' ? null : sub.studentId;
    const key = student?._id ?? (typeof sub.studentId === 'string' ? sub.studentId : sub._id);
    out.push({ key: `s-${key}`, student, submission: sub });
  }

  // Then roster students who didn't submit
  for (const r of roster) {
    if (!submittedIds.has(r._id)) {
      out.push({ key: `m-${r._id}`, student: r, submission: null });
    }
  }

  return out;
})();

const rosterIds: string[] = Array.isArray(classData?.studentIds)
  ? classData!.studentIds.map((s) => (typeof s === 'string' ? s : s._id))
  : [];
```

Replace the table `<tbody>`:

```tsx
<tbody>
  {rows.map((row, idx) => {
    if (!row.submission) {
      // Not submitted row
      return (
        <tr key={row.key} data-testid="row-not-submitted">
          <td>{idx + 1}</td>
          <td>{row.student?.name || '—'}</td>
          <td>{row.student?.studentCode || '—'}</td>
          <td>—</td>
          <td>
            <span
              className={styles.badge}
              style={{ backgroundColor: '#f9fafb', color: '#6b7280', borderColor: '#e5e7eb' }}
            >
              Chưa nộp
            </span>
          </td>
          <td>—</td>
          <td>—</td>
        </tr>
      );
    }
    const s = row.submission;
    const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.pending;
    return (
      <tr key={row.key} data-testid="row-submitted">
        <td>{idx + 1}</td>
        <td>{row.student?.name ?? '—'}</td>
        <td>{row.student?.studentCode ?? '—'}</td>
        <td>{formatScore(s.totalScore, s.maxScore)}</td>
        <td>
          <span
            className={styles.badge}
            style={{
              backgroundColor: badge.bg,
              color: badge.color,
              borderColor: badge.border,
            }}
          >
            {badge.label}
          </span>
        </td>
        <td>{getGradeLabel(s.totalScore, s.maxScore)}</td>
        <td>{formatDateTime(s.submittedAt)}</td>
      </tr>
    );
  })}
</tbody>
```

Also update the `submittedCount` text in the toolbar — replace:

```tsx
{isLoading
  ? 'Đang tải...'
  : `${submissions.length}${rosterIds.length ? ` / ${rosterIds.length}` : ''} học sinh đã nộp`}
```

with:

```tsx
{isLoading
  ? 'Đang tải...'
  : classQuery.isError
    ? `${submissions.length} học sinh đã nộp`
    : `${submissions.length}${rosterIds.length ? ` / ${rosterIds.length}` : ''} học sinh đã nộp`}
```

Also update the export `disabled` to use `rows` count:

```tsx
disabled={isLoading || rows.length === 0}
```

And update the `handleExport` function: change the loop source from `submissions.map(...)` to `rows.map(...)` and skip not-submitted rows (or include them with placeholder data — **decision: exclude "Chưa nộp" from export** to keep the spreadsheet as a list of actual submissions). Replace the `rows = submissions.map(...)` line in `handleExport` with:

```tsx
const rows: (string | number)[][] = submissions.map((s, idx) => {
  const student = typeof s.studentId === 'string' ? null : s.studentId;
  const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.pending;
  return [
    idx + 1,
    student?.name ?? '—',
    student?.studentCode ?? '—',
    formatScore(s.totalScore, s.maxScore),
    getGradeLabel(s.totalScore, s.maxScore),
    badge.label,
    formatDateTime(s.submittedAt),
  ];
});
```

> **Conflict note:** the variable name `rows` is also used by the display merge. Rename the export local to avoid the collision. Update the `handleExport` body to use a distinct name, e.g. `exportRows`. Apply this change as part of Step 4.3.

The relevant portion of `handleExport` becomes:

```tsx
const handleExport = () => {
  if (!submissions.length) return;
  const header = ['STT', 'Họ tên', 'Mã học sinh', 'Điểm', 'Xếp loại', 'Trạng thái', 'Ngày nộp'];
  const exportRows: (string | number)[][] = submissions.map((s, idx) => {
    const student = typeof s.studentId === 'string' ? null : s.studentId;
    const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.pending;
    return [
      idx + 1,
      student?.name ?? '—',
      student?.studentCode ?? '—',
      formatScore(s.totalScore, s.maxScore),
      getGradeLabel(s.totalScore, s.maxScore),
      badge.label,
      formatDateTime(s.submittedAt),
    ];
  });
  const ws = XLSX.utils.aoa_to_sheet([header, ...exportRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Điểm');
  const today = new Date();
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const filename = `Diem_${sanitizeFilenamePart(examTitle)}_${sanitizeFilenamePart(className ?? '')}_${ymd}.xlsx`;
  XLSX.writeFile(wb, filename);
  toast.success('Đã xuất danh sách điểm');
};
```

- [ ] Apply the edits above.

### Step 4.4: Run tests to verify they pass

Run: `cd client/web && npm test -- --testPathPattern ExamScoresModal.test`
Expected: all tests PASS (skeleton 5 + export 2 + roster merge 2 = 9 total).

- [ ] Confirm PASS.

### Step 4.5: Commit

```bash
git add client/web/src/presentation/components/shared/ExamScoresModal.tsx \
        client/web/src/__tests__/components/shared/ExamScoresModal.test.tsx
git commit -m "feat(scores-modal): merge class roster to render 'Chưa nộp' rows"
```

- [ ] Commit.

---

## Task 5: Integrate modal into ClassExamsSection

**Files:**
- Modify: `client/web/src/pages/ClassExamsSection.tsx`

No new tests in this task — the modal itself is fully tested. This task is wiring the trigger button + state. The change is small and verifiable by running existing tests + manual smoke.

### Step 5.1: Add state + icon import

In `client/web/src/pages/ClassExamsSection.tsx`, add `Eye` to the lucide-react import:

```tsx
import {
  FileText,
  Plus,
  X,
  Search,
  Filter,
  Trash2,
  AlertCircle,
  Check,
  CheckSquare,
  Square,
  BookOpen,
  Clock,
  Hash,
  Eye, // ← add
} from 'lucide-react';
```

Add the import for the modal (after existing component imports):

```tsx
import { ExamScoresModal } from '../presentation/components/shared/ExamScoresModal';
```

Inside the `ClassExamsSection` function (just after the existing `useState` calls — e.g. right after `const [actionSuccess, setActionSuccess] = useState<string | null>(null);`):

```tsx
const [viewingScoresForExamId, setViewingScoresForExamId] = useState<string | null>(null);
```

- [ ] Make these edits.

### Step 5.2: Add the "Xem điểm" button to the exam row

In the same file, locate the table row for each exam (around lines 274-336 in current file). The last `<td>` (line 321, currently the action column with the `Trash2` remove button) currently has `style={{ width: '80px', textAlign: 'center' }}`. Change it to wrap both buttons in a flex container and increase the width to fit both.

Replace this:

```tsx
<td style={{ textAlign: 'center' }}>
  <button
    className={styles.removeBtn}
    onClick={() => handleRemoveExam(exam._id, exam.title)}
    disabled={isInProgress}
    title={
      isInProgress
        ? 'Không thể xóa: bài thi đang trong quá trình thi'
        : 'Xóa khỏi lớp này'
    }
  >
    <Trash2 size={14} />
  </button>
</td>
```

with:

```tsx
<td style={{ width: '120px', textAlign: 'center' }}>
  <div style={{ display: 'inline-flex', gap: '6px' }}>
    <button
      className={styles.viewScoresBtn}
      onClick={() => setViewingScoresForExamId(exam._id)}
      title="Xem điểm bài thi"
      aria-label="Xem điểm bài thi"
      data-testid={`view-scores-${exam._id}`}
    >
      <Eye size={14} />
    </button>
    <button
      className={styles.removeBtn}
      onClick={() => handleRemoveExam(exam._id, exam.title)}
      disabled={isInProgress}
      title={
        isInProgress
          ? 'Không thể xóa: bài thi đang trong quá trình thi'
          : 'Xóa khỏi lớp này'
    >
      <Trash2 size={14} />
    </button>
  </div>
</td>
```

Also update the header `<th>` for the action column to match — change the existing line:

```tsx
<th style={{ width: '80px', textAlign: 'center' }}>Thao tác</th>
```

to:

```tsx
<th style={{ width: '120px', textAlign: 'center' }}>Thao tác</th>
```

- [ ] Make these edits.

### Step 5.3: Render the modal at the end of the component

At the end of the `return` JSX (just before the closing `</div>` of the section root — i.e. right after the existing "Assign Exam Modal" block, search for `{/* Assign Exam Modal */}` and add the following right after its closing `)`):

```tsx
{/* Exam Scores Modal */}
{viewingScoresForExamId && (() => {
  const selectedExam = classExams.find((e) => e._id === viewingScoresForExamId);
  return (
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
  );
})()}
```

- [ ] Add this JSX.

### Step 5.4: Add `viewScoresBtn` style to ClassExamsSection.module.css

Open `client/web/src/pages/ClassExamsSection.module.css` (the path is `client/web/src/pages/ClassExamsSection.module.css`). Append the new style (use a sibling selector to the existing `.removeBtn` to keep visual consistency):

```css
.viewScoresBtn {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.viewScoresBtn:hover {
  background: #dbeafe;
}
```

> If the existing `.removeBtn` style does not exist or differs, mirror its shape (background, padding, border-radius) to keep the two action buttons visually consistent. The intent is: two small icon buttons side-by-side.

- [ ] Add the style.

### Step 5.5: Run all web tests + lint

Run: `cd client/web && npm test`
Expected: ALL existing tests pass + the 9 new ExamScoresModal tests pass.

Run: `cd client/web && npm run lint`
Expected: no new lint errors (existing errors, if any, are pre-existing and out of scope).

- [ ] Confirm full test suite + lint pass.

### Step 5.6: Commit

```bash
git add client/web/src/pages/ClassExamsSection.tsx \
        client/web/src/pages/ClassExamsSection.module.css
git commit -m "feat(class-exams): wire 'Xem điểm' button to open ExamScoresModal"
```

- [ ] Commit.

---

## Task 6: Final verification (no code changes expected)

### Step 6.1: Run full test suite

Run: `cd client/web && npm test`
Expected: all tests pass, including the 9 new ones for `ExamScoresModal`.

- [ ] Confirm PASS.

### Step 6.2: Run lint

Run: `cd client/web && npm run lint`
Expected: no new errors.

- [ ] Confirm clean.

### Step 6.3: Type check

Run: `cd client/web && npx tsc -b --noEmit`
Expected: no TypeScript errors.

- [ ] Confirm clean.

### Step 6.4: Manual smoke checklist (in dev server)

Run: `cd client/web && npm run dev`

Open the school-admin or teacher account, navigate to `/classes/<some-class-id>` and verify:

- [ ] The action column on every exam row now has TWO icon buttons (Eye + Trash).
- [ ] Clicking the Eye button opens the modal.
- [ ] The modal title is `"Điểm bài thi: <title>"`.
- [ ] The 7-column table renders per spec.
- [ ] Students in the class who have not submitted appear as "Chưa nộp" rows.
- [ ] Clicking "Xuất Excel" downloads a `.xlsx` file with the expected name.
- [ ] Pressing Escape, clicking the X, or clicking "Đóng" all close the modal.
- [ ] No console errors or warnings in the browser devtools.

---

## Self-Review Checklist (verified while writing)

- [x] **Spec coverage:** All 8 acceptance criteria in spec §13 map to tasks:
  - 1, 2 (button + title) → Task 5
  - 3 (7 columns) → Task 2 + 4
  - 4 ("Chưa nộp" rows) → Task 4
  - 5 (Excel export) → Task 3
  - 6 (close paths) → Task 2 (Esc, close button, footer button)
  - 7 (tests pass) → Task 6.1
  - 8 (lint clean) → Task 6.2
- [x] **Placeholder scan:** No "TBD", "TODO", "fill in", "implement later" in any step. Every code change has actual code.
- [x] **Type consistency:** `ExamScoresModal` props used in tests match those defined in Task 2.3. `getGradeLabel`/`formatScore`/`formatDateTime` signatures consistent across tasks. `STATUS_BADGE` keys (`completed`/`scanned`/`manual_review`/`appealed`/`pending`) match `BackendSubmission.status` union type.
- [x] **No external references:** All files, types, and methods referenced in later tasks are defined in earlier tasks.

---

## Risks & Mitigations (carried from spec)

- `BackendSubmission.studentId` may come unpopulated (just a string). The component handles both shapes.
- Class endpoint shape variation: roster fetch is wrapped in a try/error-tolerant merge; if it fails, the "Chưa nộp" rows are skipped gracefully.
- Filename with Vietnamese diacritics: `sanitizeFilenamePart` normalizes to NFC and strips non-alphanumeric → safe across Windows/macOS/Linux.
