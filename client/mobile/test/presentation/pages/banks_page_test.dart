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

    testWidgets('shows error state when load fails', (tester) async {
      mockApiClient.shouldThrow = true;
      mockApiClient.errorType = 'network';

      await tester.pumpWidget(
        const MaterialApp(
          home: BanksPage(),
        ),
      );

      // Wait for async load to complete
      await tester.pumpAndSettle();

      // Should show error state
      expect(find.text('Unable to load banks'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });

    testWidgets('tapping retry button reloads banks', (tester) async {
      mockApiClient.shouldThrow = true;
      mockApiClient.errorType = 'network';

      await tester.pumpWidget(
        const MaterialApp(
          home: BanksPage(),
        ),
      );

      await tester.pumpAndSettle();

      // Verify error state
      expect(find.text('Unable to load banks'), findsOneWidget);

      // Now set up success response
      mockApiClient.shouldThrow = false;
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

      // Tap retry
      await tester.tap(find.text('Retry'));
      await tester.pumpAndSettle();

      // Should show bank
      expect(find.text('Math Bank'), findsOneWidget);
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

    testWidgets('displays banks in Your Banks section', (tester) async {
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
      
      // Should show "Your Banks" section
      expect(find.text('Your Banks'), findsOneWidget);
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

    testWidgets('can search banks and shows results in All Banks section', (tester) async {
      mockApiClient.mockResponse = [];

      await tester.pumpWidget(
        MaterialApp(
          home: const BanksPage(),
        ),
      );

      await tester.pumpAndSettle();

      // Find search field
      final searchField = find.byType(TextField).first;
      expect(searchField, findsOneWidget);

      // Set up search response
      mockApiClient.mockResponse = {
        'results': [
          {
            '_id': 'bank-search-1',
            'name': 'Physics Bank',
            'description': 'Physics questions',
            'type': 'school',
            'isActive': true,
            'createdAt': '2026-01-01T00:00:00.000Z',
            'updatedAt': '2026-01-01T00:00:00.000Z',
          },
        ],
        'total': 1,
        'page': 1,
        'pages': 1,
      };

      // Enter search query
      await tester.enterText(searchField, 'Physics');
      await tester.pump();

      // Submit search by pressing enter
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();

      // Should show "All Banks in System" section with search results
      expect(find.text('Physics Bank'), findsOneWidget);
      expect(find.text('All Banks in System'), findsOneWidget);
      
      // Should show "Request Access" button
      expect(find.text('Request Access'), findsOneWidget);
    });

    testWidgets('searching updates state correctly', (tester) async {
      mockApiClient.mockResponse = [];

      await tester.pumpWidget(
        MaterialApp(
          home: const BanksPage(),
        ),
      );

      await tester.pumpAndSettle();

      // Perform search
      mockApiClient.mockResponse = {
        'results': [
          {
            '_id': 'bank-search-1',
            'name': 'Physics Bank',
            'description': 'Physics questions',
            'type': 'school',
            'isActive': true,
            'createdAt': '2026-01-01T00:00:00.000Z',
            'updatedAt': '2026-01-01T00:00:00.000Z',
          },
        ],
        'total': 1,
        'page': 1,
        'pages': 1,
      };

      final searchField = find.byType(TextField).first;
      await tester.enterText(searchField, 'Physics');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();

      // Should show search results in "All Banks in System" section
      expect(find.text('Physics Bank'), findsOneWidget);
      expect(find.text('All Banks in System'), findsOneWidget);
      
      // Should show "Request Access" button for search results
      expect(find.text('Request Access'), findsOneWidget);
      
      // Should show clear button
      expect(find.byIcon(Icons.clear), findsOneWidget);
    });

    testWidgets('clearing search shows Your Banks section', (tester) async {
      mockApiClient.mockResponse = [
        {
          '_id': 'bank-1',
          'name': 'My Math Bank',
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

      // Should show "Your Banks" section
      expect(find.text('Your Banks'), findsOneWidget);
      expect(find.text('My Math Bank'), findsOneWidget);

      // Perform search
      mockApiClient.mockResponse = {
        'results': [
          {
            '_id': 'bank-search-1',
            'name': 'Other Bank',
            'description': 'Other questions',
            'type': 'school',
            'isActive': true,
            'createdAt': '2026-01-01T00:00:00.000Z',
            'updatedAt': '2026-01-01T00:00:00.000Z',
          },
        ],
        'total': 1,
        'page': 1,
        'pages': 1,
      };

      final searchField = find.byType(TextField).first;
      await tester.enterText(searchField, 'Other');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();

      // Should show "All Banks in System" section
      expect(find.text('All Banks in System'), findsOneWidget);
      expect(find.text('Other Bank'), findsOneWidget);

      // Clear search
      await tester.tap(find.byIcon(Icons.clear));
      await tester.pumpAndSettle();

      // Should show "Your Banks" section again
      expect(find.text('Your Banks'), findsOneWidget);
      expect(find.text('My Math Bank'), findsOneWidget);
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

    testWidgets('request access button calls service', (tester) async {
      mockApiClient.mockResponse = {
        'results': [
          {
            '_id': 'bank-search-1',
            'name': 'External Bank',
            'description': 'External questions',
            'type': 'school',
            'isActive': true,
            'createdAt': '2026-01-01T00:00:00.000Z',
            'updatedAt': '2026-01-01T00:00:00.000Z',
          },
        ],
        'total': 1,
        'page': 1,
        'pages': 1,
      };

      await tester.pumpWidget(
        MaterialApp(
          home: const BanksPage(),
        ),
      );

      // Perform search to show "All Banks in System" section
      final searchField = find.byType(TextField).first;
      await tester.enterText(searchField, 'External');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();

      // Should show Request Access button
      expect(find.text('Request Access'), findsOneWidget);

      // Set up request access response
      mockApiClient.mockResponse = {
        'bankId': 'bank-search-1',
        'userId': 'user-1',
        'role': 'viewer',
        'status': 'pending',
      };

      // Tap Request Access
      await tester.tap(find.text('Request Access'));
      await tester.pumpAndSettle();

      // Should have made POST request to request-access endpoint
      expect(mockApiClient.lastPath, '/banks/bank-search-1/request-access');
      expect(mockApiClient.lastBody, isNull);
      
      // Should show success snackbar
      expect(find.text('Access request sent successfully'), findsOneWidget);
    });
  });
}
