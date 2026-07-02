# Design: Admin Approve Teachers from SchoolDetailModal

**Date:** 2026-07-02
**Status:** Awaiting user review
**Platform:** Web (React) + Backend (Node.js/Express)
**Author:** Brainstorming session

---

## 1. Background & Motivation

Hiện tại, chỉ **school-admin** mới có thể duyệt giáo viên đang chờ trong trường của họ, thông qua trang `ApprovalPage` (route `/approvals`).

**Vấn đề:** Khi **system admin** (super admin) mở `SchoolDetailModal` từ `SchoolsPage` để xem chi tiết một trường, họ chỉ thấy thông tin chung và school-admin của trường đó, **không thấy** danh sách giáo viên đang chờ duyệt. Điều này gây khó khăn khi:

- School-admin chưa active hoặc chưa setup xong — giáo viên pending bị "kẹt"
- Admin cần hỗ trợ duyệt nhanh khi school-admin vắng mặt
- Admin muốn kiểm tra tình trạng recruitment của trường

**Mục tiêu:** Cho phép system admin xem và phê duyệt/từ chối giáo viên pending của **bất kỳ trường nào** ngay trong `SchoolDetailModal`.

---

## 2. Goals & Non-Goals

### Goals

- System admin có thể xem danh sách giáo viên pending của một trường
- System admin có thể approve hoặc reject từng giáo viên
- Endpoint backend riêng biệt cho admin (không dùng chung endpoint school-admin)
- UI tái sử dụng pattern từ `ApprovalPage` (giảm duplicate code)
- Backward compatible: endpoint school-admin cũ vẫn hoạt động

### Non-Goals

- Không thay đổi logic approval của school-admin
- Không thêm bulk approve/reject (chỉ từng người)
- Không thêm notification/email cho giáo viên (có thể làm sau)
- Không thay đổi `SchoolDetailModal` ở các phần khác ngoài section mới
- Không tạo modal phức tạp cho reject (dùng `window.prompt` đơn giản)

---

## 3. High-Level Architecture

