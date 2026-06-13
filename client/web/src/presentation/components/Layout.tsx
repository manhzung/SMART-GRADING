import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Database, 
  FileText, 
  BarChart3, 
  Settings, 
  HelpCircle, 
  LogOut,
  Bell,
  MessageSquare,
  Brain
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import styles from './Layout.module.css';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/classes', icon: GraduationCap, label: 'Classes' },
  { path: '/question-bank', icon: Database, label: 'Question Bank' },
  { path: '/exams', icon: FileText, label: 'Exams' },
  { path: '/appeals', icon: MessageSquare, label: 'Appeals' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/ai-tutor', icon: Brain, label: 'AI Tutor' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  // Get user details, fallback to mock Dr. Sarah Miller if none
  const displayName = user?.name || 'Dr. Sarah Miller';
  const displayRole = user?.role === 'admin' ? 'ADMINISTRATOR' : 'PROFESSOR';
  const avatarUrl = user?.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <h1 className={styles.brandTitle}>EduGrade Pro</h1>
          <p className={styles.brandSubtitle}>Academic Workspace</p>
        </div>
        
        <nav className={styles.nav}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
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
          <Link
            to="/help"
            className={`${styles.navItem} ${
              location.pathname === '/help' ? styles.active : ''
            }`}
          >
            <HelpCircle size={18} />
            <span>Help Center</span>
          </Link>
          
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Right Content View */}
      <div className={styles.viewport}>
        {/* Top Header */}
        <header className={styles.topHeader}>
          {/* Right menu icons and avatar */}
          <div className={styles.headerRight}>
            <div className={styles.headerIcons}>
              <button className={styles.headerIconBtn}>
                <Bell size={18} />
                <span className={styles.notificationDot} />
              </button>
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

        {/* Content body */}
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
