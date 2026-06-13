# Mobile App Completeness — Implementation Plan

> **Date:** 2026-06-10
> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement tasks task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoan thien tat ca cac chuc nang con thieu/trong stub/mock trong Flutter mobile app.

**Architecture:** Flutter (Dart) + BLoC + Dio HTTP + get_it DI. Cac chuc nang con thieu se duoc hoan thien theo kien truc hien tai.

---

## Section 1: Gap Analysis Summary

### Module Status Overview

| Module | Completion | Notes |
|--------|-----------|-------|
| OMR Engine (domain layer) | ~98% | Chi con gallery picker chua noi |
| Camera UI Integration | ~85% | Gallery picker stub, student list stub |
| Offline Sync | ~80% | Thieu auto-sync on startup |
| Auth & Session | ~85% | Thieu refresh token interceptor |
| Data Management | ~75% | Mot so mock data fallback |
| Profile & Settings | Stub | Hardcoded values, buttons trong |
| Navigation & Shell | ~60% | FAB/AppBar actions trong, go_router chua dung |
| Tests | ~60% | Thieu camera_bloc_test, omr_scanner_bloc_test |

### 1 MISSING file
- `lib/presentation/pages/student_picker_dialog.dart` — Student picker dialog

### 1 STUB file (hoan toan placeholder)
- `lib/presentation/pages/student_list_page.dart` — "No students in this class yet"

### 2 PARTIAL (co code nhung chua noi day)
- `lib/presentation/pages/camera_scanner_page.dart` — 2 nut gallery = snackbar stub
- `lib/core/network/api_client.dart` — Khong co refresh token interceptor

---

## Section 2: Priority Tasks

### P0 — CRITICAL

#### Task C1: Gallery Image Picker

**File:** `client/mobile/lib/presentation/pages/camera_scanner_page.dart`

- [ ] **Step 1: Thay snackbar bang image_picker**

Tim 2 noi co `ScaffoldMessenger` voi "Gallery picker not implemented yet", thay bang:

```dart
import 'package:image_picker/image_picker.dart';

Future<void> _pickImageFromGallery() async {
  final picker = ImagePicker();
  final XFile? image = await picker.pickImage(
    source: ImageSource.gallery,
    maxWidth: 2048,
    maxHeight: 2048,
    imageQuality: 90,
  );
  if (image != null && mounted) {
    final bytes = await image.readAsBytes();
    context.read<OMRScannerBloc>().add(OMRScannerImagePicked(imageBytes: bytes));
  }
}
```

Thay `onPressed` cua 2 nut `Icons.photo_library`:
```dart
IconButton(
  onPressed: _pickImageFromGallery,
  // ...
)
```

- [ ] **Step 2: Verify**

Run: `flutter analyze lib/presentation/pages/camera_scanner_page.dart`

- [ ] **Step 3: Commit**

```bash
git add client/mobile/lib/presentation/pages/camera_scanner_page.dart
git commit -m "feat(mobile): implement gallery image picker in camera scanner

Replaced snackbar stubs with actual image_picker integration.
Users can now pick OMR sheet photos from gallery."
```

---

#### Task C2: Student List + Student Picker

**Files:**
- Create: `client/mobile/lib/presentation/pages/student_picker_dialog.dart`
- Modify: `client/mobile/lib/presentation/pages/student_list_page.dart`
- Modify: `client/mobile/lib/presentation/pages/camera_scanner_page.dart`

- [ ] **Step 1: Tao StudentPickerDialog**

