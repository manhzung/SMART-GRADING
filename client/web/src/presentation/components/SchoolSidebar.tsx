import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Database,
  FileText,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import styles from './SchoolLayout.module.css';

const schoolNavItems = [
  { path: '/school', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/school/classes', icon: GraduationCap, label: 'Classes' },
  { path: '/school/students', icon: Users, label: 'Students' },
  { path: '/school/questions', icon: Database, label: 'Questions' },
  { path: '/school/exams', icon: FileText, label: 'Exams' },
];

export default function SchoolSidebar() {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <h1 className={styles.brandTitle}>EduGrade Pro</h1>
        <p className={styles.brandSubtitle}>School Admin</p>
      </div>
      
      <nav className={styles.nav}>
        {schoolNavItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/school' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarBottom}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
