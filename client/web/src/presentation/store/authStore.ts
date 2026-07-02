import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiService } from '../../core/api';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'admin' | 'school-admin' | 'teacher' | 'student' | 'parent';
  avatarUrl?: string;
  isEmailVerified: boolean;
  schoolId?: string;
}

interface AuthTokens {
  access: {
    token: string;
    expires: string;
  };
  refresh: {
    token: string;
    expires: string;
  };
}

interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, schoolId?: string) => Promise<void>;
  logout: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  checkAuth: () => void;
  updateProfile: (data: { name?: string; phone?: string; avatar?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiService.post<AuthResponse>('/auth/login', { email, password });
          set({
            user: response.user,
            token: response.tokens.access.token,
            refreshToken: response.tokens.refresh.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ error: (error as Error).message || 'Đăng nhập thất bại', isLoading: false });
          throw error;
        }
      },

      register: async (_email: string, _password: string, _name: string, _schoolId?: string) => {
        set({ isLoading: true, error: null });
        try {
          await apiService.post('/auth/register', {
            email: _email,
            password: _password,
            name: _name,
            ...(_schoolId ? { schoolId: _schoolId } : {}),
          });
          set({ isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message || 'Đăng ký thất bại', isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const rt = get().refreshToken;
        set({ isLoading: true });
        try {
          if (rt) {
            await apiService.post('/auth/logout', { refreshToken: rt });
          }
        } catch (error) {
          console.error('Lỗi khi đăng xuất từ server:', error);
        } finally {
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          apiService.setToken(null);
          apiService.setRefreshToken(null);
        }
      },

  sendVerificationEmail: async () => {
    set({ isLoading: true, error: null });
    try {
      await apiService.post('/auth/send-verification-email');
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message || 'Gửi email xác thực thất bại', isLoading: false });
      throw error;
    }
  },

  resendVerificationEmail: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.post('/auth/resend-verification-email', { email });
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message || 'Gửi email xác thực thất bại', isLoading: false });
      throw error;
    }
  },

      verifyEmail: async (token: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`, {
            method: 'GET',
          });

          if (!response.ok) {
            let errorMessage = 'Xác thực email thất bại';
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
              try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
              } catch {
                // ignore parse error
              }
            }
            throw new Error(errorMessage);
          }

          const currentUser = get().user;
          if (currentUser) {
            set({ user: { ...currentUser, isEmailVerified: true } });
          }
          set({ isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message || 'Xác thực email thất bại', isLoading: false });
          throw error;
        }
      },

      forgotPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          await apiService.post('/auth/forgot-password', { email });
          set({ isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message || 'Yêu cầu đặt lại mật khẩu thất bại', isLoading: false });
          throw error;
        }
      },

      resetPassword: async (token: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          await apiService.post(`/auth/reset-password?token=${token}`, { password });
          set({ isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message || 'Đặt lại mật khẩu thất bại', isLoading: false });
          throw error;
        }
      },

  checkAuth: async () => {
    const token = get().token;
    const refreshToken = get().refreshToken;
    if (!token) {
      apiService.setToken(null);
      apiService.setRefreshToken(null);
      set({ isLoading: false });
      return;
    }

    apiService.setToken(token);
    apiService.setRefreshToken(refreshToken);
    set({ isLoading: true });

    try {
      const response = await apiService.get<{ user: User }>('/auth/me');
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Session restore failed:', error);
      set({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
      apiService.setToken(null);
      apiService.setRefreshToken(null);
    }
  },

  updateProfile: async (data) => {
    const user = get().user;
    if (!user) throw new Error('Not authenticated');
    const userId = (user as any)._id || (user as any).id;
    set({ isLoading: true, error: null });
    try {
      const updated = await apiService.patch<User>(`/users/${userId}`, data);
      set({ user: { ...user, ...updated }, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    const user = get().user;
    if (!user) throw new Error('Not authenticated');
    const userId = (user as any)._id || (user as any).id;
    set({ isLoading: true, error: null });
    try {
      await apiService.post(`/users/${userId}/change-password`, {
        currentPassword,
        newPassword,
      });
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Sync tokens to apiService after rehydration
        if (state) {
          if (state.token) {
            apiService.setToken(state.token);
          }
          if (state.refreshToken) {
            apiService.setRefreshToken(state.refreshToken);
          }
        }
      },
    }
  )
);

// Subscribe to store updates to automatically sync token with apiService
useAuthStore.subscribe((state, prevState) => {
  if (state.token !== prevState.token || state.refreshToken !== prevState.refreshToken) {
    apiService.setToken(state.token);
    apiService.setRefreshToken(state.refreshToken);
  }
});
