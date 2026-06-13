import { create } from 'zustand';
import { apiService } from '../../core/api';
import { useAuthStore } from './authStore';

// ─── Type Definitions ──────────────────────────────────────────────────────────

export interface SubjectTeacherItem {
  subjectId?: {
    _id: string;
    name: string;
    code: string;
    color: string;
  } | string;
  teacherId: {
    _id: string;
    name: string;
    email: string;
  } | string;
  addedAt?: string;
}

export interface ClassItem {
  _id: string;
  name: string;
  code: string;
  gradeLevel: number;
  academicYear: string;
  schoolId?: string;
  homeroomTeacherId?: {
    _id: string;
    name: string;
    email: string;
  } | string;
  studentIds?: string[];
  subjectTeachers?: SubjectTeacherItem[];
  isActive: boolean;
  enrollmentCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassExam {
  _id: string;
  title: string;
  description?: string;
  status: 'draft' | 'published' | 'in_progress' | 'completed' | 'archived';
  examDate?: string;
  startTime?: string;
  duration?: number;
  totalScore?: number;
  passingScore?: number;
  numberOfQuestions?: number;
  questionIds?: string[];
  totalSubmissions?: number;
  totalStudents?: number;
  primaryClassId?: { _id: string; name: string; code?: string };
  classIds?: { _id: string; name: string; code?: string }[];
  omrTemplateId?: { _id: string; name: string; code?: string };
  createdBy?: { _id: string; name: string; email: string };
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  completedAt?: string;
}

export interface ExamItem {
  _id: string;
  title: string;
  description?: string;
  classIds: ClassItem[];
  primaryClassId?: ClassItem;
  subjectId?: {
    _id: string;
    name: string;
    code: string;
    color: string;
  };
  examDate: string;
  duration: number;
  totalScore: number;
  passingScore?: number;
  numberOfQuestions: number;
  status: 'draft' | 'published' | 'in_progress' | 'completed' | 'archived';
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  publishedAt?: string;
  completedAt?: string;
  totalSubmissions?: number;
  totalStudents?: number;
}

export interface SubmissionItem {
  _id: string;
  examId: string | ExamItem;
  studentId: {
    _id: string;
    name: string;
    studentCode?: string;
  };
  studentCode: string;
  totalScore: number;
  maxScore: number;
  finalScore: number;
  status: 'pending' | 'scanning' | 'scanned' | 'manual_review' | 'completed' | 'appealed';
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalClasses: number;
  totalStudents: number;
  activeExams: number;
  scoredPapers: number;
}

interface PaginatedResponse<T> {
  results: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ─── Service Layer ─────────────────────────────────────────────────────────────

export const classService = {
  async getAll(params?: { page?: number; limit?: number }) {
    return apiService.get<PaginatedResponse<ClassItem>>('/classes', { params: { limit: 100, ...params } });
  },

  async getBySchool(schoolId: string, params?: Record<string, any>) {
    return apiService.get<PaginatedResponse<ClassItem>>('/classes', { params: { schoolId, limit: 100, ...params } });
  },

  async getById(id: string) {
    return apiService.get<ClassItem>(`/classes/${id}`);
  },

  async create(data: Partial<ClassItem>) {
    return apiService.post<ClassItem>('/classes', data);
  },

  async update(id: string, data: Partial<ClassItem>) {
    return apiService.patch<ClassItem>(`/classes/${id}`, data);
  },

  async delete(id: string) {
    return apiService.delete(`/classes/${id}`);
  },
};

export const examService = {
  async getAll(params?: Record<string, any>) {
    return apiService.get<PaginatedResponse<ExamItem>>('/exams', { params: { limit: 100, ...params } });
  },

  async getById(id: string) {
    return apiService.get<ExamItem>(`/exams/${id}`);
  },

  async getUpcoming(limit = 5) {
    const now = new Date().toISOString();
    return apiService.get<PaginatedResponse<ExamItem>>('/exams', {
      params: {
        status: 'published',
        fromDate: now,
        sortBy: 'examDate',
        order: 'asc',
        limit,
      },
    });
  },
};

export const submissionService = {
  async getAll(params?: Record<string, any>) {
    return apiService.get<PaginatedResponse<SubmissionItem>>('/submissions', { params: { limit: 100, ...params } });
  },

  async getByExam(examId: string, params?: Record<string, any>) {
    return apiService.get<PaginatedResponse<SubmissionItem>>(`/submissions/exam/${examId}`, { params });
  },

  async getStatistics(examId: string) {
    return apiService.get<{
      total: number;
      avgScore: number;
      avgPercentage: number;
      maxScore: number;
      minScore: number;
      completed: number;
      pending: number;
    }>(`/submissions/exam/${examId}/statistics`);
  },
};

// ─── Dashboard Store ────────────────────────────────────────────────────────────

interface DashboardState {
  stats: DashboardStats | null;
  recentExams: ExamItem[];
  upcomingExams: ExamItem[];
  isLoading: boolean;
  error: string | null;
  fetchDashboard: () => Promise<void>;
  clearError: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  recentExams: [],
  upcomingExams: [],
  isLoading: false,
  error: null,

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      const schoolId = user?.schoolId;

      const [classesRes, examsRes, submissionsRes] = await Promise.all([
        classService.getAll({ limit: 1, ...(schoolId ? { schoolId } : {}) }),
        examService.getAll({ limit: 100 }),
        submissionService.getAll({ limit: 1 }),
      ]);

      const activeExams = examsRes.results.filter(
        (e) => e.status === 'published' || e.status === 'in_progress'
      ).length;

      const totalStudents = classesRes.results.reduce(
        (sum, c) => sum + (c.studentIds?.length || 0),
        0
      );

      const now = new Date();
      const upcoming = examsRes.results
        .filter((e) => {
          const examDate = new Date(e.examDate);
          return examDate >= now && (e.status === 'published' || e.status === 'in_progress');
        })
        .slice(0, 5);

      const scoredPapers = submissionsRes.total;

      set({
        stats: {
          totalClasses: classesRes.total,
          totalStudents,
          activeExams,
          scoredPapers,
        },
        upcomingExams: upcoming,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to load dashboard data',
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
