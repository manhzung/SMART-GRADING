# Admin Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tách trang admin thành Super Admin (`/admin/*`) và School Admin (`/school/*`) với quyền hạn và menu khác nhau.

**Architecture:** Tạo layout riêng `SchoolLayout` cho `/school/*` routes, thêm `SchoolRoute` component để bảo vệ route chỉ cho `school-admin`. Các page mới sử dụng chung patterns với các page hiện có.

**Tech Stack:** React (TypeScript), Zustand, React Router, CSS Modules

---

## File Structure

```
client/web/src/
├── pages/school/                              (TẠO MỚI)
│   ├── SchoolDashboard.tsx
│   ├── SchoolDashboard.module.css
│   ├── ClassesPage.tsx
│   ├── ClassesPage.module.css
│   ├── StudentsPage.tsx
│   ├── StudentsPage.module.css
│   ├── QuestionsPage.tsx
│   ├── QuestionsPage.module.css
│   ├── ExamsPage.tsx
│   └── ExamsPage.module.css
├── presentation/
│   ├── components/
│   │   ├── SchoolLayout.tsx                   (TẠO MỚI)
│   │   └── SchoolSidebar.tsx                 (TẠO MỚI)
│   └── store/
│       └── schoolStore.ts                     (TẠO MỚI)
├── presentation/routes/
│   └── AppRoutes.tsx                          (SỬA)
└── presentation/components/
    └── Layout.tsx                             (SỬA - cập nhật sidebar)
```

---

## Task 1: Tạo SchoolLayout và SchoolSidebar

**Files:**
- Create: `client/web/src/presentation/components/SchoolLayout.tsx`
- Create: `client/web/src/presentation/components/SchoolSidebar.tsx`

- [ ] **Step 1: Tạo SchoolSidebar component**

```tsx
// client/web/src/presentation/components/SchoolSidebar.tsx
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Database,
  FileText,
} from 'lucide-react';
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

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <h1 className={styles.brandTitle}>EduGrade Pro</h1>
        <p className={styles.brandSubtitle}>Quản lý Trường</p>
      </div>
      
      <nav className={styles.nav}>
        <div className={styles.navGroupLabel}>Quản lý Trường</div>
        {schoolNavItems.map((item) => {
          const isActive = item.exact 
            ? location.pathname === item.path 
            : location.pathname.startsWith(item.path);
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
    </aside>
  );
}
```

- [ ] **Step 2: Tạo SchoolLayout component**

```tsx
// client/web/src/presentation/components/SchoolLayout.tsx
import { Outlet, Link, useNavigate } from 'react-router-dom';
import {
  LogOut,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import NotificationPanel from './NotificationPanel';
import SchoolSidebar from './SchoolSidebar';
import styles from './SchoolLayout.module.css';

export default function SchoolLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const displayName = user?.name || 'School Admin';
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
                <span className={styles.profileRole}>SCHOOL ADMIN</span>
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
```

- [ ] **Step 3: Tạo SchoolLayout CSS (tái sử dụng Layout.module.css)**

Copy `Layout.module.css` content vào `SchoolLayout.module.css` với class name tương ứng.

- [ ] **Step 4: Commit**

```bash
git add client/web/src/presentation/components/SchoolLayout.tsx
git add client/web/src/presentation/components/SchoolSidebar.tsx
git add client/web/src/presentation/components/SchoolLayout.module.css
git commit -m "feat: add SchoolLayout and SchoolSidebar components"
```

---

## Task 2: Tạo schoolStore

**Files:**
- Create: `client/web/src/presentation/store/schoolStore.ts`

- [ ] **Step 1: Tạo schoolStore**

