import 'package:dio/dio.dart';
import 'package:smart_grading_mobile/core/network/api_client.dart';
import 'package:smart_grading_mobile/core/errors/app_exceptions.dart';

/// Mock response object that mimics Dio's Response structure.
class MockResponse {
  MockResponse(this.data);
  final dynamic data;
}

/// Mock ApiClient for testing.
///
/// Returns MockResponse when no parser is provided (to mimic Dio's Response structure).
/// Returns parser(result) when parser is provided.
class MockApiClient implements ApiClient {
  MockApiClient({
    dynamic mockResponse,
    bool shouldThrow = false,
    String? errorType,
  }) {
    _mockResponse = mockResponse;
    _shouldThrow = shouldThrow;
    _errorType = errorType;
  }

  dynamic _mockResponse;
  bool _shouldThrow = false;
  String? _errorType;

  dynamic get mockResponse => _mockResponse;
  set mockResponse(dynamic value) => _mockResponse = value;

  bool get shouldThrow => _shouldThrow;
  set shouldThrow(bool value) => _shouldThrow = value;

  String? get errorType => _errorType;
  set errorType(String? value) => _errorType = value;

  String? lastPath;
  Map<String, dynamic>? lastQuery;
  dynamic lastBody;
  final List<Map<String, dynamic>> callHistory = [];

  @override
  late final Dio dio;

  @override
  String? _token;

  @override
  void setToken(String? token) {
    _token = token;
  }

  void reset() {
    lastPath = null;
    lastQuery = null;
    lastBody = null;
    callHistory.clear();
    _mockResponse = null;
    _shouldThrow = false;
    _errorType = null;
  }

  @override
  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? parser,
  }) async {
    lastPath = path;
    lastQuery = queryParameters;
    callHistory.add({
      'method': 'GET',
      'path': path,
      'query': queryParameters,
    });

    if (_shouldThrow) throw _createError();
    if (_mockResponse == null) {
      throw AppException(message: 'Mock response not set');
    }

    // If parser is provided, use it (standard behavior)
    // If no parser, return MockResponse to mimic Dio's Response structure
    if (parser != null) {
      return parser(_mockResponse) as T;
    }
    return MockResponse(_mockResponse) as T;
  }

  @override
  Future<T> post<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? parser,
  }) async {
    lastPath = path;
    lastBody = data;
    callHistory.add({
      'method': 'POST',
      'path': path,
      'body': data,
    });

    if (_shouldThrow) throw _createError();
    if (_mockResponse == null) {
      throw AppException(message: 'Mock response not set');
    }

    if (parser != null) {
      return parser(_mockResponse) as T;
    }
    return MockResponse(_mockResponse) as T;
  }

  @override
  Future<T> put<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? parser,
  }) async {
    lastPath = path;
    lastBody = data;
    callHistory.add({
      'method': 'PUT',
      'path': path,
      'body': data,
    });

    if (_shouldThrow) throw _createError();
    if (_mockResponse == null) {
      throw AppException(message: 'Mock response not set');
    }

    if (parser != null) {
      return parser(_mockResponse) as T;
    }
    return MockResponse(_mockResponse) as T;
  }

  @override
  Future<T> delete<T>(
    String path, {
    T Function(dynamic)? parser,
  }) async {
    lastPath = path;
    callHistory.add({
      'method': 'DELETE',
      'path': path,
    });

    if (_shouldThrow) throw _createError();
    if (_mockResponse == null) {
      throw AppException(message: 'Mock response not set');
    }

    if (parser != null) {
      return parser(_mockResponse) as T;
    }
    return MockResponse(_mockResponse) as T;
  }

  @override
  Future<T> patch<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? parser,
  }) async {
    lastPath = path;
    lastBody = data;
    callHistory.add({
      'method': 'PATCH',
      'path': path,
      'body': data,
    });

    if (_shouldThrow) throw _createError();
    if (_mockResponse == null) {
      throw AppException(message: 'Mock response not set');
    }

    if (parser != null) {
      return parser(_mockResponse) as T;
    }
    return MockResponse(_mockResponse) as T;
  }

  Exception _createError() {
    switch (_errorType) {
      case 'network':
        return NetworkException(message: 'Connection timeout');
      case 'auth':
        return AuthException(message: 'Unauthorized');
      case 'api':
        return ApiException(message: 'Server error', statusCode: 500);
      case 'forbidden':
        return ForbiddenException(message: 'Forbidden');
      default:
        return AppException(message: 'Unknown error');
    }
  }
}
