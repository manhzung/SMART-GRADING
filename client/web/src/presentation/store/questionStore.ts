import { create } from 'zustand';
import { apiService } from '../../core/api';

// ─── Backend API Types ──────────────────────────────────────────────────────────

interface BackendOption {
  id: 'A' | 'B' | 'C' | 'D';
  content: string;
  isCorrect?: boolean;
  order?: number;
}

export interface BackendQuestion {
  _id: string;
  id?: string;
  content: string;
  type: 'single_choice' | 'multiple_choice';
  options: BackendOption[];
  correctAnswer?: 'A' | 'B' | 'C' | 'D';
  correctAnswers?: ('A' | 'B' | 'C' | 'D')[];
  score?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  topicId?: string;
  topicName?: string;
  createdBy?: { _id: string; name: string; schoolId?: string } | string;
  schoolId?: string;
  source: 'ai' | 'manual' | 'imported';
  aiPrompt?: string;
  explanation?: string;
  imageUrl?: string;
  tags?: string[];
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  usageCount: number;
  correctRate?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Source bank info (populated from bankId)
  bankId?: { _id: string; name: string } | string;
}

// AI-generated questions (for preview, not saved yet)
export interface AiGeneratedQuestion {
  content: string;
  type: 'single_choice' | 'multiple_choice';
  options: { id: string; content: string }[];
  difficulty: string;
  topicId?: string;
  topicName?: string;
  source: 'ai';
  explanation?: string;
  tags?: string[];
}

interface PaginatedQuestions {
  results: BackendQuestion[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ─── Frontend UI Types (mapped) ─────────────────────────────────────────────────

export interface Question {
  _id: string;
  id: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  isAiGenerated: boolean;
  isPremium: boolean;
  text: string;
  formula: string;
  options: { letter: string; text: string; isCorrect?: boolean }[];
  usedInExams: number;
  successRate: number;
  explanation: string;
  isApproved: boolean;
  source: 'ai' | 'manual' | 'imported';
  tags: string[];
  score: number;
  topicId?: string;
  usageCount: number;
  correctRate?: number;
  createdAt: string;
  createdBy?: string;
  schoolId?: string;
  createdByName?: string;
  // For "Search All Banks" mode - source bank info
  bankId?: string;
  bankName?: string;
}

export interface CreateQuestionPayload {
  content: string;
  type?: 'single_choice' | 'multiple_choice';
  options: { id: 'A' | 'B' | 'C' | 'D'; content: string; isCorrect: boolean }[];
  difficulty?: 'easy' | 'medium' | 'hard';
  topicId?: string;
  explanation?: string;
  imageUrl?: string;
  tags?: string[];
  source?: 'ai' | 'manual' | 'imported';
  aiPrompt?: string;
  bankId?: string;
}

// ─── Field Mapping Helpers ──────────────────────────────────────────────────────

function mapDifficulty(d: string): 'Easy' | 'Medium' | 'Hard' {
  const map: Record<string, 'Easy' | 'Medium' | 'Hard'> = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
  };
  return map[d] ?? 'Medium';
}

export function toFrontendQuestion(bq: BackendQuestion): Question {
  const qId = bq.id || bq._id || '';
  
  // Handle bankId - can be populated object or string
  let bankId: string | undefined;
  let bankName: string | undefined;
  if (bq.bankId) {
    if (typeof bq.bankId === 'object') {
      bankId = bq.bankId._id;
      bankName = bq.bankId.name;
    } else {
      bankId = bq.bankId;
    }
  }
  
  return {
    _id: qId,
    id: qId,
    difficulty: mapDifficulty(bq.difficulty),
    isAiGenerated: bq.source === 'ai',
    isPremium: bq.isApproved === false && bq.source === 'ai',
    text: bq.content,
    formula: '',
    options: bq.options.map((o) => ({
      letter: o.id,
      text: o.content,
      isCorrect: o.isCorrect,
    })),
    usedInExams: bq.usageCount,
    successRate: bq.correctRate ?? 0,
    explanation: bq.explanation ?? '',
    isApproved: bq.isApproved,
    source: bq.source,
    tags: bq.tags ?? [],
    score: bq.score ?? 1,
    topicId: bq.topicId,
    usageCount: bq.usageCount,
    correctRate: bq.correctRate,
    createdAt: bq.createdAt,
    createdBy: typeof bq.createdBy === 'object' ? bq.createdBy._id : bq.createdBy,
    schoolId: bq.schoolId,
    createdByName: typeof bq.createdBy === 'object' ? bq.createdBy.name : undefined,
    bankId,
    bankName,
  };
}

// ─── Service Layer ─────────────────────────────────────────────────────────────

export interface BankStats {
  integrity: number;
  total: number;
  approved: number;
  pending: number;
}

export const questionService = {
  async getAll(params?: {
    topicId?: string;
    difficulty?: string;
    isApproved?: boolean;
    source?: string;
    tags?: string;
    search?: string;
    sortBy?: string;
    order?: string;
    limit?: number;
    page?: number;
    bankId?: string;
  }) {
    return apiService.get<PaginatedQuestions>('/questions', { params: { limit: 20, ...params } });
  },

  async getById(id: string) {
    return apiService.get<BackendQuestion>(`/questions/${id}`);
  },

  async getByTags(params: {
    tags: string;
    difficulty?: string;
    limit?: number;
    excludeIds?: string;
  }) {
    return apiService.get<{
      success: boolean;
      data: {
        total: number;
        byDifficulty: { easy: BackendQuestion[]; medium: BackendQuestion[]; hard: BackendQuestion[] };
        questions: BackendQuestion[];
      };
    }>('/questions/by-tags', { params });
  },

  async create(data: CreateQuestionPayload) {
    return apiService.post<BackendQuestion>('/questions', data);
  },

  async update(id: string, data: Partial<CreateQuestionPayload>) {
    return apiService.patch<BackendQuestion>(`/questions/${id}`, data);
  },

  async delete(id: string) {
    return apiService.delete(`/questions/${id}`);
  },

  async approve(id: string) {
    return apiService.post<BackendQuestion>(`/questions/${id}/approve`);
  },

  async getTags(bankId?: string): Promise<string[]> {
    const response = await apiService.get<{ tags: string[] }>('/questions/tags', {
      params: bankId ? { bankId } : undefined,
    });
    return response.tags || [];
  },

  async getBankStats(bankId?: string): Promise<BankStats> {
    const response = await apiService.get<BankStats>('/questions/stats', {
      params: bankId ? { bankId } : undefined,
    });
    return response;
  },

  /**
   * Search questions across ALL banks in the user's school.
   * Bypasses bankId scoping.
   */
  async searchAllSchool(params?: {
    topicId?: string;
    difficulty?: string;
    isApproved?: boolean;
    source?: string;
    tags?: string;
    search?: string;
    sortBy?: string;
    order?: string;
    limit?: number;
    page?: number;
  }) {
    return apiService.get<PaginatedQuestions>('/questions/school-search', { params: { limit: 20, ...params } });
  },
};

// ─── Store ─────────────────────────────────────────────────────────────────────

interface QuestionState {
  questions: Question[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  createError: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    search: string;
    difficulty: string;
    source: string;
    tags: string;
    isApproved: boolean | null;
    bankId: string | null;
  };
  availableTags: string[];
  // Questions fetched by tags (for exam creation)
  tagQuestions: Question[];
  isLoadingTagQuestions: boolean;
  fetchQuestionsByTags: (tags: string[], options?: { difficulty?: string; limit?: number; excludeIds?: string[] }) => Promise<void>;
  fetchQuestions: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    difficulty?: string;
    source?: string;
    tags?: string;
    isApproved?: boolean;
    bankId?: string;
  }) => Promise<void>;
  fetchQuestionsAllBanks: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    difficulty?: string;
    source?: string;
    tags?: string;
    isApproved?: boolean;
  }) => Promise<void>;
  createQuestion: (data: CreateQuestionPayload) => Promise<Question>;
  updateQuestion: (id: string, data: Partial<CreateQuestionPayload>) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;
  approveQuestion: (id: string) => Promise<void>;
  fetchTags: (bankId?: string) => Promise<void>;
  setFilters: (filters: Partial<Omit<QuestionState['filters'], 'bankId'>>) => void;
  clearError: () => void;
  clearCreateError: () => void;
  generateAiQuestions: (params: { topic: string; count: number; difficulty?: string; requirements?: string }) => Promise<AiGeneratedQuestion[]>;
  generateSimilarQuestions: (params: { sourceQuestionIds: string[]; count: number; difficulty?: string }) => Promise<AiGeneratedQuestion[]>;
}

