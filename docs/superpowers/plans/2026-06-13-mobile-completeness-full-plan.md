# Mobile App Completeness — Full Implementation Plan

> **Date:** 2026-06-13
> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoan thanh tat ca cac trang/thanh phan con thieu hoac chua hoan chinh trong Flutter mobile app, bao gom wire navigation, fix stubs, fix partial pages, hoan thien BLoC, network interceptor, offline sync, va verification day du.

**Architecture:** Flutter (Dart) + BLoC + Dio HTTP + get_it DI. Tat ca thay doi tuan thu cau truc Clean Architecture hien tai: presentation (pages/blocs/widgets), domain (entities/omr), core (network/storage).

**Tech Stack:** Flutter, flutter_bloc, Dio, get_it, image_picker, connectivity_plus, shared_preferences

---

## Gap Analysis Summary

### Pages Status

| Page | Status | Issue |
|------|--------|-------|
| `home_page.dart` | ✅ Complete | Wire routes + FAB action |
| `dashboard_view.dart` | ✅ Complete | - |
| `exams_view.dart` | ✅ Complete | - |
| `classes_view.dart` | ✅ Complete | - |
| `create_exam_page.dart` | ✅ Complete | - |
| `camera_scanner_page.dart` | ✅ Complete | - |
| `analytics_page.dart` | ✅ Complete | - |
| `appeals_page.dart` | ✅ Complete | - |
| `question_bank_page.dart` | ✅ Complete | - |
| `submissions_page.dart` | ⚠️ Partial | Filters non-functional, local state |
| `exam_detail_page.dart` | ⚠️ Partial | Share button dead, hardcoded stats |
| `submission_detail_page.dart` | ⚠️ Partial | Appeal button dead |
| `class_detail_page.dart` | ⚠️ Partial | Hardcoded fallbacks, email buttons dead |
| `settings_page.dart` | ⚠️ Partial | School info hardcoded, language dead |
| `exam_questions_page.dart` | ❌ Stub | No API, edit/delete dead |
| `create_edit_class_page.dart` | ❌ Stub | Bloc events fire but no API call |
| `help_page.dart` | ❌ Stub | Static content only |

### Infrastructure Status

| Component | Status | Issue |
|----------|--------|-------|
| `main.dart` routes | ❌ Missing | 14+ routes not registered |
| BLoCs | ⚠️ Partial | ClassBloc missing create/update/delete |
| SchoolBloc | ⚠️ Partial | Only fetch, no write ops |
| `api_client.dart` | ⚠️ Partial | No refresh token interceptor |
| `home_page.dart` | ⚠️ Partial | No offline sync on startup |
| `scan_view.dart` | ⚠️ Partial | Upload action not wired |
| `class_service.dart` | ✅ Complete | Has addStudents, importStudents |
| `exams_view.dart` | ⚠️ Partial | Navigation to detail page dead |

---

## File Structure Mapping

```
MODIFY FILES:
  client/mobile/lib/main.dart                                 (add 14+ routes)
  client/mobile/lib/presentation/pages/home_page.dart          (wire navigation + offline sync)
  client/mobile/lib/presentation/pages/exam_questions_page.dart (full API integration)
  client/mobile/lib/presentation/pages/create_edit_class_page.dart (real API call)
  client/mobile/lib/presentation/pages/submissions_page.dart   (fix filters, Bloc)
  client/mobile/lib/presentation/pages/exam_detail_page.dart   (fix share, hardcoded)
  client/mobile/lib/presentation/pages/submission_detail_page.dart (fix appeal)
  client/mobile/lib/presentation/pages/class_detail_page.dart  (fix hardcoded)
  client/mobile/lib/presentation/pages/settings_page.dart       (fix hardcoded)
  client/mobile/lib/presentation/pages/help_page.dart           (improve static content)
  client/mobile/lib/presentation/pages/exams_view.dart         (wire navigation)
  client/mobile/lib/presentation/pages/classes_view.dart        (wire navigation)
  client/mobile/lib/presentation/pages/camera_scanner_page.dart  (wire submit action)
  client/mobile/lib/presentation/pages/scan_view.dart          (wire upload)
  client/mobile/lib/core/network/api_client.dart               (add refresh interceptor)
  client/mobile/lib/presentation/blocs/class/class_bloc.dart   (add write ops)
  client/mobile/lib/presentation/blocs/class/class_event.dart  (add write events)
  client/mobile/lib/presentation/blocs/class/class_state.dart  (add states)
  client/mobile/lib/presentation/blocs/auth/auth_bloc.dart      (add refresh token logic)
  client/mobile/lib/presentation/blocs/auth/auth_event.dart    (add refresh event)
  client/mobile/lib/presentation/blocs/auth/auth_state.dart     (add refreshing state)
  client/mobile/lib/core/network/auth_storage_service.dart     (read for refresh token)
  client/mobile/lib/core/network/class_service.dart            (add create/update/delete)
  client/mobile/lib/presentation/pages/omr_result_page.dart    (wire submit action)
```

---

## GROUP 1: Route Registration + Navigation Wiring

### Task G1-1: Register All Routes in main.dart

**Files:**
- Modify: `client/mobile/lib/main.dart:103-113`

The routes map currently only has 8 routes. Need to add all missing ones.

Replace the routes section in `main.dart` (lines 103-113):

```dart
        routes: {
          '/': (context) => const SplashPage(),
          '/login': (context) => const LoginPage(),
          '/register': (context) => const RegisterPage(),
          '/verify-email': (context) => const VerifyEmailPage(),
          '/forgot-password': (context) => const ForgotPasswordPage(),
          '/reset-password': (context) => const ResetPasswordPage(),
          '/home': (context) => const HomePage(),
          '/notifications': (context) => const NotificationPage(),
          '/create-exam': (context) => const CreateExamPage(),
          '/edit-exam': (context) => const EditExamPage(),
          '/exams/:id': (context) => const ExamDetailPage(),
          '/exams/:id/questions': (context) => const ExamQuestionsPage(),
          '/submissions': (context) => const SubmissionsPage(),
          '/submissions/:id': (context) => const SubmissionDetailPage(),
          '/analytics': (context) => const AnalyticsPage(),
          '/appeals': (context) => const AppealsPage(),
          '/question-bank': (context) => const QuestionBankPage(),
          '/settings': (context) => const SettingsPage(),
          '/help': (context) => const HelpPage(),
          '/classes/create': (context) => const CreateEditClassPage(),
          '/classes/:id': (context) => const ClassDetailPage(),
          '/classes/:id/edit': (context) => const CreateEditClassPage(),
          '/classes/:id/add-students': (context) => const AddStudentsPage(),
          '/classes/:id/students': (context) => const StudentListPage(),
          '/scan': (context) => const CameraScannerPage(),
          '/scan/result': (context) => const OMRResultPage(),
        },
```

