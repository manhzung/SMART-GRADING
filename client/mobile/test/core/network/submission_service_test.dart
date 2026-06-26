import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/network/submission_service.dart';
import 'package:smart_grading_mobile/core/errors/app_exceptions.dart';
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
      test('returns paginated submissions with correct defaults', () async {
        mockClient.mockResponse = {
          'results': <Map<String, dynamic>>[],
          'page': 1,
          'limit': 20,
          'total': 0,
          'pages': 1,
        };

        final result = await service.getSubmissions();

        expect(result.results, isEmpty);
        expect(result.page, 1);
        expect(result.limit, 20);
        expect(result.total, 0);
        expect(mockClient.lastPath, '/submissions');
      });

      test('sends correct query parameters for filters', () async {
        mockClient.mockResponse = {
          'results': <Map<String, dynamic>>[],
          'page': 1,
          'limit': 20,
          'total': 0,
          'pages': 1,
        };

        await service.getSubmissions(
          page: 2,
          limit: 10,
          examId: 'exam-123',
          studentId: 'student-456',
          versionId: 'version-789',
          status: 'graded',
          fromDate: '2026-01-01',
          toDate: '2026-06-30',
        );

        expect(mockClient.lastQuery?['page'], 2);
        expect(mockClient.lastQuery?['limit'], 10);
        expect(mockClient.lastQuery?['examId'], 'exam-123');
        expect(mockClient.lastQuery?['studentId'], 'student-456');
        expect(mockClient.lastQuery?['versionId'], 'version-789');
        expect(mockClient.lastQuery?['status'], 'graded');
        expect(mockClient.lastQuery?['fromDate'], '2026-01-01');
        expect(mockClient.lastQuery?['toDate'], '2026-06-30');
      });

      test('parses submission list correctly', () async {
        mockClient.mockResponse = {
          'results': [
            {
              '_id': 'sub-1',
              'examId': {
                '_id': 'exam-1',
                'title': 'Math Final',
                'examDate': '2026-06-20T07:00:00.000Z',
              },
              'studentId': 'student-1',
              'totalScore': 8,
              'maxScore': 10,
              'status': 'graded',
            },
            {
              '_id': 'sub-2',
              'examId': {
                '_id': 'exam-1',
                'title': 'Math Final',
                'examDate': '2026-06-20T07:00:00.000Z',
              },
              'studentId': 'student-2',
              'totalScore': 6,
              'maxScore': 10,
              'status': 'graded',
            },
          ],
          'page': 1,
          'limit': 20,
          'total': 2,
          'pages': 1,
        };

        final result = await service.getSubmissions(examId: 'exam-1');

        expect(result.results, hasLength(2));
        expect(result.results.first.id, 'sub-1');
        expect(result.results.first.score, 8);
        expect(result.results.first.status, 'graded');
        expect(result.total, 2);
      });
    });

    group('getSubmissionById', () {
      test('returns single submission by id', () async {
        mockClient.mockResponse = {
          '_id': 'sub-1',
          'examId': {
            '_id': 'exam-1',
            'title': 'Math Final',
            'examDate': '2026-06-20T07:00:00.000Z',
          },
          'studentId': 'student-1',
          'totalScore': 8,
          'maxScore': 10,
          'status': 'graded',
        };

        final result = await service.getSubmissionById('sub-1');

        expect(result.id, 'sub-1');
        expect(result.score, 8);
        expect(result.status, 'graded');
        expect(mockClient.lastPath, '/submissions/sub-1');
      });
    });

    group('getSubmissionsByExam', () {
      test('returns submissions list for an exam', () async {
        mockClient.mockResponse = {
          'results': [
            {
              '_id': 'sub-1',
              'examId': {
                '_id': 'exam-1',
                'title': 'Math Final',
              },
              'studentId': 'student-1',
              'score': 8,
              'status': 'graded',
            },
          ],
        };

        final result = await service.getSubmissionsByExam('exam-1');

        expect(result, hasLength(1));
        expect(result.first.id, 'sub-1');
        expect(mockClient.lastPath, '/exams/exam-1/submissions');
      });

      test('handles empty list', () async {
        mockClient.mockResponse = {
          'results': <Map<String, dynamic>>[],
        };

        final result = await service.getSubmissionsByExam('exam-1');

        expect(result, isEmpty);
      });
    });

    group('getExamStatistics', () {
      test('returns statistics for an exam', () async {
        mockClient.mockResponse = {
          'totalSubmissions': 30,
          'totalStudents': 35,
          'submissionRate': 0.86,
          'averageScore': 7.5,
          'highestScore': 10,
          'lowestScore': 3,
          'passRate': 0.83,
          'gradeDistribution': [],
        };

        final result = await service.getExamStatistics('exam-1');

        expect(result.totalSubmissions, 30);
        expect(result.totalStudents, 35);
        expect(result.submissionRate, 0.86);
        expect(result.averageScore, 7.5);
        expect(result.highestScore, 10);
        expect(result.lowestScore, 3);
        expect(result.passRate, 0.83);
        expect(mockClient.lastPath, '/exams/exam-1/submissions/statistics');
      });
    });

    group('scanSubmission', () {
      test('sends examId and imagePath', () async {
        mockClient.mockResponse = {
          '_id': 'sub-new',
          'examId': {
            '_id': 'exam-1',
            'title': 'Math Exam',
          },
          'studentId': 'student-1',
          'status': 'graded',
          'totalScore': 8,
        };

        final result = await service.scanSubmission(
          examId: 'exam-1',
          imagePath: '/path/to/image.jpg',
        );

        expect(result.id, 'sub-new');
        expect(result.status, 'graded');
        expect(mockClient.lastPath, '/submissions/scan');
        expect(mockClient.lastBody['examId'], 'exam-1');
        expect(mockClient.lastBody['image'], '/path/to/image.jpg');
      });
    });

    group('deleteSubmission', () {
      test('sends DELETE request', () async {
        mockClient.mockResponse = {'success': true};

        await service.deleteSubmission('sub-1');

        expect(mockClient.lastPath, '/submissions/sub-1');
        expect(mockClient.callHistory[0]['method'], 'DELETE');
      });
    });

    group('error handling', () {
      test('throws ApiException on server error', () async {
        mockClient.shouldThrow = true;
        mockClient.errorType = 'api';

        expect(
          () => service.getSubmissions(),
          throwsA(isA<ApiException>()),
        );
      });

      test('throws NetworkException on connection error', () async {
        mockClient.shouldThrow = true;
        mockClient.errorType = 'network';

        expect(
          () => service.getSubmissionById('sub-1'),
          throwsA(isA<NetworkException>()),
        );
      });
    });
  });
}
