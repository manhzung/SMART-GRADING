# Admin Panel — Web Dashboard

**Ngày:** 2026-06-14
**Trạng thái:** Draft (đã duyệt qua 4 phần brainstorming)
**Platform:** React web client + Node.js backend
**Phạm vi:** Trang `/admin` với Dashboard, Schools CRUD, Users CRUD cho super-admin và school-admin

---

## 1. Bối cảnh & Mục tiêu

### 1.1 Bối cảnh

Hiện tại web client chỉ có giao diện cho **teacher** và **student** (MyScores, MyAppeals). Thiếu giao diện quản trị cho **admin**.

### 1.2 Mục tiêu

Thêm trang `/admin` với 3 phần:
1. **Dashboard** — stats tổng quan, recent lists, activity log
2. **Schools** — CRUD cho super-admin
3. **Users** — CRUD cho school-admin và super-admin

### 1.3 Phân quyền (RBAC)

| Role | Dashboard | Schools | Users |
|------|-----------|---------|-------|
| `admin` (super-admin) | Tất cả stats | Full CRUD | Full CRUD (mọi school) |
| `school-admin` | Chỉ stats school của mình | Không thấy | CRUD user trong school của mình |
| `teacher` | Không thấy | Không thấy | Không thấy |
| `student` | Không thấy | Không thấy | Không thấy |

- Route `/admin` chỉ accessible cho `role === 'admin' || role === 'school-admin'`
- School-admin không thấy menu **Schools**

---

## 2. Cấu trúc thư mục

### 2.1 File structure

```
client/web/src/
├── presentation/
│   └── pages/
│       └── admin/
│           ├── AdminDashboard.tsx          ← Dashboard tổng quan
│           ├── SchoolsPage.tsx             ← CRUD Schools (super-admin)
│           ├── UsersPage.tsx              ← CRUD Users
│           ├── AdminLayout.tsx            ← Layout chung (sidebar + header)
│           └── components/
│               ├── AdminStatsCards.tsx    ← 4 stat cards
│               ├── AdminRecentList.tsx    ← Reusable recent list
│               ├── AdminActivityLog.tsx   ← Activity log
│               ├── SchoolFormModal.tsx     ← Create/edit school modal
│               ├── UserFormModal.tsx      ← Create/edit user modal
│               └── ConfirmDeleteModal.tsx ← Delete confirmation
```

### 2.2 Reuse existing

- **Layout component:** `client/web/src/presentation/components/Layout.tsx` — đã có sidebar, header, routing
- **API service:** `client/web/src/services/api.ts` — wrapper axios đã có
- **Auth store:** `client/web/src/presentation/store/studentStore.ts` — lấy `user.role`, `user.schoolId`
- **RBAC:** `client/web/src/services/auth.ts` — kiểm tra role

---

## 3. Layout & Navigation

### 3.1 Sidebar navigation (mở rộng)

```
[EduGrade Pro]
─────────────────
[sidebar items hiện tại]
─────────────────
  ADMIN
─────────────────
  Dashboard       → /admin
  Schools*        → /admin/schools
  Users           → /admin/users
─────────────────
  [avatar] [name]
  [logout]
```

- Menu **Schools** chỉ hiển thị khi `role === 'admin'`
- Menu **Users** hiển thị cho `role === 'admin' || role === 'school-admin'`

### 3.2 Admin pages layout

