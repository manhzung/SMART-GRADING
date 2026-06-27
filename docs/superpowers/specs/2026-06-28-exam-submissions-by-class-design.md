# Exam Submissions By Class - Mobile Design

**Date:** 2026-06-28
**Platform:** Flutter (Mobile)
**Status:** Approved by user
**Author:** Brainstorming session

---

## 1. Problem

Currently in mobile app, when teacher opens `exam_detail_page.dart`:
- Only `primaryClassName` is displayed (1 class only) even though `Exam.classIds` can contain multiple classes
- Tapping "SUBMISSIONS" button opens `submissions_page.dart`
- But `submissions_page.dart` calls `getSubmissions(page: 1, limit: 50)` WITHOUT passing `examId`
- Result: it loads ALL submissions of the teacher across all exams, not filtered by current exam
- Teacher cannot view submissions broken down by class for a multi-class exam

## 2. Goal

Replace the "GRADING PROGRESS" card on `exam_detail_page.dart` with a new widget that:
1. Shows submission count per class (for exams with multiple classes)
2. Allows tapping to navigate to a redesigned `submissions_page.dart` that groups submissions by class
3. Each class is an expandable section with its own submission list

## 3. Design Decisions

- **Write all logic from scratch** (per user request: "tôi muốn viết tất cả bằng logic mới hết")
- **Group by class via ExpansionTile** in submissions page (per user choice q2_a)
- **Default expansion state**: classes with submissions expanded, empty classes collapsed (per user choice q3_a)
- **Must pass `examId` to SubmissionsPage** (current bug: no filter)

## 4. Architecture

### 4.1 New Entity: `ClassSubmissionSummary`

Location: `lib/domain/entities/class_submission_summary.entity.dart`

```dart
class ClassSubmissionSummary {
  final String classId;
  final String className;
  final String classCode;
  final int totalStudents;
  final int totalSubmitted;
  final int totalGraded;
  final List<Submission> submissions;

  // Constructor + fromJson factory
}
```

### 4.2 New Service: `ExamSubmissionsService`

Location: `lib/core/network/exam_submissions_service.dart`

Responsibilities:
- Fetch all submissions for an exam via `getSubmissions(examId: ...)`
- Group submissions by `classId` field
- Build `Map<String, ClassSubmissionSummary>` keyed by classId
- Handle pagination (load more submissions as needed)

```dart
class ExamSubmissionsService {
  Future<Map<String, ClassSubmissionSummary>> getExamSubmissionsByClass(String examId);
}
```

### 4.3 New BLoC: `ExamSubmissionsBloc`

Location: `lib/presentation/blocs/exam_submissions/`

**Events** (`exam_submissions_event.dart`):
- `ExamSubmissionsLoadRequested(examId)`
- `ExamSubmissionsRefreshRequested()`
- `ExamSubmissionsFilterChanged(filter)` // ALL | GRADED | PENDING | SUBMITTED | NOT_SUBMITTED
- `ExamSubmissionsSearchChanged(query)`
- `ExamSubmissionClassToggled(classId)` // expand/collapse

**States** (`exam_submissions_state.dart`):
- `ExamSubmissionsInitial`
- `ExamSubmissionsLoading`
- `ExamSubmissionsLoaded({
    required Map<String, ClassSubmissionSummary> byClass,
    required String filter,
    required String searchQuery,
    required Set<String> expandedClassIds,
  })`
- `ExamSubmissionsError(message)`

### 4.4 UI Changes

#### `exam_detail_page.dart` - Replace GRADING PROGRESS card

Remove: Current "GRADING PROGRESS" card (lines ~233-302)

Add: `SubmissionSummaryWidget` that:
- Shows total submission count across all classes
- Lists each class with: class name, students count, submitted count, graded count
- Each class row is clickable → navigate to `SubmissionsPage(examId: ..., initialClassId: ...)`

#### `submissions_page.dart` - Full redesign

Layout:
```
AppBar: "Danh sách bài nộp - {examTitle}" + filter clear button
Body:
  - Stats row: Tổng SV | Đã nộp | Đã chấm
  - Search TextField
  - Filter chips: Tất cả | Đã chấm | Đang chờ | Chưa nộp
  - ListView of ClassSection (ExpansionTile)
    - Header: className, totalStudents, submitted/graded counts
    - Body: List of submission cards
    - Empty state if no submissions
```

## 5. Data Flow

```
exam_detail_page.dart (tap submission widget)
    ↓ Navigator.push
submissions_page.dart
    ↓ initState → bloc.add(ExamSubmissionsLoadRequested(examId))
ExamSubmissionsBloc
    ↓ call service
ExamSubmissionsService.getExamSubmissionsByClass(examId)
    ↓ API: GET /submissions?examId={examId}
Backend → returns PaginatedSubmissions
    ↓ group by classId, build summaries
Return Map<String, ClassSubmissionSummary>
    ↓ emit loaded state
UI renders ExpansionTile list
```

