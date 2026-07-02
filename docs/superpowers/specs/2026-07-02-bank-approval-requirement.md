# Teacher Bank Approval Requirement

## Overview
Giữ lại khả năng khám phá bank toàn trường, nhưng chuyển `GET /api/v1/banks` sang danh sách bank đã được phê duyệt tham gia đối với teacher/student/parent. `school-admin` vẫn xem được toàn bộ bank của trường. Luồng tìm kiếm và yêu cầu truy cập giữ nguyên.

## Goal
- Teacher không còn thấy tất cả bank của trường trong **Your Banks** chỉ vì cùng trường.
- Teacher vẫn có thể tìm bank trong **All Banks** và gửi yêu cầu truy cập.
- Sau khi owner/manager phê duyệt, bank mới xuất hiện trong **Your Banks**.

## Approach
Chọn phương án 1:
- `admin`: giữ nguyên, xem tất cả bank.
- `school-admin`: giữ nguyên, xem tất cả bank của trường.
- `teacher`, `student`, `parent`: chỉ xem bank có `QuestionBankMember.status === 'active'`.
- Giữ nguyên `GET /api/v1/banks/search` để hỗ trợ tìm kiếm và yêu cầu truy cập.

## API Changes

### `GET /api/v1/banks`
**Before:**
- `admin`: tất cả bank.
- user có `schoolId`: tất cả bank của trường.
- user không có `schoolId`: chỉ bank mình là member.

**After:**
- `admin`: tất cả bank.
- `school-admin` có `schoolId`: tất cả bank của trường.
- các role khác: chỉ bank có membership `active` của chính user.
- user không có `schoolId`: chỉ bank có membership `active` của chính user.

### `GET /api/v1/banks/search`
Không thay đổi. Endpoint này tiếp tục trả về danh sách bank có thể tìm kiếm để teacher gửi yêu cầu truy cập.

## Service Changes

### `server/src/services/questionBank.service.js`
Thêm method trả về bank đã được phê duyệt cho user:

```javascript
async listApprovedBanksForUser(userId) {
  const memberships = await QuestionBankMember.find({
    userId,
    status: 'active',
  }).lean();
  const bankIds = memberships.map((m) => m.bankId);
  if (bankIds.length === 0) return [];
  return QuestionBank.find({ _id: { $in: bankIds } })
    .select('name description type schoolId createdAt')
    .sort({ createdAt: -1 })
    .lean();
}
```

## Controller Changes

### `server/src/controllers/questionBank.controller.js`
Cập nhật `listBanks`:

```javascript
const listBanks = catchAsync(async (req, res) => {
  if (req.user.role === 'admin') {
    const banks = await QuestionBank.find()
      .select('name description type schoolId createdAt')
      .sort({ createdAt: -1 })
      .lean();
    return res.send(banks);
  }

  if (req.user.role === 'school-admin' && req.user.schoolId) {
    const banks = await QuestionBank.find({ schoolId: req.user.schoolId })
      .select('name description type schoolId createdAt')
      .sort({ createdAt: -1 })
      .lean();
    return res.send(banks);
  }

  const banks = await QuestionBankService.listApprovedBanksForUser(req.user.id);
  return res.send(banks);
});
```

## Frontend Changes

### `client/web/src/pages/BankLandingPage.tsx`
Có thể điều chỉnh nhẹ empty state cho non-admin:
- Khi **Your Banks** rỗng, gợi ý tìm bank trong **All Banks** và gửi yêu cầu truy cập.

### Các trang frontend khác
Không cần thay đổi lớn. `BankSelector`, `BankMembersPage`, `BankRequestsPage` đã dùng `GET /banks/:bankId` có `checkBankAccess`, nên tự động bảo vệ chi tiết bank.

## Question Access Behavior
`GET /api/v1/banks/:bankId/questions` hiện đã có `checkBankAccess`. Sau thay đổi này:
- Teacher chỉ vào được endpoint này với bank đã được phê duyệt.
- `GET /api/v1/questions?bankId=...` hiện vẫn dùng `buildRoleFilter` theo `schoolId`, không theo membership. Nếu muốn chặt hơn, có thể cân nhắc bổ sung bank membership check sau, nhưng ngoài scope của thay đổi này.

## Business Rules
- Teacher có thể tìm và yêu cầu truy cập bất kỳ bank nào trong **All Banks**.
- Bank chỉ xuất hiện trong **Your Banks** khi `QuestionBankMember.status === 'active'`.
- `school-admin` vẫn xem được toàn bộ bank của trường.
- `admin` vẫn xem được toàn bộ bank hệ thống.

## Testing

### Backend
- `listBanks` với `teacher`: chỉ trả về bank có membership active.
- `listBanks` với `student`: chỉ trả về bank có membership active.
- `listBanks` với `school-admin`: vẫn trả về bank của trường.
- `listBanks` với `admin`: vẫn trả về tất cả bank.

### Frontend
- Teacher thấy đúng **Your Banks** sau khi được phê duyệt.
- Teacher vẫn thấy **All Banks** và có thể gửi request.
- Empty state phù hợp khi chưa có bank nào được phê duyệt.

## Scope
- Không thay đổi `GET /api/v1/banks/search`.
- Không thay đổi luồng request-access, approve/reject.
- Không thay đổi quyền chi tiết bank, member management.
- Không đổi `question.service.js` trong lần thay đổi này.

## Implementation Plan
1. Thêm `listApprovedBanksForUser` trong `questionBank.service.js`.
2. Cập nhật `listBanks` trong `questionBank.controller.js`.
3. Chạy test backend liên quan.
4. Kiểm tra frontend `BankLandingPage.tsx`.
5. Commit và chuẩn bị merge.
