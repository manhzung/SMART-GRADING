# Scan Flow: Chọn Class sau khi chọn Exam

**Ngày:** 2026-06-14
**Trạng thái:** Draft (đã duyệt qua 4 phần brainstorming)
**Platform:** Flutter mobile client + Node.js backend
**Phạm vi:** Bổ sung bước chọn class giữa chọn exam và chọn student trong luồng quét bài (OMR scan)

---

## 1. Bối cảnh & Vấn đề

### 1.1 Luồng hiện tại (thiếu bước chọn class)

```
ExamSelectionPage
   ↓ tap exam (chỉ truyền exam)
StudentListPage(exam)
   ├── Quick Scan → CameraScannerPage(examId, examName)        // KHÔNG có classId
   └── Tap student → CameraScannerPage(examId, examName, studentId, studentName)
                ↓ scan success
                ↓ StudentPickerDialog.show(classId: '', ...)   // classId RỖNG cứng
                ↓ submit
                ↓ POST /v1/submissions (không gửi classId)
```

### 1.2 Vấn đề

- `Exam` entity có `classIds: List<ExamClass>` (nhiều class) + `primaryClassId: ExamClass?` (1 class chính)
- UI chỉ dùng `primaryClassId` → bỏ qua các class khác
- Khi "Quick Scan" hoặc scan không chọn student trước, `classId` truyền vào rỗng
- Server không nhận `classId` → mất thông tin ngữ cảnh khi tra cứu submission theo class
- User yêu cầu: **sau khi chọn exam, BẮT BUỘC chọn class trong các class gán với exam đó**

### 1.3 Yêu cầu chốt (từ user)

1. Thêm trang `ClassSelectionPage` mới giữa `ExamSelectionPage` → `StudentListPage`
2. **Quick Scan BẮT BUỘC chọn class** trước khi scan
3. **`classId` được gửi và lưu lên server** khi submit submission
4. **LUÔN hiển thị bước chọn class** (kể cả khi exam chỉ có 1 class)

---

## 2. Luồng mới

```
ExamSelectionPage              (chọn exam từ danh sách)
   ↓ tap exam
ClassSelectionPage (MỚI)      (chọn class trong exam.classIds + primaryClassId)
   ↓ tap class
StudentListPage (SỬA)          (load students của class đã chọn)
   ├── Quick Scan → CameraScannerPage(examId, examName, classId, className)
   └── Tap student → CameraScannerPage(examId, examName, classId, className, studentId, studentName)
                ↓ scan success → nếu chưa có student, StudentPickerDialog (classId đã có)
                ↓ submit
                ↓ POST /v1/submissions (gửi classId)
```

---

## 3. Trách nhiệm từng thành phần

### 3.1 `ClassSelectionPage` (MỚI)

**File:** `client/mobile/lib/presentation/pages/class_selection_page.dart`

**Inputs:**
- `required Exam exam`

**Behavior:**
- Tổng hợp danh sách class duy nhất từ:
  - `exam.classIds` (list)
  - `exam.primaryClassId` (1 phần tử, có thể trùng với 1 item trong classIds)
- Loại trùng theo `id`
- Mỗi card hiển thị: tên class, mã class, số students (nếu có), badge "Primary" nếu là `primaryClassId`
- Header: "Choose class for {exam.title}"
- Tap class → `Navigator.push` sang `StudentListPage(exam, classId, className)`
- Empty state: "No classes assigned to this exam" (nếu `classIds` rỗng và `primaryClassId` null)

**Reused components:**
- Style giống `ExamSelectionPage` (Scaffold trắng, card list, padding 16)
- Không cần bloc riêng — chỉ derive từ `exam` object đã có

### 3.2 `StudentListPage` (SỬA)

**File:** `client/mobile/lib/presentation/pages/student_list_page.dart`

