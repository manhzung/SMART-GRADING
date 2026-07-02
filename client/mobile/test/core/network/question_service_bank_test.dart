import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/network/question_service.dart';
import 'mock_api_client.dart';

void main() {
  group('QuestionService - bankId scoping', () {
    late MockApiClient mockClient;
    late QuestionService service;

    setUp(() {
      mockClient = MockApiClient();
      service = QuestionService(apiClient: mockClient);
    });

    group('getQuestions', () {
      test('includes bankId when provided', () async {
        mockClient.mockResponse = {
          'questions': [],
          'total': 0,
          'page': 1,
          'totalPages': 0,
        };

        await service.getQuestions(bankId: 'bank-123');

        expect(mockClient.lastPath, '/questions');
        expect(mockClient.lastQuery, isNotNull);
        expect(mockClient.lastQuery!['bankId'], 'bank-123');
      });

      test('omits bankId when not provided', () async {
        mockClient.mockResponse = {
          'questions': [],
          'total': 0,
          'page': 1,
          'totalPages': 0,
        };

        await service.getQuestions();

        expect(mockClient.lastPath, '/questions');
        expect(mockClient.lastQuery, isNotNull);
        expect(mockClient.lastQuery!.containsKey('bankId'), isFalse);
      });

      test('with bankId and other params works together', () async {
        mockClient.mockResponse = {
          'questions': [],
          'total': 0,
          'page': 2,
          'totalPages': 5,
        };

        await service.getQuestions(
          page: 2,
          limit: 10,
          difficulty: 'medium',
          search: 'math',
          bankId: 'bank-456',
        );

        expect(mockClient.lastPath, '/questions');
        expect(mockClient.lastQuery!['page'], 2);
        expect(mockClient.lastQuery!['limit'], 10);
        expect(mockClient.lastQuery!['difficulty'], 'medium');
        expect(mockClient.lastQuery!['search'], 'math');
        expect(mockClient.lastQuery!['bankId'], 'bank-456');
      });

      test('omits empty bankId string', () async {
        mockClient.mockResponse = {
          'questions': [],
          'total': 0,
          'page': 1,
          'totalPages': 0,
        };

        await service.getQuestions(bankId: '');

        expect(mockClient.lastQuery!.containsKey('bankId'), isFalse);
      });
    });
  });
}
