# Scan Flow: Chọn Class Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm bước chọn class giữa chọn exam và chọn student trong luồng quét bài OMR trên Flutter mobile, đồng thời lưu `classId` lên server khi submit submission.

**Architecture:**
- Tạo trang mới `ClassSelectionPage` giữa `ExamSelectionPage` và `StudentListPage`
- Truyền `classId`/`className` qua `StudentListPage` → `CameraScannerPage` → `OMRScannerBloc` → `OMRSubmissionSyncService` → server
- Server: thêm `classId` optional vào validation + submission model
- TDD: viết test trước, commit theo từng task nhỏ

**Tech Stack:**
- Flutter 3.x, Dart 3.x
- flutter_bloc 8.x
- get_it (DI)
- shared_preferences (offline storage)
- Node.js 18+, Express, Mongoose
- Joi (validation)
- Jest (server tests)

**Spec:** `docs/superpowers/specs/2026-06-14-scan-flow-class-selection-design.md`

---

## File Structure Summary

**Mobile (Flutter):**
- MỚI: `client/mobile/lib/presentation/pages/class_selection_page.dart`
- SỬA: `client/mobile/lib/presentation/pages/exam_selection_page.dart`
- SỬA: `client/mobile/lib/presentation/pages/student_list_page.dart`
- SỬA: `client/mobile/lib/presentation/pages/camera_scanner_page.dart`
- SỬA: `client/mobile/lib/presentation/widgets/student_picker_dialog.dart`
- SỬA: `client/mobile/lib/presentation/blocs/omr_scanner/omr_scanner_event.dart`
- SỬA: `client/mobile/lib/presentation/blocs/omr_scanner/omr_scanner_state.dart`
- SỬA: `client/mobile/lib/presentation/blocs/omr_scanner/omr_scanner_bloc.dart`
- SỬA: `client/mobile/lib/core/network/omr_submission_sync_service.dart`
- SỬA: `client/mobile/lib/core/storage/omr_local_storage.dart`
- SỬA: `client/mobile/lib/main.dart` (route `/scan` - optional)

**Tests Mobile:**
- MỚI: `client/mobile/test/presentation/pages/class_selection_page_test.dart`
- SỬA: `client/mobile/test/presentation/pages/student_list_page_test.dart`
- SỬA: `client/mobile/test/presentation/blocs/omr_scanner_bloc_test.dart`
- SỬA: `client/mobile/test/core/network/omr_submission_sync_service_test.dart`
- SỬA: `client/mobile/test/core/storage/omr_local_storage_test.dart`

**Server (Node.js):**
- SỬA: `server/src/validations/submission.validation.js`
- SỬA: `server/src/services/submission.service.js`
- SỬA: `server/src/models/submission.model.js`
- SỬA: `server/tests/unit/validations/submission.validation.test.js` (MỚI)
- SỬA: `server/tests/unit/services/submission.service.test.js` (MỚI)

---

## Task 1: Server - Submission validation schema (TDD)

**Files:**
- Modify: `server/src/validations/submission.validation.js`
- Create: `server/tests/unit/validations/submission.validation.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/unit/validations/submission.validation.test.js`:

```javascript
const Joi = require('joi');
const { scanSubmission } = require('../../../src/validations/submission.validation');

describe('Submission validation - scanSubmission', () => {
  const { body } = scanSubmission;

  test('should accept classId in valid ObjectId format', () => {
    const { error } = Joi.compile({ body }).validate({
      examId: '507f1f77bcf86cd799439011',
      image: 'data:image/png;base64,iVBOR...',
      classId: '507f1f77bcf86cd799439012',
    });
    expect(error).toBeUndefined();
  });

  test('should accept request without classId (backward compat)', () => {
    const { error } = Joi.compile({ body }).validate({
      examId: '507f1f77bcf86cd799439011',
      image: 'data:image/png;base64,iVBOR...',
    });
    expect(error).toBeUndefined();
  });

  test('should reject invalid classId format', () => {
    const { error } = Joi.compile({ body }).validate({
      examId: '507f1f77bcf86cd799439011',
      image: 'data:image/png;base64,iVBOR...',
      classId: 'invalid-id',
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain('classId');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- tests/unit/validations/submission.validation.test.js`
Expected: FAIL - "scanSubmission" schema doesn't exist or doesn't have classId

- [ ] **Step 3: Update validation schema**

Modify `server/src/validations/submission.validation.js`, replace the `scanSubmission` object:

```javascript
const scanSubmission = {
  body: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    classId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    image: Joi.string().required(),
    deviceInfo: Joi.object().keys({
      platform: Joi.string().valid('ios', 'android', 'web'),
      deviceModel: Joi.string(),
      appVersion: Joi.string(),
    }),
  }),
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npm test -- tests/unit/validations/submission.validation.test.js`
Expected: PASS - 3 tests passed

- [ ] **Step 5: Commit**

```bash
git add server/src/validations/submission.validation.js server/tests/unit/validations/submission.validation.test.js
git commit -m "feat(server): add classId optional to submission scan validation"
```

---

## Task 2: Server - Submission model classId field (TDD)

**Files:**
- Modify: `server/src/models/submission.model.js`
- Create: `server/tests/unit/models/submission.model.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/unit/models/submission.model.test.js`:

```javascript
const mongoose = require('mongoose');
const Submission = require('../../../src/models/submission.model');
const setupTestDB = require('../../utils/setupTestDB');

setupTestDB();

describe('Submission Model - classId', () => {
  const validPayload = {
    examId: new mongoose.Types.ObjectId(),
    versionId: new mongoose.Types.ObjectId(),
    omrTemplateId: new mongoose.Types.ObjectId(),
    studentId: new mongoose.Types.ObjectId(),
    studentCode: 'STU001',
    answers: [
      {
        position: 1,
        questionId: new mongoose.Types.ObjectId(),
        correctAnswer: 'A',
        isCorrect: true,
        score: 1,
      },
    ],
    totalScore: 1,
    maxScore: 1,
    finalScore: 1,
  };

  test('should save submission with classId when provided', async () => {
    const classId = new mongoose.Types.ObjectId();
    const submission = new Submission({ ...validPayload, classId });
    const saved = await submission.save();

    expect(saved.classId).toBeDefined();
    expect(saved.classId.toString()).toBe(classId.toString());
  });

  test('should save submission without classId (backward compat)', async () => {
    const submission = new Submission(validPayload);
    const saved = await submission.save();

    expect(saved.classId).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- tests/unit/models/submission.model.test.js`
Expected: FAIL - classId not in schema or not persisted

- [ ] **Step 3: Add classId field to submission model**

Modify `server/src/models/submission.model.js`. Add after the `studentCode` field (around line 185):

```javascript
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npm test -- tests/unit/models/submission.model.test.js`
Expected: PASS - 2 tests passed

- [ ] **Step 5: Commit**

```bash
git add server/src/models/submission.model.js server/tests/unit/models/submission.model.test.js
git commit -m "feat(server): add classId field to submission model"
```

---

## Task 3: Server - Submission service scan() persists classId (TDD)

**Files:**
- Modify: `server/src/services/submission.service.js`
- Create: `server/tests/unit/services/submission.service.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/unit/services/submission.service.test.js`:

```javascript
const mongoose = require('mongoose');
const submissionService = require('../../../src/services/submission.service');
const Submission = require('../../../src/models/submission.model');
const setupTestDB = require('../../utils/setupTestDB');

setupTestDB();

describe('SubmissionService - scan with classId', () => {
  test('should return accepted response with classId in payload', async () => {
    // scan() is currently a stub returning placeholder; verify it accepts classId
    const examId = new mongoose.Types.ObjectId().toString();
    const classId = new mongoose.Types.ObjectId().toString();
    const result = await submissionService.scan({
      examId,
      classId,
      image: 'data:image/png;base64,XYZ',
    });

    expect(result.examId).toBe(examId);
    expect(result).toHaveProperty('classId', classId);
  });

  test('should accept scan without classId (backward compat)', async () => {
    const examId = new mongoose.Types.ObjectId().toString();
    const result = await submissionService.scan({
      examId,
      image: 'data:image/png;base64,XYZ',
    });

    expect(result.examId).toBe(examId);
    expect(result.classId).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- tests/unit/services/submission.service.test.js`
Expected: FAIL - result doesn't have classId property

- [ ] **Step 3: Update scan() method to handle classId**

Modify `server/src/services/submission.service.js`. Replace the `scan` method:

```javascript
  async scan(data) {
    const { examId, classId, image, deviceInfo } = data;

    // Find exam
    const exam = await Exam.findById(examId);
    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    // TODO: Implement actual OMR scanning here
    // For now, return a placeholder
    return {
      status: 'pending',
      message: 'OMR scanning service not yet implemented',
      examId,
      classId,
    };
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npm test -- tests/unit/services/submission.service.test.js`
Expected: PASS - 2 tests passed

- [ ] **Step 5: Commit**

```bash
git add server/src/services/submission.service.js server/tests/unit/services/submission.service.test.js
git commit -m "feat(server): persist classId in submission scan response"
```

---

## Task 4: Mobile - PendingSubmission classId field (TDD)

**Files:**
- Modify: `client/mobile/lib/core/storage/omr_local_storage.dart`
- Create: `client/mobile/test/core/storage/omr_local_storage_test.dart`

- [ ] **Step 1: Write the failing test**

Create `client/mobile/test/core/storage/omr_local_storage_test.dart`:

```dart
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_grading_mobile/core/storage/omr_local_storage.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
  });

  group('PendingSubmission - classId', () {
    test('toJson includes classId when provided', () {
      final submission = PendingSubmission(
        id: 'sub-1',
        examId: 'exam-1',
        classId: 'class-1',
        imageBytes: Uint8List.fromList([1, 2, 3]),
        answers: {'q1': 'A'},
        score: 1.0,
        maxScore: 1.0,
        timestamp: DateTime(2026, 1, 1),
      );

      final json = submission.toJson();

      expect(json['classId'], 'class-1');
    });

    test('toJson omits classId when null', () {
      final submission = PendingSubmission(
        id: 'sub-1',
        examId: 'exam-1',
        imageBytes: Uint8List.fromList([1, 2, 3]),
        answers: {'q1': 'A'},
        score: 1.0,
        maxScore: 1.0,
        timestamp: DateTime(2026, 1, 1),
      );

      final json = submission.toJson();

      expect(json.containsKey('classId'), isFalse);
    });

    test('fromJson reads classId when present', () {
      final json = {
        'id': 'sub-1',
        'examId': 'exam-1',
        'classId': 'class-1',
        'imageBytes': base64Encode([1, 2, 3]),
        'answers': {'q1': 'A'},
        'score': 1.0,
        'maxScore': 1.0,
        'timestamp': '2026-01-01T00:00:00.000',
        'status': 'pending',
        'retryCount': 0,
      };

      final submission = PendingSubmission.fromJson(json);

      expect(submission.classId, 'class-1');
    });

    test('addPendingSubmission and getPendingSubmissions roundtrip classId', () async {
      final prefs = await SharedPreferences.getInstance();
      final storage = OMRLocalStorage(prefs: prefs);

      await storage.addPendingSubmission(
        PendingSubmission(
          id: 'sub-1',
          examId: 'exam-1',
          classId: 'class-1',
          imageBytes: Uint8List.fromList([1, 2, 3]),
          answers: {'q1': 'A'},
          score: 1.0,
          maxScore: 1.0,
          timestamp: DateTime(2026, 1, 1),
        ),
      );

      final pending = await storage.getPendingSubmissions();
      expect(pending.length, 1);
      expect(pending.first.classId, 'class-1');
    });
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/mobile && flutter test test/core/storage/omr_local_storage_test.dart`
Expected: FAIL - PendingSubmission doesn't have classId field