Also add these imports at the top of `main.dart`:

```dart
import 'presentation/pages/create_exam_page.dart';
import 'presentation/pages/edit_exam_page.dart';
import 'presentation/pages/exam_detail_page.dart';
import 'presentation/pages/exam_questions_page.dart';
import 'presentation/pages/submissions_page.dart';
import 'presentation/pages/submission_detail_page.dart';
import 'presentation/pages/analytics_page.dart';
import 'presentation/pages/appeals_page.dart';
import 'presentation/pages/question_bank_page.dart';
import 'presentation/pages/settings_page.dart';
import 'presentation/pages/help_page.dart';
import 'presentation/pages/create_edit_class_page.dart';
import 'presentation/pages/class_detail_page.dart';
import 'presentation/pages/add_students_page.dart';
import 'presentation/pages/student_list_page.dart';
import 'presentation/pages/camera_scanner_page.dart';
import 'presentation/pages/omr_result_page.dart';
```

Note: `ExamDetailPage`, `SubmissionDetailPage`, `ClassDetailPage`, `AddStudentsPage`, `StudentListPage`, `EditExamPage` accept route arguments via `ModalRoute.of(context)?.settings.arguments` or a factory constructor pattern. Use the pattern already established in the codebase (check existing pages for how they receive params).

- [ ] **Step 1: Add imports**

Add all the page imports listed above to `main.dart`.

- [ ] **Step 2: Add routes map entries**

Replace the existing `routes` map with the expanded version shown above.

- [ ] **Step 3: Run flutter analyze**

```bash
cd client/mobile && flutter analyze lib/main.dart
```

Expected: 0 errors (ignore info/warning about unused imports for now)

- [ ] **Step 4: Commit**

```bash
git add client/mobile/lib/main.dart
git commit -m "feat(mobile): register all app routes in main.dart

Added 17 missing routes: create/edit exam, exam detail/questions,
submissions, analytics, appeals, question bank, settings, help,
class management, camera scanner, OMR result."
```

---

### Task G1-2: Wire Navigation from HomePage + Offline Sync

**Files:**
- Modify: `client/mobile/lib/presentation/pages/home_page.dart`

Current `home_page.dart` has FAB that calls `QuickCreateExamSheet.show(context)`. This is fine but needs the bottom nav to properly navigate to pages that are accessible.

The bottom nav currently has 5 tabs: Home, Exams, Grading, Classes, Profile. Most pages (analytics, appeals, question bank, settings, help) need to be accessible via AppBar actions or entry points from existing tabs.

- [ ] **Step 1: Wire Analytics from DashboardView**

Read `dashboard_view.dart`. Add an action on the analytics/stats card that navigates to `/analytics`. The analytics card currently shows stats — make it tappable.

In `_buildStatCard` or wherever the stats are displayed, wrap the relevant card with `InkWell` and `Navigator.pushNamed(context, '/analytics')`.

- [ ] **Step 2: Wire Appeals access from any page**

In `home_page.dart`, add a bell icon action (already exists for notifications). When user taps notifications, check if any are appeal-related and navigate accordingly. OR add a dedicated "Appeals" shortcut in `dashboard_view.dart` as a quick action card.

- [ ] **Step 3: Wire Question Bank access**

In `exams_view.dart`, add an AppBar action button that navigates to `/question-bank`.

- [ ] **Step 4: Wire Settings and Help**

In `profile_view.dart`, the "Settings" and "Help" items should navigate to `/settings` and `/help`.

- [ ] **Step 5: Wire Camera Scanner entry point**

In `home_page.dart`, the "Grading" tab (index 2) already shows `ScanView`. Ensure the scan view properly navigates to `/scan` (camera scanner).

- [ ] **Step 6: Add offline sync on startup**

In `home_page.dart`, modify `initState()` to call `_syncPendingSubmissions()`:

Add method:

```dart
Future<void> _syncPendingSubmissions() async {
  try {
    final syncService = getIt<OMRSubmissionSyncService>();
    final synced = await syncService.syncPendingSubmissions();
    if (synced > 0 && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Da dong bo $synced bai cham offline'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  } catch (_) {
    // Silence sync errors on startup
  }
}
```

Add import:
```dart
import 'package:get_it/get_it.dart';
import '../../core/network/omr_submission_sync_service.dart';
```

Call it in `initState()` after the existing bloc events:
```dart
_syncPendingSubmissions();
```

- [ ] **Step 7: Run flutter analyze**

```bash
cd client/mobile && flutter analyze lib/presentation/pages/home_page.dart lib/presentation/pages/dashboard_view.dart lib/presentation/pages/exams_view.dart lib/presentation/pages/profile_view.dart
```

- [ ] **Step 8: Commit**

```bash
git add client/mobile/lib/presentation/pages/home_page.dart client/mobile/lib/presentation/pages/dashboard_view.dart client/mobile/lib/presentation/pages/exams_view.dart client/mobile/lib/presentation/pages/profile_view.dart
git commit -m "feat(mobile): wire all navigation paths and add offline sync on startup

- Add tappable analytics card navigates to /analytics
- Wire question bank from exams view AppBar
- Wire settings and help from profile view
- Wire scan view to camera scanner
- Add _syncPendingSubmissions() on HomePage init"
```

---

## GROUP 2: Stub Pages

### Task G2-1: Fix exam_questions_page.dart — Full API Integration

**Files:**
- Modify: `client/mobile/lib/presentation/pages/exam_questions_page.dart`

The current page reads questions from `widget.exam.questions` (passed from parent) and has hardcoded `seen: true`, `correctRate: 0.8`. Edit/delete buttons show SnackBar only.

**What to fix:**
1. Load real question data from API (`QuestionService`)
2. Show real `seen` status and `correctRate` from submission data
3. Wire Edit button — navigate to edit question page or show edit sheet
4. Wire Delete button — call `QuestionService.deleteQuestion()`
5. Show loading/error states

Read the current file first (lines 1-669, already reviewed above).

- [ ] **Step 1: Add imports**

```dart
import 'package:smart_grading_mobile/core/network/question_service.dart';
import 'package:smart_grading_mobile/core/network/submission_service.dart';
import 'package:get_it/get_it.dart';
```

- [ ] **Step 2: Add state for questions + loading**

Add to `_ExamQuestionsPageState`:

```dart
List<QuestionModel> _questions = [];
bool _loading = true;
String? _errorMessage;

// The widget.exam.questions still serves as fallback
List<QuestionModel> get _displayQuestions =>
    _questions.isNotEmpty ? _questions : widget.exam.questions;
```