export const useQuestionStore = create<QuestionState>((set, get) => ({
  questions: [],
  isLoading: false,
  isCreating: false,
  error: null,
  createError: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  filters: {
    search: '',
    difficulty: '',
    source: '',
    tags: '',
    isApproved: null,
    bankId: null,
  },
  availableTags: [],
  tagQuestions: [],
  isLoadingTagQuestions: false,

  fetchQuestionsByTags: async (tags, options = {}) => {
    set({ isLoadingTagQuestions: true });
    try {
      const response = await questionService.getByTags({
        tags: tags.join(','),
        difficulty: options.difficulty,
        limit: options.limit,
        excludeIds: options.excludeIds?.join(','),
      });

      const questions = response.data?.questions || [];
      set({
        tagQuestions: questions.map(toFrontendQuestion),
        isLoadingTagQuestions: false,
      });
    } catch (error) {
      console.error('Failed to fetch questions by tags:', error);
      set({ isLoadingTagQuestions: false });
    }
  },

  fetchQuestions: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const { filters } = get();
      const mergedParams = {
        ...filters,
        ...params,
        limit: params?.limit ?? get().pagination.limit,
        page: params?.page ?? get().pagination.page,
      };

      const sanitizedParams: Partial<typeof mergedParams> = { ...mergedParams };

      // Remove null/undefined/empty values
      Object.keys(sanitizedParams).forEach((k) => {
        const key = k as keyof typeof sanitizedParams;
        const val = sanitizedParams[key];
        if (
          val === '' ||
          val === null ||
          val === undefined
        ) {
          delete sanitizedParams[key];
        }
      });

      // Only pass isApproved if explicitly set
      if ('isApproved' in sanitizedParams && sanitizedParams.isApproved === null) {
        delete sanitizedParams.isApproved;
      }

      const response = await questionService.getAll(sanitizedParams as Parameters<typeof questionService.getAll>[0]);

      set({
        questions: response.results.map(toFrontendQuestion),
        pagination: {
          page: response.page,
          limit: response.limit,
          total: response.total,
          pages: response.pages,
        },
        isLoading: false,
      });
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to fetch questions',
        isLoading: false,
      });
    }
  },

  fetchQuestionsAllBanks: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const { filters } = get();
      const mergedParams = {
        ...filters,
        ...params,
        limit: params?.limit ?? get().pagination.limit,
        page: params?.page ?? get().pagination.page,
      };

      const sanitizedParams: Partial<typeof mergedParams> = { ...mergedParams };

      // Remove null/undefined/empty values
      Object.keys(sanitizedParams).forEach((k) => {
        const key = k as keyof typeof sanitizedParams;
        const val = sanitizedParams[key];
        if (
          val === '' ||
          val === null ||
          val === undefined
        ) {
          delete sanitizedParams[key];
        }
      });

      // Only pass isApproved if explicitly set
      if ('isApproved' in sanitizedParams && sanitizedParams.isApproved === null) {
        delete sanitizedParams.isApproved;
      }

      const response = await questionService.searchAllSchool(sanitizedParams as Parameters<typeof questionService.searchAllSchool>[0]);

      set({
        questions: response.results.map(toFrontendQuestion),
        pagination: {
          page: response.page,
          limit: response.limit,
          total: response.total,
          pages: response.pages,
        },
        isLoading: false,
      });
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to fetch questions from all banks',
        isLoading: false,
      });
    }
  },

  createQuestion: async (data) => {
    set({ isCreating: true, createError: null });
    try {
      const created = await questionService.create(data);
      const mapped = toFrontendQuestion(created);

      set((state) => ({
        questions: [mapped, ...state.questions],
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1,
        },
        isCreating: false,
      }));

      return mapped;
    } catch (error) {
      set({
        createError: (error as Error).message || 'Failed to create question',
        isCreating: false,
      });
      throw error;
    }
  },

  updateQuestion: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await questionService.update(id, data);
      const mapped = toFrontendQuestion(updated);

      set((state) => ({
        questions: state.questions.map((q) => (q._id === id ? mapped : q)),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to update question',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteQuestion: async (id) => {
    set({ error: null });
    try {
      await questionService.delete(id);

      set((state) => {
        const newQuestions = state.questions.filter((q) => q._id !== id && q.id !== id);
        const isLastQuestionOnPage = newQuestions.length === 0 && state.pagination.page > 1;

        return {
          questions: newQuestions,
          pagination: {
            ...state.pagination,
            page: isLastQuestionOnPage ? state.pagination.page - 1 : state.pagination.page,
            total: Math.max(0, state.pagination.total - 1),
          },
        };
      });
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to delete question',
      });
      throw error;
    }
  },

  approveQuestion: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await questionService.approve(id);
      const mapped = toFrontendQuestion(updated);

      set((state) => ({
        questions: state.questions.map((q) => (q._id === id ? mapped : q)),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to approve question',
        isLoading: false,
      });
      throw error;
    }
  },

  fetchTags: async (bankId?: string) => {
    try {
      const { filters } = get();
      const response = await questionService.getTags(bankId ?? filters.bankId ?? undefined);
      set({ availableTags: response });
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 },
    }));
  },

  clearError: () => set({ error: null }),
  clearCreateError: () => set({ createError: null }),

  generateAiQuestions: async (params) => {
    set({ isCreating: true, createError: null });
    try {
      const response = await apiService.post<{
        data: { questions: AiGeneratedQuestion[] }
      }>('/questions/generate', {
        requirements: params.requirements || params.topic,
        count: params.count,
        difficulty: params.difficulty || 'medium',
      });
      console.log('[generateAiQuestions] Response:', response);
      set({ isCreating: false });
      return response.data?.questions || [];
    } catch (error) {
      console.error('[generateAiQuestions] Error:', error);
      set({ createError: (error as Error).message || 'AI generation failed', isCreating: false });
      throw error;
    }
  },

  generateSimilarQuestions: async (params) => {
    set({ isCreating: true, createError: null });
    try {
      console.log('[generateSimilarQuestions] Calling API with:', params);
      const response = await apiService.post<{
        data: { questions: AiGeneratedQuestion[] }
      }>('/questions/generate-similar', {
        sourceQuestionIds: params.sourceQuestionIds,
        count: params.count,
        difficulty: params.difficulty || 'medium',
      });
      console.log('[generateSimilarQuestions] Response:', response);
      set({ isCreating: false });
      return response.data?.questions || [];
    } catch (error) {
      console.error('[generateSimilarQuestions] Error:', error);
      set({ createError: (error as Error).message || 'AI generation failed', isCreating: false });
      throw error;
    }
  },
}));
