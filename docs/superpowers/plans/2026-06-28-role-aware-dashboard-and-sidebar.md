# Role-Aware Dashboard & Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the web app so `admin` and `school-admin` users land on role-appropriate dashboards with role-specific sidebar nav, while existing teacher/student flows remain intact.

**Architecture:** Reuse `EntityListPage` + `EntityPageHeader` (already support `admin` / `schoolAdmin` / `teacher` modes). Add a small `RoleDashboard` component that branches by `user.role` and renders either admin (system-wide via existing `/analytics/dashboard-stats`) or school (same endpoint already filtered by `schoolId`). Add `/admin` route for super-admin and `/school` for school-admin. Update `AppRoutes` `PublicOnlyRoute` to redirect by role and rewrite the `Layout` sidebar to render grouped, role-filtered nav items.

**Tech Stack:** React 18 + TypeScript + Zustand + React Router v6 + CSS Modules + Jest/RTL.

---

## Conventions

- Working dir: `c:\TAILIEU\DATN\SMART GRADING` (Windows, PowerShell shell).
- New components under `client/web/src/presentation/components/` (or `pages/` for full pages).
- All page-level CSS modules live next to the `.tsx` file.
- Test files: `*.test.tsx` next to source.
- Run unit tests: `cd client/web && npx jest --silent --testPathPattern=<file>`.
- Run TypeScript check: `cd client/web && npx tsc --noEmit`.
- Commit per task with prefix `feat(role-aware):` / `refactor:` / `chore:`.
- DO NOT touch git stash entries. DO NOT commit binaries. DO NOT force push.

---

## Backend Reality (already implemented)

| Endpoint | Returns |
|---|---|
| `GET /analytics/dashboard-stats` (auth) | Role/school-filtered: `totalClasses`, `totalExams`, `totalStudents`, `totalSubmissions`, `pendingAppeals`, `publishedExams`, `avgScore`, `passRate`, `recentSubmissions[]` |
| `GET /analytics/analytics?period=` | Per-period analytics |
| `GET /activities?limit=` | Recent activity feed |

The frontend `analyticsService.getDashboardStats()` already calls `/analytics/dashboard-stats` and types it as `DashboardStats`. We will reuse this — no new backend code required.

---

## File Structure

| Path | Responsibility |
|---|---|
| `client/web/src/presentation/components/RoleDashboard.tsx` | Decide which dashboard body to render by role |
| `client/web/src/presentation/components/RoleDashboard.module.css` | Layout for dashboard chrome |
| `client/web/src/pages/AdminDashboardPage.tsx` | Super-admin dashboard wrapper |
| `client/web/src/pages/SchoolAdminDashboardPage.tsx` | School-admin dashboard wrapper |
| `client/web/src/presentation/components/Layout.tsx` | Rewrite sidebar with role-filtered grouped nav |
| `client/web/src/presentation/components/Layout.module.css` | Append nav-group + role-active styles |
| `client/web/src/presentation/routes/AppRoutes.tsx` | Add `/admin` + `/school` routes + update `PublicOnlyRoute` |
| `client/web/src/pages/DashboardPage.tsx` | Replace body with `<RoleDashboard />` |
| `client/web/src/pages/LoginPage.tsx` | Post-login redirect by role |

---

## Task 1: Add RoleDashboard component

**Files:**
- Create: `client/web/src/presentation/components/RoleDashboard.tsx`
- Create: `client/web/src/presentation/components/RoleDashboard.module.css`
- Create: `client/web/src/presentation/components/RoleDashboard.test.tsx`

- [ ] **Step 1: Write CSS module**

Create `client/web/src/presentation/components/RoleDashboard.module.css`:

