import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppealsPage from '../../pages/AppealsPage';

vi.mock('../../presentation/store/appealStore', () => ({
  useAppealStore: () => ({
    appeals: [],
    stats: { total: 0, pending: 0, reviewing: 0, approved: 0, rejected: 0 },
    isLoading: false,
    error: null,
    pagination: { page: 1, pages: 1, limit: 10, total: 0 },
    fetchAppeals: vi.fn(),
    reviewAppeal: vi.fn(),
  }),
}));

describe('teacher AppealsPage', () => {
  it('renders TEACHER badge', () => {
    render(
      <MemoryRouter>
        <AppealsPage />
      </MemoryRouter>
    );
    expect(screen.getByText('TEACHER')).toBeInTheDocument();
  });
});
