# Question Bank Security & Access Control Design

> **Date:** 2026-06-04
> **Feature:** Chiến lược 3 - Bảo mật & Phân quyền Question Bank

---

## 1. Problem Statement

Question bank hiện tại là **public cho tất cả người dùng đã đăng nhập**:
- Không có `schoolId` trên Question model - không phân tách theo trường
- Không có ownership check - teacher có thể sửa/xóa câu hỏi của người khác
- Student thấy đáp án đúng trên tất cả câu hỏi
- Auto-approve luôn true

---

## 2. Goals

1. **Phân tách theo trường** - teacher chỉ thấy/quản lý câu hỏi của trường mình
2. **Ownership check** - chỉ owner hoặc admin mới được sửa/xóa
3. **Ẩn đáp án với student** - student không thấy đáp án đúng trên UI
4. **Approval workflow** - câu hỏi mới cần được duyệt trước khi hiển thị với student

---

## 3. Architecture

```
Frontend (React/TypeScript)
├── QuestionBankPage.tsx         - Thêm role check cho UI
├── QuestionCard.tsx             - Ẩn đáp án với student
├── useQuestionPermissions.ts    - Hook quyền (mới)
└── questionStore.ts             - Truyền user context

Backend (Node.js/Express/MongoDB)
├── question.model.js            - Thêm schoolId field
├── question.service.js         - Access control logic + filter theo role
├── question.controller.js      - Truyền user vào service
└── question.route.js           - Giữ nguyên middleware
```

---

## 4. Data Model Changes

### 4.1 Question Schema - `server/src/models/question.model.js`

Thêm `schoolId` field:

```javascript
schoolId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'School',
  required: true,  // BẮT BUỘC - tất cả câu hỏi phải thuộc 1 trường
},
```

Thêm index:
```javascript
questionSchema.index({ schoolId: 1 });
questionSchema.index({ createdBy: 1 });
questionSchema.index({ schoolId: 1, isApproved: 1 });
```

### 4.2 User Schema - Đã có sẵn

User model đã có `schoolId` field (line 70-74):
```javascript
schoolId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'School',
  default: null,
},
```

---

## 5. Backend Changes

### 5.1 Service Layer - `server/src/services/question.service.js`

**Method: `create(data, userId, userSchoolId)`**
- Nhận thêm `userSchoolId` từ controller
- Tự động gán `schoolId = userSchoolId`
- `isApproved = false` (cần duyệt thủ công)

**Method: `getAll(query, user)`**
- Filter theo role:
  - `admin`: thấy tất cả câu hỏi (hoặc filter theo schoolId query param)
  - `teacher`: chỉ thấy `schoolId === user.schoolId`
  - `student`: chỉ thấy `schoolId === user.schoolId` + `isApproved === true`

**Method: `update(id, data, user)`**
- Check ownership: `question.createdBy === user.id || user.role === 'admin'`
- Không cho sửa `schoolId`, `createdBy`

**Method: `delete(id, user)`**
- Check ownership: `question.createdBy === user.id || user.role === 'admin'`
- Check `usageCount === 0` (không xóa câu hỏi đã dùng trong exam)

**Method: `getById(id, user)`**
- Check school access theo role
- Filter đáp án theo role (student không thấy `isCorrect`)

### 5.2 Controller - `server/src/controllers/question.controller.js`

- Truyền `req.user` vào service methods
- Extract `user.schoolId` từ JWT payload

### 5.3 Route - `server/src/routes/v1/question.route.js`

Giữ nguyên middleware. Access control chuyển vào service layer.

### 5.4 Auto-Approve Behavior Change

- **Trước:** `data.isApproved = true` (line 14)
- **Sau:** `data.isApproved = false` (teacher tạo), `data.isApproved = true` (admin tạo)

---

## 6. Frontend Changes

### 6.1 Permission Hook - `client/web/src/hooks/useQuestionPermissions.ts` (mới)

```typescript
interface QuestionPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: (question: Question) => boolean;
  canDelete: (question: Question) => boolean;
  canApprove: boolean;
  canViewAnswers: boolean;
  canViewPending: boolean;
}

function useQuestionPermissions(): QuestionPermissions;
```

### 6.2 QuestionBankPage - `client/web/src/pages/QuestionBankPage.tsx`

- Sử dụng `useQuestionPermissions()` hook
- Ẩn button "Add Question" với student (`canCreate`)
- Thêm filter "Pending Approval" cho teacher/admin
- Không hiển thị badge "Correct Answer" với student

### 6.3 Store - `client/web/src/presentation/store/questionStore.ts`

- Thêm `isApproved` filter vào `filters` state
- Map `createdBy` từ backend response

---

## 7. Permission Matrix

| Action | Admin | Teacher | Student |
|--------|:-----:|:-------:|:-------:|
| View questions (own school) | ✅ | ✅ | ✅ |
| View pending questions | ✅ | ✅ | ❌ |
| Create question | ✅ | ✅ | ❌ |
| Edit own question | ✅ | ✅ | ❌ |
| Edit other's question | ✅ | ❌ | ❌ |
| Delete own question (unused) | ✅ | ✅ | ❌ |
| Delete question (used) | ✅ | ❌ | ❌ |
| Approve question | ✅ | ✅ | ❌ |
| View correct answers | ✅ | ✅ | ❌ |

---

## 8. API Changes Summary

### GET /api/v1/questions
- **Before:** Returns all questions to any authenticated user
- **After:** Filtered by user's schoolId; students only see approved questions

### GET /api/v1/questions/:id
- **Before:** Returns full question with `isCorrect` to all
- **After:** Students get `options` without `isCorrect` field

### POST /api/v1/questions
- **Before:** `isApproved = true` auto
- **After:** `isApproved = false` for teacher, `true` for admin

### PATCH /api/v1/questions/:id
- **Before:** Any user with `manageQuestions` right can edit
- **After:** Only owner or admin can edit

### DELETE /api/v1/questions/:id
- **Before:** Any user with `manageQuestions` right can delete
- **After:** Only owner or admin, and question must have `usageCount === 0`

### POST /api/v1/questions/:id/approve
- **Before:** No check
- **After:** Only admin or teacher can approve questions from their school

---

## 9. Testing Strategy

### Backend Tests (Jest)
- `tests/unit/services/question.service.test.js`
  - Test `getAll` filter theo role
  - Test `create` gán schoolId
  - Test `update` ownership check
  - Test `delete` ownership + usage check
  - Test `getById` answer visibility

### Frontend Tests
- `client/web/src/__tests__/hooks/useQuestionPermissions.test.ts`
- Test permission hook theo role

---

## 10. Migration Plan

1. Thêm `schoolId` field với `required: false` + default null
2. Chạy migration để gán `schoolId` cho tất cả questions hiện có
3. Đổi `required: true` sau khi migration xong
4. Deploy code mới
5. Verify không có breaking changes

---

## 11. Scope (Out of Scope for This Implementation)

- Shared question bank giữa các trường
- Question versioning
- Mã hóa đáp án nhạy cảm
- Audit log đầy đủ
