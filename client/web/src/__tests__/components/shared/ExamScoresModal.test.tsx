import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock sonner (used by handleExport)
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Mock xlsx before importing the component — vi.hoisted runs before hoisting
const { mockWriteFile } = vi.hoisted(() => ({
  mockWriteFile: vi.fn(),
}));
vi.mock('xlsx', () => {
  return {
    __esModule: true,
    default: Object.assign(
      vi.fn(() => ({})),
      {
        utils: {
          book_new: vi.fn(() => ({})),
          aoa_to_sheet: vi.fn(() => ({})),
          book_append_sheet: vi.fn(),
        },
        writeFile: mockWriteFile,
      },
    ),
    utils: {
      book_new: vi.fn(() => ({})),
      aoa_to_sheet: vi.fn(() => ({})),
      book_append_sheet: vi.fn(),
    },
    writeFile: mockWriteFile,
  };
});

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
    // Title has prefix per spec §6.3 — use a regex to match the substring
    expect(screen.getByText(/Kiểm tra 45 phút Toán/)).toBeInTheDocument();
  });

  it('shows subject and date in subline when provided', () => {
    renderModal();
    // Subline shows subject + date; target the subline paragraph specifically
    expect(screen.getByText(/Toán · Ngày thi: 2026-06-28/)).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    // Footer "Đóng" button has accessible name exactly "Đóng"
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

const mockSubmission = {
  _id: 'sub1',
  examId: 'exam1',
  studentId: { _id: 's1', name: 'Nguyen Van A', studentCode: 'HS001', email: 'a@s' },
  totalScore: 8,
  maxScore: 10,
  status: 'completed' as const,
  submittedAt: '2026-06-28T07:32:00.000Z',
};

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
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    const args = mockWriteFile.mock.calls[0];
    // Filename pattern: Diem_KT_45p_Lop_10A1_<date>.xlsx
    expect(String(args[1])).toMatch(/^Diem_.+_.+_\d{8}\.xlsx$/);
  });
});

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
    // s2 should appear as a "Chưa nộp" row
    expect(screen.getByText('Tran Thi B')).toBeInTheDocument();
    // At least one "Chưa nộp" badge should be present
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
    // s1 should appear only once
    expect(screen.getAllByText('Nguyen Van A').length).toBe(1);
  });
});
