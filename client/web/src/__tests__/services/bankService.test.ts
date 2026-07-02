import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../core/api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { bankService, notificationService } from '../../services/bankService';
import { apiService } from '../../core/api';

describe('bankService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listBanks calls GET /banks', async () => {
    (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ results: [] });
    await bankService.listBanks();
    expect(apiService.get).toHaveBeenCalledWith('/banks');
  });

  it('createBank posts payload to /banks', async () => {
    (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ _id: 'b1' });
    await bankService.createBank({ name: 'My Bank', type: 'personal' });
    expect(apiService.post).toHaveBeenCalledWith('/banks', {
      name: 'My Bank',
      type: 'personal',
    });
  });

  it('inviteMember posts userId to /banks/:bankId/members', async () => {
    (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
    await bankService.inviteMember('b1', 'u1');
    expect(apiService.post).toHaveBeenCalledWith('/banks/b1/members', { userId: 'u1' });
  });

  it('respondToRequest posts decision to /banks/:bankId/requests/:userId/respond', async () => {
    (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ status: 'rejected' });
    await bankService.respondToRequest('b1', 'u1', 'reject');
    expect(apiService.post).toHaveBeenCalledWith('/banks/b1/requests/u1/respond', {
      decision: 'reject',
    });
  });

  it('listMembers passes status filter as query param', async () => {
    (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ results: [] });
    await bankService.listMembers('b1', 'pending');
    expect(apiService.get).toHaveBeenCalledWith('/banks/b1/members', {
      params: { status: 'pending' },
    });
  });

  it('notificationService.getUnreadCount returns count', async () => {
    (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ unreadCount: 5 });
    const res = await notificationService.getUnreadCount();
    expect(res.unreadCount).toBe(5);
    expect(apiService.get).toHaveBeenCalledWith('/notifications/unread-count');
  });
});