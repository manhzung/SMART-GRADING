# Admin & School Admin Redesign Spec

**Date:** 2026-06-28
**Status:** Draft
**Author:** Agent

## Background

The previous admin/school-admin implementation was removed. The codebase already contains
a robust shared component layer (`EntityListPage`, `EntityPageHeader`, `DataTable`,
`ConfirmDialog`) supporting three role modes (`admin` | `schoolAdmin` | `teacher`) and the
teacher `Layout.tsx` sidebar already declares nav items for `admin`/`school-admin` groups
(though the routes don't exist yet). The new pages will reuse this layer to keep visual
consistency with teacher UI.

## Goals

1. Restore super-admin and school-admin functionality using the existing shared components
2. Match the visual style of teacher pages exactly (header gradient, badges, table layout)
3. Implement role-scoped data filtering (school-admin sees only its own school)
4. Provide a per-role dashboard with relevant KPIs
5. Add "pending teacher approval" workflow for school admin

## Non-Goals

- Analytics and Settings pages are reused from teacher (no new admin analytics)
- Subject management is not added (no `/admin/subjects`, no `/school/subjects`)
- No multi-school admin support (school admin belongs to exactly one school)
- No new shared primitives (we use `EntityListPage`, `DataTable`, `ConfirmDialog`)
- Flutter mobile admin pages are out of scope for this spec

## Architecture

### Routing

Two top-level route groups protected by role guards:

```
/admin/*   → AdminRoute (user.role === 'admin')
/school/*  → SchoolRoute (user.role === 'school-admin')
```

Root `/` routes by role:
- `admin` → `/admin`
- `school-admin` → `/school`
- `teacher` → `/` (existing DashboardPage)
- `student` → `/my-scores`

PublicOnlyRoute (after login) redirects to the matching route per role.

### Layouts

- `Layout.tsx` (teacher) — extended sidebar with new nav items for `admin` and `school-admin`.
  Existing nav group "Admin" already exists; we'll expand items per role and add a parallel
  "School" group for `school-admin`.
- `AdminRoute.tsx`, `SchoolRoute.tsx` — guards wrapping children that redirect on role mismatch.

### Shared Component Layer (reuse)

- `EntityListPage<T>` — generic list/table with search, filter dropdowns, pagination,
  optional bulk select, action column. Accepts `mode: 'admin' | 'schoolAdmin' | 'teacher'`.
- `EntityPageHeader` — header with role badge, gradient background, create button.
- `DataTable<T>` — sortable, selectable table with loading skeleton.
- `ConfirmDialog` — modal for destructive actions.

### Stores (Zustand)

Two new stores:

**`presentation/store/adminStore.ts`** — system-wide data:
- State: `schools`, `users`, `teachers`, `systemStats`, per-list `loading`/`error`/`pagination`
- Actions: `fetchSchools`, `createSchool`, `updateSchool`, `deleteSchool`, `fetchUsers`,
  `createUser`, `updateUser`, `deleteUser`, `resetUserPassword`, `fetchTeachers`,
  `createTeacher`, `updateTeacher`, `deleteTeacher`, `fetchSystemStats`

**`presentation/store/schoolStore.ts`** — school-scoped data:
- State: `classes`, `students`, `teachers`, `users`, `exams`, `pendingTeachers`, `schoolStats`,
  per-list `loading`/`error`/`pagination`
- Actions: `fetchClasses`, `createClass`, `updateClass`, `deleteClass`, `fetchStudents`,
  `createStudent`, `updateStudent`, `deleteStudent`, `transferStudent`,
  `fetchTeachers`, `createTeacher`, `updateTeacher`, `deleteTeacher`, `approveTeacher`,
  `rejectTeacher`, `fetchUsers`, `createUser`, `updateUser`, `deleteUser`,
  `resetUserPassword`, `fetchExams`, `createExam`, `updateExam`, `deleteExam`,
  `publishExam`, `unpublishExam`, `fetchSchoolStats`

Both stores call the existing `apiService` (no new HTTP client).

## Page Inventory

### Super Admin Pages (`/admin/*`)

#### `pages/admin/AdminDashboard.tsx`
- `EntityPageHeader mode="admin"` with title "Tổng quan hệ thống", subtitle dynamic
- 4 stat cards (lucide icons, color-coded backgrounds like teacher dashboard):
  - Tổng Trường (`Building2`, blue)
  - Tổng Users (`Users`, purple)
  - Tổng Lớp (`GraduationCap`, green)
  - Tổng Bài nộp (`FileText`, orange)
- 4 quick-action cards linking to /admin/schools, /admin/users, /admin/teachers, /admin/settings
- Panel "Trường gần đây": top 5 schools, avatar icon, name, code, type
- Panel "Người dùng mới": top 5 users, avatar icon, name, email, role badge
- Refresh button (top right) reloads all data

#### `pages/admin/SchoolsPage.tsx`
- `EntityListPage mode="admin"` with `SchoolsPage.tsx` content matching existing column layout
- Columns: Tên · Mã · Loại · Địa chỉ · Hiệu trưởng · Sĩ số · Trạng thái (badge) · Actions
- Filters: loại dropdown (THPT/THCS/TH/Mầm non) + search
- Bulk delete (mode='admin' enables checkbox column)
- Create/Edit modal: tên, mã (uppercase), loại, địa chỉ, SĐT, email, hiệu trưởng,
  thang điểm (1-10), điểm đạt (0-10), khối min/max (1-12), trạng thái active/inactive

#### `pages/admin/UsersPage.tsx`
- `EntityListPage mode="admin"`
- Columns: Tên · Email · Role (color badge) · Trường · Trạng thái · Actions
- Filters: role dropdown + search
- Bulk delete
- Create/Edit modal: tên, email, role (5 options), trường (dropdown), lớp (if student),
  mã HS (if student), SĐT, trạng thái active/disabled
- Row action "Reset password" (icon `Key`) → API call + toast

#### `pages/admin/TeachersPage.tsx`
- `EntityListPage mode="admin"`
- Columns: Tên · Email · Trường · Số lớp dạy · Số bài thi · Trạng thái · Actions
- Filters: trường dropdown + search
- Bulk delete
- Create/Edit modal: tên, email, trường (dropdown), SĐT, môn dạy (multi-select from
  existing tag list in `questionStore`)

### School Admin Pages (`/school/*`)

#### `pages/school/SchoolDashboard.tsx`
- `EntityPageHeader mode="schoolAdmin"` with greeting "Xin chào, {name}!"
- 4 stat cards: Tổng Lớp · Tổng Học sinh · Tổng Câu hỏi · Tổng Bài kiểm tra
- 4 quick-stats: Phúc khảo chờ duyệt · Điểm TB · Tỷ lệ đạt · Bài thi đang diễn ra
- Panel "Giáo viên chờ phê duyệt": top 5 teachers với status=pending, inline
  Approve (`CheckCircle` xanh) / Reject (`XCircle` đỏ) buttons
- Panel "Hoạt động gần đây": recentSubmissions từ `analyticsService` (same as teacher)
- Panel "Bài thi sắp diễn ra": top 3 exams sorted by examDate asc

#### `pages/school/ClassesPage.tsx`
- `EntityListPage mode="schoolAdmin"`
- Columns: Tên lớp · Mã · Khối · Sĩ số · GVCN · Actions
- Filters: khối dropdown + search
- Bulk delete
- Create/Edit modal: tên, mã, khối (1-12), GVCN (dropdown from school teachers)
- Row action "Xem danh sách HS" (icon `Users`) → drawer/modal listing students

#### `pages/school/StudentsPage.tsx`
- `EntityListPage mode="schoolAdmin"`
- Columns: Tên · Email · Mã HS · Lớp · Actions
- Filters: lớp dropdown + search
- Bulk delete
- Create/Edit modal: tên, email, mã HS, lớp (dropdown from school classes)
- Row action "Chuyển lớp" (icon `ArrowRightLeft`) → modal chọn lớp đích

#### `pages/school/TeachersPage.tsx`
- `EntityListPage mode="schoolAdmin"`
- Columns: Tên · Email · Môn dạy · Số lớp · Trạng thái (Active/Pending/Disabled) · Actions
- Filters: trạng thái dropdown + search
- Bulk delete
- Create/Edit modal: tên, email, SĐT, môn dạy (multi-select), trạng thái
- Row action "Phê duyệt/Từ chối" (visible if pending)

#### `pages/school/UsersPage.tsx`
- `EntityListPage mode="schoolAdmin"`
- Columns: Tên · Email · Role · Actions
- Filters: role dropdown + search
- Bulk delete
- Create/Edit modal: tên, email, role (4 options, no `admin`), lớp (if student),
  mã HS, SĐT, password tạm `TempPass123!`
- Row action "Reset password"

#### `pages/school/ExamsPage.tsx`
- `EntityListPage mode="schoolAdmin"`
- Columns: Tên · Môn · Lớp · Ngày thi · Số câu · Trạng thái (badge) · Actions
- Filters: môn dropdown + trạng thái dropdown + search
- Bulk delete
- Create/Edit modal: tên, môn, lớp (multi-select), ngày thi, thời lượng, số câu,
  số đề, ngân hàng câu hỏi (link), trạng thái
- Row actions: Xem chi tiết · Sửa · Xóa · Publish/Unpublish
- 3 bottom stat cards: Đang diễn ra · Hoàn thành · Bản nháp

### Reused Pages (no changes)

- `/question-bank` → `QuestionBankPage` (shared store)
- `/analytics` → `AnalyticsPage` (shared)
- `/settings` → `SettingsPage` (shared)
- `/help` → `HelpPage` (shared)

## Data Flow

```
Page component
  → useStore() (adminStore or schoolStore)
  → store calls apiService.method()
  → apiService calls backend REST endpoints
  → store updates state, page re-renders
```

All HTTP calls go through `apiService` (existing). No new HTTP client or interceptor.

## Error Handling

- Each store exposes `error` per list; pages display via `EntityListPage`'s error banner
- Network failures: catch in store, set `error`, page renders banner
- Form validation: client-side per modal; backend errors propagate to store
- ConfirmDialog used for all destructive actions (delete, bulk delete)
- Reset password shows success/error via toast (`sonner`)

## Testing

Each new page gets a test in `__tests__/pages/`:
- Renders without crash with mock store state
- Loading state shows skeleton
- Renders rows when data present
- Empty state shows "Chưa có dữ liệu"
- Click Create opens modal
- Click Delete opens ConfirmDialog

Guards tested in `__tests__/routes/`:
- `AdminRoute` allows `admin`, redirects others to `/unauthorized`
- `SchoolRoute` allows `school-admin`, redirects others to `/unauthorized`

## Implementation Order

1. Backend: verify/extend API endpoints for schools, users, teachers, classes, students, exams
2. Stores: `adminStore`, `schoolStore`
3. Guards: `AdminRoute`, `SchoolRoute`
4. Layout: extend `Layout.tsx` sidebar with new nav items per role
5. AppRoutes: add new routes, fix `PublicOnlyRoute` redirect
6. Admin pages: AdminDashboard → SchoolsPage → UsersPage → TeachersPage
7. School pages: SchoolDashboard → ClassesPage → StudentsPage → TeachersPage → UsersPage → ExamsPage
8. Tests for each page
9. Manual verification: log in as admin and school-admin, click through every nav item