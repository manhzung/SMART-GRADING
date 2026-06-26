# Mobile API Testing Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo test coverage đầy đủ cho tất cả API services trong mobile app, bao gồm unit tests (với mocks) và integration tests (với real backend).

**Architecture:** Test theo 2 layers:
1. **Unit Tests** - Mock ApiClient, test business logic của service
2. **Integration Tests** - Test against real backend với test data

**Tech Stack:** Flutter test, mockito, http mock server

---

## 1. API Services Inventory

| Service | File | Endpoints | Priority |
|---------|------|-----------|----------|
| `AuthService` | `auth_service.dart` | login, register, forgotPassword, getMe | HIGH |
| `ExamService` | `exam_service.dart` | getExams, getExamById, createExam, updateExam, publishExam, completeExam, getExamVersions | HIGH |
| `ClassService` | `class_service.dart` | getClasses, getClassById, getStudentsByClass, createClass | HIGH |
| `SubmissionService` | `submission_service.dart` | getSubmissions, scanSubmission, getExamStatistics | HIGH |
| `OMRTemplateService` | `omr_template_service.dart` | getTemplateJsonForExam, uploadScannedImage, getAll | HIGH |
| `QuestionService` | `question_service.dart` | (to explore) | MEDIUM |
| `UserService` | `user_service.dart` | (to explore) | MEDIUM |

---

## 2. File Structure

```
client/mobile/test/core/network/
├── auth_service_test.dart                    [NEW] - Unit tests
├── auth_service_integration_test.dart        [NEW] - Integration tests
├── exam_service_test.dart                   [EXISTS - ENHANCE]
├── exam_service_integration_test.dart        [NEW]
├── class_service_test.dart                  [NEW]
├── class_service_integration_test.dart       [NEW]
├── submission_service_test.dart              [NEW]
├── submission_service_integration_test.dart   [NEW]
├── omr_template_service_test.dart            [NEW]
├── omr_template_service_integration_test.dart [NEW]
└── mock/
    └── mock_api_server.dart                  [NEW] - HTTP mock server setup
```

---

## 3. Unit Test Pattern

### 3.1 MockApiClient Pattern

```dart
// test/core/network/mock_api_client.dart

import 'package:smart_grading_mobile/core/network/api_client.dart';

class MockApiClient extends ApiClient {
  MockApiClient({this.mockResponse, this.shouldThrow = false, this.errorType});

  final Map<String, dynamic>? mockResponse;
  final bool shouldThrow;
  final String? errorType;

  String? lastPath;
  Map<String, dynamic>? lastQuery;
  dynamic lastBody;
  List<dynamic> callHistory = [];

  @override
  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? parser,
  }) async {
    lastPath = path;
    lastQuery = queryParameters;
    callHistory.add({'method': 'GET', 'path': path, 'query': queryParameters});

    if (shouldThrow) {
      throw _createError();
    }
    return parser != null ? parser(mockResponse!) : mockResponse as T;
  }

  @override
  Future<T> post<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? parser,
  }) async {
    lastPath = path;
    lastBody = data;
    callHistory.add({'method': 'POST', 'path': path, 'body': data});

    if (shouldThrow) {
      throw _createError();
    }
    return parser != null ? parser(mockResponse!) : mockResponse as T;
  }

  Exception _createError() {
    switch (errorType) {
      case 'network':
        return NetworkException(message: 'Connection timeout');
      case 'auth':
        return AuthException(message: 'Unauthorized');
      case 'api':
        return ApiException(message: 'Server error', statusCode: 500);
      default:
        return AppException(message: 'Unknown error');
    }
  }
}
```

---

## 4. Tasks

### Task 1: AuthService Unit Tests

**Files:**
- Create: `client/mobile/test/core/network/auth_service_test.dart`
- Modify: `client/mobile/lib/core/network/auth_service.dart` (reference)

- [ ] **Step 1: Write failing test - login success**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/network/auth_service.dart';
import 'package:smart_grading_mobile/domain/entities/user.entity.dart';
import 'mock_api_client.dart';

