import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/network/api_client.dart';
import 'package:smart_grading_mobile/core/network/exam_service.dart';

class _FakeApiClient extends ApiClient {
  _FakeApiClient(this._response);
  final Map<String, dynamic> _response;

  String? lastPath;
  Map<String, dynamic>? lastQuery;

  @override
  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? parser,
  }) async {
    lastPath = path;
    lastQuery = queryParameters;
    return parser != null ? parser(_response) : _response as T;
  }
}

void main() {
  group('ExamService.getUpcomingExams', () {
    test('calls the correct endpoint with default limit=5', () async {
      final fake = _FakeApiClient({
        'results': <Map<String, dynamic>>[],
        'limit': 5,
        'count': 0,
      });
      final service = ExamService(apiClient: fake);

      final result = await service.getUpcomingExams();

      expect(fake.lastPath, '/exams/upcoming');
      expect(fake.lastQuery, {'limit': 5});
      expect(result.results, isEmpty);
      expect(result.limit, 5);
      expect(result.count, 0);
    });

    test('uses provided limit when supplied', () async {
      final fake = _FakeApiClient({
        'results': <Map<String, dynamic>>[],
        'limit': 3,
        'count': 0,
      });
      final service = ExamService(apiClient: fake);

      await service.getUpcomingExams(limit: 3);

      expect(fake.lastQuery, {'limit': 3});
    });

    test('parses results list of Exam entities', () async {
      final fake = _FakeApiClient({
        'results': [
          {
            '_id': 'exam-1',
            'title': 'Math Test',
            'status': 'published',
            'examDate': '2026-06-20T07:00:00.000Z',
            'createdAt': '2026-06-10T03:00:00.000Z',
          },
        ],
        'limit': 5,
        'count': 1,
      });
      final service = ExamService(apiClient: fake);

      final result = await service.getUpcomingExams();

      expect(result.results, hasLength(1));
      expect(result.results.first.id, 'exam-1');
      expect(result.results.first.title, 'Math Test');
      expect(result.count, 1);
    });
  });
}