```typescript
// client/web/src/presentation/store/schoolStore.ts
import { create } from 'zustand';
import { apiService } from '../../core/api';

export interface SchoolClass {
  _id: string;
  name: string;
  code: string;
  gradeLevel?: number;
  schoolId?: string;
  studentCount?: number;
  createdAt?: string;
}

export interface Student {
  _id: string;
  name: string;
  email: string;
  studentCode?: string;
  classId?: string;
  className?: string;
  schoolId?: string;
  createdAt?: string;
}

export interface SchoolStats {
  totalClasses: number;
  totalStudents: number;
  totalQuestions: number;
  totalExams: number;
}

export interface PaginatedResult<T> {
  results: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface SchoolState {
  // Classes
  classes: SchoolClass[];
  classesPagination: { page: number; total: number; pages: number };
  classesLoading: boolean;
  classesError: string | null;

  // Students
  students: Student[];
  studentsPagination: { page: number; total: number; pages: number };
  studentsLoading: boolean;
  studentsError: string | null;

  // Stats
  stats: SchoolStats | null;
  statsLoading: boolean;
  statsError: string | null;

  // Actions - Classes
  fetchClasses: (params?: { search?: string; page?: number; limit?: number }) => Promise<void>;
  createClass: (data: Partial<SchoolClass>) => Promise<SchoolClass>;
  updateClass: (id: string, data: Partial<SchoolClass>) => Promise<SchoolClass>;
  deleteClass: (id: string) => Promise<void>;

  // Actions - Students
  fetchStudents: (params?: { search?: string; classId?: string; page?: number; limit?: number }) => Promise<void>;
  createStudent: (data: Record<string, string>) => Promise<Student>;
  updateStudent: (id: string, data: Record<string, string>) => Promise<Student>;
  deleteStudent: (id: string) => Promise<void>;

  // Actions - Stats
  fetchStats: () => Promise<void>;

  clearErrors: () => void;
}

export const useSchoolStore = create<SchoolState>((set, get) => ({
  classes: [],
  classesPagination: { page: 1, total: 0, pages: 0 },
  classesLoading: false,
  classesError: null,

  students: [],
  studentsPagination: { page: 1, total: 0, pages: 0 },
  studentsLoading: false,
  studentsError: null,

  stats: null,
  statsLoading: false,
  statsError: null,

  // Classes actions
  fetchClasses: async (params = {}) => {
    set({ classesLoading: true, classesError: null });
    try {
      const { page = 1, limit = 10, search } = params;
      const query: Record<string, string | number> = { page, limit };
      if (search) query['search'] = search;
      const res = await apiService.get<PaginatedResult<SchoolClass>>('/classes', { params: query });
      set({
        classes: res.results,
        classesPagination: { page: res.page, total: res.total, pages: res.pages },
        classesLoading: false,
      });
    } catch (err: any) {
      set({ classesError: err.message || 'Failed to load classes', classesLoading: false });
    }
  },

  createClass: async (data) => {
    const cls = await apiService.post<SchoolClass>('/classes', data);
    const { classes, classesPagination } = get();
    set({
      classes: [cls, ...classes],
      classesPagination: { ...classesPagination, total: classesPagination.total + 1 },
    });
    return cls;
  },

  updateClass: async (id, data) => {
    const cls = await apiService.patch<SchoolClass>(`/classes/${id}`, data);
    const { classes } = get();
    set({ classes: classes.map((c) => (c._id === id ? cls : c)) });
    return cls;
  },

  deleteClass: async (id) => {
    await apiService.delete(`/classes/${id}`);
    const { classes, classesPagination } = get();
    set({
      classes: classes.filter((c) => c._id !== id),
      classesPagination: { ...classesPagination, total: Math.max(0, classesPagination.total - 1) },
    });
  },

  // Students actions
  fetchStudents: async (params = {}) => {
    set({ studentsLoading: true, studentsError: null });
    try {
      const { page = 1, limit = 10, search, classId } = params;
      const query: Record<string, string | number> = { page, limit };
      if (search) query['search'] = search;
      if (classId) query['classId'] = classId;
      const res = await apiService.get<PaginatedResult<Student>>('/students', { params: query });
      set({
        students: res.results,
        studentsPagination: { page: res.page, total: res.total, pages: res.pages },
        studentsLoading: false,
      });
    } catch (err: any) {
      set({ studentsError: err.message || 'Failed to load students', studentsLoading: false });
    }
  },

  createStudent: async (data) => {
    const student = await apiService.post<Student>('/students', data);
    const { students, studentsPagination } = get();
    set({
      students: [student, ...students],
      studentsPagination: { ...studentsPagination, total: studentsPagination.total + 1 },
    });
    return student;
  },

  updateStudent: async (id, data) => {
    const student = await apiService.patch<Student>(`/students/${id}`, data);
    const { students } = get();
    set({ students: students.map((s) => (s._id === id ? student : s)) });
    return student;
  },

  deleteStudent: async (id) => {
    await apiService.delete(`/students/${id}`);
    const { students, studentsPagination } = get();
    set({
      students: students.filter((s) => s._id !== id),
      studentsPagination: { ...studentsPagination, total: Math.max(0, studentsPagination.total - 1) },
    });
  },

  // Stats actions
  fetchStats: async () => {
    set({ statsLoading: true, statsError: null });
    try {
      const [classesRes, studentsRes, questionsRes, examsRes] = await Promise.allSettled([
        apiService.get<PaginatedResult<any>>('/classes', { params: { limit: 1 } }),
        apiService.get<PaginatedResult<any>>('/students', { params: { limit: 1 } }),
        apiService.get<PaginatedResult<any>>('/questions', { params: { limit: 1 } }),
        apiService.get<PaginatedResult<any>>('/exams', { params: { limit: 1 } }),
      ]);
      set({
        stats: {
          totalClasses: classesRes.status === 'fulfilled' ? classesRes.value.total : 0,
          totalStudents: studentsRes.status === 'fulfilled' ? studentsRes.value.total : 0,
          totalQuestions: questionsRes.status === 'fulfilled' ? questionsRes.value.total : 0,
          totalExams: examsRes.status === 'fulfilled' ? examsRes.value.total : 0,
        },
        statsLoading: false,
      });
    } catch (err: any) {
      set({ statsError: err.message || 'Failed to load stats', statsLoading: false });
    }
  },

  clearErrors: () => set({ classesError: null, studentsError: null, statsError: null }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add client/web/src/presentation/store/schoolStore.ts
git commit -m "feat: add schoolStore for School Admin state management"
```

