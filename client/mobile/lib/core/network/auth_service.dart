import '../../domain/entities/user.entity.dart';
import '../constants/app_constants.dart';
import 'api_client.dart';

class AuthService {
  AuthService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<AuthResponse> login({
    required String email,
    required String password,
  }) {
    return _apiClient.post<AuthResponse>(
      '${ApiConstants.auth}/login',
      data: {
        'email': email,
        'password': password,
      },
      parser: (data) => AuthResponse.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<AuthResponse> register({
    required String name,
    required String email,
    required String password,
    required String schoolId,
  }) {
    return _apiClient.post<AuthResponse>(
      '${ApiConstants.auth}/register',
      data: {
        'name': name,
        'email': email,
        'password': password,
        'schoolId': schoolId,
      },
      parser: (data) => AuthResponse.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<void> forgotPassword({required String email}) async {
    await _apiClient.post<void>(
      '${ApiConstants.auth}/forgot-password',
      data: {
        'email': email,
      },
      parser: (_) {},
    );
  }

  Future<void> resendVerificationEmail({required String email}) async {
    await _apiClient.post<void>(
      '${ApiConstants.auth}/resend-verification-email',
      data: {
        'email': email,
      },
      parser: (_) {},
    );
  }

  Future<User> getMe() {
    return _apiClient.get<User>(
      '${ApiConstants.auth}/me',
      parser: (data) {
        final json = data['user'] as Map<String, dynamic>? ?? data as Map<String, dynamic>;
        return User.fromJson(json);
      },
    );
  }
}

class AuthResponse {
  AuthResponse({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
  });

  final User user;
  final String accessToken;
  final String refreshToken;

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    final tokens = json['tokens'] as Map<String, dynamic>? ?? const {};
    final access = tokens['access'] as Map<String, dynamic>? ?? const {};
    final refresh = tokens['refresh'] as Map<String, dynamic>? ?? const {};

    return AuthResponse(
      user: User.fromJson(json['user'] as Map<String, dynamic>? ?? const {}),
      accessToken: (access['token'] ?? '').toString(),
      refreshToken: (refresh['token'] ?? '').toString(),
    );
  }
}
