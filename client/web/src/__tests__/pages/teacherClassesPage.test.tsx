import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClassesPage from '../../pages/ClassesPage';

vi.mock('../../../presentation/store/classStore', () => ({
  useClassStore: () => ({
    classes: [], isLoading: false, error: null,
    pagination: { page: 1, pages: 1, limit: 10, total: 0 },
    fetchClasses: vi.fn(), fetchTeachers: vi.fn(), createClass: vi.fn(),
    updateClass: vi.fn(), deleteClass: vi.fn(), clearError: vi.fn(),
  }),
}));
vi.mock('../../../presentation/store/dashboardStore', () => ({
  useDashboardStore: () => ({ fetchDashboard: vi.fn() }),
}));
vi.mock('../../../presentation/store/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'u1', role: 'teacher', schoolId: 's1' } }),
}));

describe('teacher ClassesPage', () => {
  it('renders TEACHER badge', () => {
    render(<ClassesPage />);
    expect(screen.getByText('TEACHER')).toBeInTheDocument();
  });
  it('does not show School column', () => {
    render(<ClassesPage />);
    expect(screen.queryByText('School')).toBeNull();
  });
});
