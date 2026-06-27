import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/entities/class_submission_summary.entity.dart';
import 'package:smart_grading_mobile/presentation/widgets/submission_summary_widget.dart';

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
    expect(find.text('28/35 submitted • 20 graded'), findsOneWidget);
  });

  testWidgets('SubmissionSummaryWidget shows empty state when no classes', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: SubmissionSummaryWidget(
          summaries: const {},
          examId: 'e1',
        ),
      ),
    ));

    expect(find.text('SUBMISSIONS BY CLASS'), findsOneWidget);
    expect(find.textContaining('Chưa có lớp'), findsOneWidget);
  });
}