### Components thay đổi

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (client/web)                                          │
│                                                                 │
│  ┌──────────────────────────┐                                   │
│  │ approval.service.ts      │  ← Thêm getAdminPendingTeachers,  │
│  │                          │    adminApproveTeacher,           │
│  │                          │    adminRejectTeacher             │
│  └──────────────────────────┘                                   │
│              │                                                  │
│              ▼                                                  │
│  ┌──────────────────────────┐                                   │
│  │ approvalStore.ts         │  ← Thêm state admin riêng biệt   │
│  │                          │    (không dùng chung pending)     │
│  └──────────────────────────┘                                   │
│              │                                                  │
│              ▼                                                  │
│  ┌──────────────────────────┐                                   │
│  │ SchoolDetailModal.tsx    │  ← Thêm PendingTeachersSection   │
│  │                          │    giữa General Info và           │
│  │                          │    School Admin                   │
│  └──────────────────────────┘                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP
┌─────────────────────────────────────────────────────────────────┐
│  Backend (server)                                               │
│                                                                 │
│  ┌──────────────────────────┐                                   │
│  │ user.route.js            │  ← Thêm 3 routes /admin/teachers/*│
│  └──────────────────────────┘                                   │
│              │                                                  │
│              ▼                                                  │
│  ┌──────────────────────────┐                                   │
│  │ user.controller.js       │  ← Thêm 3 controller methods     │
│  └──────────────────────────┘                                   │
│              │                                                  │
│              ▼                                                  │
│  ┌──────────────────────────┐                                   │
│  │ user.service.js          │  ← Thêm 3 service methods        │
│  │                          │    (dùng lại User.paginate logic) │
│  └──────────────────────────┘                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Nguyên tắc thiết kế

1. **Tách biệt admin vs school-admin**: Endpoint mới có prefix `/admin/`, không lẫn với endpoint cũ.
2. **Không duplicate logic gốc**: Service method admin gọi lại helper `getPendingTeachers(schoolId, ...)` cũ, chỉ khác cách lấy `schoolId` (từ query/body thay vì `req.user.schoolId`).
3. **Approve/reject admin dùng lại logic hiện tại**: Method `approveTeacher` và `rejectTeacher` hiện tại đã không check role ngoài controller, chỉ cần gọi lại với `schoolId` lấy từ user pending (qua `registeredSchoolId`).
4. **Reuse UI pattern**: Card hiển thị giáo viên copy style từ `ApprovalPage.tsx`.
5. **Backward compatible**: API cũ `/users/teachers/pending` vẫn hoạt động bình thường cho school-admin.

---

## 4. Backend Design

### 4.1 Routes

Trong `server/src/routes/v1/user.route.js`, thêm 3 routes mới **phía trước** các route generic `/:userId` (để tránh bị match nhầm):

```javascript
// ── Admin Teacher Approval routes (must be defined BEFORE /:userId) ──

router
  .route('/admin/teachers/pending')
  .get(auth('manageUsers'), userController.adminGetPendingTeachers);

router
  .route('/admin/teachers/:userId/approve')
  .post(auth('manageUsers'), userController.adminApproveTeacher);

router
  .route('/admin/teachers/:userId/reject')
  .post(auth('manageUsers'), userController.adminRejectTeacher);
```

**Permission**: `manageUsers` — đã có sẵn trong role `admin` (xem `server/src/config/roles.js`).

### 4.2 Controllers

Trong `server/src/controllers/user.controller.js`, thêm 3 method:

```javascript
// ── Admin Teacher Approval Controllers ──────────────────────────────────────────

const adminGetPendingTeachers = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền truy cập');
  }
  const { schoolId } = req.query;
  if (!schoolId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'schoolId is required');
  }
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.getPendingTeachersForSchool(schoolId, options);
  res.send(result);
});

const adminApproveTeacher = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền duyệt giáo viên');
  }
  const user = await userService.adminApproveTeacher(req.params.userId);
  res.send(user);
});

const adminRejectTeacher = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền từ chối giáo viên');
  }
  const { reason } = req.body || {};
  const user = await userService.adminRejectTeacher(req.params.userId, reason);
  res.send(user);
});
```

**Khác biệt với controller school-admin cũ:**
- `adminGetPendingTeachers` lấy `schoolId` từ `req.query` thay vì `req.user.schoolId`.
- `adminApproveTeacher` / `adminRejectTeacher` **không truyền `schoolId` vào service** — service tự lấy từ `user.registeredSchoolId` của giáo viên pending.

### 4.3 Services

Trong `server/src/services/user.service.js`, thêm 3 method:

```javascript
// ── Admin Teacher Approval Methods ──────────────────────────────────────────────

/**
 * Get pending teachers for a specific school (used by admin to view any school's pending list)
 * @param {ObjectId|string} schoolId
 * @param {Object} options - pagination options
 */
const getPendingTeachersForSchool = async (schoolId, options = {}) => {
  const filter = {
    role: 'teacher',
    registrationStatus: 'pending',
    registeredSchoolId: schoolId,
  };
  const users = await User.paginate(filter, options);
  return users;
};

/**
 * Admin approve a teacher — uses the teacher's own registeredSchoolId (admin can approve any school's teachers)
 */
const adminApproveTeacher = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user.role !== 'teacher') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Chỉ có thể duyệt tài khoản giáo viên');
  }
  if (user.registrationStatus !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tài khoản không trong trạng thái chờ duyệt');
  }
  if (!user.registeredSchoolId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Giáo viên chưa đăng ký vào trường nào');
  }
  user.registrationStatus = 'approved';
  user.schoolId = user.registeredSchoolId;
  user.isActive = true;
  await user.save();
  return user;
};

/**
 * Admin reject a teacher
 */
