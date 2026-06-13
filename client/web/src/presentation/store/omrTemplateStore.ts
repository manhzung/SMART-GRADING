import { create } from 'zustand';
import { apiService } from '../../core/api';

// ─── OMR Template Types ──────────────────────────────────────────────────────────

export interface OMRTemplate {
  _id: string;
  name: string;
  code: string;
  description?: string;
  numberOfQuestions: number;
  bubblesPerRow?: number;
  hasNameField?: boolean;
  hasStudentCodeField?: boolean;
  hasSubjectField?: boolean;
  hasDateField?: boolean;
  createdAt?: string;
}

// ─── Store State & Actions ──────────────────────────────────────────────────────

interface OMRTemplateState {
  templates: OMRTemplate[];
  isLoading: boolean;
  error: string | null;
  fetchTemplates: () => Promise<void>;
  clearError: () => void;
}

// ─── Store Implementation ────────────────────────────────────────────────────────

export const useOMRTemplateStore = create<OMRTemplateState>((set) => ({
  templates: [],
  isLoading: false,
  error: null,

  fetchTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get<{ results: OMRTemplate[] } | OMRTemplate[]>(
        '/omr-templates'
      );
      const list = Array.isArray(response) 
        ? response 
        : (response.results || []);
      set({ templates: list, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