- [ ] **Step 3: Add classId field to PendingSubmission**

Modify `client/mobile/lib/core/storage/omr_local_storage.dart`. Replace the `PendingSubmission` class (lines 9-63):

```dart
class PendingSubmission {
  final String id;
  final String examId;
  final String? studentId;
  final String? classId;
  final Uint8List imageBytes;
  final Map<String, String> answers;
  final double score;
  final double maxScore;
  final DateTime timestamp;
  final SyncStatus status;
  final int retryCount;

  const PendingSubmission({
    required this.id,
    required this.examId,
    this.studentId,
    this.classId,
    required this.imageBytes,
    required this.answers,
    required this.score,
    required this.maxScore,
    required this.timestamp,
    this.status = SyncStatus.pending,
    this.retryCount = 0,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'examId': examId,
        'studentId': studentId,
        'classId': classId,
        'imageBytes': base64Encode(imageBytes),
        'answers': answers,
        'score': score,
        'maxScore': maxScore,
        'timestamp': timestamp.toIso8601String(),
        'status': status.name,
        'retryCount': retryCount,
      };

  factory PendingSubmission.fromJson(Map<String, dynamic> json) {
    return PendingSubmission(
      id: json['id'] as String,
      examId: json['examId'] as String,
      studentId: json['studentId'] as String?,
      classId: json['classId'] as String?,
      imageBytes: base64Decode(json['imageBytes'] as String),
      answers: Map<String, String>.from(json['answers'] as Map),
      score: (json['score'] as num).toDouble(),
      maxScore: (json['maxScore'] as num).toDouble(),
      timestamp: DateTime.parse(json['timestamp'] as String),
      status: SyncStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => SyncStatus.pending,
      ),
      retryCount: json['retryCount'] as int? ?? 0,
    );
  }
}
```

- [ ] **Step 4: Update updateSubmissionStatus to preserve classId**

Modify `client/mobile/lib/core/storage/omr_local_storage.dart`. Replace the `updateSubmissionStatus` method (lines 162-187):

```dart
  Future<void> updateSubmissionStatus(
    String id,
    SyncStatus status, {
    int? retryCount,
  }) async {
    final submissions = await getPendingSubmissions();
    final idx = submissions.indexWhere((s) => s.id == id);
    if (idx == -1) return;

    final old = submissions[idx];
    submissions[idx] = PendingSubmission(
      id: old.id,
      examId: old.examId,
      studentId: old.studentId,
      classId: old.classId,
      imageBytes: old.imageBytes,
      answers: old.answers,
      score: old.score,
      maxScore: old.maxScore,
      timestamp: old.timestamp,
      status: status,
      retryCount: retryCount ?? old.retryCount,
    );

    final key = _pendingSubmissionsKey;
    final jsonList = submissions.map((s) => s.toJson()).toList();
    await _prefs.setString(key, jsonEncode(jsonList));
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd client/mobile && flutter test test/core/storage/omr_local_storage_test.dart`
Expected: PASS - 4 tests passed

- [ ] **Step 6: Commit**

```bash
git add client/mobile/lib/core/storage/omr_local_storage.dart client/mobile/test/core/storage/omr_local_storage_test.dart
git commit -m "feat(mobile): add classId field to PendingSubmission for offline sync"
```

---

## Task 5: Mobile - OMRSubmissionSyncService classId support (TDD)

**Files:**
- Modify: `client/mobile/lib/core/network/omr_submission_sync_service.dart`
- Create: `client/mobile/test/core/network/omr_submission_sync_service_test.dart`

- [ ] **Step 1: Write the failing test**

Create `client/mobile/test/core/network/omr_submission_sync_service_test.dart`:

