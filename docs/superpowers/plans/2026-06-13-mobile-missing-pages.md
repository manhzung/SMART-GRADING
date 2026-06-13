# Mobile Missing Pages - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo 7 trang mới cho Flutter mobile app: CreateExamPage, EditExamPage, SubmissionsPage, AnalyticsPage, AppealsPage, QuestionBankPage, SettingsPage. Đảm bảo UI/UX khớp với design system hiện tại (màu nền #F8FAFC, accent #081C43, border #E2E8F0).

**Architecture:** Mỗi trang là một file Dart standalone trong `lib/presentation/pages/`, dùng `StatefulWidget`, tuân thủ design pattern đã có: AppBar trắng với back button, body scrollable với SingleChildScrollView, card-based layout với border radius 12-16px, bottom action buttons cho form pages.

**Tech Stack:** Flutter (Dart), flutter_bloc, GetIt injection, Material Design

---

## File Structure Mapping

```
NEW FILES TO CREATE:
  lib/presentation/pages/create_exam_page.dart
  lib/presentation/pages/edit_exam_page.dart
  lib/presentation/pages/submissions_page.dart
  lib/presentation/pages/analytics_page.dart
  lib/presentation/pages/appeals_page.dart
  lib/presentation/pages/question_bank_page.dart
  lib/presentation/pages/settings_page.dart
  lib/presentation/pages/help_page.dart          (optional low priority)

MODIFY FILES:
  lib/main.dart                                 (add route registrations)
  lib/presentation/pages/home_page.dart          (add navigation to new pages)
```

---

## Task 1: CreateExamPage

**Files:**
- Create: `client/mobile/lib/presentation/pages/create_exam_page.dart`

- [ ] **Step 1: Scaffold the page file**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../core/network/exam_service.dart';
import '../../core/network/api_client.dart';
import '../../core/network/class_service.dart';
import '../../domain/entities/exam.entity.dart';
import '../../domain/entities/user.entity.dart';
import 'package:get_it/get_it.dart';

class CreateExamPage extends StatefulWidget {
  const CreateExamPage({super.key});

  @override
  State<CreateExamPage> createState() => _CreateExamPageState();
}

class _CreateExamPageState extends State<CreateExamPage> {
  // Scaffold the full implementation below
}
```

- [ ] **Step 2: Implement full CreateExamPage**

Write complete implementation with:

1. **AppBar**: Title "Tạo bài kiểm tra mới", back button, avatar badge top-right (copied from CreateEditClassPage pattern)
2. **Form**: SingleChildScrollView with white card container (borderRadius 16, border color #E2E8F0, shadow)
3. **Section 1 - Basic Info Card**:
   - Title TextFormField (label: "Tên bài kiểm tra", hint: "Nhập tên bài kiểm tra")
   - Description TextFormField (multiline, label: "Mô tả")
   - Class selector (read-only TextFormField, onTap shows modal bottom sheet with class list from ClassBloc/ClassService)
   - Primary class dropdown (chips/tag style or DropdownButtonFormField)
4. **Section 2 - Exam Parameters Card**:
   - Date picker (TextFormField read-only, onTap shows DatePicker)
   - Duration TextFormField (numeric, label: "Thời gian làm bài (phút)", default: 90)
   - Number of questions TextFormField (numeric, default: 50)
   - Number of versions DropdownButtonFormField (1, 2, 4, 8 versions)
   - Total score TextFormField (numeric, default: 10)
   - Passing score TextFormField (numeric, default: 5)
5. **Section 3 - Shuffle Options Card**:
   - Switch or Checkbox for "Đảo câu hỏi"
   - Switch or Checkbox for "Đảo đáp án"
6. **Section 4 - OMR Template Card**:
   - DropdownButtonFormField for OMR template selection (from OMRTemplateService)
7. **Bottom Buttons**:
   - ElevatedButton "Tạo bài kiểm tra" (background #081C43, full width)
   - TextButton "Hủy" to pop

Input decoration helper method:
```dart
InputDecoration _buildInputDecoration(String hint, {Widget? prefixIcon}) {
  return InputDecoration(
    hintText: hint,
    hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
    filled: true,
    fillColor: const Color(0xFFF8FAFC),
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    prefixIcon: prefixIcon,
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: Color(0xFF081C43), width: 1.5),
    ),
    errorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: Color(0xFFB91C1C)),
    ),
  );
}
```

- [ ] **Step 3: Test flutter analyze**

Run: `cd client/mobile && flutter analyze lib/presentation/pages/create_exam_page.dart`
Expected: No errors

---

## Task 2: EditExamPage

**Files:**
- Create: `client/mobile/lib/presentation/pages/edit_exam_page.dart`

- [ ] **Step 1: Implement EditExamPage**

Write complete implementation with:

1. **AppBar**: Title from `widget.exam.title` or "Chỉnh sửa bài kiểm tra", back button, avatar badge top-right, status badge (DRAFT/PUBLISHED)
2. **Body**: SingleChildScrollView with white cards
3. **Section 1 - Basic Info Card**: Title (pre-filled), description (pre-filled), class selector (pre-filled)
4. **Section 2 - Exam Parameters Card**: Date, duration, questions count, versions, scores (all pre-filled from exam entity)
5. **Section 3 - Shuffle Config Card**: Shuffle questions switch, shuffle answers switch
6. **Section 4 - Question List Card**: List of assigned questions with difficulty badges, "Thêm câu hỏi" button
7. **Bottom Buttons**: "Lưu thay đổi" (ElevatedButton #081C43) + "Hủy" (TextButton)

Constructor:
```dart
class EditExamPage extends StatefulWidget {
  final Exam exam;