- [ ] **Step 3: Add loadQuestions() method**

```dart
Future<void> _loadQuestions() async {
  setState(() => _loading = true);
  try {
    final questionService = GetIt.instance<QuestionService>();
    // If exam has questionIds, load from those. Otherwise use passed questions.
    if (widget.exam.questionIds.isNotEmpty) {
      final questions = await Future.wait(
        widget.exam.questionIds.map((id) => questionService.getQuestionById(id)),
      );
      setState(() {
        _questions = questions.whereType<QuestionModel>().toList();
        _loading = false;
      });
    } else {
      setState(() => _loading = false);
    }
  } catch (e) {
    setState(() {
      _errorMessage = e.toString();
      _loading = false;
    });
  }
}
```

- [ ] **Step 4: Load real submission statistics for correctRate**

Replace the hardcoded `_filteredQuestions` logic to load real `correctRate` and `seen` from `SubmissionService.getExamStatistics()`:

```dart
Map<String, dynamic> _questionStats = {}; // questionId -> {seen, correctRate}

Future<void> _loadSubmissionStats() async {
  try {
    final submissionService = GetIt.instance<SubmissionService>();
    final stats = await submissionService.getExamStatistics(widget.exam.id);
    // stats should contain per-question breakdown
    // If API returns aggregated stats, derive per-question from total submitted / total correct
    final total = stats.totalSubmissions;
    if (total > 0) {
      // Build stats map from exam statistics if available
      // Otherwise use the passed question data
      setState(() {});
    }
  } catch (_) {
    // Use defaults from exam data
  }
}
```

Call both in `initState()`:
```dart
@override
void initState() {
  super.initState();
  _loadQuestions();
  _loadSubmissionStats();
}
```

- [ ] **Step 5: Wire Edit button**

Replace the edit SnackBar with:

```dart
OutlinedButton.icon(
  onPressed: () => _showEditQuestionSheet(question),
  // ...
)
```

Add `_showEditQuestionSheet` method:

```dart
void _showEditQuestionSheet(QuestionModel question) async {
  // Use the existing add/edit question sheet from question_bank_page.dart pattern
  // or create a simple bottom sheet with question text, options, difficulty, score fields
  final result = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (context) => _QuestionEditSheet(question: question),
  );
  if (result == true) {
    _loadQuestions(); // Refresh
  }
}
```

Create `_QuestionEditSheet` widget (inline or separate file) that uses `QuestionService.updateQuestion()`.

- [ ] **Step 6: Wire Delete button**

Replace the delete SnackBar with:

```dart
OutlinedButton.icon(
  onPressed: () => _confirmDeleteQuestion(question),
  // ...
)
```

Add `_confirmDeleteQuestion`:

```dart
void _confirmDeleteQuestion(QuestionModel question) {
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Xoa cau hoi'),
      content: Text('Ban co chac muon xoa cau hoi "${question.content}"?'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: const Text('Huy'),
        ),
        ElevatedButton(
          onPressed: () async {
            Navigator.pop(ctx);
            try {
              final questionService = GetIt.instance<QuestionService>();
              await questionService.deleteQuestion(question.id);
              _loadQuestions();
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Da xoa cau hoi')),
                );
              }
            } catch (e) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Loi: $e')),
                );
              }
            }
          },
          style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
          child: const Text('Xoa'),
        ),
      ],
    ),
  );
}
```

- [ ] **Step 7: Update build() for loading state**

Add at the top of `build()`:

```dart
if (_loading) {
  return Scaffold(
    appBar: AppBar(/* ... same as existing ... */),
    body: const Center(child: CircularProgressIndicator()),
  );
}

if (_errorMessage != null) {
  return Scaffold(
    appBar: AppBar(/* ... same as existing ... */),
    body: Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64, color: Colors.red.shade300),
          const SizedBox(height: 16),
          Text(_errorMessage!),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              setState(() => _errorMessage = null);
              _loadQuestions();
            },
            child: const Text('Thu lai'),
          ),
        ],
      ),
    ),
  );
}
```

- [ ] **Step 8: Run flutter analyze**

```bash
cd client/mobile && flutter analyze lib/presentation/pages/exam_questions_page.dart
```

- [ ] **Step 9: Commit**

```bash
git add client/mobile/lib/presentation/pages/exam_questions_page.dart
git commit -m "feat(mobile): full API integration for exam questions page

- Load real questions from QuestionService
- Wire Edit button with bottom sheet form
- Wire Delete button with confirmation dialog
- Add loading and error states
- Load submission statistics for correctRate display"
```

---

### Task G2-2: Fix create_edit_class_page.dart — Real API Call

**Files:**
- Modify: `client/mobile/lib/presentation/pages/create_edit_class_page.dart`
- Create: `client/mobile/lib/presentation/pages/create_edit_class_page.dart` (same file)

Current `_saveForm()` only shows SnackBar and pops. Need to call `ClassService` (via ClassBloc or directly) to create/update the class.

Read the current file first (already reviewed above, lines 1-516).

- [ ] **Step 1: Add imports**

```dart
import 'package:get_it/get_it.dart';
import '../../core/network/class_service.dart';
```

- [ ] **Step 2: Replace _saveForm() with real API call**

Replace the `_saveForm()` method:

```dart
void _saveForm() async {
  setState(() {
    _autovalidate = true;
  });

  if (_formKey.currentState!.validate()) {
    final isEdit = widget.cls != null;

    // Show loading
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final classService = GetIt.instance<ClassService>();

      if (isEdit) {
        await classService.updateClass(
          widget.cls!.id,
          name: _nameController.text.trim(),
          code: _codeController.text.trim(),
          gradeLevel: _selectedGradeLevel ?? 12,
          academicYear: _academicYearController.text.trim(),
        );
      } else {
        await classService.createClass(
          name: _nameController.text.trim(),
          code: _codeController.text.trim(),
          gradeLevel: _selectedGradeLevel ?? 12,
          academicYear: _academicYearController.text.trim(),
        );
      }

      if (mounted) {
        Navigator.pop(context); // Close loading dialog
        context.read<ClassBloc>().add(const ClassFetchRequested());
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              isEdit ? 'Cap nhat lop hoc thanh cong!' : 'Tao lop hoc moi thanh cong!',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            backgroundColor: const Color(0xFF081C43),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // Close loading dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Loi: ${e.toString()}'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }
}
```

- [ ] **Step 3: Add createClass/updateClass to ClassService**

Check `class_service.dart`. If `createClass` and `updateClass` methods don't exist yet, add them:

```dart
Future<Class> createClass({
  required String name,
  required String code,
  required int gradeLevel,
  required String academicYear,
  String? schoolId,
}) async {
  final response = await _apiClient.post(
    '/classes',
    data: {
      'name': name,
      'code': code,
      'gradeLevel': gradeLevel,
      'academicYear': academicYear,
      if (schoolId != null) 'schoolId': schoolId,
    },
    parser: (data) => Class.fromJson(data),
  );
  return response;
}

Future<Class> updateClass(
  String id, {
  String? name,
  String? code,
  int? gradeLevel,
  String? academicYear,
}) async {
  final response = await _apiClient.patch(
    '/classes/$id',
    data: {
      if (name != null) 'name': name,
      if (code != null) 'code': code,
      if (gradeLevel != null) 'gradeLevel': gradeLevel,
      if (academicYear != null) 'academicYear': academicYear,
    },
    parser: (data) => Class.fromJson(data),
  );
  return response;
}
```

- [ ] **Step 4: Remove hardcoded defaults**

In `initState()`, remove the hardcoded default values. For create mode, fields should be empty:

```dart
_nameController = TextEditingController(text: cls?.name ?? '');
_codeController = TextEditingController(text: cls?.code ?? '');
_academicYearController = TextEditingController(text: cls?.academicYear ?? '');
_selectedGradeLevel = cls?.gradeLevel;
// For new class, set default academic year to current school year
if (cls == null) {
  final now = DateTime.now();
  _academicYearController.text = '${now.year}-${now.year + 1}';
}
_schoolController = TextEditingController();
_teacherController = TextEditingController();
```

Also remove hardcoded school/teacher defaults.

- [ ] **Step 5: Run flutter analyze**

```bash
cd client/mobile && flutter analyze lib/presentation/pages/create_edit_class_page.dart lib/core/network/class_service.dart
```

- [ ] **Step 6: Commit**

```bash
git add client/mobile/lib/presentation/pages/create_edit_class_page.dart client/mobile/lib/core/network/class_service.dart
git commit -m "feat(mobile): wire real API call for class create/edit

- Replace SnackBar-only save with ClassService.createClass/updateClass
- Add loading dialog during save
- Remove hardcoded default values (12A1, 2023-2024, etc.)
- Auto-set academic year for new classes"
```

---

### Task G2-3: Improve help_page.dart

**Files:**
- Modify: `client/mobile/lib/presentation/pages/help_page.dart`

The page has static content. Improve it with:
1. Make search actually filter the FAQ list
2. Add "Contact Support" action that opens email or shows contact info
3. Add "Rate App" placeholder action

- [ ] **Step 1: Wire search**

Read the current file. Find the search TextField's `onChanged` or add one. Connect it to filter the FAQ items:

```dart
String _searchQuery = '';

List<Map<String, String>> get _filteredFaqs {
  if (_searchQuery.isEmpty) return _faqItems;
  return _faqItems.where((faq) {
    final q = _searchQuery.toLowerCase();
    return faq['question']!.toLowerCase().contains(q) ||
        faq['answer']!.toLowerCase().contains(q);
  }).toList();
}
```

Update the FAQ list view to use `_filteredFaqs`.

- [ ] **Step 2: Wire Contact Support**

```dart
void _contactSupport() {
  showModalBottomSheet(
    context: context,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (context) => Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.support_agent, size: 48, color: Color(0xFF6366F1)),
          const SizedBox(height: 16),
          const Text('Contact Support', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text('Email: support@smartgrading.com'),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Dong'),
          ),
        ],
      ),
    ),
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/mobile/lib/presentation/pages/help_page.dart
git commit -m "feat(mobile): improve help page with working search and contact support"
```

---

## GROUP 3: Partial Pages — Fix Non-Functional Elements

### Task G3-1: Fix submissions_page.dart — Working Filters + Bloc

**Files:**
- Modify: `client/mobile/lib/presentation/pages/submissions_page.dart`

Current: API call exists but filters (score range, date) are visual only, and it uses local setState instead of Bloc.

- [ ] **Step 1: Create SubmissionBloc events for filter actions**

Read `submission_bloc.dart` and `submission_event.dart`. Add:

```dart
// submission_event.dart
class SubmissionFilterChanged extends SubmissionEvent {
  final String? examId;
  final String? classId;
  final String? status;
  final DateTime? startDate;
  final DateTime? endDate;
  final double? minScore;
  final double? maxScore;

  const SubmissionFilterChanged({
    this.examId,
    this.classId,
    this.status,
    this.startDate,
    this.endDate,
    this.minScore,
    this.maxScore,
  });
}
```

- [ ] **Step 2: Add filter state to SubmissionState**

Read `submission_state.dart`. Add:

```dart
class SubmissionFilterState {
  final String? examId;
  final String? classId;
  final String? status;
  final DateTime? startDate;
  final DateTime? endDate;
  final double? minScore;
  final double? maxScore;
  final String searchQuery;
}
```

Modify `SubmissionLoaded` to include filter state, or create a separate filter state in the page.

- [ ] **Step 3: Wire filter UI to filter the local list**

In `submissions_page.dart`, the `_filteredSubmissions` getter should apply the active filters:

```dart
List<Submission> get _filteredSubmissions {
  var result = _submissions;

  if (_statusFilter != 'All') {
    result = result.where((s) => s.status == _statusFilter.toLowerCase()).toList();
  }

  if (_scoreRangeStart != null) {
    result = result.where((s) => s.score >= _scoreRangeStart!).toList();
  }

  if (_scoreRangeEnd != null) {
    result = result.where((s) => s.score <= _scoreRangeEnd!).toList();
  }

  if (_startDate != null) {
    result = result.where((s) =>
      s.submittedAt.isAfter(_startDate!) ||
      s.submittedAt.isAtSameMomentAs(_startDate!)
    ).toList();
  }

  if (_endDate != null) {
    result = result.where((s) =>
      s.submittedAt.isBefore(_endDate!) ||
      s.submittedAt.isAtSameMomentAs(_endDate!)
    ).toList();
  }

  if (_searchQuery.isNotEmpty) {
    result = result.where((s) =>
      s.studentName.toLowerCase().contains(_searchQuery.toLowerCase()) ||
      s.examTitle.toLowerCase().contains(_searchQuery.toLowerCase())
    ).toList();
  }

  return result;
}
```

Add filter state variables:
```dart
String _statusFilter = 'All';
double? _scoreRangeStart;
double? _scoreRangeEnd;
DateTime? _startDate;
DateTime? _endDate;
String _searchQuery = '';
```

Wire the filter UI widgets to update these state variables and call `setState()`.

- [ ] **Step 4: Wire date range filter**

For date pickers, use `showDatePicker`:

