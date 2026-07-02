import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/presentation/pages/banks_page.dart';

void main() {
  group('Banks routes', () {
    testWidgets(
      '/banks route navigates to BanksPage without errors',
      (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            initialRoute: '/banks',
            routes: {
              '/banks': (_) => const BanksPage(),
            },
          ),
        );
        await tester.pumpAndSettle();

        expect(find.byType(BanksPage), findsOneWidget);
      },
    );

    testWidgets(
      'quiz icon button navigates to /banks route',
      (tester) async {
        // Minimal stub that mimics the teacher Exams-tab app bar with quiz icon.
        // This avoids the full HomePage dependency chain (ActivityBloc, OMRScannerBloc, etc.)
        await tester.pumpWidget(
          MaterialApp(
            home: Builder(
              builder: (context) => Scaffold(
                appBar: AppBar(
                  title: const Text('Exams'),
                  actions: [
                    IconButton(
                      icon: const Icon(Icons.quiz_outlined),
                      onPressed: () => Navigator.pushNamed(context, '/banks'),
                    ),
                  ],
                ),
              ),
            ),
            routes: {
              '/banks': (_) => const BanksPage(),
            },
          ),
        );
        await tester.pumpAndSettle();

        // Tap the quiz icon.
        final quizIconFinder = find.widgetWithIcon(IconButton, Icons.quiz_outlined);
        expect(quizIconFinder, findsOneWidget);
        await tester.tap(quizIconFinder);
        await tester.pumpAndSettle();

        // Verify we landed on BanksPage.
        expect(find.byType(BanksPage), findsOneWidget);
      },
    );
  });
}
