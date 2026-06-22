import { create } from 'zustand';
import { apiService } from '../../core/api';

// ─── Backend Types ────────────────────────────────────────────────────────────

export interface BackendSubmission {
  _id: string;
  examId: string;
  studentId: {
    _id: string;
    name: string;
    email: string;
  };
  classId: string;
  versionCode: string;
  answers: Record<string, string>;
  score?: number;
  status: 'submitted' | 'graded' | 'reviewed';
  submittedAt: string;
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
  maxScore: number;
  totalScore: number;
  percentage: number;
  createdAt: string;
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
  answers: Record<string, string>;
  score?: number;
  status: 'submitted' | 'graded' | 'reviewed';
  submittedAt: string;
  gradedAt?: string;
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface SubmissionState {
  submissions: BackendSubmission[];
  statistics: SubmissionStatistics | null;
  isLoading: boolean;
  isLoadingStats: boolean;
  error: string | null;
  fetchByExam: (examId: string) => Promise<void>;
  fetchStatistics: (examId: string) => Promise<void>;
  deleteSubmission: (id: string) => Promise<void>;
  clearSubmissions: () => void;
  clearError: () => void;
}

export const useSubmissionStore = create<SubmissionState>((set) => ({
  submissions: [],
  statistics: null,
  isLoading: false,
  isLoadingStats: false,
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
  clearError: () => set({ error: null }),
}));
