import 'dart:typed_data';
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

      final captured = verify(mockApiClient.post(captureAny, data: captureAnyNamed('data'))).captured;
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

      final captured = verify(mockApiClient.post(captureAny, data: captureAnyNamed('data'))).captured;
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
        imageBytes: Uint8List.fromList([1, 2, 3]),
        answers: {'q1': 'A'},
        score: 1.0,
        maxScore: 1.0,
      );

      final captured = verify(mockApiClient.post(captureAny, data: captureAnyNamed('data'))).captured;
      final formData = captured[1] as FormData;
      expect(formData.fields.any((f) => f.key == 'classId' && f.value == 'class-1'), isTrue);
    });

    test('omits classId from FormData when null', () async {
      when(mockApiClient.post(any, data: anyNamed('data')))
          .thenAnswer((_) async => Response(requestOptions: RequestOptions(path: '')));

      await service.submitScan(
        examId: 'exam-1',
        imageBytes: Uint8List.fromList([1, 2, 3]),
        answers: {'q1': 'A'},
        score: 1.0,
        maxScore: 1.0,
      );

      final captured = verify(mockApiClient.post(captureAny, data: captureAnyNamed('data'))).captured;
      final formData = captured[1] as FormData;
      expect(formData.fields.any((f) => f.key == 'classId'), isFalse);
    });
  });
}
