import { create } from 'zustand';
import { apiService } from '../../core/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface School {
  _id: string;
  id?: string;
  name: string;
  code: string;
  type: string;
  address?: string;
  phone?: string;
  email?: string;
  principal?: string;
  gradingScale?: number;
  passingScore?: number;
  gradeLevels?: { min: number; max: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUser {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: 'admin' | 'school-admin' | 'teacher' | 'student' | 'parent';
  phone?: string;
  schoolId?: string;
  schoolName?: string;
  classId?: string;
  className?: string;
  studentCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminStats {
  totalSchools: number;
  schoolsGrowth: number;
  totalUsers: number;
  usersGrowth: number;
  totalClasses: number;
  classesGrowth: number;
  totalSubmissions: number;
  submissionsToday: number;
}

export interface PaginatedResult<T> {
  results: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface AdminState {
  schools: School[];
  schoolsPagination: { page: number; total: number; pages: number };
  schoolsLoading: boolean;
  schoolsError: string | null;

  users: AdminUser[];
  usersPagination: { page: number; total: number; pages: number };
  usersLoading: boolean;
  usersError: string | null;

  stats: AdminStats | null;
  statsLoading: boolean;
  statsError: string | null;

  classes: { _id: string; name: string; code: string }[];
  classesLoading: boolean;

  schoolsList: School[];
  schoolsListLoading: boolean;

  fetchSchools: (params?: { search?: string; type?: string; page?: number; limit?: number }) => Promise<void>;
  createSchool: (data: Partial<School>) => Promise<School>;
  updateSchool: (id: string, data: Partial<School>) => Promise<School>;
  deleteSchool: (id: string) => Promise<void>;

  fetchUsers: (params?: { search?: string; role?: string; schoolId?: string; page?: number; limit?: number }) => Promise<void>;
  createUser: (data: Record<string, string>) => Promise<AdminUser>;
  updateUser: (id: string, data: Record<string, string>) => Promise<AdminUser>;
  deleteUser: (id: string) => Promise<void>;

  fetchStats: (schoolId?: string) => Promise<void>;

  fetchClasses: (schoolId?: string) => Promise<void>;

  fetchSchoolsList: (params?: { limit?: number }) => Promise<void>;

  clearErrors: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  schools: [],
  schoolsPagination: { page: 1, total: 0, pages: 0 },
  schoolsLoading: false,
  schoolsError: null,
  users: [],
  usersPagination: { page: 1, total: 0, pages: 0 },
  usersLoading: false,
  usersError: null,
  stats: null,
  statsLoading: false,
  statsError: null,
  classes: [],
  classesLoading: false,
  schoolsList: [],
  schoolsListLoading: false,

  // ── Schools ──────────────────────────────────────────────────────────────

  fetchSchools: async (params = {}) => {
    set({ schoolsLoading: true, schoolsError: null });
    try {
      const { page = 1, limit = 10, search, type } = params;
      const query: Record<string, string | number> = { page, limit };
      if (search) query['search'] = search;
      if (type) query['type'] = type;
      const res = await apiService.get<PaginatedResult<School>>('/schools', { params: query });
      set({
        schools: res.results,
        schoolsPagination: { page: res.page, total: res.total, pages: res.pages },
        schoolsLoading: false,
      });
    } catch (err: any) {
      set({ schoolsError: err.message || 'Failed to load schools', schoolsLoading: false });
    }
  },

  createSchool: async (data) => {
    const school = await apiService.post<School>('/schools', data);
    const { schools, schoolsPagination } = get();
    set({
      schools: [school, ...schools],
      schoolsPagination: { ...schoolsPagination, total: schoolsPagination.total + 1 },
    });
    return school;
  },

  updateSchool: async (id, data) => {
    const school = await apiService.patch<School>(`/schools/${id}`, data);
    const { schools } = get();
    set({ schools: schools.map((s) => ((s._id || s.id) === id ? school : s)) });
    return school;
  },

  deleteSchool: async (id) => {
    await apiService.delete(`/schools/${id}`);
    const { schools, schoolsPagination } = get();
    set({
      schools: schools.filter((s) => (s._id || s.id) !== id),
      schoolsPagination: { ...schoolsPagination, total: Math.max(0, schoolsPagination.total - 1) },
    });
  },

  // ── Users ───────────────────────────────────────────────────────────────

  fetchUsers: async (params = {}) => {
    set({ usersLoading: true, usersError: null });
    try {
      const { page = 1, limit = 10, search, role, schoolId } = params;
      const query: Record<string, string | number> = { page, limit };
      if (search) query['search'] = search;
      if (role) query['role'] = role;
      if (schoolId) query['schoolId'] = schoolId;
      const res = await apiService.get<PaginatedResult<AdminUser>>('/users', { params: query });
      set({
        users: res.results,
        usersPagination: { page: res.page, total: res.total, pages: res.pages },
        usersLoading: false,
      });
    } catch (err: any) {
      set({ usersError: err.message || 'Failed to load users', usersLoading: false });
    }
  },

  createUser: async (data) => {
    const user = await apiService.post<AdminUser>('/users', data);
    const { users, usersPagination } = get();
    set({
      users: [user, ...users],
      usersPagination: { ...usersPagination, total: usersPagination.total + 1 },
    });
    return user;
  },

  updateUser: async (id, data) => {
    const user = await apiService.patch<AdminUser>(`/users/${id}`, data);
    const { users } = get();
    set({ users: users.map((u) => ((u._id || u.id) === id ? user : u)) });
    return user;
  },

  deleteUser: async (id) => {
    await apiService.delete(`/users/${id}`);
    const { users, usersPagination } = get();
    set({
      users: users.filter((u) => (u._id || u.id) !== id),
      usersPagination: { ...usersPagination, total: Math.max(0, usersPagination.total - 1) },
    });
  },

  // ── Stats ───────────────────────────────────────────────────────────────

  fetchStats: async (schoolId) => {
    set({ statsLoading: true, statsError: null });
    try {
      const [schoolsRes, usersRes, classesRes, submissionsRes] = await Promise.allSettled([
        apiService.get<PaginatedResult<School>>('/schools', { params: { limit: 1 } }),
        apiService.get<PaginatedResult<AdminUser>>('/users', { params: { limit: 1, ...(schoolId ? { schoolId } : {}) } }),
        apiService.get<PaginatedResult<any>>('/classes', { params: { limit: 1, ...(schoolId ? { schoolId } : {}) } }),
        apiService.get<PaginatedResult<any>>('/submissions', { params: { limit: 1, ...(schoolId ? { schoolId } : {}) } }),
      ]);
      const totalSchools = schoolsRes.status === 'fulfilled' ? schoolsRes.value.total : 0;
      const totalUsers = usersRes.status === 'fulfilled' ? usersRes.value.total : 0;
      const totalClasses = classesRes.status === 'fulfilled' ? classesRes.value.total : 0;
      const totalSubmissions = submissionsRes.status === 'fulfilled' ? submissionsRes.value.total : 0;
      set({
        stats: {
          totalSchools, schoolsGrowth: 0,
          totalUsers, usersGrowth: 0,
          totalClasses, classesGrowth: 0,
          totalSubmissions, submissionsToday: 0,
        },
        statsLoading: false,
      });
    } catch (err: any) {
      set({ statsError: err.message || 'Failed to load stats', statsLoading: false });
    }
  },

  // ── Classes (dropdown) ─────────────────────────────────────────────────

  fetchClasses: async (schoolId) => {
    set({ classesLoading: true });
    try {
      const params: Record<string, string | number> = { limit: 500 };
      if (schoolId) params['schoolId'] = schoolId;
      const res = await apiService.get<PaginatedResult<{ _id: string; name: string; code: string }>>('/classes', { params });
      set({ classes: res.results, classesLoading: false });
    } catch {
      set({ classes: [], classesLoading: false });
    }
  },

  // ── Schools list (for user form dropdown) ──────────────────────────────

  fetchSchoolsList: async (params = {}) => {
    set({ schoolsListLoading: true });
    try {
      const res = await apiService.get<PaginatedResult<School>>('/schools', { params: { limit: params.limit || 500 } });
      set({ schoolsList: res.results, schoolsListLoading: false });
    } catch {
      set({ schoolsList: [], schoolsListLoading: false });
    }
  },

  clearErrors: () => set({ schoolsError: null, usersError: null, statsError: null }),
}));
