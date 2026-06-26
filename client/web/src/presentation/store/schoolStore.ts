import { create } from 'zustand';
import { apiService } from '../../core/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SchoolClass {
  _id: string;
  name: string;
  code: string;
  gradeLevel?: number;
  schoolId?: string;
  studentCount?: number;
  createdAt?: string;
}

export interface Student {
  _id: string;
  name: string;
  email: string;
  studentCode?: string;
  classId?: string;
  className?: string;
  schoolId?: string;
  createdAt?: string;
}

export interface SchoolStats {
  totalClasses: number;
  totalStudents: number;
  totalQuestions: number;
  totalExams: number;
}

export interface PaginatedResult<T> {
  results: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface SchoolState {
  // Classes
  classes: SchoolClass[];
  classesPagination: { page: number; total: number; pages: number };
  classesLoading: boolean;
  classesError: string | null;

  // Students
  students: Student[];
  studentsPagination: { page: number; total: number; pages: number };
  studentsLoading: boolean;
  studentsError: string | null;

  // Stats
  stats: SchoolStats | null;
  statsLoading: boolean;
  statsError: string | null;

  // Actions - Classes
  fetchClasses: (params?: { search?: string; schoolId?: string; page?: number; limit?: number }) => Promise<void>;
  createClass: (data: Partial<SchoolClass>) => Promise<SchoolClass>;
  updateClass: (id: string, data: Partial<SchoolClass>) => Promise<SchoolClass>;
  deleteClass: (id: string) => Promise<void>;

  // Actions - Students
  fetchStudents: (params?: { search?: string; classId?: string; schoolId?: string; page?: number; limit?: number }) => Promise<void>;
  createStudent: (data: Partial<Student>) => Promise<Student>;
  updateStudent: (id: string, data: Partial<Student>) => Promise<Student>;
  deleteStudent: (id: string) => Promise<void>;

  // Actions - Stats
  fetchStats: (schoolId?: string) => Promise<void>;

  // Utility
  clearErrors: () => void;
}

export const useSchoolStore = create<SchoolState>((set, get) => ({
  // Initial state - Classes
  classes: [],
  classesPagination: { page: 1, total: 0, pages: 0 },
  classesLoading: false,
  classesError: null,

  // Initial state - Students
  students: [],
  studentsPagination: { page: 1, total: 0, pages: 0 },
  studentsLoading: false,
  studentsError: null,

  // Initial state - Stats
  stats: null,
  statsLoading: false,
  statsError: null,

  // ── Classes ────────────────────────────────────────────────────────────────

  fetchClasses: async (params = {}) => {
    set({ classesLoading: true, classesError: null });
    try {
      const { page = 1, limit = 10, search, schoolId } = params;
      const query: Record<string, string | number> = { page, limit };
      if (search) query['search'] = search;
      if (schoolId) query['schoolId'] = schoolId;
      const res = await apiService.get<PaginatedResult<SchoolClass>>('/classes', { params: query });
      set({
        classes: res.results,
        classesPagination: { page: res.page, total: res.total, pages: res.pages },
        classesLoading: false,
      });
    } catch (err: any) {
      set({ classesError: err.message || 'Failed to load classes', classesLoading: false });
    }
  },

  createClass: async (data) => {
    const schoolClass = await apiService.post<SchoolClass>('/classes', data);
    const { classes, classesPagination } = get();
    set({
      classes: [schoolClass, ...classes],
      classesPagination: { ...classesPagination, total: classesPagination.total + 1 },
    });
    return schoolClass;
  },

  updateClass: async (id, data) => {
    const schoolClass = await apiService.patch<SchoolClass>(`/classes/${id}`, data);
    const { classes } = get();
    set({ classes: classes.map((c) => (c._id === id ? schoolClass : c)) });
    return schoolClass;
  },

  deleteClass: async (id) => {
    await apiService.delete(`/classes/${id}`);
    const { classes, classesPagination } = get();
    set({
      classes: classes.filter((c) => c._id !== id),
      classesPagination: { ...classesPagination, total: Math.max(0, classesPagination.total - 1) },
    });
  },

  // ── Students ─────────────────────────────────────────────────────────────

  fetchStudents: async (params = {}) => {
    set({ studentsLoading: true, studentsError: null });
    try {
      const { page = 1, limit = 10, search, classId, schoolId } = params;
      const query: Record<string, string | number> = { page, limit };
      if (search) query['search'] = search;
      if (classId) query['classId'] = classId;
      if (schoolId) query['schoolId'] = schoolId;
      const res = await apiService.get<PaginatedResult<Student>>('/users', { params: query });
      set({
        students: res.results,
        studentsPagination: { page: res.page, total: res.total, pages: res.pages },
        studentsLoading: false,
      });
    } catch (err: any) {
      set({ studentsError: err.message || 'Failed to load students', studentsLoading: false });
    }
  },

  createStudent: async (data) => {
    const student = await apiService.post<Student>('/users', data);
    const { students, studentsPagination } = get();
    set({
      students: [student, ...students],
      studentsPagination: { ...studentsPagination, total: studentsPagination.total + 1 },
    });
    return student;
  },

  updateStudent: async (id, data) => {
    const student = await apiService.patch<Student>(`/users/${id}`, data);
    const { students } = get();
    set({ students: students.map((s) => (s._id === id ? student : s)) });
    return student;
  },

  deleteStudent: async (id) => {
    await apiService.delete(`/users/${id}`);
    const { students, studentsPagination } = get();
    set({
      students: students.filter((s) => s._id !== id),
      studentsPagination: { ...studentsPagination, total: Math.max(0, studentsPagination.total - 1) },
    });
  },

  // ── Stats ─────────────────────────────────────────────────────────────────

  fetchStats: async (schoolId) => {
    set({ statsLoading: true, statsError: null });
    try {
      const [classesRes, studentsRes, questionsRes, examsRes] = await Promise.allSettled([
        apiService.get<PaginatedResult<SchoolClass>>('/classes', { params: { limit: 1, ...(schoolId ? { schoolId } : {}) } }),
        apiService.get<PaginatedResult<Student>>('/users', { params: { limit: 1, role: 'student', ...(schoolId ? { schoolId } : {}) } }),
        apiService.get<PaginatedResult<any>>('/questions', { params: { limit: 1, ...(schoolId ? { schoolId } : {}) } }),
        apiService.get<PaginatedResult<any>>('/exams', { params: { limit: 1, ...(schoolId ? { schoolId } : {}) } }),
      ]);
      set({
        stats: {
          totalClasses: classesRes.status === 'fulfilled' ? classesRes.value.total : 0,
          totalStudents: studentsRes.status === 'fulfilled' ? studentsRes.value.total : 0,
          totalQuestions: questionsRes.status === 'fulfilled' ? questionsRes.value.total : 0,
          totalExams: examsRes.status === 'fulfilled' ? examsRes.value.total : 0,
        },
        statsLoading: false,
      });
    } catch (err: any) {
      set({ statsError: err.message || 'Failed to load stats', statsLoading: false });
    }
  },

  // ── Utility ──────────────────────────────────────────────────────────────

  clearErrors: () => set({ classesError: null, studentsError: null, statsError: null }),
}));
