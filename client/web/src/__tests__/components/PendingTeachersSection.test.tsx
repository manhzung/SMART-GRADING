import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PendingTeachersSection } from '../../presentation/components/admin/SchoolDetailModal';
import { useApprovalStore } from '../../presentation/store/approvalStore';

// Mock the store
const mockFetchAdminPendingTeachers = vi.fn();
const mockAdminApproveTeacher = vi.fn();
const mockAdminRejectTeacher = vi.fn();

vi.mock('../../presentation/store/approvalStore', () => ({
  useApprovalStore: vi.fn(),
}));

describe('PendingTeachersSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useApprovalStore as ReturnType<typeof vi.fn>).mockReturnValue({
      adminPendingTeachers: [],
      adminPendingTeachersCount: 0,
      isLoadingAdminTeachers: false,
      fetchAdminPendingTeachers: mockFetchAdminPendingTeachers,
      adminApproveTeacher: mockAdminApproveTeacher,
      adminRejectTeacher: mockAdminRejectTeacher,
    });
  });

  it('renders loading state when isLoadingAdminTeachers is true', () => {
    (useApprovalStore as ReturnType<typeof vi.fn>).mockReturnValue({
      adminPendingTeachers: [],
      adminPendingTeachersCount: 0,
      isLoadingAdminTeachers: true,
      fetchAdminPendingTeachers: mockFetchAdminPendingTeachers,
      adminApproveTeacher: mockAdminApproveTeacher,
      adminRejectTeacher: mockAdminRejectTeacher,
    });

    render(<PendingTeachersSection schoolId="school123" />);

    expect(screen.getByText('Đang tải...')).toBeInTheDocument();
  });

  it('renders empty state when no pending teachers', () => {
    render(<PendingTeachersSection schoolId="school123" />);

    expect(screen.getByText('Không có giáo viên nào đang chờ duyệt.')).toBeInTheDocument();
  });

  it('renders teacher cards when teachers are present', () => {
    const teachers = [
      { _id: 't1', id: 't1', name: 'Nguyễn Văn A', email: 'a@example.com', createdAt: '2026-01-01' },
      { _id: 't2', id: 't2', name: 'Trần Thị B', email: 'b@example.com', createdAt: '2026-01-02' },
    ];
    (useApprovalStore as ReturnType<typeof vi.fn>).mockReturnValue({
      adminPendingTeachers: teachers,
      adminPendingTeachersCount: 2,
      isLoadingAdminTeachers: false,
      fetchAdminPendingTeachers: mockFetchAdminPendingTeachers,
      adminApproveTeacher: mockAdminApproveTeacher,
      adminRejectTeacher: mockAdminRejectTeacher,
    });

    render(<PendingTeachersSection schoolId="school123" />);

    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('a@example.com')).toBeInTheDocument();
    expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
    expect(screen.getByText('b@example.com')).toBeInTheDocument();
  });

  it('displays badge with count when teachers exist', () => {
    const teachers = [
      { _id: 't1', id: 't1', name: 'Teacher A', email: 'a@example.com', createdAt: '2026-01-01' },
    ];
    (useApprovalStore as ReturnType<typeof vi.fn>).mockReturnValue({
      adminPendingTeachers: teachers,
      adminPendingTeachersCount: 3,
      isLoadingAdminTeachers: false,
      fetchAdminPendingTeachers: mockFetchAdminPendingTeachers,
      adminApproveTeacher: mockAdminApproveTeacher,
      adminRejectTeacher: mockAdminRejectTeacher,
    });

    render(<PendingTeachersSection schoolId="school123" />);

    expect(screen.getByText('3 pending')).toBeInTheDocument();
  });

  it('does not display badge when count is zero', () => {
    (useApprovalStore as ReturnType<typeof vi.fn>).mockReturnValue({
      adminPendingTeachers: [],
      adminPendingTeachersCount: 0,
      isLoadingAdminTeachers: false,
      fetchAdminPendingTeachers: mockFetchAdminPendingTeachers,
      adminApproveTeacher: mockAdminApproveTeacher,
      adminRejectTeacher: mockAdminRejectTeacher,
    });

    render(<PendingTeachersSection schoolId="school123" />);

    expect(screen.queryByText(/pending/)).not.toBeInTheDocument();
  });

  it('calls fetchAdminPendingTeachers on mount', () => {
    render(<PendingTeachersSection schoolId="school123" />);

    expect(mockFetchAdminPendingTeachers).toHaveBeenCalledWith('school123');
  });

  it('refetches when schoolId prop changes', () => {
    const { rerender } = render(<PendingTeachersSection schoolId="school123" />);

    expect(mockFetchAdminPendingTeachers).toHaveBeenCalledTimes(1);

    rerender(<PendingTeachersSection schoolId="school456" />);

    expect(mockFetchAdminPendingTeachers).toHaveBeenCalledWith('school456');
  });

  it('calls adminApproveTeacher with correct userId on approve click', async () => {
    const teachers = [
      { _id: 't1', id: 't1', name: 'Teacher A', email: 'a@example.com', createdAt: '2026-01-01' },
    ];
    (useApprovalStore as ReturnType<typeof vi.fn>).mockReturnValue({
      adminPendingTeachers: teachers,
      adminPendingTeachersCount: 1,
      isLoadingAdminTeachers: false,
      fetchAdminPendingTeachers: mockFetchAdminPendingTeachers,
      adminApproveTeacher: mockAdminApproveTeacher.mockResolvedValue(undefined),
      adminRejectTeacher: mockAdminRejectTeacher,
    });

    render(<PendingTeachersSection schoolId="school123" />);

    const approveButton = screen.getByRole('button', { name: /duyệt/i });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockAdminApproveTeacher).toHaveBeenCalledWith('t1');
    });
  });

  it('calls adminRejectTeacher with correct userId on reject click', async () => {
    const teachers = [
      { _id: 't1', id: 't1', name: 'Teacher A', email: 'a@example.com', createdAt: '2026-01-01' },
    ];
    (useApprovalStore as ReturnType<typeof vi.fn>).mockReturnValue({
      adminPendingTeachers: teachers,
      adminPendingTeachersCount: 1,
      isLoadingAdminTeachers: false,
      fetchAdminPendingTeachers: mockFetchAdminPendingTeachers,
      adminApproveTeacher: mockAdminApproveTeacher,
      adminRejectTeacher: mockAdminRejectTeacher.mockResolvedValue(undefined),
    });

    // Mock window.prompt
    const originalPrompt = window.prompt;
    window.prompt = vi.fn().mockReturnValue('Không đủ điều kiện');

    render(<PendingTeachersSection schoolId="school123" />);

    const rejectButton = screen.getByRole('button', { name: /từ chối/i });
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(mockAdminRejectTeacher).toHaveBeenCalledWith('t1', 'Không đủ điều kiện');
    });

    window.prompt = originalPrompt;
  });
});
