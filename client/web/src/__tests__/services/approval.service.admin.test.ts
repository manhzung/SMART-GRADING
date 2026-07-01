import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../core/api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import approvalService from '../../services/approval.service';
import { apiService } from '../../core/api';

describe('approvalService — admin teacher approval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAdminPendingTeachers', () => {
    it('calls GET /users/admin/teachers/pending with schoolId param', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        results: [],
        page: 1,
        limit: 10,
        total: 0,
        pages: 0,
      });
      await approvalService.getAdminPendingTeachers({ schoolId: 'school123' });
      expect(apiService.get).toHaveBeenCalledWith('/users/admin/teachers/pending', {
        params: { schoolId: 'school123' },
      });
    });

    it('passes pagination params when provided', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        results: [],
        page: 2,
        limit: 20,
        total: 0,
        pages: 0,
      });
      await approvalService.getAdminPendingTeachers({ schoolId: 'school123', page: 2, limit: 20 });
      expect(apiService.get).toHaveBeenCalledWith('/users/admin/teachers/pending', {
        params: { schoolId: 'school123', page: 2, limit: 20 },
      });
    });

    it('returns the response data with correct shape', async () => {
      const mockResponse = {
        results: [
          { _id: 't1', id: 't1', name: 'Teacher A', email: 'a@b.com', registeredSchoolId: 'school123', createdAt: '2026-01-01' },
        ],
        page: 1,
        limit: 100,
        total: 1,
        pages: 1,
      };
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);
      const result = await approvalService.getAdminPendingTeachers({ schoolId: 'school123' });
      expect(result.results).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('throws error when API call fails', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));
      await expect(approvalService.getAdminPendingTeachers({ schoolId: 'school123' }))
        .rejects.toThrow('Network error');
    });
  });

  describe('adminApproveTeacher', () => {
    it('calls POST /users/admin/teachers/:userId/approve', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ _id: 't1', registrationStatus: 'approved' });
      await approvalService.adminApproveTeacher('teacher123');
      expect(apiService.post).toHaveBeenCalledWith('/users/admin/teachers/teacher123/approve');
    });

    it('returns the updated user object', async () => {
      const mockUser = { _id: 't1', name: 'Teacher A', registrationStatus: 'approved' };
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockUser);
      const result = await approvalService.adminApproveTeacher('teacher123');
      expect(result.registrationStatus).toBe('approved');
    });

    it('throws error when API call fails', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Server error'));
      await expect(approvalService.adminApproveTeacher('teacher123'))
        .rejects.toThrow('Server error');
    });
  });

  describe('adminRejectTeacher', () => {
    it('calls POST /users/admin/teachers/:userId/reject with reason', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ _id: 't1', registrationStatus: 'rejected' });
      await approvalService.adminRejectTeacher('teacher123', 'Không đủ điều kiện');
      expect(apiService.post).toHaveBeenCalledWith('/users/admin/teachers/teacher123/reject', {
        reason: 'Không đủ điều kiện',
      });
    });

    it('calls POST without reason when not provided', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ _id: 't1', registrationStatus: 'rejected' });
      await approvalService.adminRejectTeacher('teacher123');
      expect(apiService.post).toHaveBeenCalledWith('/users/admin/teachers/teacher123/reject', {
        reason: undefined,
      });
    });

    it('throws error when API call fails', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Server error'));
      await expect(approvalService.adminRejectTeacher('teacher123', 'reason'))
        .rejects.toThrow('Server error');
    });
  });
});
