import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../presentation/store/authStore';
import RoleDashboard from '../presentation/components/RoleDashboard';

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/', { replace: true });
  }, [user, navigate]);

  return <RoleDashboard />;
}
