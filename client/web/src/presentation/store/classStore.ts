import { create } from 'zustand';
import { apiService } from '../../core/api';
import { classService } from './dashboardStore';
import type { ClassItem } from './dashboardStore';
import { useAuthStore } from './authStore';

export type { ClassItem };

export interface TeacherItem {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface SubjectTeacherItem {
  subjectId?: { _id: string; name: string; code: string; color: string } | string;
  teacherId: { _id: string; name: string; email: string } | string;
  addedAt?: string;
}

export interface ClassStatistics {
  attendanceRate: number;
  averageScore: number;
  totalStudents: number;
  activeExams: number;
  completedAssignments: number;
  totalAssignments: number;
  upcomingExams: number;
  nextExam?: { title: string; daysUntil: number } | null;
  [key: string]: unknown;
}

interface PaginatedTeachers {
  results: TeacherItem[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ClassState {
  classes: ClassItem[];
  teachers: TeacherItem[];
  isLoading: boolean;
  error: string | null;
  currentClass: ClassItem | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  fetchClasses: (params?: {
    academicYear?: string;
    gradeLevel?: number;
    page?: number;
    limit?: number;
  }) => Promise<void>;
  fetchClassById: (id: string) => Promise<void>;
  createClass: (classData: Partial<ClassItem>) => Promise<ClassItem>;
  updateClass: (id: string, data: Partial<ClassItem>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  fetchTeachers: () => Promise<void>;
  importStudents: (id: string, students: Array<{ name: string; email: string; studentCode?: string; phone?: string }>) => Promise<any>;
  manageSubjectTeachers: (classId: string, action: 'add' | 'remove', teacherId: string, subjectId?: string) => Promise<void>;
  transferHomeroomTeacher: (classId: string, currentTeacherId: string, newTeacherId: string) => Promise<void>;
  getClassStatistics: (classId: string) => Promise<ClassStatistics>;
  // Class ↔ Exam management
  classExams: { _id: string; title: string; status: string; examDate?: string; duration?: number; numberOfQuestions?: number }[];
  isLoadingClassExams: boolean;
  fetchClassExams: (classId: string) => Promise<void>;
  assignExamsToClass: (classId: string, examIds: string[]) => Promise<{ assigned: string[]; failed: { examId: string; error: string }[] }>;
  removeExamFromClass: (classId: string, examId: string) => Promise<void>;
  clearError: () => void;
}

export const useClassStore = create<ClassState>((set, get) => ({
  classes: [],
  teachers: [],
  isLoading: false,
  error: null,
  currentClass: null,
  classExams: [],
  isLoadingClassExams: false,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },

  fetchClasses: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      const role = user?.role || 'teacher';
      const schoolId = user?.schoolId;

      let response;
      if (role === 'admin') {
        // Admin can view all classes, or scope to a school when schoolId is set
        response = schoolId
          ? await classService.getBySchool(schoolId, params, user)
          : await classService.getAll(params);
      } else {
        // school-admin and teacher are always scoped to their school
        if (!schoolId) {
          throw new Error('Missing school context for your role');
        }
        response = await classService.getBySchool(schoolId, params, user);
      }

      set({
        classes: response.results || [],
        pagination: {
          page: response.page || 1,
          limit: response.limit || 20,
          total: response.total || 0,
          pages: response.pages || 0,
        },
        isLoading: false,
      });
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to fetch classes',
        isLoading: false,
      });
    }
  },

  fetchClassById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const classData = await classService.getById(id);
      set({ currentClass: classData, isLoading: false });
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to fetch class details',
        isLoading: false,
      });
    }
  },

  createClass: async (classData) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      const schoolId = user?.schoolId || '6a17f0091743766eb47a09ce'; // Fallback to database default seed
      
      const payload = {
        ...classData,
        schoolId,
      };
      
      const created = await apiService.post<ClassItem>('/classes', payload);
      
      // Refresh the classes list
      const { fetchClasses, pagination } = get();
      await fetchClasses({ page: pagination.page, limit: pagination.limit });
      
      set({ isLoading: false });
      return created;
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to create class',
        isLoading: false,
      });
      throw error;
    }
  },

  updateClass: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      // Filter out fields that shouldn't be sent in update payload:
      // - code: immutable after creation (unique constraint: schoolId + code + academicYear)
      // - schoolId: should not be changed after creation
      const { code, schoolId, ...safePayload } = data;
      const updated = await apiService.patch<ClassItem>(`/classes/${id}`, safePayload);
      
      const { classes, currentClass } = get();
      set({
        classes: classes.map((c) => (c._id === id ? { ...c, ...updated } : c)),
        currentClass: currentClass?._id === id ? { ...currentClass, ...updated } : currentClass,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to update class',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteClass: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.delete(`/classes/${id}`);
      
      const { classes } = get();
      set({
        classes: classes.filter((c) => c._id !== id),
        isLoading: false,
      });
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to delete class',
        isLoading: false,
      });
      throw error;
    }
  },

  fetchTeachers: async () => {
    try {
      const user = useAuthStore.getState().user;
      const schoolId = user?.schoolId;
      if (!schoolId) {
        set({ teachers: [] });
        return;
      }
      const params: Record<string, string | number> = { limit: 100 };
      const response = await apiService.get<PaginatedTeachers>(
        `/schools/${schoolId}/available-teachers`,
        { params }
      );
      set({ teachers: response.results || [] });
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    }
  },

  importStudents: async (id, students) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiService.post(`/classes/${id}/students/import`, { students });
      set({ isLoading: false });
      return result;
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to import students',
        isLoading: false,
      });
      throw error;
    }
  },

  manageSubjectTeachers: async (classId, action, teacherId, subjectId) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.patch(`/classes/${classId}/subject-teachers`, {
        action,
        teacherId,
        subjectId: subjectId || null,
      });
      await get().fetchClassById(classId);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to manage subject teacher',
        isLoading: false,
      });
      throw error;
    }
  },

  transferHomeroomTeacher: async (classId, currentTeacherId, newTeacherId) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.patch(`/classes/${classId}/transfer-ownership`, {
        currentTeacherId,
        newTeacherId: newTeacherId || null,
      });
      await get().fetchClassById(classId);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to transfer homeroom teacher',
        isLoading: false,
      });
      throw error;
    }
  },

  getClassStatistics: async (classId) => {
    const response = await apiService.get<ClassStatistics>(`/classes/${classId}/statistics`);
    return response;
  },

  // ── Class ↔ Exam management ─────────────────────────────────────────────────
  fetchClassExams: async (classId) => {
    set({ isLoadingClassExams: true, error: null });
    try {
      const response = await apiService.get<any[]>(`/classes/${classId}/exams`);
      set({ classExams: response || [], isLoadingClassExams: false });
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to fetch class exams',
        isLoadingClassExams: false,
      });
    }
  },

  assignExamsToClass: async (classId, examIds) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiService.post<{ assigned: string[]; failed: { examId: string; error: string }[] }>(
        `/classes/${classId}/exams`,
        { examIds }
      );
      // Refresh class exams after assignment
      await get().fetchClassExams(classId);
      set({ isLoading: false });
      return result;
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to assign exams',
        isLoading: false,
      });
      throw error;
    }
  },

  removeExamFromClass: async (classId, examId) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.delete(`/classes/${classId}/exams/${examId}`);
      // Update local state immediately
      set((state) => ({
        classExams: state.classExams.filter((e) => e._id !== examId),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to remove exam from class',
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
