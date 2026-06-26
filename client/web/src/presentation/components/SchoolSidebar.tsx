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
  { path: '/school', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/school/classes', icon: GraduationCap, label: 'Lớp học' },
  { path: '/school/students', icon: Users, label: 'Học sinh' },
  { path: '/school/questions', icon: Database, label: 'Câu hỏi' },
  { path: '/school/exams', icon: FileText, label: 'Bài kiểm tra' },
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
        <div className={styles.navGroupLabel}>Quản lý Trường</div>
        {schoolNavItems.map((item) => {
          const isActive = item.exact 
            ? location.pathname === item.path 
            : location.pathname === item.path || location.pathname.startsWith(item.path);
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
