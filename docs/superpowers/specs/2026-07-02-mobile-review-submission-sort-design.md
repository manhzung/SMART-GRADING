# Mobile Review Submissions Sort

## Goal
Sort all submissions in the mobile review submission screen from newest to oldest based on scan/submission time.

## Approved Sort Behavior
- Scope: all submissions displayed in `SubmissionsPage` review flow.
- Primary sort key: `scannedAt`.
- Secondary/fallback sort key: `createdAt`.
- Order: newest -> oldest.
- Null-safe: missing timestamps should sort to the end.
- No API contract change.

## Design

### 1. Client-Side Sort in `ExamSubmissionsBloc`
- File: `client/mobile/lib/presentation/blocs/exam_submissions/exam_submissions_bloc.dart`
- Add a sort helper that clones each `ClassSubmissionSummary.submissions` into a sorted list.
- Apply the helper after loading and refreshing in:
  - `_onLoad`
  - `_onRefresh`
- Keep existing search/filter behavior unchanged.

### 2. Sort Comparator
```dart
(a, b) {
  final aTime = a.scannedAt ?? a.createdAt;
  final bTime = b.scannedAt ?? b.createdAt;

  if (aTime == null && bTime == null) return 0;
  if (aTime == null) return 1;
  if (bTime == null) return -1;

  return bTime.compareTo(aTime);
}
```

### 3. UI Impact
- `SubmissionsPage` already renders `ClassSubmissionSummary.submissions` directly.
- Sorting in the BLoC is sufficient; no UI changes required.

## Tests
- File: `client/mobile/test/presentation/blocs/exam_submissions/exam_submissions_bloc_test.dart`
- Add cases for:
  - submissions sorted newest -> oldest
  - stable fallback when `scannedAt` is null
  - preserved behavior through load and refresh