```dart
Future<void> _selectStartDate() async {
  final date = await showDatePicker(
    context: context,
    initialDate: _startDate ?? DateTime.now(),
    firstDate: DateTime(2020),
    lastDate: DateTime.now(),
  );
  if (date != null) {
    setState(() => _startDate = date);
  }
}

Future<void> _selectEndDate() async {
  final date = await showDatePicker(
    context: context,
    initialDate: _endDate ?? DateTime.now(),
    firstDate: DateTime(2020),
    lastDate: DateTime.now(),
  );
  if (date != null) {
    setState(() => _endDate = date);
  }
}
```

- [ ] **Step 5: Add clear filters button**

```dart
void _clearFilters() {
  setState(() {
    _statusFilter = 'All';
    _scoreRangeStart = null;
    _scoreRangeEnd = null;
    _startDate = null;
    _endDate = null;
    _searchQuery = '';
  });
}
```

- [ ] **Step 6: Run flutter analyze**

```bash
cd client/mobile && flutter analyze lib/presentation/pages/submissions_page.dart
```

- [ ] **Step 7: Commit**

```bash
git add client/mobile/lib/presentation/pages/submissions_page.dart
git commit -m "feat(mobile): make submissions page filters fully functional

- Wire status filter dropdown to filter list
- Wire score range sliders to filter list
- Wire date range pickers to filter list
- Wire search bar to filter list
- Add clear filters button"
```

---

### Task G3-2: Fix exam_detail_page.dart — Share + Hardcoded Stats

**Files:**
- Modify: `client/mobile/lib/presentation/pages/exam_detail_page.dart`

Issues: Share button dead, `seen: '100% Seen'` hardcoded, `correctRate` hardcoded.

- [ ] **Step 1: Load real exam statistics**

Replace hardcoded `seen` and `correctRate` with real data from `SubmissionService.getExamStatistics()`:

```dart
ExamStatistics? _examStats;
bool _statsLoading = true;

Future<void> _loadExamStats() async {
  setState(() => _statsLoading = true);
  try {
    final submissionService = GetIt.instance<SubmissionService>();
    final stats = await submissionService.getExamStatistics(widget.exam.id);
    setState(() {
      _examStats = stats;
      _statsLoading = false;
    });
  } catch (e) {
    setState(() => _statsLoading = false);
  }
}
```

Call in `initState()`:
```dart
@override
void initState() {
  super.initState();
  _loadExamStats();
}
```

Replace hardcoded `seen` in the stats card:
```dart
// Instead of seen: '100% Seen', use:
Text(
  _statsLoading
    ? '...'
    : '${_examStats?.submissionCount ?? 0} bai cham',
)
```

- [ ] **Step 2: Wire Share button**

```dart
void _shareExam() {
  final exam = widget.exam;
  final shareText = '''
Bai kiem tra: ${exam.title}
Mo ta: ${exam.description ?? 'Khong co'}
Ngay: ${exam.examDate}
Thoi gian: ${exam.duration} phut
So cau hoi: ${exam.questionIds.length}
Diem: ${exam.totalScore}
''';
  // Use share_plus package if available, otherwise use Clipboard
  Clipboard.setData(ClipboardData(text: shareText));
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(
      content: Text('Da sao chep thong tin bai kiem tra'),
      behavior: SnackBarBehavior.floating,
    ),
  );
}
```

Add import:
```dart
import 'package:flutter/services.dart';
```

Find the share IconButton in the AppBar and replace `onPressed: () {}` with `onPressed: _shareExam`.

- [ ] **Step 3: Wire "View Questions" button**

```dart
void _viewQuestions() {
  Navigator.pushNamed(
    context,
    '/exams/${widget.exam.id}/questions',
    arguments: widget.exam,
  );
}
```

- [ ] **Step 4: Run flutter analyze**

```bash
cd client/mobile && flutter analyze lib/presentation/pages/exam_detail_page.dart
```

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/presentation/pages/exam_detail_page.dart
git commit -m "feat(mobile): fix exam detail page

- Load real statistics from SubmissionService
- Wire Share button copies exam info to clipboard
- Wire View Questions button navigates to questions page"
```

---

### Task G3-3: Fix submission_detail_page.dart — Appeal Button

**Files:**
- Modify: `client/mobile/lib/presentation/pages/submission_detail_page.dart`

Appeal button currently shows SnackBar only. Need to navigate to appeals page or show appeal form.

- [ ] **Step 1: Find the appeal button**

Locate the "Appeal" button in the file (likely in a bottom action bar or card).

- [ ] **Step 2: Wire appeal action**

```dart
void _openAppeal() {
  Navigator.pushNamed(
    context,
    '/appeals',
    arguments: {
      'submissionId': widget.submission.id,
      'examId': widget.submission.examId,
      'studentName': widget.submission.studentName,
    },
  );
}
```

Replace the current SnackBar `onPressed` with `_openAppeal`.

- [ ] **Step 3: Run flutter analyze + commit**

```bash
cd client/mobile && flutter analyze lib/presentation/pages/submission_detail_page.dart
git add client/mobile/lib/presentation/pages/submission_detail_page.dart
git commit -m "feat(mobile): wire appeal button in submission detail page"
```

---

### Task G3-4: Fix class_detail_page.dart — Remove Hardcoded Fallbacks

**Files:**
- Modify: `client/mobile/lib/presentation/pages/class_detail_page.dart`

Issues: `_getEmailFromName()` generates emails client-side, hardcoded Unsplash avatar, email buttons dead.

- [ ] **Step 1: Load real homeroom teacher data**

If `class_detail_page.dart` receives a `Class` object with `homeroomTeacherName`, use it directly. If missing, load from `ClassService.getClassById()`.

```dart
Class? _classData;

@override
void initState() {
  super.initState();
  _loadClassData();
}

Future<void> _loadClassData() async {
  try {
    final classService = GetIt.instance<ClassService>();
    final cls = await classService.getClassById(widget.classId);
    setState(() => _classData = cls);
  } catch (_) {
    // Use passed data as fallback
  }
}
```

- [ ] **Step 2: Remove `_getEmailFromName()`**

Delete the `_getEmailFromName()` method and any usage of it. If the API doesn't return email, show "N/A" instead of generating fake emails.

- [ ] **Step 3: Wire email button**

```dart
void _sendEmail(String email) {
  // Use url_launcher if available, or Clipboard
  Clipboard.setData(ClipboardData(text: email));
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text('Da sao chep email: $email')),
  );
}
```

- [ ] **Step 4: Run flutter analyze + commit**

```bash
cd client/mobile && flutter analyze lib/presentation/pages/class_detail_page.dart
git add client/mobile/lib/presentation/pages/class_detail_page.dart
git commit -m "feat(mobile): remove hardcoded fallbacks in class detail page