```dart
import 'package:flutter/material.dart';
import 'package:smart_grading_mobile/domain/entities/user.entity.dart';

class StudentPickerDialog extends StatefulWidget {
  final List<ClassStudent> students;
  final String? preselectedId;

  const StudentPickerDialog({
    super.key,
    required this.students,
    this.preselectedId,
  });

  @override
  State<StudentPickerDialog> createState() => _StudentPickerDialogState();
}

class _StudentPickerDialogState extends State<StudentPickerDialog> {
  String? _selectedId;
  final _searchController = TextEditingController();
  List<ClassStudent> _filtered = [];

  @override
  void initState() {
    super.initState();
    _filtered = widget.students;
    _selectedId = widget.preselectedId;
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _filter(String query) {
    setState(() {
      if (query.isEmpty) {
        _filtered = widget.students;
      } else {
        _filtered = widget.students.where((s) {
          final q = query.toLowerCase();
          return s.name.toLowerCase().contains(q) ||
              (s.studentCode?.toLowerCase().contains(q) ?? false);
        }).toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Container(
        width: double.maxFinite,
        constraints: const BoxConstraints(maxHeight: 500),
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Select Student', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _searchController,
              decoration: const InputDecoration(
                hintText: 'Search by name or student code...',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
                isDense: true,
              ),
              onChanged: _filter,
            ),
            const SizedBox(height: 12),
            Expanded(
              child: ListView.builder(
                itemCount: _filtered.length,
                itemBuilder: (context, index) {
                  final student = _filtered[index];
                  final isSelected = student.id == _selectedId;
                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor: isSelected
                          ? const Color(0xFF6366F1)
                          : const Color(0xFFE2E8F0),
                      child: Text(
                        student.name.isNotEmpty ? student.name[0].toUpperCase() : '?',
                        style: TextStyle(
                          color: isSelected ? Colors.white : const Color(0xFF64748B),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    title: Text(student.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: student.studentCode != null
                        ? Text(student.studentCode!, style: const TextStyle(color: Color(0xFF64748B)))
                        : null,
                    trailing: isSelected ? const Icon(Icons.check_circle, color: Color(0xFF6366F1)) : null,
                    onTap: () => Navigator.pop(context, student),
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () {
                    final student = _selectedId != null
                        ? widget.students.firstWhere((s) => s.id == _selectedId)
                        : null;
                    Navigator.pop(context, student);
                  },
                  child: const Text('Confirm'),
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

- [ ] **Step 2: Cap nhat StudentListPage de load students**

Doc `client/mobile/lib/presentation/pages/student_list_page.dart` hien tai, thay the body:

```dart
import 'package:smart_grading_mobile/domain/entities/user.entity.dart';
import 'package:smart_grading_mobile/presentation/pages/student_picker_dialog.dart';

class _StudentListBody extends StatefulWidget {
  final Exam exam;
  const _StudentListBody({required this.exam});

  @override
  State<_StudentListBody> createState() => _StudentListBodyState();
}

class _StudentListBodyState extends State<_StudentListBody> {
  List<ClassStudent> _students = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadStudents();
  }

  Future<void> _loadStudents() async {
    setState(() => _loading = true);
    try {
      // Lay students tu ClassService hoac ExamBloc
      // Dua theo cau truc cua ClassService hien tai
      final classService = getIt<ClassService>();
      final classIds = widget.exam.classIds;
      if (classIds.isNotEmpty) {
        final students = await classService.getStudentsForClass(classIds.first);
        setState(() {
          _students = students;
          _loading = false;
        });
      } else {
        setState(() => _loading = false);
      }
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _showStudentPicker() async {
    final student = await showDialog<ClassStudent>(
      context: context,
      builder: (_) => StudentPickerDialog(students: _students),
    );
    if (student != null && mounted) {
      _openScanner(studentId: student.id);
    }
  }

  void _openScanner({String? studentId}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => BlocProvider(
          create: (_) => OMRScannerBloc(),
          child: CameraScannerPage(
            examId: widget.exam.id,
            examName: widget.exam.title,
            studentId: studentId,  // pass student ID
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      children: [
        // Quick scan card
        Container(
          margin: const EdgeInsets.all(16),
          child: Material(
            color: const Color(0xFF6366F1),
            borderRadius: BorderRadius.circular(12),
            child: InkWell(
              onTap: () => _openScanner(), // Quick scan khong chon student
              borderRadius: BorderRadius.circular(12),
              child: const Padding(
                padding: EdgeInsets.all(20),
                child: Row(
                  children: [
                    Icon(Icons.camera_alt, color: Colors.white, size: 32),
                    SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Quick Scan', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                          SizedBox(height: 4),
                          Text('Scan without assigning a student', style: TextStyle(color: Colors.white70)),
                        ],
                      ),
                    ),
                    Icon(Icons.chevron_right, color: Colors.white70),
                  ],
                ),
              ),
            ),
          ),
        ),

        // Hoac chon student
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              const Text('OR SELECT A STUDENT', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 1)),
              const SizedBox(width: 8),
              const Expanded(child: Divider(color: Color(0xFFE2E8F0))),
            ],
          ),
        ),

        // Student list
        Expanded(
          child: _students.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.people_outline, size: 64, color: Color(0xFFCBD5E1)),
                      SizedBox(height: 16),
                      Text('No students in this class yet', style: TextStyle(color: Color(0xFF64748B))),
                    ],
                  ),
                )
              : ListView.builder(
                  itemCount: _students.length,
                  itemBuilder: (context, index) {
                    final student = _students[index];
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: const Color(0xFFE8F0FE),
                        child: Text(student.name.isNotEmpty ? student.name[0].toUpperCase() : '?',
                            style: const TextStyle(color: Color(0xFF1A73E8), fontWeight: FontWeight.bold)),
                      ),
                      title: Text(student.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: student.studentCode != null ? Text(student.studentCode!) : null,
                      trailing: const Icon(Icons.camera_alt_outlined, color: Color(0xFF6366F1)),
                      onTap: () => _openScanner(studentId: student.id),
                    );
                  },
                ),
        ),
      ],
    );
  }
}
```

- [ ] **Step 3: Cap nhat CameraScannerPage de nhan studentId**

```dart
class CameraScannerPage extends StatefulWidget {
  // ... existing params
  final String? studentId;  // ADD THIS

