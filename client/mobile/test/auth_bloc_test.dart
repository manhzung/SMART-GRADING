import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/errors/app_exceptions.dart';
import 'package:smart_grading_mobile/core/network/api_client.dart';
import 'package:smart_grading_mobile/core/network/auth_storage_service.dart';
import 'package:smart_grading_mobile/presentation/blocs/auth/auth_bloc.dart';

class _FakeApiClientSuccess extends ApiClient {
  String? tokenValue;
  String? lastPath;
  dynamic lastData;

  @override
  Future<T> post<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? parser,
  }) async {
    lastPath = path;
    lastData = data;

    final response = switch (path) {
      '/auth/login' => {
          'user': {
            'id': 'user-1',
            'name': 'Teacher One',
            'email': data['email'],
            'role': 'teacher',
            'avatarUrl': null,
            'phone': null,
            'isActive': true,
            'createdAt': '2026-06-05T00:00:00.000Z',
          },
          'tokens': {
            'access': {'token': 'access-token'},
            'refresh': {'token': 'refresh-token'},
          },
        },
      '/auth/register' => {
          'user': {
            'id': 'user-2',
            'name': data['name'],
            'email': data['email'],
            'role': 'teacher',
            'avatarUrl': null,
            'phone': null,
            'isActive': true,
            'createdAt': '2026-06-05T00:00:00.000Z',
          },
          'tokens': {
            'access': {'token': 'new-access-token'},
            'refresh': {'token': 'new-refresh-token'},
          },
        },
      '/auth/forgot-password' => null,
      _ => throw UnimplementedError('Unexpected path $path'),
    };

    return parser != null ? parser(response) : response as T;
  }

  @override
  void setToken(String? token) {
    tokenValue = token;
    super.setToken(token);
  }
}

class _FakeApiClientFailure extends ApiClient {
  @override
  Future<T> post<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? parser,
  }) async {
    throw AuthException(message: 'Incorrect email or password');
  }
}

class _FakeAuthStorageService extends AuthStorageService {
  _FakeAuthStorageService({this.accessToken, this.refreshToken});

  String? accessToken;
  String? refreshToken;
  bool cleared = false;

  @override
  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    cleared = false;
  }

  @override
  Future<String?> getAccessToken() async => accessToken;

  @override
  Future<String?> getRefreshToken() async => refreshToken;

  @override
  Future<void> clearTokens() async {
    accessToken = null;
    refreshToken = null;
    cleared = true;
  }
}

void main() {
  group('AuthBloc', () {
    test('restores authenticated state from saved access token', () async {
      final apiClient = _FakeApiClientSuccess();
      final storage = _FakeAuthStorageService(accessToken: 'saved-token');
      final bloc = AuthBloc(apiClient: apiClient, authStorageService: storage);

      bloc.add(AuthCheckRequested());

      await expectLater(
        bloc.stream,
        emitsInOrder([
          isA<AuthLoading>(),
          isA<AuthAuthenticated>()
              .having((state) => state.user.email, 'user email', 'restored-session@local.dev')
              .having((state) => state.user.name, 'name', 'Phiên đăng nhập trước đó'),
        ]),
      );

      expect(apiClient.tokenValue, 'saved-token');
      await bloc.close();
    });

    test('login emits loading then authenticated and stores access token', () async {
      final apiClient = _FakeApiClientSuccess();
      final storage = _FakeAuthStorageService();
      final bloc = AuthBloc(apiClient: apiClient, authStorageService: storage);

      bloc.add(const AuthLoginRequested(email: 'teacher@example.com', password: 'password1'));

      await expectLater(
        bloc.stream,
        emitsInOrder([
          isA<AuthLoading>(),
          isA<AuthAuthenticated>()
              .having((state) => state.user.email, 'user email', 'teacher@example.com')
              .having((state) => state.user.role, 'role', 'teacher'),
        ]),
      );

      expect(apiClient.lastPath, '/auth/login');
      expect(apiClient.lastData, {'email': 'teacher@example.com', 'password': 'password1'});
      expect(apiClient.tokenValue, 'access-token');
      expect(storage.accessToken, 'access-token');
      expect(storage.refreshToken, 'refresh-token');

      await bloc.close();
    });

    test('register emits loading then authenticated and sends schoolId payload', () async {
      final apiClient = _FakeApiClientSuccess();
      final storage = _FakeAuthStorageService();
      final bloc = AuthBloc(apiClient: apiClient, authStorageService: storage);

      bloc.add(
        const AuthRegisterRequested(
          name: 'Teacher One',
          email: 'teacher@example.com',
          phone: '0900000000',
          school: 'school-123',
          password: 'password1',
        ),
      );

      await expectLater(
        bloc.stream,
        emitsInOrder([
          isA<AuthLoading>(),
          isA<AuthAuthenticated>()
              .having((state) => state.user.email, 'user email', 'teacher@example.com')
              .having((state) => state.user.name, 'name', 'Teacher One'),
        ]),
      );

      expect(apiClient.lastPath, '/auth/register');
      expect(apiClient.lastData, {
        'name': 'Teacher One',
        'email': 'teacher@example.com',
        'password': 'password1',
        'schoolId': 'school-123',
      });
      expect(apiClient.tokenValue, 'new-access-token');
      expect(storage.accessToken, 'new-access-token');
      expect(storage.refreshToken, 'new-refresh-token');

      await bloc.close();
    });

    test('forgot password completes with API request and success state', () async {
      final apiClient = _FakeApiClientSuccess();
      final bloc = AuthBloc(
        apiClient: apiClient,
        authStorageService: _FakeAuthStorageService(),
      );

      bloc.add(const AuthForgotPasswordRequested(email: 'teacher@example.com'));

      await expectLater(
        bloc.stream,
        emitsInOrder([
          isA<AuthLoading>(),
          isA<AuthPasswordResetEmailSent>()
              .having((state) => state.email, 'email', 'teacher@example.com'),
        ]),
      );

      expect(apiClient.lastPath, '/auth/forgot-password');
      expect(apiClient.lastData, {'email': 'teacher@example.com'});

      await bloc.close();
    });

    test('logout clears saved tokens and emits unauthenticated', () async {
      final apiClient = _FakeApiClientSuccess();
      final storage = _FakeAuthStorageService(accessToken: 'saved-token', refreshToken: 'saved-refresh');
      final bloc = AuthBloc(apiClient: apiClient, authStorageService: storage);

      bloc.add(AuthLogoutRequested());

      await expectLater(
        bloc.stream,
        emitsInOrder([
          isA<AuthUnauthenticated>(),
        ]),
      );

      expect(apiClient.tokenValue, isNull);
      expect(storage.cleared, isTrue);

      await bloc.close();
    });

    test('login emits auth error when API throws auth exception', () async {
      final bloc = AuthBloc(
        apiClient: _FakeApiClientFailure(),
        authStorageService: _FakeAuthStorageService(),
      );

      bloc.add(const AuthLoginRequested(email: 'teacher@example.com', password: 'wrongPassword1'));

      await expectLater(
        bloc.stream,
        emitsInOrder([
          isA<AuthLoading>(),
          isA<AuthError>()
              .having((state) => state.message, 'message', 'Incorrect email or password'),
        ]),
      );

      await bloc.close();
    });
  });
}