---

## Task 3: Tạo SchoolDashboard page

**Files:**
- Create: `client/web/src/pages/school/SchoolDashboard.tsx`
- Create: `client/web/src/pages/school/SchoolDashboard.module.css`

- [ ] **Step 1: Tạo SchoolDashboard**

```tsx
// client/web/src/pages/school/SchoolDashboard.tsx
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Users, Database, FileText, Plus, ArrowRight } from 'lucide-react';
import { useSchoolStore } from '../../presentation/store/schoolStore';
import { useAuthStore } from '../../presentation/store/authStore';
import styles from './SchoolDashboard.module.css';

export default function SchoolDashboard() {
  const { stats, statsLoading, statsError, fetchStats } = useSchoolStore();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const statCards = [
    { label: 'Tổng Lớp', value: stats?.totalClasses ?? 0, icon: GraduationCap, color: '#3b82f6', path: '/school/classes' },
    { label: 'Tổng Học sinh', value: stats?.totalStudents ?? 0, icon: Users, color: '#10b981', path: '/school/students' },
    { label: 'Tổng Câu hỏi', value: stats?.totalQuestions ?? 0, icon: Database, color: '#f59e0b', path: '/school/questions' },
    { label: 'Tổng Bài kiểm tra', value: stats?.totalExams ?? 0, icon: FileText, color: '#8b5cf6', path: '/school/exams' },
  ];

  const quickActions = [
    { label: 'Thêm Lớp mới', icon: GraduationCap, path: '/school/classes', action: 'createClass' },
    { label: 'Thêm Học sinh', icon: Users, path: '/school/students', action: 'createStudent' },
    { label: 'Thêm Câu hỏi', icon: Database, path: '/school/questions', action: 'createQuestion' },
    { label: 'Tạo Bài kiểm tra', icon: FileText, path: '/school/exams', action: 'createExam' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Xin chào, {user?.name || 'School Admin'}!</p>
        </div>
      </div>

      {statsError && <div className={styles.errorBanner}>{statsError}</div>}

      <div className={styles.statsGrid}>
        {statCards.map((card) => (
          <div key={card.label} className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: `${card.color}15`, color: card.color }}>
              <card.icon size={24} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{statsLoading ? '—' : card.value.toLocaleString()}</span>
              <span className={styles.statLabel}>{card.label}</span>
            </div>
            <Link to={card.path} className={styles.statArrow}>
              <ArrowRight size={16} />
            </Link>
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Thao tác nhanh</h2>
        <div className={styles.actionsGrid}>
          {quickActions.map((action) => (
            <Link key={action.action} to={action.path} className={styles.actionCard}>
              <action.icon size={20} />
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Tạo SchoolDashboard CSS**

```css
/* client/web/src/pages/school/SchoolDashboard.module.css */
.page {
  padding: 24px;
}

