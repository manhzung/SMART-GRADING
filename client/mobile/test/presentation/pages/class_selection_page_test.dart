import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/entities/exam.entity.dart';
import 'package:smart_grading_mobile/presentation/pages/class_selection_page.dart';

Exam _makeExam({
  List<ExamClass> classIds = const [],
  ExamClass? primaryClassId,
}) {
  return Exam(
    id: 'exam-1',
    title: 'Math Test',
    classIds: classIds,
    primaryClassId: primaryClassId,
    status: 'published',
    createdAt: DateTime(2026, 1, 1),
  );
}

ExamClass _makeClass({
  required String id,
  required String name,
  required String code,
  int? studentCount,
}) {
  return ExamClass(
    id: id,
    name: name,
    code: code,
    studentCount: studentCount,
  );
}

void main() {
  testWidgets('renders class from classIds', (tester) async {
    final exam = _makeExam(
      classIds: [
        _makeClass(id: 'c1', name: 'Class A', code: 'A1', studentCount: 25),
      ],
    );

    await tester.pumpWidget(MaterialApp(home: ClassSelectionPage(exam: exam)));
    await tester.pumpAndSettle();

    expect(find.text('Class A'), findsOneWidget);
    expect(find.text('A1'), findsOneWidget);
  });

  testWidgets('renders class from primaryClassId when classIds empty', (tester) async {
    final primary = _makeClass(id: 'c1', name: 'Primary Class', code: 'P1', studentCount: 30);
    final exam = _makeExam(primaryClassId: primary);

    await tester.pumpWidget(MaterialApp(home: ClassSelectionPage(exam: exam)));
    await tester.pumpAndSettle();

    expect(find.text('Primary Class'), findsOneWidget);
    expect(find.text('P1'), findsOneWidget);
  });

  testWidgets('deduplicates classes by id', (tester) async {
    final dup = _makeClass(id: 'c1', name: 'Same', code: 'S1', studentCount: 20);
    final exam = _makeExam(classIds: [dup], primaryClassId: dup);

    await tester.pumpWidget(MaterialApp(home: ClassSelectionPage(exam: exam)));
    await tester.pumpAndSettle();

    expect(find.text('Same'), findsOneWidget);
  });

  testWidgets('shows empty state when no classes', (tester) async {
    final exam = _makeExam();

    await tester.pumpWidget(MaterialApp(home: ClassSelectionPage(exam: exam)));
    await tester.pumpAndSettle();

    expect(find.textContaining('No classes'), findsOneWidget);
  });

  testWidgets('tap class navigates to StudentListPage', (tester) async {
    final cls = _makeClass(id: 'c1', name: 'Class A', code: 'A1', studentCount: 25);
    final exam = _makeExam(classIds: [cls]);

    await tester.pumpWidget(MaterialApp(home: ClassSelectionPage(exam: exam)));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Class A'));
    await tester.pumpAndSettle();

    expect(find.byType(StudentListPage), findsOneWidget);
  });
}
