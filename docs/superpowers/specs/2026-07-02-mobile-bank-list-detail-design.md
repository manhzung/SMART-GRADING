# Mobile Question Bank List & Detail Design

**Date:** 2026-07-02
**Status:** Approved
**Platform:** Flutter Mobile
**Scope:** Phases 1 — bank listing + bank detail only

---

## 1. Context

Web hiện đã có luồng ngân hàng câu hỏi hoàn chỉnh:
- `BankLandingPage`: danh sách bank, tạo bank
- `QuestionBankPage`: chi tiết bank + câu hỏi
- `BankMembersPage` / `BankRequestsPage`: quản lý thành viên và yêu cầu truy cập
- `bankStore` + `bankService` quản lý state và API

Mobile hiện chỉ có `QuestionBankPage` đơn lẻ, là danh sách câu hỏi phẳng, không có khái niệm `QuestionBank`, không có members/requests, không có màn hình danh sách bank.

Yêu cầu: **mobile cũng phải có luồng giống web**, nhưng **chỉ bắt đầu với 2 phần**:
1. Xem danh sách banks
2. Xem chi tiết 1 bank

---

## 2. User Flow

```
Home / Exam page
  └─ icon quiz (Icons.quiz_outlined)
       └─ /banks
            ├─ Your Banks
            └─ All Banks in System
                 └─ tap card → /banks/:bankId
                                 └─ BankDetailPage
                                      ├─ bank info header
                                      ├─ questions list
                                      └─ future: members/requests tabs
```

### Luồng điều hướng
- Từ home/exam bấm icon `quiz_outlined` → vào danh sách banks
- Bấm vào 1 bank → xem chi tiết bank đó
- Chi tiết bank bao gồm thông tin bank + danh sách câu hỏi trong bank

### Route mapping
| Route | Screen | Purpose |
|-------|--------|---------|
| `/banks` | `BanksPage` | Danh sách banks, tạo bank mới |
| `/banks/:bankId` | `BankDetailPage` | Chi tiết bank + câu hỏi |

---

## 3. Architecture

### Domain Layer
Thêm 2 entity mới, giữ nguyên `QuestionModel` hiện tại:

```dart
class QuestionBank {
  final String id;
  final String name;
  final String? description;
  final String type; // personal | school
  final String? schoolId;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class BankMembership {
  final String bankId;
  final String userId;
  final String role; // owner | manager | viewer
  final String status; // active | pending
}
```

### API Layer
Thêm `BankService`, giữ nguyên `QuestionService`:

```dart
class BankService {
  Future<List<BankSummary>> listBanks();
  Future<BankDetail> getBank(String bankId);
  Future<QuestionBank> createBank({
    String name,
    String? description,
    String type,
  });
  Future<void> requestAccess(String bankId);
}

class BankSummary {
  final QuestionBank bank;
  final BankMembership? membership;
}

class BankDetail {
  final QuestionBank bank;
  final BankMembership? membership;
}
```

Backend endpoints sử dụng:
- `GET /banks`
- `GET /banks/:bankId`
- `POST /banks`
- `POST /banks/:bankId/request-access`
- `GET /banks/search` (cho "All Banks")

### Presentation Layer
- `BanksPage`: thay thế `QuestionBankPage` hiện tại làm entrypoint
- `BankDetailPage`: màn hình mới, kết hợp bank info + question list
- `QuestionBankPage` cũ sẽ được tái cấu trúc thành widget con trong `BankDetailPage`

---

## 4. Màn hình 1: BanksPage

### Mục đích
Xem danh sách banks của user, tạo bank mới, mở bank chi tiết.

### Layout
- AppBar: tiêu đề "Question Banks"
- Body:
  - Floating Action Button: tạo bank mới
  - Search bar: tìm kiếm banks
  - Danh sách chia 2 nhóm:
    1. **Your Banks**: banks user đang tham gia
    2. **All Banks**: tất cả banks trong hệ thống (trừ banks user đã tham gia)

### Your Banks Card
- Icon: quiz/book
- Tên bank
- Badge loại: Personal/School
- Badge role: Owner/Manager/Viewer
- Mô tả ngắn (nếu có)
- Nút "Open" → navigate sang `BankDetailPage`

### All Banks Card
- Tên bank
- Badge loại
- Mô tả ngắn
- Nút "Request Access" → gọi API request access

