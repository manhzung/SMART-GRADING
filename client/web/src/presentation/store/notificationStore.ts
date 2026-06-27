import { create } from 'zustand';
import { apiService } from '../../core/api';

export interface Notification {
  _id: string;
  userId?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
  readAt?: string;
  data?: {
    examId?: string;
    submissionId?: string;
    appealId?: string;
    classId?: string;
    questionId?: string;
  };
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  pagination: { page: number; limit: number; total: number; pages: number };
  fetchNotifications: (page?: number) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  pagination: { page: 1, limit: 20, total: 0, pages: 0 },

  fetchNotifications: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get<{
        results: Array<{
          _id: string;
          userId?: string;
          title: string;
          body?: string;
          message?: string;
          type: string;
          isRead: boolean;
          createdAt: string;
          readAt?: string;
          data?: Record<string, string>;
          priority?: string;
          expiresAt?: string;
        }>;
        page: number; limit: number; total: number; pages: number;
      }>('/notifications', { params: { page, limit: 20 } });
      
      const results: Notification[] = (response.results || []).map((n) => ({
        _id: n._id,
        userId: n.userId,
        title: n.title,
        message: n.body || n.message || '',
        type: n.type as Notification['type'],
        isRead: n.isRead,
        createdAt: n.createdAt,
        readAt: n.readAt,
        data: n.data,
        priority: n.priority as Notification['priority'],
        expiresAt: n.expiresAt,
      }));
      
      set({
        notifications: results,
        unreadCount: results.filter(n => !n.isRead).length,
        pagination: { page: response.page, limit: response.limit, total: response.total, pages: response.pages },
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      await apiService.patch(`/notifications/${id}`, { isRead: true });
      set((state) => ({
        notifications: state.notifications.map(n => n._id === id ? { ...n, isRead: true } : n),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  markAllAsRead: async () => {
    try {
      await apiService.patch('/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteNotification: async (id) => {
    try {
      await apiService.delete(`/notifications/${id}`);
      set((state) => {
        const notif = state.notifications.find(n => n._id === id);
        return {
          notifications: state.notifications.filter(n => n._id !== id),
          unreadCount: notif && !notif.isRead ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  clearError: () => set({ error: null }),
}));
