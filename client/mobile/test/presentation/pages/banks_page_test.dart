import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get_it/get_it.dart';
import 'package:smart_grading_mobile/core/network/api_client.dart';
import 'package:smart_grading_mobile/core/network/bank_service.dart';
import 'package:smart_grading_mobile/domain/entities/question_bank.entity.dart';
import 'package:smart_grading_mobile/presentation/pages/banks_page.dart';
import '../../core/network/mock_api_client.dart';

void main() {
  late MockApiClient mockApiClient;

  setUp(() {
    mockApiClient = MockApiClient();
    GetIt.instance.registerSingleton<ApiClient>(mockApiClient);
    GetIt.instance.registerSingleton<BankService>(BankService(apiClient: mockApiClient));
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

  group('BanksPage widget tests', () {
    testWidgets('shows loading state initially', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: BanksPage(),
        ),
      );

      // Should show loading indicator initially
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows empty state when no banks returned', (tester) async {
      mockApiClient.mockResponse = [];

      await tester.pumpWidget(
        MaterialApp(
          home: const BanksPage(),
        ),
      );

      // Wait for async load
      await tester.pumpAndSettle();

      // Should show empty state message
      expect(find.textContaining('No banks'), findsOneWidget);
      expect(find.text('Question Banks'), findsOneWidget);
    });

    testWidgets('displays banks when loaded', (tester) async {
      mockApiClient.mockResponse = [
        {
          '_id': 'bank-1',
          'name': 'Math Bank',
          'description': 'Math questions',
          'type': 'personal',
          'isActive': true,
          'createdAt': '2026-01-01T00:00:00.000Z',
          'updatedAt': '2026-01-01T00:00:00.000Z',
        },
        {
          '_id': 'bank-2',
          'name': 'Science Bank',
          'description': 'Science questions',
          'type': 'school',
          'schoolId': 'school-1',
          'isActive': true,
          'createdAt': '2026-01-01T00:00:00.000Z',
          'updatedAt': '2026-01-01T00:00:00.000Z',
        },
      ];

      await tester.pumpWidget(
        MaterialApp(
          home: const BanksPage(),
        ),
      );

      await tester.pumpAndSettle();

      // Should display bank names
      expect(find.text('Math Bank'), findsOneWidget);
      expect(find.text('Science Bank'), findsOneWidget);
    });

    testWidgets('has "New Bank" button to create bank', (tester) async {
      mockApiClient.mockResponse = [];

      await tester.pumpWidget(
        MaterialApp(
          home: const BanksPage(),
        ),
      );

      await tester.pumpAndSettle();

      // Should find "New Bank" button (in AppBar actions or FAB)
      expect(
        find.widgetWithText(FloatingActionButton, 'New Bank'),
        findsOneWidget,
      );
    });

    testWidgets('tapping "New Bank" opens create sheet', (tester) async {
      mockApiClient.mockResponse = [];

      await tester.pumpWidget(
        MaterialApp(
          home: const BanksPage(),
        ),
      );

      await tester.pumpAndSettle();

      // Tap the FAB
      final fab = find.widgetWithText(FloatingActionButton, 'New Bank');
      expect(fab, findsOneWidget);
      await tester.tap(fab);
      await tester.pumpAndSettle();

      // Should show create bank sheet with form fields
      expect(find.text('Create Bank'), findsOneWidget);
      // Verify form elements exist (TextFormFields have hint text)
      expect(find.byType(TextFormField), findsNWidgets(2));
    });

    testWidgets('can search banks', (tester) async {
      mockApiClient.mockResponse = [
        {
          '_id': 'bank-1',
          'name': 'Math Bank',
          'description': 'Math questions',
          'type': 'personal',
          'isActive': true,
          'createdAt': '2026-01-01T00:00:00.000Z',
          'updatedAt': '2026-01-01T00:00:00.000Z',
        },
      ];

      await tester.pumpWidget(
        MaterialApp(
          home: const BanksPage(),
        ),
      );

      await tester.pumpAndSettle();

      // Find search field
      final searchField = find.byType(TextField).first;
      expect(searchField, findsOneWidget);

      // Enter search query
      await tester.enterText(searchField, 'Math');
      await tester.pump();

      // Submit search by pressing enter
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();

      // Verify search was called (check API was hit with query)
      expect(mockApiClient.lastQuery?['q'], 'Math');
    });

    testWidgets('bank card navigates to detail page', (tester) async {
      mockApiClient.mockResponse = [
        {
          '_id': 'bank-123',
          'name': 'Test Bank',
          'description': 'Test description',
          'type': 'personal',
          'isActive': true,
          'createdAt': '2026-01-01T00:00:00.000Z',
          'updatedAt': '2026-01-01T00:00:00.000Z',
        },
      ];

      await tester.pumpWidget(
        MaterialApp(
          home: const BanksPage(),
          routes: {
            '/banks/detail': (context) {
              final args = ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
              return Scaffold(
                body: Center(child: Text('Bank: ${args['bankId']}')),
              );
            },
          },
        ),
      );

      await tester.pumpAndSettle();

      // Tap on bank card
      await tester.tap(find.text('Test Bank'));
      await tester.pumpAndSettle();

      // Verify navigation to detail page
      expect(find.text('Bank: bank-123'), findsOneWidget);
    });
  });
}