**Thay đổi constructor:**
```dart
class StudentListPage extends StatefulWidget {
  final Exam exam;
  final String classId;        // MỚI - bắt buộc
  final String className;      // MỚI
  // ...
}
```

**Thay đổi logic:**
- `_loadStudents`: dùng `widget.classId` thay vì `widget.exam.primaryClassId?.id`
- AppBar title: hiển thị `${widget.className} • ${widget.exam.title}` (maxLines 1, ellipsis)
- `_openScanner`: truyền `classId: widget.classId, className: widget.className` sang `CameraScannerPage`

### 3.3 `CameraScannerPage` (SỬA)

**File:** `client/mobile/lib/presentation/pages/camera_scanner_page.dart`

**Thay đổi constructor:**
```dart
class CameraScannerPage extends StatefulWidget {
  // existing fields
  final String? classId;    // MỚI
  final String? className;  // MỚI
  // ...
}
```

**Thay đổi logic:**
- `_loadTemplate`: truyền `classId`, `className` vào `OMRScannerTemplateSet` event
- Khi `OMRScannerSuccess` và `widget.studentId == null` → gọi `StudentPickerDialog.show(classId: widget.classId ?? '', className: widget.className ?? widget.examName ?? '', ...)` — không còn rỗng
- AppBar title: hiển thị context (giữ nguyên `studentName` hoặc `examName`)

### 3.4 `OMRScannerBloc` (SỬA)

**File:** `client/mobile/lib/presentation/blocs/omr_scanner/omr_scanner_event.dart`, `omr_scanner_state.dart`, `omr_scanner_bloc.dart`

**Event mới fields:**
```dart
class OMRScannerTemplateSet extends OMRScannerEvent {
  // existing fields
  final String? classId;     // MỚI
  final String? className;   // MỚI
}
```

**State mới fields:**
```dart
class OMRScannerTemplateReady extends OMRScannerState {
  // existing fields
  final String? classId;     // MỚI
  final String? className;   // MỚI
}
```

**Logic `_onSubmit` thay đổi:**
- Lấy `classId` từ `OMRScannerTemplateReady` state
- Truyền `classId` vào `submitResultOnly()` call
- Offline pending submission: lưu `classId` vào `PendingSubmission` (xem 3.5)

### 3.5 `OMRSubmissionSyncService` (SỬA)

**File:** `client/mobile/lib/core/network/omr_submission_sync_service.dart`

**Thay đổi `submitResultOnly` signature:**
```dart
Future<bool> submitResultOnly({
  required String examId,
  required Map<String, String> answers,
  required double score,
  required double maxScore,
  String? studentId,
  String? classId,        // MỚI
  String? submissionId,
});
```

**Body thay đổi:**
```dart
data: {
  'examId': examId,
  'answers': jsonEncode(answers),
  'score': score.toString(),
  'maxScore': maxScore.toString(),
  if (studentId != null) 'studentId': studentId,
  if (classId != null) 'classId': classId,   // MỚI
  if (submissionId != null) 'submissionId': submissionId,
},
```

**Offline pending:** cũng cần lưu `classId` trong `PendingSubmission` model để sync sau.

### 3.6.1 `PendingSubmission` model (SỬA)

**File:** `client/mobile/lib/core/storage/omr_local_storage.dart`

**Thay đổi:**
- Thêm field: `final String? classId;`
- Cập nhật constructor, `toJson()`, `fromJson()`
- Cập nhật `updateSubmissionStatus` để preserve `classId`
- Cập nhật `syncPendingSubmissions` trong `omr_submission_sync_service.dart` để đọc và gửi `classId`

### 3.6.2 `submitScan` method (SỬA)

**File:** `client/mobile/lib/core/network/omr_submission_sync_service.dart`

**Thay đổi:**
- Thêm `String? classId` param vào `submitScan`
- Gửi `'classId': classId` trong FormData nếu có

### 3.7 Server side (Node.js) - SỬA