const adminRejectTeacher = async (userId, reason = null) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user.role !== 'teacher') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Chỉ có thể từ chối tài khoản giáo viên');
  }
  if (user.registrationStatus !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tài khoản không trong trạng thái chờ duyệt');
  }
  user.registrationStatus = 'rejected';
  user.rejectedReason = reason;
  await user.save();
  return user;
};
```

**Khác biệt với `approveTeacher` cũ:**
- Không tham số `schoolId` — service tự lấy từ `user.registeredSchoolId`.
- Bỏ check `user.registeredSchoolId?.toString() !== schoolId.toString()` (admin không bị giới hạn trường).
- Thêm check `user.role !== 'teacher'` để bảo vệ.

### 4.4 Exports

Trong `user.service.js`:

```javascript
module.exports = {
  // ... existing exports
  getPendingTeachersForSchool,
  adminApproveTeacher,
  adminRejectTeacher,
};
```

Trong `user.controller.js`:

```javascript
module.exports = {
  // ... existing exports
  adminGetPendingTeachers,
  adminApproveTeacher,
  adminRejectTeacher,
};
```

### 4.5 Error Handling

| Tình huống | HTTP Code | Message |
|---|---|---|
| `schoolId` thiếu trong query | 400 | `schoolId is required` |
| User không phải admin | 403 | `Chỉ admin mới có quyền truy cập` |
| UserId không tồn tại | 404 | `User not found` |
| User không phải teacher | 400 | `Chỉ có thể duyệt/từ chối tài khoản giáo viên` |
| User không trong trạng thái pending | 400 | `Tài khoản không trong trạng thái chờ duyệt` |
| Teacher chưa đăng ký trường | 400 | `Giáo viên chưa đăng ký vào trường nào` |

---

## 5. Frontend Design

### 5.1 Service

Trong `client/web/src/services/approval.service.ts`, thêm 3 method:

```typescript
// ── Admin Teacher Approval (used by system admin in SchoolDetailModal) ──

getAdminPendingTeachers: async (params: {
  schoolId: string;
  page?: number;
  limit?: number;
}): Promise<ApprovalResponse<PendingTeacher>> => {
  const response = await apiService.get<ApprovalResponse<PendingTeacher>>(
    '/users/admin/teachers/pending',
    { params }
  );
  return response;
},

adminApproveTeacher: async (userId: string): Promise<User> => {
  const response = await apiService.post<User>(`/users/admin/teachers/${userId}/approve`);
  return response;
},

adminRejectTeacher: async (userId: string, reason?: string): Promise<User> => {
  const response = await apiService.post<User>(
    `/users/admin/teachers/${userId}/reject`,
    { reason }
  );
  return response;
},
```

### 5.2 Store

Trong `client/web/src/presentation/store/approvalStore.ts`, **tách biệt state** với school-admin (không dùng chung `pendingTeachers`):

**State mới:**
```typescript
adminPendingTeachers: PendingTeacher[];
adminPendingTeachersCount: number;
isLoadingAdminTeachers: boolean;
```

**Actions mới:**
```typescript
fetchAdminPendingTeachers: (schoolId: string) => Promise<void>;
adminApproveTeacher: (userId: string) => Promise<void>;
adminRejectTeacher: (userId: string, reason?: string) => Promise<void>;
```

**Implementation:**

```typescript
// State initial values
adminPendingTeachers: [],
adminPendingTeachersCount: 0,
isLoadingAdminTeachers: false,

// Action implementations
fetchAdminPendingTeachers: async (schoolId: string) => {
  set({ isLoadingAdminTeachers: true, error: null });
  try {
    const data = await approvalService.getAdminPendingTeachers({ schoolId, limit: 100 });
    set({
      adminPendingTeachers: data.results,
      adminPendingTeachersCount: data.total,
      isLoadingAdminTeachers: false,
    });
  } catch (err: any) {
    set({
      error: err?.message || 'Failed to fetch pending teachers for school',
      isLoadingAdminTeachers: false,
    });
  }
},

adminApproveTeacher: async (userId: string) => {
  try {
    await approvalService.adminApproveTeacher(userId);
    const filtered = get().adminPendingTeachers.filter(
      (t) => t.id !== userId && t._id !== userId
    );
    set({
      adminPendingTeachers: filtered,
      adminPendingTeachersCount: get().adminPendingTeachersCount - 1,
    });
  } catch (err: any) {
    set({ error: err?.message || 'Failed to approve teacher' });
    throw err;
  }
},

