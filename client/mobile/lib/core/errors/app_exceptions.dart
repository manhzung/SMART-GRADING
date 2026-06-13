class AppException implements Exception {
  final String message;
  final String? code;
  final dynamic originalError;

  AppException({
    required this.message,
    this.code,
    this.originalError,
  });

  @override
  String toString() => 'AppException: $message (code: $code)';
}

class NetworkException extends AppException {
  NetworkException({
    super.message = 'Network error occurred',
    super.code = 'NETWORK_ERROR',
    super.originalError,
  });
}

class ApiException extends AppException {
  final int? statusCode;

  ApiException({
    required super.message,
    this.statusCode,
    super.code = 'API_ERROR',
    super.originalError,
  });
}

class AuthException extends AppException {
  AuthException({
    super.message = 'Authentication failed',
    super.code = 'AUTH_ERROR',
    super.originalError,
  });
}

class ValidationException extends AppException {
  final Map<String, String>? fieldErrors;

  ValidationException({
    required super.message,
    this.fieldErrors,
    super.code = 'VALIDATION_ERROR',
    super.originalError,
  });
}
