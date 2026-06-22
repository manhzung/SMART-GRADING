import { create } from 'zustand';
import { apiService } from '../../core/api';
import { useAuthStore } from './authStore';

// ─── Backend Types ─────────────────────────────────────────────────────────────

export interface ExamVersionQuestion {
  position: number;
  questionId: string;
  originalPosition: number;
  shuffledOptions: Array<{ id: string; text: string; isCorrect?: boolean }>;
}

export interface ExamVersion {
  _id: string;
  examId: string;
  versionCode: string;
  numberOfQuestions: number;
  questionIds: string[];
  questions?: ExamVersionQuestion[];
  distribution: Record<string, number>;
  submissionCount: number;
  createdAt: string;
}

export interface ExamStatistics {
  totalExams: number;
  totalStudents: number;
  totalSubmissions: number;
  averageScore: number;
  submissionRate: number;
  statusBreakdown: {
    draft: number;
    published: number;
    in_progress: number;
    completed: number;
    archived: number;
  };
}

export interface ExamFilters {
  status?: string;
  classId?: string;
  subjectId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateExamPayload {
  title: string;
  description?: string;
  classIds: string[];
  primaryClassId?: string;
  subjectId?: string;
  subjectName?: string;
  omrTemplateId?: string;
  examDate?: string;
  startTime?: string;
  duration?: number;
  totalScore?: number;
  passingScore?: number;
  numberOfQuestions?: number;
  numberOfVersions?: number;
  questionIds?: string[];
  status?: 'draft' | 'published' | 'in_progress' | 'completed';
  shuffleConfig?: { shuffleQuestions: boolean; shuffleOptions: boolean };
  printConfig?: { paperSize: string; questionsPerPage: number; includeAnswerSheet: boolean };
}

export interface ClassRef {
  _id: string;
  name: string;
  code?: string;
  studentCount?: number;
}

export interface Question {
  _id: string;
  id?: string;
  content?: string;
  options?: Array<{ id: string; text: string; isCorrect?: boolean }>;
  correctAnswer?: string;
  imageUrl?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  score?: number;
  type?: string;
}

export interface Exam {
  _id: string;
  title: string;
  description?: string;
  status: 'draft' | 'published' | 'in_progress' | 'completed' | 'archived';
  classId?: string;
  classIds?: Array<ClassRef | string>;
  primaryClassId?: ClassRef | string;
  subjectId?: string | { _id: string; name: string; color?: string };
  subjectName?: string;
  subjectColor?: string;
  examDate?: string;
  date?: string;
  startTime?: string;
  duration?: number;
  totalScore?: number;
  passingScore?: number;
  numberOfQuestions?: number;
  questionIds?: (string | Question)[];
  numberOfVersions?: number;
  totalSubmissions?: number;
  totalStudents?: number;
  createdBy?: { _id: string; name: string; email?: string };
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  completedAt?: string;
  omrTemplateId?: { _id: string; name: string; code?: string };
  printConfig?: {
    paperSize?: string;
    questionsPerPage?: number;
    includeAnswerSheet?: boolean;
    schoolHeader?: boolean;
  };
  shuffleConfig?: {
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
  };
}

// ─── Store ─────────────────────────────────────────────────────────────────────

interface ExamState {
  // Legacy list state
  exams: Exam[];
  isLoading: boolean;
  error: string | null;

  // New: single exam detail
  currentExam: Exam | null;
  examVersions: ExamVersion[];
  examStatistics: ExamStatistics | null;
  isLoadingDetail: boolean;
  isPublishing: boolean;
  isCompleting: boolean;
  isGeneratingVersions: boolean;

  // Legacy methods
  fetchExams: (params?: { status?: string; classId?: string }) => Promise<void>;
  createExam: (exam: CreateExamPayload) => Promise<Exam | null>;
  updateExam: (exam: Exam) => Promise<void>;
  deleteExam: (examId: string) => Promise<void>;

  // New methods
  fetchExamById: (id: string) => Promise<void>;
  publishExam: (id: string) => Promise<void>;
  completeExam: (id: string) => Promise<void>;
  generateExamVersions: (id: string, count?: number) => Promise<void>;
  addClassesToExam: (id: string, classIds: string[]) => Promise<void>;
  removeClassesFromExam: (id: string, classIds: string[]) => Promise<void>;
  fetchExamVersions: (id: string) => Promise<void>;
  fetchExamVersionsFull: (id: string) => Promise<void>;
  exportExamPdf: (id: string) => Promise<any>;
  exportVersionPdf: (examId: string, versionCode: string) => Promise<any>;
  exportResults: (id: string, format?: string) => Promise<any>;

