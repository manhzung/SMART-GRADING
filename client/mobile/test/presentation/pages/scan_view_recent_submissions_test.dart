import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:smart_grading_mobile/presentation/blocs/submission/submission_bloc.dart';
import 'package:smart_grading_mobile/presentation/pages/scan_view.dart';

class MockSubmissionBloc extends Mock implements SubmissionBloc {}

// Helper: tạo Submission giả
Submission makeSubmission({
  String id = 's1',
  String status = 'graded',
  double? score,
  double maxScore = 10,
  String? studentName,
  String? studentCode,
  String? className,
  String? examTitle,
}) {
  return Submission(
    id: id,
    examId: 'e1',
    studentId: 'st1',
    status: status,
    score: score,
    maxScore: maxScore,
    studentName: studentName,
    studentCode: studentCode,
    className: className,
    examTitle: examTitle,
  );
}

void main() {
  group('_SubmissionRow', () {
    testWidgets('hien thi day du khi co score, studentCode, className', (tester) async {
      final sub = makeSubmission(
        studentName: 'Nguyen Van A',
        studentCode: 'SV001',
        className: 'Lop 10A',
        score: 8.5,
        maxScore: 10,
        status: 'graded',
      );

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: SubmissionRow(
            submission: sub,
            statusBgColor: const Color(0xFFE6F4EA),
            statusTextColor: const Color(0xFF137333),
            icon: Icons.check_circle_outline,
            iconColor: const Color(0xFF137333),
            iconBgColor: const Color(0xFFE6F4EA),
          ),
        ),
      ));

      expect(find.text('Nguyen Van A'), findsOneWidget);
      expect(find.text('SV001 • Lop 10A'), findsOneWidget);
      expect(find.text('8.5/10'), findsOneWidget);
      expect(find.text('COMPLETED'), findsOneWidget);
    });

    testWidgets('hien thi --/-- khi score null', (tester) async {
      final sub = makeSubmission(
        studentName: 'Tran Thi B',
        status: 'pending',
        score: null,
        maxScore: 10,
      );

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: SubmissionRow(
            submission: sub,
            statusBgColor: const Color(0xFFE8F0FE),
            statusTextColor: const Color(0xFF1A73E8),
            icon: Icons.sync,
            iconColor: const Color(0xFF1A73E8),
            iconBgColor: const Color(0xFFE8F0FE),
          ),
        ),
      ));

      expect(find.text('Tran Thi B'), findsOneWidget);
      expect(find.text('--/--'), findsOneWidget);
      expect(find.text('PROCESSING'), findsOneWidget);
    });

    testWidgets('an dong phu khi studentCode va className deu null', (tester) async {
      final sub = makeSubmission(
        studentName: 'Unknown Student',
        studentCode: null,
        className: null,
        score: 7.0,
        status: 'graded',
      );

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: SubmissionRow(
            submission: sub,
            statusBgColor: const Color(0xFFE6F4EA),
            statusTextColor: const Color(0xFF137333),
            icon: Icons.check_circle_outline,
            iconColor: const Color(0xFF137333),
            iconBgColor: const Color(0xFFE6F4EA),
          ),
        ),
      ));

      expect(find.text('Unknown Student'), findsOneWidget);
      // Khong co dong phu nao chua "SV" hoac "Lop"
      expect(find.textContaining('SV'), findsNothing);
      expect(find.textContaining('Lop'), findsNothing);
    });

    testWidgets('chi hien thi studentCode khi className null', (tester) async {
      final sub = makeSubmission(
        studentName: 'Student X',
        studentCode: 'SV999',
        className: null,
        score: 9.0,
        status: 'graded',
      );

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: SubmissionRow(
            submission: sub,
            statusBgColor: const Color(0xFFE6F4EA),
            statusTextColor: const Color(0xFF137333),
            icon: Icons.check_circle_outline,
            iconColor: const Color(0xFF137333),
            iconBgColor: const Color(0xFFE6F4EA),
          ),
        ),
      ));

      expect(find.text('SV999'), findsOneWidget);
    });

    testWidgets('chi hien thi className khi studentCode null', (tester) async {
      final sub = makeSubmission(
        studentName: 'Student Y',
        studentCode: null,
        className: 'Lop 11B',
        score: 6.5,
        status: 'graded',
      );

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: SubmissionRow(
            submission: sub,
            statusBgColor: const Color(0xFFE6F4EA),
            statusTextColor: const Color(0xFF137333),
            icon: Icons.check_circle_outline,
            iconColor: const Color(0xFF137333),
            iconBgColor: const Color(0xFFE6F4EA),
          ),
        ),
      ));

      expect(find.text('Lop 11B'), findsOneWidget);
    });
  });

  group('ScanView Recent Submissions', () {
    testWidgets('hien thi recent submissions khi SubmissionLoaded', (tester) async {
      final bloc = MockSubmissionBloc();

      final subs = [
        Submission(
          id: 's1', examId: 'e1', studentId: 'st1',
          studentName: 'Nguyen Van A', studentCode: 'SV001', className: 'Lop 10A',
          status: 'graded', score: 8.5, maxScore: 10,
        ),
        Submission(
          id: 's2', examId: 'e1', studentId: 'st2',
          studentName: 'Tran Thi B', studentCode: 'SV002', className: 'Lop 10B',
          status: 'pending',
        ),
      ];

      when(() => bloc.state).thenReturn(SubmissionLoaded(submissions: subs));
      when(() => bloc.stream).thenAnswer((_) => Stream<SubmissionState>.fromIterable([
        SubmissionLoaded(submissions: subs),
      ]));

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: BlocProvider<SubmissionBloc>.value(
              value: bloc,
              child: const ScanView(),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Nguyen Van A'), findsOneWidget);
      expect(find.text('SV001 \u2022 Lop 10A'), findsOneWidget);
      expect(find.text('8.5/10'), findsOneWidget);
      expect(find.text('Tran Thi B'), findsOneWidget);
      expect(find.text('--/--'), findsOneWidget);
    });

    testWidgets('hien thi error UI + nut Thu lai khi SubmissionError', (tester) async {
      final bloc = MockSubmissionBloc();

      when(() => bloc.state).thenReturn(const SubmissionError(message: 'Connection timeout'));
      when(() => bloc.stream).thenAnswer((_) => Stream<SubmissionState>.fromIterable([
        const SubmissionError(message: 'Connection timeout'),
      ]));

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: BlocProvider<SubmissionBloc>.value(
              value: bloc,
              child: const ScanView(),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Co noi dung loi
      expect(find.textContaining('Connection timeout'), findsOneWidget);
      // Nut "Thu lai" co trong error UI
      expect(find.widgetWithText(TextButton, 'Thu lai'), findsOneWidget);
    });
  });
}
