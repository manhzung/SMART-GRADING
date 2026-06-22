import { create } from 'zustand';
import { apiService } from '../../core/api';
import type { AppealStatus } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StudentSubmission {
  _id: string;
  examId: {
    _id: string;
    title: string;
    examDate?: string;
    duration?: number;
    subjectName?: string | null;
    subjectColor?: string | null;
  };
  totalScore: number;
  maxScore: number;
  status: 'pending' | 'scanning' | 'scanned' | 'manual_review' | 'completed' | 'appealed';
  answers?: Array<{
    position: number;
    questionId: string;
    selectedAnswer?: string;
    correctAnswer: string;
    isCorrect: boolean;
    score: number;
  }>;
  createdAt: string;
  submittedAt?: string;
}

export interface StudentExamAppeal {
  _id: string;
  submissionId: string;
  examId: { _id: string; title: string } | string;
  examTitle: string;
  questionPosition: number;
  questionContent: string;
  reason: string;
  status: AppealStatus;
  teacherResponse?: {
    reviewedBy: string;
    reviewedAt: string;
    decision: 'approved' | 'rejected';
    note?: string;
    scoreAdjustment?: { oldScore: number; newScore: number };
  };
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface StudentState {
  // Submissions
  submissions: StudentSubmission[];
  isLoadingSubmissions: boolean;
  submissionsError: string | null;
  submissionsPagination: Pagination;

  // Appeals
  appeals: StudentExamAppeal[];
  isLoadingAppeals: boolean;
  appealsError: string | null;
  appealsPagination: Pagination;

  // Submission-specific appeals (modal in MyScores)
  submissionAppeals: StudentExamAppeal[];
  isLoadingSubmissionAppeals: boolean;

  // Actions
  fetchSubmissions: (filters?: { status?: string; page?: number; limit?: number; startDate?: string; endDate?: string }) => Promise<void>;
  fetchAppeals: (filters?: {
    status?: string;
    submissionId?: string;
    examId?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  fetchSubmissionAppeals: (submissionId: string) => Promise<void>;
  clearError: () => void;
  clearSubmissionAppeals: () => void;
}

const mapAppeal = (a: any): StudentExamAppeal => ({
  _id: a._id,
  submissionId: a.submissionId,
  examId: a.examId,
  examTitle: typeof a.examId === 'object' && a.examId ? a.examId.title : '',
  questionPosition: a.questionPosition,
  questionContent: typeof a.questionId === 'object' && a.questionId ? a.questionId.content : '',
  reason: a.reason,
  status: a.status,
  teacherResponse: a.teacherResponse,
  createdAt: a.createdAt,
});

export const useStudentStore = create<StudentState>((set) => ({
  submissions: [],
  isLoadingSubmissions: false,
  submissionsError: null,
  submissionsPagination: { page: 1, limit: 10, total: 0, pages: 1 },

  appeals: [],
  isLoadingAppeals: false,
  appealsError: null,
  appealsPagination: { page: 1, limit: 10, total: 0, pages: 1 },

  submissionAppeals: [],
  isLoadingSubmissionAppeals: false,

  fetchSubmissions: async (filters) => {
    set({ isLoadingSubmissions: true, submissionsError: null });
    try {
      const params: Record<string, string | number> = {};
      if (filters?.status && filters.status !== 'all') params.status = filters.status;
      if (filters?.page) params.page = filters.page;
      if (filters?.limit) params.limit = filters.limit;
      if (filters?.startDate) params.startDate = filters.startDate;
      if (filters?.endDate) params.endDate = filters.endDate;

      const response = await apiService.get<{
        results: StudentSubmission[];
        page: number;
        limit: number;
        total: number;
        pages: number;
      }>('/submissions/me', { params });

      const results = response.results || [];
      set({
        submissions: results,
        submissionsPagination: {
          page: response.page || 1,
          limit: response.limit || 10,
          total: response.total || results.length,
          pages: response.pages || 1,
        },
        isLoadingSubmissions: false,
      });
    } catch (error) {
      set({
        submissionsError: (error as Error).message,
        isLoadingSubmissions: false,
      });
    }
  },

  fetchAppeals: async (filters) => {
    set({ isLoadingAppeals: true, appealsError: null });
    try {
      const params: Record<string, string | number> = {};
      if (filters?.status && filters.status !== 'all') params.status = filters.status;
      if (filters?.submissionId) params.submissionId = filters.submissionId;
      if (filters?.examId && filters.examId !== 'all') params.examId = filters.examId;
      if (filters?.page) params.page = filters.page;
      if (filters?.limit) params.limit = filters.limit;
      if (filters?.startDate) params.startDate = filters.startDate;
      if (filters?.endDate) params.endDate = filters.endDate;

      const response = await apiService.get<{
        results: any[];
        page: number;
        limit: number;
        total: number;
        pages: number;
      }>('/appeals/me', { params });

      const results = (response.results || []).map(mapAppeal);
      set({
        appeals: results,
        appealsPagination: {
          page: response.page || 1,
          limit: response.limit || 10,
          total: response.total || results.length,
          pages: response.pages || 1,
        },
        isLoadingAppeals: false,
      });
    } catch (error) {
      set({
        appealsError: (error as Error).message,
        isLoadingAppeals: false,
      });
    }
  },

  fetchSubmissionAppeals: async (submissionId) => {
    set({ isLoadingSubmissionAppeals: true });
    try {
      const response = await apiService.get<{ results: any[] }>(
        `/appeals/me?submissionId=${submissionId}`
      );
      set({
        submissionAppeals: (response.results || []).map(mapAppeal),
        isLoadingSubmissionAppeals: false,
      });
    } catch {
      set({ submissionAppeals: [], isLoadingSubmissionAppeals: false });
    }
  },

  clearError: () => set({ submissionsError: null, appealsError: null }),
  clearSubmissionAppeals: () => set({ submissionAppeals: [] }),
}));
