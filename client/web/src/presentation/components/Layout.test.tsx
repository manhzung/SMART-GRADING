import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, afterEach } from 'vitest';

function setupMocks(role: 'admin' | 'school-admin' | 'teacher' | 'student') {
  vi.doMock('../store/authStore', () => ({
    useAuthStore: (sel: any) =>
      sel({
        user: { _id: 'u', name: 'X', email: 'x@x', role, isEmailVerified: true },
        logout: vi.fn(),
      }),
  }));
  vi.doMock('../../services/bankService', () => ({
    notificationService: {
      getUnreadCount: vi.fn().mockResolvedValue({ unreadCount: 0 }),
      list: vi.fn().mockResolvedValue({ results: [], page: 1, limit: 20, total: 0, pages: 0 }),
      markAsRead: vi.fn().mockResolvedValue(undefined),
      markAllAsRead: vi.fn().mockResolvedValue(undefined),
    },
  }));
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  );
}

describe('Layout nav filtering', () => {
  afterEach(() => {
    cleanup();
    vi.resetModules();
  });

  it('shows system dashboard for admin and hides student items', async () => {
    setupMocks('admin');
    const { default: AdminLayout } = await import('./Layout');
    render(
      <TestWrapper>
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>
      </TestWrapper>,
    );
    expect(screen.getByText(/System Dashboard/i)).toBeInTheDocument();
    expect(screen.queryByText(/My Scores/i)).toBeNull();
  });

  it('shows school dashboard for school-admin', async () => {
    setupMocks('school-admin');
    const { default: SchoolLayout } = await import('./Layout');
    render(
      <TestWrapper>
        <MemoryRouter>
          <SchoolLayout />
        </MemoryRouter>
      </TestWrapper>,
    );
    expect(screen.getByText(/School Dashboard/i)).toBeInTheDocument();
    expect(screen.queryByText(/System Dashboard/i)).toBeNull();
  });

  it('shows my-scores for student and hides admin items', async () => {
    setupMocks('student');
    const { default: StudentLayout } = await import('./Layout');
    render(
      <TestWrapper>
        <MemoryRouter>
          <StudentLayout />
        </MemoryRouter>
      </TestWrapper>,
    );
    expect(screen.getByText(/My Scores/i)).toBeInTheDocument();
    expect(screen.queryByText(/System Dashboard/i)).toBeNull();
    expect(screen.queryByText(/School Dashboard/i)).toBeNull();
  });

  it('hides Analytics and Scan OMR for all roles', async () => {
    for (const role of ['admin', 'school-admin', 'teacher', 'student'] as const) {
      setupMocks(role);
      const { default: UniversalLayout } = await import('./Layout?' + role);
      render(
        <TestWrapper>
          <MemoryRouter>
            <UniversalLayout />
          </MemoryRouter>
        </TestWrapper>,
      );
      expect(screen.queryByText(/Analytics/i), `Analytics should be hidden for ${role}`).toBeNull();
      expect(screen.queryByText(/Scan OMR/i), `Scan OMR should be hidden for ${role}`).toBeNull();
      cleanup();
      vi.resetModules();
    }
  });
});