  const CameraScannerPage({
    super.key,
    this.template,
    this.evaluationConfig,
    this.examId,
    this.examName,
    this.studentId,  // ADD THIS
  });
}
```

- [ ] **Step 4: Truyen studentId vao OMRScannerSubmit**

Trong `_onSubmit` cua `OMRScannerBloc`, `PendingSubmission` da co `studentId` field:

```dart
await storage.addPendingSubmission(
  PendingSubmission(
    id: DateTime.now().millisecondsSinceEpoch.toString(),
    examId: examId ?? 'unknown',
    studentId: studentId,  // ADD - truyen tu CameraScannerPage
    imageBytes: current.imageBytes,
    answers: answers,
    score: current.gradingResult.score,
    maxScore: current.gradingResult.maxScore,
    timestamp: DateTime.now(),
  ),
);
```

- [ ] **Step 5: Verify**

Run: `flutter analyze lib/presentation/pages/`

- [ ] **Step 6: Commit**

```bash
git add client/mobile/lib/presentation/pages/student_picker_dialog.dart client/mobile/lib/presentation/pages/student_list_page.dart client/mobile/lib/presentation/pages/camera_scanner_page.dart client/mobile/lib/presentation/blocs/omr_scanner/omr_scanner_bloc.dart
git commit -m "feat(mobile): add student picker dialog and student list loading

- Create StudentPickerDialog with search and selection
- Load students from ClassService in StudentListPage
- Pass studentId through CameraScannerPage to OMRScannerSubmit
- Enable both quick scan and student-assigned scan"
```

---

#### Task C3: Background Sync on Startup

**Files:** `client/mobile/lib/main.dart`, `client/mobile/lib/presentation/pages/home_page.dart`

- [ ] **Step 1: Tao sync service method**

Them method vao `OMRSubmissionSyncService`:

```dart
/// Sync all pending submissions when connectivity is restored.
Future<int> syncPendingSubmissions() async {
  final storage = OMRLocalStorage(prefs: await SharedPreferences.getInstance());
  final pending = await storage.getPendingSubmissions();
  int synced = 0;

  for (final submission in pending) {
    if (submission.status == SyncStatus.failed && submission.retryCount >= 3) {
      continue; // Da qua 3 lan retry
    }
    await storage.updateSubmissionStatus(submission.id, SyncStatus.syncing);
    try {
      await submitScan(
        examId: submission.examId,
        imageBytes: submission.imageBytes,
        answers: submission.answers,
        score: submission.score,
        maxScore: submission.maxScore,
      );
      await storage.removePendingSubmission(submission.id);
      synced++;
    } catch (e) {
      await storage.updateSubmissionStatus(
        submission.id,
        SyncStatus.failed,
        retryCount: submission.retryCount + 1,
      );
    }
  }
  return synced;
}
```

- [ ] **Step 2: Goi sync trong HomePage initState**

```dart
@override
void initState() {
  super.initState();
  context.read<ExamBloc>().add(const ExamLoadRequested());
  context.read<ClassBloc>().add(const ClassFetchRequested());
  context.read<SubmissionBloc>().add(const SubmissionLoadRequested());
  _syncPendingSubmissions();
}

