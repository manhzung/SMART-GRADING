import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/auth_service.dart';
import '../../../core/network/auth_storage_service.dart';
import '../../../domain/entities/user.entity.dart';

part 'auth_event.dart';
part 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc({
    required ApiClient apiClient,
    AuthStorageService? authStorageService,
  })  : _apiClient = apiClient,
        _authService = AuthService(apiClient: apiClient),
        _authStorageService = authStorageService ?? AuthStorageService(),
        super(AuthInitial()) {
    on<AuthCheckRequested>(_onCheckRequested);
    on<AuthLoginRequested>(_onLoginRequested);
    on<AuthLogoutRequested>(_onLogoutRequested);
    on<AuthRegisterRequested>(_onRegisterRequested);
    on<AuthForgotPasswordRequested>(_onForgotPasswordRequested);
    on<AuthProfileUpdated>(_onProfileUpdated);
    on<AuthResendVerificationEmailRequested>(_onResendVerificationEmail);
  }

  final ApiClient _apiClient;
  final AuthService _authService;
  final AuthStorageService _authStorageService;

  Future<void> _onCheckRequested(
    AuthCheckRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());

    final accessToken = await _authStorageService.getAccessToken();
    if (accessToken == null || accessToken.isEmpty) {
      emit(AuthUnauthenticated());
      return;
    }

    _apiClient.setToken(accessToken);

    try {
      final user = await _authService.getMe();
      await _authStorageService.saveUser({
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'role': user.role,
        'schoolId': user.schoolId,
        'avatarUrl': user.avatarUrl,
        'phone': user.phone,
        'isActive': user.isActive,
        'createdAt': user.createdAt.toIso8601String(),
      });
      emit(AuthAuthenticated(user));
    } catch (e) {
      _apiClient.setToken(null);
      await _authStorageService.clearTokens();
      emit(AuthUnauthenticated());
    }
  }

  Future<void> _onLoginRequested(
    AuthLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final response = await _authService.login(
        email: event.email,
        password: event.password,
      );
      _apiClient.setToken(response.accessToken);
      await _authStorageService.saveTokens(
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      );
      await _authStorageService.saveUser({
        'id': response.user.id,
        'name': response.user.name,
        'email': response.user.email,
        'role': response.user.role,
        'schoolId': response.user.schoolId,
        'avatarUrl': response.user.avatarUrl,
        'phone': response.user.phone,
        'isActive': response.user.isActive,
        'createdAt': response.user.createdAt.toIso8601String(),
      });
      emit(AuthAuthenticated(response.user));
    } catch (e) {
      emit(AuthError(message: _getErrorMessage(e)));
    }
  }

  Future<void> _onRegisterRequested(
    AuthRegisterRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final response = await _authService.register(
        name: event.name,
        email: event.email,
        password: event.password,
        schoolId: event.school,
      );
      _apiClient.setToken(response.accessToken);
      await _authStorageService.saveTokens(
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      );
      await _authStorageService.saveUser({
        'id': response.user.id,
        'name': response.user.name,
        'email': response.user.email,
        'role': response.user.role,
        'schoolId': response.user.schoolId,
        'avatarUrl': response.user.avatarUrl,
        'phone': response.user.phone,
        'isActive': response.user.isActive,
        'createdAt': response.user.createdAt.toIso8601String(),
      });
      emit(AuthAuthenticated(response.user));
    } catch (e) {
      emit(AuthError(message: _getErrorMessage(e)));
    }
  }

  Future<void> _onForgotPasswordRequested(
    AuthForgotPasswordRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      await _authService.forgotPassword(email: event.email);
      emit(AuthPasswordResetEmailSent(email: event.email));
    } catch (e) {
      emit(AuthError(message: _getErrorMessage(e)));
    }
  }

  String _getErrorMessage(Object error) {
    if (error is Exception && error is! Error) {
      final appMessage = (error as dynamic).message;
      if (appMessage is String && appMessage.trim().isNotEmpty) {
        return appMessage;
      }
    }

    return error.toString().replaceFirst('Exception: ', '');
  }

  Future<void> _onLogoutRequested(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    _apiClient.setToken(null);
    await _authStorageService.clearTokens();
    emit(AuthUnauthenticated());
  }

  Future<void> _onProfileUpdated(
    AuthProfileUpdated event,
    Emitter<AuthState> emit,
  ) async {
    await _authStorageService.saveUser({
      'id': event.user.id,
      'name': event.user.name,
      'email': event.user.email,
      'role': event.user.role,
      'schoolId': event.user.schoolId,
      'avatarUrl': event.user.avatarUrl,
      'phone': event.user.phone,
      'isActive': event.user.isActive,
      'createdAt': event.user.createdAt.toIso8601String(),
    });
    emit(AuthAuthenticated(event.user));
  }

  Future<void> _onResendVerificationEmail(
    AuthResendVerificationEmailRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      await _authService.resendVerificationEmail(email: event.email);
      emit(AuthVerificationEmailResent(email: event.email));
    } catch (e) {
      emit(AuthError(message: _getErrorMessage(e)));
    }
  }
}
