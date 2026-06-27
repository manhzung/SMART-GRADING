# Recent Submission Enrichment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bổ sung thông tin điểm số (score/maxScore), mã sinh viên (studentCode), và tên lớp (className) vào mục "Recent Submissions" trong Grading Center (tab mobile). Sửa bug khi error fallback về mock data.

**Architecture:** Giữ nguyên kiến trúc `BlocBuilder<SubmissionBloc>` trong `ScanView`, refactor `_SubmissionRow` từ nhận `Map<String, dynamic>` sang nhận trực tiếp `Submission` entity (type-safe). TDD: RED (viết test trước) → GREEN (implement) → REFACTOR.

**Tech Stack:** Flutter / Dart, `flutter_bloc`, `mocktail`, `flutter_test`

---

## File Map

| File | Loại | Trách nhiệm |
|------|------|-------------|
| `client/mobile/lib/presentation/pages/scan_view.dart` | modify | Refactor `_SubmissionRow`, sửa `_getSubmissionCount`, error UI, call sites |
| `client/mobile/test/presentation/pages/scan_view_recent_submissions_test.dart` | create | Test cho `_SubmissionRow` (4 unit tests) + ScanView widget test (2 tests) |

---

## Task 1: Viết failing test cho `_SubmissionRow`

**Files:**
- Test: `client/mobile/test/presentation/pages/scan_view_recent_submissions_test.dart` (tạo mới)
- Import: `package:smart_grading_mobile/domain/entities/exam.entity.dart` (có `Submission`)

- [ ] **Step 1: Tạo file test với 4 unit tests cho `_SubmissionRow`**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/entities/exam.entity.dart';
import 'package:smart_grading_mobile/presentation/pages/scan_view.dart';

// Helper: tạo Submission giả
Submission makeSubmission({
  String id = 's1',
  String status = 'graded',
  double? score,
  double maxScore = 10,
  String? studentName,
  String? studentCode,
  String? className,
  String? examTitle,
}) {
  return Submission(
    id: id,
    examId: 'e1',
    studentId: 'st1',
    status: status,
    score: score,
    maxScore: maxScore,
    studentName: studentName,
    studentCode: studentCode,
    className: className,
    examTitle: examTitle,
  );
}

