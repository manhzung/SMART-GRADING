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

    test('toJson includes classId as null when not provided', () {
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

      expect(json['classId'], isNull);
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

    test('fromJson handles missing classId key gracefully', () {
      final json = {
        'id': 'sub-1',
        'examId': 'exam-1',
        'imageBytes': base64Encode([1, 2, 3]),
        'answers': {'q1': 'A'},
        'score': 1.0,
        'maxScore': 1.0,
        'timestamp': '2026-01-01T00:00:00.000',
        'status': 'pending',
        'retryCount': 0,
        // Note: NO classId key — simulating legacy data
      };

      final submission = PendingSubmission.fromJson(json);

      expect(submission.classId, isNull);
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
