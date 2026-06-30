# Question Bank Access Control Design

## Overview
Mỗi question bank có người quản lý riêng. Người khác muốn truy cập cần phê duyệt. Chỉ manager trở lên mới sửa được bank và bổ nhiệm người khác. Với bank của trường, danh sách quản lý phải luôn có ít nhất một school admin.

## Approach
Được chọn từ 3 hướng đã đánh giá trước đó:
- Hướng 1: `QuestionBank` + `QuestionBankMember`
- Lý do: đúng trực tiếp yêu cầu, tách biệt access control, dễ mở rộng metadata.

## Data Model

### QuestionBank
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  type: 'personal' | 'school',
  schoolId: ObjectId | null,
  createdBy: ObjectId,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### QuestionBankMember
```javascript
{
  _id: ObjectId,
  bankId: ObjectId,
  userId: ObjectId,
  role: 'owner' | 'manager' | 'viewer',
  status: 'active' | 'pending',
  invitedBy: ObjectId | null,
  invitedAt: Date | null,
  approvedBy: ObjectId | null,
  approvedAt: Date | null,
  createdAt: Date
}
```

### Question update
Thêm field:
```javascript
bankId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'QuestionBank',
  index: true
}
```

## Indexes
- `QuestionBank`: `{ schoolId: 1, type: 1 }`, `{ createdBy: 1 }`
- `QuestionBankMember`: `{ bankId: 1, userId: 1 }` unique, `{ userId: 1 }`
- `Question`: `{ bankId: 1 }`

## API Contracts

### Bank CRUD
- `POST /api/v1/banks`
- `GET /api/v1/banks`
- `GET /api/v1/banks/:id`
- `PATCH /api/v1/banks/:id`
- `DELETE /api/v1/banks/:id`

### Member Management
- `POST /api/v1/banks/:id/members`
- `GET /api/v1/banks/:id/members`
- `PATCH /api/v1/banks/:id/members/:userId`
- `DELETE /api/v1/banks/:id/members/:userId`
- `POST /api/v1/banks/:id/leave`
- `POST /api/v1/banks/:id/transfer`

### Access Request Flow
- `POST /api/v1/banks/:id/request-access`
- `GET /api/v1/banks/:id/requests/pending`
- `POST /api/v1/banks/:id/requests/:userId/respond`

### Question Bank Integration
- `POST /api/v1/banks/:id/questions`
- `DELETE /api/v1/banks/:id/questions/:questionId`
- `GET /api/v1/banks/:id/questions`
- `POST /api/v1/banks/:id/questions/move`

## Business Rules
- School bank bắt buộc có ít nhất một school admin trong danh sách `manager`/`owner`.
- Khi tạo school bank, auto-assign creator và ít nhất một school admin làm owner.
- Manager không được invite owner.
- Owner không thể leave mà phải transfer ownership trước.
- Không được xóa bank nếu đang có question thuộc bank đó.

## Implementation Plan
1. Backend core: models, services, middlewares.
2. API endpoints + tests.
3. Frontend: web + mobile pages/components.
4. Migration script cho questions cũ + default personal bank.
5. Testing + polish.
