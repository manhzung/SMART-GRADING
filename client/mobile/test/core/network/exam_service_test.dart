import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/network/exam_service.dart';
import 'package:smart_grading_mobile/core/errors/app_exceptions.dart';
import 'mock_api_client.dart';

void main() {
  group('ExamService', () {
    late MockApiClient mockClient;
    late ExamService service;

    setUp(() {
      mockClient = MockApiClient();
      service = ExamService(apiClient: mockClient);
    });

    group('getExams', () {
      test('returns paginated exams with correct defaults', () async {
        mockClient.mockResponse = {
          'results': <Map<String, dynamic>>[],
          'page': 1,
          'limit': 20,
          'total': 0,
          'pages': 1,
        };

        final result = await service.getExams();

        expect(result.results, isEmpty);
        expect(result.page, 1);
        expect(result.limit, 20);
        expect(result.total, 0);
        expect(mockClient.lastPath, '/exams');
      });

      test('sends correct query parameters for filters', () async {
        mockClient.mockResponse = {
          'results': <Map<String, dynamic>>[],
          'page': 2,
          'limit': 10,
          'total': 0,
          'pages': 1,
        };

        await service.getExams(
          page: 2,
          limit: 10,
          classId: 'class-123',
          status: 'published',
          search: 'math',
          fromDate: '2026-01-01',
          toDate: '2026-06-30',
        );

        expect(mockClient.lastPath, '/exams');
        expect(mockClient.lastQuery?['page'], 2);
        expect(mockClient.lastQuery?['limit'], 10);
        expect(mockClient.lastQuery?['classId'], 'class-123');
        expect(mockClient.lastQuery?['status'], 'published');
        expect(mockClient.lastQuery?['search'], 'math');
        expect(mockClient.lastQuery?['fromDate'], '2026-01-01');
        expect(mockClient.lastQuery?['toDate'], '2026-06-30');
      });

      test('parses exam list correctly', () async {
        mockClient.mockResponse = {
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
        };

        final result = await service.getExams();

        expect(result.results, hasLength(2));
        expect(result.results.first.id, 'exam-1');
        expect(result.results.first.title, 'Math Final Exam');
        expect(result.results.first.status, 'published');
        expect(result.results.last.title, 'Physics Quiz');
        expect(result.total, 2);
        expect(result.pages, 1);
      });
    });

    group('getExamById', () {
      test('returns single exam by id', () async {
        mockClient.mockResponse = {
          '_id': 'exam-1',
          'title': 'Math Final Exam',
          'status': 'published',
          'examDate': '2026-06-20T07:00:00.000Z',
        };

        final result = await service.getExamById('exam-1');

        expect(result.id, 'exam-1');
        expect(result.title, 'Math Final Exam');
        expect(result.status, 'published');
        expect(mockClient.lastPath, '/exams/exam-1');
      });

      test('throws ApiException on 404', () async {
        mockClient.shouldThrow = true;
        mockClient.errorType = 'api';

        expect(
          () => service.getExamById('nonexistent'),
          throwsA(isA<ApiException>()),
        );
      });
    });

    group('createExam', () {
      test('sends correct data and returns created exam', () async {
        mockClient.mockResponse = {
          '_id': 'exam-new',
          'title': 'New Exam',
          'status': 'draft',
        };

        final result = await service.createExam(
          title: 'New Exam',
          description: 'Test description',
          classIds: ['class-1', 'class-2'],
          primaryClassId: 'class-1',
          subjectId: 'subject-1',
          examDate: DateTime(2026, 7, 15),
          duration: 90,
          totalScore: 10,
          numberOfQuestions: 20,
          numberOfVersions: 4,
        );

        expect(result.id, 'exam-new');
        expect(result.title, 'New Exam');
        expect(mockClient.lastPath, '/exams');
        expect(mockClient.lastBody['title'], 'New Exam');
        expect(mockClient.lastBody['description'], 'Test description');
        expect(mockClient.lastBody['classIds'], ['class-1', 'class-2']);
        expect(mockClient.lastBody['primaryClassId'], 'class-1');
        expect(mockClient.lastBody['examDate'], contains('2026-07-15'));
        expect(mockClient.lastBody['duration'], 90);
        expect(mockClient.lastBody['totalScore'], 10);
        expect(mockClient.lastBody['numberOfVersions'], 4);
      });
    });

    group('updateExam', () {
      test('sends PATCH request with correct data', () async {
        mockClient.mockResponse = {
          '_id': 'exam-1',
          'title': 'Updated Exam',
          'status': 'published',
        };

        final result = await service.updateExam('exam-1', {
          'title': 'Updated Exam',
          'status': 'published',
        });

        expect(result.id, 'exam-1');
        expect(result.title, 'Updated Exam');
        expect(mockClient.callHistory[0]['method'], 'PATCH');
        expect(mockClient.lastPath, '/exams/exam-1');
      });
    });

    group('publishExam', () {
      test('calls publish endpoint and returns updated exam', () async {
        mockClient.mockResponse = {
          '_id': 'exam-1',
          'title': 'Math Exam',
          'status': 'published',
        };

        final result = await service.publishExam('exam-1');

        expect(result.status, 'published');
        expect(mockClient.lastPath, '/exams/exam-1/publish');
        expect(mockClient.callHistory[0]['method'], 'POST');
      });
    });

    group('completeExam', () {
      test('calls complete endpoint', () async {
        mockClient.mockResponse = {
          '_id': 'exam-1',
          'title': 'Math Exam',
          'status': 'completed',
        };

        final result = await service.completeExam('exam-1');

        expect(result.status, 'completed');
        expect(mockClient.lastPath, '/exams/exam-1/complete');
      });
    });

    group('getExamVersions', () {
      test('returns list of exam versions', () async {
        mockClient.mockResponse = {
          'results': [
            {
              '_id': 'version-1',
              'examId': 'exam-1',
              'versionCode': 'A',
              'questions': [],
            },
            {
              '_id': 'version-2',
              'examId': 'exam-1',
              'versionCode': 'B',
              'questions': [],
            },
          ],
        };

        final result = await service.getExamVersions('exam-1');

        expect(result, hasLength(2));
        expect(result.first.versionCode, 'A');
        expect(result.last.versionCode, 'B');
        expect(mockClient.lastPath, '/exams/exam-1/versions');
      });
    });

    group('getUpcomingExams', () {
      test('calls upcoming endpoint with default limit', () async {
        mockClient.mockResponse = {
          'results': <Map<String, dynamic>>[],
          'limit': 5,
          'count': 0,
        };

        final result = await service.getUpcomingExams();

        expect(mockClient.lastPath, '/exams/upcoming');
        expect(mockClient.lastQuery?['limit'], 5);
        expect(result.results, isEmpty);
      });

      test('uses provided limit', () async {
        mockClient.mockResponse = {
          'results': <Map<String, dynamic>>[],
          'limit': 3,
          'count': 0,
        };

        await service.getUpcomingExams(limit: 3);

        expect(mockClient.lastQuery?['limit'], 3);
      });
    });

    group('addClassesToExam', () {
      test('sends POST request with classIds', () async {
        mockClient.mockResponse = {'success': true};

        await service.addClassesToExam('exam-1', ['class-1', 'class-2']);

        expect(mockClient.lastPath, '/exams/exam-1/classes');
        expect(mockClient.lastBody['classIds'], ['class-1', 'class-2']);
      });
    });

    group('deleteExam', () {
      test('sends DELETE request', () async {
        mockClient.mockResponse = {'success': true};

        await service.deleteExam('exam-1');

        expect(mockClient.lastPath, '/exams/exam-1');
        expect(mockClient.callHistory[0]['method'], 'DELETE');
      });
    });

    group('error handling', () {
      test('throws NetworkException on connection timeout', () async {
        mockClient.shouldThrow = true;
        mockClient.errorType = 'network';

        expect(
          () => service.getExams(),
          throwsA(isA<NetworkException>()),
        );
      });

      test('throws ForbiddenException on access denied', () async {
        mockClient.shouldThrow = true;
        mockClient.errorType = 'forbidden';

        expect(
          () => service.getExamById('exam-1'),
          throwsA(isA<ForbiddenException>()),
        );
      });
    });
  });
}
