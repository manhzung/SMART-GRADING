import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../core/api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    setToken: vi.fn(),
    setRefreshToken: vi.fn(),
  },
}));

describe('authStore - updateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('calls PATCH /users/:id with profile data and updates local user', async () => {
    const { apiService: mockApi } = await import('../../core/api');
    const mockUser = {
      _id: 'user1',
      name: 'Original Name',
      email: 'test@test.com',
      role: 'teacher' as const,
      id: 'user1',
      isEmailVerified: true,
    };
    const updatedUser = {
      ...mockUser,
      name: 'Updated Name',
    };
    (mockApi.patch as ReturnType<typeof vi.fn>).mockResolvedValue(updatedUser);

    const { useAuthStore } = await import('../../presentation/store/authStore');
    // Seed the store with a user
    useAuthStore.setState({
      user: mockUser,
      token: 'test-token',
      refreshToken: 'test-refresh',
      isAuthenticated: true,
    });

    await useAuthStore.getState().updateProfile({ name: 'Updated Name' });

    expect(mockApi.patch).toHaveBeenCalledWith('/users/user1', { name: 'Updated Name' });
    expect(useAuthStore.getState().user?.name).toBe('Updated Name');
  });

  it('throws if user is not authenticated', async () => {
    const { useAuthStore } = await import('../../presentation/store/authStore');
    useAuthStore.setState({ user: null });

    await expect(
      useAuthStore.getState().updateProfile({ name: 'Test' })
    ).rejects.toThrow('Not authenticated');
  });

  it('preserves other user fields when updating', async () => {
    const { apiService: mockApi } = await import('../../core/api');
    const mockUser = {
      _id: 'user1',
      name: 'Original',
      email: 'test@test.com',
      role: 'teacher' as const,
      id: 'user1',
      isEmailVerified: true,
    };
    (mockApi.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockUser,
      name: 'New Name',
    });

    const { useAuthStore } = await import('../../presentation/store/authStore');
    useAuthStore.setState({
      user: mockUser,
      token: 'test-token',
      refreshToken: 'test-refresh',
      isAuthenticated: true,
    });

    await useAuthStore.getState().updateProfile({ name: 'New Name' });

    const state = useAuthStore.getState();
    expect(state.user?.name).toBe('New Name');
    expect(state.user?.email).toBe('test@test.com');
    expect(state.user?.role).toBe('teacher');
  });
});