**Files:**
- `server/src/validations/submission.validation.js`
- `server/src/services/submission.service.js`
- `server/src/controllers/submission.controller.js`
- `server/src/models/submission.model.js` (hoặc tương đương)

**Validation (Joi):**
```js
const scanSubmission = {
  body: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    classId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),  // MỚI
    // ... existing fields
  }),
};
```

**Submission document:**
```js
{
  // ... existing fields
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },  // MỚI - optional
}
```

**Service `scan`:**
- Lưu `classId` vào submission document khi tạo
- KHÔNG validate rằng class thuộc exam (để tránh breaking change cho flow khác; admin sẽ xử lý sau)

---

## 4. API Contract

### 4.1 `POST /v1/submissions` (Mobile → Server)

**Request body (thay đổi):**
```json
{
  "examId": "65f1a2b3c4d5e6f7g8h9i0j1",
  "classId": "65f1a2b3c4d5e6f7g8h9i0j2",
  "studentId": "65f1a2b3c4d5e6f7g8h9i0j3",
  "answers": "{'q1':'A','q2':'B'}",
  "score": "8.0",
  "maxScore": "10.0"
}
```

**Backward compatibility:**
- `classId` optional → các flow cũ (web, manual submission) vẫn hoạt động
- Mobile flow mới LUÔN truyền `classId` nếu user đã chọn class

**Error responses:**
- `400` - Invalid classId format
- `400` - Missing required fields (examId, image, ...)

---

## 5. Error Handling

### 5.1 Mobile
- Defensive guard: nếu `classId == null || classId.isEmpty` khi submit → snackbar "Please select a class first", không gửi request
- Network error: fallback offline vẫn lưu `classId` vào `PendingSubmission`
- Empty state ở `ClassSelectionPage`: nếu exam không có class nào → block user, không cho scan

### 5.2 Server
- Invalid `classId` format → `400 { message: "Invalid classId" }`
- Lưu `classId` vào submission, không validate quan hệ với exam (tránh breaking change)

---

## 6. Testing Strategy

### 6.1 Mobile (Flutter) - TDD

**Tests mới/cập nhật:**

1. `test/presentation/pages/class_selection_page_test.dart` (MỚI)
   - Render đúng danh sách từ `classIds + primaryClassId`
   - Loại trùng theo `id`
   - Badge "Primary" cho `primaryClassId`
   - Tap class → navigate đúng
   - Empty state khi không có class

2. `test/presentation/pages/student_list_page_test.dart` (CẬP NHẬT)
   - Constructor nhận `classId` + `className`
   - `_loadStudents` dùng `classId` thay vì `primaryClassId`
   - Navigate to `CameraScannerPage` truyền đầy đủ

3. `test/presentation/blocs/omr_scanner_bloc_test.dart` (CẬP NHẬT)
   - `_onSubmit` gọi `submitResultOnly` với `classId`
   - State `OMRScannerTemplateReady` chứa `classId`

4. `test/core/network/omr_submission_sync_service_test.dart` (CẬP NHẬT)
   - `submitResultOnly` gửi `classId` trong body
   - `submitScan` gửi `classId` trong FormData
   - `syncPendingSubmissions` đọc và gửi `classId` từ pending JSON
   - Pending submission offline chứa `classId`

5. `test/core/storage/omr_local_storage_test.dart` (CẬP NHẬT)
   - `PendingSubmission.toJson()` chứa `classId` khi có
   - `PendingSubmission.fromJson()` đọc `classId` từ JSON
   - `addPendingSubmission` + `getPendingSubmissions` roundtrip với `classId`

### 6.2 Server (Node.js) - Jest

1. `tests/unit/validations/submission.validation.test.js` (CẬP NHẬT)
   - `classId` optional
   - `classId` invalid format → reject

2. `tests/unit/services/submission.service.test.js` (CẬP NHẬT)
   - `classId` được lưu vào submission document
   - Backward compat: không có `classId` vẫn tạo được