```
┌──────────────────────────────────────────────────────────┐
│  [← Back]  Breadcrumb: Admin > Dashboard                │
│                                                          │
│  [Page content]                                         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- Sidebar vẫn hiển thị như cũ (không cần layout riêng cho admin)
- Thêm breadcrumb ở trên mỗi trang

---

## 4. Admin Dashboard (`/admin`)

### 4.1 Stats Cards (row đầu tiên)

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Schools  │ │  Users   │ │  Classes │ │Submissions│
│   12     │ │  1,234   │ │    48    │ │  5,678   │
│ +2 this │ │ +45 this │ │ +3 this  │ │ +120 today│
│  month   │ │  month   │ │  month   │ │           │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

**API calls:**
- `GET /v1/schools?limit=1` → count + `createdAt` để tính "this month"
- `GET /v1/users?limit=1` → count + `createdAt` để tính "this month"
- `GET /v1/classes?limit=1` → count + `createdAt` để tính "this month"
- `GET /v1/submissions?limit=1` → count + `createdAt` để tính "today"

**Lưu ý:** Tách thành 4 API calls riêng (chạy song song) thay vì 1 call lớn để:
- Mỗi card load độc lập
- Một card fail không ảnh hưởng card khác
- Card nào xong trước hiển thị trước

### 4.2 Recent Lists (2 columns)

```
┌─────────────────────────┐  ┌─────────────────────────┐
│ Recent Schools          │  │ Recent Users            │
│ • THPT Nguyễn Huệ ...  │  │ • Nguyễn Văn A ...     │
│ • THCS Trần Hưng ...   │  │ • Trần Thị B ...       │
│ • THPT Lê Quý Đôn ...  │  │ • Lê Văn C ...         │
│ [View all →]            │  │ [View all →]            │
└─────────────────────────┘  └─────────────────────────┘
```

- `GET /v1/schools?limit=5&sortBy=createdAt:desc` → 5 school gần nhất
- `GET /v1/users?limit=5&sortBy=createdAt:desc` → 5 user gần nhất
- Link "View all" → `/admin/schools` hoặc `/admin/users`

### 4.3 Activity Log (full width, cuối trang)

```
┌─────────────────────────────────────────────────────────┐
│ Recent Activity                                         │
├─────────────────────────────────────────────────────────┤
│ • [avatar] Nguyễn Văn A created school "THPT X"... 5m │
│ • [avatar] Trần Thị B added 10 students to class... 12m│
│ • [avatar] Lê Văn C published exam "KT 15p"... 1h     │
└─────────────────────────────────────────────────────────┘
```

- `GET /v1/activity?limit=10&sortBy=createdAt:desc`
- Nếu endpoint `activity` chưa có → reuse `GET /v1/submissions?limit=10&sortBy=createdAt:desc` với mock text

### 4.4 RBAC cho Dashboard

- **super-admin** → thấy tất cả stats (tất cả schools)
- **school-admin** → chỉ thấy stats của school mình:
  - `GET /v1/users?schoolId=<mySchoolId>&limit=1` → count users school mình
  - `GET /v1/classes?schoolId=<mySchoolId>&limit=1` → count classes school mình
  - `GET /v1/submissions?schoolId=<mySchoolId>&limit=1` → count submissions school mình
  - Không hiển thị card "Schools" (chỉ có 1 school)

---

## 5. Schools Management (`/admin/schools`)

**Chỉ super-admin** (`role === 'admin'`) mới truy cập được trang này.

### 5.1 List view

```
┌──────────────────────────────────────────────────────────────┐
│  [+ Thêm Trường]                                            │
│                                                              │
│  ┌────────────────┐  ┌─────────────────────────────────┐  │
│  │ LOẠI TRƯỜNG    │  │ TÌM KIẾM                        │  │
│  │ [Tất cả     ▼] │  │ 🔍 Tìm tên trường...            │  │
│  └────────────────┘  └─────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ TÊN TRƯỜNG      │ MÃ  │ ĐỊA CHỈ    │ HIỆU TRƯỞNG │ ⋮ │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ THPT Nguyễn Huệ │ NHTH│ Q.1, HCM  │ Nguyễn Văn A │ ⋮ │ │
│  │ THCS Trần Hưng  │ THCS│ Q.Bình Tân│ Trần Thị B   │ ⋮ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Trang 1/3]  [<] [1] [2] [3] [>]                          │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Filter & Search

- **Loại trường filter:** "Tất cả", "THPT", "THCS", "TH", "Mầm non"
- **Search:** debounced 300ms, gọi `GET /v1/schools?search=<query>&type=<type>&page=1`
- **Pagination:** mỗi trang 10 items

### 5.3 Create/Edit Modal