void main() {
  group('AuthService.login', () {
    test('returns AuthResponse on successful login', () async {
      final mockClient = MockApiClient(mockResponse: {
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
      });

      final service = AuthService(apiClient: mockClient);
      final result = await service.login(
        email: 'teacher@example.com',
        password: 'password123',
      );

      expect(result.user.name, 'Nguyen Van A');
      expect(result.user.email, 'teacher@example.com');
      expect(result.accessToken, 'access-token-123');
      expect(result.refreshToken, 'refresh-token-456');
      expect(mockClient.lastPath, '/auth/login');
      expect(mockClient.lastBody, {
        'email': 'teacher@example.com',
        'password': 'password123',
      });
    });
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/mobile && flutter test test/core/network/auth_service_test.dart`

Expected: FAIL - File not found

- [ ] **Step 3: Create mock_api_client.dart**

```dart
import 'package:smart_grading_mobile/core/network/api_client.dart';
import 'package:smart_grading_mobile/core/errors/app_exceptions.dart';

class MockApiClient extends ApiClient {
  MockApiClient({this.mockResponse, this.shouldThrow = false, this.errorType});

  final Map<String, dynamic>? mockResponse;
  final bool shouldThrow;
  final String? errorType;

  String? lastPath;
  Map<String, dynamic>? lastQuery;
  dynamic lastBody;

  @override
  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? parser,
  }) async {
    lastPath = path;
    lastQuery = queryParameters;
    if (shouldThrow) throw _createError();
    return parser != null ? parser(mockResponse!) : mockResponse as T;
  }

  @override
  Future<T> post<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? parser,
  }) async {
    lastPath = path;
    lastBody = data;
    if (shouldThrow) throw _createError();
    return parser != null ? parser(mockResponse!) : mockResponse as T;
  }

  Exception _createError() {
    switch (errorType) {
      case 'network':
        return NetworkException(message: 'Connection timeout');
      case 'auth':
        return AuthException(message: 'Unauthorized');
      case 'api':
        return ApiException(message: 'Server error', statusCode: 500);
      default:
        return AppException(message: 'Unknown error');
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client/mobile && flutter test test/core/network/auth_service_test.dart`

Expected: PASS

- [ ] **Step 5: Add login failure test**

```dart
test('throws AuthException on invalid credentials', () async {
  final mockClient = MockApiClient(
    shouldThrow: true,
    errorType: 'auth',
  );

  final service = AuthService(apiClient: mockClient);

  expect(
    () => service.login(email: 'wrong@test.com', password: 'wrong'),
    throwsA(isA<AuthException>()),
  );
});
```

- [ ] **Step 6: Add getMe test**

```dart
group('AuthService.getMe', () {
  test('returns User from /auth/me endpoint', () async {
    final mockClient = MockApiClient(mockResponse: {
      'user': {
        '_id': 'user-1',
        'name': 'Nguyen Van A',
        'email': 'teacher@example.com',
        'role': 'teacher',
      },
    });

    final service = AuthService(apiClient: mockClient);
    final result = await service.getMe();

    expect(result.name, 'Nguyen Van A');
    expect(mockClient.lastPath, '/auth/me');
  });
});
```

- [ ] **Step 7: Run all auth tests**

Run: `cd client/mobile && flutter test test/core/network/auth_service_test.dart`

Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add client/mobile/test/core/network/auth_service_test.dart client/mobile/test/core/network/mock_api_client.dart
git commit -m "test: add AuthService unit tests"
```

---

### Task 2: ExamService Unit Tests (Enhance existing)

**Files:**
- Modify: `client/mobile/test/core/network/exam_service_test.dart` (exists)
- Create: `client/mobile/test/core/network/exam_service_test.dart` (complete rewrite)

- [ ] **Step 1: Write failing test - getExams with filters**

```dart
test('getExams sends correct query parameters for filters', () async {
  final mockClient = MockApiClient(mockResponse: {
    'results': <Map<String, dynamic>>[],
    'page': 1,
    'limit': 20,
    'total': 0,
    'pages': 1,
  });

  final service = ExamService(apiClient: mockClient);
  await service.getExams(
    page: 2,
    classId: 'class-123',
    status: 'published',
    search: 'math',
  );

  expect(mockClient.lastPath, '/exams');
  expect(mockClient.lastQuery?['page'], 2);
  expect(mockClient.lastQuery?['classId'], 'class-123');
  expect(mockClient.lastQuery?['status'], 'published');
  expect(mockClient.lastQuery?['search'], 'math');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/mobile && flutter test test/core/network/exam_service_test.dart -N "getExams sends correct query parameters"`

Expected: FAIL - method not defined

- [ ] **Step 3: Add getExams method to test file (copy from service)**

Add complete test for all ExamService methods:

```dart
// Add to existing test file:
group('ExamService.getExams', () {
  test('parses paginated results correctly', () async {
    final mockClient = MockApiClient(mockResponse: {
      'results': [
        {
          '_id': 'exam-1',
          'title': 'Math Final Exam',
          'status': 'published',
          'examDate': '2026-06-20T07:00:00.000Z',
        },
        {
          '_id': 'exam-2',
          'title': 'Physics Quiz',
          'status': 'draft',
          'examDate': '2026-06-25T09:00:00.000Z',
        },
      ],
      'page': 1,
      'limit': 20,
      'total': 2,
      'pages': 1,
    });

    final service = ExamService(apiClient: mockClient);
    final result = await service.getExams();

    expect(result.results, hasLength(2));
    expect(result.results.first.title, 'Math Final Exam');
    expect(result.total, 2);
    expect(result.pages, 1);
  });
});

group('ExamService.getExamById', () {
  test('returns single exam by id', () async {
    final mockClient = MockApiClient(mockResponse: {
      '_id': 'exam-1',
      'title': 'Math Final Exam',
      'status': 'published',
    });

    final service = ExamService(apiClient: mockClient);
    final result = await service.getExamById('exam-1');

    expect(result.id, 'exam-1');
    expect(result.title, 'Math Final Exam');
    expect(mockClient.lastPath, '/exams/exam-1');
  });
});

group('ExamService.createExam', () {
  test('sends correct data and returns created exam', () async {
    final mockClient = MockApiClient(mockResponse: {
      '_id': 'exam-new',
      'title': 'New Exam',
      'status': 'draft',
    });

    final service = ExamService(apiClient: mockClient);
    final result = await service.createExam(
      title: 'New Exam',
      classIds: ['class-1'],
    );

    expect(result.id, 'exam-new');
    expect(mockClient.lastPath, '/exams');
    expect(mockClient.lastBody['title'], 'New Exam');
    expect(mockClient.lastBody['classIds'], ['class-1']);
  });
});

group('ExamService.publishExam', () {
  test('calls publish endpoint and returns updated exam', () async {
    final mockClient = MockApiClient(mockResponse: {
      '_id': 'exam-1',
      'title': 'Math Exam',
      'status': 'published',
    });

    final service = ExamService(apiClient: mockClient);
    final result = await service.publishExam('exam-1');

    expect(result.status, 'published');
    expect(mockClient.lastPath, '/exams/exam-1/publish');
  });
});
```

- [ ] **Step 4: Run all exam tests**

Run: `cd client/mobile && flutter test test/core/network/exam_service_test.dart`

Expected: All PASS

- [ ] **Step 5: Add error handling tests**

```dart
group('ExamService error handling', () {
  test('getExamById throws ApiException on 404', () async {
    final mockClient = MockApiClient(
      shouldThrow: true,
      errorType: 'api',
    );

    final service = ExamService(apiClient: mockClient);

    expect(
      () => service.getExamById('nonexistent'),
      throwsA(isA<ApiException>()),
    );
  });

  test('getExams throws NetworkException on timeout', () async {
    final mockClient = MockApiClient(
      shouldThrow: true,
      errorType: 'network',
    );

    final service = ExamService(apiClient: mockClient);

    expect(
      () => service.getExams(),
      throwsA(isA<NetworkException>()),
    );
  });
});
```

- [ ] **Step 6: Commit**

```bash
git add client/mobile/test/core/network/exam_service_test.dart
git commit -m "test: enhance ExamService unit tests with full coverage"
```

---

### Task 3: ClassService Unit Tests

**Files:**
- Create: `client/mobile/test/core/network/class_service_test.dart`

- [ ] **Step 1: Write failing test - getClasses**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/network/class_service.dart';
import 'mock_api_client.dart';

void main() {
  group('ClassService', () {
    late MockApiClient mockClient;
    late ClassService service;

    setUp(() {
      mockClient = MockApiClient();
      service = ClassService(apiClient: mockClient);
    });

    group('getClasses', () {
      test('returns paginated classes', () async {
        mockClient.mockResponse = {
          'results': [
            {
              '_id': 'class-1',
              'name': '10A1',
              'code': '10A1',
              'gradeLevel': 10,
            },
            {
              '_id': 'class-2',
              'name': '10A2',
              'code': '10A2',
              'gradeLevel': 10,
            },
          ],
          'page': 1,
          'limit': 20,
          'total': 2,
          'pages': 1,
        };

        final result = await service.getClasses();

        expect(result.results, hasLength(2));
        expect(result.results.first.name, '10A1');
        expect(result.total, 2);
      });

      test('sends gradeLevel filter when provided', () async {
        mockClient.mockResponse = {
          'results': <Map<String, dynamic>>[],
          'page': 1,
          'limit': 20,
          'total': 0,
          'pages': 1,
        };

        await service.getClasses(gradeLevel: 10);

        expect(mockClient.lastQuery?['gradeLevel'], 10);
      });
    });

    group('getStudentsByClass', () {
      test('returns students list from class endpoint', () async {
        mockClient.mockResponse = {
          'results': [
            {
              '_id': 'student-1',
              'name': 'Nguyen Van A',
              'studentCode': 'SV001',
            },
            {
              '_id': 'student-2',
              'name': 'Tran Thi B',
              'studentCode': 'SV002',
            },
          ],
        };

        final result = await service.getStudentsByClass('class-1');

        expect(result, hasLength(2));
        expect(result.first.name, 'Nguyen Van A');
        expect(result.first.studentCode, 'SV001');
        expect(mockClient.lastPath, '/classes/class-1/students');
      });
    });

    group('createClass', () {
      test('sends correct data and returns created class', () async {
        mockClient.mockResponse = {
          '_id': 'class-new',
          'name': '11A1',
          'code': '11A1',
          'gradeLevel': 11,
          'academicYear': '2025-2026',
        };

        final result = await service.createClass(
          name: '11A1',
          code: '11A1',
          gradeLevel: 11,
          academicYear: '2025-2026',
        );

        expect(result.id, 'class-new');
        expect(result.name, '11A1');
        expect(mockClient.lastBody['gradeLevel'], 11);
      });
    });
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/mobile && flutter test test/core/network/class_service_test.dart`

Expected: FAIL - File not found

- [ ] **Step 3: Create test file**

Create the file with content from Step 1

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client/mobile && flutter test test/core/network/class_service_test.dart`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/mobile/test/core/network/class_service_test.dart
git commit -m "test: add ClassService unit tests"
```

---

### Task 4: SubmissionService Unit Tests

**Files:**
- Create: `client/mobile/test/core/network/submission_service_test.dart`

- [ ] **Step 1: Write failing test - getSubmissions**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/network/submission_service.dart';
import 'mock_api_client.dart';

void main() {
  group('SubmissionService', () {
    late MockApiClient mockClient;
    late SubmissionService service;

    setUp(() {
      mockClient = MockApiClient();
      service = SubmissionService(apiClient: mockClient);
    });

    group('getSubmissions', () {
      test('returns paginated submissions with filters', () async {
        mockClient.mockResponse = {
          'results': [
            {
              '_id': 'sub-1',
              'examId': 'exam-1',
              'score': 8,
              'maxScore': 10,
              'status': 'graded',
            },
          ],
          'page': 1,
          'limit': 20,
          'total': 1,
          'pages': 1,
        };

        final result = await service.getSubmissions(examId: 'exam-1');

        expect(result.results, hasLength(1));
        expect(result.results.first.score, 8);
        expect(mockClient.lastQuery?['examId'], 'exam-1');
      });

      test('filters by studentId when provided', () async {
        mockClient.mockResponse = {
          'results': <Map<String, dynamic>>[],
          'page': 1,
          'limit': 20,
          'total': 0,
          'pages': 1,
        };

        await service.getSubmissions(studentId: 'student-1');

        expect(mockClient.lastQuery?['studentId'], 'student-1');
      });
    });

    group('getExamStatistics', () {
      test('returns statistics for an exam', () async {
        mockClient.mockResponse = {
          '_id': 'exam-1',
          'averageScore': 7.5,
          'highestScore': 10,
          'lowestScore': 3,
          'totalSubmissions': 30,
        };

        final result = await service.getExamStatistics('exam-1');

        expect(result.averageScore, 7.5);
        expect(result.totalSubmissions, 30);
        expect(mockClient.lastPath, '/exams/exam-1/submissions/statistics');
      });
    });

    group('scanSubmission', () {
      test('sends examId and imagePath', () async {
        mockClient.mockResponse = {
          '_id': 'sub-new',
          'examId': 'exam-1',
          'status': 'graded',
        };

        final result = await service.scanSubmission(
          examId: 'exam-1',
          imagePath: '/path/to/image.jpg',
        );

        expect(result.id, 'sub-new');
        expect(mockClient.lastPath, '/submissions/scan');
        expect(mockClient.lastBody['examId'], 'exam-1');
        expect(mockClient.lastBody['image'], '/path/to/image.jpg');
      });
    });
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/mobile && flutter test test/core/network/submission_service_test.dart`

Expected: FAIL

- [ ] **Step 3: Create test file**

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client/mobile && flutter test test/core/network/submission_service_test.dart`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/mobile/test/core/network/submission_service_test.dart
git commit -m "test: add SubmissionService unit tests"
```

---

### Task 5: OMRTemplateService Unit Tests

**Files:**
- Create: `client/mobile/test/core/network/omr_template_service_test.dart`

- [ ] **Step 1: Write failing test - getTemplateJsonForExam**

```dart
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/network/omr_template_service.dart';
import 'mock_api_client.dart';

void main() {
  group('OMRTemplateService', () {
    late MockApiClient mockClient;
    late OMRTemplateService service;

    setUp(() {
      mockClient = MockApiClient();
      service = OMRTemplateService(apiClient: mockClient);
    });

    group('getTemplateJsonForExam', () {
      test('returns template JSON for exam', () async {
        mockClient.mockResponse = {
          'data': {
            'questions': 20,
            'options': 4,
            'answers': {'1': 'A', '2': 'B', '3': 'C'},
          },
        };

        final result = await service.getTemplateJsonForExam('exam-1');

        expect(result['questions'], 20);
        expect(result['options'], 4);
        expect(result['answers'], isNotNull);
        expect(mockClient.lastPath, '/omr-templates/exam/exam-1/json');
      });
    });

    group('getEvaluationForExam', () {
      test('returns evaluation config', () async {
        mockClient.mockResponse = {
          'data': {
            'examId': 'exam-1',
            'totalScore': 10,
            'passingScore': 5,
          },
        };

        final result = await service.getEvaluationForExam('exam-1');

        expect(result.examId, 'exam-1');
        expect(result.totalScore, 10);
        expect(result.passingScore, 5);
        expect(mockClient.lastPath, '/exams/exam-1/evaluation');
      });
    });

    group('uploadScannedImage', () {
      test('sends form data with image and answers', () async {
        mockClient.mockResponse = {
          'success': true,
          'submissionId': 'sub-1',
        };

        final imageBytes = Uint8List.fromList([1, 2, 3]);
        final result = await service.uploadScannedImage(
          examId: 'exam-1',
          imageBytes: imageBytes,
          answers: {'1': 'A', '2': 'B'},
          score: 8.0,
          maxScore: 10.0,
        );

        expect(result['success'], true);
        expect(result['submissionId'], 'sub-1');
      });
    });

    group('getAll', () {
      test('returns list of OMR templates', () async {
        mockClient.mockResponse = {
          'data': [
            {
              '_id': 'template-1',
              'name': 'Standard A4',
              'questions': 50,
            },
          ],
        };

        final result = await service.getAll();

        expect(result, hasLength(1));
        expect(result.first.name, 'Standard A4');
        expect(mockClient.lastPath, '/omr-templates');
      });
    });
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/mobile && flutter test test/core/network/omr_template_service_test.dart`

Expected: FAIL

- [ ] **Step 3: Create test file**

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client/mobile && flutter test test/core/network/omr_template_service_test.dart`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/mobile/test/core/network/omr_template_service_test.dart
git commit -m "test: add OMRTemplateService unit tests"
```

---

### Task 6: Integration Test Setup

**Files:**
- Create: `client/mobile/test/core/network/integration_test_helper.dart`
- Create: `client/mobile/test/core/network/auth_service_integration_test.dart`
- Create: `client/mobile/test/core/network/exam_service_integration_test.dart`

- [ ] **Step 1: Create integration test helper**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/config/environment.dart';
import 'package:smart_grading_mobile/core/network/api_client.dart';

class IntegrationTestHelper {
  static ApiClient createClient() {
    // Use actual base URL for integration tests
    // Set BASE_URL environment variable or use staging server
    final baseUrl = EnvironmentConfig.apiBaseUrl;
    final client = ApiClient();
    // For integration tests, we need real token
    // Set TEST_TOKEN environment variable
    return client;
  }

  static bool get isIntegrationMode {
    return const bool.fromEnvironment('INTEGRATION_TEST', defaultValue: false);
  }

  static String? get testToken {
    return const String.fromEnvironment('TEST_TOKEN', defaultValue: '');
  }
}

// Skip integration tests unless running with INTEGRATION_TEST=true
void integrationTest(
  String description,
  Future<void> Function() body, {
  bool skip = !const bool.fromEnvironment('INTEGRATION_TEST', defaultValue: false),
}) {
  test(
    description,
    () async {
      if (!IntegrationTestHelper.isIntegrationMode) {
        return;
      }
      await body();
    },
    skip: skip,
  );
}
```

- [ ] **Step 2: Create AuthService integration test**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/network/auth_service.dart';
import 'package:smart_grading_mobile/core/config/environment.dart';

void main() {
  // Only run if INTEGRATION_TEST=true and TEST_TOKEN is set
  final isEnabled = const bool.fromEnvironment('INTEGRATION_TEST', defaultValue: false);
  final testToken = const String.fromEnvironment('TEST_TOKEN', defaultValue: '');

  group('AuthService Integration Tests', skip: !isEnabled, () {
    late ApiClient client;
    late AuthService service;

    setUp(() {
      client = ApiClient();
      if (testToken.isNotEmpty) {
        client.setToken(testToken);
      }
      service = AuthService(apiClient: client);
    });

    test('getMe returns current user', () async {
      final user = await service.getMe();
      expect(user.id, isNotEmpty);
      expect(user.email, isNotEmpty);
    });
  });
}
```

- [ ] **Step 3: Create ExamService integration test**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/network/exam_service.dart';
import 'package:smart_grading_mobile/core/config/environment.dart';

void main() {
  final isEnabled = const bool.fromEnvironment('INTEGRATION_TEST', defaultValue: false);
  final testToken = const String.fromEnvironment('TEST_TOKEN', defaultValue: '');

  group('ExamService Integration Tests', skip: !isEnabled, () {
    late ApiClient client;
    late ExamService service;

    setUp(() {
      client = ApiClient();
      if (testToken.isNotEmpty) {
        client.setToken(testToken);
      }
      service = ExamService(apiClient: client);
    });

    test('getExams returns paginated list', () async {
      final result = await service.getExams();
      expect(result.results, isNotNull);
      expect(result.page, 1);
    });

    test('getExams with class filter works', () async {
      final result = await service.getExams(classId: 'test-class-id');
      expect(result.results, isA<List>());
    });

    test('getExamById returns single exam', () async {
      // First get list to find an exam ID
      final list = await service.getExams(limit: 1);
      if (list.results.isEmpty) {
        return; // Skip if no exams
      }
      final examId = list.results.first.id;
      final exam = await service.getExamById(examId);
      expect(exam.id, examId);
    });
  });
}
```

- [ ] **Step 4: Document how to run integration tests**

Create README in test folder:

```markdown
# Integration Tests

## Setup

1. Start the backend server
2. Get a valid auth token (login via API or extract from browser)
3. Run tests with environment variables:

```bash
cd client/mobile

# Run all tests (unit only by default)
flutter test

# Run with integration tests
flutter test --define=INTEGRATION_TEST=true --define=TEST_TOKEN=your_token_here

# Run only integration tests
flutter test --define=INTEGRATION_TEST=true --define=TEST_TOKEN=your_token_here test/core/network/*_integration_test.dart
```

## Test Data Requirements

- A test user account with teacher role
- At least one exam in the system
- At least one class with students
```

- [ ] **Step 5: Commit**

```bash
git add client/mobile/test/core/network/integration_test_helper.dart
git add client/mobile/test/core/network/*_integration_test.dart
git add client/mobile/test/core/network/README.md
git commit -m "test: add integration test infrastructure"
```

---

### Task 7: Run All Tests & Coverage Report

**Files:**
- Modify: `client/mobile/test/all_services_test.dart` (create汇总)

- [ ] **Step 1: Create comprehensive test runner**

```dart
// client/mobile/test/all_services_test.dart
// This file runs all service tests together for CI/CD

import 'package:flutter_test/flutter_test.dart';

import 'core/network/auth_service_test.dart' as auth_tests;
import 'core/network/exam_service_test.dart' as exam_tests;
import 'core/network/class_service_test.dart' as class_tests;
import 'core/network/submission_service_test.dart' as submission_tests;
import 'core/network/omr_template_service_test.dart' as omr_template_tests;

void main() {
  group('All Service Tests', () {
    auth_tests.main();
    exam_tests.main();
    class_tests.main();
    submission_tests.main();
    omr_template_tests.main();
  });
}
```

- [ ] **Step 2: Run all unit tests with coverage**

```bash
cd client/mobile
flutter test --coverage test/core/network/
```

- [ ] **Step 3: Verify coverage report generated**

Expected: HTML coverage report in `coverage/` directory

- [ ] **Step 4: Commit**

```bash
git add client/mobile/test/all_services_test.dart
git commit -m "test: add comprehensive test runner for all services"
```

---

## 5. Summary

| Task | Tests | File Changes |
|------|-------|--------------|
| Task 1: AuthService | 4 tests | auth_service_test.dart, mock_api_client.dart |
| Task 2: ExamService | 7 tests | exam_service_test.dart (enhanced) |
| Task 3: ClassService | 5 tests | class_service_test.dart |
| Task 4: SubmissionService | 4 tests | submission_service_test.dart |
| Task 5: OMRTemplateService | 4 tests | omr_template_service_test.dart |
| Task 6: Integration Tests | 4+ tests | integration_test_helper.dart, *_integration_test.dart |
| Task 7: Coverage | CI/CD | all_services_test.dart |

**Total: ~28+ tests covering all major API services**

---

## 6. Running Tests

```bash
cd client/mobile

# Unit tests only (default)
flutter test test/core/network/

# Unit tests with coverage
flutter test --coverage test/core/network/

# Integration tests (requires backend running)
flutter test --define=INTEGRATION_TEST=true --define=TEST_TOKEN=your_token test/core/network/*_integration_test.dart

# All tests
flutter test
```
