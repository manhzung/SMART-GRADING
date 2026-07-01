import { apiService } from '../core/api';
import type { User, Question } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PendingQuestion {
  id: string;
  _id: string;
  content: string;
  type: 'single_choice' | 'multiple_choice';
  difficulty: 'easy' | 'medium' | 'hard';
  createdBy?: { _id: string; name: string };
  createdAt: string;
  options?: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
  }>;
  score?: number;
  tags?: string[];
}

export interface PendingTeacher {
  id: string;
  _id: string;
  name: string;
  email: string;
  registeredSchoolId?: string;
  createdAt: string;
  role?: string;
}

export interface ApprovalResponse<T> {
  results: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ─── Service ───────────────────────────────────────────────────────────────────

const approvalService = {
  // ── Questions ────────────────────────────────────────────────────────────────

  getPendingQuestions: async (params?: {
    page?: number;
    limit?: number;
    schoolId?: string;
  }): Promise<ApprovalResponse<PendingQuestion>> => {
    const response = await apiService.get<ApprovalResponse<PendingQuestion>>('/questions', {
      params: { ...params, isApproved: false } as Record<string, string | number>,
    });
    return response;
  },

  approveQuestion: async (questionId: string): Promise<Question> => {
    const response = await apiService.post<Question>(`/questions/${questionId}/approve`);
    return response;
  },

  rejectQuestion: async (questionId: string, reason?: string): Promise<Question> => {
    const response = await apiService.post<Question>(`/questions/${questionId}/reject`, { reason });
    return response;
  },

  // ── Teachers ────────────────────────────────────────────────────────────────

  getPendingTeachers: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<ApprovalResponse<PendingTeacher>> => {
    const response = await apiService.get<ApprovalResponse<PendingTeacher>>('/users/teachers/pending', {
      params,
    });
    return response;
  },

  approveTeacher: async (userId: string): Promise<User> => {
    const response = await apiService.post<User>(`/users/${userId}/approve`);
    return response;
  },

  rejectTeacher: async (userId: string, reason?: string): Promise<User> => {
    const response = await apiService.post<User>(`/users/${userId}/reject`, { reason });
    return response;
  },

  // ── Admin Teachers (for system admin in SchoolDetailModal) ─────────────────────

  getAdminPendingTeachers: async (params: {
    schoolId: string;
    page?: number;
    limit?: number;
  }): Promise<ApprovalResponse<PendingTeacher>> => {
    const response = await apiService.get<ApprovalResponse<PendingTeacher>>(
      '/users/admin/teachers/pending',
      { params }
    );
    return response;
  },

  adminApproveTeacher: async (userId: string): Promise<User> => {
    const response = await apiService.post<User>(`/users/admin/teachers/${userId}/approve`);
    return response;
  },

  adminRejectTeacher: async (userId: string, reason?: string): Promise<User> => {
    const response = await apiService.post<User>(
      `/users/admin/teachers/${userId}/reject`,
      { reason }
    );
    return response;
  },
};

export default approvalService;
