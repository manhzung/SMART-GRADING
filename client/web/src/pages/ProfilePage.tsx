import { User, Settings, HelpCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../presentation/store/authStore';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className={styles.container}>
      <div className={styles.profileCard}>
        <div className={styles.avatar}>
          <User size={48} />
        </div>
        <h2>{user?.name || 'Nguyễn Văn A'}</h2>
        <p>{user?.email || 'user@smartgrading.com'}</p>
        <span className={styles.role}>{user?.role || 'student'}</span>
      </div>

      <div className={styles.menu}>
        <button className={styles.menuItem} onClick={() => navigate('/settings')}>
          <Settings size={20} />
          <span>Cài đặt</span>
        </button>
        <button className={styles.menuItem} onClick={() => navigate('/help')}>
          <HelpCircle size={20} />
          <span>Trợ giúp</span>
        </button>
        <button className={`${styles.menuItem} ${styles.logout}`} onClick={logout}>
          <LogOut size={20} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}
