import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get_it/get_it.dart';
import 'package:smart_grading_mobile/core/network/api_client.dart';
import 'package:smart_grading_mobile/core/network/bank_service.dart';
import 'package:smart_grading_mobile/core/network/question_service.dart';
import 'package:smart_grading_mobile/domain/entities/question_bank.entity.dart';
import 'package:smart_grading_mobile/domain/entities/bank_membership.entity.dart';
import 'package:smart_grading_mobile/domain/entities/question.entity.dart';
import 'package:smart_grading_mobile/presentation/pages/bank_detail_page.dart';
import '../../core/network/mock_api_client.dart';

void main() {
  late MockApiClient mockApiClient;

  setUp(() {
    mockApiClient = MockApiClient();
    GetIt.instance.registerSingleton<ApiClient>(mockApiClient);
    GetIt.instance.registerSingleton<BankService>(BankService(apiClient: mockApiClient));
    GetIt.instance.registerSingleton<QuestionService>(QuestionService(apiClient: mockApiClient));
  });

  tearDown(() {
    GetIt.instance.reset();
  });

  QuestionBank makeBank({
    String id = 'bank-1',
    String name = 'Math Bank',
    String type = 'personal',
    String? description,
  }) {
    return QuestionBank(
      id: id,
      name: name,
      description: description ?? 'A test bank',
      type: type,
      schoolId: null,
      isActive: true,
      createdAt: DateTime(2026, 1, 1),
      updatedAt: DateTime(2026, 1, 1),
    );
  }

  QuestionModel makeQuestion({
    String id = 'q-1',
    String content = 'What is 2 + 2?',
    String difficulty = 'easy',
  }) {
    return QuestionModel(
      id: id,
      content: content,
      type: 'single_choice',
      options: [
        QuestionOption(id: 'a', text: '3', isCorrect: false),
        QuestionOption(id: 'b', text: '4', isCorrect: true),
        QuestionOption(id: 'c', text: '5', isCorrect: false),
      ],
      correctAnswer: 'b',
      difficulty: difficulty,
      tags: ['math', 'basic'],
      usageCount: 0,
      isApproved: true,
      createdAt: DateTime(2026, 1, 1),
    );
  }

  group('BankDetailPage widget tests', () {
    testWidgets('shows loading state initially', (tester) async {
      mockApiClient.mockResponse = {
        'bank': {
          '_id': 'bank-1',
          'name': 'Math Bank',
          'description': 'A test bank',
          'type': 'personal',
          'isActive': true,
          'createdAt': '2026-01-01T00:00:00.000Z',
          'updatedAt': '2026-01-01T00:00:00.000Z',
        },
        'membership': null,
      };

      await tester.pumpWidget(
        MaterialApp(
          home: const BankDetailPage(),
        ),
      );

      // Should show loading indicator initially
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('displays bank info when loaded', (tester) async {
      mockApiClient.mockResponse = {
        'bank': {
          '_id': 'bank-1',
          'name': 'Math Bank',
          'description': 'Math questions for students',
          'type': 'personal',
          'isActive': true,
          'createdAt': '2026-01-01T00:00:00.000Z',
          'updatedAt': '2026-01-01T00:00:00.000Z',
        },
        'membership': null,
      };

      await tester.pumpWidget(
        MaterialApp(
          home: const BankDetailPage(),
        ),
      );

      // Wait for bank to load
      await tester.pumpAndSettle();

      // Should display bank name
      expect(find.text('Math Bank'), findsOneWidget);
      // Should display description
      expect(find.text('Math questions for students'), findsOneWidget);
    });

    testWidgets('shows error state when bank load fails', (tester) async {
      mockApiClient.shouldThrow = true;
      mockApiClient.errorType = 'network';

      await tester.pumpWidget(
        MaterialApp(
          home: const BankDetailPage(),
        ),
      );

      // Wait for error to appear
      await tester.pumpAndSettle();

      // Should show error message
      expect(find.text('Unable to load bank'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('can retry loading on error', (tester) async {
      mockApiClient.shouldThrow = true;
      mockApiClient.errorType = 'network';

      await tester.pumpWidget(
        MaterialApp(
          home: const BankDetailPage(),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('Unable to load bank'), findsOneWidget);

      // Now set up success response
      mockApiClient.shouldThrow = false;
      mockApiClient.mockResponse = {
        'bank': {
          '_id': 'bank-1',
          'name': 'Math Bank',
          'description': 'Math questions',
          'type': 'personal',
          'isActive': true,
          'createdAt': '2026-01-01T00:00:00.000Z',
          'updatedAt': '2026-01-01T00:00:00.000Z',
        },
        'membership': null,
      };

      // Tap retry
      await tester.tap(find.text('Retry'));
      await tester.pumpAndSettle();

      // Should show bank
      expect(find.text('Math Bank'), findsOneWidget);
    });

    testWidgets('displays questions list', (tester) async {
      // Bank response
      mockApiClient.mockResponse = {
        'bank': {
          '_id': 'bank-1',
          'name': 'Math Bank',
          'description': 'Math questions',
          'type': 'personal',
          'isActive': true,
          'createdAt': '2026-01-01T00:00:00.000Z',
          'updatedAt': '2026-01-01T00:00:00.000Z',
        },
        'membership': null,
      };

      await tester.pumpWidget(
        MaterialApp(
          home: const BankDetailPage(),
        ),
      );

      await tester.pumpAndSettle();

      // Should show questions section header
      expect(find.text('Questions'), findsOneWidget);

      // Should show filter chips
      expect(find.text('All'), findsOneWidget);
      expect(find.text('Easy'), findsOneWidget);
      expect(find.text('Medium'), findsOneWidget);
      expect(find.text('Hard'), findsOneWidget);
    });

    testWidgets('has back button in AppBar', (tester) async {
      mockApiClient.mockResponse = {
        'bank': {
          '_id': 'bank-1',
          'name': 'Math Bank',
          'description': 'Math questions',
          'type': 'personal',
          'isActive': true,
          'createdAt': '2026-01-01T00:00:00.000Z',
          'updatedAt': '2026-01-01T00:00:00.000Z',
        },
        'membership': null,
      };

      await tester.pumpWidget(
        MaterialApp(
          home: const BankDetailPage(),
        ),
      );

      await tester.pumpAndSettle();

      // Should find back arrow button
      expect(find.byIcon(Icons.arrow_back), findsOneWidget);
    });

    testWidgets('displays bank type badge', (tester) async {
      mockApiClient.mockResponse = {
        'bank': {
          '_id': 'bank-1',
          'name': 'School Bank',
          'description': 'School shared bank',
          'type': 'school',
          'isActive': true,
          'createdAt': '2026-01-01T00:00:00.000Z',
          'updatedAt': '2026-01-01T00:00:00.000Z',
        },
        'membership': null,
      };

      await tester.pumpWidget(
        MaterialApp(
          home: const BankDetailPage(),
        ),
      );

      await tester.pumpAndSettle();

      // Should display bank type
      expect(find.text('school'), findsOneWidget);
    });
  });
}
