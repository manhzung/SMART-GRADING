import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/presentation/pages/dashboard_view.dart';

void main() {
  group('UpcomingExamCard widget', () {
    testWidgets('renders title, subtitle, and status', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: UpcomingExamCard(
              title: 'Math Test - Chapter 3',
              subtitle: '10A1 • Jun 20',
              status: 'PUBLISHED',
              statusBgColor: Color(0xFF0C2B64),
              statusTextColor: Colors.white,
            ),
          ),
        ),
      );

      expect(find.text('Math Test - Chapter 3'), findsOneWidget);
      expect(find.text('10A1 • Jun 20'), findsOneWidget);
      expect(find.text('PUBLISHED'), findsOneWidget);
    });

    testWidgets('renders different status labels correctly', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                UpcomingExamCard(
                  title: 'Draft Exam',
                  subtitle: '10A1 • Jun 20',
                  status: 'DRAFT',
                  statusBgColor: Color(0xFFE2E5FA),
                  statusTextColor: Color(0xFF6366F1),
                ),
                UpcomingExamCard(
                  title: 'In Progress Exam',
                  subtitle: '10A1 • Jun 20',
                  status: 'IN_PROGRESS',
                  statusBgColor: Color(0xFFFDECE2),
                  statusTextColor: Color(0xFFD47C56),
                ),
              ],
            ),
          ),
        ),
      );

      expect(find.text('DRAFT'), findsOneWidget);
      expect(find.text('IN_PROGRESS'), findsOneWidget);
    });
  });
}