```css
.wrap { display: flex; flex-direction: column; gap: 24px; }
.kpiGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.kpiCard {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.kpiLabel { font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.6px; }
.kpiValue { font-size: 28px; font-weight: 700; color: #0b2240; }
.kpiHint { font-size: 12px; color: #6b7280; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 900px) { .row { grid-template-columns: 1fr; } }
.listCard {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
}
.listTitle { font-size: 14px; font-weight: 700; color: #0b2240; margin: 0 0 12px; }
.listItem {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0; border-top: 1px solid #f1f5f9;
  font-size: 13px; color: #1f2937;
}
.listItem:first-of-type { border-top: none; }
.empty { font-size: 13px; color: #9ca3af; padding: 8px 0; }
.headerRow { display: flex; justify-content: space-between; align-items: center; }
.refreshBtn {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  color: #0b2240;
  cursor: pointer;
}
.refreshBtn:hover { background: #f3f4f6; }
.roleBadge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  padding: 4px 10px;
  border-radius: 6px;
  margin-bottom: 6px;
}
.roleBadgeAdmin { background: #0b2240; color: #fff; }
.roleBadgeSchool { background: #dbeafe; color: #1e40af; }
.roleBadgeTeacher { background: #d1fae5; color: #065f46; }
```

- [ ] **Step 2: Write failing test**

Create `client/web/src/presentation/components/RoleDashboard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RoleDashboard from './RoleDashboard';

const mockAuth = {
  user: { _id: 'u1', name: 'A', email: 'a@x', role: 'admin' as const, isEmailVerified: true },
  token: 't', refreshToken: null, isAuthenticated: true, isLoading: false, error: null,
  login: jest.fn(), register: jest.fn(), logout: jest.fn(), refreshAccessToken: jest.fn(),
  setUser: jest.fn(), clearError: jest.fn(),
};

jest.mock('../store/authStore', () => ({
  useAuthStore: Object.assign(
    (sel: any) => sel(mockAuth),
    { getState: () => mockAuth },
  ),
}));

const mockStats = {
  totalClasses: 12, totalExams: 5, totalStudents: 200,
  totalSubmissions: 80, pendingAppeals: 2, publishedExams: 3,
  avgScore: 7.4, passRate: 86, recentSubmissions: [],
};

jest.mock('../../services/analytics.service', () => ({
  analyticsService: {
    getDashboardStats: jest.fn().mockResolvedValue(mockStats),
    getRecentActivities: jest.fn().mockResolvedValue({ results: [], count: 0 }),
  },
}));

describe('RoleDashboard', () => {
  it('renders system KPIs for admin', async () => {
    render(<MemoryRouter><RoleDashboard /></MemoryRouter>);
    expect(await screen.findByText(/Tổng quan hệ thống/i)).toBeInTheDocument();
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(await screen.findByText('200')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test, expect FAIL**

Run: `cd client/web && npx jest --silent --testPathPattern=RoleDashboard.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement RoleDashboard**

