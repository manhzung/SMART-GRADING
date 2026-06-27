import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExamsPage from '../../pages/ExamsPage';

vi.mock('../../../presentation/store/examStore', () => ({
  useExamStore: () => ({
    exams: [],
    isLoading: false,
    error: null,
    pagination: { page: 1, pages: 1, limit: 10, total: 0 },
    fetchExams: vi.fn(),
    deleteExam: vi.fn(),
  }),
}));
vi.mock('../../../presentation/store/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'u1', role: 'teacher' } }),
}));

describe('teacher ExamsPage', () => {
  it('renders TEACHER badge', () => {
    render(
      <MemoryRouter>
        <ExamsPage />
      </MemoryRouter>
    );
    expect(screen.getByText('TEACHER')).toBeInTheDocument();
  });
});
