# Implementation Plan: Exam Submissions By Class

**Spec:** `docs/superpowers/specs/2026-06-28-exam-submissions-by-class-design.md`
**Date:** 2026-06-28
**Platform:** Flutter Mobile
**Approach:** TDD (RED → GREEN → REFACTOR)

---

## Overview

7 tasks, each 2-5 minutes. Following TDD strictly: write failing test → run → implement → run → commit.

---

## Task 1: Create `ClassSubmissionSummary` entity (RED → GREEN → REFACTOR)

**Files:**
- CREATE: `lib/domain/entities/class_submission_summary.entity.dart`
- CREATE: `test/domain/entities/class_submission_summary.entity_test.dart`

**Step 1: Write failing test**

```dart
// test/domain/entities/class_submission_summary.entity_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading/domain/entities/class_submission_summary.entity.dart';
import 'package:smart_grading/domain/entities/exam.entity.dart';

void main() {
  group('ClassSubmissionSummary', () {
    test('fromJson parses correctly', () {
      final json = {
        'classId': 'class-1',
        'className': 'Lớp 10A',
        'classCode': '10A',
        'totalStudents': 35,
        'totalSubmitted': 28,
        'totalGraded': 20,
        'submissions': <Map<String, dynamic>>[],
      };
      final summary = ClassSubmissionSummary.fromJson(json);
      expect(summary.classId, 'class-1');
      expect(summary.className, 'Lớp 10A');
      expect(summary.classCode, '10A');
      expect(summary.totalStudents, 35);
      expect(summary.totalSubmitted, 28);
      expect(summary.totalGraded, 20);
      expect(summary.submissions, isEmpty);
    });

    test('toJson serializes correctly', () {
      final summary = ClassSubmissionSummary(
        classId: 'class-1',
        className: 'Lớp 10A',
        classCode: '10A',
        totalStudents: 35,
        totalSubmitted: 28,
        totalGraded: 20,
        submissions: const [],
      );
      final json = summary.toJson();
      expect(json['classId'], 'class-1');
      expect(json['className'], 'Lớp 10A');
    });
  });
}
```

**Step 2: Run test → FAIL**

```bash
cd client/mobile && flutter test test/domain/entities/class_submission_summary.entity_test.dart
```

**Step 3: Write minimal code**

```dart
// lib/domain/entities/class_submission_summary.entity.dart
import 'exam.entity.dart';

class ClassSubmissionSummary {
  final String classId;
  final String className;
  final String classCode;
  final int totalStudents;
  final int totalSubmitted;
  final int totalGraded;
  final List<Submission> submissions;

  const ClassSubmissionSummary({
    required this.classId,
    required this.className,
    required this.classCode,
    this.totalStudents = 0,
    this.totalSubmitted = 0,
    this.totalGraded = 0,
    this.submissions = const [],
  });

  factory ClassSubmissionSummary.fromJson(Map<String, dynamic> json) {
    final submissionsRaw = json['submissions'] as List<dynamic>? ?? [];
    return ClassSubmissionSummary(
      classId: (json['classId'] ?? '').toString(),
      className: (json['className'] ?? '').toString(),
      classCode: (json['classCode'] ?? '').toString(),
      totalStudents: (json['totalStudents'] as num?)?.toInt() ?? 0,
      totalSubmitted: (json['totalSubmitted'] as num?)?.toInt() ?? 0,
      totalGraded: (json['totalGraded'] as num?)?.toInt() ?? 0,
      submissions: submissionsRaw
          .whereType<Map<String, dynamic>>()
          .map((e) => Submission.fromJson(e))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'classId': classId,
        'className': className,
        'classCode': classCode,
        'totalStudents': totalStudents,
        'totalSubmitted': totalSubmitted,
        'totalGraded': totalGraded,
        'submissions': submissions.map((s) => /* Submission has no toJson */ null).toList(),
      };

  /// Empty class (no submissions yet)
  bool get isEmpty => submissions.isEmpty;

  /// Submissions that have been graded
  List<Submission> get gradedSubmissions =>
      submissions.where((s) => s.status.toUpperCase() == 'GRADED').toList();

  /// Submissions pending grading (PENDING or SUBMITTED)
  List<Submission> get pendingSubmissions =>
      submissions.where((s) => s.status.toUpperCase() != 'GRADED').toList();
}
```