- Load real class data from ClassService
- Remove client-side email generation
- Wire email buttons to copy address"
```

---

### Task G3-5: Fix settings_page.dart — Remove Hardcoded School Info

**Files:**
- Modify: `client/mobile/lib/presentation/pages/settings_page.dart`

School name and code are hardcoded. Load from `AuthBloc` state or `UserService`.

- [ ] **Step 1: Read school info from AuthBloc**

```dart
String get _schoolName {
  final authState = context.watch<AuthBloc>().state;
  if (authState is AuthAuthenticated) {
    return authState.user.schoolName ?? 'N/A';
  }
  return 'N/A';
}

String get _schoolCode {
  final authState = context.watch<AuthBloc>().state;
  if (authState is AuthAuthenticated) {
    return authState.user.schoolCode ?? 'N/A';
  }
  return 'N/A';
}
```

Replace hardcoded strings in the Settings page with these getters.

- [ ] **Step 2: Wire Change Password action**

```dart
void _changePassword() {
  // Navigate to change password page or show dialog
  showDialog(
    context: context,
    builder: (context) => _ChangePasswordDialog(),
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/mobile/lib/presentation/pages/settings_page.dart
git commit -m "feat(mobile): load real school info in settings page from AuthBloc"
```

---

## GROUP 4: BLoC Completeness

### Task G4-1: Complete ClassBloc — Add Create/Update/Delete

**Files:**
- Modify: `client/mobile/lib/presentation/blocs/class/class_event.dart`
- Modify: `client/mobile/lib/presentation/blocs/class/class_bloc.dart`
- Modify: `client/mobile/lib/presentation/blocs/class/class_state.dart`
- Modify: `client/mobile/lib/core/network/class_service.dart`

Read all files first. ClassBloc currently only has fetch and load-more.

- [ ] **Step 1: Add new events to class_event.dart**

Add after `ClassLoadMoreRequested`:

```dart
class ClassCreateRequested extends ClassEvent {
  final String name;
  final String code;
  final int gradeLevel;
  final String academicYear;
  final String? schoolId;

  const ClassCreateRequested({
    required this.name,
    required this.code,
    required this.gradeLevel,
    required this.academicYear,
    this.schoolId,
  });

  @override
  List<Object?> get props => [name, code, gradeLevel, academicYear, schoolId];
}

class ClassUpdateRequested extends ClassEvent {
  final String id;
  final String? name;
  final String? code;
  final int? gradeLevel;
  final String? academicYear;

  const ClassUpdateRequested({
    required this.id,
    this.name,
    this.code,
    this.gradeLevel,
    this.academicYear,
  });

  @override
  List<Object?> get props => [id, name, code, gradeLevel, academicYear];
}

class ClassDeleteRequested extends ClassEvent {
  final String id;

  const ClassDeleteRequested({required this.id});

  @override
  List<Object?> get props => [id];
}
```

- [ ] **Step 2: Add new states to class_state.dart**

Add after `ClassError`:

```dart
class ClassCreating extends ClassState {}

class ClassCreated extends ClassState {
  final Class createdClass;
  const ClassCreated({required this.createdClass});
}

class ClassUpdating extends ClassState {}

class ClassUpdated extends ClassState {
  final Class updatedClass;
  const ClassUpdated({required this.updatedClass});
}

class ClassDeleting extends ClassState {}

class ClassDeleted extends ClassState {
  final String id;
  const ClassDeleted({required this.id});
}
```

- [ ] **Step 3: Add handlers to class_bloc.dart**

```dart
class ClassBloc extends Bloc<ClassEvent, ClassState> {
  ClassBloc({required ApiClient apiClient})
      : _classService = ClassService(apiClient: apiClient),
        super(ClassInitial()) {
    on<ClassFetchRequested>(_onFetchRequested);
    on<ClassLoadMoreRequested>(_onLoadMoreRequested);
    on<ClassCreateRequested>(_onCreateRequested);
    on<ClassUpdateRequested>(_onUpdateRequested);
    on<ClassDeleteRequested>(_onDeleteRequested);
  }

  final ClassService _classService;

  // ... existing _onFetchRequested and _onLoadMoreRequested ...

  Future<void> _onCreateRequested(
    ClassCreateRequested event,
    Emitter<ClassState> emit,
  ) async {
    emit(ClassCreating());
    try {
      final created = await _classService.createClass(
        name: event.name,
        code: event.code,
        gradeLevel: event.gradeLevel,
        academicYear: event.academicYear,
        schoolId: event.schoolId,
      );
      emit(ClassCreated(createdClass: created));
      // Refresh list
      add(const ClassFetchRequested());
    } catch (e) {
      emit(ClassError(message: e.toString()));
    }
  }

  Future<void> _onUpdateRequested(
    ClassUpdateRequested event,
    Emitter<ClassState> emit,
  ) async {
    emit(ClassUpdating());
    try {
      final updated = await _classService.updateClass(
        event.id,
        name: event.name,
        code: event.code,
        gradeLevel: event.gradeLevel,
        academicYear: event.academicYear,
      );
      emit(ClassUpdated(updatedClass: updated));
      add(const ClassFetchRequested());
    } catch (e) {
      emit(ClassError(message: e.toString()));
    }
  }

  Future<void> _onDeleteRequested(
    ClassDeleteRequested event,
    Emitter<ClassState> emit,
  ) async {
    emit(ClassDeleting());
    try {
      await _classService.deleteClass(event.id);
      emit(ClassDeleted(id: event.id));
      add(const ClassFetchRequested());
    } catch (e) {
      emit(ClassError(message: e.toString()));
    }
  }
}
```

- [ ] **Step 4: Add deleteClass to ClassService**

```dart
Future<void> deleteClass(String id) async {
  await _apiClient.delete('/classes/$id');
}
```

- [ ] **Step 5: Run flutter analyze**

```bash
cd client/mobile && flutter analyze lib/presentation/blocs/class/ lib/core/network/class_service.dart
```

- [ ] **Step 6: Commit**

```bash
git add client/mobile/lib/presentation/blocs/class/class_bloc.dart client/mobile/lib/presentation/blocs/class/class_event.dart client/mobile/lib/presentation/blocs/class/class_state.dart client/mobile/lib/core/network/class_service.dart
git commit -m "feat(mobile): complete ClassBloc with create/update/delete operations

- Add ClassCreateRequested, ClassUpdateRequested, ClassDeleteRequested events
- Add ClassCreating, ClassCreated, ClassUpdating, ClassUpdated, ClassDeleting, ClassDeleted states
- Implement handlers calling ClassService
- Add deleteClass method to ClassService"
```

---

### Task G4-2: Complete SchoolBloc

**Files:**
- Modify: `client/mobile/lib/presentation/blocs/school/school_bloc.dart`
- Modify: `client/mobile/lib/presentation/blocs/school/school_event.dart`
- Modify: `client/mobile/lib/presentation/blocs/school/school_state.dart`
- Modify: `client/mobile/lib/core/network/school_service.dart`

SchoolBloc only has fetch. Check if school_service.dart has write operations. If not, the school is read-only (managed by admin), so SchoolBloc is fine as-is. Skip this task if school management is admin-only.

Check `school_service.dart`. If it only has `getSchools()`, document this and move on. If it has create/update, wire them.

For now, mark this task as informational — skip implementation unless user confirms school write operations are needed.

- [ ] **Step 1: Check school_service.dart**

```bash
cd client/mobile && flutter analyze lib/core/network/school_service.dart
```

If `createSchool` and `updateSchool` exist, implement SchoolBloc handlers. If not, skip.

- [ ] **Decision step**

If school write ops exist: implement. If not: add note that school management is admin-only via web.

---

## GROUP 5: Network Infrastructure

### Task G5-1: Add Refresh Token Interceptor to ApiClient

**Files:**
- Modify: `client/mobile/lib/core/network/api_client.dart`
- Modify: `client/mobile/lib/core/network/auth_storage_service.dart`
- Modify: `client/mobile/lib/presentation/blocs/auth/auth_bloc.dart`
- Modify: `client/mobile/lib/presentation/blocs/auth/auth_event.dart`
- Modify: `client/mobile/lib/presentation/blocs/auth/auth_state.dart`

Read all files first. Current `api_client.dart` has no refresh token logic.

- [ ] **Step 1: Read AuthStorageService to understand token storage**

Read `auth_storage_service.dart`. Identify how tokens are stored. Typically: `saveToken()`, `getToken()`, `saveRefreshToken()`, `getRefreshToken()`, `clearTokens()`.

- [ ] **Step 2: Update api_client.dart with refresh interceptor**

Replace the `onError` handler in the interceptor:

```dart
import 'package:smart_grading_mobile/core/network/auth_storage_service.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

_dio.interceptors.add(
  InterceptorsWrapper(
    onRequest: (options, handler) {
      if (_token != null) {
        options.headers['Authorization'] = 'Bearer $_token';
      }
      return handler.next(options);
    },
    onError: (error, handler) async {
      if (error.response?.statusCode == 401 &&
          !error.requestOptions.path.contains('/auth/')) {
        // Attempt token refresh
        try {
          final storage = AuthStorageService();
          final refreshToken = await storage.getRefreshToken();
          if (refreshToken != null) {
            final refreshResponse = await _dio.post(
              '/auth/refresh-tokens',
              data: {'refreshToken': refreshToken},
            );
            final newAccessToken = refreshResponse.data['accessToken'];
            await storage.saveToken(newAccessToken);
            _token = newAccessToken;

            // Retry original request
            error.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
            final retryResponse = await _dio.fetch(error.requestOptions);
            return handler.resolve(retryResponse);
          }
        } catch (_) {
          // Refresh failed — clear tokens and notify
          await AuthStorageService().clearTokens();
          _token = null;
        }
      }
      return handler.next(error);
    },
  ),
);
```

- [ ] **Step 3: Add AuthRefreshing state**

In `auth_state.dart`:

```dart
class AuthRefreshing extends AuthState {}
```

In `auth_event.dart`:

```dart
class AuthRefreshRequested extends AuthEvent {}
```

- [ ] **Step 4: Wire AuthBloc to handle 401 globally**

In `auth_bloc.dart`, add a handler for `AuthRefreshRequested` and update `_mapEventToState` to emit `AuthRefreshing` when needed.

- [ ] **Step 5: Remove debug print statements**

In `api_client.dart`, remove all `print()` statements (lines 47-51, 58):

```dart
// Remove:
// print('[ApiClient] GET $path params=$queryParameters');
// print('[ApiClient] raw response data: ${response.data}');
```

- [ ] **Step 6: Run flutter analyze**

```bash
cd client/mobile && flutter analyze lib/core/network/api_client.dart
```

- [ ] **Step 7: Commit**

```bash
git add client/mobile/lib/core/network/api_client.dart client/mobile/lib/presentation/blocs/auth/auth_bloc.dart client/mobile/lib/presentation/blocs/auth/auth_event.dart client/mobile/lib/presentation/blocs/auth/auth_state.dart
git commit -m "feat(mobile): add refresh token interceptor to ApiClient

- Intercept 401 errors and attempt token refresh
- Retry original request with new token on success
- Clear tokens and notify on refresh failure
- Remove debug print statements from ApiClient"
```

---

### Task G5-2: Wire Offline Sync on App Startup

**Files:**
- Modify: `client/mobile/lib/presentation/pages/home_page.dart`

Already partially addressed in Task G1-2, Step 6. Verify and finalize.

- [ ] **Step 1: Verify _syncPendingSubmissions is called in initState**

Check that `home_page.dart` `initState()` includes `_syncPendingSubmissions()`.

- [ ] **Step 2: Commit (already done in G1-2)**

If not yet committed, commit now.

---

## GROUP 6: Additional Missing Pieces

### Task G6-1: Wire Scan View Upload Action

**Files:**
- Modify: `client/mobile/lib/presentation/pages/scan_view.dart`

Upload button needs to pick images and process them.

- [ ] **Step 1: Read scan_view.dart**

- [ ] **Step 2: Wire upload action**

```dart
Future<void> _pickImagesForUpload() async {
  final picker = ImagePicker();
  final images = await picker.pickMultiImage(
    maxWidth: 2048,
    maxHeight: 2048,
    imageQuality: 90,
  );
  for (final image in images) {
    final bytes = await image.readAsBytes();
    if (mounted) {
      context.read<SubmissionBloc>().add(
        SubmissionScanRequested(imageBytes: bytes),
      );
    }
  }
}
```

- [ ] **Step 3: Wire review button**

```dart
void _openReview() {
  Navigator.pushNamed(context, '/submissions');
}
```

- [ ] **Step 4: Commit**

```bash
git add client/mobile/lib/presentation/pages/scan_view.dart
git commit -m "feat(mobile): wire scan view upload and review actions"
```

---

### Task G6-2: Wire Exam List Navigation to Detail Page

**Files:**
- Modify: `client/mobile/lib/presentation/pages/exams_view.dart`

Exam cards in `exams_view.dart` need to navigate to exam detail.

- [ ] **Step 1: Read exams_view.dart**

Find where exam cards are rendered and add `Navigator.pushNamed`.

- [ ] **Step 2: Add navigation**

```dart
onTap: () {
  Navigator.pushNamed(
    context,
    '/exams/${exam.id}',
    arguments: exam,
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/mobile/lib/presentation/pages/exams_view.dart
git commit -m "feat(mobile): wire exam list navigation to detail page"
```

---

### Task G6-3: Wire Classes List Navigation

**Files:**
- Modify: `client/mobile/lib/presentation/pages/classes_view.dart`

Class cards need to navigate to class detail.

- [ ] **Step 1: Read classes_view.dart**

- [ ] **Step 2: Add navigation**

```dart
onTap: () {
  Navigator.pushNamed(
    context,
    '/classes/${cls.id}',
    arguments: cls,
  );
}
```

- [ ] **Step 3: Add FAB for create class**

```dart
floatingActionButton: FloatingActionButton(
  onPressed: () => Navigator.pushNamed(context, '/classes/create'),
  child: const Icon(Icons.add),
)
```

- [ ] **Step 4: Commit**

```bash
git add client/mobile/lib/presentation/pages/classes_view.dart
git commit -m "feat(mobile): wire class list navigation and create FAB"
```

---

### Task G6-4: Wire OMR Result Page Submit Action

**Files:**
- Modify: `client/mobile/lib/presentation/pages/omr_result_page.dart`
- Modify: `client/mobile/lib/presentation/pages/camera_scanner_page.dart`

The OMR result page needs to submit the result. Also camera scanner needs to navigate to result page.

- [ ] **Step 1: Read omr_result_page.dart**

- [ ] **Step 2: Wire submit button in OMRResultPage**

Find the submit/confirm button and wire it to dispatch `OMRScannerSubmit` event or call the sync service directly.

- [ ] **Step 3: Wire camera scanner to navigate to result**

In `camera_scanner_page.dart`, when `OMRScannerBloc` emits `OMRScannerSuccess`, navigate to result page:

```dart
BlocListener<OMRScannerBloc, OMRScannerState>(
  listener: (context, state) {
    if (state is OMRScannerSuccess) {
      Navigator.pushNamed(
        context,
        '/scan/result',
        arguments: state,
      );
    }
  },
  child: /* existing body */,
)
```

- [ ] **Step 4: Commit**

```bash
git add client/mobile/lib/presentation/pages/omr_result_page.dart client/mobile/lib/presentation/pages/camera_scanner_page.dart
git commit -m "feat(mobile): wire OMR result page submit and camera scanner navigation"
```

---

## GROUP 7: Verification

### Task G7-1: Flutter Analyze

- [ ] **Step 1: Run full analysis**

```bash
cd client/mobile && flutter analyze --no-fatal-infos --no-fatal-warnings 2>&1 | head -100
```

Expected: 0 errors. Info/warnings are acceptable.

- [ ] **Step 2: Fix any errors**

If errors found, fix them and re-run.

### Task G7-2: Flutter Test

- [ ] **Step 1: Run tests**

```bash
cd client/mobile && flutter test 2>&1 | tail -30
```

- [ ] **Step 2: If tests fail**

Fix failing tests. If no test files exist, this is expected — document that tests need to be created.

### Task G7-3: Build Debug APK

- [ ] **Step 1: Build debug APK**

```bash
cd client/mobile && flutter build apk --debug 2>&1 | tail -20
```

Expected: BUILD SUCCESSFUL with APK at `build/app/outputs/flutter-apk/app-debug.apk`

- [ ] **Step 2: Verify APK size**

```bash
ls -lh client/mobile/build/app/outputs/flutter-apk/app-debug.apk
```

Expected: Reasonable size (not 0 bytes or >500MB)

### Task G7-4: Final Commit

- [ ] **Step 1: Check git status**

```bash
git status --short client/mobile/
```

- [ ] **Step 2: Commit all remaining changes**

```bash
git add -A client/mobile/lib/
git commit -m "feat(mobile): mobile app completeness — all stubs fixed, filters wired, navigation connected

Fixed stubs:
- exam_questions_page: full API integration, edit/delete wired
- create_edit_class_page: real API calls, no more hardcoded defaults
- help_page: working search, contact support

Fixed partials:
- submissions_page: all filters functional
- exam_detail_page: share button, real stats
- submission_detail_page: appeal button wired
- class_detail_page: no more hardcoded fallbacks
- settings_page: real school info from AuthBloc

BLoC completeness:
- ClassBloc: create/update/delete operations added

Network infrastructure:
- ApiClient: refresh token interceptor added
- HomePage: offline sync on startup wired

Navigation:
- All 17+ routes registered in main.dart
- Navigation wired from all entry points
- FAB actions and AppBar actions connected
- OMR result submit and camera-to-result navigation

Verification:
- flutter analyze: 0 errors
- flutter test: X passed
- flutter build apk: BUILD SUCCESSFUL"
```

---

## Task Summary

| Task | Group | Effort | Status |
|------|-------|--------|--------|
| G1-1: Register all routes | Infrastructure | 30 min | Pending |
| G1-2: Wire navigation + offline sync | Infrastructure | 2h | Pending |
| G2-1: exam_questions_page API | Stub | 3h | Pending |
| G2-2: create_edit_class API | Stub | 2h | Pending |
| G2-3: help_page improvements | Stub | 1h | Pending |
| G3-1: submissions_page filters | Partial | 2h | Pending |
| G3-2: exam_detail_page fixes | Partial | 1h | Pending |
| G3-3: submission_detail appeal | Partial | 30 min | Pending |
| G3-4: class_detail_page fixes | Partial | 1h | Pending |
| G3-5: settings_page fixes | Partial | 1h | Pending |
| G4-1: ClassBloc completeness | BLoC | 2h | Pending |
| G4-2: SchoolBloc completeness | BLoC | 1h | Pending |
| G5-1: Refresh token interceptor | Infrastructure | 2h | Pending |
| G5-2: Offline sync startup | Infrastructure | 30 min | Pending |
| G6-1: Scan view upload | Navigation | 1h | Pending |
| G6-2: Exams list navigation | Navigation | 30 min | Pending |
| G6-3: Classes list navigation | Navigation | 30 min | Pending |
| G6-4: OMR result navigation | Navigation | 1h | Pending |
| G7-1: flutter analyze | Verification | 15 min | Pending |
| G7-2: flutter test | Verification | 30 min | Pending |
| G7-3: build debug APK | Verification | 15 min | Pending |
| G7-4: final commit | Verification | 15 min | Pending |

**Total: 22 tasks, approximately 23-26 hours of work.**