Future<void> _syncPendingSubmissions() async {
  try {
    final syncService = getIt<OMRSubmissionSyncService>();
    final synced = await syncService.syncPendingSubmissions();
    if (synced > 0 && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Da dong bo $synced bai cham offline')),
      );
    }
  } catch (_) {
    // Silence sync errors on startup
  }
}
```

- [ ] **Step 3: Verify**

Run: `flutter analyze lib/main.dart lib/presentation/pages/home_page.dart`

- [ ] **Step 4: Commit**

```bash
git add client/mobile/lib/main.dart client/mobile/lib/presentation/pages/home_page.dart client/mobile/lib/core/network/omr_submission_sync_service.dart
git commit -m "feat(mobile): add background sync on app startup

Sync all pending submissions when app starts and connectivity is available.
Shows toast notification when submissions are synced."
```

---

### P1 — HIGH PRIORITY

#### Task H1: API Refresh Token Interceptor

**File:** `client/mobile/lib/core/network/api_client.dart`

- [ ] **Step 1: Doc auth_storage_service.dart de hieu cach luu token**

Doc file de xac dinh method lay/luu refresh token.

- [ ] **Step 2: Them refresh interceptor**

```dart
import 'package:smart_grading_mobile/core/network/auth_storage_service.dart';

_dio.interceptors.add(
  InterceptorsWrapper(
    onError: (error, handler) async {
      if (error.response?.statusCode == 401) {
        // Thu refresh token
        try {
          final refreshToken = await AuthStorageService.getRefreshToken();
          if (refreshToken != null) {
            final response = await _dio.post(
              '/auth/refresh-tokens',
              data: {'refreshToken': refreshToken},
            );
            final newToken = response.data['accessToken'];
            await AuthStorageService.saveToken(newToken);
            _token = newToken;

            // Retry original request
            error.requestOptions.headers['Authorization'] = 'Bearer $newToken';
            final retryResponse = await _dio.fetch(error.requestOptions);
            return handler.resolve(retryResponse);
          }
        } catch (_) {
          // Refresh that bai -> logout
          await AuthStorageService.clearTokens();
        }
      }
      return handler.next(error);
    },
  ),
);
```

- [ ] **Step 3: Verify**

Run: `flutter analyze lib/core/network/api_client.dart`

- [ ] **Step 4: Commit**

```bash
git add client/mobile/lib/core/network/api_client.dart
git commit -m "feat(mobile): add refresh token interceptor in ApiClient

Auto-refresh JWT when 401 is received. Retries original request
with new token. Clears tokens on refresh failure."
```

---

#### Task H2: Profile View Hoan Chinh

**File:** `client/mobile/lib/presentation/pages/profile_view.dart`

- [ ] **Step 1: Doc file hien tai**

- [ ] **Step 2: Thay hardcoded values bang real data**

```dart
// Trong build():
final authState = context.watch<AuthBloc>().state;
if (authState is AuthAuthenticated) {
  final user = authState.user;
  // Thay cac gia tri hardcoded:
  // - user.name thay cho "Nguyen Van A"
  // - user.email thay cho "nguyenvana@email.com"
  // - user.role thay cho "Admin"
}
```

- [ ] **Step 3: Wire Update Profile button**

```dart
onTap: () {
  Navigator.pushNamed(context, '/update-profile'); // hoac show dialog
}
```

- [ ] **Step 4: Wire Change Password button**

```dart
onTap: () {
  Navigator.pushNamed(context, '/change-password');
}
```

- [ ] **Step 5: Verify + Commit**

---

#### Task H3: FAB + AppBar Actions

**File:** `client/mobile/lib/presentation/pages/home_page.dart`

- [ ] **Step 1: FAB actions**

```dart
floatingActionButton: (_selectedIndex == 0 || _selectedIndex == 1)
    ? FloatingActionButton(
        onPressed: () {
          if (_selectedIndex == 1) {
            Navigator.pushNamed(context, '/create-exam');
          } else {
            Navigator.pushNamed(context, '/create-exam');
          }
        },
        // ...
      )
    : null,
