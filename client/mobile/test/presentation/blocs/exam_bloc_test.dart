import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:smart_grading_mobile/core/network/api_client.dart';
import 'package:smart_grading_mobile/core/network/exam_service.dart';
import 'package:smart_grading_mobile/domain/entities/exam.entity.dart';
import 'package:smart_grading_mobile/presentation/blocs/exam/exam_bloc.dart';

class _FakeApiClient extends Mock implements ApiClient {}

Exam _makeExam(String id) => Exam(
      id: id,
      title: 'Test $id',
      status: 'published',
      createdAt: DateTime(2026, 1, 1),
    );

void main() {
  late ExamBloc bloc;
  late _FakeApiClient apiClient;

  setUp(() {
    apiClient = _FakeApiClient();
    bloc = ExamBloc(apiClient: apiClient);
  });

  tearDown(() async {
    await bloc.close();
  });

  test('UpcomingExamsLoadRequested emits Loading then Loaded on success', () async {
    final exams = [_makeExam('e1'), _makeExam('e2')];

    when(apiClient.get<UpcomingExams>(
      'exams/upcoming',
      queryParameters: anyNamed('queryParameters'),
      parser: anyNamed('parser'),
    )).thenAnswer((_) async {
      return UpcomingExams(results: exams, limit: 5, count: 2);
    });

    final expected = [
      predicate<ExamState>((s) => s is ExamUpcomingLoading),
      predicate<ExamState>((s) =>
          s is ExamUpcomingLoaded && s.exams.length == 2 && s.count == 2),
    ];

    expect(
      bloc.stream,
      emitsInOrder(expected),
    );

    bloc.add(const UpcomingExamsLoadRequested(limit: 5));
  });

  test('UpcomingExamsLoadRequested emits Loading then ExamError on failure',
      () async {
    when(apiClient.get<UpcomingExams>(
      'exams/upcoming',
      queryParameters: anyNamed('queryParameters'),
      parser: anyNamed('parser'),
    )).thenThrow(Exception('Network error'));

    final expected = [
      predicate<ExamState>((s) => s is ExamUpcomingLoading),
      predicate<ExamState>((s) => s is ExamError && s.message.contains('Network error')),
    ];

    expect(
      bloc.stream,
      emitsInOrder(expected),
    );

    bloc.add(const UpcomingExamsLoadRequested());
  });

  test('UpcomingExamsLoadRequested results in ExamUpcomingLoaded with empty list',
      () async {
    when(apiClient.get<UpcomingExams>(
      'exams/upcoming',
      queryParameters: anyNamed('queryParameters'),
      parser: anyNamed('parser'),
    )).thenAnswer((_) async => UpcomingExams(results: const [], limit: 5, count: 0));

    bloc.add(const UpcomingExamsLoadRequested());

    await expectLater(
      bloc.stream,
      emitsThrough(predicate<ExamState>((s) =>
          s is ExamUpcomingLoaded && s.exams.isEmpty && s.count == 0)),
    );
  });
}