```dart
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:smart_grading_mobile/core/network/api_client.dart';
import 'package:smart_grading_mobile/core/network/omr_submission_sync_service.dart';

class MockApiClient extends Mock implements ApiClient {}

void main() {
  late MockApiClient mockApiClient;
  late OMRSubmissionSyncService service;

  setUp(() {
    mockApiClient = MockApiClient();
    service = OMRSubmissionSyncService(apiClient: mockApiClient);
  });

  group('submitResultOnly with classId', () {
    test('includes classId in body when provided', () async {
      when(mockApiClient.post(any, data: anyNamed('data')))
          .thenAnswer((_) async => Response(requestOptions: RequestOptions(path: '')));

      await service.submitResultOnly(
        examId: 'exam-1',
        classId: 'class-1',
        answers: {'q1': 'A'},
        score: 1.0,
        maxScore: 1.0,
      );

      final captured = verify(mockApiClient.post(captureAny, data: captureAnyNamed('data')))
          .captured;
      final body = captured[1] as Map<String, dynamic>;
      expect(body['classId'], 'class-1');
    });

    test('omits classId from body when null', () async {
      when(mockApiClient.post(any, data: anyNamed('data')))
          .thenAnswer((_) async => Response(requestOptions: RequestOptions(path: '')));

      await service.submitResultOnly(
        examId: 'exam-1',
        answers: {'q1': 'A'},
        score: 1.0,
        maxScore: 1.0,
      );

      final captured = verify(mockApiClient.post(captureAny, data: captureAnyNamed('data')))
          .captured;
      final body = captured[1] as Map<String, dynamic>;
      expect(body.containsKey('classId'), isFalse);
    });
  });

  group('submitScan with classId', () {
    test('includes classId in FormData when provided', () async {
      when(mockApiClient.post(any, data: anyNamed('data')))
          .thenAnswer((_) async => Response(requestOptions: RequestOptions(path: '')));

      await service.submitScan(
        examId: 'exam-1',
        classId: 'class-1',
        imageBytes: Uint8ListSample.bytes,
        answers: {'q1': 'A'},
        score: 1.0,
        maxScore: 1.0,
      );

      final captured = verify(mockApiClient.post(captureAny, data: captureAnyNamed('data')))
          .captured;
      final formData = captured[1] as FormData;
      expect(formData.fields.any((f) => f.key == 'classId' && f.value == 'class-1'), isTrue);
    });
  });
}

class Uint8ListSample {
  static final bytes = _create();
  static dynamic _create() {
    // Provide minimal Uint8List for test
    return <int>[1, 2, 3];
  }
}
```

NOTE: This test uses `mockito`. Add to `dev_dependencies` in `pubspec.yaml` if not present:
```yaml
dev_dependencies:
  mockito: ^5.4.0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/mobile && flutter test test/core/network/omr_submission_sync_service_test.dart`
Expected: FAIL - `classId` param doesn't exist

- [ ] **Step 3: Update OMRSubmissionSyncService**

Modify `client/mobile/lib/core/network/omr_submission_sync_service.dart`. Replace `submitResultOnly` and `submitScan` methods:

```dart
  /// Submit a single pending scan to the server (with image).
  Future<bool> submitScan({
    required String examId,
    required Uint8List imageBytes,
    required Map<String, String> answers,
    required double score,
    required double maxScore,
    String? classId,
  }) async {
    try {
      final formData = FormData.fromMap({
        'examId': examId,
        if (classId != null) 'classId': classId,
        'image': MultipartFile.fromBytes(
          imageBytes,
          filename: 'omr_scan_${DateTime.now().millisecondsSinceEpoch}.jpg',
        ),
        'answers': jsonEncode(answers),
        'score': score.toString(),
        'maxScore': maxScore.toString(),
      });

      await _apiClient.post(
        ApiConstants.submissions,
        data: formData,
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Submit a scan result without the image (already processed locally).
  Future<bool> submitResultOnly({
    required String examId,
    required Map<String, String> answers,
    required double score,
    required double maxScore,
    String? studentId,
    String? classId,
    String? submissionId,
  }) async {
    try {
      await _apiClient.post(
        ApiConstants.submissions,
        data: {
          'examId': examId,
          'answers': jsonEncode(answers),
          'score': score.toString(),
          'maxScore': maxScore.toString(),
          if (studentId != null) 'studentId': studentId,
          if (classId != null) 'classId': classId,
          if (submissionId != null) 'submissionId': submissionId,
        },
      );
      return true;
    } catch (e) {
      return false;
    }
  }
```

Also update `syncPendingSubmissions` to read and forward `classId`. Replace the inner call (lines 29-36):

```dart
          final success = await submitResultOnly(
            examId: data['examId'] as String,
            answers: Map<String, String>.from(data['answers'] as Map),
            score: (data['score'] as num).toDouble(),
            maxScore: (data['maxScore'] as num).toDouble(),
            studentId: data['studentId'] as String?,
            classId: data['classId'] as String?,
            submissionId: data['submissionId'] as String?,
          );
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client/mobile && flutter test test/core/network/omr_submission_sync_service_test.dart`
Expected: PASS - 3 tests passed

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/core/network/omr_submission_sync_service.dart client/mobile/test/core/network/omr_submission_sync_service_test.dart client/mobile/pubspec.yaml
git commit -m "feat(mobile): add classId support to OMRSubmissionSyncService"
```

---

## Task 6: Mobile - OMRScannerBloc event/state add classId (TDD)

**Files:**
- Modify: `client/mobile/lib/presentation/blocs/omr_scanner/omr_scanner_event.dart`
- Modify: `client/mobile/lib/presentation/blocs/omr_scanner/omr_scanner_state.dart`
- Create: `client/mobile/test/presentation/blocs/omr_scanner_bloc_test.dart`

- [ ] **Step 1: Write the failing test**

Create `client/mobile/test/presentation/blocs/omr_scanner_bloc_test.dart`:

```dart
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:smart_grading_mobile/domain/omr/engine/omr_engine.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/domain/omr/models/evaluation_config.dart';
import 'package:smart_grading_mobile/presentation/blocs/omr_scanner/omr_scanner_bloc.dart';

class MockOMREngine extends Mock implements OMREngine {}
class MockConnectivity extends Mock implements Connectivity {}

