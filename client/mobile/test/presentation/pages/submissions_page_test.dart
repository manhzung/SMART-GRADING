import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:smart_grading_mobile/core/network/api_client.dart';
import 'package:smart_grading_mobile/core/network/exam_submissions_service.dart';
import 'package:smart_grading_mobile/core/network/submission_service.dart' show PaginatedSubmissions;
import 'package:smart_grading_mobile/domain/entities/exam.entity.dart';
import 'package:smart_grading_mobile/presentation/pages/submissions_page.dart';

class MockApiClient extends Mock implements ApiClient {}

Widget _wrapWithBloc(Widget _, Widget child) {
  return MaterialApp(
    home: child,
  );
}

void main() {
  late MockApiClient apiClient;
  late ExamSubmissionsService service;

  setUp(() {
    apiClient = MockApiClient();
    service = ExamSubmissionsService(apiClient: apiClient);
  });

  testWidgets('SubmissionsPage shows class groups when loaded', (tester) async {
    when(() => apiClient.get<PaginatedSubmissions>(
          any(),
          queryParameters: any(named: 'queryParameters'),
          parser: any(named: 'parser'),
        )).thenAnswer((invocation) async {
      final parser = invocation.namedArguments[#parser] as Function;
      return parser({
        'results': [
          {
            '_id': 's1',
            'examId': 'e1',
            'studentId': {'_id': 'st1', 'name': 'Nguyen Van A', 'studentCode': 'SV001'},
            'status': 'GRADED',
            'classId': {'_id': 'c1', 'name': 'Lớp 10A'}
          },
          {
            '_id': 's2',
            'examId': 'e1',
            'studentId': {'_id': 'st2', 'name': 'Tran Thi B', 'studentCode': 'SV002'},
            'status': 'PENDING',
            'classId': {'_id': 'c2', 'name': 'Lớp 10B'}
          },
        ],
        'page': 1, 'limit': 50, 'total': 2, 'pages': 1,
      }) as PaginatedSubmissions;
    });

    await tester.runAsync(() async {
      await tester.pumpWidget(_wrapWithBloc(const SizedBox.shrink(), SubmissionsPage(examId: 'e1', service: service)));
      await tester.pump(const Duration(milliseconds: 200));
      await tester.pump(const Duration(milliseconds: 200));
    });

    expect(find.text('Lớp 10A'), findsOneWidget);
    expect(find.text('Lớp 10B'), findsOneWidget);
    expect(find.text('Nguyen Van A'), findsOneWidget);
  });
}
