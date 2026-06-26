import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/network/auth_service.dart';
import 'package:smart_grading_mobile/core/errors/app_exceptions.dart';
import 'mock_api_client.dart';

void main() {
  group('AuthService', () {
    late MockApiClient mockClient;
    late AuthService service;

    setUp(() {
      mockClient = MockApiClient();
      service = AuthService(apiClient: mockClient);
    });

    group('login', () {
      test('returns AuthResponse on successful login', () async {
        mockClient.mockResponse = {
          'user': {
            '_id': 'user-1',
            'name': 'Nguyen Van A',
            'email': 'teacher@example.com',
            'role': 'teacher',
          },
          'tokens': {
            'access': {'token': 'access-token-123'},
            'refresh': {'token': 'refresh-token-456'},
          },
        };

        final result = await service.login(
          email: 'teacher@example.com',
          password: 'password123',
        );

        expect(result.user.name, 'Nguyen Van A');
        expect(result.user.email, 'teacher@example.com');
        expect(result.user.role, 'teacher');
        expect(result.accessToken, 'access-token-123');
        expect(result.refreshToken, 'refresh-token-456');
        expect(mockClient.lastPath, '/auth/login');
        expect(mockClient.lastBody['email'], 'teacher@example.com');
        expect(mockClient.lastBody['password'], 'password123');
      });

      test('throws AuthException on invalid credentials', () async {
        mockClient.shouldThrow = true;
        mockClient.errorType = 'auth';

        expect(
          () => service.login(email: 'wrong@test.com', password: 'wrong'),
          throwsA(isA<AuthException>()),
        );
      });

      test('tracks call history for login', () async {
        mockClient.mockResponse = {
          'user': {'_id': 'user-1', 'name': 'Test User', 'email': 'test@test.com', 'role': 'teacher'},
          'tokens': {
            'access': {'token': 'token'},
            'refresh': {'token': 'refresh'},
          },
        };

        await service.login(email: 'test@test.com', password: 'pass');

        expect(mockClient.callHistory.length, 1);
        expect(mockClient.callHistory[0]['method'], 'POST');
        expect(mockClient.callHistory[0]['path'], '/auth/login');
      });
    });

    group('register', () {
      test('returns AuthResponse on successful registration', () async {
        mockClient.mockResponse = {
          'user': {
            '_id': 'user-new',
            'name': 'Tran Thi B',
            'email': 'newuser@example.com',
            'role': 'teacher',
          },
          'tokens': {
            'access': {'token': 'new-access-token'},
            'refresh': {'token': 'new-refresh-token'},
          },
        };

        final result = await service.register(
          name: 'Tran Thi B',
          email: 'newuser@example.com',
          password: 'password123',
          schoolId: 'school-1',
        );

        expect(result.user.name, 'Tran Thi B');
        expect(result.user.email, 'newuser@example.com');
        expect(mockClient.lastPath, '/auth/register');
        expect(mockClient.lastBody['name'], 'Tran Thi B');
        expect(mockClient.lastBody['schoolId'], 'school-1');
      });
    });

    group('getMe', () {
      test('returns User from /auth/me endpoint', () async {
        mockClient.mockResponse = {
          'user': {
            '_id': 'user-1',
            'name': 'Nguyen Van A',
            'email': 'teacher@example.com',
            'role': 'teacher',
          },
        };

        final result = await service.getMe();

        expect(result.name, 'Nguyen Van A');
        expect(result.email, 'teacher@example.com');
        expect(result.role, 'teacher');
        expect(mockClient.lastPath, '/auth/me');
      });

      test('throws AuthException when unauthorized', () async {
        mockClient.shouldThrow = true;
        mockClient.errorType = 'auth';

        expect(
          () => service.getMe(),
          throwsA(isA<AuthException>()),
        );
      });
    });

    group('forgotPassword', () {
      test('sends correct email to forgot-password endpoint', () async {
        mockClient.mockResponse = {'success': true};

        await service.forgotPassword(email: 'user@example.com');

        expect(mockClient.lastPath, '/auth/forgot-password');
        expect(mockClient.lastBody['email'], 'user@example.com');
      });
    });

    group('resendVerificationEmail', () {
      test('sends correct email to resend-verification-email endpoint',
          () async {
        mockClient.mockResponse = {'success': true};

        await service.resendVerificationEmail(email: 'user@example.com');

        expect(mockClient.lastPath, '/auth/resend-verification-email');
        expect(mockClient.lastBody['email'], 'user@example.com');
      });
    });

    group('error handling', () {
      test('throws NetworkException on connection timeout', () async {
        mockClient.shouldThrow = true;
        mockClient.errorType = 'network';

        expect(
          () => service.login(email: 'test@test.com', password: 'pass'),
          throwsA(isA<NetworkException>()),
        );
      });

      test('throws ApiException on server error', () async {
        mockClient.shouldThrow = true;
        mockClient.errorType = 'api';

        expect(
          () => service.getMe(),
          throwsA(isA<ApiException>()),
        );
      });
    });
  });
}
