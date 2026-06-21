# Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm trang `/admin` với Dashboard stats, Schools CRUD (super-admin), Users CRUD (super-admin + school-admin) trên React web client.

**Architecture:** React web client — thêm pages mới trong `src/pages/`, thêm routes trong `AppRoutes.tsx`, mở rộng sidebar trong `Layout.tsx`. Backend schools/users service đã tồn tại — chỉ cần verify chúng support đầy đủ features.

**Tech Stack:** React 18 + TypeScript + Zustand + React Hook Form + Yup + Lucide React

---

## File Structure

```
client/web/src/
├── pages/
│   └── admin/
│       ├── AdminDashboard.tsx           (NEW)
│       ├── SchoolsPage.tsx              (NEW)
│       └── UsersPage.tsx                (NEW)
├── presentation/
│   ├── store/
│   │   └── adminStore.ts               (NEW — shared state for admin)
│   └── components/
│       └── Layout.tsx                   (MODIFY — add admin nav items)
└── presentation/routes/
    └── AppRoutes.tsx                    (MODIFY — add admin routes)
```

**Backend đã có:** `server/src/services/school.service.js`, `server/src/services/user.service.js`, `server/src/routes/v1/school.route.js`, `server/src/routes/v1/user.route.js`. KHÔNG cần thay đổi backend trừ khi spec yêu cầu.

---

## Task 1: Add Admin Navigation to Sidebar

**Files:**
- Modify: `client/web/src/presentation/components/Layout.tsx:20-31` (allNavItems array)

- [ ] **Step 1: Read current Layout.tsx to see full navItems**

Read the file completely before editing.

- [ ] **Step 2: Add admin nav items to allNavItems**

Locate line 21 where `allNavItems` starts. Add admin items **before** the existing items array:

Find this section (around line 20-31):

```tsx
const allNavItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'teacher'] },
  { path: '/classes', icon: GraduationCap, label: 'Classes', roles: ['admin', 'teacher'] },
  // ... rest of items
];
```

Replace with:

```tsx
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
  { path: '/ai-tutor', icon: Brain, label: 'AI Tutor', roles: ['admin', 'teacher'] },
  { path: '/my-scores', icon: ClipboardList, label: 'Điểm của tôi', roles: ['student'] },
  { path: '/my-appeals', icon: Scale, label: 'Phúc khảo', roles: ['student'] },
  { path: '/settings', icon: Settings, label: 'Settings', roles: ['admin', 'teacher', 'student'] },
];
```

- [ ] **Step 3: Add Building2 import**

Find the import from `lucide-react` at the top of `Layout.tsx` (line 2-16). Add `Building2` to the import:

```tsx
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
  Brain,
  ClipboardList,
  Scale,
  Building2,
  Users,
} from 'lucide-react';
```

- [ ] **Step 4: Group admin nav items visually in sidebar**

In the sidebar rendering (around line 68), add a group separator. Find the `.map` rendering the nav items:

```tsx
<nav className={styles.nav}>
  {/* Render admin items with a divider */}
  {(() => {
    const adminItems = navItems.filter((item) => (item as any).group === 'admin');
    const mainItems = navItems.filter((item) => !(item as any).group);
    if (adminItems.length === 0) return null;
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
```

Add the group-label and divider styles to `Layout.module.css`:

- [ ] **Step 5: Add CSS for admin group label and divider**

Open `client/web/src/presentation/components/Layout.module.css` and append these styles:

```css
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
  background: #374151;
  margin: 8px 12px;
}
```

- [ ] **Step 6: Verify sidebar renders admin items for admin role**

No automated test needed — visual verification is sufficient for this UI-only change.

- [ ] **Step 7: Commit**

```bash
cd "C:/TAILIEU/DATN/SMART GRADING"
git add client/web/src/presentation/components/Layout.tsx client/web/src/presentation/components/Layout.module.css
git commit -m "feat(web): add admin nav items to sidebar"
```

---

## Task 2: Add Admin Routes

**Files:**
- Modify: `client/web/src/presentation/routes/AppRoutes.tsx:1-133`

- [ ] **Step 1: Import admin pages**

At the top of `AppRoutes.tsx`, add imports (put after existing page imports):

```tsx
import AdminDashboard from '../../pages/admin/AdminDashboard';
import SchoolsPage from '../../pages/admin/SchoolsPage';
import UsersPage from '../../pages/admin/UsersPage';
```

- [ ] **Step 2: Add AdminRoute wrapper component**

After the `PublicOnlyRoute` component (after line 47), add:

```tsx
function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const userRole = useAuthStore((state) => state.user?.role);
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (userRole !== 'admin' && userRole !== 'school-admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 3: Add admin routes inside the protected Layout route**

Find the `<Route path="*" element={<NotFoundPage />} />` at the end of the protected routes (line 130). Add admin routes BEFORE the 404 catch-all:

```tsx
          <Route path="ai-tutor" element={<AITutorPage />} />

          {/* Admin routes */}
          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="admin/schools"
            element={
              <AdminRoute>
                <SchoolsPage />
              </AdminRoute>
            }
          />
          <Route
            path="admin/users"
            element={
              <AdminRoute>
                <UsersPage />
              </AdminRoute>
            }
          />
        </Route>

        {/* Catch-all 404 route */}
        <Route path="*" element={<NotFoundPage />} />