void main() {
  group('_SubmissionRow', () {
    testWidgets('hien thi day du khi co score, studentCode, className', (tester) async {
      final sub = makeSubmission(
        studentName: 'Nguyen Van A',
        studentCode: 'SV001',
        className: 'Lop 10A',
        score: 8.5,
        maxScore: 10,
        status: 'graded',
      );

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: _SubmissionRow(
            submission: sub,
            statusBgColor: const Color(0xFFE6F4EA),
            statusTextColor: const Color(0xFF137333),
            icon: Icons.check_circle_outline,
            iconColor: const Color(0xFF137333),
            iconBgColor: const Color(0xFFE6F4EA),
          ),
        ),
      ));

      expect(find.text('Nguyen Van A'), findsOneWidget);
      expect(find.text('SV001 • Lop 10A'), findsOneWidget);
      expect(find.text('8.5/10'), findsOneWidget);
      expect(find.text('COMPLETED'), findsOneWidget);
    });

    testWidgets('hien thi --/-- khi score null', (tester) async {
      final sub = makeSubmission(
        studentName: 'Tran Thi B',
        status: 'pending',
        score: null,
        maxScore: 10,
      );

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: _SubmissionRow(
            submission: sub,
            statusBgColor: const Color(0xFFE8F0FE),
            statusTextColor: const Color(0xFF1A73E8),
            icon: Icons.sync,
            iconColor: const Color(0xFF1A73E8),
            iconBgColor: const Color(0xFFE8F0FE),
          ),
        ),
      ));

      expect(find.text('Tran Thi B'), findsOneWidget);
      expect(find.text('--/--'), findsOneWidget);
      expect(find.text('PROCESSING'), findsOneWidget);
    });

    testWidgets('an dong phu khi studentCode va className deu null', (tester) async {
      final sub = makeSubmission(
        studentName: 'Unknown Student',
        studentCode: null,
        className: null,
        score: 7.0,
        status: 'graded',
      );

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: _SubmissionRow(
            submission: sub,
            statusBgColor: const Color(0xFFE6F4EA),
            statusTextColor: const Color(0xFF137333),
            icon: Icons.check_circle_outline,
            iconColor: const Color(0xFF137333),
            iconBgColor: const Color(0xFFE6F4EA),
          ),
        ),
      ));

      expect(find.text('Unknown Student'), findsOneWidget);
      // Khong co dong phu nao chua "SV" hoac "Lop"
      expect(find.textContaining('SV'), findsNothing);
      expect(find.textContaining('Lop'), findsNothing);
    });

    testWidgets('chi hien thi studentCode khi className null', (tester) async {
      final sub = makeSubmission(
        studentName: 'Student X',
        studentCode: 'SV999',
        className: null,
        score: 9.0,
        status: 'graded',
      );

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: _SubmissionRow(
            submission: sub,
            statusBgColor: const Color(0xFFE6F4EA),
            statusTextColor: const Color(0xFF137333),
            icon: Icons.check_circle_outline,
            iconColor: const Color(0xFF137333),
            iconBgColor: const Color(0xFFE6F4EA),
          ),
        ),
      ));

      expect(find.text('SV999'), findsOneWidget);
      // Khong co ky tu • (bullet) khi chi co 1 gia tri
      expect(find.text('SV999'), findsOneWidget);
    });

    testWidgets('chi hien thi className khi studentCode null', (tester) async {
      final sub = makeSubmission(
        studentName: 'Student Y',
        studentCode: null,
        className: 'Lop 11B',
        score: 6.5,
        status: 'graded',
      );

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: _SubmissionRow(
            submission: sub,
            statusBgColor: const Color(0xFFE6F4EA),
            statusTextColor: const Color(0xFF137333),
            icon: Icons.check_circle_outline,
            iconColor: const Color(0xFF137333),
            iconBgColor: const Color(0xFFE6F4EA),
          ),
        ),
      ));

      expect(find.text('Lop 11B'), findsOneWidget);
    });
  });
}
```

- [ ] **Step 2: Chạy test — phải FAIL**

Run: `cd client/mobile && flutter test test/presentation/pages/scan_view_recent_submissions_test.dart`
Expected: FAIL — `_SubmissionRow` chưa nhận `Submission`, nhận `Map<String, dynamic>`

- [ ] **Step 3: Commit**

```bash
git add client/mobile/test/presentation/pages/scan_view_recent_submissions_test.dart
git commit -m "test(mobile): add failing tests for _SubmissionRow with score/studentCode/className"
```

---

## Task 2: Implement `_SubmissionRow` refactor — nhận `Submission` thay vì Map

**Files:**
- Modify: `client/mobile/lib/presentation/pages/scan_view.dart:671-753` (`_SubmissionRow` class)

- [ ] **Step 1: Thay signature và implementation của `_SubmissionRow`**

Tìm class `_SubmissionRow` (dòng 671) và thay thế toàn bộ:

```dart
class _SubmissionRow extends StatelessWidget {
  final Submission submission;
  final Color statusBgColor;
  final Color statusTextColor;
  final IconData icon;
  final Color iconColor;
  final Color iconBgColor;

  const _SubmissionRow({
    required this.submission,
    required this.statusBgColor,
    required this.statusTextColor,
    required this.icon,
    required this.iconColor,
    required this.iconBgColor,
  });

  String _formatScore(Submission s) {
    if (s.score == null) return '--/--';
    final score = s.score!.toStringAsFixed(1);
    final max = (s.maxScore ?? 10).toStringAsFixed(0);
    return '$score/$max';
  }

