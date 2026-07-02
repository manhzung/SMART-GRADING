import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockListBanks: vi.fn(),
  mockGetBank: vi.fn(),
  mockListMembers: vi.fn(),
  mockListPendingRequests: vi.fn(),
  mockCreateBank: vi.fn(),
  mockInviteMember: vi.fn(),
  mockUpdateMemberRole: vi.fn(),
  mockRemoveMember: vi.fn(),
  mockLeaveBank: vi.fn(),
  mockRequestAccess: vi.fn(),
  mockRespondToRequest: vi.fn(),
  mockTransferOwnership: vi.fn(),
}));

vi.mock('../../services/bankService', () => ({
  bankService: {
    listBanks: mocks.mockListBanks,
    getBank: mocks.mockGetBank,
    listMembers: mocks.mockListMembers,
    listPendingRequests: mocks.mockListPendingRequests,
    createBank: mocks.mockCreateBank,
    inviteMember: mocks.mockInviteMember,
    updateMemberRole: mocks.mockUpdateMemberRole,
    removeMember: mocks.mockRemoveMember,
    leaveBank: mocks.mockLeaveBank,
    requestAccess: mocks.mockRequestAccess,
    respondToRequest: mocks.mockRespondToRequest,
    transferOwnership: mocks.mockTransferOwnership,
  },
  notificationService: {
    getUnreadCount: vi.fn(),
    list: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

import { useBankStore } from '../../presentation/store/bankStore';

describe('bankStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchBanks populates banks list', async () => {
    mocks.mockListBanks.mockResolvedValueOnce({
      results: [{ bank: { _id: 'b1', name: 'Bank 1' }, membership: { role: 'owner', status: 'active' } }],
    });

    await useBankStore.getState().fetchBanks();

    expect(useBankStore.getState().banks).toHaveLength(1);
    expect(useBankStore.getState().banks[0].bank._id).toBe('b1');
    expect(useBankStore.getState().isLoading).toBe(false);
  });

  it('fetchBank sets currentBank and currentMembership', async () => {
    mocks.mockGetBank.mockResolvedValueOnce({
      bank: { _id: 'b1', name: 'Bank 1' },
      membership: { _id: 'm1', role: 'manager', status: 'active' },
    });

    await useBankStore.getState().fetchBank('b1');

    expect(useBankStore.getState().currentBank?._id).toBe('b1');
    expect(useBankStore.getState().currentMembership?.role).toBe('manager');
  });

  it('createBank refreshes banks list after creation', async () => {
    mocks.mockCreateBank.mockResolvedValueOnce({ _id: 'b2', name: 'New Bank' });
    mocks.mockListBanks.mockResolvedValueOnce({
      results: [{ bank: { _id: 'b2', name: 'New Bank' }, membership: null }],
    });

    const created = await useBankStore.getState().createBank({ name: 'New Bank' });

    expect(created._id).toBe('b2');
    expect(mocks.mockListBanks).toHaveBeenCalled();
    expect(useBankStore.getState().banks).toHaveLength(1);
  });

  it('respondToRequest refreshes pending and members', async () => {
    mocks.mockListMembers.mockResolvedValueOnce({ results: [{ _id: 'm1', userId: 'u1' }] });
    mocks.mockListPendingRequests.mockResolvedValueOnce({ results: [] });
    mocks.mockRespondToRequest.mockResolvedValueOnce({ status: 'rejected' });

    await useBankStore.getState().fetchMembers('b1');
    await useBankStore.getState().fetchPendingRequests('b1');
    expect(useBankStore.getState().members).toHaveLength(1);

    await useBankStore.getState().respondToRequest('b1', 'u1', 'approve');

    expect(mocks.mockRespondToRequest).toHaveBeenCalledWith('b1', 'u1', 'approve');
    expect(mocks.mockListPendingRequests).toHaveBeenCalledTimes(2);
  });

  it('leaveBank clears current bank and refetches banks', async () => {
    mocks.mockGetBank.mockResolvedValueOnce({
      bank: { _id: 'b1', name: 'Bank 1' },
      membership: { _id: 'm1', role: 'viewer', status: 'active' },
    });
    mocks.mockLeaveBank.mockResolvedValueOnce(undefined);
    mocks.mockListBanks.mockResolvedValueOnce({ results: [] });

    await useBankStore.getState().fetchBank('b1');
    expect(useBankStore.getState().currentBank?._id).toBe('b1');

    await useBankStore.getState().leaveBank('b1');

    expect(useBankStore.getState().currentBank).toBeNull();
    expect(useBankStore.getState().currentMembership).toBeNull();
    expect(mocks.mockListBanks).toHaveBeenCalled();
  });

  it('setCurrentBank clears state when null', () => {
    useBankStore.setState({
      currentBank: { _id: 'b1', name: 'Test', type: 'personal' as const } as never,
      currentMembership: { role: 'owner' as const, status: 'active' as const },
    });
    useBankStore.getState().setCurrentBank(null);
    expect(useBankStore.getState().currentBank).toBeNull();
    expect(useBankStore.getState().currentMembership).toBeNull();
  });
});