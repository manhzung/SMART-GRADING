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