**Step 4: Run test → PASS**

**Step 5: Commit**

```bash
git add lib/domain/entities/class_submission_summary.entity.dart test/domain/entities/class_submission_summary.entity_test.dart
git commit -m "feat(mobile): add ClassSubmissionSummary entity"
```

---

## Task 2: Create `ExamSubmissionsService` (RED → GREEN → REFACTOR)

**Files:**
- CREATE: `lib/core/network/exam_submissions_service.dart`
- CREATE: `test/core/network/exam_submissions_service_test.dart`

**Step 1: Write failing test**

```dart
// test/core/network/exam_submissions_service_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:smart_grading/core/network/api_client.dart';
import 'package:smart_grading/core/network/exam_submissions_service.dart';
import 'package:smart_grading/domain/entities/exam.entity.dart';

class MockApiClient extends Mock implements ApiClient {}

void main() {
  late MockApiClient apiClient;
  late ExamSubmissionsService service;

  setUp(() {
    apiClient = MockApiClient();
    service = ExamSubmissionsService(apiClient: apiClient);
  });

  test('getExamSubmissionsByClass groups submissions by classId', () async {
    when(() => apiClient.get<PaginatedSubmissions>(
          any(),
          queryParameters: any(named: 'queryParameters'),
          parser: any(named: 'parser'),
        )).thenAnswer((invocation) async {
      final parser = invocation.namedArguments[#parser] as Function;
      final raw = {
        'results': [
          {'_id': 's1', 'examId': 'e1', 'studentId': 'st1', 'status': 'GRADED', 'classId': {'_id': 'c1', 'name': 'Lớp 10A'}},
          {'_id': 's2', 'examId': 'e1', 'studentId': 'st2', 'status': 'PENDING', 'classId': {'_id': 'c1', 'name': 'Lớp 10A'}},
          {'_id': 's3', 'examId': 'e1', 'studentId': 'st3', 'status': 'GRADED', 'classId': {'_id': 'c2', 'name': 'Lớp 10B'}},
        ],
        'page': 1,
        'limit': 50,
        'total': 3,
        'pages': 1,
      };
      return parser(raw) as PaginatedSubmissions;
    });

    final result = await service.getExamSubmissionsByClass('e1');

    expect(result.length, 2);
    expect(result['c1']?.submissions.length, 2);
    expect(result['c2']?.submissions.length, 1);
    expect(result['c1']?.className, 'Lớp 10A');
    expect(result['c2']?.className, 'Lớp 10B');
  });

  test('getExamSubmissionsByClass returns empty map when no submissions', () async {
    when(() => apiClient.get<PaginatedSubmissions>(
          any(),
          queryParameters: any(named: 'queryParameters'),
          parser: any(named: 'parser'),
        )).thenAnswer((invocation) async {
      final parser = invocation.namedArguments[#parser] as Function;
      return parser({'results': [], 'page': 1, 'limit': 50, 'total': 0, 'pages': 0}) as PaginatedSubmissions;
    });

    final result = await service.getExamSubmissionsByClass('e1');
    expect(result, isEmpty);
  });
}
```

**Step 2: Run test → FAIL**

**Step 3: Write minimal code**

