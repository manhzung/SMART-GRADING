# Design Spec: School-Admin Approval & Admin School Management

**Date:** 2026-06-28  
**Status:** Approved  
**Author:** Agent

---

## 1. Overview

Thêm các chức năng:
- **School-Admin**: Approve câu hỏi và approve giáo viên đăng ký vào trường
- **Admin (Super Admin)**: CRUD trường học, duyệt đăng ký trường, quản lý school-admin của từng trường

---

## 2. Data Model Changes

### 2.1 User Model - Add Fields

```javascript
// server/src/models/user.model.js

// Thêm sau trường isActive
registrationStatus: {
  type: String,
  enum: ['pending', 'approved', 'rejected'],
  default: 'approved'  // existing teachers are auto-approved
},
rejectedReason: {
  type: String,
  default: null
},
registeredSchoolId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'School',
  default: null  // school teacher wants to join
}
```

### 2.2 School Model - Add Fields

```javascript
// server/src/models/school.model.js

// Thêm sau trường isActive
registrationStatus: {
  type: String,
  enum: ['pending', 'approved', 'rejected'],
  default: 'approved'  // existing schools are auto-approved
},
approvedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
},
rejectedReason: String
```

---

## 3. Backend API Endpoints

### 3.1 School-Admin APIs (for approval)

#### Questions Approval:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/questions?isApproved=false` | Lấy câu hỏi chờ duyệt |
| POST | `/api/v1/questions/:id/approve` | Duyệt câu hỏi |
| POST | `/api/v1/questions/:id/reject` | Từ chối câu hỏi |

#### Teachers Approval:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/teachers?status=pending` | Lấy giáo viên chờ duyệt |
| POST | `/api/v1/users/:id/approve` | Duyệt giáo viên |
| POST | `/api/v1/users/:id/reject` | Từ chối giáo viên |

### 3.2 Admin APIs (School Management)

#### Schools CRUD:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/schools` | Danh sách trường |
| POST | `/api/v1/schools` | Tạo trường mới |
| GET | `/api/v1/schools/:id` | Chi tiết trường |
| PUT | `/api/v1/schools/:id` | Cập nhật trường |
| DELETE | `/api/v1/schools/:id` | Xóa trường |

#### School Registration Approval:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/schools?status=pending` | Trường chờ duyệt |
| POST | `/api/v1/schools/:id/approve` | Duyệt trường |
| POST | `/api/v1/schools/:id/reject` | Từ chối trường |

#### School Admin Management:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/schools/:id/admins` | DS school-admin của trường |
| POST | `/api/v1/schools/:id/admins` | Thêm school-admin vào trường |
| DELETE | `/api/v1/schools/:id/admins/:userId` | Xóa school-admin khỏi trường |

---

## 4. Service Layer Changes

### 4.1 Question Service
```javascript
// server/src/services/question.service.js

// Add reject method
reject = async (questionId, userId, schoolId, role) => { ... }

// Update getAll to filter by isApproved for teachers
```

### 4.2 User Service
```javascript
// server/src/services/user.service.js

// Add methods for teacher approval
getPendingTeachers = async (schoolId, options) => { ... }
approveTeacher = async (userId, schoolId) => { ... }
rejectTeacher = async (userId, schoolId, reason) => { ... }

// Add methods for school admin management
getSchoolAdmins = async (schoolId, options) => { ... }
addSchoolAdmin = async (schoolId, userId) => { ... }
removeSchoolAdmin = async (schoolId, userId) => { ... }
```

### 4.3 School Service
```javascript
// server/src/services/school.service.js

// Add methods for registration approval
getPendingSchools = async (options) => { ... }
approveSchool = async (schoolId, adminId) => { ... }
rejectSchool = async (schoolId, reason, adminId) => { ... }
```

---

## 5. Frontend Structure

### 5.1 School-Admin Dashboard Pages

```
client/web/src/pages/
├── SchoolAdminDashboardPage.tsx    (updated - add approval KPIs)
├── ApprovalPage.tsx               (NEW - tabs: questions & teachers)
│   ├── QuestionApprovalSection.tsx
│   └── TeacherApprovalSection.tsx
```

### 5.2 Admin Dashboard Pages

