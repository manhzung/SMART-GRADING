import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LogOut,
  Bell,
  HelpCircle,
  LayoutDashboard,
  GraduationCap,
  FileText,
  Send,
  Database,
  CheckSquare,
  Building2,
  Award,
  FileQuestion,
  Settings,
  User,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import NotificationBadge from './NotificationBadge';
import styles from './Layout.module.css';

type Role = 'admin' | 'school-admin' | 'teacher' | 'student';
type NavItem = {
  to: string;
  label: string;
  roles: Role[];
  icon: React.ReactNode;
  end?: boolean;
};

const iconSize = 18;

const NAV: Array<{ group: string; items: NavItem[] }> = [
  {
    group: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', roles: ['teacher', 'student'], icon: <LayoutDashboard size={iconSize} />, end: true },
      { to: '/admin', label: 'System Dashboard', roles: ['admin'], icon: <LayoutDashboard size={iconSize} /> },
      { to: '/school', label: 'School Dashboard', roles: ['school-admin'], icon: <LayoutDashboard size={iconSize} /> },
    ],
  },
  {
    group: 'Management',
    items: [
      { to: '/classes', label: 'Classes', roles: ['admin', 'school-admin', 'teacher'], icon: <GraduationCap size={iconSize} /> },
      { to: '/exams', label: 'Exams', roles: ['admin', 'school-admin', 'teacher'], icon: <FileText size={iconSize} /> },
      { to: '/submissions', label: 'Submissions', roles: ['admin', 'school-admin', 'teacher'], icon: <Send size={iconSize} /> },
      { to: '/question-bank', label: 'Question Bank', roles: ['admin', 'school-admin', 'teacher'], icon: <Database size={iconSize} /> },
      { to: '/approval', label: 'Approval', roles: ['school-admin'], icon: <CheckSquare size={iconSize} /> },
      { to: '/admin/schools', label: 'Schools', roles: ['admin'], icon: <Building2 size={iconSize} /> },
      { to: '/appeals', label: 'Appeals', roles: ['teacher', 'school-admin', 'admin'], icon: <FileQuestion size={iconSize} /> },
    ],
  },
  {
    group: 'Personal',
    items: [
      { to: '/my-scores', label: 'My Scores', roles: ['student'], icon: <Award size={iconSize} /> },
      { to: '/my-appeals', label: 'My Appeals', roles: ['student'], icon: <FileQuestion size={iconSize} /> },
    ],
  },
  {
    group: 'Other',
    items: [
      { to: '/notifications', label: 'Notifications', roles: ['admin', 'school-admin', 'teacher', 'student'], icon: <Bell size={iconSize} /> },
      { to: '/help', label: 'Help', roles: ['admin', 'school-admin', 'teacher', 'student'], icon: <HelpCircle size={iconSize} /> },
      { to: '/settings', label: 'Settings', roles: ['admin', 'school-admin', 'teacher', 'student'], icon: <Settings size={iconSize} /> },
    ],
  },
];

function activeClass(role: string | undefined) {
  switch (role) {
    case 'admin': return styles.activeAdmin;
    case 'school-admin': return styles.activeSchool;
    case 'teacher': return styles.activeTeacher;
    case 'student': return styles.activeStudent;
    default: return '';
  }
}

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const role: Role = (user?.role as Role) ?? 'student';
  const visibleGroups = NAV
    .map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);

  const profileRoleLabel =
    role === 'admin' ? 'SUPER ADMIN'
    : role === 'school-admin' ? 'SCHOOL ADMIN'
    : role === 'teacher' ? 'TEACHER'
    : 'STUDENT';

  // Get user initials for bottom avatar box (e.g. "Nguyen Van A" -> "A")
  const userName = user?.name ?? 'User';
  const nameParts = userName.trim().split(/\s+/);
  const initials = nameParts.length > 0 ? nameParts[nameParts.length - 1].charAt(0).toUpperCase() : 'U';

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.logoIcon}>
            <GraduationCap size={20} />
          </div>
          <div>
            <h1 className={styles.brandTitle}>Smart Grading</h1>
            <p className={styles.brandSubtitle}>Smart Grading System</p>
          </div>
        </div>
        <nav className={styles.nav}>
          {visibleGroups.map((g, gi) => (
            <div key={g.group} className={styles.sidebarSection}>
              {gi > 0 && <div className={styles.navDivider} />}
              <div className={styles.navGroupLabel}>{g.group}</div>
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? `${styles.active} ${activeClass(role)}` : ''}`
                  }
                >
                  {it.icon}
                  <span>{it.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
          <div className={styles.sidebarBottom}>
            <div className={styles.profileCard}>
              <div className={styles.profileAvatar}>{initials}</div>
              <div className={styles.profileMeta}>
                <span className={styles.profileName}>{userName}</span>
                <span className={styles.profileRoleLabel}>{profileRoleLabel}</span>
              </div>
            </div>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? `${styles.active} ${activeClass(role)}` : ''}`
              }
            >
              <User size={18} />
              <span>Profile</span>
            </NavLink>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </nav>
      </aside>
      <div className={styles.viewport}>
        <header className={styles.topHeader}>
          <div className={styles.headerRight}>
            <span className={styles.profileRole}>{profileRoleLabel}</span>
            <div className={styles.headerDivider} />
            <NotificationBadge />
            <button className={styles.headerIconBtn} aria-label="Help"><HelpCircle size={18} /></button>
          </div>
        </header>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
