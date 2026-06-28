import { render, screen } from '@testing-library/react';
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

  it('shows my-scores for student', async () => {
    mockAuth('student');
    const { default: StudentLayout } = await import('./Layout');
    render(
      <MemoryRouter>
        <StudentLayout />
      </MemoryRouter>
    );
    expect(screen.getByText(/Điểm của tôi/i)).toBeInTheDocument();
  });
});
