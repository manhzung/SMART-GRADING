import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:smart_grading_mobile/core/network/api_client.dart';
import 'package:smart_grading_mobile/core/network/exam_submissions_service.dart';
import 'package:smart_grading_mobile/core/network/submission_service.dart' show PaginatedSubmissions;
import 'package:smart_grading_mobile/domain/entities/exam.entity.dart';

class MockApiClient extends Mock implements ApiClient {}

void main() {
  late MockApiClient apiClient;
  late ExamSubmissionsService service;

  setUp(() {
    apiClient = MockApiClient();
    service = ExamSubmissionsService(apiClient: apiClient);
  });

  test('getExamSubmissionsByClass groups submissions by classId', () async {
    when(() => apiClient.get<PaginatedSubmissions>(
          any(),
          queryParameters: any(named: 'queryParameters'),
          parser: any(named: 'parser'),
        )).thenAnswer((invocation) async {
      final parser = invocation.namedArguments[#parser] as Function;
      final raw = {
        'results': [
          {
            '_id': 's1',
            'examId': 'e1',
            'studentId': 'st1',
            'status': 'GRADED',
            'classId': 'c1',
            'studentId': {'_id': 'st1', 'name': 'Nguyen Van A'},
          },
          {
            '_id': 's2',
            'examId': 'e1',
            'studentId': 'st2',
            'status': 'PENDING',
            'classId': 'c1',
            'studentId': {'_id': 'st2', 'name': 'Tran Thi B'},
          },
          {
            '_id': 's3',
            'examId': 'e1',
            'studentId': 'st3',
            'status': 'GRADED',
            'classId': 'c2',
            'studentId': {'_id': 'st3', 'name': 'Le Van C'},
          },
        ],
        'page': 1,
        'limit': 50,
        'total': 3,
        'pages': 1,
      };
      return parser(raw) as PaginatedSubmissions;
    });

    final result = await service.getExamSubmissionsByClass('e1');

    expect(result.length, 2);
    expect(result['c1']?.submissions.length, 2);
    expect(result['c2']?.submissions.length, 1);
    expect(result['c1']?.totalSubmitted, 2);
    expect(result['c1']?.totalGraded, 1);
    expect(result['c2']?.totalGraded, 1);
  });

  test('getExamSubmissionsByClass returns empty map when no submissions', () async {
    when(() => apiClient.get<PaginatedSubmissions>(
          any(),
          queryParameters: any(named: 'queryParameters'),
          parser: any(named: 'parser'),
        )).thenAnswer((invocation) async {
      final parser = invocation.namedArguments[#parser] as Function;
      return parser({'results': <dynamic>[], 'page': 1, 'limit': 50, 'total': 0, 'pages': 0}) as PaginatedSubmissions;
    });

    final result = await service.getExamSubmissionsByClass('e1');
    expect(result, isEmpty);
  });

  test('getExamSubmissionsByClass paginates through all pages', () async {
    var pageCall = 0;
    when(() => apiClient.get<PaginatedSubmissions>(
          any(),
          queryParameters: any(named: 'queryParameters'),
          parser: any(named: 'parser'),
        )).thenAnswer((invocation) async {
      final parser = invocation.namedArguments[#parser] as Function;
      pageCall++;
      if (pageCall == 1) {
        return parser({
          'results': [
            {'_id': 's1', 'examId': 'e1', 'studentId': 'st1', 'status': 'GRADED', 'classId': 'c1'},
          ],
          'page': 1, 'limit': 1, 'total': 2, 'pages': 2,
        }) as PaginatedSubmissions;
      } else {
        return parser({
          'results': [
            {'_id': 's2', 'examId': 'e1', 'studentId': 'st2', 'status': 'PENDING', 'classId': 'c2'},
          ],
          'page': 2, 'limit': 1, 'total': 2, 'pages': 2,
        }) as PaginatedSubmissions;
      }
    });

    final result = await service.getExamSubmissionsByClass('e1');
    expect(pageCall, 2);
    expect(result.length, 2);
    expect(result['c1']?.submissions.length, 1);
    expect(result['c2']?.submissions.length, 1);
  });
}