```

- [ ] **Step 4: Verify imports resolve**

Run TypeScript check:

```bash
cd "C:/TAILIEU/DATN/SMART GRADING/client/web"
npx tsc --noEmit 2>&1 | head -30
```

Expected: errors about missing modules `AdminDashboard`, `SchoolsPage`, `UsersPage` — that's expected until we create them in Tasks 3-5.

- [ ] **Step 5: Commit**

```bash
cd "C:/TAILIEU/DATN/SMART GRADING"
git add client/web/src/presentation/routes/AppRoutes.tsx
git commit -m "feat(web): add admin route wrappers and route definitions"
```

---

## Task 3: Create Admin Store (Zustand)

**Files:**
- Create: `client/web/src/presentation/store/adminStore.ts`

- [ ] **Step 1: Create the admin store**

Create the file `client/web/src/presentation/store/adminStore.ts`:

```tsx
import { create } from 'zustand';
import { apiService } from '../../core/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface School {
  _id: string;
  id?: string;
  name: string;
  code: string;
  type: 'THPT' | 'THCS' | 'TH' | 'Mầm non' | string;
  address?: string;
  phone?: string;
  email?: string;
  principal?: string;
  gradingScale?: number;
  passingScore?: number;
  gradeLevels?: { min: number; max: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUser {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: 'admin' | 'school-admin' | 'teacher' | 'student' | 'parent';
  phone?: string;
  schoolId?: string;
  schoolName?: string;
  classId?: string;
  className?: string;
  studentCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminStats {
  totalSchools: number;
  schoolsGrowth: number; // count created this month
  totalUsers: number;
  usersGrowth: number;
  totalClasses: number;
  classesGrowth: number;
  totalSubmissions: number;
  submissionsToday: number;
}

export interface PaginatedResult<T> {
  results: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ─── Store Interface ────────────────────────────────────────────────────────────

interface AdminState {
  // Schools
  schools: School[];
  schoolsPagination: { page: number; total: number; pages: number };
  schoolsLoading: boolean;
  schoolsError: string | null;

  // Users
  users: AdminUser[];
  usersPagination: { page: number; total: number; pages: number };
  usersLoading: boolean;
  usersError: string | null;

  // Stats
  stats: AdminStats | null;
  statsLoading: boolean;
  statsError: string | null;

  // Classes (for user form dropdown)
  classes: { _id: string; name: string; code: string }[];
  classesLoading: boolean;

  // Schools actions
  fetchSchools: (params?: { search?: string; type?: string; page?: number; limit?: number }) => Promise<void>;
  createSchool: (data: Partial<School>) => Promise<School>;
  updateSchool: (id: string, data: Partial<School>) => Promise<School>;
  deleteSchool: (id: string) => Promise<void>;

  // Users actions
  fetchUsers: (params?: { search?: string; role?: string; schoolId?: string; page?: number; limit?: number }) => Promise<void>;
  createUser: (data: Partial<AdminUser>) => Promise<AdminUser>;
  updateUser: (id: string, data: Partial<AdminUser>) => Promise<AdminUser>;
  deleteUser: (id: string) => Promise<void>;

  // Stats actions
  fetchStats: (schoolId?: string) => Promise<void>;

  // Classes (for dropdown)
  fetchClasses: (schoolId?: string) => Promise<void>;

  // Clear errors
  clearErrors: () => void;
}

// ─── Store Implementation ──────────────────────────────────────────────────────

export const useAdminStore = create<AdminState>((set, get) => ({
  // Initial state
  schools: [],
  schoolsPagination: { page: 1, total: 0, pages: 0 },
  schoolsLoading: false,
  schoolsError: null,
  users: [],
  usersPagination: { page: 1, total: 0, pages: 0 },
  usersLoading: false,
  usersError: null,
  stats: null,
  statsLoading: false,
  statsError: null,
  classes: [],
  classesLoading: false,

  // ── Schools ──────────────────────────────────────────────────────────────────

  fetchSchools: async (params = {}) => {
    set({ schoolsLoading: true, schoolsError: null });
    try {
      const { page = 1, limit = 10, search, type } = params;
      const query: Record<string, string | number> = { page, limit };
      if (search) query['search'] = search;
      if (type) query['type'] = type;

      const res = await apiService.get<PaginatedResult<School>>('/schools', { params: query });
      set({
        schools: res.results,
        schoolsPagination: { page: res.page, total: res.total, pages: res.pages },
        schoolsLoading: false,
      });
    } catch (err: any) {
      set({ schoolsError: err.message || 'Failed to load schools', schoolsLoading: false });
    }
  },

  createSchool: async (data) => {
    const school = await apiService.post<School>('/schools', data);
    const { schools, schoolsPagination } = get();
    set({
      schools: [school, ...schools],
      schoolsPagination: { ...schoolsPagination, total: schoolsPagination.total + 1 },
    });
    return school;
  },

  updateSchool: async (id, data) => {
    const school = await apiService.patch<School>(`/schools/${id}`, data);
    const { schools } = get();
    set({ schools: schools.map((s) => (s._id === id || s.id === id ? school : s)) });
    return school;
  },

  deleteSchool: async (id) => {
    await apiService.delete(`/schools/${id}`);
    const { schools, schoolsPagination } = get();
    set({
      schools: schools.filter((s) => s._id !== id && s.id !== id),
      schoolsPagination: { ...schoolsPagination, total: Math.max(0, schoolsPagination.total - 1) },
    });
  },

  // ── Users ───────────────────────────────────────────────────────────────────

  fetchUsers: async (params = {}) => {
    set({ usersLoading: true, usersError: null });
    try {
      const { page = 1, limit = 10, search, role, schoolId } = params;
      const query: Record<string, string | number> = { page, limit };
      if (search) query['search'] = search;
      if (role) query['role'] = role;
      if (schoolId) query['schoolId'] = schoolId;

      const res = await apiService.get<PaginatedResult<AdminUser>>('/users', { params: query });
      set({
        users: res.results,
        usersPagination: { page: res.page, total: res.total, pages: res.pages },
        usersLoading: false,
      });
    } catch (err: any) {
      set({ usersError: err.message || 'Failed to load users', usersLoading: false });
    }
  },

  createUser: async (data) => {
    const user = await apiService.post<AdminUser>('/users', data);
    const { users, usersPagination } = get();
    set({
      users: [user, ...users],
      usersPagination: { ...usersPagination, total: usersPagination.total + 1 },
    });
    return user;
  },

  updateUser: async (id, data) => {
    const user = await apiService.patch<AdminUser>(`/users/${id}`, data);
    const { users } = get();
    set({ users: users.map((u) => (u._id === id || u.id === id ? user : u)) });
    return user;
  },

  deleteUser: async (id) => {
    await apiService.delete(`/users/${id}`);
    const { users, usersPagination } = get();
    set({
      users: users.filter((u) => u._id !== id && u.id !== id),
      usersPagination: { ...usersPagination, total: Math.max(0, usersPagination.total - 1) },
    });
  },

  // ── Stats ────────────────────────────────────────────────────────────────────

  fetchStats: async (schoolId) => {
    set({ statsLoading: true, statsError: null });
    try {
      // Fetch all 4 stats in parallel
      const [schoolsRes, usersRes, classesRes, submissionsRes] = await Promise.allSettled([
        apiService.get<PaginatedResult<School>>('/schools', { params: { limit: 1 } }),
        apiService.get<PaginatedResult<AdminUser>>('/users', { params: { limit: 1, ...(schoolId ? { schoolId } : {}) } }),
        apiService.get<PaginatedResult<any>>('/classes', { params: { limit: 1, ...(schoolId ? { schoolId } : {}) } }),
        apiService.get<PaginatedResult<any>>('/submissions', { params: { limit: 1, ...(schoolId ? { schoolId } : {}) } }),
      ]);

      const totalSchools = schoolsRes.status === 'fulfilled' ? schoolsRes.value.total : 0;
      const totalUsers = usersRes.status === 'fulfilled' ? usersRes.value.total : 0;
      const totalClasses = classesRes.status === 'fulfilled' ? classesRes.value.total : 0;
      const totalSubmissions = submissionsRes.status === 'fulfilled' ? submissionsRes.value.total : 0;

      set({
        stats: {
          totalSchools,
          schoolsGrowth: 0,
          totalUsers,
          usersGrowth: 0,
          totalClasses,
          classesGrowth: 0,
          totalSubmissions,
          submissionsToday: 0,
        },
        statsLoading: false,
      });
    } catch (err: any) {
      set({ statsError: err.message || 'Failed to load stats', statsLoading: false });
    }
  },

  // ── Classes (dropdown) ──────────────────────────────────────────────────────

  fetchClasses: async (schoolId) => {
    set({ classesLoading: true });
    try {
      const params: Record<string, string | number> = { limit: 500 };
      if (schoolId) params['schoolId'] = schoolId;
      const res = await apiService.get<PaginatedResult<{ _id: string; name: string; code: string }>>('/classes', { params });
      set({ classes: res.results, classesLoading: false });
    } catch {
      set({ classes: [], classesLoading: false });
    }
  },

  clearErrors: () => set({ schoolsError: null, usersError: null, statsError: null }),
}));
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "C:/TAILIEU/DATN/SMART GRADING/client/web"
npx tsc --noEmit 2>&1 | grep -E "(adminStore|error)" | head -20
```

Expected: No errors related to adminStore.

- [ ] **Step 3: Commit**

```bash
cd "C:/TAILIEU/DATN/SMART GRADING"
git add client/web/src/presentation/store/adminStore.ts
git commit -m "feat(web): create adminStore for schools/users/stats state management"
```

---

## Task 4: Create AdminDashboard Page

**Files:**
- Create: `client/web/src/pages/admin/AdminDashboard.tsx`
- Create: `client/web/src/pages/admin/AdminDashboard.module.css`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p "C:/TAILIEU/DATN/SMART GRADING/client/web/src/pages/admin"
```

- [ ] **Step 2: Create AdminDashboard.tsx**

Create `client/web/src/pages/admin/AdminDashboard.tsx`:

```tsx
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  GraduationCap,
  FileText,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useAdminStore } from '../../presentation/store/adminStore';
import { useAuthStore } from '../../presentation/store/authStore';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
  const userRole = useAuthStore((state) => state.user?.role);
  const userSchoolId = useAuthStore((state) => state.user?.schoolId);
  const {
    stats,
    statsLoading,
    statsError,
    schools,
    users,
    fetchStats,
    fetchSchools,
    fetchUsers,
  } = useAdminStore();

  useEffect(() => {
    fetchStats(userSchoolId);
    fetchSchools({ limit: 5 });
    fetchUsers({ limit: 5 });
  }, []);

  const handleRefresh = () => {
    fetchStats(userSchoolId);
    fetchSchools({ limit: 5 });
    fetchUsers({ limit: 5 });
  };

  const isSchoolAdmin = userRole === 'school-admin';
  const isSuperAdmin = userRole === 'admin';

  const statCards = useMemo(() => {
    if (isSchoolAdmin) {
      return [
        { label: 'Tổng Users', value: stats?.totalUsers ?? 0, icon: Users, color: '#6366f1', sub: 'Người dùng trong trường' },
        { label: 'Tổng Lớp', value: stats?.totalClasses ?? 0, icon: GraduationCap, color: '#3b82f6', sub: 'Lớp học' },
        { label: 'Tổng Bài nộp', value: stats?.totalSubmissions ?? 0, icon: FileText, color: '#10b981', sub: 'Bài đã chấm' },
      ];
    }
    return [
      { label: 'Trường học', value: stats?.totalSchools ?? 0, icon: Building2, color: '#6366f1', sub: 'Trường đang hoạt động' },
      { label: 'Tổng Users', value: stats?.totalUsers ?? 0, icon: Users, color: '#3b82f6', sub: 'Người dùng' },
      { label: 'Tổng Lớp', value: stats?.totalClasses ?? 0, icon: GraduationCap, color: '#10b981', sub: 'Lớp học' },
      { label: 'Tổng Bài nộp', value: stats?.totalSubmissions ?? 0, icon: FileText, color: '#f59e0b', sub: 'Bài đã chấm' },
    ];
  }, [stats, isSchoolAdmin]);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.subtitle}>
            {isSuperAdmin
              ? 'Tổng quan hệ thống'
              : `Tổng quan trường học`}
          </p>
        </div>
        <button className={styles.refreshBtn} onClick={handleRefresh} disabled={statsLoading}>
          <RefreshCw size={16} className={statsLoading ? styles.spinning : ''} />
          Làm mới
        </button>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        {statCards.map((card) => (
          <div key={card.label} className={styles.statCard} style={{ '--accent-color': card.color } as React.CSSProperties}>
            <div className={styles.statIcon} style={{ background: `${card.color}20`, color: card.color }}>
              <card.icon size={24} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>
                {statsLoading ? (
                  <span className={styles.skeleton} style={{ width: '60px', height: '28px' }} />
                ) : (
                  card.value.toLocaleString('vi-VN')
                )}
              </span>
              <span className={styles.statLabel}>{card.label}</span>
              <span className={styles.statSub}>{card.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {statsError && (
        <div className={styles.errorBanner}>
          Không tải được dữ liệu: {statsError}
        </div>
      )}

      {/* Recent Lists */}
      <div className={styles.recentGrid}>
        {/* Recent Schools */}
        {isSuperAdmin && (
          <div className={styles.recentCard}>
            <div className={styles.recentHeader}>
              <h2 className={styles.recentTitle}>Trường gần đây</h2>
              <Link to="/admin/schools" className={styles.viewAll}>
                Xem tất cả <ArrowRight size={14} />
              </Link>
            </div>
            <div className={styles.recentList}>
              {schools.length === 0 && !useAdminStore.getState().schoolsLoading ? (
                <p className={styles.emptyText}>Chưa có trường nào.</p>
              ) : (
                schools.slice(0, 5).map((school) => (
                  <div key={school._id || school.id} className={styles.recentItem}>
                    <div className={styles.recentItemIcon}>
                      <Building2 size={16} />
                    </div>
                    <div className={styles.recentItemContent}>
                      <span className={styles.recentItemName}>{school.name}</span>
                      <span className={styles.recentItemMeta}>{school.code} · {school.type}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Recent Users */}
        <div className={styles.recentCard}>
          <div className={styles.recentHeader}>
            <h2 className={styles.recentTitle}>Người dùng gần đây</h2>
            <Link to="/admin/users" className={styles.viewAll}>
              Xem tất cả <ArrowRight size={14} />
            </Link>
          </div>
          <div className={styles.recentList}>
            {users.length === 0 ? (
              <p className={styles.emptyText}>Chưa có người dùng nào.</p>
            ) : (
              users.slice(0, 5).map((user) => (
                <div key={user._id || user.id} className={styles.recentItem}>
                  <div className={styles.recentItemIcon} style={{ background: '#6366f120', color: '#6366f1' }}>
                    <Users size={16} />
                  </div>
                  <div className={styles.recentItemContent}>
                    <span className={styles.recentItemName}>{user.name}</span>
                    <span className={styles.recentItemMeta}>
                      {user.role} {user.schoolName ? `· ${user.schoolName}` : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Thao tác nhanh</h2>
        <div className={styles.actionButtons}>
          {isSuperAdmin && (
            <Link to="/admin/schools" className={styles.actionBtn}>
              <Building2 size={18} />
              Thêm Trường
            </Link>
          )}
          <Link to="/admin/users" className={styles.actionBtn}>
            <Users size={18} />
            Thêm Người Dùng
          </Link>
          <Link to="/admin/users" className={styles.actionBtn}>
            <GraduationCap size={18} />
            Quản lý Lớp
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create AdminDashboard.module.css**

Create `client/web/src/pages/admin/AdminDashboard.module.css`:

```css
.page {
  padding: 24px 32px;
  max-width: 1400px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px;
}

.subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.refreshBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.refreshBtn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.refreshBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinning {
  animation: spin 1s linear infinite;
}

/* Stats Cards */
.statsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.statCard {
  display: flex;
  align-items: center;
  gap: 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  transition: box-shadow 0.15s;
}

.statCard:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.statIcon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.statContent {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.statValue {
  font-size: 26px;
  font-weight: 700;
  color: #111827;
  line-height: 1;
}

.statLabel {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.statSub {
  font-size: 12px;
  color: #9ca3af;
}

.skeleton {
  display: inline-block;
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Error */
.errorBanner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 12px 16px;
  color: #dc2626;
  font-size: 14px;
  margin-bottom: 16px;
}

/* Recent Lists */
.recentGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.recentCard {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
}

.recentHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.recentTitle {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.viewAll {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #6366f1;
  text-decoration: none;
  font-weight: 500;
}

.viewAll:hover {
  text-decoration: underline;
}

.recentList {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recentItem {
  display: flex;
  align-items: center;
  gap: 12px;
}

.recentItemIcon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #f3f4f6;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.recentItemContent {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.recentItemName {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recentItemMeta {
  font-size: 12px;
  color: #9ca3af;
  text-transform: capitalize;
}

.emptyText {
  font-size: 14px;
  color: #9ca3af;
  margin: 0;
  text-align: center;
  padding: 16px 0;
}

/* Quick Actions */
.quickActions {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
}

.sectionTitle {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px;
}

.actionButtons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.actionBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  text-decoration: none;
  transition: all 0.15s;
}

.actionBtn:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #111827;
}
```

- [ ] **Step 4: Commit**

```bash
cd "C:/TAILIEU/DATN/SMART GRADING"
git add client/web/src/pages/admin/
git commit -m "feat(web): create AdminDashboard page with stats cards and recent lists"
```

---

## Task 5: Create SchoolsPage

**Files:**
- Create: `client/web/src/pages/admin/SchoolsPage.tsx`
- Create: `client/web/src/pages/admin/SchoolsPage.module.css`

- [ ] **Step 1: Create SchoolsPage.tsx**

Create `client/web/src/pages/admin/SchoolsPage.tsx`:

```tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAdminStore, type School } from '../../presentation/store/adminStore';
import styles from './SchoolsPage.module.css';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SchoolFormData {
  name: string;
  code: string;
  type: string;
  address: string;
  phone: string;
  email: string;
  principal: string;
  gradingScale: number;
  passingScore: number;
  gradeLevelsMin: number;
  gradeLevelsMax: number;
}

const EMPTY_FORM: SchoolFormData = {
  name: '',
  code: '',
  type: 'THPT',
  address: '',
  phone: '',
  email: '',
  principal: '',
  gradingScale: 10,
  passingScore: 5,
  gradeLevelsMin: 1,
  gradeLevelsMax: 12,
};

const SCHOOL_TYPES = ['THPT', 'THCS', 'TH', 'Mầm non'];

const INITIAL_PAGE = 1;

// ─── Component ────────────────────────────────────────────────────────────────

export default function SchoolsPage() {
  const {
    schools,
    schoolsPagination,
    schoolsLoading,
    schoolsError,
    fetchSchools,
    createSchool,
    updateSchool,
    deleteSchool,
    clearErrors,
  } = useAdminStore();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(INITIAL_PAGE);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSchool, setEditSchool] = useState<School | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);
  const [formData, setFormData] = useState<SchoolFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback((s = search, t = typeFilter, p = page) => {
    fetchSchools({ search: s || undefined, type: t || undefined, page: p, limit: 10 });
  }, [fetchSchools, search, typeFilter, page]);

  useEffect(() => {
    load();
  }, []);

  // Debounced search
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      load(val, typeFilter, 1);
    }, 300);
  };

  const handleTypeFilter = (val: string) => {
    setTypeFilter(val);
    setPage(1);
    load(search, val, 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    load(search, typeFilter, newPage);
  };

  const openCreate = () => {
    setFormData(EMPTY_FORM);
    setFormError('');
    setEditSchool(null);
    setModalOpen(true);
  };

  const openEdit = (school: School) => {
    setFormData({
      name: school.name,
      code: school.code,
      type: school.type || 'THPT',
      address: school.address || '',
      phone: school.phone || '',
      email: school.email || '',
      principal: school.principal || '',
      gradingScale: school.gradingScale ?? 10,
      passingScore: school.passingScore ?? 5,
      gradeLevelsMin: school.gradeLevels?.min ?? 1,
      gradeLevelsMax: school.gradeLevels?.max ?? 12,
    });
    setFormError('');
    setEditSchool(school);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditSchool(null);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        type: formData.type,
        address: formData.address.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        principal: formData.principal.trim() || undefined,
        gradingScale: formData.gradingScale,
        passingScore: formData.passingScore,
        gradeLevels: { min: formData.gradeLevelsMin, max: formData.gradeLevelsMax },
      };
      if (editSchool) {
        const id = (editSchool._id || editSchool.id)!;
        await updateSchool(id, payload);
      } else {
        await createSchool(payload);
      }
      closeModal();
      load();
    } catch (err: any) {
      setFormError(err.message || 'Đã xảy ra lỗi, vui lòng thử lại.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await deleteSchool((deleteTarget._id || deleteTarget.id)!);
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      setFormError(err.message || 'Xóa thất bại.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const totalPages = schoolsPagination.pages || 1;
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý Trường học</h1>
          <p className={styles.subtitle}>Thêm, sửa, xóa trường học trong hệ thống</p>
        </div>
        <button className={styles.primaryBtn} onClick={openCreate}>
          <Plus size={16} />
          Thêm Trường
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <select
          className={styles.select}
          value={typeFilter}
          onChange={(e) => handleTypeFilter(e.target.value)}
        >
          <option value="">Tất cả loại</option>
          {SCHOOL_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Tìm tên trường..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => handleSearchChange('')}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {schoolsError && (
        <div className={styles.errorBanner}>{schoolsError}</div>
      )}

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tên trường</th>
              <th>Mã</th>
              <th>Loại</th>
              <th>Địa chỉ</th>
              <th>Hiệu trưởng</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {schoolsLoading && schools.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={styles.skeletonRow}>
                  <td><span className={styles.skeleton} style={{ width: '160px', height: '16px' }} /></td>
                  <td><span className={styles.skeleton} style={{ width: '50px', height: '16px' }} /></td>
                  <td><span className={styles.skeleton} style={{ width: '60px', height: '22px' }} /></td>
                  <td><span className={styles.skeleton} style={{ width: '120px', height: '16px' }} /></td>
                  <td><span className={styles.skeleton} style={{ width: '100px', height: '16px' }} /></td>
                  <td></td>
                </tr>
              ))
            ) : schools.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>
                  <Building2 size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p>Chưa có trường học nào.</p>
                  <button className={styles.linkBtn} onClick={openCreate}>Thêm Trường đầu tiên</button>
                </td>
              </tr>
            ) : (
              schools.map((school) => (
                <tr key={school._id || school.id}>
                  <td className={styles.nameCell}>
                    <div className={styles.schoolName}>{school.name}</div>
                  </td>
                  <td><code className={styles.codeTag}>{school.code}</code></td>
                  <td><span className={styles.typeBadge}>{school.type || '—'}</span></td>
                  <td className={styles.metaCell}>{school.address || '—'}</td>
                  <td className={styles.metaCell}>{school.principal || '—'}</td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.iconBtn} onClick={() => openEdit(school)} title="Sửa">
                        <Edit2 size={15} />
                      </button>
                      <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => setDeleteTarget(school)} title="Xóa">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          {pageNumbers.map((p) => (
            <button
              key={p}
              className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
              onClick={() => handlePageChange(p)}
            >
              {p}
            </button>
          ))}
          <button
            className={styles.pageBtn}
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editSchool ? 'Chỉnh Sửa Trường Học' : 'Thêm Trường Học'}
              </h2>
              <button className={styles.modalClose} onClick={closeModal}>
                <X size={18} />
              </button>
            </div>
            <form className={styles.modalForm} onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.label}>Tên trường <span className={styles.required}>*</span></label>
                  <input
                    className={styles.input}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="VD: THPT Nguyễn Huệ"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Mã trường <span className={styles.required}>*</span></label>
                  <input
                    className={styles.input}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                    placeholder="VD: NHTH"
                    maxLength={10}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Loại trường</label>
                  <select
                    className={styles.input}
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    {SCHOOL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.label}>Địa chỉ</label>
                  <input
                    className={styles.input}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="VD: 123 Đường ABC, Q.1, TP.HCM"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Số điện thoại</label>
                  <input
                    className={styles.input}
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="VD: 02812345678"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Email</label>
                  <input
                    className={styles.input}
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="VD: contact@school.edu.vn"
                  />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.label}>Hiệu trưởng</label>
                  <input
                    className={styles.input}
                    value={formData.principal}
                    onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                    placeholder="VD: Nguyễn Văn A"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Thang điểm</label>
                  <input
                    className={styles.input}
                    type="number"
                    value={formData.gradingScale}
                    onChange={(e) => setFormData({ ...formData, gradingScale: Number(e.target.value) })}
                    min={1}
                    max={100}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Điểm đạt</label>
                  <input
                    className={styles.input}
                    type="number"
                    value={formData.passingScore}
                    onChange={(e) => setFormData({ ...formData, passingScore: Number(e.target.value) })}
                    min={0}
                    max={formData.gradingScale}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Số khối (từ)</label>
                  <input
                    className={styles.input}
                    type="number"
                    value={formData.gradeLevelsMin}
                    onChange={(e) => setFormData({ ...formData, gradeLevelsMin: Number(e.target.value) })}
                    min={0}
                    max={12}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Số khối (đến)</label>
                  <input
                    className={styles.input}
                    type="number"
                    value={formData.gradeLevelsMax}
                    onChange={(e) => setFormData({ ...formData, gradeLevelsMax: Number(e.target.value) })}
                    min={0}
                    max={12}
                  />
                </div>
              </div>
              {formError && <div className={styles.formError}>{formError}</div>}
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={closeModal}>Hủy bỏ</button>
                <button type="submit" className={styles.submitBtn} disabled={formSubmitting}>
                  {formSubmitting ? 'Đang lưu...' : editSchool ? 'Lưu thay đổi' : 'Tạo Trường'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className={styles.confirmModal}>
            <h3 className={styles.confirmTitle}>Xóa Trường Học?</h3>
            <p className={styles.confirmText}>
              Bạn có chắc muốn xóa <strong>{deleteTarget.name}</strong>?
              Hành động này không thể hoàn tác.
            </p>
            {formError && <div className={styles.formError}>{formError}</div>}
            <div className={styles.confirmFooter}>
              <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)}>Hủy bỏ</button>
              <button className={`${styles.submitBtn} ${styles.danger}`} onClick={handleDelete} disabled={deleteSubmitting}>
                {deleteSubmitting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create SchoolsPage.module.css**

Create `client/web/src/pages/admin/SchoolsPage.module.css`:

```css
.page {
  padding: 24px 32px;
  max-width: 1400px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px;
}

.subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.primaryBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.primaryBtn:hover {
  background: #4f46e5;
}

/* Filters */
.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.select {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  color: #374151;
  cursor: pointer;
}

.searchWrap {
  position: relative;
  flex: 1;
  min-width: 240px;
}

.searchIcon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

.searchInput {
  width: 100%;
  padding: 8px 36px 8px 36px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #374151;
  box-sizing: border-box;
}

.searchInput:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.clearSearch {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  padding: 2px;
  display: flex;
  align-items: center;
}

/* Error */
.errorBanner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 12px 16px;
  color: #dc2626;
  font-size: 14px;
  margin-bottom: 16px;
}

/* Table */
.tableWrap {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.table thead tr {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.table th {
  text-align: left;
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table tbody tr {
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.1s;
}

.table tbody tr:last-child {
  border-bottom: none;
}

.table tbody tr:hover {
  background: #f9fafb;
}

.table td {
  padding: 12px 16px;
  color: #374151;
  vertical-align: middle;
}

.nameCell { font-weight: 500; color: #111827; }

.schoolName {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.codeTag {
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #374151;
}

.typeBadge {
  background: #e0e7ff;
  color: #4338ca;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}

.metaCell {
  color: #6b7280;
  font-size: 13px;
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.actions {
  display: flex;
  gap: 4px;
}

.iconBtn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}

.iconBtn:hover {
  background: #f3f4f6;
  color: #374151;
}

.iconBtn.danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

/* Empty */
.emptyRow {
  text-align: center;
  padding: 48px 16px !important;
  color: #9ca3af;
}

.linkBtn {
  background: none;
  border: none;
  color: #6366f1;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  margin-top: 8px;
}

/* Skeleton */
.skeletonRow td { padding: 16px; }

.skeleton {
  display: inline-block;
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 16px;
}

.pageBtn {
  min-width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.pageBtn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.pageBtn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pageBtnActive {
  background: #6366f1;
  border-color: #6366f1;
  color: white;
}

.pageBtnActive:hover {
  background: #4f46e5;
}

/* Modal */
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modalHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  background: white;
  border-radius: 16px 16px 0 0;
}

.modalTitle {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.modalClose {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: background 0.15s;
}

.modalClose:hover {
  background: #f3f4f6;
  color: #111827;
}

.modalForm {
  padding: 24px;
}

.formGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 8px;
}

.formGroup {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.required {
  color: #ef4444;
}

.input {
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #111827;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.formError {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 14px;
  color: #dc2626;
  font-size: 13px;
  margin: 12px 0;
}

.modalFooter {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid #f3f4f6;
  margin-top: 8px;
}

.cancelBtn {
  padding: 10px 18px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: background 0.15s;
}

.cancelBtn:hover {
  background: #f9fafb;
}

.submitBtn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #6366f1;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.submitBtn:hover:not(:disabled) {
  background: #4f46e5;
}

.submitBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.submitBtn.danger {
  background: #dc2626;
}

.submitBtn.danger:hover:not(:disabled) {
  background: #b91c1c;
}

/* Confirm Modal */
.confirmModal {
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.confirmTitle {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 12px;
}

.confirmText {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 16px;
  line-height: 1.5;
}

.confirmFooter {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
```

- [ ] **Step 3: Commit**

```bash
cd "C:/TAILIEU/DATN/SMART GRADING"
git add client/web/src/pages/admin/SchoolsPage.tsx client/web/src/pages/admin/SchoolsPage.module.css
git commit -m "feat(web): create SchoolsPage with CRUD, search, filter, pagination"
```

---

## Task 6: Create UsersPage

**Files:**
- Create: `client/web/src/pages/admin/UsersPage.tsx`
- Create: `client/web/src/pages/admin/UsersPage.module.css`

- [ ] **Step 1: Create UsersPage.tsx**

Create `client/web/src/pages/admin/UsersPage.tsx`:

```tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAdminStore, type AdminUser } from '../../presentation/store/adminStore';
import { useAuthStore } from '../../presentation/store/authStore';
import styles from './UsersPage.module.css';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface UserFormData {
  name: string;
  email: string;
  role: string;
  schoolId: string;
  classId: string;
  studentCode: string;
  phone: string;
}

const EMPTY_FORM: UserFormData = {
  name: '',
  email: '',
  role: 'teacher',
  schoolId: '',
  classId: '',
  studentCode: '',
  phone: '',
};

const ROLES = [
  { value: 'admin', label: 'Quản trị viên' },
  { value: 'school-admin', label: 'Quản trị trường' },
  { value: 'teacher', label: 'Giáo viên' },
  { value: 'student', label: 'Học sinh' },
  { value: 'parent', label: 'Phụ huynh' },
];

const INITIAL_PAGE = 1;

// ─── Component ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const userRole = useAuthStore((state) => state.user?.role);
  const userSchoolId = useAuthStore((state) => state.user?.schoolId);
  const {
    users,
    usersPagination,
    usersLoading,
    usersError,
    schools,
    classes,
    classesLoading,
    fetchUsers,
    fetchSchools,
    fetchClasses,
    createUser,
    updateUser,
    deleteUser,
  } = useAdminStore();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(INITIAL_PAGE);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState<UserFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  const isSuperAdmin = userRole === 'admin';
  const isSchoolAdmin = userRole === 'school-admin';

  const load = useCallback((s = search, r = roleFilter, p = page) => {
    fetchUsers({
      search: s || undefined,
      role: r || undefined,
      schoolId: isSchoolAdmin ? userSchoolId : undefined,
      page: p,
      limit: 10,
    });
  }, [fetchUsers, search, roleFilter, page, isSchoolAdmin, userSchoolId]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchSchools({ limit: 500 });
    }
    load();
  }, []);

  // Debounced search
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => load(val, roleFilter, 1), 300);
  };

  const handleRoleFilter = (val: string) => {
    setRoleFilter(val);
    setPage(1);
    load(search, val, 1);
  };

  const handleSchoolChange = (schoolId: string) => {
    setFormData({ ...formData, schoolId, classId: '' });
    if (schoolId) fetchClasses(schoolId);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    load(search, roleFilter, newPage);
  };

  const openCreate = () => {
    setFormData({
      ...EMPTY_FORM,
      schoolId: isSchoolAdmin ? userSchoolId || '' : '',
    });
    setFormError('');
    setEditUser(null);
    setModalOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId || '',
      classId: user.classId || '',
      studentCode: user.studentCode || '',
      phone: user.phone || '',
    });
    setFormError('');
    setEditUser(user);
    if (user.schoolId) fetchClasses(user.schoolId);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditUser(null);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);
    try {
      const payload: Record<string, string> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
      };
      if (formData.schoolId) payload['schoolId'] = formData.schoolId;
      if (formData.classId) payload['classId'] = formData.classId;
      if (formData.studentCode) payload['studentCode'] = formData.studentCode.trim();
      if (formData.phone) payload['phone'] = formData.phone.trim();

      // school-admin cannot create super-admin
      if (isSchoolAdmin && formData.role === 'admin') {
        throw new Error('Bạn không có quyền tạo Quản trị viên hệ thống.');
      }

      if (editUser) {
        const id = (editUser._id || editUser.id)!;
        await updateUser(id, payload as any);
      } else {
        // Create needs password — use a placeholder (backend sends invite email)
        await createUser({ ...payload, password: 'TempPass123!' } as any);
      }
      closeModal();
      load();
    } catch (err: any) {
      setFormError(err.message || 'Đã xảy ra lỗi, vui lòng thử lại.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await deleteUser((deleteTarget._id || deleteTarget.id)!);
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      setFormError(err.message || 'Xóa thất bại.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const showSchoolField = !isSchoolAdmin || formData.role !== 'admin';
  const showClassField = formData.role === 'student';

  const totalPages = usersPagination.pages || 1;
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý Người dùng</h1>
          <p className={styles.subtitle}>
            {isSchoolAdmin
              ? 'Thêm, sửa, xóa người dùng trong trường của bạn'
              : 'Thêm, sửa, xóa người dùng trong hệ thống'}
          </p>
        </div>
        <button className={styles.primaryBtn} onClick={openCreate}>
          <Plus size={16} />
          Thêm Người Dùng
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <select
          className={styles.select}
          value={roleFilter}
          onChange={(e) => handleRoleFilter(e.target.value)}
        >
          <option value="">Tất cả vai trò</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Tìm tên, email, mã SV..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => handleSearchChange('')}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {usersError && (
        <div className={styles.errorBanner}>{usersError}</div>
      )}

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Vai trò</th>
              {isSuperAdmin && <th>Trường</th>}
              {showClassField && <th>Lớp</th>}
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {usersLoading && users.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={styles.skeletonRow}>
                  <td><span className={styles.skeleton} style={{ width: '140px', height: '16px' }} /></td>
                  <td><span className={styles.skeleton} style={{ width: '160px', height: '16px' }} /></td>
                  <td><span className={styles.skeleton} style={{ width: '70px', height: '22px' }} /></td>
                  {isSuperAdmin && <td><span className={styles.skeleton} style={{ width: '100px', height: '16px' }} /></td>}
                  <td></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={isSuperAdmin ? 6 : 5} className={styles.emptyRow}>
                  <Users size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p>Chưa có người dùng nào.</p>
                  <button className={styles.linkBtn} onClick={openCreate}>Thêm người dùng đầu tiên</button>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id || user.id}>
                  <td className={styles.nameCell}>
                    <div className={styles.userName}>{user.name}</div>
                    {user.studentCode && (
                      <div className={styles.studentCode}>{user.studentCode}</div>
                    )}
                  </td>
                  <td className={styles.metaCell}>{user.email}</td>
                  <td><span className={styles.roleBadge} data-role={user.role}>{getRoleLabel(user.role)}</span></td>
                  {isSuperAdmin && (
                    <td className={styles.metaCell}>{user.schoolName || user.schoolId || '—'}</td>
                  )}
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.iconBtn} onClick={() => openEdit(user)} title="Sửa">
                        <Edit2 size={15} />
                      </button>
                      <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => setDeleteTarget(user)} title="Xóa">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
            <ChevronLeft size={16} />
          </button>
          {pageNumbers.map((p) => (
            <button
              key={p}
              className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
              onClick={() => handlePageChange(p)}
            >
              {p}
            </button>
          ))}
          <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editUser ? 'Chỉnh Sửa Người Dùng' : 'Thêm Người Dùng'}
              </h2>
              <button className={styles.modalClose} onClick={closeModal}>
                <X size={18} />
              </button>
            </div>
            <form className={styles.modalForm} onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.label}>Họ tên <span className={styles.required}>*</span></label>
                  <input
                    className={styles.input}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="VD: Nguyễn Văn A"
                  />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.label}>Email <span className={styles.required}>*</span></label>
                  <input
                    className={styles.input}
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="VD: user@school.edu.vn"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Vai trò <span className={styles.required}>*</span></label>
                  <select
                    className={styles.input}
                    value={formData.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setFormData({
                        ...formData,
                        role: newRole,
                        classId: newRole !== 'student' ? '' : formData.classId,
                      });
                    }}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}
                        disabled={isSchoolAdmin && r.value === 'admin' && !isSuperAdmin}
                      >
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Số điện thoại</label>
                  <input
                    className={styles.input}
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="VD: 0912345678"
                  />
                </div>
                {showSchoolField && isSuperAdmin && (
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.label}>
                      Trường học {isSchoolAdmin ? '' : <span className={styles.required}>*</span>}
                    </label>
                    <select
                      className={styles.input}
                      value={formData.schoolId}
                      onChange={(e) => handleSchoolChange(e.target.value)}
                      required={!isSchoolAdmin}
                    >
                      <option value="">Chọn trường học</option>
                      {schools.map((s) => (
                        <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {showClassField && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Lớp học</label>
                    <select
                      className={styles.input}
                      value={formData.classId}
                      onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                      disabled={classesLoading || !formData.schoolId}
                    >
                      <option value="">Chọn lớp học</option>
                      {classes.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {showClassField && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Mã học sinh</label>
                    <input
                      className={styles.input}
                      value={formData.studentCode}
                      onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })}
                      placeholder="VD: HS2024001"
                    />
                  </div>
                )}
              </div>
              {!editUser && (
                <p className={styles.passwordNote}>
                  Mật khẩu tạm sẽ được gửi qua email cho người dùng mới.
                </p>
              )}
              {formError && <div className={styles.formError}>{formError}</div>}
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={closeModal}>Hủy bỏ</button>
                <button type="submit" className={styles.submitBtn} disabled={formSubmitting}>
                  {formSubmitting ? 'Đang lưu...' : editUser ? 'Lưu thay đổi' : 'Tạo Người Dùng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className={styles.confirmModal}>
            <h3 className={styles.confirmTitle}>Xóa Người Dùng?</h3>
            <p className={styles.confirmText}>
              Bạn có chắc muốn xóa <strong>{deleteTarget.name}</strong> ({deleteTarget.email})?
              Hành động này không thể hoàn tác.
            </p>
            {formError && <div className={styles.formError}>{formError}</div>}
            <div className={styles.confirmFooter}>
              <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)}>Hủy bỏ</button>
              <button className={`${styles.submitBtn} ${styles.danger}`} onClick={handleDelete} disabled={deleteSubmitting}>
                {deleteSubmitting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getRoleLabel(role: string): string {
  return ROLES.find((r) => r.value === role)?.label || role;
}
```

- [ ] **Step 2: Create UsersPage.module.css**

Create `client/web/src/pages/admin/UsersPage.module.css`. The styles are nearly identical to SchoolsPage — reuse the same CSS with the same class names. Copy `SchoolsPage.module.css` to `UsersPage.module.css` — no changes needed since all class names and structure match.

```bash
cp "C:/TAILIEU/DATN/SMART GRADING/client/web/src/pages/admin/SchoolsPage.module.css" "C:/TAILIEU/DATN/SMART GRADING/client/web/src/pages/admin/UsersPage.module.css"
```

- [ ] **Step 3: Add extra styles for UsersPage to UsersPage.module.css**

Append these additional styles to handle the `roleBadge` data attribute and `studentCode` display (append to `UsersPage.module.css`):

```css
/* Role badges — color by role */
.roleBadge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}

.roleBadge[data-role="admin"] { background: #fef3c7; color: #92400e; }
.roleBadge[data-role="school-admin"] { background: #e0e7ff; color: #4338ca; }
.roleBadge[data-role="teacher"] { background: #d1fae5; color: #065f46; }
.roleBadge[data-role="student"] { background: #dbeafe; color: #1e40af; }
.roleBadge[data-role="parent"] { background: #fce7f3; color: #9d174d; }

.userName {
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.studentCode {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 1px;
}

.passwordNote {
  font-size: 12px;
  color: #6b7280;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 14px;
  margin: 12px 0 0;
}
```

- [ ] **Step 4: Commit**

```bash
cd "C:/TAILIEU/DATN/SMART GRADING"
git add client/web/src/pages/admin/UsersPage.tsx client/web/src/pages/admin/UsersPage.module.css
git commit -m "feat(web): create UsersPage with CRUD, role filter, RBAC-scoped access"
```

---

## Task 7: Final Verification

**Files:**
- None (verification only)

- [ ] **Step 1: TypeScript check**

```bash
cd "C:/TAILIEU/DATN/SMART GRADING/client/web"
npx tsc --noEmit 2>&1 | head -40
```

Expected: No TypeScript errors. Fix any import/path errors if they occur.

- [ ] **Step 2: List all created/modified files**

```bash
cd "C:/TAILIEU/DATN/SMART GRADING"
git status --short
```

Expected:
- Modified: `Layout.tsx`, `Layout.module.css`, `AppRoutes.tsx`
- New: `adminStore.ts`, `pages/admin/*.tsx`, `pages/admin/*.module.css`

- [ ] **Step 3: Verify admin routes are reachable**

No automated test needed — manual verification:
1. Login as admin user
2. Navigate to `/admin` → should see dashboard with stats
3. Navigate to `/admin/schools` → should see schools list
4. Navigate to `/admin/users` → should see users list
5. Login as school-admin → `/admin/schools` should redirect to `/`

- [ ] **Step 4: Commit any remaining changes**

```bash
cd "C:/TAILIEU/DATN/SMART GRADING"
git add -A
git status --short
git diff --cached --stat
```

Review the diff stat, then commit.

---

## Plan Self-Review

**Spec coverage:**
- [x] Dashboard with stats cards — Task 4 (AdminDashboard)
- [x] Recent lists (schools + users) — Task 4 (AdminDashboard)
- [x] Schools CRUD — Task 5 (SchoolsPage)
- [x] Users CRUD with RBAC — Task 6 (UsersPage)
- [x] Admin navigation in sidebar — Task 1 (Layout)
- [x] Route protection (AdminRoute) — Task 2 (AppRoutes)
- [x] State management — Task 3 (adminStore)

**Placeholder scan:** No TBD/TODO in any step. All code is concrete.

**Type consistency check:**
- `useAdminStore` exports `School` and `AdminUser` types — consistent across Tasks 3-6
- `fetchSchools`, `fetchUsers`, `fetchStats`, `fetchClasses` all use correct method signatures from Task 3
- `UsersPage.getRoleLabel()` matches the `ROLES` array definition — consistent

**Spec requirement gaps:** None found.

---

## Execution Options

Plan complete and saved to `docs/superpowers/plans/2026-06-14-admin-panel.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
