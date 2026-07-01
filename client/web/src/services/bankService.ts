import { apiService } from '../core/api';

export interface QuestionBank {
  _id: string;
  name: string;
  description?: string | null;
  type: 'personal' | 'school';
  schoolId?: string | null;
  createdBy: string | { _id: string; name?: string };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankMember {
  _id: string;
  bankId: string;
  userId: string | { _id: string; name: string; email?: string; role?: string };
  role: 'owner' | 'manager' | 'viewer';
  status: 'active' | 'pending';
  invitedBy?: string;
  invitedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BankSummary {
  bank: QuestionBank;
  membership: {
    role: 'owner' | 'manager' | 'viewer';
    status: 'active' | 'pending';
  } | null;
}

export const bankService = {
  listBanks: () =>
    apiService.get<QuestionBank[]>('/banks'),

  createBank: (data: {
    name: string;
    description?: string;
    type?: 'personal' | 'school';
    schoolId?: string;
  }) => apiService.post<QuestionBank>('/banks', data),

  getBank: (bankId: string) =>
    apiService.get<{ bank: QuestionBank; membership: BankMember | null }>(`/banks/${bankId}`),

  listMembers: (bankId: string, status?: 'active' | 'pending') =>
    apiService.get<{ results: BankMember[] }>(`/banks/${bankId}/members`, {
      params: status ? { status } : undefined,
    }),

  inviteMember: (bankId: string, userId: string) =>
    apiService.post<BankMember>(`/banks/${bankId}/members`, { userId }),

  updateMemberRole: (bankId: string, userId: string, role: 'manager' | 'viewer') =>
    apiService.patch<BankMember>(`/banks/${bankId}/members/${userId}`, { role }),

  removeMember: (bankId: string, userId: string) =>
    apiService.delete<void>(`/banks/${bankId}/members/${userId}`),

  leaveBank: (bankId: string) =>
    apiService.post<void>(`/banks/${bankId}/leave`),

  requestAccess: (bankId: string) =>
    apiService.post<BankMember>(`/banks/${bankId}/request-access`),

  listPendingRequests: (bankId: string) =>
    apiService.get<{ results: BankMember[] }>(`/banks/${bankId}/requests/pending`),

  respondToRequest: (
    bankId: string,
    userId: string,
    decision: 'approve' | 'reject'
  ) => apiService.post<BankMember | { status: string }>(
    `/banks/${bankId}/requests/${userId}/respond`,
    { decision }
  ),

  transferOwnership: (bankId: string, toUserId: string) =>
    apiService.post<BankMember>(`/banks/${bankId}/transfer-ownership`, { toUserId }),
};

export const notificationService = {
  getUnreadCount: () =>
    apiService.get<{ unreadCount: number }>('/notifications/unread-count'),

  list: (params?: { isRead?: boolean; type?: string; page?: number; limit?: number }) =>
    apiService.get<{
      results: Array<{
        _id: string;
        userId: string;
        type: string;
        title: string;
        body: string;
        data?: Record<string, unknown>;
        isRead: boolean;
        readAt?: string;
        createdAt: string;
      }>;
      page: number;
      limit: number;
      total: number;
      pages: number;
    }>('/notifications', { params: params as Record<string, string | number | boolean> }),

  markAsRead: (id: string) =>
    apiService.post<unknown>(`/notifications/${id}/read`),

  markAllAsRead: () =>
    apiService.patch<void>('/notifications/read-all'),
};