## 6. Filter & Search Logic

Filters apply across ALL classes (not per-class):
- **ALL**: show all submissions in all classes
- **GRADED**: show only submissions with status=GRADED
- **PENDING**: show only submissions with status=PENDING
- **SUBMITTED**: show only submissions with status=SUBMITTED
- **NOT_SUBMITTED**: show students from class who haven't submitted (synthesized from class roster - requires fetching class students)

Search: match against `studentName` or `studentCode` (case-insensitive)

## 7. UI/UX Details

### Color scheme (consistent with existing design)
- Background: `Color(0xFFF8FAFC)`
- Card bg: `Colors.white`
- Border: `Color(0xFFE2E8F0)`
- Primary: `Color(0xFF0C2B64)` / `Color(0xFF081C43)`
- Text dark: `Color(0xFF0F172A)`
- Text muted: `Color(0xFF64748B)`
- Status colors: graded=green, pending=yellow, submitted=blue

### Interaction
- Tap class header → expand/collapse (animated)
- Tap submission card → navigate to `submission_detail_page.dart`
- Pull to refresh → reload all data
- Search input → debounced (300ms) → filter results

### Empty States
- **No classes** in exam: "Exam chưa có lớp nào"
- **Class with no submissions**: "Chưa có bài nộp" (still show class header)
- **All classes empty**: Empty illustration + "Chưa có bài nộp nào"

## 8. File List

### New Files
1. `lib/domain/entities/class_submission_summary.entity.dart`
2. `lib/core/network/exam_submissions_service.dart`
3. `lib/presentation/blocs/exam_submissions/exam_submissions_bloc.dart`
4. `lib/presentation/blocs/exam_submissions/exam_submissions_event.dart`
5. `lib/presentation/blocs/exam_submissions/exam_submissions_state.dart`
6. `lib/presentation/widgets/submission_summary_widget.dart`
7. `lib/presentation/widgets/class_expansion_tile.dart`
8. Test files for each

### Modified Files
1. `lib/presentation/pages/exam_detail_page.dart` - Replace GRADING PROGRESS card
2. `lib/presentation/pages/submissions_page.dart` - Full rewrite with class grouping

### Unchanged
- Backend API (uses existing `/submissions?examId=...` endpoint)
- `submission_detail_page.dart`
- Other entities and services

## 9. Testing Strategy (TDD)

Following the project workflow (RED → GREEN → REFACTOR):

### Unit Tests
1. `ClassSubmissionSummary.fromJson()` - parse JSON correctly
2. `ExamSubmissionsService.getExamSubmissionsByClass()` - groups by classId
3. `ExamSubmissionsBloc`:
   - Initial → Loading → Loaded on success
   - Loading → Error on API failure
   - Filter change triggers state update
   - Search change triggers state update
   - Toggle expand updates `expandedClassIds`

### Widget Tests
1. `SubmissionSummaryWidget` renders correct counts per class
2. `ClassExpansionTile` expands/collapses on tap
3. Empty state UI displays correctly

### Integration Tests
1. Tap widget on exam detail → navigates to submissions page
2. Submissions page loads correct data for given examId
3. Search filters across all classes
4. Pull-to-refresh reloads data

## 10. Success Criteria

- [ ] `exam_detail_page.dart` no longer shows "GRADING PROGRESS" card
- [ ] New widget displays submission count per class
- [ ] Tapping widget navigates to `submissions_page.dart` with correct `examId`
- [ ] `submissions_page.dart` groups submissions by class using ExpansionTile
- [ ] Classes with submissions default to expanded; empty classes default to collapsed
- [ ] Search and filter work across all classes
- [ ] All existing tests still pass
- [ ] New unit/widget tests added with >80% coverage for new code
- [ ] No regression in existing functionality

## 11. Out of Scope (YAGNI)

- NOT_SUBMITTED filter requiring class roster fetch (can be added later)
- Real-time updates via WebSocket
- Bulk grading actions
- Export functionality
- Comparison between class performance

## 12. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| API doesn't support filtering by classId for empty submissions | Synthesize "Chưa nộp" from class.studentIds minus submission.studentIds (if class.studentCount available) |
| Large exam with many classes → performance | Lazy-load per class section; pagination within each class |
| Filter "Chưa nộp" requires class student list | Defer this filter to v2; ship with ALL/GRADED/PENDING/SUBMITTED first |

## 13. Open Questions

None - all clarified during brainstorming session.