3. `tests/integration/submission.integration.test.js` (CẬP NHẬT)
   - E2E: POST với `classId` → response có `classId`

### 6.3 Verification
- `flutter test` → tất cả pass
- `npm test` (server) → tất cả pass
- `flutter analyze` → không lỗi mới
- `flutter build apk --debug` → build thành công
- Manual test: tạo exam với 2-3 class → scan flow end-to-end

---

## 7. Files thay đổi

### Mobile (Flutter)
| File | Loại | Mô tả |
|------|------|-------|
| `lib/presentation/pages/class_selection_page.dart` | MỚI | Trang chọn class |
| `lib/presentation/pages/exam_selection_page.dart` | SỬA | Navigate sang `ClassSelectionPage` thay vì `StudentListPage` |
| `lib/presentation/pages/student_list_page.dart` | SỬA | Thêm `classId`, `className`; load students theo `classId` |
| `lib/presentation/pages/camera_scanner_page.dart` | SỬA | Thêm `classId`, `className`; truyền xuống bloc |
| `lib/presentation/widgets/student_picker_dialog.dart` | SỬA | Nhận `classId` thật (không rỗng) |
| `lib/presentation/blocs/omr_scanner/omr_scanner_event.dart` | SỬA | Thêm `classId`, `className` vào event |
| `lib/presentation/blocs/omr_scanner/omr_scanner_state.dart` | SỬA | Thêm `classId`, `className` vào state |
| `lib/presentation/blocs/omr_scanner/omr_scanner_bloc.dart` | SỬA | Truyền `classId` khi submit |
| `lib/core/network/omr_submission_sync_service.dart` | SỬA | Thêm `classId` param cho `submitResultOnly` và `submitScan`; sync pending với `classId` |
| `lib/core/storage/omr_local_storage.dart` | SỬA | Thêm `classId` field vào `PendingSubmission` |
| `lib/main.dart` | SỬA | Cập nhật route `/scan` nếu cần (optional) |
| `test/...` (nhiều file) | MỚI/CẬP NHẬT | Tests |

### Server (Node.js)
| File | Loại | Mô tả |
|------|------|-------|
| `src/validations/submission.validation.js` | SỬA | Thêm `classId` optional |
| `src/services/submission.service.js` | SỬA | Lưu `classId` vào submission |
| `src/models/submission.model.js` | SỬA | Thêm `classId` field |
| `tests/...` | CẬP NHẬT | Tests |

---

## 8. YAGNI & Out of scope

**Không làm trong feature này:**
- Không validate rằng `classId` thuộc `exam.classIds` ở server (giữ backward compat)
- Không thêm filter/search ở `ClassSelectionPage` (chỉ list đơn giản)
- Không thay đổi UI ở web client
- Không thêm bulk scan (multi-class) trong feature này
- Không thay đổi flow "Quick Scan" để cho phép bỏ qua class (vì user yêu cầu BẮT BUỘC)
- Không thay đổi `ExamSelectionPage` UI (chỉ đổi navigation target)

---

## 9. Rủi ro & Giảm thiểu

| Rủi ro | Giảm thiểu |
|--------|-----------|
| Breaking change ở mobile | Bảo vệ bằng widget test: scan flow mới phải pass; giữ code cũ optional |
| Server validation quá strict | `classId` optional trên server |
| Class entity ở mobile chưa đồng bộ với server | Chỉ dùng field có sẵn trong `ExamClass` (id, name, code, studentCount) |
| Offline submission thiếu `classId` | Lưu `classId` trong `PendingSubmission` để sync sau |

---

## 10. Checklist triển khai (preview)

Sẽ được chi tiết trong `writing-plans` skill output. Tổng quan:
1. Server: validation + model + service
2. Mobile: ClassSelectionPage + widget test
3. Mobile: StudentListPage + CameraScannerPage + bloc + service
4. Mobile: integration test end-to-end
5. Manual test trên thiết bị thật