Create `client/web/src/presentation/components/RoleDashboard.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { analyticsService, type DashboardStats } from '../../services/analytics.service';
import styles from './RoleDashboard.module.css';

interface KpiProps { label: string; value: number | string; hint?: string; }
function Kpi({ label, value, hint }: KpiProps) {
  return (
    <div className={styles.kpiCard}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiValue}>{value}</span>
      {hint && <span className={styles.kpiHint}>{hint}</span>}
    </div>
  );
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('vi-VN'); } catch { return '—'; }
}

export default function RoleDashboard() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await analyticsService.getDashboardStats();
      setStats(data);
    } catch (e: any) {
      setError(e?.message ?? 'Không thể tải dữ liệu dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;
  const isAdmin = user.role === 'admin';
  const isSchoolAdmin = user.role === 'school-admin';
  const roleLabel = isAdmin ? 'SUPER ADMIN' : isSchoolAdmin ? 'SCHOOL ADMIN' : user.role.toUpperCase();
  const roleBadgeClass = isAdmin
    ? styles.roleBadgeAdmin
    : isSchoolAdmin
      ? styles.roleBadgeSchool
      : styles.roleBadgeTeacher;

  return (
    <div className={styles.wrap}>
      <div className={styles.headerRow}>
        <div>
          <span className={`${styles.roleBadge} ${roleBadgeClass}`}>{roleLabel}</span>
          <h1 style={{ margin: 0, color: '#0b2240' }}>
            {isAdmin ? 'Tổng quan hệ thống' : 'Tổng quan trường'}
          </h1>
        </div>
        <button className={styles.refreshBtn} onClick={load} disabled={isLoading}>
          <RefreshCw size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          {isLoading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: 12, borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className={styles.kpiGrid}>
        <Kpi label="Lớp học" value={stats?.totalClasses ?? 0} />
        <Kpi label="Học sinh" value={stats?.totalStudents ?? 0} />
        <Kpi label="Đề thi" value={stats?.totalExams ?? 0} hint={stats ? `${stats.publishedExams} đã phát hành` : undefined} />
        <Kpi label="Bài nộp" value={stats?.totalSubmissions ?? 0} />
        <Kpi label="ĐTB điểm" value={stats?.avgScore?.toFixed?.(2) ?? '0.00'} hint="/10" />
        <Kpi label="Tỉ lệ đạt" value={stats ? `${stats.passRate}%` : '0%'} />
      </div>

      <div className={styles.row}>
        <div className={styles.listCard}>
          <h3 className={styles.listTitle}>Bài nộp gần đây</h3>
          {(stats?.recentSubmissions ?? []).length === 0 && <div className={styles.empty}>Chưa có dữ liệu</div>}
          {(stats?.recentSubmissions ?? []).map((s) => (
            <div key={s.id} className={styles.listItem}>
              <span>
                {s.student?.name ?? '—'}
                {s.exam ? ` · ${s.exam.title}` : ''}
              </span>
              <span>
                {s.maxScore > 0 ? `${s.score} / ${s.maxScore}` : s.score}
                {' · '}
                {formatDate(s.createdAt)}
              </span>
            </div>
          ))}
        </div>
        <div className={styles.listCard}>
          <h3 className={styles.listTitle}>Phúc khảo đang chờ</h3>
          <div className={styles.listItem}>
            <span>Số yêu cầu đang xử lý</span>
            <span>{stats?.pendingAppeals ?? 0}</span>
          </div>
          <div className={styles.empty} style={{ paddingTop: 12 }}>
            Truy cập <strong>Phúc khảo</strong> trong menu để xử lý.
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test, expect PASS**

Run: `cd client/web && npx jest --silent --testPathPattern=RoleDashboard.test.tsx`
Expected: PASS.

- [ ] **Step 6: Type-check**

Run: `cd client/web && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add client/web/src/presentation/components/RoleDashboard.tsx \
        client/web/src/presentation/components/RoleDashboard.module.css \
        client/web/src/presentation/components/RoleDashboard.test.tsx
git commit -m "feat(role-aware): RoleDashboard component reusing analytics service"
```

---

## Task 2: Wire DashboardPage through RoleDashboard

**Files:**
- Modify: `client/web/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Read DashboardPage and replace its body**

Read the file end-to-end. Then replace its default export body with:

```tsx
import RoleDashboard from '../presentation/components/RoleDashboard';

export default function DashboardPage() {
  return <RoleDashboard />;
}
```

Keep the same export signature (default or named) so the route table is untouched. If the file is `DashboardPage.module.css` based, keep the import path the same.

- [ ] **Step 2: Type-check**

Run: `cd client/web && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add client/web/src/pages/DashboardPage.tsx
git commit -m "refactor: route DashboardPage through RoleDashboard"
```

---

## Task 3: Add AdminDashboardPage and SchoolAdminDashboardPage

**Files:**
- Create: `client/web/src/pages/AdminDashboardPage.tsx`
- Create: `client/web/src/pages/SchoolAdminDashboardPage.tsx`

- [ ] **Step 1: Write AdminDashboardPage**

```tsx
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
```

- [ ] **Step 2: Write SchoolAdminDashboardPage**

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../presentation/store/authStore';
import RoleDashboard from '../presentation/components/RoleDashboard';

export default function SchoolAdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== 'school-admin') navigate('/', { replace: true });
  }, [user, navigate]);

  return <RoleDashboard />;
}
```

- [ ] **Step 3: Type-check**

Run: `cd client/web && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add client/web/src/pages/AdminDashboardPage.tsx \
        client/web/src/pages/SchoolAdminDashboardPage.tsx
