import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';

function mockAuth(role: 'admin' | 'school-admin' | 'teacher' | 'student') {
  vi.doMock('../store/authStore', () => ({
    useAuthStore: (sel: any) =>
      sel({
        user: { _id: 'u', name: 'X', email: 'x@x', role, isEmailVerified: true },
        logout: vi.fn(),
      }),
  }));
}

describe('Layout nav filtering', () => {
  afterEach(() => {
    cleanup();
    vi.resetModules();
  });

  it('shows system dashboard for admin and hides student items', async () => {
    mockAuth('admin');
    const { default: AdminLayout } = await import('./Layout');
    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>
    );
    expect(screen.getByText(/Dashboard hệ thống/i)).toBeInTheDocument();
    expect(screen.queryByText(/Điểm của tôi/i)).toBeNull();
  });

  it('shows school dashboard for school-admin', async () => {
    mockAuth('school-admin');
    const { default: SchoolLayout } = await import('./Layout');
    render(
      <MemoryRouter>
        <SchoolLayout />
      </MemoryRouter>
    );
    expect(screen.getByText(/Dashboard trường/i)).toBeInTheDocument();
    expect(screen.queryByText(/Dashboard hệ thống/i)).toBeNull();
  });

  it('shows my-scores for student and hides admin items', async () => {
    mockAuth('student');
    const { default: StudentLayout } = await import('./Layout');
    render(
      <MemoryRouter>
        <StudentLayout />
      </MemoryRouter>
    );
    expect(screen.getByText(/Điểm của tôi/i)).toBeInTheDocument();
    expect(screen.queryByText(/Dashboard hệ thống/i)).toBeNull();
    expect(screen.queryByText(/Dashboard trường/i)).toBeNull();
  });

  it('hides Thống kê and Quét OMR for all roles', async () => {
    for (const role of ['admin', 'school-admin', 'teacher', 'student'] as const) {
      mockAuth(role);
      const { default: UniversalLayout } = await import('./Layout?' + role);
      render(
        <MemoryRouter>
          <UniversalLayout />
        </MemoryRouter>
      );
      expect(screen.queryByText(/Thống kê/i), `Thống kê should be hidden for ${role}`).toBeNull();
      expect(screen.queryByText(/Quét OMR/i), `Quét OMR should be hidden for ${role}`).toBeNull();
      cleanup();
      vi.resetModules();
    }
  });
});
