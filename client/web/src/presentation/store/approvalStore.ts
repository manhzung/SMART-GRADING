import { create } from 'zustand';
import approvalService, { PendingQuestion, PendingTeacher } from '../../services/approval.service';

interface ApprovalState {
  // State
  pendingQuestions: PendingQuestion[];
  pendingTeachers: PendingTeacher[];
  isLoadingQuestions: boolean;
  isLoadingTeachers: boolean;
  error: string | null;

  // Counts (for badges)
  pendingQuestionsCount: number;
  pendingTeachersCount: number;

  // Actions
  fetchPendingQuestions: () => Promise<void>;
  fetchPendingTeachers: () => Promise<void>;
  approveQuestion: (questionId: string) => Promise<void>;
  rejectQuestion: (questionId: string, reason?: string) => Promise<void>;
  approveTeacher: (userId: string) => Promise<void>;
  rejectTeacher: (userId: string, reason?: string) => Promise<void>;
  clearError: () => void;
}

export const useApprovalStore = create<ApprovalState>((set, get) => ({
  pendingQuestions: [],
  pendingTeachers: [],
  isLoadingQuestions: false,
  isLoadingTeachers: false,
  error: null,
  pendingQuestionsCount: 0,
  pendingTeachersCount: 0,

  fetchPendingQuestions: async () => {
    set({ isLoadingQuestions: true, error: null });
    try {
      const data = await approvalService.getPendingQuestions({ limit: 100 });
      set({
        pendingQuestions: data.results,
        pendingQuestionsCount: data.total,
        isLoadingQuestions: false,
      });
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to fetch pending questions',
        isLoadingQuestions: false,
      });
    }
  },

  fetchPendingTeachers: async () => {
    set({ isLoadingTeachers: true, error: null });
    try {
      const data = await approvalService.getPendingTeachers({ limit: 100 });
      set({
        pendingTeachers: data.results,
        pendingTeachersCount: data.total,
        isLoadingTeachers: false,
      });
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to fetch pending teachers',
        isLoadingTeachers: false,
      });
    }
  },

  approveQuestion: async (questionId: string) => {
    try {
      await approvalService.approveQuestion(questionId);
      const filtered = get().pendingQuestions.filter(
        (q) => q.id !== questionId && q._id !== questionId
      );
      set({
        pendingQuestions: filtered,
        pendingQuestionsCount: get().pendingQuestionsCount - 1,
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to approve question' });
      throw err;
    }
  },

  rejectQuestion: async (questionId: string, reason?: string) => {
    try {
      await approvalService.rejectQuestion(questionId, reason);
      const filtered = get().pendingQuestions.filter(
        (q) => q.id !== questionId && q._id !== questionId
      );
      set({
        pendingQuestions: filtered,
        pendingQuestionsCount: get().pendingQuestionsCount - 1,
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to reject question' });
      throw err;
    }
  },

  approveTeacher: async (userId: string) => {
    try {
      await approvalService.approveTeacher(userId);
      const filtered = get().pendingTeachers.filter(
        (t) => t.id !== userId && t._id !== userId
      );
      set({
        pendingTeachers: filtered,
        pendingTeachersCount: get().pendingTeachersCount - 1,
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to approve teacher' });
      throw err;
    }
  },

  rejectTeacher: async (userId: string, reason?: string) => {
    try {
      await approvalService.rejectTeacher(userId, reason);
      const filtered = get().pendingTeachers.filter(
        (t) => t.id !== userId && t._id !== userId
      );
      set({
        pendingTeachers: filtered,
        pendingTeachersCount: get().pendingTeachersCount - 1,
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to reject teacher' });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