adminRejectTeacher: async (userId: string, reason?: string) => {
  try {
    await approvalService.adminRejectTeacher(userId, reason);
    const filtered = get().adminPendingTeachers.filter(
      (t) => t.id !== userId && t._id !== userId
    );
    set({
      adminPendingTeachers: filtered,
      adminPendingTeachersCount: get().adminPendingTeachersCount - 1,
    });
  } catch (err: any) {
    set({ error: err?.message || 'Failed to reject teacher' });
    throw err;
  }
},
```

**Lý do tách state:**
- `ApprovalPage` (school-admin) dùng `pendingTeachers` cũ, cần giữ nguyên
- `SchoolDetailModal` (admin) dùng `adminPendingTeachers` mới
- Tách riêng để tránh ghi đè data khi 2 role khác nhau dùng cùng store

### 5.3 UI Component

Trong `client/web/src/presentation/components/superadmin/SchoolDetailModal.tsx`, chèn section mới "Pending Teachers" giữa "General Info" và "School Admin":

```
┌─ SchoolDetailModal ─────────────────────────────────────────┐
│  [Header] School Details - "Nguyễn Du High School"  [X]    │
├─────────────────────────────────────────────────────────────┤
│  Section 1: General Info (existing)                        │
├─────────────────────────────────────────────────────────────┤
│  Section 2: Pending Teachers (NEW)                          │
│  • Count badge: "3 pending"                                 │
│  • Loading state                                            │
│  • List of teacher cards (or empty state)                   │
├─────────────────────────────────────────────────────────────┤
│  Section 3: School Admin (existing)                         │
└─────────────────────────────────────────────────────────────┘
```

**Sub-component** (tạo trong cùng file `SchoolDetailModal.tsx`):

```typescript
// ── Sub-component: PendingTeachersSection ─────────────────────

interface PendingTeachersSectionProps {
  schoolId: string;
}