```
client/web/src/pages/admin/
├── SchoolsPage.tsx               (NEW - CRUD schools)
│   ├── SchoolList.tsx
│   ├── SchoolForm.tsx
│   ├── SchoolDetail.tsx
│   └── SchoolAdminsTab.tsx
```

### 5.3 API Services

```
client/web/src/services/
├── approval.service.ts           (NEW - for school-admin approval APIs)
└── schoolManagement.service.ts   (NEW - for admin school management APIs)
```

### 5.4 Store

```
client/web/src/presentation/store/
├── approvalStore.ts              (NEW - for approval state management)
└── schoolManagementStore.ts      (NEW - for admin school management)
```

---

## 6. UI Components

### 6.1 School-Admin: Approval Page

**Tabs:**
- Tab 1: "Câu hỏi chờ duyệt" - Danh sách câu hỏi với actions approve/reject
- Tab 2: "Giáo viên chờ duyệt" - Danh sách giáo viên với actions approve/reject

**Features:**
- Badge hiển thị số lượng pending trên tab
- Bulk approve (chọn nhiều → duyệt 1 click)
- Filter by teacher, date range
- Search by question content or teacher name

### 6.2 Admin: Schools Page

**Sections:**
- Tab 1: "Tất cả trường" - Danh sách CRUD
- Tab 2: "Chờ duyệt" - Trường đăng ký mới
- Detail: "School-Admins" - Quản lý admin của trường

**Features:**
- Modal form tạo/sửa trường
- Confirm dialog xóa trường
- Invite school-admin bằng email

---

## 7. Auth & Permission Flow

### 7.1 Teacher Registration → Approval

```
1. Teacher POST /auth/register { role: 'teacher', schoolId: 'xxx' }
2. System: Create user with registrationStatus: 'pending'
3. Teacher login → redirect to "pending approval" page

4. School-admin GET /users/teachers?status=pending
5. School-admin POST /users/:id/approve
   - user.registrationStatus = 'approved'
   - user.schoolId = user.registeredSchoolId
6. Teacher can now access school features
```

### 7.2 Question Approval

```
1. Teacher creates question → isApproved: false
2. Teacher can see their pending questions but students can't
3. School-admin GET /questions?isApproved=false
4. School-admin POST /questions/:id/approve
   - question.isApproved = true
   - question.approvedBy = schoolAdminId
   - question.approvedAt = now
5. Question visible to students in exams
```

### 7.3 School Registration → Approval

```
1. User creates school via POST /schools (future: registration form)
2. System: Create school with registrationStatus: 'pending'
3. Admin GET /schools?status=pending
4. Admin POST /schools/:id/approve
   - school.registrationStatus = 'approved'
   - school.approvedBy = adminId
5. School admin can be assigned
```

---

## 8. Error Handling

| Scenario | Error Message |
|----------|---------------|
| Teacher not pending | "Tài khoản không trong trạng thái chờ duyệt" |
| Not school-admin | "Bạn không có quyền thực hiện thao tác này" |
| Question already approved | "Câu hỏi đã được duyệt trước đó" |
| School already approved | "Trường đã được duyệt trước đó" |
| Cannot remove last admin | "Không thể xóa school-admin cuối cùng của trường" |

---

## 9. Notification

When status changes, create notification:
- Teacher approved → Notify teacher: "Tài khoản của bạn đã được duyệt"
- Teacher rejected → Notify teacher: "Tài khoản bị từ chối: {reason}"
- Question approved → Notify teacher: "Câu hỏi của bạn đã được duyệt"
- Question rejected → Notify teacher: "Câu hỏi bị từ chối: {reason}"
- School approved → Notify school-admin: "Trường đã được duyệt"
- School rejected → Notify requester: "Đăng ký trường bị từ chối: {reason}"

---

## 10. Migration Strategy

1. Add new fields with default values (backward compatible)
2. Set `registrationStatus: 'approved'` for existing users
3. Set `registrationStatus: 'approved'` for existing schools
4. Question approval is optional for existing approved questions
5. New questions always need approval by default

---

## 11. Testing Strategy

### Backend:
- Unit tests for approval service methods
- Integration tests for approval endpoints
- Permission tests (teacher can't approve, admin can't approve questions)

### Frontend:
- Test approval page renders correctly
- Test bulk approval works
- Test rejection with reason shows modal
- Test role-based access (teacher can't see approval page)
