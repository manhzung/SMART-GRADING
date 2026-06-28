import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
const mockLogin = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('../../presentation/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector: any) => {
      const state = {
        user: mockUser,
        token: 'tok',
        refreshToken: 'rtok',
        isAuthenticated: !!mockUser,
        isLoading: false,
        error: null,
        login: mockLogin,
        logout: vi.fn(),
        clearError: vi.fn(),
      };
      return typeof selector === 'function' ? selector(state) : state;
    },
    { getState: () => ({ user: mockUser, login: mockLogin }) },
  ),
}));

vi.mock('../../presentation/components/AuthLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-layout">{children}</div>,
}));

let mockUser: any = null;

import LoginPage from '../../pages/LoginPage';

const renderLogin = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );

describe('LoginPage - role-based redirect', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLogin.mockReset();
    mockUser = null;
  });

  it('redirects to /my-scores when the logged-in user is a student', async () => {
    mockLogin.mockImplementation(async () => {
      mockUser = { id: 's1', email: 'student@x.vn', role: 'student', name: 'S', isEmailVerified: true };
    });

    renderLogin();
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'student@x.vn' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password1' } });
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/my-scores', expect.any(Object)));
  });

  it('redirects to /school when the logged-in user is a school-admin', async () => {
    mockLogin.mockImplementation(async () => {
      mockUser = { id: 'sa1', email: 'sa@x.vn', role: 'school-admin', name: 'SA', isEmailVerified: true };
    });

    renderLogin();
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'sa@x.vn' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password1' } });
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/school', expect.any(Object)));
  });

  it('redirects to /admin when the logged-in user is an admin', async () => {
    mockLogin.mockImplementation(async () => {
      mockUser = { id: 'a1', email: 'admin@x.vn', role: 'admin', name: 'A', isEmailVerified: true };
    });

    renderLogin();
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'admin@x.vn' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password1' } });
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin', expect.any(Object)));
  });

  it('redirects to / when the logged-in user is a teacher', async () => {
    mockLogin.mockImplementation(async () => {
      mockUser = { id: 't1', email: 'teacher@x.vn', role: 'teacher', name: 'T', isEmailVerified: true };
    });

    renderLogin();
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'teacher@x.vn' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password1' } });
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', expect.any(Object)));
  });
});
