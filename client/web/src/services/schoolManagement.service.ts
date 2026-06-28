import { apiService } from '../core/api';
import type { School } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PendingSchool {
  id: string;
  _id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    ward?: string;
    district?: string;
    city?: string;
  };
  createdAt: string;
}

export interface SchoolAdmin {
  id: string;
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ─── Service ───────────────────────────────────────────────────────────────────

const schoolManagementService = {
  // ── Schools ─────────────────────────────────────────────────────────────────

  getAllSchools: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<School>> => {
    const response = await apiService.get<PaginatedResponse<School>>('/schools', { params });
    return response;
  },

  getPendingSchools: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<PendingSchool>> => {
    const response = await apiService.get<PaginatedResponse<PendingSchool>>('/schools/pending', {
      params,
    });
    return response;
  },

  getSchoolById: async (schoolId: string): Promise<School> => {
    const response = await apiService.get<School>(`/schools/${schoolId}`);
    return response;
  },

  createSchool: async (data: Partial<School>): Promise<School> => {
    const response = await apiService.post<School>('/schools', data);
    return response;
  },

  updateSchool: async (schoolId: string, data: Partial<School>): Promise<School> => {
    const response = await apiService.patch<School>(`/schools/${schoolId}`, data);
    return response;
  },

  deleteSchool: async (schoolId: string): Promise<void> => {
    await apiService.delete(`/schools/${schoolId}`);
  },

  approveSchool: async (schoolId: string): Promise<School> => {
    const response = await apiService.post<School>(`/schools/${schoolId}/approve`);
    return response;
  },

  rejectSchool: async (schoolId: string, reason?: string): Promise<School> => {
    const response = await apiService.post<School>(`/schools/${schoolId}/reject`, { reason });
    return response;
  },

  // ── School Admins ───────────────────────────────────────────────────────────

  getSchoolAdmins: async (
    schoolId: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResponse<SchoolAdmin>> => {
    const response = await apiService.get<PaginatedResponse<SchoolAdmin>>(
      `/users/school-admin/${schoolId}`,
      { params }
    );
    return response;
  },

  addSchoolAdmin: async (schoolId: string, userId: string): Promise<SchoolAdmin> => {
    const response = await apiService.post<SchoolAdmin>(`/users/school-admin/${schoolId}`, {
      userId,
    });
    return response;
  },

  removeSchoolAdmin: async (schoolId: string, userId: string): Promise<void> => {
    await apiService.delete(`/users/school-admin/${schoolId}/${userId}`);
  },
};

export default schoolManagementService;
