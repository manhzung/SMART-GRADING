import { create } from 'zustand';
import { analyticsService, type DashboardStats, type Analytics } from './analytics.service';

interface AnalyticsState {
  dashboardStats: DashboardStats | null;
  analytics: Analytics | null;
  isLoading: boolean;
  error: string | null;
  fetchDashboardStats: () => Promise<void>;
  fetchAnalytics: (period?: 'week' | 'month' | 'semester') => Promise<void>;
  clearError: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  dashboardStats: null,
  analytics: null,
  isLoading: false,
  error: null,

  fetchDashboardStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await analyticsService.getDashboardStats();
      set({ dashboardStats: stats, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message || 'Failed to load dashboard stats', isLoading: false });
      throw error;
    }
  },

  fetchAnalytics: async (period?: 'week' | 'month' | 'semester') => {
    set({ isLoading: true, error: null });
    try {
      const analytics = await analyticsService.getAnalytics(period);
      set({ analytics, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message || 'Failed to load analytics', isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
