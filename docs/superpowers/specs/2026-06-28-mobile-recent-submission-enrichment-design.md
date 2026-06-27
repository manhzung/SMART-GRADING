# Recent Submission Enrichment — Grading Center (Mobile)

**Date:** 2026-06-28
**Status:** Approved for implementation
**Scope:** `client/mobile` (Flutter, Grading tab)

---

## 1. Problem

Trong tab **Grading Center** của app mobile (`client/mobile/lib/presentation/pages/scan_view.dart`), mục **"Recent Submissions"** hiện chỉ hiển thị các trường nghèo nàn:

- Tên học sinh (1 dòng)
- Tên bài thi + giờ scan (1 dòng phụ)
- Status pill (COMPLETED / PROCESSING / REVIEW / ERROR)

Trong khi `Submission` entity đã có sẵn các trường phong phú mà UI không khai thác:

- `score` / `maxScore` — **điểm số** (rất quan trọng vì đây là trang grading)
- `studentCode` — mã sinh viên (phân biệt trùng tên)
- `className` — tên lớp (bài nộp thuộc lớp nào)

Ngoài ra còn 2 bug phụ:

1. Khi `SubmissionBloc` emit `SubmissionError`, code rơi vào `_mockSubmissions` (hard-coded) → giáo viên thấy dữ liệu giả mà tưởng là thật.
2. `_getSubmissionCount(SubmissionError)` trả về `_mockSubmissions.length` → số "View All Submissions (N)" ở footer không phản ánh dữ liệu thực.

---

## 2. Goals

- Mỗi dòng **Recent Submission** phải hiển thị đủ: tên + (mã SV • lớp) + điểm `/max` + status
- Khi API lỗi: hiển thị error UI có nút **Thử lại**, **không** fallback về mock
- Đếm số submission phải khớp với dữ liệu thực (kể cả khi lỗi = 0)

## 3. Non-Goals (YAGNI)

- Đổi status label sang tiếng Việt (giữ tiếng Anh để nhất quán với thiết kế hiện tại)
- Bổ sung navigation từ `_SubmissionRow` (chưa cần — chỉ InkWell không onTap)
- Hiển thị ảnh scan (`imageUrl`) trong row
- Phân trang / load more cho Recent Submission (giữ nguyên "View All Submissions" link)

---

## 4. Design

### 4.1 Component refactor: `_SubmissionRow`

**Trước:**
```dart
class _SubmissionRow extends StatelessWidget {
  final String name;
  final String exam;
  final String time;
  final String status;
  // ... colors & icons
}
```

**Sau:**
```dart
class _SubmissionRow extends StatelessWidget {
  final Submission submission;
  final Color statusBgColor;
  final Color statusTextColor;
  final IconData icon;
  final Color iconColor;
  final Color iconBgColor;
}
```

Lý do: truyền `Submission` trực tiếp → type-safe, truy cập được `score`, `studentCode`, `className` mà không phải cast Map.

### 4.2 UI bố cục (1 dòng)

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌────┐                                                          │
│  │ ✓  │  Elena Rodriguez                                  8.5   │
│  └────┘  SV001 • Lớp 10A                                /10    │
│                                                                 │
│              [GRADED]                                            │
└─────────────────────────────────────────────────────────────────┘
```

**Quy tắc hiển thị:**

| Trường | Nguồn | Quy tắc |
|--------|-------|---------|
| Tên | `submission.displayName` | như cũ |
| Mã SV • Lớp | `studentCode` + `className` | Nếu cả 2 null → ẩn dòng phụ. Nếu 1 trong 2 null → hiển thị cái còn lại |
| Điểm `/max` | `score` / `maxScore` | `score != null && maxScore != null` → `8.5/10`. Ngược lại → `--/--` (màu xám) |
| Status | `statusUppercase` | Giữ nguyên (COMPLETED / PROCESSING / REVIEW / ERROR) |
| Tap | wrap `InkWell` | `onTap: null` — chỉ ripple effect (chưa navigate) |

### 4.3 Error handling cho `SubmissionError`

**Trước:**
```dart
} else if (state is SubmissionError) {
  submissionsToDisplay = _mockSubmissions;   // ❌ hiển thị mock
}
```

**Sau:**
```dart
} else if (state is SubmissionError) {
  submissionsToDisplay = [];   // ✅ không mock
  // Hiển thị error UI đã có (Container đỏ ở dòng 489-511)
  // + thêm nút "Thử lại" gọi context.read<SubmissionBloc>().add(SubmissionLoadRequested())
}
```

**Sửa `_getSubmissionCount`:**
```dart
int _getSubmissionCount(SubmissionState state) {
  if (state is SubmissionLoaded) return state.submissions.length;
  if (state is SubmissionError) return 0;   // ✅ không đếm mock
  return 0;
}
```

### 4.4 Score formatting

Luôn chia cho max (thường là 10), giống `submissions_page.dart`:
```dart
String _formatScore(Submission s) {
  if (s.score == null) return '--/--';
  final score = s.score!.toStringAsFixed(1);
  final max = (s.maxScore ?? 10).toStringAsFixed(0);
  return '$score/$max';
}
```

---

## 5. Files Changed

| File | Loại | Mô tả |
|------|------|-------|
| `client/mobile/lib/presentation/pages/scan_view.dart` | modify | Refactor `_SubmissionRow`, sửa `_getSubmissionCount`, error UI |
| `client/mobile/test/presentation/pages/scan_view_recent_submissions_test.dart` | create | Test cho `_SubmissionRow` + ScanView widget test |

---

## 6. Testing Strategy (TDD)

### Unit / Widget tests

File: `client/mobile/test/presentation/pages/scan_view_recent_submissions_test.dart`

1. **`_SubmissionRow` hiển thị đầy đủ khi có score, studentCode, className**
2. **`_SubmissionRow` hiển thị "--/--" khi score null**
3. **`_SubmissionRow` ẩn dòng phụ khi cả studentCode và className đều null**
4. **`_SubmissionRow` hiển thị chỉ 1 trong 2 khi chỉ có 1**
5. **`ScanView` khi `SubmissionError`: không có mock, có text lỗi**
6. **`ScanView` khi `SubmissionLoaded`: hiển thị N dòng + footer `(N)`**

### Test cho tap

Không cần test tap vì `onTap: null` (sẽ bổ sung navigation sau).

---

## 7. Implementation Steps (TDD Red → Green → Refactor)

1. **RED (test 1-4):** Viết 4 test `_SubmissionRow` → `flutter test` → FAIL
2. **GREEN:** Refactor `_SubmissionRow` nhận `Submission` → `flutter test` → PASS
3. **RED (test 5-6):** Viết widget test ScanView → FAIL
4. **GREEN:** Cập nhật `ScanView` build → fix `_getSubmissionCount`, error UI → PASS
5. **ALL:** Chạy `flutter test` toàn project → đảm bảo không regression
6. **COMMIT:** `feat(mobile): enrich Recent Submission with score and student info`

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| `_SubmissionRow` được dùng ở nhiều nơi → refactor signature gây lỗi | Chỉ dùng 1 chỗ trong `ScanView.build` (đã xác nhận qua Grep) |
| Test cần mock `SubmissionBloc` | Pattern đã có trong `submissions_page_test.dart` — reuse |
| Status label tiếng Anh có thể gây khó hiểu cho user VN | Đã thống nhất với user giữ tiếng Anh trong design phase |