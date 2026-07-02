import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/network/bank_service.dart';
import 'package:smart_grading_mobile/core/errors/app_exceptions.dart';
import 'mock_api_client.dart';

void main() {
  group('BankService', () {
    late MockApiClient mockClient;
    late BankService service;

    setUp(() {
      mockClient = MockApiClient();
      service = BankService(apiClient: mockClient);
    });

    group('listBanks', () {
      test('returns summaries from /banks endpoint', () async {
        mockClient.mockResponse = [
          {
            'bank': {
              '_id': 'bank-1',
              'name': 'Math Bank',
              'type': 'school',
            },
            'membership': {
              'bankId': 'bank-1',
              'userId': 'user-1',
              'role': 'admin',
              'status': 'active',
            },
          },
          {
            'bank': {
              '_id': 'bank-2',
              'name': 'Science Bank',
              'type': 'personal',
            },
            'membership': null,
          },
        ];

        final result = await service.listBanks();

        expect(result.length, 2);
        expect(result[0].bank.name, 'Math Bank');
        expect(result[0].bank.id, 'bank-1');
        expect(result[0].membership?.role, 'admin');
        expect(result[1].bank.name, 'Science Bank');
        expect(result[1].membership, isNull);
        expect(mockClient.lastPath, '/banks');
      });
    });

    group('getBank', () {
      test('returns detail from /banks/:bankId endpoint', () async {
        mockClient.mockResponse = {
          'bank': {
            '_id': 'bank-1',
            'name': 'Math Bank',
            'description': 'Math questions for grade 10',
            'type': 'school',
          },
          'membership': {
            'bankId': 'bank-1',
            'userId': 'user-1',
            'role': 'admin',
            'status': 'active',
          },
        };

        final result = await service.getBank('bank-1');

        expect(result.bank.id, 'bank-1');
        expect(result.bank.name, 'Math Bank');
        expect(result.bank.description, 'Math questions for grade 10');
        expect(result.membership?.role, 'admin');
        expect(mockClient.lastPath, '/banks/bank-1');
      });
    });

    group('createBank', () {
      test('posts payload to /banks endpoint', () async {
        mockClient.mockResponse = {
          '_id': 'new-bank-id',
          'name': 'New Bank',
          'description': 'Test description',
          'type': 'school',
          'isActive': true,
          'createdAt': '2024-01-01T00:00:00.000Z',
          'updatedAt': '2024-01-01T00:00:00.000Z',
        };

        final result = await service.createBank(
          name: 'New Bank',
          description: 'Test description',
          type: 'school',
        );

        expect(result.id, 'new-bank-id');
        expect(result.name, 'New Bank');
        expect(result.type, 'school');
        expect(mockClient.lastPath, '/banks');
        expect(mockClient.lastBody['name'], 'New Bank');
        expect(mockClient.lastBody['description'], 'Test description');
        expect(mockClient.lastBody['type'], 'school');
      });

      test('createBank without description', () async {
        mockClient.mockResponse = {
          '_id': 'personal-bank',
          'name': 'My Personal Bank',
          'type': 'personal',
          'isActive': true,
          'createdAt': '2024-01-01T00:00:00.000Z',
          'updatedAt': '2024-01-01T00:00:00.000Z',
        };

        final result = await service.createBank(
          name: 'My Personal Bank',
          type: 'personal',
        );

        expect(result.id, 'personal-bank');
        expect(result.name, 'My Personal Bank');
        expect(result.type, 'personal');
        expect(mockClient.lastBody.containsKey('description'), isFalse);
      });
    });

    group('searchBanks', () {
      test('returns list from /banks/search endpoint', () async {
        mockClient.mockResponse = [
          {
            '_id': 'bank-1',
            'name': 'Math Bank',
            'type': 'school',
          },
        ];

        final result = await service.searchBanks('math');

        expect(result.length, 1);
        expect(result[0].name, 'Math Bank');
        expect(mockClient.lastPath, '/banks/search');
        expect(mockClient.lastQuery?['q'], 'math');
      });
    });

    group('requestAccess', () {
      test('posts to /banks/:bankId/request-access endpoint', () async {
        mockClient.mockResponse = {'success': true};

        await service.requestAccess('bank-1');

        expect(mockClient.lastPath, '/banks/bank-1/request-access');
        expect(mockClient.lastBody, isNull);
      });
    });

    group('error handling', () {
      test('throws AuthException on unauthorized access', () async {
        mockClient.shouldThrow = true;
        mockClient.errorType = 'auth';

        expect(
          () => service.listBanks(),
          throwsA(isA<AuthException>()),
        );
      });

      test('throws NetworkException on connection error', () async {
        mockClient.shouldThrow = true;
        mockClient.errorType = 'network';

        expect(
          () => service.getBank('bank-1'),
          throwsA(isA<NetworkException>()),
        );
      });

      test('throws ApiException on server error', () async {
        mockClient.shouldThrow = true;
        mockClient.errorType = 'api';

        expect(
          () => service.searchBanks('test'),
          throwsA(isA<ApiException>()),
        );
      });
    });
  });
}