  // Utility
  clearCurrentExam: () => void;
  clearError: () => void;
}

export const useExamStore = create<ExamState>((set) => ({
  // Legacy
  exams: [],
  isLoading: false,
  error: null,

  // New state
  currentExam: null,
  examVersions: [],
  examStatistics: null,
  isLoadingDetail: false,
  isPublishing: false,
  isCompleting: false,
  isGeneratingVersions: false,

  // ─── Legacy Methods ────────────────────────────────────────────────────────────

  fetchExams: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const queryParams: Record<string, string | number> = { limit: 100 };
      if (params?.status) queryParams.status = params.status;
      if (params?.classId) queryParams.classId = params.classId;

      const response = await apiService.get<any>('/exams', { params: queryParams });
      const examList = response.results || response || [];

      const mappedExams = examList.map((e: any) => ({
        _id: e._id,
        title: e.title,
        description: e.description,
        status: e.status || 'draft',
        classId: e.primaryClassId?._id || e.classIds?.[0]?._id || e.classId || '',
        classIds: e.classIds || [],
        primaryClassId: e.primaryClassId,
        subjectId: e.subjectId,
        subjectName: e.subjectId?.name || '',
        subjectColor: e.subjectId?.color || '',
        examDate: e.examDate || '',
        date: e.examDate || '',
        duration: e.duration || 0,
        totalScore: e.totalScore || 10,
        numberOfQuestions: e.numberOfQuestions || e.questionIds?.length || 0,
        questionIds: e.questionIds || [],
        numberOfVersions: e.numberOfVersions || 0,
        totalSubmissions: e.totalSubmissions || 0,
        totalStudents: e.totalStudents || 0,
        createdBy: e.createdBy,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      }));

      set({ exams: mappedExams, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createExam: async (exam) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.post<any>('/exams', exam);
      set({ isLoading: false });
      return response;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  updateExam: async (exam) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.patch<any>(`/exams/${exam._id}`, exam);
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  deleteExam: async (examId) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.delete(`/exams/${examId}`);
      set((state) => ({
        exams: state.exams.filter((e) => e._id !== examId),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // ─── New Methods ───────────────────────────────────────────────────────────────

  fetchExamById: async (id) => {
    set({ isLoading: true, isLoadingDetail: true, error: null, currentExam: null });
    try {
      const response = await apiService.get<any>(`/exams/${id}`);
      set({
        currentExam: response,
        isLoading: false,
        isLoadingDetail: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false, isLoadingDetail: false });
    }
  },

  publishExam: async (id) => {
    set({ isPublishing: true, error: null });
    try {
      const response = await apiService.post<any>(`/exams/${id}/publish`);
      set((state) => ({
        currentExam: state.currentExam
          ? { ...state.currentExam, status: 'published' }
          : null,
        exams: state.exams.map((e) =>
          e._id === id ? { ...e, status: 'published' } : e
        ),
        isPublishing: false,
      }));
      return response;
    } catch (error) {
      set({ error: (error as Error).message, isPublishing: false });
      throw error;
    }
  },

  completeExam: async (id) => {
    set({ isCompleting: true, error: null });
    try {
      const response = await apiService.post<any>(`/exams/${id}/complete`);
      set((state) => ({
        currentExam: state.currentExam
          ? { ...state.currentExam, status: 'completed' }
          : null,
        exams: state.exams.map((e) =>
          e._id === id ? { ...e, status: 'completed' } : e
        ),
        isCompleting: false,
      }));
      return response;
    } catch (error) {
      set({ error: (error as Error).message, isCompleting: false });
      throw error;
    }
  },

  generateExamVersions: async (id, count = 4) => {
    set({ isGeneratingVersions: true, error: null });
    try {
      await apiService.post<any>(`/exams/${id}/versions`, {
        count: count,
      });
      // Re-fetch versions so store has full ExamVersion objects (not just string codes)
      const versionsRes = await apiService.get<any>(`/exams/${id}/versions`);
      const versions: ExamVersion[] = Array.isArray(versionsRes) ? versionsRes : (versionsRes.results || []);
      set({
        examVersions: versions,
        isGeneratingVersions: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isGeneratingVersions: false });
      throw error;
    }
  },

  addClassesToExam: async (id, classIds) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.post<any>(`/exams/${id}/classes`, {
        classIds,
      });
      set((state) => ({
        currentExam: state.currentExam
          ? { ...state.currentExam, classIds: response.classIds || state.currentExam.classIds }
          : null,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  removeClassesFromExam: async (id, classIds) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.delete(`/exams/${id}/classes`, { classIds });
      set((state) => ({
        currentExam: state.currentExam
          ? { ...state.currentExam, classIds: state.currentExam.classIds?.filter((cid) => {
              const currentId = typeof cid === 'string' ? cid : cid._id;
              return !classIds.includes(currentId);
            }) }
          : null,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  fetchExamVersions: async (id) => {
    set({ isLoadingDetail: true, error: null });
    try {
      const response = await apiService.get<any>(`/exams/${id}/versions`);
      const versions: ExamVersion[] = Array.isArray(response) ? response : (response.results || []);
      set({ examVersions: versions, isLoadingDetail: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoadingDetail: false });
    }
  },

  fetchExamVersionsFull: async (id) => {
    set({ isLoadingDetail: true, error: null });
    try {
      const [examRes, versionsRes] = await Promise.all([
        apiService.get<Exam>(`/exams/${id}`),
        apiService.get<any>(`/exams/${id}/versions`),
      ]);
      const versions: ExamVersion[] = Array.isArray(versionsRes) ? versionsRes : (versionsRes.results || []);
      set({
        currentExam: examRes,
        examVersions: versions,
        isLoadingDetail: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoadingDetail: false });
    }
  },

  exportExamPdf: async (id) => {
    const token = useAuthStore.getState().token || '';
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/exams/${id}/export?format=pdf`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Export failed' }));
      throw new Error(err.message || `Lỗi ${response.status}: Xuất đề thi thất bại`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/pdf')) {
      const text = await response.text().catch(() => '');
      throw new Error(`Server trả về không phải PDF: ${contentType || 'unknown'} — ${text.slice(0, 100)}`);
    }

    const blob = await response.blob();
    if (blob.size === 0) throw new Error('File PDF rỗng (0 bytes)');
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `exam.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  },

  exportVersionPdf: async (examId, versionCode) => {
    const token = useAuthStore.getState().token || '';
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/exams/${examId}/versions/${versionCode}/pdf`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Export failed' }));
      throw new Error(err.message || `Lỗi ${response.status}: Xuất phiên bản đề thi thất bại`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/pdf')) {
      const text = await response.text().catch(() => '');
      throw new Error(`Server trả về không phải PDF: ${contentType || 'unknown'} — ${text.slice(0, 100)}`);
    }

    const blob = await response.blob();
    if (blob.size === 0) throw new Error('File PDF rỗng (0 bytes)');
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `exam_version_${versionCode}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  },

  exportResults: async (id, format = 'pdf') => {
    const token = useAuthStore.getState().token || '';
    const endpoint = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/exams/${id}/results/export?format=${format}`;
    const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Export failed' }));
      throw new Error(err.message || `Lỗi ${response.status}: Xuất kết quả thất bại`);
    }

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (isJson) {
      // Excel: backend returns JSON with results array
      const data = await response.json();
      await import('../features/reports/examReportExport').then(m => {
        const wb = XLSX.utils.book_new();
        const rows = [
          ['STT', 'Họ tên', 'Mã HS', 'Điểm', 'Trạng thái', 'Ngày nộp'],
        ];
        (data.results || []).forEach((r, i) => {
          rows.push([
            i + 1,
            r.studentName || '—',
            r.studentCode || '—',
            r.score ?? 0,
            r.status === 'graded' ? 'Đạt' : r.status === 'reviewed' ? 'Đã duyệt' : 'Chưa chấm',
            r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('vi-VN') : '—',
          ]);
        });
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Ket qua');
        XLSX.writeFile(wb, `KetQua_${id}_${Date.now()}.xlsx`);
      });
      return;
    }

    if (!contentType.includes('application/pdf')) {
      const text = await response.text().catch(() => '');
      throw new Error(`Server trả về không phải PDF: ${contentType || 'unknown'} — ${text.slice(0, 100)}`);
    }

    const blob = await response.blob();
    if (blob.size === 0) throw new Error('File PDF rỗng (0 bytes)');
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `KetQua_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  },

  // ─── Utility ──────────────────────────────────────────────────────────────────

  clearCurrentExam: () => set({ currentExam: null, examVersions: [] }),
  clearError: () => set({ error: null }),
}));
