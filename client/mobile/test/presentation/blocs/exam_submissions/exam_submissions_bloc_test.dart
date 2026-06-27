import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:smart_grading_mobile/core/network/api_client.dart';
import 'package:smart_grading_mobile/core/network/exam_submissions_service.dart';
import 'package:smart_grading_mobile/core/network/submission_service.dart' show PaginatedSubmissions;
import 'package:smart_grading_mobile/domain/entities/exam.entity.dart';
import 'package:smart_grading_mobile/presentation/blocs/exam_submissions/exam_submissions_bloc.dart';
import 'package:smart_grading_mobile/presentation/blocs/exam_submissions/exam_submissions_event.dart';
import 'package:smart_grading_mobile/presentation/blocs/exam_submissions/exam_submissions_state.dart';

class MockApiClient extends Mock implements ApiClient {}

void main() {
  late MockApiClient apiClient;
  late ExamSubmissionsService service;

  setUp(() {
    apiClient = MockApiClient();
    service = ExamSubmissionsService(apiClient: apiClient);
  });

  void setupMockApi() {
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
            'studentId': 'st1',
            'status': 'GRADED',
            'classId': 'c1',
          },
        ],
        'page': 1,
        'limit': 50,
        'total': 1,
        'pages': 1,
      }) as PaginatedSubmissions;
    });
  }

  test('initial state is ExamSubmissionsInitial', () {
    final bloc = ExamSubmissionsBloc(service: service);
    expect(bloc.state, isA<ExamSubmissionsInitial>());
    bloc.close();
  });

  test('emits [Loading, Loaded] when LoadRequested succeeds', () async {
    setupMockApi();
    final bloc = ExamSubmissionsBloc(service: service);
    final emitted = <ExamSubmissionsState>[];
    final sub = bloc.stream.listen(emitted.add);

    bloc.add(const ExamSubmissionsLoadRequested(examId: 'e1'));
    await Future.delayed(const Duration(milliseconds: 200));

    expect(emitted.length, 2);
    expect(emitted[0], isA<ExamSubmissionsLoading>());
    expect(emitted[1], isA<ExamSubmissionsLoaded>());
    final loaded = emitted[1] as ExamSubmissionsLoaded;
    expect(loaded.byClass.containsKey('c1'), isTrue);
    expect(loaded.expandedClassIds.contains('c1'), isTrue);

    await sub.cancel();
    await bloc.close();
  });

  test('emits [Loading, Error] when API throws', () async {
    when(() => apiClient.get<PaginatedSubmissions>(
          any(),
          queryParameters: any(named: 'queryParameters'),
          parser: any(named: 'parser'),
        )).thenThrow(Exception('Network error'));

    final bloc = ExamSubmissionsBloc(service: service);
    final emitted = <ExamSubmissionsState>[];
    final sub = bloc.stream.listen(emitted.add);

    bloc.add(const ExamSubmissionsLoadRequested(examId: 'e1'));
    await Future.delayed(const Duration(milliseconds: 200));

    expect(emitted.length, 2);
    expect(emitted[0], isA<ExamSubmissionsLoading>());
    expect(emitted[1], isA<ExamSubmissionsError>());

    await sub.cancel();
    await bloc.close();
  });

  test('toggles class expansion', () async {
    setupMockApi();
    final bloc = ExamSubmissionsBloc(service: service);
    bloc.add(const ExamSubmissionsLoadRequested(examId: 'e1'));
    await Future.delayed(const Duration(milliseconds: 200));

    bloc.add(const ExamSubmissionClassToggled(classId: 'c1'));
    await Future.delayed(const Duration(milliseconds: 100));

    final state = bloc.state as ExamSubmissionsLoaded;
    expect(state.expandedClassIds.contains('c1'), isFalse);

    bloc.add(const ExamSubmissionClassToggled(classId: 'c1'));
    await Future.delayed(const Duration(milliseconds: 100));

    final state2 = bloc.state as ExamSubmissionsLoaded;
    expect(state2.expandedClassIds.contains('c1'), isTrue);

    await bloc.close();
  });

  test('updates filter and search query on Loaded state', () async {
    setupMockApi();
    final bloc = ExamSubmissionsBloc(service: service);
    bloc.add(const ExamSubmissionsLoadRequested(examId: 'e1'));
    await Future.delayed(const Duration(milliseconds: 200));

    bloc.add(const ExamSubmissionsFilterChanged(filter: 'GRADED'));
    await Future.delayed(const Duration(milliseconds: 50));
    expect((bloc.state as ExamSubmissionsLoaded).filter, 'GRADED');

    bloc.add(const ExamSubmissionsSearchChanged(query: 'Nguyen'));
    await Future.delayed(const Duration(milliseconds: 50));
    expect((bloc.state as ExamSubmissionsLoaded).searchQuery, 'Nguyen');

    await bloc.close();
  });
}
