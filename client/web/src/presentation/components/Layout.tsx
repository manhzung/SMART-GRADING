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
  MessageSquare,
  ClipboardList,
  Scale,
  Building2,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import NotificationPanel from './NotificationPanel';
import styles from './Layout.module.css';

// Admin nav items — only visible to admin/school-admin
const adminNavItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'school-admin'], group: 'admin' },
  { path: '/admin/schools', icon: Building2, label: 'Schools', roles: ['admin'], group: 'admin' },
  { path: '/admin/users', icon: Users, label: 'Users', roles: ['admin', 'school-admin'], group: 'admin' },
];

const allNavItems = [
  ...adminNavItems,
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'teacher'] },
  { path: '/classes', icon: GraduationCap, label: 'Classes', roles: ['admin', 'teacher'] },
  { path: '/question-bank', icon: Database, label: 'Question Bank', roles: ['admin', 'teacher'] },
  { path: '/exams', icon: FileText, label: 'Exams', roles: ['admin', 'teacher'] },
  { path: '/appeals', icon: MessageSquare, label: 'Appeals', roles: ['admin', 'teacher'] },
  { path: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['admin', 'teacher'] },
  { path: '/my-scores', icon: ClipboardList, label: 'Điểm của tôi', roles: ['student'] },
  { path: '/my-appeals', icon: Scale, label: 'Phúc khảo', roles: ['student'] },
  { path: '/settings', icon: Settings, label: 'Settings', roles: ['admin', 'teacher', 'student'] },
];

const ROLE_LABELS: Record<string, string> = {
  admin: 'ADMINISTRATOR',
  teacher: 'PROFESSOR',
  student: 'STUDENT',
  parent: 'PARENT',
};

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const userRole = (user?.role as string) || 'teacher';
  const navItems = allNavItems.filter((item) => item.roles.includes(userRole));

  const displayName = user?.name || (userRole === 'student' ? 'Học sinh' : 'Dr. Sarah Miller');
  const displayRole = ROLE_LABELS[userRole] || 'USER';
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
          {(() => {
            const adminItems = navItems.filter((item) => (item as any).group === 'admin');
            const mainItems = navItems.filter((item) => !(item as any).group);
            if (adminItems.length === 0) {
              return mainItems.map((item) => {
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
              });
            }
            return (
              <>
                <div className={styles.navGroupLabel}>Admin</div>
                {adminItems.map((item) => {
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
                <div className={styles.navDivider} />
                {mainItems.map((item) => {
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
              </>
            );
          })()}
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

        {/* Content body */}
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
