import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockGetAdminPendingTeachers: vi.fn(),
  mockAdminApproveTeacher: vi.fn(),
  mockAdminRejectTeacher: vi.fn(),
}));

vi.mock('../../services/approval.service', () => ({
  default: {
    getPendingQuestions: vi.fn(),
    approveQuestion: vi.fn(),
    rejectQuestion: vi.fn(),
    getPendingTeachers: vi.fn(),
    approveTeacher: vi.fn(),
    rejectTeacher: vi.fn(),
    getAdminPendingTeachers: mocks.mockGetAdminPendingTeachers,
    adminApproveTeacher: mocks.mockAdminApproveTeacher,
    adminRejectTeacher: mocks.mockAdminRejectTeacher,
  },
}));

import { useApprovalStore } from '../../presentation/store/approvalStore';

describe('approvalStore — admin teacher approval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useApprovalStore.setState({
      adminPendingTeachers: [],
      adminPendingTeachersCount: 0,
      isLoadingAdminTeachers: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('has empty adminPendingTeachers array', () => {
      expect(useApprovalStore.getState().adminPendingTeachers).toEqual([]);
    });

    it('has adminPendingTeachersCount of 0', () => {
      expect(useApprovalStore.getState().adminPendingTeachersCount).toBe(0);
    });

    it('has isLoadingAdminTeachers as false', () => {
      expect(useApprovalStore.getState().isLoadingAdminTeachers).toBe(false);
    });
  });

  describe('fetchAdminPendingTeachers', () => {
    it('populates adminPendingTeachers on success', async () => {
      const teachers = [
        { _id: 't1', id: 't1', name: 'Teacher A', email: 'a@b.com', createdAt: '2026-01-01' },
        { _id: 't2', id: 't2', name: 'Teacher B', email: 'b@b.com', createdAt: '2026-01-02' },
      ];
      mocks.mockGetAdminPendingTeachers.mockResolvedValueOnce({
        results: teachers,
        page: 1,
        limit: 100,
        total: 2,
        pages: 1,
      });

      await useApprovalStore.getState().fetchAdminPendingTeachers('school123');

      expect(useApprovalStore.getState().adminPendingTeachers).toEqual(teachers);
      expect(useApprovalStore.getState().adminPendingTeachersCount).toBe(2);
      expect(useApprovalStore.getState().isLoadingAdminTeachers).toBe(false);
    });

    it('sets isLoadingAdminTeachers to true while fetching', async () => {
      let resolve: (val: unknown) => void;
      mocks.mockGetAdminPendingTeachers.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));

      const fetchPromise = useApprovalStore.getState().fetchAdminPendingTeachers('school123');
      expect(useApprovalStore.getState().isLoadingAdminTeachers).toBe(true);

      resolve!({ results: [], page: 1, limit: 100, total: 0, pages: 0 });
      await fetchPromise;
      expect(useApprovalStore.getState().isLoadingAdminTeachers).toBe(false);
    });

    it('sets error on failure', async () => {
      mocks.mockGetAdminPendingTeachers.mockRejectedValueOnce(new Error('Fetch failed'));

      await useApprovalStore.getState().fetchAdminPendingTeachers('school123');

      expect(useApprovalStore.getState().error).toBe('Fetch failed');
      expect(useApprovalStore.getState().isLoadingAdminTeachers).toBe(false);
    });
  });

  describe('adminApproveTeacher', () => {
    it('removes approved teacher from adminPendingTeachers list', async () => {
      useApprovalStore.setState({
        adminPendingTeachers: [
          { _id: 't1', id: 't1', name: 'Teacher A', email: 'a@b.com', createdAt: '2026-01-01' },
          { _id: 't2', id: 't2', name: 'Teacher B', email: 'b@b.com', createdAt: '2026-01-02' },
        ],
        adminPendingTeachersCount: 2,
      });
      mocks.mockAdminApproveTeacher.mockResolvedValueOnce({ _id: 't1', registrationStatus: 'approved' });

      await useApprovalStore.getState().adminApproveTeacher('t1');

      expect(useApprovalStore.getState().adminPendingTeachers).toHaveLength(1);
      expect(useApprovalStore.getState().adminPendingTeachers[0]._id).toBe('t2');
      expect(useApprovalStore.getState().adminPendingTeachersCount).toBe(1);
    });

    it('throws error on failure without changing state', async () => {
      useApprovalStore.setState({
        adminPendingTeachers: [
          { _id: 't1', id: 't1', name: 'Teacher A', email: 'a@b.com', createdAt: '2026-01-01' },
        ],
        adminPendingTeachersCount: 1,
      });
      mocks.mockAdminApproveTeacher.mockRejectedValueOnce(new Error('Approve failed'));

      await expect(useApprovalStore.getState().adminApproveTeacher('t1')).rejects.toThrow('Approve failed');
      expect(useApprovalStore.getState().adminPendingTeachers).toHaveLength(1);
      expect(useApprovalStore.getState().adminPendingTeachersCount).toBe(1);
    });
  });

  describe('adminRejectTeacher', () => {
    it('removes rejected teacher from adminPendingTeachers list', async () => {
      useApprovalStore.setState({
        adminPendingTeachers: [
          { _id: 't1', id: 't1', name: 'Teacher A', email: 'a@b.com', createdAt: '2026-01-01' },
          { _id: 't2', id: 't2', name: 'Teacher B', email: 'b@b.com', createdAt: '2026-01-02' },
        ],
        adminPendingTeachersCount: 2,
      });
      mocks.mockAdminRejectTeacher.mockResolvedValueOnce({ _id: 't1', registrationStatus: 'rejected' });

      await useApprovalStore.getState().adminRejectTeacher('t1', 'Không đủ điều kiện');

      expect(useApprovalStore.getState().adminPendingTeachers).toHaveLength(1);
      expect(useApprovalStore.getState().adminPendingTeachers[0]._id).toBe('t2');
      expect(useApprovalStore.getState().adminPendingTeachersCount).toBe(1);
    });

    it('throws error on failure without changing state', async () => {
      useApprovalStore.setState({
        adminPendingTeachers: [
          { _id: 't1', id: 't1', name: 'Teacher A', email: 'a@b.com', createdAt: '2026-01-01' },
        ],
        adminPendingTeachersCount: 1,
      });
      mocks.mockAdminRejectTeacher.mockRejectedValueOnce(new Error('Reject failed'));

      await expect(useApprovalStore.getState().adminRejectTeacher('t1')).rejects.toThrow('Reject failed');
      expect(useApprovalStore.getState().adminPendingTeachers).toHaveLength(1);
      expect(useApprovalStore.getState().adminPendingTeachersCount).toBe(1);
    });
  });
});