git commit -m "feat(role-aware): admin and school-admin dashboard wrappers"
```

---

## Task 4: Update AppRoutes for `/admin`, `/school`, and role-based redirect

**Files:**
- Modify: `client/web/src/presentation/routes/AppRoutes.tsx`

- [ ] **Step 1: Read AppRoutes end-to-end**

Take note of:
- Existing `PublicOnlyRoute` redirect logic (currently goes to `/` for non-student roles).
- Where `DashboardPage` is imported and used.
- Whether the file has any unused `AdminRoute`/`SchoolRoute` references from the recent revert.

- [ ] **Step 2: Add imports for the two new pages**

Add at top alongside the other `pages/...` imports:

```tsx
import AdminDashboardPage from '../../pages/AdminDashboardPage';
import SchoolAdminDashboardPage from '../../pages/SchoolAdminDashboardPage';
```

- [ ] **Step 3: Update PublicOnlyRoute redirect target**

Replace its body so role-based redirect works:

```tsx
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const userRole = useAuthStore((state) => state.user?.role);
  if (isLoading) return null;
  if (!isAuthenticated) return <>{children}</>;
  let target = '/';
  if (userRole === 'student') target = '/my-scores';
  else if (userRole === 'admin') target = '/admin';
  else if (userRole === 'school-admin') target = '/school';
  return <Navigate to={target} replace />;
}
```

- [ ] **Step 4: Add `/admin` and `/school` routes inside the protected Layout**

Add right after the `<Route index element={<DashboardPage />} />` line (inside the same `<Route path="/" element={<Layout />}>` parent):

```tsx
<Route path="admin" element={<AdminDashboardPage />} />
<Route path="school" element={<SchoolAdminDashboardPage />} />
```

- [ ] **Step 5: Type-check**

Run: `cd client/web && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add client/web/src/presentation/routes/AppRoutes.tsx
git commit -m "feat(role-aware): route admin and school-admin to dedicated dashboards"
```

---

## Task 5: Rewrite Layout sidebar with grouped, role-filtered nav

**Files:**
- Modify: `client/web/src/presentation/components/Layout.tsx`
- Modify: `client/web/src/presentation/components/Layout.module.css`

- [ ] **Step 1: Append sidebar styles**

Append (or update if already present) at the bottom of `Layout.module.css`:

```css
.sidebarSection {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}
.navGroupLabel {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: #9ca3af;
  padding: 12px 16px 4px;
  margin-top: 8px;
}
.navDivider {
  height: 1px;
  background: #e5e7eb;
  margin: 8px 12px;
}
.activeAdmin { border-left-color: #0b2240; }
.activeSchool { border-left-color: #2563eb; }
.activeTeacher { border-left-color: #059669; }
```

If `.navGroupLabel` / `.navDivider` already exist (we saw they do at lines 252-266), overwrite their values rather than duplicating.

- [ ] **Step 2: Rewrite Layout.tsx with grouped nav**

Replace the entire file:

```tsx
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
      { to: '/analytics', label: 'Thống kê', roles: ['admin', 'school-admin', 'teacher'] },
      { to: '/scan', label: 'Quét OMR', roles: ['teacher', 'school-admin'] },
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
```

- [ ] **Step 3: Type-check**

Run: `cd client/web && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Write Layout visibility test**

Create `client/web/src/presentation/components/Layout.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

function mockAuth(role: 'admin' | 'school-admin' | 'teacher' | 'student') {
  jest.doMock('../store/authStore', () => ({
    useAuthStore: (sel: any) => sel({
      user: { _id: 'u', name: 'X', email: 'x@x', role, isEmailVerified: true },
      logout: jest.fn(),
    }),
  }));
}

describe('Layout nav filtering', () => {
  afterEach(() => jest.resetModules());

  it('shows system dashboard for admin and hides student items', () => {
    mockAuth('admin');
    const { default: AdminLayout } = require('./Layout');
    render(<MemoryRouter><AdminLayout /></MemoryRouter>);
    expect(screen.getByText(/Dashboard hệ thống/i)).toBeInTheDocument();
    expect(screen.queryByText(/Điểm của tôi/i)).toBeNull();
  });

  it('shows school dashboard for school-admin', () => {
    mockAuth('school-admin');
    const { default: SchoolLayout } = require('./Layout');
    render(<MemoryRouter><SchoolLayout /></MemoryRouter>);
    expect(screen.getByText(/Dashboard trường/i)).toBeInTheDocument();
    expect(screen.queryByText(/Dashboard hệ thống/i)).toBeNull();
  });

  it('shows my-scores for student', () => {
    mockAuth('student');
    const { default: StudentLayout } = require('./Layout');
    render(<MemoryRouter><StudentLayout /></MemoryRouter>);
    expect(screen.getByText(/Điểm của tôi/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run tests, expect PASS**

Run: `cd client/web && npx jest --silent --testPathPattern=Layout.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client/web/src/presentation/components/Layout.tsx \
        client/web/src/presentation/components/Layout.module.css \
        client/web/src/presentation/components/Layout.test.tsx
git commit -m "feat(role-aware): grouped, role-filtered sidebar nav"
```

---

## Task 6: Wire LoginPage post-login redirect by role

**Files:**
- Modify: `client/web/src/pages/LoginPage.tsx`

- [ ] **Step 1: Read LoginPage**

Find the post-login navigation call (likely `navigate('/')` or `navigate('/dashboard')`). Capture the existing line and surrounding context.

- [ ] **Step 2: Replace with role-aware redirect**

Match the surrounding context (likely inside `onSubmit` after `await login(...)` succeeds). Replace the existing target with:

```tsx
const role = useAuthStore.getState().user?.role;
let target = '/';
if (role === 'admin') target = '/admin';
else if (role === 'school-admin') target = '/school';
else if (role === 'student') target = '/my-scores';
navigate(target, { replace: true });
```

Make sure `useAuthStore` is imported (it usually is in `LoginPage`). If not, add `import { useAuthStore } from '../presentation/store/authStore';`.

- [ ] **Step 3: Type-check**

Run: `cd client/web && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add client/web/src/pages/LoginPage.tsx
git commit -m "feat(role-aware): post-login redirect by role"
```

---

## Task 7: Verification pass

**Files:** none modified unless fixes needed.

- [ ] **Step 1: Run full type check**

Run: `cd client/web && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2: Run targeted jest suites**

Run:
```bash
cd client/web && npx jest --silent --testPathPattern="RoleDashboard.test.tsx|Layout.test.tsx"
```
Expected: all green.

- [ ] **Step 3: Manual smoke test**

Using credentials in `docs/superpowers/notes/test-credentials.md`:
- Log in as admin (`mahndugn3@gmail.com / admin123`) → URL `/admin`, sidebar shows "Dashboard hệ thống", no "Điểm của tôi".
- Log in as school-admin (`mahndugn1@gmail.com / admin123`) → URL `/school`, sidebar shows "Dashboard trường".
- Log in as teacher → URL `/`, sidebar shows "Dashboard" but no admin/school items.
- Log in as student → URL `/my-scores`, sidebar shows "Điểm của tôi".

- [ ] **Step 4: Final commit (only if fixes were needed)**

```bash
git add -A
git commit -m "chore(role-aware): verification fixes"
```

---

## Self-Review Checklist

- [ ] All four roles (`admin`, `school-admin`, `teacher`, `student`) have a working redirect target after login.
- [ ] Sidebar shows only role-appropriate items.
- [ ] `/admin` and `/school` routes are wired and gated (effect redirects other roles).
- [ ] All new components have CSS modules next to the `.tsx`.
- [ ] All new components have at least one Jest test.
- [ ] No new backend code needed — only frontend changes.
- [ ] No git stash entries touched.
- [ ] All commits use the `feat(role-aware):` / `refactor:` / `chore:` prefix.

## Out of Scope (deferred)

- Replacing every existing placeholder page with `EntityListPage`.
- Adding admin-only CRUD pages (SchoolsPage, UsersPage) — separate plan.
- Adding school-only CRUD pages (school Classes, Students, etc.) — separate plan.
- Per-page role-gating for `ClassesPage`, `ExamsPage`, etc. — separate plan.