.header {
  margin-bottom: 24px;
}

.title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.errorBanner {
  padding: 12px 16px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 8px;
  margin-bottom: 16px;
}

.statsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.statCard {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: box-shadow 0.2s;
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
}

.statContent {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.statValue {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.statLabel {
  font-size: 13px;
  color: var(--text-secondary);
}

.statArrow {
  color: var(--text-muted);
  transition: color 0.2s, transform 0.2s;
}

.statArrow:hover {
  color: var(--primary-color);
  transform: translateX(4px);
}

.section {
  margin-top: 24px;
}

.sectionTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.actionsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.actionCard {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.actionCard:hover {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}
```

- [ ] **Step 3: Commit**

```bash
git add client/web/src/pages/school/SchoolDashboard.tsx
git add client/web/src/pages/school/SchoolDashboard.module.css
git commit -m "feat: add SchoolDashboard page"
```

---

## Task 4: Tạo ClassesPage

**Files:**
- Create: `client/web/src/pages/school/ClassesPage.tsx`
- Create: `client/web/src/pages/school/ClassesPage.module.css`

- [ ] **Step 1: Tạo ClassesPage**

```tsx
// client/web/src/pages/school/ClassesPage.tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSchoolStore, type SchoolClass } from '../../presentation/store/schoolStore';
import styles from './ClassesPage.module.css';

interface ClassFormData {
  name: string;
  code: string;
  gradeLevel: number;
}

const EMPTY_FORM: ClassFormData = {
  name: '',
  code: '',
  gradeLevel: 10,
};

export default function ClassesPage() {
  const {
    classes, classesPagination, classesLoading, classesError,
    fetchClasses, createClass, updateClass, deleteClass,
  } = useSchoolStore();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editClass, setEditClass] = useState<SchoolClass | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchoolClass | null>(null);
  const [formData, setFormData] = useState<ClassFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback((s = search, p = page) => {
    fetchClasses({ search: s || undefined, page: p, limit: 10 });
  }, [fetchClasses, search, page]);

  useEffect(() => { load(); }, []);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => load(val, 1), 300);
  };

  const handlePageChange = (newPage: number) => { setPage(newPage); load(search, newPage); };

  const openCreate = () => { setFormData(EMPTY_FORM); setFormError(''); setEditClass(null); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditClass(null); setFormError(''); };

  const openEdit = (cls: SchoolClass) => {
    setFormData({
      name: cls.name,
      code: cls.code,
      gradeLevel: cls.gradeLevel ?? 10,
    });
    setFormError('');
    setEditClass(cls);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        gradeLevel: formData.gradeLevel,
      };
      if (editClass) {
        await updateClass(editClass._id, payload);
      } else {
        await createClass(payload);
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
      await deleteClass(deleteTarget._id);
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      setFormError(err.message || 'Xóa thất bại.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const totalPages = classesPagination.pages || 1;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý Lớp học</h1>
          <p className={styles.subtitle}>Thêm, sửa, xóa lớp học trong trường</p>
        </div>
        <button className={styles.primaryBtn} onClick={openCreate}>
          <Plus size={16} /> Thêm Lớp
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Tìm lớp..." value={search} onChange={(e) => handleSearchChange(e.target.value)} />
          {search && <button className={styles.clearSearch} onClick={() => handleSearchChange('')}><X size={14} /></button>}
        </div>
      </div>

      {classesError && <div className={styles.errorBanner}>{classesError}</div>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tên lớp</th><th>Mã lớp</th><th>Khối</th><th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {classesLoading && classes.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={styles.skeletonRow}>
                  <td><span className={styles.skeleton} style={{ width: '160px', height: '16px' }} /></td>
                  <td><span className={styles.skeleton} style={{ width: '60px', height: '16px' }} /></td>
                  <td><span className={styles.skeleton} style={{ width: '40px', height: '22px' }} /></td>
                  <td></td>
                </tr>
              ))
            ) : classes.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyRow}>
                  <GraduationCap size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p>Chưa có lớp học nào.</p>
                  <button className={styles.linkBtn} onClick={openCreate}>Thêm Lớp đầu tiên</button>
                </td>
              </tr>
            ) : (
              classes.map((cls) => (
                <tr key={cls._id}>
                  <td className={styles.nameCell}><div className={styles.className}>{cls.name}</div></td>
                  <td><code className={styles.codeTag}>{cls.code}</code></td>
                  <td><span className={styles.gradeBadge}>Khối {cls.gradeLevel || '—'}</span></td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.iconBtn} onClick={() => openEdit(cls)} title="Sửa"><Edit2 size={15} /></button>
                      <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => setDeleteTarget(cls)} title="Xóa"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} disabled={page <= 1} onClick={() => handlePageChange(page - 1)}><ChevronLeft size={16} /></button>
          <span className={styles.pageInfo}>Trang {page} / {totalPages}</span>
          <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}><ChevronRight size={16} /></button>
        </div>
      )}

      {modalOpen && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editClass ? 'Chỉnh Sửa Lớp' : 'Thêm Lớp Mới'}</h2>
              <button className={styles.modalClose} onClick={closeModal}><X size={18} /></button>
            </div>
            <form className={styles.modalForm} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Tên lớp <span className={styles.required}>*</span></label>
                <input className={styles.input} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="VD: 10A1" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Mã lớp <span className={styles.required}>*</span></label>
                <input className={styles.input} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} required placeholder="VD: 10A1" maxLength={10} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Khối</label>
                <select className={styles.input} value={formData.gradeLevel} onChange={(e) => setFormData({ ...formData, gradeLevel: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                    <option key={g} value={g}>Khối {g}</option>
                  ))}
                </select>
              </div>
              {formError && <div className={styles.formError}>{formError}</div>}
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={closeModal}>Hủy bỏ</button>
                <button type="submit" className={styles.submitBtn} disabled={formSubmitting}>
                  {formSubmitting ? 'Đang lưu...' : editClass ? 'Lưu thay đổi' : 'Tạo Lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className={styles.confirmModal}>
            <h3 className={styles.confirmTitle}>Xóa Lớp Học?</h3>
            <p className={styles.confirmText}>Bạn có chắc muốn xóa <strong>{deleteTarget.name}</strong>? Hành động này không thể hoàn tác.</p>
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

- [ ] **Step 2: Tạo ClassesPage CSS (tái sử dụng SchoolsPage.module.css patterns)**

- [ ] **Step 3: Commit**

```bash
git add client/web/src/pages/school/ClassesPage.tsx
git add client/web/src/pages/school/ClassesPage.module.css
git commit -m "feat: add ClassesPage for School Admin"
```

---

## Task 5: Tạo StudentsPage

**Files:**
- Create: `client/web/src/pages/school/StudentsPage.tsx`
- Create: `client/web/src/pages/school/StudentsPage.module.css`

- [ ] **Step 1: Tạo StudentsPage**

StudentsPage sẽ tương tự ClassesPage nhưng cho Student model. Sử dụng patterns từ ClassesPage.

- [ ] **Step 2: Commit**

```bash
git add client/web/src/pages/school/StudentsPage.tsx
git add client/web/src/pages/school/StudentsPage.module.css
git commit -m "feat: add StudentsPage for School Admin"
```

---

## Task 6: Tạo QuestionsPage (tích hợp QuestionBank)

**Files:**
- Create: `client/web/src/pages/school/QuestionsPage.tsx`
- Create: `client/web/src/pages/school/QuestionsPage.module.css`

- [ ] **Step 1: Tạo QuestionsPage**

QuestionsPage sẽ tích hợp với QuestionBank hiện có. Đọc `QuestionBankPage.tsx` để tái sử dụng logic.

```tsx
// client/web/src/pages/school/QuestionsPage.tsx
import { useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import { useQuestionStore } from '../../presentation/store/questionStore';
import styles from './QuestionsPage.module.css';

// Reuse questionStore from existing QuestionBank
export default function QuestionsPage() {
  const { questions, loading, error, fetchQuestions } = useQuestionStore();

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý Câu hỏi</h1>
          <p className={styles.subtitle}>Ngân hàng câu hỏi của trường</p>
        </div>
      </div>

      {/* Reuse QuestionBank UI components */}
      <div className={styles.questionList}>
        {loading ? (
          <p>Đang tải...</p>
        ) : questions.length === 0 ? (
          <div className={styles.emptyState}>
            <Database size={48} style={{ opacity: 0.3 }} />
            <p>Chưa có câu hỏi nào.</p>
          </div>
        ) : (
          questions.map((q) => (
            <div key={q._id} className={styles.questionCard}>
              {/* Question content */}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/web/src/pages/school/QuestionsPage.tsx
git add client/web/src/pages/school/QuestionsPage.module.css
git commit -m "feat: add QuestionsPage for School Admin"
```

---

## Task 7: Tạo ExamsPage (tích hợp AMC/OMR)

**Files:**
- Create: `client/web/src/pages/school/ExamsPage.tsx`
- Create: `client/web/src/pages/school/ExamsPage.module.css`

- [ ] **Step 1: Tạo ExamsPage**

ExamsPage tích hợp với hệ thống AMC và OMR hiện có.

- [ ] **Step 2: Commit**

```bash
git add client/web/src/pages/school/ExamsPage.tsx
git add client/web/src/pages/school/ExamsPage.module.css
git commit -m "feat: add ExamsPage for School Admin"
```

---

## Task 8: Cập nhật AppRoutes

**Files:**
- Modify: `client/web/src/presentation/routes/AppRoutes.tsx`

- [ ] **Step 1: Thêm SchoolRoute và /school/* routes**

```tsx
// Thêm import
import SchoolLayout from '../components/SchoolLayout';
import SchoolDashboard from '../../pages/school/SchoolDashboard';
import ClassesPage from '../../pages/school/ClassesPage';
import StudentsPage from '../../pages/school/StudentsPage';
import QuestionsPage from '../../pages/school/QuestionsPage';
import ExamsPage from '../../pages/school/ExamsPage';

// Thêm SchoolRoute component
function SchoolRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const userRole = useAuthStore((state) => state.user?.role);
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (userRole !== 'school-admin') return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}

// Thêm routes trong AppRoutes
<Route
  path="/school"
  element={
    <SchoolRoute>
      <SchoolLayout />
    </SchoolRoute>
  }
>
  <Route index element={<SchoolDashboard />} />
  <Route path="classes" element={<ClassesPage />} />
  <Route path="students" element={<StudentsPage />} />
  <Route path="questions" element={<QuestionsPage />} />
  <Route path="exams" element={<ExamsPage />} />
</Route>
```

- [ ] **Step 2: Cập nhật AdminRoute**

```tsx
// AdminRoute chỉ cho phép role 'admin'
if (userRole !== 'admin') return <Navigate to="/unauthorized" replace />;
```

- [ ] **Step 3: Commit**

```bash
git add client/web/src/presentation/routes/AppRoutes.tsx
git commit -m "feat: add /school/* routes for School Admin"
```

---

## Task 9: Cập nhật Sidebar cho User thường

**Files:**
- Modify: `client/web/src/presentation/components/Layout.tsx`

- [ ] **Step 1: Loại bỏ admin menu khỏi Layout chính**

Loại bỏ `adminNavItems` và chỉ giữ menu thông thường. Admin sidebar sẽ được quản lý riêng trong SchoolLayout.

- [ ] **Step 2: Commit**

```bash
git add client/web/src/presentation/components/Layout.tsx
git commit -m "refactor: remove admin nav from main Layout"
```

---

## Implementation Order Summary

1. Task 1: SchoolLayout + SchoolSidebar
2. Task 2: schoolStore
3. Task 3: SchoolDashboard
4. Task 4: ClassesPage
5. Task 5: StudentsPage
6. Task 6: QuestionsPage
7. Task 7: ExamsPage
8. Task 8: AppRoutes
9. Task 9: Layout update
