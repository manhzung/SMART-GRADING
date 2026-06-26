import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/network/class_service.dart';
import 'package:smart_grading_mobile/core/errors/app_exceptions.dart';
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
      test('returns paginated classes with correct defaults', () async {
        mockClient.mockResponse = {
          'results': <Map<String, dynamic>>[],
          'page': 1,
          'limit': 20,
          'total': 0,
          'pages': 1,
        };

        final result = await service.getClasses();

        expect(result.results, isEmpty);
        expect(result.page, 1);
        expect(result.limit, 20);
        expect(mockClient.lastPath, '/classes');
      });

      test('sends correct query parameters for filters', () async {
        mockClient.mockResponse = {
          'results': <Map<String, dynamic>>[],
          'page': 1,
          'limit': 20,
          'total': 0,
          'pages': 1,
        };

        await service.getClasses(
          page: 2,
          limit: 10,
          schoolId: 'school-123',
          academicYear: '2025-2026',
          gradeLevel: 10,
        );

        expect(mockClient.lastQuery?['page'], 2);
        expect(mockClient.lastQuery?['limit'], 10);
        expect(mockClient.lastQuery?['schoolId'], 'school-123');
        expect(mockClient.lastQuery?['academicYear'], '2025-2026');
        expect(mockClient.lastQuery?['gradeLevel'], 10);
      });

      test('parses class list correctly', () async {
        mockClient.mockResponse = {
          'results': [
            {
              '_id': 'class-1',
              'name': '10A1',
              'code': '10A1',
              'gradeLevel': 10,
              'academicYear': '2025-2026',
            },
            {
              '_id': 'class-2',
              'name': '10A2',
              'code': '10A2',
              'gradeLevel': 10,
              'academicYear': '2025-2026',
            },
          ],
          'page': 1,
          'limit': 20,
          'total': 2,
          'pages': 1,
        };

        final result = await service.getClasses();

        expect(result.results, hasLength(2));
        expect(result.results.first.id, 'class-1');
        expect(result.results.first.name, '10A1');
        expect(result.results.first.gradeLevel, 10);
        expect(result.total, 2);
      });
    });

    group('getClassById', () {
      test('returns single class by id', () async {
        mockClient.mockResponse = {
          '_id': 'class-1',
          'name': '10A1',
          'code': '10A1',
          'gradeLevel': 10,
        };

        final result = await service.getClassById('class-1');

        expect(result.id, 'class-1');
        expect(result.name, '10A1');
        expect(result.gradeLevel, 10);
        expect(mockClient.lastPath, '/classes/class-1');
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
          schoolId: 'school-1',
        );

        expect(result.id, 'class-new');
        expect(result.name, '11A1');
        expect(result.gradeLevel, 11);
        expect(mockClient.lastPath, '/classes');
        expect(mockClient.lastBody['name'], '11A1');
        expect(mockClient.lastBody['gradeLevel'], 11);
        expect(mockClient.lastBody['schoolId'], 'school-1');
      });
    });

    group('updateClass', () {
      test('sends PATCH request with correct data', () async {
        mockClient.mockResponse = {
          '_id': 'class-1',
          'name': 'Updated Class',
          'code': '10A1',
          'gradeLevel': 10,
        };

        final result = await service.updateClass(
          'class-1',
          name: 'Updated Class',
          gradeLevel: 11,
        );

        expect(result.id, 'class-1');
        expect(result.name, 'Updated Class');
        expect(mockClient.callHistory[0]['method'], 'PATCH');
        expect(mockClient.lastPath, '/classes/class-1');
        expect(mockClient.lastBody['name'], 'Updated Class');
        expect(mockClient.lastBody['gradeLevel'], 11);
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
              'email': 'sv001@school.edu',
            },
            {
              '_id': 'student-2',
              'name': 'Tran Thi B',
              'studentCode': 'SV002',
              'email': 'sv002@school.edu',
            },
          ],
        };

        final result = await service.getStudentsByClass('class-1');

        expect(result, hasLength(2));
        expect(result.first.id, 'student-1');
        expect(result.first.name, 'Nguyen Van A');
        expect(result.first.studentCode, 'SV001');
        expect(result.last.studentCode, 'SV002');
        expect(mockClient.lastPath, '/classes/class-1/students');
      });

      test('handles empty students list', () async {
        mockClient.mockResponse = {
          'results': <Map<String, dynamic>>[],
        };

        final result = await service.getStudentsByClass('class-1');

        expect(result, isEmpty);
      });
    });

    group('addStudents', () {
      test('sends POST request with studentIds', () async {
        mockClient.mockResponse = {
          '_id': 'class-1',
          'name': '10A1',
          'students': ['student-1', 'student-2'],
        };

        final result = await service.addStudents(
          classId: 'class-1',
          studentIds: ['student-1', 'student-2'],
        );

        expect(result.id, 'class-1');
        expect(mockClient.lastPath, '/classes/class-1/students');
        expect(mockClient.lastBody['studentIds'], ['student-1', 'student-2']);
      });
    });

    group('importStudents', () {
      test('sends POST request with students data', () async {
        mockClient.mockResponse = {
          'success': true,
          'imported': 10,
          'failed': 0,
        };

        final result = await service.importStudents(
          classId: 'class-1',
          students: [
            {'name': 'Student 1', 'studentCode': 'SV001'},
            {'name': 'Student 2', 'studentCode': 'SV002'},
          ],
        );

        expect(result['success'], true);
        expect(mockClient.lastPath, '/classes/class-1/students/import');
        expect(mockClient.lastBody['students'], hasLength(2));
      });
    });

    group('deleteClass', () {
      test('sends DELETE request', () async {
        mockClient.mockResponse = {'success': true};

        await service.deleteClass('class-1');

        expect(mockClient.lastPath, '/classes/class-1');
        expect(mockClient.callHistory[0]['method'], 'DELETE');
      });
    });

    group('error handling', () {
      test('throws ApiException on server error', () async {
        mockClient.shouldThrow = true;
        mockClient.errorType = 'api';

        expect(
          () => service.getClasses(),
          throwsA(isA<ApiException>()),
        );
      });

      test('throws NetworkException on connection error', () async {
        mockClient.shouldThrow = true;
        mockClient.errorType = 'network';

        expect(
          () => service.getClassById('class-1'),
          throwsA(isA<NetworkException>()),
        );
      });
    });
  });
}
