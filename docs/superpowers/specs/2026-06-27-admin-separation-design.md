# Design: Tách Trang Admin - Super Admin vs School Admin

**Date:** 2026-06-27  
**Status:** Approved

---

## 1. Mục tiêu

Tách trang admin hiện tại thành 2 phần riêng biệt với quyền hạn khác nhau:
- **Super Admin** (`admin`): Quản lý hệ thống toàn cục
- **School Admin** (`school-admin`): Quản lý trường học của mình

---

## 2. Cấu trúc Routes

### Super Admin: `/admin/*`

| Route | Page | Mô tả |
|-------|------|-------|
| `/admin` | Dashboard | Thống kê toàn hệ thống |
| `/admin/schools` | SchoolsPage | Quản lý Trường học (CRUD) |
| `/admin/users` | UsersPage | Quản lý Người dùng (CRUD) |
| `/admin/settings` | SettingsPage | Cấu hình hệ thống |

### School Admin: `/school/*`

| Route | Page | Mô tả |
|-------|------|-------|
| `/school` | Dashboard | Thống kê của trường |
| `/school/classes` | ClassesPage | Quản lý Lớp học (CRUD) |
| `/school/students` | StudentsPage | Quản lý Học sinh (CRUD) |
| `/school/questions` | QuestionsPage | Quản lý Câu hỏi (tích hợp QuestionBank) |
| `/school/exams` | ExamsPage | Quản lý Bài kiểm tra (tích hợp AMC/OMR) |

---

## 3. Dashboard Statistics

### Super Admin Dashboard (`/admin`)

| Stat | Mô tả |
|------|-------|
| totalSchools | Tổng số Trường học |
| totalUsers | Tổng số Người dùng |
| totalClasses | Tổng số Lớp học |
| totalSubmissions | Tổng số Bài nộp |

### School Admin Dashboard (`/school`)

| Stat | Mô tả |
|------|-------|
| totalClasses | Tổng số Lớp học trong trường |
| totalStudents | Tổng số Học sinh trong trường |
| totalQuestions | Tổng số Câu hỏi trong ngân hàng |
| totalExams | Tổng số Bài kiểm tra |

---

## 4. Kiến trúc Component

### Layout Structure

```
AppRoutes.tsx
├── AdminRoute (role: admin)
│   └── AdminLayout
│       ├── AdminSidebar
│       └── /admin/*
└── SchoolRoute (role: school-admin)
    └── SchoolLayout
        ├── SchoolSidebar
        └── /school/*
```

### Sidebar Navigation

**AdminSidebar:**
- Dashboard
- Trường học
- Người dùng
- Cấu hình

**SchoolSidebar:**
- Dashboard
- Lớp học
- Học sinh
- Câu hỏi
- Bài kiểm tra

---

## 5. Files cần tạo/sửa

### Tạo mới

```
client/web/src/
├── pages/
│   └── school/
│       ├── SchoolDashboard.tsx
│       ├── SchoolDashboard.module.css
│       ├── ClassesPage.tsx
│       ├── ClassesPage.module.css
│       ├── StudentsPage.tsx
│       ├── StudentsPage.module.css
│       ├── QuestionsPage.tsx
│       ├── QuestionsPage.module.css
│       ├── ExamsPage.tsx
│       └── ExamsPage.module.css
├── presentation/
│   ├── components/
│   │   ├── SchoolLayout.tsx
│   │   └── SchoolSidebar.tsx
│   └── store/
│       └── schoolStore.ts
```

### Sửa đổi

| File | Thay đổi |
|------|----------|
| `AppRoutes.tsx` | Thêm routes `/school/*`, SchoolRoute |
| `Layout.tsx` | Giữ AdminLayout cho `/admin/*` |
| `adminStore.ts` | Giữ nguyên cho Super Admin |
| Sidebar components | Phân tách menu theo role |

---

## 6. API Endpoints cần kiểm tra

| Endpoint | Method | Mô tả |
|----------|--------|--------|
| `/classes` | GET, POST | Lấy/tạo lớp học |
| `/classes/:id` | PATCH, DELETE | Sửa/xóa lớp |
| `/students` | GET, POST | Lấy/tạo học sinh |
| `/students/:id` | PATCH, DELETE | Sửa/xóa học sinh |
| `/questions` | GET, POST | Lấy/tạo câu hỏi |
| `/questions/:id` | PATCH, DELETE | Sửa/xóa câu hỏi |
| `/exams` | GET, POST | Lấy/tạo bài kiểm tra |

---

## 7. Route Protection

- `/admin/*` → chỉ role `admin` được truy cập
- `/school/*` → chỉ role `school-admin` được truy cập
- Redirect về trang chính nếu không có quyền

---

## 8. Implementation Order

1. Tạo SchoolLayout và SchoolSidebar
2. Thêm SchoolRoute trong AppRoutes
3. Tạo SchoolDashboard
4. Tạo ClassesPage
5. Tạo StudentsPage
6. Tạo QuestionsPage (tích hợp QuestionBank)
7. Tạo ExamsPage (tích hợp AMC/OMR)
8. Tạo schoolStore cho state management
9. Test và verify