```dart
// lib/core/network/exam_submissions_service.dart
import '../../domain/entities/class_submission_summary.entity.dart';
import '../../domain/entities/exam.entity.dart';
import '../constants/app_constants.dart';
import 'api_client.dart';
import 'submission_service.dart';

class ExamSubmissionsService {
  ExamSubmissionsService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// Fetch all submissions for an exam, grouped by classId.
  /// Fetches paginated data until all submissions are loaded.
  Future<Map<String, ClassSubmissionSummary>> getExamSubmissionsByClass(String examId) async {
    const int limit = 50;
    final Map<String, List<Submission>> grouped = {};
    final Map<String, _ClassMetadata> metadata = {};

    int currentPage = 1;
    int totalPages = 1;

    while (currentPage <= totalPages) {
      final result = await _apiClient.get<PaginatedSubmissions>(
        ApiConstants.submissions,
        queryParameters: {
          'examId': examId,
          'page': currentPage,
          'limit': limit,
        },
        parser: (data) => PaginatedSubmissions.fromJson(data as Map<String, dynamic>),
      );

      for (final submission in result.results) {
        final classInfo = _extractClassInfo(submission);
        grouped.putIfAbsent(classInfo.id, () => []).add(submission);
        metadata[classInfo.id] = classInfo;
      }

      totalPages = result.pages;
      currentPage++;
    }

    return grouped.map((classId, submissions) {
      final meta = metadata[classId]!;
      final gradedCount = submissions.where((s) => s.status.toUpperCase() == 'GRADED').length;
      return MapEntry(
        classId,
        ClassSubmissionSummary(
          classId: meta.id,
          className: meta.name,
          classCode: meta.code,
          totalStudents: submissions.length,
          totalSubmitted: submissions.length,
          totalGraded: gradedCount,
          submissions: submissions,
        ),
      );
    });
  }

  _ClassMetadata _extractClassInfo(Submission submission) {
    // Submission.className exists but not classId directly.
    // Use studentCode hash or fallback; in practice classId comes from backend.
    return _ClassMetadata(
      id: 'class-${submission.className ?? "unknown"}',
      name: submission.className ?? 'Chưa xác định',
      code: submission.className ?? '',
    );
  }
}

class _ClassMetadata {
  final String id;
  final String name;
  final String code;
  _ClassMetadata({required this.id, required this.name, required this.code});
}
```

**Note**: Look at `Submission.fromJson` - it parses `classId` as `className` only. We may need to enhance Submission entity to expose `classId` field. **If during test we see classId is missing**, add a `classId` field to `Submission` in Task 2a (extension task).

**Step 4: Run test → PASS**

**Step 5: Commit**

```bash
git add lib/core/network/exam_submissions_service.dart test/core/network/exam_submissions_service_test.dart
git commit -m "feat(mobile): add ExamSubmissionsService for grouping by class"
```

---

## Task 2a: Extend `Submission` entity to expose `classId`

**Files:**
- MODIFY: `lib/domain/entities/exam.entity.dart` (add `classId` field)
- MODIFY: `test/domain/entities/submission_entity_test.dart` (if exists, add test)

**Step 1: Add field**

In `lib/domain/entities/exam.entity.dart`:
1. Add `final String? classId;` to `Submission` class
2. Add to constructor
3. In `Submission.fromJson`, parse `classId` from `json['classId']` (handle both Map and String):
```dart
String? classId;
if (json['classId'] != null) {
  final classData = json['classId'];
  if (classData is Map<String, dynamic>) {
    classId = (classData['_id'] ?? classData['id'])?.toString();
  } else {
    classId = classData.toString();
  }
}
```

**Step 2: Update `ExamSubmissionsService._extractClassInfo`**

Use `submission.classId` directly instead of synthesizing from `className`.

**Step 3: Run all submission-related tests → PASS**

**Step 4: Commit**

```bash
git add lib/domain/entities/exam.entity.dart lib/core/network/exam_submissions_service.dart
git commit -m "feat(mobile): expose classId field on Submission entity"
```

---

## Task 3: Create `ExamSubmissionsBloc` (RED → GREEN → REFACTOR)

**Files:**
- CREATE: `lib/presentation/blocs/exam_submissions/exam_submissions_bloc.dart`
- CREATE: `lib/presentation/blocs/exam_submissions/exam_submissions_event.dart`
- CREATE: `lib/presentation/blocs/exam_submissions/exam_submissions_state.dart`
- CREATE: `test/presentation/blocs/exam_submissions/exam_submissions_bloc_test.dart`

**Step 1: Write failing test**

