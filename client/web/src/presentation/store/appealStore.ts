import { create } from 'zustand';
import { apiService } from '../../core/api';

// Backend Types
export interface BackendAppeal {
  _id: string;
  submissionId: string;
  examId: { _id: string; title: string } | string;
  studentId: { _id: string; name: string; studentCode?: string } | string;
  questionId: { _id: string; content: string } | string;
  questionPosition: number;
  reason: string;
  evidenceImageUrl?: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  teacherResponse?: {
    reviewedBy: { _id: string; name: string } | string;
    reviewedAt: string;
    decision: 'approved' | 'rejected';
    note?: string;
    scoreAdjustment?: { oldScore: number; newScore: number };
  };
  studentNotified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppealFilters {
  status?: string;
  examId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ReviewPayload {
  decision: 'approved' | 'rejected';
  note?: string;
  newScore?: number;
  oldScore?: number;
}

export interface AppealStats {
  total: number;
  pending: number;
  reviewing: number;
  approved: number;
  rejected: number;
}

interface AppealState {
  appeals: BackendAppeal[];
  currentAppeal: BackendAppeal | null;
  stats: AppealStats;
  isLoading: boolean;
  isLoadingDetail: boolean;
  isReviewing: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: AppealFilters;

  fetchAppeals: (filters?: AppealFilters) => Promise<void>;
  fetchAppealById: (id: string) => Promise<void>;
  reviewAppeal: (id: string, data: ReviewPayload) => Promise<void>;
  setFilters: (filters: Partial<AppealFilters>) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  clearError: () => void;
  clearCurrentAppeal: () => void;
}

export const useAppealStore = create<AppealState>((set, get) => ({
  appeals: [],
  currentAppeal: null,
  stats: { total: 0, pending: 0, reviewing: 0, approved: 0, rejected: 0 },
  isLoading: false,
  isLoadingDetail: false,
  isReviewing: false,
  error: null,
  pagination: { page: 1, limit: 10, total: 0, pages: 0 },
  filters: {},

  fetchAppeals: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const params: Record<string, string | number> = {};
      const currentFilters = filters || get().filters;
      
      if (currentFilters.status && currentFilters.status !== 'all') {
        params.status = currentFilters.status;
      }
      if (currentFilters.examId && currentFilters.examId !== 'all') {
        params.examId = currentFilters.examId;
      }
      if (currentFilters.page) params.page = currentFilters.page;
      if (currentFilters.limit) params.limit = currentFilters.limit;

      const response = await apiService.get<{
        results: BackendAppeal[];
        page: number;
        limit: number;
        total: number;
        pages: number;
      }>('/appeals', { params });

      const results = response.results || [];

      const stats: AppealStats = {
        total: response.total || results.length,
        pending: results.filter(a => a.status === 'pending').length,
        reviewing: results.filter(a => a.status === 'under_review').length,
        approved: results.filter(a => a.status === 'approved').length,
        rejected: results.filter(a => a.status === 'rejected').length,
      };

      set({
        appeals: results,
        stats,
        pagination: {
          page: response.page || 1,
          limit: response.limit || 10,
          total: response.total || results.length,
          pages: response.pages || 1,
        },
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchAppealById: async (id) => {
    set({ isLoadingDetail: true, error: null, currentAppeal: null });
    try {
      const response = await apiService.get<BackendAppeal>(`/appeals/${id}`);
      set({ currentAppeal: response, isLoadingDetail: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoadingDetail: false });
    }
  },

  reviewAppeal: async (id, data) => {
    set({ isReviewing: true, error: null });
    try {
      await apiService.post(`/appeals/${id}/review`, data);
      set({ isReviewing: false });
      set((state) => ({
        appeals: state.appeals.map((a) =>
          a._id === id
            ? {
                ...a,
                status: data.decision,
                teacherResponse: {
                  reviewedBy: 'system',
                  reviewedAt: new Date().toISOString(),
                  decision: data.decision,
                  note: data.note,
                  scoreAdjustment: data.newScore !== undefined
                    ? { oldScore: data.oldScore || 0, newScore: data.newScore }
                    : undefined,
                },
              }
            : a
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message, isReviewing: false });
      throw error;
    }
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  setPage: (page) => {
    set((state) => ({
      pagination: { ...state.pagination, page },
      filters: { ...state.filters, page },
    }));
  },

  setPageSize: (size) => {
    set((state) => ({
      pagination: { ...state.pagination, limit: size, page: 1 },
      filters: { ...state.filters, limit: size, page: 1 },
    }));
  },

  clearError: () => set({ error: null }),
  clearCurrentAppeal: () => set({ currentAppeal: null }),
}));