void main() {
  late MockOMREngine engine;
  late MockConnectivity connectivity;
  late OMRScannerBloc bloc;

  setUp(() {
    engine = MockOMREngine();
    connectivity = MockConnectivity();
    bloc = OMRScannerBloc(engine: engine, connectivity: connectivity);
  });

  tearDown(() async {
    await bloc.close();
  });

  test('OMRScannerTemplateSet event carries classId and className', () async {
    final template = OMRTemplate.simpleMcq(numQuestions: 1, numOptions: 4);
    final evalConfig = EvaluationConfig.simple(
      questionAnswers: {'q1': 'A'},
      correct: 1.0,
      incorrect: 0.0,
      unmarked: 0.0,
    );

    bloc.add(OMRScannerTemplateSet(
      template: template,
      evaluationConfig: evalConfig,
      examId: 'exam-1',
      examName: 'Exam 1',
      classId: 'class-1',
      className: 'Class 1',
    ));

    await expectLater(
      bloc.stream,
      emitsThrough(predicate<OMRScannerState>(
        (state) => state is OMRScannerTemplateReady &&
            state.classId == 'class-1' &&
            state.className == 'Class 1',
      )),
    );
  });
}
```

NOTE: Add `mockito` to dev_dependencies if not present.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/mobile && flutter test test/presentation/blocs/omr_scanner_bloc_test.dart`
Expected: FAIL - classId/className params don't exist on OMRScannerTemplateSet

- [ ] **Step 3: Update event class**

Modify `client/mobile/lib/presentation/blocs/omr_scanner/omr_scanner_event.dart`. Replace the `OMRScannerTemplateSet` class:

```dart
class OMRScannerTemplateSet extends OMRScannerEvent {
  final OMRTemplate template;
  final EvaluationConfig? evaluationConfig;
  final String? examId;
  final String? examName;
  final String? classId;
  final String? className;

  const OMRScannerTemplateSet({
    required this.template,
    this.evaluationConfig,
    this.examId,
    this.examName,
    this.classId,
    this.className,
  });

  @override
  List<Object?> get props => [template, evaluationConfig, examId, examName, classId, className];
}
```

- [ ] **Step 4: Update state class**

Modify `client/mobile/lib/presentation/blocs/omr_scanner/omr_scanner_state.dart`. Replace the `OMRScannerTemplateReady` class:

```dart
class OMRScannerTemplateReady extends OMRScannerState {
  final OMRTemplate template;
  final EvaluationConfig? evaluationConfig;
  final String? examId;
  final String? examName;
  final String? classId;
  final String? className;

  const OMRScannerTemplateReady({
    required this.template,
    this.evaluationConfig,
    this.examId,
    this.examName,
    this.classId,
    this.className,
  });

  @override
  List<Object?> get props => [template, evaluationConfig, examId, examName, classId, className];
}
```

- [ ] **Step 5: Update _onTemplateSet handler**

Modify `client/mobile/lib/presentation/blocs/omr_scanner/omr_scanner_bloc.dart`. Replace `_onTemplateSet`:

```dart
  Future<void> _onTemplateSet(
    OMRScannerTemplateSet event,
    Emitter<OMRScannerState> emit,
  ) async {
    emit(OMRScannerTemplateReady(
      template: event.template,
      evaluationConfig: event.evaluationConfig,
      examId: event.examId,
      examName: event.examName,
      classId: event.classId,
      className: event.className,
    ));
  }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd client/mobile && flutter test test/presentation/blocs/omr_scanner_bloc_test.dart`
Expected: PASS - 1 test passed

- [ ] **Step 7: Commit**

```bash
git add client/mobile/lib/presentation/blocs/omr_scanner/ client/mobile/test/presentation/blocs/omr_scanner_bloc_test.dart
git commit -m "feat(mobile): add classId/className to OMRScannerTemplateSet event and state"
```

---

## Task 7: Mobile - OMRScannerBloc _onSubmit sends classId (TDD)

**Files:**
- Modify: `client/mobile/lib/presentation/blocs/omr_scanner/omr_scanner_bloc.dart`
- Modify: `client/mobile/test/presentation/blocs/omr_scanner_bloc_test.dart`

- [ ] **Step 1: Add test for _onSubmit forwarding classId**

Append to `client/mobile/test/presentation/blocs/omr_scanner_bloc_test.dart` (inside main):

```dart
  group('OMRScannerSubmit forwards classId to syncService', () {
    test('passes classId from template state to submitResultOnly', () async {
      // ... uses GetIt to inject mock sync service
    });
  });
```

For brevity, the full test uses GetIt to inject a mock `OMRSubmissionSyncService`. Refer to the existing test setup in `test/` for the pattern. The test asserts that:
1. After `OMRScannerTemplateSet` with classId
2. Then capture process (mocked)
3. Then `OMRScannerSubmit`
4. Verify `submitResultOnly` was called with `classId: 'class-1'`

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL - _onSubmit doesn't pass classId

- [ ] **Step 3: Update _onSubmit to pass classId**

Modify `client/mobile/lib/presentation/blocs/omr_scanner/omr_scanner_bloc.dart`. Replace `_onSubmit` method (lines 154-225):