```dart
// test/presentation/blocs/exam_submissions/exam_submissions_bloc_test.dart
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:smart_grading/core/network/api_client.dart';
import 'package:smart_grading/core/network/exam_submissions_service.dart';
import 'package:smart_grading/domain/entities/exam.entity.dart';
import 'package:smart_grading/presentation/blocs/exam_submissions/exam_submissions_bloc.dart';

class MockApiClient extends Mock implements ApiClient {}

void main() {
  late MockApiClient apiClient;
  late ExamSubmissionsService service;

  setUp(() {
    apiClient = MockApiClient();
    service = ExamSubmissionsService(apiClient: apiClient);
  });

  blocTest<ExamSubmissionsBloc, ExamSubmissionsState>(
    'emits [Loading, Loaded] when ExamSubmissionsLoadRequested succeeds',
    setUp: () {
      when(() => apiClient.get<PaginatedSubmissions>(
            any(),
            queryParameters: any(named: 'queryParameters'),
            parser: any(named: 'parser'),
          )).thenAnswer((invocation) async {
        final parser = invocation.namedArguments[#parser] as Function;
        return parser({
          'results': [
            {'_id': 's1', 'examId': 'e1', 'studentId': 'st1', 'status': 'GRADED', 'classId': 'c1'},
          ],
          'page': 1, 'limit': 50, 'total': 1, 'pages': 1,
        }) as PaginatedSubmissions;
      });
    },
    build: () => ExamSubmissionsBloc(service: service),
    act: (bloc) => bloc.add(const ExamSubmissionsLoadRequested(examId: 'e1')),
    expect: () => [
      isA<ExamSubmissionsLoading>(),
      isA<ExamSubmissionsLoaded>(),
    ],
  );

  blocTest<ExamSubmissionsBloc, ExamSubmissionsState>(
    'emits [Loading, Error] when API throws',
    setUp: () {
      when(() => apiClient.get<PaginatedSubmissions>(
            any(),
            queryParameters: any(named: 'queryParameters'),
            parser: any(named: 'parser'),
          )).thenThrow(Exception('Network error'));
    },
    build: () => ExamSubmissionsBloc(service: service),
    act: (bloc) => bloc.add(const ExamSubmissionsLoadRequested(examId: 'e1')),
    expect: () => [
      isA<ExamSubmissionsLoading>(),
      isA<ExamSubmissionsError>(),
    ],
  );

  blocTest<ExamSubmissionsBloc, ExamSubmissionsState>(
    'toggles class expansion state',
    setUp: () {
      when(() => apiClient.get<PaginatedSubmissions>(
            any(),
            queryParameters: any(named: 'queryParameters'),
            parser: any(named: 'parser'),
          )).thenAnswer((invocation) async {
        final parser = invocation.namedArguments[#parser] as Function;
        return parser({
          'results': [
            {'_id': 's1', 'examId': 'e1', 'studentId': 'st1', 'status': 'GRADED', 'classId': 'c1'},
          ],
          'page': 1, 'limit': 50, 'total': 1, 'pages': 1,
        }) as PaginatedSubmissions;
      });
    },
    build: () => ExamSubmissionsBloc(service: service),
    act: (bloc) async {
      bloc.add(const ExamSubmissionsLoadRequested(examId: 'e1'));
      await Future.delayed(Duration(milliseconds: 100));
      bloc.add(const ExamSubmissionClassToggled(classId: 'c1'));
    },
    skip: 2, // skip initial Loading + Loaded
    verify: (bloc) {
      final state = bloc.state as ExamSubmissionsLoaded;
      expect(state.expandedClassIds.contains('c1'), isTrue);
    },
  );
}
```

**Step 2: Run test → FAIL**

**Step 3: Write minimal code**

