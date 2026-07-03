import { create } from 'zustand';
import { apiService } from '../../core/api';

// ─── Backend Types ────────────────────────────────────────────────────────────

export interface BackendStudent {
  _id: string;
  name: string;
  email: string;
  studentCode?: string;
}

export interface BackendExam {
  _id: string;
  title: string;
  examDate?: string;
  duration?: string;
}

export interface BackendClass {
  _id: string;
  name: string;
}

export interface BackendVersion {
  _id: string;
  versionCode: string;
}

export interface BackendSubmission {
  _id: string;
  examId: BackendExam | string;
  studentId: BackendStudent | string;
  classId: BackendClass | string;
  versionId?: BackendVersion | string;
  versionCode?: string;
  answers: Array<{
    position: number;
    selectedAnswer: string | null;
    isCorrect: boolean;
    score: number;
    maxScore: number;
  }> | Record<string, string | null>;
  score?: number;
  totalScore?: number;
  maxScore?: number;
  percentage?: number;
  status: 'scanned' | 'completed' | 'manual_review' | 'appealed' | 'pending' | 'graded' | 'reviewed' | 'submitted';
  submittedAt?: string;
  createdAt: string;
  gradedAt?: string;
  gradingResult?: {
    score: number;
    totalQuestions: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    answerKey: Record<string, string>;
    studentAnswers: Record<string, string>;
  };
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  updatedAt: string;
}

export interface SubmissionStatistics {
  totalSubmissions: number;
  totalStudents: number;
  submissionRate: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate?: number;
  gradeDistribution: {
    grade: string;
    count: number;
    percentage: number;
  }[];
  scoreHistogram: {
    range: string;
    count: number;
  }[];
}

// ─── Frontend UI Types ────────────────────────────────────────────────────────

export interface Submission {
  _id: string;
  examId: string;
  studentName: string;
  studentEmail: string;
  className: string;
  versionCode: string;
  answers: Array<{
    position: number;
    selectedAnswer: string | null;
    isCorrect: boolean;
    score: number;
    maxScore: number;
  }>;
  score?: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  status: 'scanned' | 'completed' | 'manual_review' | 'appealed';
  submittedAt: string;
  gradedAt?: string;
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface SubmissionState {
  submissions: BackendSubmission[];
  statistics: SubmissionStatistics | null;
  currentSubmission: BackendSubmission | null;
  isLoading: boolean;
  isLoadingStats: boolean;
  isLoadingDetail: boolean;
  isSubmitting: boolean;
  error: string | null;
  fetchByExam: (examId: string) => Promise<void>;
  fetchStatistics: (examId: string) => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  updateSubmission: (id: string, answers?: Record<string, string>, versionId?: string) => Promise<void>;
  createSubmission: (data: CreateSubmissionPayload) => Promise<BackendSubmission>;
  deleteSubmission: (id: string) => Promise<void>;
  clearSubmissions: () => void;
  clearCurrentSubmission: () => void;
  clearError: () => void;
}

export interface CreateSubmissionPayload {
  examId: string;
  versionCode?: string;
  studentCode: string;
  classId?: string;
  answers: Record<string, string>;
  totalScore?: number;
  maxScore?: number;
}

export const useSubmissionStore = create<SubmissionState>((set) => ({
  submissions: [],
  statistics: null,
  currentSubmission: null,
  isLoading: false,
  isLoadingStats: false,
  isLoadingDetail: false,
  isSubmitting: false,
  error: null,

  fetchByExam: async (examId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get<{ results: BackendSubmission[] }>(
        `/submissions/exam/${examId}`
      );
      const data = response.results || response;
      set({
        submissions: Array.isArray(data) ? data : [],
        isLoading: false,
      });
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to fetch submissions',
        isLoading: false,
      });
    }
  },

  fetchStatistics: async (examId: string) => {
    set({ isLoadingStats: true, error: null });
    try {
      const response = await apiService.get<SubmissionStatistics>(
        `/submissions/exam/${examId}/statistics`
      );
      set({ statistics: response, isLoadingStats: false });
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to fetch statistics',
        isLoadingStats: false,
      });
    }
  },

  fetchById: async (id: string) => {
    set({ isLoadingDetail: true, error: null });
    try {
      const response = await apiService.get<BackendSubmission>(`/submissions/${id}`);
      set({ currentSubmission: response, isLoadingDetail: false });
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to fetch submission',
        isLoadingDetail: false,
      });
    }
  },

  updateSubmission: async (id: string, answers?: Record<string, string>, versionId?: string) => {
    set({ isSubmitting: true, error: null });
    try {
      await apiService.patch(`/submissions/${id}/answers`, { answers, versionId });
      const response = await apiService.get<BackendSubmission>(`/submissions/${id}`);
      set((state) => ({
        currentSubmission: response,
        submissions: state.submissions.map((s) => (s._id === id ? response : s)),
        isSubmitting: false,
      }));
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to update submission',
        isSubmitting: false,
      });
      throw error;
    }
  },

  createSubmission: async (data: CreateSubmissionPayload) => {
    set({ isSubmitting: true, error: null });
    try {
      const response = await apiService.post<BackendSubmission>('/submissions', data);
      set((state) => ({
        submissions: [response, ...state.submissions],
        isSubmitting: false,
      }));
      return response;
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to create submission',
        isSubmitting: false,
      });
      throw error;
    }
  },

  deleteSubmission: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.delete(`/submissions/${id}`);
      set((state) => ({
        submissions: state.submissions.filter((s) => s._id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to delete submission',
        isLoading: false,
      });
      throw error;
    }
  },

  clearSubmissions: () => set({ submissions: [], statistics: null }),
  clearCurrentSubmission: () => set({ currentSubmission: null }),
  clearError: () => set({ error: null }),
}));
