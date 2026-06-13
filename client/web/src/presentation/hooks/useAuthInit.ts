import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

/**
 * Must be rendered inside the Router context.
 * Fires checkAuth once on mount so ProtectedRoute can rely on a stable
 * `isLoading` state — no more requests firing before the token is synced.
 */
export function useAuthInit() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
}