  const EditExamPage({super.key, required this.exam});
  // ...
}
```

- [ ] **Step 2: Test flutter analyze**

Run: `flutter analyze lib/presentation/pages/edit_exam_page.dart`
Expected: No errors

---

## Task 3: SubmissionsPage

**Files:**
- Create: `client/mobile/lib/presentation/pages/submissions_page.dart`

- [ ] **Step 1: Implement SubmissionsPage**

Write complete implementation with:

1. **AppBar**: Title "Quản lý bài nộp", back button, avatar badge
2. **Stats Row** (top of body):
   - 3 mini cards in a Row: Total submissions, Đã chấm, Đang chờ
   - Each card: colored icon container, number, label
3. **Filter Section**:
   - Search TextField (prefix icon search, hint: "Tìm kiếm học sinh...")
   - Horizontal scrollable filter chips: All, Đã chấm, Đang chờ, Chưa nộp
   - "Bộ lọc" icon button to show filter bottom sheet (exam dropdown, class dropdown, date range)
4. **Submission List** (ListView.builder):
   - For each submission card:
     - Student avatar (colored initials, 44x44 circle)
     - Student name + email
     - Exam title
     - Score (bold, large)
     - Status badge chip (GRADED = green, PENDING = yellow, SUBMITTED = blue)
     - Timestamp
     - Chevron right icon
   - Tap on card → expand or navigate to detail
5. **Empty State**: When no submissions, show centered icon + message
6. **Loading State**: CircularProgressIndicator centered

- [ ] **Step 2: Test flutter analyze**

Run: `flutter analyze lib/presentation/pages/submissions_page.dart`
Expected: No errors

---

## Task 4: AnalyticsPage

**Files:**
- Create: `client/mobile/lib/presentation/pages/analytics_page.dart`

- [ ] **Step 1: Implement AnalyticsPage**

Write complete implementation with:

1. **AppBar**: Title "Thống kê", back button, avatar badge
2. **Period Selector**: Horizontal chips (7 ngày, 30 ngày, Học kỳ) - styled like ExamDetailPage detail cards
3. **Stats Grid** (2x2):
   - Tổng học sinh (icon: people, color: blue tint)
   - Tổng kỳ thi (icon: assignment, color: purple tint)
   - Điểm trung bình (icon: analytics, color: green tint)
   - Tỷ lệ đạt (icon: check_circle, color: orange tint)
   - Each: white card, borderRadius 12, icon in colored container, large bold number, small label
4. **Score Trend Section**: Card with title "Xu hướng điểm", simple line chart placeholder (Container with gradient border + mock chart data displayed as bar indicators or simple custom painted line)
   - For mobile without recharts: Use a simple CustomPainter to draw a basic line chart with mock data, or show trend as stat cards
5. **Grade Distribution Section**: Card with title "Phân bố điểm", showing grade buckets (A/B/C/D/F) as horizontal progress bars with colors
6. **Top Students Section**: Card with title "Học sinh xuất sắc", list of top 5 students with rank medal icons (gold/silver/bronze for top 3)
7. **Subject Performance Section**: Card with title "Theo môn học", horizontal bars for each subject with avg score

Note: Since no charting library is added, use CustomPainter or simple visual representations:
- Line chart: CustomPainter with Path drawing mock trend data
- Bar chart: Row of Containers with height proportional to value
- Pie chart: CustomPainter with drawArc

- [ ] **Step 2: Test flutter analyze**

Run: `flutter analyze lib/presentation/pages/analytics_page.dart`
Expected: No errors

---

## Task 5: AppealsPage

**Files:**
- Create: `client/mobile/lib/presentation/pages/appeals_page.dart`

- [ ] **Step 1: Implement AppealsPage**

Write complete implementation with:

1. **AppBar**: Title "Phúc khảo", back button, avatar badge
2. **Stats Row** (top): 4 mini cards - Tổng số, Đang chờ, Đang xem xét, Đã xử lý
3. **Filter Section**:
   - Search TextField
   - Status filter chips: Tất cả, Đang chờ, Đang xem xét, Đã duyệt, Từ chối
4. **Appeal List** (ListView.builder):
   - For each appeal card:
     - Student info: avatar (initials), name, email
     - Exam title + class
     - Question number that was appealed
     - Reason text (truncated, 2 lines max)
     - Status badge chip (PENDING=yellow, REVIEWING=blue, APPROVED=green, REJECTED=red)
     - Date submitted
     - Action buttons: "Xem xét" button (if pending/reviewing)
   - Tap on card → shows detail bottom sheet or navigates to detail
5. **Appeal Detail Bottom Sheet** (showModalBottomSheet):
   - Student info section
   - Exam info section
   - Question content + student's answer vs correct answer
   - Reason field (read-only)
   - Resolution notes TextFormField
   - Two buttons: "Từ chối" (outlined red) + "Duyệt" (filled green)
6. **Empty State**: When no appeals

- [ ] **Step 2: Test flutter analyze**

Run: `flutter analyze lib/presentation/pages/appeals_page.dart`
Expected: No errors

---

## Task 6: QuestionBankPage

**Files:**
- Create: `client/mobile/lib/presentation/pages/question_bank_page.dart`

- [ ] **Step 1: Implement QuestionBankPage**

Write complete implementation with:

1. **AppBar**: Title "Ngân hàng câu hỏi", back button, avatar badge, "+" FAB or action button for adding new question
2. **Search Section**: TextField with search icon, hint: "Tìm kiếm câu hỏi..."
3. **Filter Chips Row** (horizontal scroll):
   - All / Easy / Medium / Hard difficulty chips
   - AI Generated chip
4. **Question Count Badge**: "Tổng: 120 câu hỏi"
5. **Question List** (ListView.builder):
   - For each question card:
     - Difficulty badge (EASY=green, MEDIUM=blue, HARD=red)
     - AI badge (if isAiGenerated)
     - Question text (max 3 lines, overflow ellipsis)
     - Options display: A/B/C/D with correct answer highlighted
     - Tags as small chips
     - Usage stats: "Đã dùng: X lần"
   - Tap → expand card to show full question + options + explanation
6. **Add Question Bottom Sheet** (showModalBottomSheet):
   - Question text TextFormField (multiline)
   - Difficulty dropdown (Easy/Medium/Hard)
   - 4 option TextFormFields with correct answer radio buttons
   - Tags TextField
   - Explanation TextFormField
   - Save/Cancel buttons
7. **Empty State**: When no questions found

- [ ] **Step 2: Test flutter analyze**

Run: `flutter analyze lib/presentation/pages/question_bank_page.dart`
Expected: No errors

---

## Task 7: SettingsPage

**Files:**
- Create: `client/mobile/lib/presentation/pages/settings_page.dart`

- [ ] **Step 1: Implement SettingsPage**

Write complete implementation with:

1. **AppBar**: Title "Cài đặt", back button, avatar badge
2. **Tabbed View** (3 tabs: Tài khoản, Thông báo, Bảo mật) - using TabBar + TabBarView
3. **Tab 1 - Account / Profile**:
   - Avatar (with camera edit icon overlay)
   - Name, email, phone TextFormFields (read-only or editable)
   - Role badge
   - Save button
4. **Tab 2 - Notifications**:
   - Toggle row: Email thông báo (Switch)
   - Toggle row: Push thông báo (Switch)
   - Toggle row: Nhắc nhở chấm điểm (Switch)
   - Toggle row: Cập nhật phúc khảo (Switch)
   - Toggle row: Thông báo hệ thống (Switch)
5. **Tab 3 - Security**:
   - Change password section: Current password, new password, confirm password fields (obscured)
   - Change password button
6. **Bottom Section** (below tabs):
   - Language row (with current value)
   - Theme row: Light/Dark toggle (use _buildAppearanceToggle pattern from ProfileView)
   - App version info

Note: This is similar to ProfileView's settings section but expanded into a dedicated page with tabbed navigation. Reuse the `_buildSectionHeader`, `_buildRowTile` patterns from ProfileView.

- [ ] **Step 2: Test flutter analyze**

Run: `flutter analyze lib/presentation/pages/settings_page.dart`
Expected: No errors

---

## Task 8: HelpPage (Optional - Lower Priority)

**Files:**
- Create: `client/mobile/lib/presentation/pages/help_page.dart`

- [ ] **Step 1: Implement HelpPage**

Write complete implementation with:

1. **AppBar**: Title "Trợ giúp", back button, avatar badge
2. **Search Section**: Full-width search TextField (hint: "Tìm kiếm câu hỏi...")
3. **Quick Guides Row** (horizontal scroll):
   - 4 cards with icon + title: Bắt đầu, Quản lý lớp, Quét OMR, Cài đặt
4. **FAQ Section**:
   - 4 category headers (expandable): Bắt đầu sử dụng, Thi cử, Quét OMR, Tài khoản
   - Each category expands to show Q&A pairs as expandable tiles
   - Use ExpansionTile widget for each FAQ item
5. **Contact Section**: Card with email, phone, working hours
6. **Empty State**: When search yields no results

- [ ] **Step 2: Test flutter analyze**

Run: `flutter analyze lib/presentation/pages/help_page.dart`
Expected: No errors

---

## Task 9: Register Routes in main.dart

**Files:**
- Modify: `client/mobile/lib/main.dart`

- [ ] **Step 1: Add route registrations**

Find the `MaterialApp` routes registration section (around lines 91-101) and add:

```dart
'/create-exam': (context) => const CreateExamPage(),
'/edit-exam': (context) => const EditExamPage(exam: exam),  // Note: pass exam via constructor
'/submissions': (context) => const SubmissionsPage(),
'/analytics': (context) => const AnalyticsPage(),
'/appeals': (context) => const AppealsPage(),
'/question-bank': (context) => const QuestionBankPage(),
'/settings': (context) => const SettingsPage(),
'/help': (context) => const HelpPage(),
```

Also add the import at the top of main.dart:
```dart
import 'presentation/pages/create_exam_page.dart';
import 'presentation/pages/edit_exam_page.dart';
import 'presentation/pages/submissions_page.dart';
import 'presentation/pages/analytics_page.dart';
import 'presentation/pages/appeals_page.dart';
import 'presentation/pages/question_bank_page.dart';
import 'presentation/pages/settings_page.dart';
import 'presentation/pages/help_page.dart';
```

Note: EditExamPage requires Exam parameter, so use a route with arguments. Use `ModalRoute.of(context).settings.arguments` or a named route with arguments. Since MaterialApp named routes don't support passing complex objects easily, use `MaterialPageRoute` programmatic navigation instead for EditExamPage (no named route needed).

For EditExamPage specifically, the route will be:
```dart
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (context) => EditExamPage(exam: exam),
  ),
);
```

- [ ] **Step 2: Test flutter analyze on main.dart**

Run: `flutter analyze lib/main.dart`
Expected: No errors

---

## Task 10: Wire up Navigation from HomePage

**Files:**
- Modify: `client/mobile/lib/presentation/pages/home_page.dart`

- [ ] **Step 1: Add navigation entries**

Find where FAB/buttons navigate to existing pages. Add navigation triggers for new pages:

1. In `ScanView` / `exams_view.dart`:
   - "Xem thêm" on submissions stats → navigate to SubmissionsPage
   - Analytics button → navigate to AnalyticsPage

2. In `dashboard_view.dart`:
   - Analytics card → navigate to AnalyticsPage

3. Add entries in ProfileView or AppBar overflow menu for:
   - SettingsPage (can also be triggered from ProfileView settings section)
   - HelpPage

Add necessary imports at top of home_page.dart:
```dart
import 'create_exam_page.dart';
import 'submissions_page.dart';
import 'analytics_page.dart';
import 'settings_page.dart';
import 'help_page.dart';
```

- [ ] **Step 2: Test flutter analyze**

Run: `flutter analyze lib/presentation/pages/home_page.dart`
Expected: No errors

---

## Task 11: Final Verification

- [ ] **Step 1: Run full flutter analyze on the mobile project**

Run: `cd client/mobile && flutter analyze`
Expected: No errors (or only existing pre-existing warnings)

- [ ] **Step 2: Commit all changes**

```bash
git add client/mobile/lib/presentation/pages/create_exam_page.dart \
        client/mobile/lib/presentation/pages/edit_exam_page.dart \
        client/mobile/lib/presentation/pages/submissions_page.dart \
        client/mobile/lib/presentation/pages/analytics_page.dart \
        client/mobile/lib/presentation/pages/appeals_page.dart \
        client/mobile/lib/presentation/pages/question_bank_page.dart \
        client/mobile/lib/presentation/pages/settings_page.dart \
        client/mobile/lib/presentation/pages/help_page.dart \
        client/mobile/lib/main.dart \
        client/mobile/lib/presentation/pages/home_page.dart