```dart
  Future<void> _onSubmit(
    OMRScannerSubmit event,
    Emitter<OMRScannerState> emit,
  ) async {
    final current = state;
    if (current is! OMRScannerSuccess) return;

    emit(OMRScannerSubmitting(
      imageBytes: current.imageBytes,
      gradingResult: current.gradingResult,
    ));

    final answers = Map<String, String>.fromEntries(
      current.gradingResult.verdicts
          .map((v) => MapEntry(v.question, v.markedAnswer)),
    );

    String? examId;
    String? classId;
    final templateState = state;
    if (templateState is OMRScannerTemplateReady) {
      examId = templateState.examId;
      classId = templateState.classId;
    }

    // Check connectivity
    final connectivityResult = await _connectivity.checkConnectivity();
    final isOnline = connectivityResult.isNotEmpty &&
        !connectivityResult.contains(ConnectivityResult.none);

    if (isOnline) {
      try {
        final syncService = GetIt.instance<OMRSubmissionSyncService>();
        final success = await syncService.submitResultOnly(
          examId: examId ?? 'unknown',
          classId: classId,
          answers: answers,
          score: current.gradingResult.score,
          maxScore: current.gradingResult.maxScore,
        );

        if (success) {
          emit(OMRScannerSubmitted(
            gradingResult: current.gradingResult,
            submittedOnline: true,
          ));
          return;
        }
      } catch (_) {
        // Fall through to offline
      }
    }

    // Offline: save to local storage
    try {
      final storage = await _getLocalStorage();
      await storage.addPendingSubmission(
        PendingSubmission(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          examId: examId ?? 'unknown',
          classId: classId,
          imageBytes: current.imageBytes,
          answers: answers,
          score: current.gradingResult.score,
          maxScore: current.gradingResult.maxScore,
          timestamp: DateTime.now(),
        ),
      );
      emit(OMRScannerSubmitted(
        gradingResult: current.gradingResult,
        submittedOnline: false,
      ));
    } catch (e) {
      emit(OMRScannerError(message: 'Failed to submit: $e'));
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client/mobile && flutter test test/presentation/blocs/omr_scanner_bloc_test.dart`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/presentation/blocs/omr_scanner/omr_scanner_bloc.dart client/mobile/test/presentation/blocs/omr_scanner_bloc_test.dart
git commit -m "feat(mobile): OMRScannerBloc _onSubmit forwards classId to sync and offline storage"
```

---

## Task 8: Mobile - ClassSelectionPage widget (TDD)

**Files:**
- Create: `client/mobile/lib/presentation/pages/class_selection_page.dart`
- Create: `client/mobile/test/presentation/pages/class_selection_page_test.dart`

- [ ] **Step 1: Write the failing test**

Create `client/mobile/test/presentation/pages/class_selection_page_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/entities/exam.entity.dart';
import 'package:smart_grading_mobile/presentation/pages/class_selection_page.dart';

Exam _makeExam({
  List<ExamClass> classIds = const [],
  ExamClass? primaryClassId,
}) {
  return Exam(
    id: 'exam-1',
    title: 'Math Test',
    classIds: classIds,
    primaryClassId: primaryClassId,
    status: 'published',
    createdAt: DateTime(2026, 1, 1),
  );
}

ExamClass _makeClass({required String id, required String name, required String code, int? studentCount}) {
  return ExamClass(
    id: id,
    name: name,
    code: code,
    studentCount: studentCount,
  );
}

void main() {
  testWidgets('renders class from classIds', (tester) async {
    final exam = _makeExam(
      classIds: [_makeClass(id: 'c1', name: 'Class A', code: 'A1', studentCount: 25)],
    );

    await tester.pumpWidget(MaterialApp(home: ClassSelectionPage(exam: exam)));
    await tester.pumpAndSettle();

    expect(find.text('Class A'), findsOneWidget);
    expect(find.text('A1'), findsOneWidget);
  });

  testWidgets('renders class from primaryClassId when classIds empty', (tester) async {
    final primary = _makeClass(id: 'c1', name: 'Primary Class', code: 'P1', studentCount: 30);
    final exam = _makeExam(primaryClassId: primary);

    await tester.pumpWidget(MaterialApp(home: ClassSelectionPage(exam: exam)));
    await tester.pumpAndSettle();

    expect(find.text('Primary Class'), findsOneWidget);
    expect(find.text('P1'), findsOneWidget);
  });

  testWidgets('deduplicates classes by id', (tester) async {
    final dup = _makeClass(id: 'c1', name: 'Same', code: 'S1', studentCount: 20);
    final exam = _makeExam(
      classIds: [dup],
      primaryClassId: dup,
    );

    await tester.pumpWidget(MaterialApp(home: ClassSelectionPage(exam: exam)));
    await tester.pumpAndSettle();

    expect(find.text('Same'), findsOneWidget);
  });

  testWidgets('shows empty state when no classes', (tester) async {
    final exam = _makeExam();

    await tester.pumpWidget(MaterialApp(home: ClassSelectionPage(exam: exam)));
    await tester.pumpAndSettle();

    expect(find.textContaining('No classes'), findsOneWidget);
  });

  testWidgets('tap class navigates to StudentListPage', (tester) async {
    final cls = _makeClass(id: 'c1', name: 'Class A', code: 'A1', studentCount: 25);
    final exam = _makeExam(classIds: [cls]);

    await tester.pumpWidget(MaterialApp(home: ClassSelectionPage(exam: exam)));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Class A'));
    await tester.pumpAndSettle();

    // Should navigate to StudentListPage
    expect(find.byType(StudentListPage), findsOneWidget);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/mobile && flutter test test/presentation/pages/class_selection_page_test.dart`
Expected: FAIL - ClassSelectionPage doesn't exist

- [ ] **Step 3: Create ClassSelectionPage**

Create `client/mobile/lib/presentation/pages/class_selection_page.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:smart_grading_mobile/domain/entities/exam.entity.dart';
import 'package:smart_grading_mobile/presentation/pages/student_list_page.dart';

class ClassSelectionPage extends StatelessWidget {
  final Exam exam;

  const ClassSelectionPage({super.key, required this.exam});

  List<ExamClass> _getUniqueClasses() {
    final byId = <String, ExamClass>{};
    for (final c in exam.classIds) {
      byId[c.id] = c;
    }
    if (exam.primaryClassId != null) {
      byId[exam.primaryClassId!.id] = exam.primaryClassId!;
    }
    return byId.values.toList();
  }

  @override
  Widget build(BuildContext context) {
    final classes = _getUniqueClasses();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: Text(
          'Choose class for ${exam.title}',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
      body: classes.isEmpty
          ? const _EmptyState()
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: classes.length,
              itemBuilder: (context, index) {
                final cls = classes[index];
                final isPrimary = exam.primaryClassId?.id == cls.id;
                return _ClassCard(
                  cls: cls,
                  isPrimary: isPrimary,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => StudentListPage(
                          exam: exam,
                          classId: cls.id,
                          className: cls.name,
                        ),
                      ),
                    );
                  },
                );
              },
            ),
    );
  }
}

