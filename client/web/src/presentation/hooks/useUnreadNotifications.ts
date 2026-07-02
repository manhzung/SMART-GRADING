import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../../services/bankService';

/**
 * Polls the server for the unread notification count every 30 seconds.
 */
export function useUnreadNotifications(intervalMs = 30_000) {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: intervalMs,
    refetchOnWindowFocus: true,
    staleTime: intervalMs / 2,
  });
}