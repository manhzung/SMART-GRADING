import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../constants/app_constants.dart';
import '../errors/app_exceptions.dart';

class ApiClient {
  late final Dio _dio;
  String? _token;

  ApiClient() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: ApiConstants.connectionTimeout,
        receiveTimeout: ApiConstants.receiveTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (_token != null) {
            options.headers['Authorization'] = 'Bearer $_token';
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401 &&
              !error.requestOptions.path.contains('/auth/')) {
            try {
              final refreshToken = await _getRefreshToken();
              if (refreshToken != null) {
                final refreshResponse = await _dio.post(
                  '/auth/refresh-tokens',
                  data: {'refreshToken': refreshToken},
                );
                final newAccessToken = refreshResponse.data['accessToken'];
                await _saveToken(newAccessToken);
                _token = newAccessToken;

                error.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
                final retryResponse = await _dio.fetch(error.requestOptions);
                return handler.resolve(retryResponse);
              }
            } catch (_) {}
          }
          return handler.next(error);
        },
      ),
    );
  }

  void setToken(String? token) {
    _token = token;
  }

  Future<String?> _getRefreshToken() async {
    const storage = FlutterSecureStorage();
    try {
      return await storage.read(key: AppConstants.refreshTokenKey);
    } catch (_) {
      return null;
    }
  }

  Future<void> _saveToken(String token) async {
    const storage = FlutterSecureStorage();
    try {
      await storage.write(key: AppConstants.tokenKey, value: token);
    } catch (_) {}
  }

  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? parser,
  }) async {
    try {
      final response = await _dio.get(path, queryParameters: queryParameters);
      return parser != null ? parser(response.data) : response.data as T;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<T> post<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? parser,
  }) async {
    try {
      final response = await _dio.post(path, data: data);
      return parser != null ? parser(response.data) : response.data as T;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<T> put<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? parser,
  }) async {
    try {
      final response = await _dio.put(path, data: data);
      return parser != null ? parser(response.data) : response.data as T;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<T> delete<T>(
    String path, {
    T Function(dynamic)? parser,
  }) async {
    try {
      final response = await _dio.delete(path);
      return parser != null ? parser(response.data) : response.data as T;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<T> patch<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? parser,
  }) async {
    try {
      final response = await _dio.patch(path, data: data);
      return parser != null ? parser(response.data) : response.data as T;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  AppException _handleError(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return NetworkException(
          message: 'Connection timeout',
          originalError: error,
        );
      case DioExceptionType.connectionError:
        return NetworkException(
          message: 'No internet connection',
          originalError: error,
        );
      case DioExceptionType.badResponse:
        final statusCode = error.response?.statusCode;
        final message = error.response?.data?['message'] ?? 'Server error';
        if (statusCode == 401) {
          return AuthException(message: message, originalError: error);
        }
        return ApiException(
          message: message,
          statusCode: statusCode,
          originalError: error,
        );
      default:
        return AppException(
          message: error.message ?? 'Unknown error',
          originalError: error,
        );
    }
  }
}
