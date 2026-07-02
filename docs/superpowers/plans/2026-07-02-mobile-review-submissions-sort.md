# Mobile Review Submissions Sort Implementation Plan

**Goal:** Sort all submissions in the mobile review submission screen from newest to oldest based on scan time.

**Architecture:** Sort client-side in the existing `ExamSubmissionsBloc` after load/refresh. No API changes, no UI changes.

**Tech Stack:** Flutter, Dart, flutter_bloc, mocktail, flutter_test

---

## File Structure

- Modify: `client/mobile/lib/presentation/blocs/exam_submissions/exam_submissions_bloc.dart`
- Modify: `client/mobile/test/presentation/blocs/exam_submissions/exam_submissions_bloc_test.dart`
- Reference spec: `docs/superpowers/specs/2026-07-02-mobile-review-submission-sort-design.md`

---

### Task 1: Add client-side sort helper

**Files:**
- Modify: `client/mobile/lib/presentation/blocs/exam_submissions/exam_submissions_bloc.dart`
- Test: `client/mobile/test/presentation/blocs/exam_submissions/exam_submissions_bloc_test.dart`

- [ ] **Step 1: Write failing test**

```dart
test('sorts submissions newest to oldest on load', () async {
  when(() => apiClient.get<Map<String, dynamic>>(
        any(),
        queryParameters: any(named: 'queryParameters'),
        parser: any(named: 'parser'),
      )).thenAnswer((invocation) async {
    final parser = invocation.namedArguments[#parser] as Function;
    return parser({
      'classes': [
        {
          'classId': 'c1',
          'className': 'Class 1',
          'submissions': [
            {
              '_id': 's1',
              'examId': 'e1',
              'studentId': 'st1',
              'status': 'GRADED',
              'classId': 'c1',
              'scanMetadata': {'scannedAt': '2026-07-02T08:00:00Z'},
              'createdAt': '2026-07-02T08:00:00Z',
            },
            {
              '_id': 's2',
              'examId': 'e1',
              'studentId': 'st2',
              'status': 'GRADED',
              'classId': 'c1',
              'scanMetadata': {'scannedAt': '2026-07-02T10:00:00Z'},
              'createdAt': '2026-07-02T10:00:00Z',
            },
            {
              '_id': 's3',
              'examId': 'e1',
              'studentId': 'st3',
              'status': 'GRADED',
              'classId': 'c1',
              'scanMetadata': {'scannedAt': '2026-07-02T09:00:00Z'},
              'createdAt': '2026-07-02T09:00:00Z',
            },
          ],
        },
      ],
      'total': 3,
    }) as Map<String, dynamic>;
  });

  final bloc = ExamSubmissionsBloc(service: service);
  bloc.add(const ExamSubmissionsLoadRequested(examId: 'e1'));
  await Future.delayed(const Duration(milliseconds: 200));

  final state = bloc.state as ExamSubmissionsLoaded;
  final ids = state.byClass['c1']!.submissions.map((s) => s.id).toList();

  expect(ids, equals(['s2', 's3', 's1']));

  await bloc.close();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test test/presentation/blocs/exam_submissions/exam_submissions_bloc_test.dart -v`
Expected: FAIL because sort has not been added yet.

- [ ] **Step 3: Implement minimal code**

```dart
Map<String, ClassSubmissionSummary> _sortByScannedAtDesc(
  Map<String, ClassSubmissionSummary> byClass,
) {
  final result = <String, ClassSubmissionSummary>{};

  for (final entry in byClass.entries) {
    final sorted = List<Submission>.from(entry.value.submissions);
    sorted.sort((a, b) {
      final aTime = a.scannedAt ?? a.createdAt;
      final bTime = b.scannedAt ?? b.createdAt;

      if (aTime == null && bTime == null) return 0;
      if (aTime == null) return 1;
      if (bTime == null) return -1;

      return bTime.compareTo(aTime);
    });

    result[entry.key] = ClassSubmissionSummary(
      classId: entry.value.classId,
      className: entry.value.className,
      classCode: entry.value.classCode,
      totalStudents: entry.value.totalStudents,
      totalSubmitted: entry.value.totalSubmitted,
      totalGraded: entry.value.totalGraded,
      submissions: sorted,
    );
  }

  return result;
}
```