```dart
// lib/presentation/blocs/exam_submissions/exam_submissions_event.dart
import 'package:equatable/equatable.dart';

abstract class ExamSubmissionsEvent extends Equatable {
  const ExamSubmissionsEvent();
  @override
  List<Object?> get props => [];
}

class ExamSubmissionsLoadRequested extends ExamSubmissionsEvent {
  final String examId;
  const ExamSubmissionsLoadRequested({required this.examId});
  @override
  List<Object?> get props => [examId];
}

class ExamSubmissionsRefreshRequested extends ExamSubmissionsEvent {
  final String examId;
  const ExamSubmissionsRefreshRequested({required this.examId});
  @override
  List<Object?> get props => [examId];
}

class ExamSubmissionsFilterChanged extends ExamSubmissionsEvent {
  final String filter;
  const ExamSubmissionsFilterChanged({required this.filter});
  @override
  List<Object?> get props => [filter];
}

class ExamSubmissionsSearchChanged extends ExamSubmissionsEvent {
  final String query;
  const ExamSubmissionsSearchChanged({required this.query});
  @override
  List<Object?> get props => [query];
}

class ExamSubmissionClassToggled extends ExamSubmissionsEvent {
  final String classId;
  const ExamSubmissionClassToggled({required this.classId});
  @override
  List<Object?> get props => [classId];
}
```

```dart
// lib/presentation/blocs/exam_submissions/exam_submissions_state.dart
import 'package:equatable/equatable.dart';
import '../../../domain/entities/class_submission_summary.entity.dart';

abstract class ExamSubmissionsState extends Equatable {
  const ExamSubmissionsState();
  @override
  List<Object?> get props => [];
}

class ExamSubmissionsInitial extends ExamSubmissionsState {
  const ExamSubmissionsInitial();
}

class ExamSubmissionsLoading extends ExamSubmissionsState {
  const ExamSubmissionsLoading();
}

class ExamSubmissionsLoaded extends ExamSubmissionsState {
  final Map<String, ClassSubmissionSummary> byClass;
  final String filter;
  final String searchQuery;
  final Set<String> expandedClassIds;

  const ExamSubmissionsLoaded({
    required this.byClass,
    this.filter = 'ALL',
    this.searchQuery = '',
    this.expandedClassIds = const {},
  });

  ExamSubmissionsLoaded copyWith({
    Map<String, ClassSubmissionSummary>? byClass,
    String? filter,
    String? searchQuery,
    Set<String>? expandedClassIds,
  }) {
    return ExamSubmissionsLoaded(
      byClass: byClass ?? this.byClass,
      filter: filter ?? this.filter,
      searchQuery: searchQuery ?? this.searchQuery,
      expandedClassIds: expandedClassIds ?? this.expandedClassIds,
    );
  }

  @override
  List<Object?> get props => [byClass, filter, searchQuery, expandedClassIds];
}

class ExamSubmissionsError extends ExamSubmissionsState {
  final String message;
  const ExamSubmissionsError({required this.message});
  @override
  List<Object?> get props => [message];
}
```

