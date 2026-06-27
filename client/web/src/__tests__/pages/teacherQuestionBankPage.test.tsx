import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import QuestionBankPage from '../../pages/QuestionBankPage';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null })),
}));
vi.mock('../../presentation/store/questionStore', () => ({
  useQuestionStore: () => ({
    questions: [],
    isLoading: false,
    error: null,
    createError: null,
    isCreating: false,
    availableTags: [],
    pagination: { page: 1, pages: 1, limit: 20, total: 0 },
    fetchQuestions: vi.fn(),
    fetchTags: vi.fn(),
    createQuestion: vi.fn(),
    setFilters: vi.fn(),
    clearError: vi.fn(),
    clearCreateError: vi.fn(),
    approveQuestion: vi.fn(),
    generateAiQuestions: vi.fn(),
    generateSimilarQuestions: vi.fn(),
  }),
}));
vi.mock('../../presentation/store/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'u1', role: 'teacher', schoolId: 's1' } }),
}));

describe('teacher QuestionBankPage', () => {
  it('renders TEACHER badge', () => {
    render(<QuestionBankPage />);
    expect(screen.getByText('TEACHER')).toBeInTheDocument();
  });
});