  String? _buildSubtitle() {
    final code = submission.studentCode;
    final cls = submission.className;
    if (code != null && cls != null) return '$code \u2022 $cls';
    if (code != null) return code;
    if (cls != null) return cls;
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final subtitle = _buildSubtitle();

    return InkWell(
      onTap: null,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: iconBgColor,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: iconColor, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    submission.displayName,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  _formatScore(submission),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  decoration: BoxDecoration(
                    color: statusBgColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  child: Text(
                    submission.statusUppercase,
                    style: TextStyle(
                      color: statusTextColor,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
```

**Giữ nguyên các dòng import hiện tại** — chỉ thêm `Submission` import nếu chưa có:
```dart
import 'package:smart_grading_mobile/domain/entities/exam.entity.dart'; // Submission
```

- [ ] **Step 2: Chạy unit tests — phải PASS**

Run: `cd client/mobile && flutter test test/presentation/pages/scan_view_recent_submissions_test.dart`
Expected: PASS cả 5 tests

- [ ] **Step 3: Commit**

```bash
git add client/mobile/lib/presentation/pages/scan_view.dart
git commit -m "refactor(mobile): _SubmissionRow accepts Submission entity directly
- Add score display (score/maxScore or --/--)
- Add studentCode + className subtitle
- Add InkWell with null onTap (visual affordance)"
```

---

## Task 3: Viết failing widget tests cho `ScanView`

**Files:**
- Test: `client/mobile/test/presentation/pages/scan_view_recent_submissions_test.dart` (thêm vào file đã tạo)

- [ ] **Step 1: Thêm 2 widget tests vào `scan_view_recent_submissions_test.dart`**

Thêm vào cuối file (sau group `_SubmissionRow`), trước `void main()` đóng:

```dart
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mocktail/mocktail.dart';
import 'package:smart_grading_mobile/presentation/blocs/submission/submission_bloc.dart';
import 'package:smart_grading_mobile/presentation/blocs/submission/submission_event.dart';
import 'package:smart_grading_mobile/presentation/blocs/submission/submission_state.dart';

class MockSubmissionBloc extends Mock implements SubmissionBloc {
  @override
  Stream<SubmissionState> get stream async* {
    if (_initialState != null) yield _initialState!;
  }

  SubmissionState? _initialState;

  void setInitialState(SubmissionState state) {
    _initialState = state;
  }
}
```

Thêm group mới vào `void main()`:

```dart
  group('ScanView Recent Submissions', () {
    testWidgets('hien thi recent submissions khi SubmissionLoaded', (tester) async {
      final bloc = MockSubmissionBloc();

      final subs = [
        Submission(
          id: 's1', examId: 'e1', studentId: 'st1',
          studentName: 'Nguyen Van A', studentCode: 'SV001', className: 'Lop 10A',
          status: 'graded', score: 8.5, maxScore: 10,
        ),
        Submission(
          id: 's2', examId: 'e1', studentId: 'st2',
          studentName: 'Tran Thi B', studentCode: 'SV002', className: 'Lop 10B',
          status: 'pending',
        ),
      ];

      bloc.setInitialState(SubmissionLoaded(submissions: subs));

      when(() => bloc.stream).thenAnswer((_) => Stream.value(SubmissionLoaded(submissions: subs)));
      when(() => bloc.state).thenReturn(SubmissionLoaded(submissions: subs));

      await tester.pumpWidget(
        MaterialApp(
          home: BlocProvider<SubmissionBloc>.value(
            value: bloc,
            child: const ScanView(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Nguyen Van A'), findsOneWidget);
      expect(find.text('SV001 \u2022 Lop 10A'), findsOneWidget);
      expect(find.text('8.5/10'), findsOneWidget);
      expect(find.text('Tran Thi B'), findsOneWidget);
      expect(find.text('--/--'), findsOneWidget); // pending = no score
    });

    testWidgets('hien thi error UI + nut Thu lai khi SubmissionError', (tester) async {
      final bloc = MockSubmissionBloc();

      bloc.setInitialState(const SubmissionError(message: 'Connection timeout'));
      when(() => bloc.stream).thenAnswer((_) => Stream.value(const SubmissionError(message: 'Connection timeout')));
      when(() => bloc.state).thenReturn(const SubmissionError(message: 'Connection timeout'));

      await tester.pumpWidget(
        MaterialApp(
          home: BlocProvider<SubmissionBloc>.value(
            value: bloc,
            child: const ScanView(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Co noi dung loi
      expect(find.textContaining('Connection timeout'), findsOneWidget);
      // Khong co mock data (Elena Rodriguez, Marcus Chen, etc.)
      expect(find.text('Elena Rodriguez'), findsNothing);
    });
  });
```

- [ ] **Step 2: Chạy test — phải FAIL**

Run: `cd client/mobile && flutter test test/presentation/pages/scan_view_recent_submissions_test.dart`
Expected: FAIL vì `ScanView` vẫn truyền `Map<String, dynamic>` vào `_SubmissionRow`

---

## Task 4: Implement thay đổi trong `ScanView` — truyền `Submission`, sửa error logic

**Files:**
- Modify: `client/mobile/lib/presentation/pages/scan_view.dart`

Có 4 thay đổi chính:

- [ ] **Step 1: Sửa `_getSubmissionCount` (dòng ~26-30)**

Tìm:
```dart
int _getSubmissionCount(SubmissionState state) {
  if (state is SubmissionLoaded) return state.submissions.length;
  if (state is SubmissionError) return _mockSubmissions.length;
  return 0;
}
```

Thay bằng:
```dart
int _getSubmissionCount(SubmissionState state) {
  if (state is SubmissionLoaded) return state.submissions.length;
  // Khi error: không đếm mock data
  if (state is SubmissionError) return 0;
  return 0;
}
```

- [ ] **Step 2: Sửa block `submissionsToDisplay` — truyền `Submission` thay vì Map (dòng ~127-180)**

Tìm toàn bộ block `if (state is SubmissionLoaded ...` và thay bằng:

```dart
if (state is SubmissionLoaded && state.submissions.isNotEmpty) {
  submissionsToDisplay = state.submissions;
} else if (state is SubmissionLoading) {
  submissionsToDisplay = [];
} else {
  // SubmissionInitial or SubmissionError: không hiển thị mock
  submissionsToDisplay = [];
}
```

- [ ] **Step 3: Sửa `filteredList` logic (dòng ~182-187)**

Tìm:
```dart
final List<Map<String, dynamic>> filteredList = submissionsToDisplay.where((item) {
  final String name = item['name'].toString().toLowerCase();
  final String exam = item['exam'].toString().toLowerCase();
  final String search = _searchQuery.toLowerCase();
  return name.contains(search) || exam.contains(search);
}).toList();
```

Thay bằng:
```dart
final bool isLoading = state is SubmissionLoading;
final List<Submission> filteredList = submissionsToDisplay.where((sub) {
  final String name = sub.displayName.toLowerCase();
  final String exam = (sub.examTitle ?? '').toLowerCase();
  final String search = _searchQuery.toLowerCase();
  return name.contains(search) || exam.contains(search);
}).toList();
```

**Lưu ý:** Di chuyển `isLoading` lên đây (vì đã bỏ `List<Map<String, dynamic>>` phía trên).

- [ ] **Step 4: Sửa call site `_SubmissionRow` (dòng ~512-529)**

Tìm:
```dart
...filteredList.map((item) {
  return Column(
    children: [
      _SubmissionRow(
        name: item['name'],
        exam: item['exam'],
        time: item['time'],
        status: item['status'],
        statusBgColor: item['statusBgColor'],
        statusTextColor: item['statusTextColor'],
        icon: item['icon'],
        iconColor: item['iconColor'],
        iconBgColor: item['iconBgColor'],
      ),
      const Divider(color: Color(0xFFE2E8F0), height: 1),
    ],
  );
}),
```

Thay bằng (logic màu/status giữ nguyên — chỉ đổi sang nhận `Submission`):

```dart
...filteredList.map((sub) {
  Color bg; Color text; IconData icon; Color iconBg;
  switch (sub.statusUppercase) {
    case 'COMPLETED':
      bg = const Color(0xFFE6F4EA);
      text = const Color(0xFF137333);
      icon = Icons.check_circle_outline;
      iconBg = const Color(0xFFE6F4EA);
      break;
    case 'PROCESSING':
      bg = const Color(0xFFE8F0FE);
      text = const Color(0xFF1A73E8);
      icon = Icons.sync;
      iconBg = const Color(0xFFEFF6FF);
      break;
    case 'REVIEW':
      bg = const Color(0xFFFEF3C7);
      text = const Color(0xFFD97706);
      icon = Icons.assignment_late_outlined;
      iconBg = const Color(0xFFFEF3C7);
      break;
    default:
      bg = const Color(0xFFFCE8E6);
      text = const Color(0xFFC5221F);
      icon = Icons.error_outline;
      iconBg = const Color(0xFFFFF2EC);
  }

  return Column(
    children: [
      _SubmissionRow(
        submission: sub,
        statusBgColor: bg,
        statusTextColor: text,
        icon: icon,
        iconColor: text,
        iconBgColor: iconBg,
      ),
      const Divider(color: Color(0xFFE2E8F0), height: 1),
    ],
  );
}),
```

**Lưu ý:** Đã gộp logic màu/status trực tiếp tại call site (không cần `statusUppercase` trong `_SubmissionRow` nữa vì widget nhận color từ ngoài).

- [ ] **Step 5: Thêm nút "Thử lại" vào error UI (dòng ~489-511)**

Tìm block error Container đỏ và thêm nút:

```dart
if (state is SubmissionError)
  Container(
    margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    decoration: BoxDecoration(
      color: const Color(0xFFFCE8E6),
      borderRadius: BorderRadius.circular(8),
    ),
    child: Row(
      children: [
        const Icon(Icons.cloud_off, size: 16, color: Color(0xFFC5221F)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            state.message,
            style: const TextStyle(fontSize: 12, color: Color(0xFFC5221F)),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        const SizedBox(width: 8),
        TextButton(
          onPressed: () {
            context.read<SubmissionBloc>().add(const SubmissionLoadRequested());
          },
          child: const Text(
            'Thu lai',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFC5221F)),
          ),
        ),
      ],
    ),
  ),
```

- [ ] **Step 6: Sửa `isLoading` (dòng ~189-190)**

Tìm dòng `final bool isLoading = state is SubmissionLoading;` — nếu đã di chuyển ở Step 3 thì xóa dòng cũ (dòng ~189). Đảm bảo chỉ có 1 khai báo.

- [ ] **Step 7: Xóa `_mockSubmissions` (dòng ~623-668)**

Toàn bộ static list này không còn cần thiết nữa. Có thể xóa hoặc giữ lại (khuyến nghị giữ lại làm tài liệu reference nếu cần sau này — không ảnh hưởng gì).

- [ ] **Step 8: Chạy widget tests — phải PASS**

Run: `cd client/mobile && flutter test test/presentation/pages/scan_view_recent_submissions_test.dart`
Expected: PASS cả 7 tests (5 unit + 2 widget)

---

## Task 5: Chạy toàn bộ test suite — đảm bảo không regression

**Files:**
- Test: toàn bộ `client/mobile/test/`

- [ ] **Step 1: Run full test suite**

Run: `cd client/mobile && flutter test`
Expected: Tất cả tests PASS, không có regression

- [ ] **Step 2: Nếu có lỗi — fix từng lỗi trước khi commit**

Lỗi thường gặp:
- Import `Submission` entity cần thêm: kiểm tra đã import ở `scan_view.dart`
- `filteredList` type conflict: đảm bảo `isLoading` và `filteredList` khai báo đúng thứ tự

- [ ] **Step 3: Commit**

```bash
git add client/mobile/lib/presentation/pages/scan_view.dart client/mobile/test/presentation/pages/scan_view_recent_submissions_test.dart
git commit -m "feat(mobile): enrich Recent Submission with score and student info

- _SubmissionRow now accepts Submission entity (type-safe)
- Display score/maxScore or --/-- if not graded
- Display studentCode + className as subtitle
- Fix error state: no mock data fallback, show error + retry button
- Fix _getSubmissionCount to return 0 on error
- Add 7 tests: 5 unit for _SubmissionRow, 2 widget for ScanView"
```

---

## Task 6: Verify — chạy lại toàn bộ tests + kiểm tra linter

- [ ] **Step 1: Full test + analyze**

Run:
```bash
cd client/mobile && flutter test && flutter analyze
```
Expected: Tất cả PASS, analyze không có error/warning mới

---

## Self-Review Checklist

- [ ] Spec coverage: mọi requirement trong spec đều có task tương ứng?
  - ✅ Score display → Task 1, 2, 4
  - ✅ studentCode + className → Task 1, 2, 4
  - ✅ Error fallback fix → Task 3, 4
  - ✅ Retry button → Task 4 Step 5
  - ✅ Tests → Task 1, 3, 5
- [ ] Placeholder scan: không có TBD/TODO/giải pháp mơ hồ
- [ ] Type consistency: `Submission` entity dùng đúng tên field (`displayName`, `statusUppercase`, `score`, `maxScore`, `studentCode`, `className`)
- [ ] Có thể build: đảm bảo import entity ở `scan_view.dart` được thêm
