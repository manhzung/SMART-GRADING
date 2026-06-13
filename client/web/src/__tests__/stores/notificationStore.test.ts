import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../core/api', () => ({
  apiService: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('notificationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('fetchNotifications maps results and computes unreadCount', async () => {
    const { apiService: mockApi } = await import('../../core/api');
    (mockApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: [
        { _id: '1', title: 'Test', message: 'Hello', type: 'info', isRead: false, createdAt: '2025-01-01' },
        { _id: '2', title: 'Test2', message: 'World', type: 'success', isRead: true, createdAt: '2025-01-02' },
      ],
      page: 1, limit: 20, total: 2, pages: 1,
    });

    const { useNotificationStore } = await import('../../presentation/store/notificationStore');
    await useNotificationStore.getState().fetchNotifications();

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(2);
    expect(state.unreadCount).toBe(1);
  });

  it('markAsRead decrements unreadCount and updates notification', async () => {
    const { apiService: mockApi } = await import('../../core/api');
    (mockApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: [
        { _id: '1', title: 'Test', message: 'Hello', type: 'info', isRead: false, createdAt: '2025-01-01' },
      ],
      page: 1, limit: 20, total: 1, pages: 1,
    });
    (mockApi.patch as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const { useNotificationStore } = await import('../../presentation/store/notificationStore');
    await useNotificationStore.getState().fetchNotifications();
    expect(useNotificationStore.getState().unreadCount).toBe(1);

    await useNotificationStore.getState().markAsRead('1');
    expect(useNotificationStore.getState().unreadCount).toBe(0);
    expect(useNotificationStore.getState().notifications[0].isRead).toBe(true);
  });

  it('markAllAsRead sets unreadCount to zero', async () => {
    const { apiService: mockApi } = await import('../../core/api');
    (mockApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: [
        { _id: '1', title: 'Test', message: 'Hello', type: 'info', isRead: false, createdAt: '2025-01-01' },
        { _id: '2', title: 'Test2', message: 'World', type: 'info', isRead: false, createdAt: '2025-01-02' },
      ],
      page: 1, limit: 20, total: 2, pages: 1,
    });
    (mockApi.patch as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const { useNotificationStore } = await import('../../presentation/store/notificationStore');
    await useNotificationStore.getState().fetchNotifications();
    expect(useNotificationStore.getState().unreadCount).toBe(2);

    await useNotificationStore.getState().markAllAsRead();
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it('deleteNotification removes notification and decrements unreadCount if unread', async () => {
    const { apiService: mockApi } = await import('../../core/api');
    (mockApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: [
        { _id: '1', title: 'Test', message: 'Hello', type: 'info', isRead: false, createdAt: '2025-01-01' },
        { _id: '2', title: 'Test2', message: 'World', type: 'info', isRead: true, createdAt: '2025-01-02' },
      ],
      page: 1, limit: 20, total: 2, pages: 1,
    });
    (mockApi.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const { useNotificationStore } = await import('../../presentation/store/notificationStore');
    await useNotificationStore.getState().fetchNotifications();
    expect(useNotificationStore.getState().notifications).toHaveLength(2);

    await useNotificationStore.getState().deleteNotification('1');
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });
});
