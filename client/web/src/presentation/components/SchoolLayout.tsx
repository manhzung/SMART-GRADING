import { Outlet, useNavigate } from 'react-router-dom';
import {
  Settings,
  HelpCircle,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import SchoolSidebar from './SchoolSidebar';
import NotificationPanel from './NotificationPanel';
import styles from './SchoolLayout.module.css';

export default function SchoolLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const userRole = (user?.role as string) || 'school-admin';
  const displayName = user?.name || 'School Admin';
  const displayRole = 'SCHOOL ADMIN';
  const avatarUrl = user?.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={styles.layout}>
      <SchoolSidebar />

      <div className={styles.viewport}>
        <header className={styles.topHeader}>
          <div className={styles.headerRight}>
            <div className={styles.headerIcons}>
              <NotificationPanel />
              <button className={styles.headerIconBtn} onClick={() => navigate('/settings')}>
                <Settings size={18} />
              </button>
              <button className={styles.headerIconBtn} onClick={() => navigate('/help')}>
                <HelpCircle size={18} />
              </button>
            </div>
            
            <div className={styles.headerDivider} />

            <div className={styles.profileContainer}>
              <div className={styles.profileInfo}>
                <span className={styles.profileName}>{displayName}</span>
                <span className={styles.profileRole}>{displayRole}</span>
              </div>
              <img 
                src={avatarUrl} 
                alt={displayName} 
                className={styles.avatar}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName);
                }}
              />
            </div>
          </div>
        </header>

        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
