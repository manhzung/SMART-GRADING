import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/network/omr_template_service.dart';
import 'package:smart_grading_mobile/core/errors/app_exceptions.dart';
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
            'answers': {'1': 'A', '2': 'B', '3': 'C', '4': 'D'},
            'fieldBlocks': [],
          },
        };

        final result = await service.getTemplateJsonForExam('exam-1');

        expect(result['questions'], 20);
        expect(result['options'], 4);
        expect(result['answers'], isNotNull);
        expect(mockClient.lastPath, '/omr-templates/exam/exam-1/json');
      });

      test('throws exception on fetch failure', () async {
        mockClient.shouldThrow = true;
        mockClient.errorType = 'api';

        expect(
          () => service.getTemplateJsonForExam('exam-1'),
          throwsException,
        );
      });
    });

    group('getEvaluationForExam', () {
      test('returns evaluation config', () async {
        mockClient.mockResponse = {
          'data': {
            'options': {
              'questions_in_order': ['q1', 'q2', 'q3'],
              'answers_in_order': ['A', 'B', 'C'],
              'should_explain_scoring': false,
            },
            'marking_schemes': {
              'DEFAULT': {
                'correct': 1,
                'incorrect': 0,
                'unmarked': 0,
              },
            },
          },
        };

        final result = await service.getEvaluationForExam('exam-1');

        expect(result.questionsInOrder, ['q1', 'q2', 'q3']);
        expect(result.answersInOrder, ['A', 'B', 'C']);
        expect(result.defaultScheme.correct, 1);
        expect(result.defaultScheme.incorrect, 0);
        expect(mockClient.lastPath, '/exams/exam-1/evaluation');
      });
    });

    group('uploadScannedImage', () {
      test('sends form data with image and answers', () async {
        mockClient.mockResponse = {
          'success': true,
          'submissionId': 'sub-1',
        };

        final imageBytes = Uint8List.fromList([1, 2, 3, 4, 5]);
        final result = await service.uploadScannedImage(
          examId: 'exam-1',
          imageBytes: imageBytes,
          answers: {'1': 'A', '2': 'B', '3': 'C'},
          score: 8.0,
          maxScore: 10.0,
        );

        expect(result['success'], true);
        expect(result['submissionId'], 'sub-1');
        expect(mockClient.lastPath, '/submissions');
      });
    });

    group('getAll', () {
      test('returns list of OMR templates', () async {
        mockClient.mockResponse = {
          'data': [
            {
              '_id': {'\$oid': 'template-1'},
              'name': 'Standard A4',
              'templateJson': {
                'pageWidth': 2480,
                'pageHeight': 3508,
                'answers': {},
              },
            },
            {
              '_id': {'\$oid': 'template-2'},
              'name': 'Compact A5',
              'templateJson': {
                'pageWidth': 1748,
                'pageHeight': 2480,
                'answers': {},
              },
            },
          ],
        };

        final result = await service.getAll();

        expect(result, hasLength(2));
        expect(result.first.name, 'Standard A4');
        expect(result.last.name, 'Compact A5');
        expect(mockClient.lastPath, '/omr-templates');
      });

      test('handles empty templates list', () async {
        mockClient.mockResponse = {
          'data': <Map<String, dynamic>>[],
        };

        final result = await service.getAll();

        expect(result, isEmpty);
      });
    });

    group('getJsonById', () {
      test('returns template by id', () async {
        mockClient.mockResponse = {
          'data': {
            '_id': {'\$oid': 'template-1'},
            'name': 'Standard A4',
            'templateJson': {
              'pageWidth': 2480,
              'pageHeight': 3508,
              'answers': {},
            },
          },
        };

        final result = await service.getJsonById('template-1');

        expect(result.name, 'Standard A4');
        expect(mockClient.lastPath, '/omr-templates/template-1');
      });
    });

    group('error handling', () {
      test('throws NetworkException on connection error', () async {
        mockClient.shouldThrow = true;
        mockClient.errorType = 'network';

        expect(
          () => service.getTemplateJsonForExam('exam-1'),
          throwsA(isA<NetworkException>()),
        );
      });

      test('throws ApiException on server error', () async {
        mockClient.shouldThrow = true;
        mockClient.errorType = 'api';

        expect(
          () => service.getAll(),
          throwsA(isA<ApiException>()),
        );
      });
    });
  });
}
