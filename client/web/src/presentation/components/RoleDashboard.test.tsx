import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import RoleDashboard from './RoleDashboard';

vi.mock('../../services/analytics.service', () => ({
  analyticsService: {
    getDashboardStats: vi.fn().mockResolvedValue({
      totalClasses: 12,
      totalExams: 5,
      totalStudents: 200,
      totalSubmissions: 80,
      pendingAppeals: 2,
      publishedExams: 3,
      avgScore: 7.4,
      passRate: 86,
      recentSubmissions: [],
    }),
    getRecentActivities: vi.fn().mockResolvedValue({ results: [], count: 0 }),
  },
}));

vi.mock('../../services/bankService', () => ({
  notificationService: {
    getUnreadCount: vi.fn().mockResolvedValue({ unreadCount: 0 }),
    list: vi.fn().mockResolvedValue({ results: [], page: 1, limit: 20, total: 0, pages: 0 }),
    markAsRead: vi.fn().mockResolvedValue(undefined),
    markAllAsRead: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('RoleDashboard', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    useAuthStore.setState({
      user: { _id: 'u1', id: 'u1', name: 'A', email: 'a@x', role: 'admin', isEmailVerified: true } as any,
      token: 't',
      refreshToken: null,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  });

  it('renders system KPIs for admin', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <RoleDashboard />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText(/System Overview/i)).toBeInTheDocument();
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(await screen.findByText('200')).toBeInTheDocument();
  });
});
