import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Bell, HelpCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import styles from './Layout.module.css';

type Role = 'admin' | 'school-admin' | 'teacher' | 'student';
type NavItem = {
  to: string;
  label: string;
  roles: Role[];
  end?: boolean;
};

const NAV: Array<{ group: string; items: NavItem[] }> = [
  {
    group: 'Tổng quan',
    items: [
      { to: '/', label: 'Dashboard', roles: ['teacher', 'student'], end: true },
      { to: '/admin', label: 'Dashboard hệ thống', roles: ['admin'] },
      { to: '/school', label: 'Dashboard trường', roles: ['school-admin'] },
    ],
  },
  {
    group: 'Quản lý',
    items: [
      { to: '/classes', label: 'Lớp học', roles: ['admin', 'school-admin', 'teacher'] },
      { to: '/exams', label: 'Đề thi', roles: ['admin', 'school-admin', 'teacher'] },
      { to: '/submissions', label: 'Bài nộp', roles: ['admin', 'school-admin', 'teacher'] },
      { to: '/question-bank', label: 'Ngân hàng câu hỏi', roles: ['admin', 'school-admin', 'teacher'] },
    ],
  },
  {
    group: 'Cá nhân',
    items: [
      { to: '/my-scores', label: 'Điểm của tôi', roles: ['student'] },
      { to: '/my-appeals', label: 'Phúc khảo của tôi', roles: ['student'] },
      { to: '/appeals', label: 'Phúc khảo', roles: ['teacher', 'school-admin', 'admin'] },
      { to: '/analytics', label: 'Thống kê', roles: ['admin', 'school-admin', 'teacher', 'student'] },
      { to: '/scan', label: 'Quét OMR', roles: ['admin', 'school-admin', 'teacher', 'student'] },
    ],
  },
  {
    group: 'Khác',
    items: [
      { to: '/notifications', label: 'Thông báo', roles: ['admin', 'school-admin', 'teacher', 'student'] },
      { to: '/help', label: 'Trợ giúp', roles: ['admin', 'school-admin', 'teacher', 'student'] },
      { to: '/settings', label: 'Cài đặt', roles: ['admin', 'school-admin', 'teacher', 'student'] },
    ],
  },
];

function activeClass(role: string | undefined) {
  switch (role) {
    case 'admin': return styles.activeAdmin;
    case 'school-admin': return styles.activeSchool;
    case 'teacher': return styles.activeTeacher;
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

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <h1 className={styles.brandTitle}>Smart Grading</h1>
          <p className={styles.brandSubtitle}>Nền tảng chấm thi thông minh</p>
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
                  {it.label}
                </NavLink>
              ))}
            </div>
          ))}
          <div className={styles.sidebarBottom}>
            <NavLink
              to="/profile"
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              Hồ sơ
            </NavLink>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              <LogOut size={16} /> Đăng xuất
            </button>
          </div>
        </nav>
      </aside>
      <div className={styles.viewport}>
        <header className={styles.topHeader}>
          <div className={styles.headerRight}>
            <span className={styles.profileRole}>{profileRoleLabel}</span>
            <div className={styles.headerDivider} />
            <button className={styles.headerIconBtn} aria-label="Thông báo"><Bell size={18} /></button>
            <button className={styles.headerIconBtn} aria-label="Trợ giúp"><HelpCircle size={18} /></button>
          </div>
        </header>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