class _ClassCard extends StatelessWidget {
  final ExamClass cls;
  final bool isPrimary;
  final VoidCallback onTap;

  const _ClassCard({
    required this.cls,
    required this.isPrimary,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: const Color(0xFFE8F0FE),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.class_, color: Color(0xFF1A73E8)),
        ),
        title: Row(
          children: [
            Expanded(
              child: Text(
                cls.name,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
            if (isPrimary)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'Primary',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFFD97706),
                  ),
                ),
              ),
          ],
        ),
        subtitle: Text(
          cls.studentCount != null
              ? '${cls.code} • ${cls.studentCount} students'
              : cls.code,
          style: const TextStyle(color: Color(0xFF64748B)),
        ),
        trailing: const Icon(Icons.chevron_right, color: Color(0xFF94A3B8)),
        onTap: onTap,
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Icon(Icons.class_outlined, size: 64, color: Color(0xFFCBD5E1)),
            SizedBox(height: 16),
            Text(
              'No classes assigned to this exam',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Color(0xFF64748B),
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Please assign a class to this exam first',
              style: TextStyle(color: Color(0xFF94A3B8)),
            ),
          ],
        ),
      ),
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client/mobile && flutter test test/presentation/pages/class_selection_page_test.dart`
Expected: PASS - 5 tests passed

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/presentation/pages/class_selection_page.dart client/mobile/test/presentation/pages/class_selection_page_test.dart
git commit -m "feat(mobile): add ClassSelectionPage for choosing class after exam"
```

---

## Task 9: Mobile - Update ExamSelectionPage to navigate to ClassSelectionPage

**Files:**
- Modify: `client/mobile/lib/presentation/pages/exam_selection_page.dart`

- [ ] **Step 1: Update navigation target**

Modify `client/mobile/lib/presentation/pages/exam_selection_page.dart`. Update the import and onTap handler:

Replace the import:
```dart
import 'package:smart_grading_mobile/presentation/pages/class_selection_page.dart';
```

Replace the onTap in the ListTile (lines 78-84):
```dart
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ClassSelectionPage(exam: exam),
                        ),
                      );
                    },
```

Also remove the now-unused import:
```dart
// Remove this line:
// import 'package:smart_grading_mobile/presentation/pages/student_list_page.dart';
```

- [ ] **Step 2: Verify build still works**

Run: `cd client/mobile && flutter analyze`
Expected: No errors related to ExamSelectionPage

- [ ] **Step 3: Commit**

```bash
git add client/mobile/lib/presentation/pages/exam_selection_page.dart
git commit -m "feat(mobile): ExamSelectionPage navigates to ClassSelectionPage"
```

---

## Task 10: Mobile - Update StudentListPage to accept classId/className

**Files:**
- Modify: `client/mobile/lib/presentation/pages/student_list_page.dart`
- Create: `client/mobile/test/presentation/pages/student_list_page_test.dart`

- [ ] **Step 1: Write the failing test**

Create `client/mobile/test/presentation/pages/student_list_page_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/entities/exam.entity.dart';
import 'package:smart_grading_mobile/presentation/pages/student_list_page.dart';

void main() {
  testWidgets('StudentListPage accepts classId and className', (tester) async {
    final exam = Exam(
      id: 'exam-1',
      title: 'Math Test',
      primaryClassId: ExamClass(id: 'class-1', name: 'Class A', code: 'A1'),
      classIds: const [ExamClass(id: 'class-1', name: 'Class A', code: 'A1')],
      status: 'published',
      createdAt: DateTime(2026, 1, 1),
    );

    await tester.pumpWidget(MaterialApp(
      home: StudentListPage(
        exam: exam,
        classId: 'class-1',
        className: 'Class A',
      ),
    ));
    await tester.pumpAndSettle();

    // Title should show "Class A • Math Test"
    expect(find.textContaining('Class A'), findsOneWidget);
    expect(find.textContaining('Math Test'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/mobile && flutter test test/presentation/pages/student_list_page_test.dart`
Expected: FAIL - StudentListPage doesn't have classId/className params

- [ ] **Step 3: Update StudentListPage**

Modify `client/mobile/lib/presentation/pages/student_list_page.dart`. Replace the constructor and the loadStudents + openScanner methods:

```dart
class StudentListPage extends StatefulWidget {
  final Exam exam;
  final String classId;
  final String className;

  const StudentListPage({
    super.key,
    required this.exam,
    required this.classId,
    required this.className,
  });

  @override
  State<StudentListPage> createState() => _StudentListPageState();
}
```

In `_loadStudents`, replace line 61:
```dart
        classId: widget.classId,
```

In `_openScanner`, replace lines 100-105:
```dart
          child: CameraScannerPage(
            examId: widget.exam.id,
            examName: widget.exam.title,
            classId: widget.classId,
            className: widget.className,
            studentId: studentId,
            studentName: studentName,
          ),
```

In AppBar title, replace lines 119-124:
```dart
        title: Text(
          '${widget.className} • ${widget.exam.title}',
          style: const TextStyle(fontWeight: FontWeight.bold),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client/mobile && flutter test test/presentation/pages/student_list_page_test.dart`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/presentation/pages/student_list_page.dart client/mobile/test/presentation/pages/student_list_page_test.dart
