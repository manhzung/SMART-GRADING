import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { bankService, type BankSummary, type BankMember, type QuestionBank } from '../../services/bankService';

interface BankState {
  banks: BankSummary[];
  currentBank: QuestionBank | null;
  currentMembership: { role: 'owner' | 'manager' | 'viewer'; status: 'active' | 'pending' } | null;
  members: BankMember[];
  pendingRequests: BankMember[];
  isLoading: boolean;
  error: string | null;
  lastSelectedBankId: string | null;

  fetchBanks: () => Promise<void>;
  fetchBank: (bankId: string) => Promise<void>;
  fetchMembers: (bankId: string) => Promise<void>;
  fetchPendingRequests: (bankId: string) => Promise<void>;
  createBank: (data: { name: string; description?: string; type?: 'personal' | 'school'; schoolId?: string }) => Promise<QuestionBank>;
  setCurrentBank: (bankId: string | null) => void;
  inviteMember: (bankId: string, userId: string) => Promise<void>;
  updateMemberRole: (bankId: string, userId: string, role: 'manager' | 'viewer') => Promise<void>;
  removeMember: (bankId: string, userId: string) => Promise<void>;
  leaveBank: (bankId: string) => Promise<void>;
  requestAccess: (bankId: string) => Promise<void>;
  respondToRequest: (bankId: string, userId: string, decision: 'approve' | 'reject') => Promise<void>;
  transferOwnership: (bankId: string, toUserId: string) => Promise<void>;
  clearError: () => void;
}

export const useBankStore = create<BankState>()(
  persist(
    (set, get) => ({
      banks: [],
      currentBank: null,
      currentMembership: null,
      members: [],
      pendingRequests: [],
      isLoading: false,
      error: null,
      lastSelectedBankId: null,

  clearError: () => set({ error: null }),

  fetchBanks: async () => {
    set({ isLoading: true, error: null });
    try {
      console.log('[BankStore] Calling listBanks...');
      const banks = await bankService.listBanks();
      console.log('[BankStore] listBanks response:', banks);
      console.log('[BankStore] Is array?', Array.isArray(banks));
      const summaries: BankSummary[] = (Array.isArray(banks) ? banks : []).map((bank) => ({
        bank,
        membership: null,
      }));
      set({ banks: summaries, isLoading: false });
    } catch (err) {
      console.error('[BankStore] fetchBanks error:', err);
      set({ error: (err as Error).message || 'Failed to load banks', isLoading: false });
    }
  },

  fetchBank: async (bankId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await bankService.getBank(bankId);
      console.log('[BankStore] getBank response:', res);
      set({
        currentBank: res.bank,
        currentMembership: res.membership
          ? { role: res.membership.role, status: res.membership.status }
          : null,
        isLoading: false,
      });
      console.log('[BankStore] currentMembership set to:', res.membership);
    } catch (err) {
      set({ error: (err as Error).message || 'Failed to load bank', isLoading: false });
      console.error('[BankStore] getBank error:', err);
    }
  },

  fetchMembers: async (bankId) => {
    set({ error: null });
    try {
      const res = await bankService.listMembers(bankId, 'active');
      set({ members: res.results || [] });
    } catch (err) {
      set({ error: (err as Error).message || 'Failed to load members' });
    }
  },

  fetchPendingRequests: async (bankId) => {
    try {
      const res = await bankService.listPendingRequests(bankId);
      set({ pendingRequests: res.results || [] });
    } catch (err) {
      set({ error: (err as Error).message || 'Failed to load pending requests' });
    }
  },

  createBank: async (data) => {
    set({ error: null });
    try {
      const bank = await bankService.createBank(data);
      await get().fetchBanks();
      return bank;
    } catch (err) {
      set({ error: (err as Error).message || 'Failed to create bank' });
      throw err;
    }
  },

  setCurrentBank: (bankId) => {
    if (!bankId) {
      set({ currentBank: null, currentMembership: null, members: [], pendingRequests: [] });
      return;
    }
    void get().fetchBank(bankId);
    void get().fetchMembers(bankId);
    void get().fetchPendingRequests(bankId);
  },

  inviteMember: async (bankId, userId) => {
    set({ error: null });
    try {
      await bankService.inviteMember(bankId, userId);
      await get().fetchPendingRequests(bankId);
    } catch (err) {
      set({ error: (err as Error).message || 'Failed to invite member' });
      throw err;
    }
  },

  updateMemberRole: async (bankId, userId, role) => {
    set({ error: null });
    try {
      await bankService.updateMemberRole(bankId, userId, role);
      await get().fetchMembers(bankId);
    } catch (err) {
      set({ error: (err as Error).message || 'Failed to update role' });
      throw err;
    }
  },

  removeMember: async (bankId, userId) => {
    set({ error: null });
    try {
      await bankService.removeMember(bankId, userId);
      await get().fetchMembers(bankId);
    } catch (err) {
      set({ error: (err as Error).message || 'Failed to remove member' });
      throw err;
    }
  },

  leaveBank: async (bankId) => {
    set({ error: null });
    try {
      await bankService.leaveBank(bankId);
      set({ currentBank: null, currentMembership: null, members: [], pendingRequests: [] });
      await get().fetchBanks();
    } catch (err) {
      set({ error: (err as Error).message || 'Failed to leave bank' });
      throw err;
    }
  },

  requestAccess: async (bankId) => {
    set({ error: null });
    try {
      await bankService.requestAccess(bankId);
    } catch (err) {
      set({ error: (err as Error).message || 'Failed to request access' });
      throw err;
    }
  },

  respondToRequest: async (bankId, userId, decision) => {
    set({ error: null });
    try {
      await bankService.respondToRequest(bankId, userId, decision);
      await get().fetchPendingRequests(bankId);
      await get().fetchMembers(bankId);
    } catch (err) {
      set({ error: (err as Error).message || 'Failed to respond to request' });
      throw err;
    }
  },

  transferOwnership: async (bankId, toUserId) => {
    set({ error: null });
    try {
      await bankService.transferOwnership(bankId, toUserId);
      await get().fetchBank(bankId);
      await get().fetchMembers(bankId);
    } catch (err) {
      set({ error: (err as Error).message || 'Failed to transfer ownership' });
      throw err;
    }
  },
}),
    {
      name: 'bank-storage',
      partialize: (state) => ({ lastSelectedBankId: state.lastSelectedBankId }),
    }
  )
);