### Actions
- Tạo bank: modal bottom sheet hoặc dialog nhập name, description, type
- Search: debounced search qua `/banks/search`

---

## 5. Màn hình 2: BankDetailPage

### Mục đích
Xem thông tin chi tiết 1 bank và danh sách câu hỏi trong bank.

### Layout
- AppBar: tiêu đề tên bank, nút back
- Body:
  - Bank info header:
    - Tên bank
    - Badge loại
    - Badge role của user hiện tại
    - Mô tả (nếu có)
  - Phần câu hỏi:
    - Tái sử dụng luồng cũ của `QuestionBankPage` nhưng filter theo `bankId`
    - Các filter/search/difficulty giữ nguyên
    - Add/Edit/Delete question giữ nguyên

### Questions in Bank
- API: `GET /questions?bankId=:bankId`
- Giữ nguyên `QuestionModel` hiện tại
- Thêm filter/search/difficulty như hiện tại
- FAB thêm câu hỏi mới vào bank

### Role-based actions
- Owner/Manager: thấy nút quản lý bank cơ bản
- Viewer: chỉ xem, không sửa/xóa

---

## 6. Data Model Changes

### Mobile Entities
```
lib/domain/entities/
  ├── question.entity.dart          (existing)
  ├── question_bank.entity.dart     (new)
  └── bank_membership.entity.dart   (new)
```

### Mobile Services
```
lib/core/network/
  ├── question_service.dart         (existing)
  └── bank_service.dart             (new)
```

### Mobile Pages
```
lib/presentation/pages/
  ├── banks_page.dart               (new)
  └── bank_detail_page.dart         (new)
  └── question_bank_page.dart       (refactor -> widget)
```

---

## 7. API Contract

### BankService Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/banks` | List user's banks |
| GET | `/banks/:id` | Get bank + membership |
| POST | `/banks` | Create bank |
| GET | `/banks/search` | Search all banks |
| POST | `/banks/:id/request-access` | Request access |

### QuestionService Changes
- `getQuestions()` thêm param `bankId` optional
- `createQuestion()` cần `bankId`
- `getStats()` có thể thêm `bankId` optional

### Response Shapes (aligned with web)
```dart
class QuestionBank {
  String id;
  String name;
  String? description;
  String type; // personal | school
  String? schoolId;
  bool isActive;
  DateTime createdAt;
  DateTime updatedAt;
}

class BankMembership {
  String bankId;
  String userId;
  String role; // owner | manager | viewer
  String status; // active | pending
}

class BankSummary {
  QuestionBank bank;
  BankMembership? membership;
}
```

---

## 8. Migration Plan

### Phase 1: Foundation
- [ ] Tạo `QuestionBank` entity
- [ ] Tạo `BankMembership` entity
- [ ] Tạo `BankService`
- [ ] Register routes `/banks` và `/banks/:bankId`

### Phase 2: BanksPage
- [ ] Tạo `BanksPage`
- [ ] Fetch danh sách banks
- [ ] Hiển thị Your Banks + All Banks
- [ ] Tạo bank mới
- [ ] Tap card → navigate sang `BankDetailPage`

### Phase 3: BankDetailPage
- [ ] Tạo `BankDetailPage`
- [ ] Fetch bank detail
- [ ] Hiển thị bank info header
- [ ] Tích hợp question list với `bankId`
- [ ] Giữ nguyên các filter/search/difficulty

### Phase 4: Migration
- [ ] Cập nhật home page quiz icon → `/banks`
- [ ] Tái cấu trúc `QuestionBankPage` thành widget con
- [ ] Xóa route `/question-bank` cũ

---

## 9. Testing Strategy

### Unit Tests
- `bank_service_test.dart`: test API calls, error handling
- `question_bank_entity_test.dart`: test entity parsing
- `bank_membership_entity_test.dart`: test entity parsing

### Widget Tests
- `banks_page_test.dart`: test listing, search, create bank
- `bank_detail_page_test.dart`: test bank info, question list

### Integration Tests
- Test full flow: home → icon → banks → tap bank → detail
- Test create bank → see in list → open → add question

---

## 10. Future Extensions

Sau khi hoàn thành 2 màn hình này, có thể mở rộng:
- `BankMembersPage`: quản lý thành viên
- `BankRequestsPage`: duyệt yêu cầu truy cập
- BankSelector component: chọn bank khi tạo exam
- BankManagementModal: quản lý bank nhanh
