export class AppException extends Error {
  message: string;
  code?: string;
  originalError?: unknown;

  constructor(message: string, code?: string, originalError?: unknown) {
    super(message);
    this.name = 'AppException';
    this.message = message;
    this.code = code;
    this.originalError = originalError;
  }
}

export class NetworkException extends AppException {
  constructor(message = 'Network error occurred', originalError?: unknown) {
    super(message, 'NETWORK_ERROR', originalError);
    this.name = 'NetworkException';
  }
}

export class ApiException extends AppException {
  statusCode?: number;

  constructor(message: string, statusCode?: number, originalError?: unknown) {
    super(message, 'API_ERROR', originalError);
    this.name = 'ApiException';
    this.statusCode = statusCode;
  }
}

export class AuthException extends AppException {
  constructor(message = 'Authentication failed', originalError?: unknown) {
    super(message, 'AUTH_ERROR', originalError);
    this.name = 'AuthException';
  }
}

export class ValidationException extends AppException {
  fieldErrors?: Record<string, string>;

  constructor(message: string, fieldErrors?: Record<string, string>, originalError?: unknown) {
    super(message, 'VALIDATION_ERROR', originalError);
    this.name = 'ValidationException';
    this.fieldErrors = fieldErrors;
  }
}
