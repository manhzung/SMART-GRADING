import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/entities/exam.entity.dart';
import 'package:smart_grading_mobile/presentation/pages/student_list_page.dart';

void main() {
  testWidgets('StudentListPage accepts classId and className', (tester) async {
    final exam = Exam(
      id: 'exam-1',
      title: 'Math Test',
      primaryClassId: ExamClass(id: 'class-1', name: 'Class A', code: 'A1'),
      classIds: [ExamClass(id: 'class-1', name: 'Class A', code: 'A1')],
      status: 'published',
      createdAt: DateTime(2026, 1, 1),
    );

    await tester.pumpWidget(MaterialApp(
      home: StudentListPage(
        exam: exam,
        classId: 'class-1',
        className: 'Class A',
      ),
    ));
    await tester.pumpAndSettle();

    // Title should show "Class A • Math Test"
    expect(find.textContaining('Class A'), findsOneWidget);
    expect(find.textContaining('Math Test'), findsOneWidget);
  });
}
