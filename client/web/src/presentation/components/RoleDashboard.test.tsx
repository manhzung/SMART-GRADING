import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

describe('RoleDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { _id: 'u1', name: 'A', email: 'a@x', role: 'admin', isEmailVerified: true },
      token: 't',
      refreshToken: null,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  });

  it('renders system KPIs for admin', async () => {
    render(
      <MemoryRouter>
        <RoleDashboard />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Tổng quan hệ thống/i)).toBeInTheDocument();
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(await screen.findByText('200')).toBeInTheDocument();
  });
});