git commit -m "feat(mobile): add 8 missing pages - CreateExam, EditExam, Submissions, Analytics, Appeals, QuestionBank, Settings, Help"
```

---

## Design System Quick Reference

```
Colors:
  Background:      #F8FAFC (Color(0xFFF8FAFC))
  Primary Dark:    #081C43 (Color(0xFF081C43))
  Primary Dark 2: #0C2B64 (Color(0xFF0C2B64))
  Primary Dark 3: #0F172A (Color(0xFF0F172A))
  Border:          #E2E8F0 (Color(0xFFE2E8F0))
  Text Primary:    #0F172A
  Text Secondary:  #64748B
  Text Muted:      #94A3B8
  White:           Colors.white

Cards:
  decoration: BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(12 or 16),
    border: Border.all(color: Color(0xFFE2E8F0)),
  )

Input Fields:
  fillColor: Color(0xFFF8FAFC)
  borderRadius: 8
  contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14)

Buttons:
  Primary: ElevatedButton, backgroundColor: Color(0xFF081C43), text white, bold
  Secondary: OutlinedButton, border Color(0xFFCBD5E1), text Color(0xFF0F172A)
  Danger: Text Button, Color(0xFFDC2626)

Status Badges:
  PENDING/IN_PROGRESS: #FEF3C7 bg, #D97706 text
  COMPLETED/GRADED/APPROVED: #DCFCE7 bg, #16A34A text
  REJECTED/ERROR: #FEE2E2 bg, #DC2626 text
  DRAFT/SUBMITTED/REVIEWING: #DBEAFE bg, #1D4ED8 text
  ARCHIVED: #F1F5F9 bg, #64748B text
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|-----------------|------|
| CreateExamPage with form wizard | Task 1 |
| EditExamPage with pre-filled fields | Task 2 |
| SubmissionsPage with filtering | Task 3 |
| AnalyticsPage with charts | Task 4 |
| AppealsPage with review workflow | Task 5 |
| QuestionBankPage with CRUD | Task 6 |
| SettingsPage with tabs | Task 7 |
| HelpPage with FAQ | Task 8 |
| Route registration | Task 9 |
| Navigation wiring | Task 10 |
| Final verification | Task 11 |

All 7 core pages covered. HelpPage is optional/lower priority.