```dart
// lib/presentation/blocs/exam_submissions/exam_submissions_bloc.dart
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/exam_submissions_service.dart';
import '../../../domain/entities/class_submission_summary.entity.dart';
import 'exam_submissions_event.dart';
import 'exam_submissions_state.dart';

class ExamSubmissionsBloc extends Bloc<ExamSubmissionsEvent, ExamSubmissionsState> {
  final ExamSubmissionsService service;
  String? _currentExamId;

  ExamSubmissionsBloc({required this.service}) : super(const ExamSubmissionsInitial()) {
    on<ExamSubmissionsLoadRequested>(_onLoad);
    on<ExamSubmissionsRefreshRequested>(_onRefresh);
    on<ExamSubmissionsFilterChanged>(_onFilterChanged);
    on<ExamSubmissionsSearchChanged>(_onSearchChanged);
    on<ExamSubmissionClassToggled>(_onClassToggled);
  }

  Future<void> _onLoad(ExamSubmissionsLoadRequested event, Emitter<ExamSubmissionsState> emit) async {
    _currentExamId = event.examId;
    emit(const ExamSubmissionsLoading());
    try {
      final byClass = await service.getExamSubmissionsByClass(event.examId);
      final expandedIds = <String>{
        for (final entry in byClass.entries)
          if (entry.value.submissions.isNotEmpty) entry.key,
      };
      emit(ExamSubmissionsLoaded(byClass: byClass, expandedClassIds: expandedIds));
    } catch (e) {
      emit(ExamSubmissionsError(message: e.toString()));
    }
  }

  Future<void> _onRefresh(ExamSubmissionsRefreshRequested event, Emitter<ExamSubmissionsState> emit) async {
    if (_currentExamId == null) return;
    emit(ExamSubmissionsLoading());
    try {
      final byClass = await service.getExamSubmissionsByClass(event.examId);
      final expandedIds = <String>{
        for (final entry in byClass.entries)
          if (entry.value.submissions.isNotEmpty) entry.key,
      };
      emit(ExamSubmissionsLoaded(byClass: byClass, expandedClassIds: expandedIds));
    } catch (e) {
      emit(ExamSubmissionsError(message: e.toString()));
    }
  }

  void _onFilterChanged(ExamSubmissionsFilterChanged event, Emitter<ExamSubmissionsState> emit) {
    final s = state;
    if (s is ExamSubmissionsLoaded) {
      emit(s.copyWith(filter: event.filter));
    }
  }

  void _onSearchChanged(ExamSubmissionsSearchChanged event, Emitter<ExamSubmissionsState> emit) {
    final s = state;
    if (s is ExamSubmissionsLoaded) {
      emit(s.copyWith(searchQuery: event.query));
    }
  }

  void _onClassToggled(ExamSubmissionClassToggled event, Emitter<ExamSubmissionsState> emit) {
    final s = state;
    if (s is ExamSubmissionsLoaded) {
      final newSet = Set<String>.from(s.expandedClassIds);
      if (newSet.contains(event.classId)) {
        newSet.remove(event.classId);
      } else {
        newSet.add(event.classId);
      }
      emit(s.copyWith(expandedClassIds: newSet));
    }
  }
}
```

**Step 4: Run test → PASS**

**Step 5: Commit**

```bash
git add lib/presentation/blocs/exam_submissions/
git commit -m "feat(mobile): add ExamSubmissionsBloc with load/refresh/filter/toggle events"
```

---

## Task 4: Create `SubmissionSummaryWidget` for exam_detail_page

**Files:**
- CREATE: `lib/presentation/widgets/submission_summary_widget.dart`
- CREATE: `test/presentation/widgets/submission_summary_widget_test.dart`

**Step 1: Write failing widget test**

```dart
// test/presentation/widgets/submission_summary_widget_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading/domain/entities/class_submission_summary.entity.dart';
import 'package:smart_grading/presentation/widgets/submission_summary_widget.dart';

void main() {
  testWidgets('SubmissionSummaryWidget renders each class summary', (tester) async {
    final summaries = {
      'c1': ClassSubmissionSummary(
        classId: 'c1',
        className: 'Lớp 10A',
        classCode: '10A',
        totalStudents: 35,
        totalSubmitted: 28,
        totalGraded: 20,
      ),
      'c2': ClassSubmissionSummary(
        classId: 'c2',
        className: 'Lớp 10B',
        classCode: '10B',
        totalStudents: 30,
        totalSubmitted: 0,
        totalGraded: 0,
      ),
    };

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: SubmissionSummaryWidget(
          summaries: summaries,
          examId: 'e1',
        ),
      ),
    ));

    expect(find.text('SUBMISSIONS BY CLASS'), findsOneWidget);
    expect(find.text('Lớp 10A'), findsOneWidget);
    expect(find.text('Lớp 10B'), findsOneWidget);
    expect(find.text('28 / 35'), findsOneWidget);
  });
}
```

**Step 2: Run → FAIL**

**Step 3: Write minimal widget**

