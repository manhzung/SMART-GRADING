import { create } from 'zustand';
import approvalService from '../../services/approval.service';

interface PendingQuestion {
  id: string;
  _id: string;
  content: string;
  type: 'single_choice' | 'multiple_choice';
  difficulty: 'easy' | 'medium' | 'hard';
  createdBy?: { _id: string; name: string };
  createdAt: string;
  options?: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
  }>;
  score?: number;
  tags?: string[];
}

interface PendingTeacher {
  id: string;
  _id: string;
  name: string;
  email: string;
  registeredSchoolId?: string;
  createdAt: string;
  role?: string;
}

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

  // Admin teacher approval state (NEW)
  adminPendingTeachers: PendingTeacher[];
  adminPendingTeachersCount: number;
  isLoadingAdminTeachers: boolean;

  // Actions
  fetchPendingQuestions: () => Promise<void>;
  fetchPendingTeachers: () => Promise<void>;
  approveQuestion: (questionId: string) => Promise<void>;
  rejectQuestion: (questionId: string, reason?: string) => Promise<void>;
  approveTeacher: (userId: string) => Promise<void>;
  rejectTeacher: (userId: string, reason?: string) => Promise<void>;

  // Admin teacher approval actions (NEW)
  fetchAdminPendingTeachers: (schoolId: string) => Promise<void>;
  adminApproveTeacher: (userId: string) => Promise<void>;
  adminRejectTeacher: (userId: string, reason?: string) => Promise<void>;

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

  // Admin teacher approval state (NEW)
  adminPendingTeachers: [],
  adminPendingTeachersCount: 0,
  isLoadingAdminTeachers: false,

  // Admin teacher approval actions (NEW) ─────────────────────────────────────────

  fetchAdminPendingTeachers: async (schoolId: string) => {
    set({ isLoadingAdminTeachers: true, error: null });
    try {
      const data = await approvalService.getAdminPendingTeachers({ schoolId, limit: 100 });
      set({
        adminPendingTeachers: data.results,
        adminPendingTeachersCount: data.total,
        isLoadingAdminTeachers: false,
      });
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to fetch pending teachers for school',
        isLoadingAdminTeachers: false,
      });
    }
  },

  adminApproveTeacher: async (userId: string) => {
    try {
      await approvalService.adminApproveTeacher(userId);
      const filtered = get().adminPendingTeachers.filter(
        (t) => t.id !== userId && t._id !== userId
      );
      set({
        adminPendingTeachers: filtered,
        adminPendingTeachersCount: get().adminPendingTeachersCount - 1,
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to approve teacher' });
      throw err;
    }
  },

  adminRejectTeacher: async (userId: string, reason?: string) => {
    try {
      await approvalService.adminRejectTeacher(userId, reason);
      const filtered = get().adminPendingTeachers.filter(
        (t) => t.id !== userId && t._id !== userId
      );
      set({
        adminPendingTeachers: filtered,
        adminPendingTeachersCount: get().adminPendingTeachersCount - 1,
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to reject teacher' });
      throw err;
    }
  },

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