Apply it in the bloc:

```dart
Future<void> _onLoad(
  ExamSubmissionsLoadRequested event,
  Emitter<ExamSubmissionsState> emit,
) async {
  emit(const ExamSubmissionsLoading());
  try {
    final byClass = await service.getExamSubmissionsByClass(event.examId);
    emit(ExamSubmissionsLoaded(
      byClass: _sortByScannedAtDesc(byClass),
      expandedClassIds: {
        for (final entry in byClass.entries)
          if (entry.value.submissions.isNotEmpty) entry.key,
      },
    ));
  } catch (e, st) {
    emit(ExamSubmissionsError(message: e.toString()));
  }
}

Future<void> _onRefresh(
  ExamSubmissionsRefreshRequested event,
  Emitter<ExamSubmissionsState> emit,
) async {
  emit(const ExamSubmissionsLoading());
  try {
    final byClass = await service.getExamSubmissionsByClass(event.examId);
    emit(ExamSubmissionsLoaded(
      byClass: _sortByScannedAtDesc(byClass),
      expandedClassIds: {
        for (final entry in byClass.entries)
          if (entry.value.submissions.isNotEmpty) entry.key,
      },
    ));
  } catch (e) {
    emit(ExamSubmissionsError(message: e.toString()));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `flutter test test/presentation/blocs/exam_submissions/exam_submissions_bloc_test.dart -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/presentation/blocs/exam_submissions/exam_submissions_bloc.dart \
      client/mobile/test/presentation/blocs/exam_submissions/exam_submissions_bloc_test.dart
git commit -m "feat(mobile): sort review submissions newest to oldest"
```

---

### Task 2: Add null-safety regression test

**Files:**
- Modify: `client/mobile/test/presentation/blocs/exam_submissions/exam_submissions_bloc_test.dart`

- [ ] **Step 1: Write failing test**

```dart
test('sorts submissions with null timestamps to the end', () async {
  when(() => apiClient.get<Map<String, dynamic>>(
        any(),
        queryParameters: any(named: 'queryParameters'),
        parser: any(named: 'parser'),
      )).thenAnswer((invocation) async {
    final parser = invocation.namedArguments[#parser] as Function;
    return parser({
      'classes': [
        {
          'classId': 'c1',
          'className': 'Class 1',
          'submissions': [
            {
              '_id': 's1',
              'examId': 'e1',
              'studentId': 'st1',
              'status': 'GRADED',
              'classId': 'c1',
              'createdAt': '2026-07-02T07:00:00Z',
            },
            {
              '_id': 's2',
              'examId': 'e1',
              'studentId': 'st2',
              'status': 'GRADED',
              'classId': 'c1',
              'scanMetadata': {'scannedAt': '2026-07-02T09:00:00Z'},
              'createdAt': '2026-07-02T09:00:00Z',
            },
          ],
        },
      ],
      'total': 2,
    }) as Map<String, dynamic>;
  });

  final bloc = ExamSubmissionsBloc(service: service);
  bloc.add(const ExamSubmissionsLoadRequested(examId: 'e1'));
  await Future.delayed(const Duration(milliseconds: 200));

  final state = bloc.state as ExamSubmissionsLoaded;
  final ids = state.byClass['c1']!.submissions.map((s) => s.id).toList();

  expect(ids.first, equals('s2'));
  expect(ids.last, equals('s1'));

  await bloc.close();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test test/presentation/blocs/exam_submissions/exam_submissions_bloc_test.dart -v`
Expected: FAIL

- [ ] **Step 3: Run full bloc test suite**

Run: `flutter test test/presentation/blocs/exam_submissions/exam_submissions_bloc_test.dart -v`
Expected: PASS after Step 1 implementation is already present.

- [ ] **Step 4: Commit**

```bash
git add client/mobile/test/presentation/blocs/exam_submissions/exam_submissions_bloc_test.dart
git commit -m "test(mobile): add submission sort regression coverage"
```

---

## Execution Handoff

Plan complete and saved. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