```dart
// lib/presentation/widgets/submission_summary_widget.dart
import 'package:flutter/material.dart';
import '../../domain/entities/class_submission_summary.entity.dart';
import '../pages/submissions_page.dart';

class SubmissionSummaryWidget extends StatelessWidget {
  final Map<String, ClassSubmissionSummary> summaries;
  final String examId;

  const SubmissionSummaryWidget({
    super.key,
    required this.summaries,
    required this.examId,
  });

  @override
  Widget build(BuildContext context) {
    final totalSubmitted = summaries.values.fold<int>(0, (sum, s) => sum + s.totalSubmitted);
    final totalGraded = summaries.values.fold<int>(0, (sum, s) => sum + s.totalGraded);
    final totalStudents = summaries.values.fold<int>(0, (sum, s) => sum + s.totalStudents);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'SUBMISSIONS BY CLASS',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: Color(0xFF64748B),
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _miniStat('$totalSubmitted/$totalStudents', 'Submitted'),
              _miniStat('$totalGraded/$totalSubmitted', 'Graded'),
              _miniStat('${summaries.length}', 'Classes'),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          ...summaries.values.map((s) => _classRow(context, s)),
        ],
      ),
    );
  }

  Widget _miniStat(String value, String label) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
        Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
      ],
    );
  }

  Widget _classRow(BuildContext context, ClassSubmissionSummary s) {
    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => SubmissionsPage(examId: examId, initialClassId: s.classId),
          ),
        );
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            const Icon(Icons.school_outlined, size: 18, color: Color(0xFF0C2B64)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(s.className, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
                  Text('${s.totalSubmitted}/${s.totalStudents} submitted • ${s.totalGraded} graded',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Color(0xFF94A3B8)),
          ],
        ),
      ),
    );
  }
}
```

**Step 4: Run → PASS**

**Step 5: Commit**

```bash
git add lib/presentation/widgets/submission_summary_widget.dart test/presentation/widgets/submission_summary_widget_test.dart
git commit -m "feat(mobile): add SubmissionSummaryWidget for exam detail page"
```

---

## Task 5: Replace GRADING PROGRESS card in `exam_detail_page.dart`

**Files:**
- MODIFY: `lib/presentation/pages/exam_detail_page.dart`

**Step 1: Run all existing tests to ensure baseline**

```bash
cd client/mobile && flutter test
```

**Step 2: Modify file**

Replace lines 233-302 (the GRADING PROGRESS card) with:

```dart
// Import at top of file
import '../../domain/entities/class_submission_summary.entity.dart';
import '../../core/network/exam_submissions_service.dart';
import '../../presentation/widgets/submission_summary_widget.dart';

// In initState, also create the service:
_examSubmissionsService = ExamSubmissionsService(apiClient: apiClient);

// Add field:
late ExamSubmissionsService _examSubmissionsService;
Map<String, ClassSubmissionSummary> _classSummaries = {};

// In _loadData Future.wait, also load submissions:
final futures = await Future.wait([
  _examService.getExamById(widget.exam.id),
  _submissionService.getExamStatistics(widget.exam.id),
  _examSubmissionsService.getExamSubmissionsByClass(widget.exam.id),
]);

_fullExam = futures[0] as Exam;
_statistics = futures[1] as ExamStatistics;
_classSummaries = futures[2] as Map<String, ClassSubmissionSummary>;

// In the build method, replace the GRADING PROGRESS card:
SubmissionSummaryWidget(
  summaries: _classSummaries,
  examId: displayExam.id,
),
```

**Step 3: Run all tests → PASS**

**Step 4: Commit**

```bash
git add lib/presentation/pages/exam_detail_page.dart
git commit -m "feat(mobile): replace GRADING PROGRESS card with class-based submissions widget"
```

---

## Task 6: Redesign `submissions_page.dart` with class grouping

**Files:**
- MODIFY: `lib/presentation/pages/submissions_page.dart`

**Step 1: Modify constructor to require `examId`**

```dart
class SubmissionsPage extends StatefulWidget {
  final String examId;
  final String? initialClassId;

  const SubmissionsPage({super.key, required this.examId, this.initialClassId});
  // ...
}
```

**Step 2: Convert to BLoC-based**

Replace the StatefulWidget internals to use `ExamSubmissionsBloc`:

```dart
class _SubmissionsPageState extends State<SubmissionsPage> {
  final TextEditingController _searchController = TextEditingController();
  late final ExamSubmissionsBloc _bloc;

  @override
  void initState() {
    super.initState();
    final apiClient = GetIt.instance<ApiClient>();
    final service = ExamSubmissionsService(apiClient: apiClient);
    _bloc = ExamSubmissionsBloc(service: service);
    _bloc.add(ExamSubmissionsLoadRequested(examId: widget.examId));
  }

  @override
  void dispose() {
    _searchController.dispose();
    _bloc.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _bloc,
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          title: const Text('Bài nộp theo lớp'),
          // ...
        ),
        body: BlocBuilder<ExamSubmissionsBloc, ExamSubmissionsState>(
          builder: (context, state) {
            if (state is ExamSubmissionsLoading) {
              return const Center(child: CircularProgressIndicator());
            }
            if (state is ExamSubmissionsError) {
              return _buildErrorState(state.message);
            }
            if (state is ExamSubmissionsLoaded) {
              return _buildLoadedContent(state);
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }

  Widget _buildLoadedContent(ExamSubmissionsLoaded state) {
    // Group submissions by class, render ExpansionTile list
    // ...
  }
}
```

**Step 3: Write widget test**

```dart
// test/presentation/pages/submissions_page_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:smart_grading/core/network/api_client.dart';
import 'package:smart_grading/core/network/exam_submissions_service.dart';
import 'package:smart_grading/domain/entities/exam.entity.dart';
import 'package:smart_grading/presentation/pages/submissions_page.dart';

class MockApiClient extends Mock implements ApiClient {}

void main() {
  testWidgets('SubmissionsPage groups submissions by class', (tester) async {
    final apiClient = MockApiClient();
    when(() => apiClient.get<PaginatedSubmissions>(
      any(),
      queryParameters: any(named: 'queryParameters'),
      parser: any(named: 'parser'),
    )).thenAnswer((invocation) async {
      final parser = invocation.namedArguments[#parser] as Function;
      return parser({
        'results': [
          {'_id': 's1', 'examId': 'e1', 'studentId': 'st1', 'status': 'GRADED', 'classId': 'c1', 'studentId': {'name': 'Nguyễn Văn A'}},
        ],
        'page': 1, 'limit': 50, 'total': 1, 'pages': 1,
      }) as PaginatedSubmissions;
    });

    await tester.pumpWidget(MaterialApp(
      home: SubmissionsPage(examId: 'e1'),
    ));

    await tester.pumpAndSettle();

    expect(find.text('Lớp 10A'), findsOneWidget);
  });
}
```

**Step 4: Run → PASS**

**Step 5: Commit**

```bash
git add lib/presentation/pages/submissions_page.dart test/presentation/pages/submissions_page_test.dart
git commit -m "feat(mobile): redesign SubmissionsPage with class-grouped expansion list"
```

---

## Task 7: Final verification

**Step 1: Run all tests**

```bash
cd client/mobile && flutter test
```

**Step 2: Run analyze**

```bash
cd client/mobile && flutter analyze
```

**Step 3: Build debug APK**

```bash
cd client/mobile && flutter build apk --debug
```

**Step 4: Manual smoke test on device**

- Open exam detail → see SUBMISSIONS BY CLASS card with class breakdown
- Tap a class → navigate to SubmissionsPage
- Verify ExpansionTile groups submissions by class
- Test search/filter
- Test pull-to-refresh

**Step 5: Commit any final tweaks**

```bash
git add -A
git commit -m "chore(mobile): final verification for submissions by class"
```

---

## Dependencies

Required packages (likely already in `pubspec.yaml`):
- `flutter_bloc` (for BLoC)
- `equatable` (for state equality)
- `mocktail` (for tests)
- `bloc_test` (for blocTest)

Verify with: `cat client/mobile/pubspec.yaml | grep -E "(flutter_bloc|equatable|mocktail|bloc_test)"`

If missing, add them.

---

## Risks & Rollback

| Risk | Mitigation |
|------|-----------|
| Backend doesn't return classId for submissions | Fall back to grouping by className |
| Existing callers of SubmissionsPage break | The signature changes; update all callers (only exam_detail_page uses it) |
| Performance with many classes | Lazy-load each class section; pagination per class |

If a task fails tests, do NOT proceed to the next task. Fix the failure first (debugging skill).