const PendingTeachersSection: React.FC<PendingTeachersSectionProps> = ({ schoolId }) => {
  const {
    adminPendingTeachers,
    adminPendingTeachersCount,
    isLoadingAdminTeachers,
    fetchAdminPendingTeachers,
    adminApproveTeacher,
    adminRejectTeacher,
  } = useApprovalStore();

  useEffect(() => {
    if (schoolId) {
      fetchAdminPendingTeachers(schoolId);
    }
  }, [schoolId, fetchAdminPendingTeachers]);

  const handleApprove = async (userId: string) => {
    try {
      await adminApproveTeacher(userId);
      toast.success('Đã duyệt giáo viên thành công');
    } catch {
      toast.error('Duyệt giáo viên thất bại');
    }
  };

  const handleReject = async (userId: string) => {
    const reason = window.prompt('Lý do từ chối (tuỳ chọn):') || undefined;
    try {
      await adminRejectTeacher(userId, reason);
      toast.success('Đã từ chối giáo viên');
    } catch {
      toast.error('Từ chối giáo viên thất bại');
    }
  };

  return (
    <div className={styles.detailSection}>
      <div className={styles.sectionHeader}>
        <h3>Giáo viên chờ duyệt</h3>
        {adminPendingTeachersCount > 0 && (
          <span className={styles.badge}>{adminPendingTeachersCount} pending</span>
        )}
      </div>

      {isLoadingAdminTeachers ? (
        <div className={styles.loadingState}>
          <Spinner size="sm" /> <span>Đang tải...</span>
        </div>
      ) : adminPendingTeachers.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Không có giáo viên nào đang chờ duyệt.</p>
        </div>
      ) : (
        <div className={styles.teacherList}>
          {adminPendingTeachers.map((teacher) => (
            <div key={teacher._id} className={styles.teacherCard}>
              <div className={styles.teacherAvatar}>
                {teacher.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className={styles.teacherInfo}>
                <div className={styles.teacherName}>{teacher.name}</div>
                <div className={styles.teacherEmail}>{teacher.email}</div>
                {teacher.registeredAt && (
                  <div className={styles.teacherDate}>
                    Đăng ký: {new Date(teacher.registeredAt).toLocaleDateString('vi-VN')}
                  </div>
                )}
              </div>
              <div className={styles.teacherActions}>
                <Button size="sm" variant="primary" onClick={() => handleApprove(teacher._id)}>
                  Duyệt
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleReject(teacher._id)}>
                  Từ chối
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

**Tích hợp vào SchoolDetailModal:**

```typescript
// Trong component chính, sau section General Info:
{school?._id && (
  <PendingTeachersSection schoolId={school._id} />
)}
```

### 5.4 CSS

Thêm vào `SchoolDetailModal.module.css`:

```css
.detailSection {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.sectionHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.sectionHeader h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background-color: #fef3c7;
  color: #92400e;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.loadingState,
.emptyState {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  color: #6b7280;
  font-size: 0.9rem;
}

.emptyState p {
  margin: 0;
}

.teacherList {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.teacherCard {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.teacherAvatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.teacherInfo {
  flex: 1;
  min-width: 0;
}

.teacherName {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.95rem;
}

.teacherEmail {
  color: #6b7280;
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.teacherDate {
  color: #9ca3af;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.teacherActions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}
```

### 5.5 Edge Cases

1. **Modal mở nhiều trường liên tiếp**: `useEffect` với dependency `[schoolId]` re-fetch khi đổi trường
2. **API lỗi**: Hiển thị message lỗi inline, không crash modal
3. **School admin chưa active**: Vẫn hiển thị section (giáo viên có thể pending)
4. **No pending teachers**: Hiển thị empty state rõ ràng
5. **Confirm reject**: Dùng `window.prompt` đơn giản cho MVP

---

## 6. Testing Strategy

### 6.1 Tổng quan

TDD RED-GREEN-REFACTOR cho toàn bộ implementation.

### 6.2 Backend Tests

#### `server/tests/unit/services/user.service.adminApproval.test.js`

**`getPendingTeachersForSchool`**
- ✅ Trả về danh sách giáo viên pending thuộc schoolId
- ✅ Trả về danh sách rỗng khi không có ai
- ✅ Chỉ lấy user có `role: 'teacher'` và `registrationStatus: 'pending'`
- ✅ Bỏ qua teacher đã approved/rejected
- ✅ Pagination hoạt động đúng (page, limit, sortBy)

**`adminApproveTeacher`**
- ✅ Approve thành công: `registrationStatus` → `'approved'`, `schoolId` set = `registeredSchoolId`, `isActive = true`
- ✅ Throw 404 khi userId không tồn tại
- ✅ Throw 400 khi user không phải teacher
- ✅ Throw 400 khi user không trong trạng thái pending
- ✅ Throw 400 khi user không có `registeredSchoolId`
- ✅ Approve được teacher từ trường khác (không bị giới hạn)

**`adminRejectTeacher`**
- ✅ Reject thành công: `registrationStatus` → `'rejected'`, lưu `rejectedReason`
- ✅ Reject thành công khi không có reason
- ✅ Throw 404 khi userId không tồn tại
- ✅ Throw 400 khi user không phải teacher
- ✅ Throw 400 khi user không trong trạng thái pending

#### `server/tests/integration/user.adminApproval.test.js`

**`GET /api/v1/users/admin/teachers/pending`**
- ✅ 200 + trả về danh sách khi admin gọi với schoolId hợp lệ
- ✅ 403 khi user không phải admin
- ✅ 401 khi không có token
- ✅ 400 khi thiếu schoolId trong query
- ✅ Không trả về teacher của trường khác

**`POST /api/v1/users/admin/teachers/:userId/approve`**
- ✅ 200 + trả về user đã approved khi admin duyệt thành công
- ✅ 403 khi không phải admin
- ✅ 404 khi userId không tồn tại
- ✅ 400 khi user đã approved/rejected trước đó
- ✅ 400 khi user không phải teacher

**`POST /api/v1/users/admin/teachers/:userId/reject`**
- ✅ 200 + trả về user đã rejected với reason
- ✅ 200 khi reject không có reason
- ✅ 403 khi không phải admin
- ✅ 404 khi userId không tồn tại

### 6.3 Frontend Tests

#### `client/web/src/__tests__/services/approval.service.admin.test.ts`

- ✅ `getAdminPendingTeachers` gọi đúng endpoint với params `schoolId`
- ✅ `getAdminPendingTeachers` trả về đúng shape data
- ✅ `adminApproveTeacher` gọi đúng endpoint POST với userId
- ✅ `adminRejectTeacher` gọi đúng endpoint POST với userId và body `{ reason }`
- ✅ Error handling: throw error khi network fail

#### `client/web/src/__tests__/stores/approvalStore.admin.test.ts`

- ✅ Initial state: `adminPendingTeachers = []`, `isLoadingAdminTeachers = false`
- ✅ `fetchAdminPendingTeachers` thành công: set state đúng
- ✅ `fetchAdminPendingTeachers` lỗi: set error
- ✅ `adminApproveTeacher` thành công: xóa teacher khỏi list, giảm count
- ✅ `adminApproveTeacher` lỗi: throw error, không thay đổi state
- ✅ `adminRejectTeacher` thành công: xóa teacher khỏi list, giảm count
- ✅ `adminRejectTeacher` lỗi: throw error

#### `client/web/src/__tests__/components/PendingTeachersSection.test.tsx`

- ✅ Render loading state khi `isLoadingAdminTeachers = true`
- ✅ Render empty state khi không có pending teachers
- ✅ Render danh sách teacher cards đúng
- ✅ Click "Duyệt" gọi `adminApproveTeacher` với đúng userId
- ✅ Click "Từ chối" gọi `adminRejectTeacher` với đúng userId
- ✅ Hiển thị toast success khi approve/reject thành công
- ✅ Hiển thị toast error khi approve/reject thất bại
- ✅ Re-fetch khi `schoolId` prop thay đổi
- ✅ Hiển thị badge count đúng

### 6.4 Manual E2E Test Plan

**Scenario 1: Admin duyệt giáo viên**
1. Đăng nhập với tài khoản admin
2. Vào `/schools` (SchoolsPage)
3. Click "View Details" trên một trường có pending teachers
4. SchoolDetailModal mở, section "Pending Teachers" hiển thị danh sách
5. Click "Duyệt" trên một giáo viên
6. Verify: giáo viên biến mất, badge count giảm, toast success
7. Verify trong DB: `registrationStatus = 'approved'`

**Scenario 2: Admin từ chối giáo viên**
1. Lặp lại bước 1-4 ở trên
2. Click "Từ chối" trên một giáo viên
3. Nhập lý do trong prompt
4. Verify: giáo viên biến mất, toast success
5. Verify trong DB: `registrationStatus = 'rejected'`, `rejectedReason` lưu đúng

**Scenario 3: Permission**
1. Đăng nhập với teacher → thử gọi API `/users/admin/teachers/pending` → 403
2. Đăng nhập với school-admin → thử gọi API → 403

**Scenario 4: Empty state**
1. Chọn trường không có pending teachers
2. Verify: section hiển thị "Không có giáo viên nào đang chờ duyệt."

### 6.5 Coverage Goals

- **Backend service methods**: 100% line coverage, 100% branch coverage
- **Backend controllers**: ≥ 90% line coverage
- **Backend routes**: 100% integration test coverage
- **Frontend service methods**: 100% method coverage
- **Frontend store actions**: 100% action coverage
- **Frontend component**: ≥ 85% line coverage

### 6.6 Definition of Done

- [ ] Tất cả unit tests pass (backend + frontend)
- [ ] Tất cả integration tests pass
- [ ] Không có regression (tất cả tests cũ vẫn pass)
- [ ] Manual E2E test 4 scenarios pass
- [ ] ESLint không có warning mới
- [ ] Code coverage đạt goal
- [ ] Đã review bởi user

---

## 7. File Changes Summary

### Backend

| File | Action | Description |
|---|---|---|
| `server/src/routes/v1/user.route.js` | Modify | Thêm 3 routes `/admin/teachers/*` trước `/:userId` |
| `server/src/controllers/user.controller.js` | Modify | Thêm 3 controller methods + exports |
| `server/src/services/user.service.js` | Modify | Thêm 3 service methods + exports |
| `server/tests/unit/services/user.service.adminApproval.test.js` | Create | Unit tests cho 3 service methods |
| `server/tests/integration/user.adminApproval.test.js` | Create | Integration tests cho 3 endpoints |

### Frontend

| File | Action | Description |
|---|---|---|
| `client/web/src/services/approval.service.ts` | Modify | Thêm 3 service methods |
| `client/web/src/presentation/store/approvalStore.ts` | Modify | Thêm state + actions mới cho admin |
| `client/web/src/presentation/components/superadmin/SchoolDetailModal.tsx` | Modify | Thêm sub-component `PendingTeachersSection` + tích hợp |
| `client/web/src/presentation/components/superadmin/SchoolDetailModal.module.css` | Modify | Thêm CSS cho section mới |
| `client/web/src/__tests__/services/approval.service.admin.test.ts` | Create | Test cho 3 service methods |
| `client/web/src/__tests__/stores/approvalStore.admin.test.ts` | Create | Test cho state + actions mới |
| `client/web/src/__tests__/components/PendingTeachersSection.test.tsx` | Create | Test cho component mới |

**Tổng cộng: 5 file modify, 5 file create**

---

## 8. Open Questions

Không có — đã clarify đủ trong quá trình brainstorm.

---

## 9. Next Steps

Sau khi user review và approve design này:

1. Chuyển sang **writing-plans** để tạo implementation plan chi tiết
2. Plan sẽ chia thành các task bite-sized (2-5 phút mỗi task)
3. Áp dụng TDD: viết test trước, code sau
4. Commit theo từng task

---

**Status:** Awaiting user review → proceed to writing-plans