```

- [ ] **Step 2: AppBar actions**

Tim cac `onPressed: () {}` trong AppBar, thay bang navigation/callback thuc.

- [ ] **Step 3: Verify + Commit**

---

#### Task H4: Scan View — Upload Submissions + Review

**File:** `client/mobile/lib/presentation/pages/scan_view.dart`

- [ ] **Step 1: Upload button action**

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

Thay body cua `DashedBorderContainer`:

```dart
InkWell(
  onTap: _pickImagesForUpload,
  borderRadius: BorderRadius.circular(12),
  child: // existing child
)
```

- [ ] **Step 2: Review button action**

```dart
onTap: () {
  Navigator.pushNamed(context, '/submissions?status=review');
}
```

- [ ] **Step 3: Bar chart button**

```dart
onTap: () {
  Navigator.pushNamed(context, '/analytics');
}
```

- [ ] **Step 4: Verify + Commit**

---

### P2 — MEDIUM PRIORITY

#### Task M1: go_router Migration

Thay Navigator 1.0 (named routes) bang go_router declarative routing.

- [ ] **Step 1: Tao router.dart**

```dart
// lib/presentation/routes/app_router.dart
final appRouter = GoRouter(
  initialLocation: '/',
  redirect: (context, state) {
    // Auth guard
    final authState = context.read<AuthBloc>().state;
    final isLoggedIn = authState is AuthAuthenticated;
    final isAuthRoute = state.matchedLocation == '/login' ||
        state.matchedLocation == '/register';
    if (!isLoggedIn && !isAuthRoute) return '/login';
    if (isLoggedIn && isAuthRoute) return '/home';
    return null;
  },
  routes: [
    GoRoute(path: '/', builder: (_, __) => const SplashPage()),
    GoRoute(path: '/login', builder: (_, __) => const LoginPage()),
    GoRoute(path: '/home', builder: (_, __) => const HomePage()),
    // ...
  ],
);
```

- [ ] **Step 2: Update main.dart**

```dart
MaterialApp.router(
  routerConfig: appRouter,
  // ...
)
```

- [ ] **Step 3: Verify + Commit**

---

#### Task M2: Test Coverage

- [ ] **Task M2a: camera_bloc_test.dart**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/presentation/blocs/camera/camera_bloc.dart';

void main() {
  group('CameraBloc', () {
    late CameraBloc bloc;

    setUp(() {
      bloc = CameraBloc();
    });

    tearDown(() {
      bloc.close();
    });

    test('initial state is CameraInitializing', () {
      expect(bloc.state, isA<CameraInitializing>());
    });
  });
}
```

- [ ] **Task M2b: omr_scanner_bloc_test.dart**

Test cac event/state transitions chinh cua OMRScannerBloc.

---

## Section 3: Summary

| Task | Priority | Effort | Files |
|------|----------|--------|-------|
| C1: Gallery Image Picker | P0 | 30 phut | camera_scanner_page.dart |
| C2: Student List + Student Picker | P0 | 2-3h | 4 files |
| C3: Background Sync on Startup | P0 | 1h | main.dart, home_page.dart, sync service |
| H1: Refresh Token Interceptor | P1 | 2h | api_client.dart |
| H2: Profile View | P1 | 2h | profile_view.dart |
| H3: FAB + AppBar Actions | P1 | 1h | home_page.dart |
| H4: Upload + Review in ScanView | P1 | 2-3h | scan_view.dart |
| M1: go_router Migration | P2 | 3-4h | main.dart, router.dart |
| M2: Test Coverage | P2 | 3h | test files |

**Total: 9 tasks, khoang 17-20 gio lam viec.**