```
┌──────────────────────────────────────────────────────────┐
│  Thêm Trường Học / Chỉnh Sửa Trường       [×]          │
│  ─────────────────────────────────────────────────────── │
│  Tên trường *     [___________________________]          │
│  Mã trường *      [____] (VD: NHTH, THCS)               │
│  Loại trường      [ THPT                      ▼]        │
│  Địa chỉ          [___________________________]        │
│  Số điện thoại    [___________________________]          │
│  Email            [___________________________]          │
│  Hiệu trưởng      [___________________________]          │
│  Thang điểm       [ 10                            ]      │
│  Điểm đạt         [ 5                             ]      │
│  Số khối          [1 ──── 12]                         │
│  [Hủy bỏ]                               [+ Tạo Trường] │
└──────────────────────────────────────────────────────────┘
```

- **Create:** `POST /v1/schools`
- **Edit:** `PATCH /v1/schools/:id`
- **Validation:**
  - Tên trường: required, 2-200 chars
  - Mã trường: required, 2-10 chars, unique
  - Loại: required, enum
  - Thang điểm: required, 10 hoặc 100
  - Điểm đạt: required, number < thang điểm
  - Số khối: min <= max

### 5.4 Delete Confirmation

```
┌─────────────────────────────────┐
│  Xóa Trường Học?               │
│  ──────────────────────────────│
│  Bạn có chắc muốn xóa "THPT X"? │
│  Hành động này không thể hoàn  │
│  tác.                           │
│  [Hủy]              [Xóa]        │
└─────────────────────────────────┘
```

- **Delete:** `DELETE /v1/schools/:id`
- Hiển thị warning nếu school có classes/users

---

## 6. Users Management (`/admin/users`)

### 6.1 List view

