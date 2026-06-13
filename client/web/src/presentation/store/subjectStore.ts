import { create } from 'zustand';
import { apiService } from '../../core/api';
import type { Subject } from '../../types';

interface SubjectState {
  subjects: Subject[];
  isLoading: boolean;
  error: string | null;
  fetchSubjects: () => Promise<void>;
  clearError: () => void;
}

export const useSubjectStore = create<SubjectState>((set) => ({
  subjects: [],
  isLoading: false,
  error: null,

  fetchSubjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get<{
        results?: Subject[];
        data?: Subject[];
      }>('/subjects', { params: { limit: 100 } });
      const results = response.results || response.data || [];
      set({ subjects: results, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
