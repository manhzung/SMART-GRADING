import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
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

const renderWithRouter = (ui: React.ReactElement, { initialEntries = ['/question-bank/test-bank-id'] } = {}) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/question-bank/:bankId" element={ui} />
      </Routes>
    </MemoryRouter>
  );
};

describe('teacher QuestionBankPage', () => {
  it('renders question bank page with back button', () => {
    renderWithRouter(<QuestionBankPage />);
    expect(screen.getByText('Back to Banks')).toBeInTheDocument();
  });
});