```
┌──────────────────────────────────────────────────────────────┐
│  [+ Thêm Người Dùng]                                        │
│                                                              │
│  ┌──────────┐  ┌────────────────────────────────────────┐  │
│  │ VAI TRÒ  │  │ TÌM KIẾM                              │  │
│  │[Tất cả▼] │  │ 🔍 Tên, email, mã SV...              │  │
│  └──────────┘  └────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ HỌ TÊN    │ EMAIL         │ VAI TRÒ │ TRƯỜNG │ TÁC  │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ Nguyễn A  │ a@school.edu  │ Admin   │ THPT X │ ⋮  │  │
│  │ Trần B    │ b@school.edu  │ Giáo viên│ THPT X │ ⋮  │  │
│  │ Lê C      │ c@school.edu  │ Học sinh │ THPT X │ ⋮  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  [Trang 1/5]  [<] [1] [2] [3] ... [>]                      │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Filter & Search

- **Role filter:** "Tất cả", "admin", "school-admin", "teacher", "student", "parent"
- **Search:** debounced 300ms, gọi `GET /v1/users?search=<query>&role=<role>&page=1`
- **Pagination:** mỗi trang 10 items

### 6.3 Create/Edit Modal

```
┌──────────────────────────────────────────────────────────┐
│  Thêm Người Dùng / Chỉnh Sửa Người Dùng   [×]         │
│  ───────────────────────────────────────────────────────│
│  Họ tên *        [___________________________]          │
│  Email *         [___________________________]          │
│  Vai trò *       [ Chọn vai trò            ▼]          │
│  │ • Quản trị viên (admin)                            │
│  │ • Quản trị trường (school-admin)                   │
│  │ • Giáo viên (teacher)                              │
│  │ • Học sinh (student)                              │
│  │ • Phụ huynh (parent)                              │
│  Trường học *    [ Chọn trường              ▼]          │
│  (Ẩn nếu super-admin chọn vai trò = admin)             │
│  Lớp học         [ Chọn lớp (nếu student)  ▼]         │
│  Mã học sinh     [___________________________]          │
│  Số điện thoại   [___________________________]          │
│  [Hủy bỏ]                          [+ Tạo Người Dùng] │
└──────────────────────────────────────────────────────────┘
```

- **Create:** `POST /v1/users`
- **Edit:** `PATCH /v1/users/:userId`
- **Role field có điều kiện:**
  - `admin` → KHÔNG hiển thị field "Trường học"
  - `school-admin` → HIỂN THỊ field "Trường học"
  - `teacher`, `student`, `parent` → HIỂN THỊ field "Trường học"
  - **school-admin** không thể tạo vai trò `admin`

### 6.4 RBAC cho Users

- **super-admin** → thấy tất cả users, tạo users thuộc bất kỳ school nào
- **school-admin** → chỉ thấy users thuộc school của mình (auto-filter `schoolId`)
- API: `GET /v1/users?schoolId=<mySchoolId>&...`

### 6.5 Delete Confirmation

Giống Schools, nhưng cho Users.

---

## 7. API Contract

### 7.1 Schools

**`GET /v1/schools`**
```
Query: { search?: string, type?: string, page?: number, limit?: number, sortBy?: string }
Response: { results: School[], totalCount: number, page: number, totalPages: number }
```

**`POST /v1/schools`**
```
Body: { name, code, type, address, phone, email, principal, gradingScale, passingScore, gradeLevels }
Response: School (created)
```

**`PATCH /v1/schools/:id`**
```
Body: Partial<School>
Response: School (updated)
```

**`DELETE /v1/schools/:id`**
```
Response: { message: "School deleted" }
```

### 7.2 Users

**`GET /v1/users`**
```
Query: { search?: string, role?: string, schoolId?: string, page?: number, limit?: number }
Response: { results: User[], totalCount: number, page: number, totalPages: number }
```

**`POST /v1/users`**
```
Body: { name, email, role, schoolId?, classId?, studentCode?, phone? }
Response: User (created)
```

**`PATCH /v1/users/:userId`**
```
Body: Partial<User>
Response: User (updated)
```

**`DELETE /v1/users/:userId`**
```
Response: { message: "User deleted" }
```

### 7.3 Classes (cho dropdown)

**`GET /v1/classes`**
```
Query: { schoolId?: string, page?: number, limit?: number }
Response: { results: Class[], totalCount: number }
```

---

## 8. Error Handling

### 8.1 API Error Handling (Frontend)

- **401 Unauthorized:** redirect về `/login`
- **403 Forbidden:** hiển thị toast "Bạn không có quyền thực hiện thao tác này"
- **404 Not Found:** hiển thị "Không tìm thấy dữ liệu"
- **409 Conflict (duplicate code/email):** hiển thị message từ server trong form
- **500:** hiển thị "Đã xảy ra lỗi, vui lòng thử lại"

### 8.2 Form Validation (Frontend)

- Required fields: hiển thị "Trường này bắt buộc"
- Email: format hợp lệ
- Mã trường: 2-10 ký tự, chỉ chữ và số
- Số điện thoại: 10-11 số
- Thang điểm: 10 hoặc 100
- Điểm đạt: < thang điểm

### 8.3 Empty States

- **Schools:** "Chưa có trường học nào. Nhấn 'Thêm Trường' để bắt đầu."
- **Users:** "Chưa có người dùng nào. Nhấn 'Thêm Người Dùng' để bắt đầu."

### 8.4 Loading States

- Stats cards: skeleton placeholder
- Table: skeleton rows (5 rows)
- Modals: spinner overlay

---

## 9. Component Inventory

| Component | States | Mô tả |
|-----------|--------|-------|
| `AdminStatsCards` | loading, loaded, error, partial | 4 cards, mỗi card chạy độc lập |
| `AdminRecentList` | loading, loaded, empty | List với header + "View all" link |
| `AdminActivityLog` | loading, loaded, empty | Vertical timeline |
| `SchoolsTable` | loading, loaded, empty, error | Table với sort header |
| `SchoolFormModal` | closed, open-create, open-edit, submitting, error | Form modal |
| `UsersTable` | loading, loaded, empty, error | Table với role badge |
| `UserFormModal` | closed, open-create, open-edit, submitting, error | Dynamic form theo role |
| `ConfirmDeleteModal` | closed, open, confirming | Simple confirm dialog |
| `RoleBadge` | admin, school-admin, teacher, student, parent | Colored chip |
| `SearchInput` | idle, typing, debounced | Debounced search field |
| `FilterDropdown` | closed, open | Simple select |
| `Pagination` | disabled prev/next, page numbers | Standard pagination |

---

## 10. Files thay đổi

### React Web Client

| File | Loại | Mô tả |
|------|------|-------|
| `client/web/src/presentation/pages/admin/AdminDashboard.tsx` | MỚI | Dashboard page |
| `client/web/src/presentation/pages/admin/SchoolsPage.tsx` | MỚI | Schools CRUD page |
| `client/web/src/presentation/pages/admin/UsersPage.tsx` | MỚI | Users CRUD page |
| `client/web/src/presentation/pages/admin/components/AdminStatsCards.tsx` | MỚI | 4 stats cards |
| `client/web/src/presentation/pages/admin/components/AdminRecentList.tsx` | MỚI | Reusable recent list |
| `client/web/src/presentation/pages/admin/components/AdminActivityLog.tsx` | MỚI | Activity log |
| `client/web/src/presentation/pages/admin/components/SchoolFormModal.tsx` | MỚI | School form modal |
| `client/web/src/presentation/pages/admin/components/UserFormModal.tsx` | MỚI | User form modal |
| `client/web/src/presentation/pages/admin/components/ConfirmDeleteModal.tsx` | MỚI | Delete confirm |
| `client/web/src/presentation/pages/admin/components/RoleBadge.tsx` | MỚI | Role chip |
| `client/web/src/presentation/routes/AppRoutes.tsx` | SỬA | Thêm route `/admin`, `/admin/schools`, `/admin/users` |
| `client/web/src/presentation/components/Layout.tsx` | SỬA | Thêm sidebar item "ADMIN" cho admin roles |
| `client/web/src/services/api.ts` | SỬA | Thêm methods: `getSchools`, `createSchool`, `updateSchool`, `deleteSchool`, `getUsers`, `createUser`, `updateUser`, `deleteUser` |
| `client/web/src/presentation/store/studentStore.ts` | SỬA | Thêm selector `selectUserRole`, `selectUserSchoolId` |

### Node.js Backend (nếu cần)

| File | Loại | Mô tả |
|------|------|-------|
| `server/src/services/school.service.js` | SỬA | Thêm method `getAll`, `create`, `update`, `delete` (nếu chưa có) |
| `server/src/services/user.service.js` | SỬA | Thêm filter `schoolId` vào `getAll`, validate role khi create (nếu chưa có) |
| `server/src/routes/v1/school.route.js` | SỬA | CRUD routes (nếu chưa có) |
| `server/src/routes/v1/user.route.js` | SỬA | CRUD routes với RBAC (nếu chưa có) |

---

## 11. YAGNI & Out of scope

**Không làm trong feature này:**
- Không làm Schools hierarchy (district/province grouping)
- Không import users từ CSV/Excel
- Không làm bulk delete
- Không làm Classes management trong admin panel
- Không làm audit log (chỉ dùng submissions làm activity proxy)
- Không làm permissions细致的 (chỉ 2 level: super-admin vs school-admin)
- Không làm notifications cho admin
- Không làm analytics charts (stats cards chỉ hiển thị số)

---

## 12. Rủi ro & Giải pháp

| Rủi ro | Giải pháp |
|--------|-----------|
| Backend chưa có Schools CRUD API | Check trước, nếu chưa có → implement song song |
| Backend chưa có role-based user filtering | Thêm `schoolId` filter vào `getAll` service |
| Table component không responsive trên tablet | Wrapper `overflow-x-auto` |
| School-admin có thể elevate own role thành `admin` | Backend validate: school-admin không thể set `role = 'admin'` |
| Search gây DDOS lên backend | Debounce 300ms ở frontend |
| Modal form validation không đồng nhất | Dùng React Hook Form + Yup schema |