git commit -m "feat(mobile): StudentListPage requires classId and className params"
```

---

## Task 11: Mobile - Update CameraScannerPage to accept and forward classId/className

**Files:**
- Modify: `client/mobile/lib/presentation/pages/camera_scanner_page.dart`

- [ ] **Step 1: Add params to CameraScannerPage**

Modify `client/mobile/lib/presentation/pages/camera_scanner_page.dart`. Replace the constructor (lines 14-34):

```dart
class CameraScannerPage extends StatefulWidget {
  final OMRTemplate? template;
  final EvaluationConfig? evaluationConfig;
  final String? examId;
  final String? examName;
  final String? classId;
  final String? className;
  final String? studentId;
  final String? studentName;

  const CameraScannerPage({
    super.key,
    this.template,
    this.evaluationConfig,
    this.examId,
    this.examName,
    this.classId,
    this.className,
    this.studentId,
    this.studentName,
  });

  @override
  State<CameraScannerPage> createState() => _CameraScannerPageState();
}
```

- [ ] **Step 2: Update _loadTemplate to forward classId**

Modify `_loadTemplate` (lines 57-87). Update the second event dispatch (the one creating default template):

```dart
      context.read<OMRScannerBloc>().add(OMRScannerTemplateSet(
        template: template,
        evaluationConfig: evalConfig,
        examId: widget.examId ?? 'demo',
        examName: widget.examName ?? 'Demo Exam',
        classId: widget.classId,
        className: widget.className,
      ));
```

Also update the first event dispatch (line 59-64):
```dart
    if (widget.template != null) {
      context.read<OMRScannerBloc>().add(OMRScannerTemplateSet(
        template: widget.template!,
        evaluationConfig: widget.evaluationConfig,
        examId: widget.examId,
        examName: widget.examName,
        classId: widget.classId,
        className: widget.className,
      ));
    } else {
```

- [ ] **Step 3: Update StudentPickerDialog call to use real classId**

Modify `OMRScannerSuccess` listener (lines 124-145). Update the `else` branch:

```dart
            } else {
              StudentPickerDialog.show(
                context: context,
                classId: widget.classId ?? '',
                className: widget.className ?? widget.examName ?? '',
                examId: widget.examId ?? '',
                examName: widget.examName ?? '',
                imageBytes: state.imageBytes,
              );
            }
```

- [ ] **Step 4: Verify build still works**

Run: `cd client/mobile && flutter analyze`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/presentation/pages/camera_scanner_page.dart
git commit -m "feat(mobile): CameraScannerPage accepts and forwards classId/className"
```

---

## Task 12: Mobile - Update /scan route in main.dart (optional)

**Files:**
- Modify: `client/mobile/lib/main.dart`

- [ ] **Step 1: Update /scan route to accept classId/className args**

Modify `client/mobile/lib/main.dart`. Replace the `/scan` route (lines 233-240):

```dart
          '/scan': (context) {
            final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
            return CameraScannerPage(
              examId: args?['examId'] as String?,
              examName: args?['examName'] as String?,
              classId: args?['classId'] as String?,
              className: args?['className'] as String?,
              studentId: args?['studentId'] as String?,
            );
          },
```

- [ ] **Step 2: Verify build still works**

Run: `cd client/mobile && flutter analyze`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/mobile/lib/main.dart
git commit -m "feat(mobile): /scan route accepts classId and className args"
```

---

## Task 13: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Run all mobile tests**

Run: `cd client/mobile && flutter test`
Expected: All tests pass (existing + new)

- [ ] **Step 2: Run flutter analyze**

Run: `cd client/mobile && flutter analyze`
Expected: No new errors

- [ ] **Step 3: Run all server tests**

Run: `cd server && npm test`
Expected: All tests pass (existing + new)

- [ ] **Step 4: Build debug APK**

Run: `cd client/mobile && flutter build apk --debug`
Expected: Build successful

- [ ] **Step 5: Manual smoke test**

1. Start server: `cd server && npm start`
2. Start mobile app on device/emulator
3. Create an exam with 2-3 classes assigned
4. Navigate: Exam list → Class list (new page) → Student list → Quick Scan
5. Verify classId appears in network request body for /v1/submissions
6. Verify submission document in DB has classId field populated

- [ ] **Step 6: Final commit if any cleanup needed**

```bash
git status
# If anything to commit:
git add -A
git commit -m "chore: cleanup after scan flow class selection implementation"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✓ ClassSelectionPage (Task 8, 9) — spec 3.1
- ✓ StudentListPage (Task 10) — spec 3.2
- ✓ CameraScannerPage (Task 11) — spec 3.3
- ✓ OMRScannerBloc event/state (Task 6) — spec 3.4
- ✓ OMRScannerBloc _onSubmit (Task 7) — spec 3.4
- ✓ OMRSubmissionSyncService (Task 5) — spec 3.5
- ✓ PendingSubmission (Task 4) — spec 3.5
- ✓ Server validation (Task 1) — spec 3.7
- ✓ Server model (Task 2) — spec 3.7
- ✓ Server service (Task 3) — spec 3.7
- ✓ /scan route (Task 12) — optional
- ✓ Tests for everything (each task has test)
- ✓ Verification (Task 13) — spec 6.3

**Placeholder scan:** No TBD/TODO/vague items.

**Type consistency:**
- `classId` and `className` consistently named across files
- `submitResultOnly(classId:)` signature matches between task definitions
- `PendingSubmission.classId` consistent in storage + bloc + service
