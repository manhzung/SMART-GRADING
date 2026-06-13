import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/exam_service.dart';
import '../../../domain/entities/exam.entity.dart';

part 'exam_event.dart';
part 'exam_state.dart';

class ExamBloc extends Bloc<ExamEvent, ExamState> {
  ExamBloc({required ApiClient apiClient})
      : _examService = ExamService(apiClient: apiClient),
        super(ExamInitial()) {
    on<ExamLoadRequested>(_onLoadRequested);
    on<ExamLoadMoreRequested>(_onLoadMoreRequested);
    on<ExamCreateRequested>(_onCreateRequested);
    on<ExamUpdateRequested>(_onUpdateRequested);
    on<ExamDeleteRequested>(_onDeleteRequested);
    on<UpcomingExamsLoadRequested>(_onUpcomingExamsLoadRequested);
  }

  final ExamService _examService;

  Future<void> _onLoadRequested(
    ExamLoadRequested event,
    Emitter<ExamState> emit,
  ) async {
    emit(ExamLoading());
    try {
      // ignore: avoid_print
      print('[ExamBloc] calling getExams...');
      final result = await _examService.getExams(
        page: 1,
        limit: 20,
        classId: event.classId,
        status: event.status,
        fromDate: event.fromDate,
        toDate: event.toDate,
        search: event.search,
      );
      // ignore: avoid_print
      print('[ExamBloc] got result: total=${result.total}, results=${result.results.length}');
      emit(ExamLoaded(
        exams: result.results,
        total: result.total,
        hasMore: result.page < result.pages,
        currentPage: result.page,
      ));
    } catch (e) {
      emit(ExamError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onLoadMoreRequested(
    ExamLoadMoreRequested event,
    Emitter<ExamState> emit,
  ) async {
    final currentState = state;
    if (currentState is! ExamLoaded || !currentState.hasMore) return;
    if (currentState.isLoadingMore) return;

    emit(currentState.copyWith(isLoadingMore: true));
    try {
      final result = await _examService.getExams(
        page: currentState.currentPage + 1,
        limit: 20,
      );
      emit(ExamLoaded(
        exams: [...currentState.exams, ...result.results],
        total: currentState.total,
        hasMore: result.page < result.pages,
        currentPage: result.page,
      ));
    } catch (e) {
      emit(ExamError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onCreateRequested(
    ExamCreateRequested event,
    Emitter<ExamState> emit,
  ) async {
    emit(ExamLoading());
    try {
      final data = <String, dynamic>{
        'title': event.exam.title,
      };
      if (event.exam.description != null) data['description'] = event.exam.description;
      if (event.exam.classIds.isNotEmpty) data['classIds'] = event.exam.classIds.map((c) => c.id).toList();
      if (event.exam.primaryClassId != null) data['primaryClassId'] = event.exam.primaryClassId!.id;
      if (event.exam.omrTemplateId != null) data['omrTemplateId'] = event.exam.omrTemplateId;
      if (event.exam.examDate != null) data['examDate'] = event.exam.examDate!.toIso8601String();
      if (event.exam.duration != 60) data['duration'] = event.exam.duration;
      if (event.exam.totalScore > 0) data['totalScore'] = event.exam.totalScore;

      final created = await _examService.createExam(
        title: event.exam.title,
        description: event.exam.description,
        classIds: event.exam.classIds.map((c) => c.id).toList(),
        primaryClassId: event.exam.primaryClassId?.id,
        omrTemplateId: event.exam.omrTemplateId,
        examDate: event.exam.examDate,
        duration: event.exam.duration,
        totalScore: event.exam.totalScore,
      );

      final result = await _examService.getExams(page: 1, limit: 20);
      emit(ExamLoaded(
        exams: [created, ...result.results],
        total: result.total + 1,
        hasMore: result.page < result.pages,
        currentPage: 1,
      ));
    } catch (e) {
      emit(ExamError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onUpdateRequested(
    ExamUpdateRequested event,
    Emitter<ExamState> emit,
  ) async {
    final currentState = state;
    emit(ExamLoading());
    try {
      final data = <String, dynamic>{};
      if (event.exam.description != null) data['description'] = event.exam.description;
      if (event.exam.examDate != null) data['examDate'] = event.exam.examDate!.toIso8601String();
      if (event.exam.duration != 60) data['duration'] = event.exam.duration;
      if (event.exam.totalScore > 0) data['totalScore'] = event.exam.totalScore;

      final updated = await _examService.updateExam(event.exam.id, data);
      final updatedList = currentState is ExamLoaded
          ? currentState.exams.map((e) => e.id == updated.id ? updated : e).toList()
          : [updated];
      final total = currentState is ExamLoaded ? currentState.total : 1;
      emit(ExamLoaded(
        exams: updatedList,
        total: total,
        hasMore: currentState is ExamLoaded ? currentState.hasMore : false,
        currentPage: currentState is ExamLoaded ? currentState.currentPage : 1,
      ));
    } catch (e) {
      emit(ExamError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onDeleteRequested(
    ExamDeleteRequested event,
    Emitter<ExamState> emit,
  ) async {
    final currentState = state;
    try {
      await _examService.deleteExam(event.examId);
      if (currentState is ExamLoaded) {
        final remaining = currentState.exams.where((e) => e.id != event.examId).toList();
        emit(ExamLoaded(
          exams: remaining,
          total: currentState.total - 1,
          hasMore: currentState.hasMore,
          currentPage: currentState.currentPage,
        ));
      }
    } catch (e) {
      emit(ExamError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onUpcomingExamsLoadRequested(
    UpcomingExamsLoadRequested event,
    Emitter<ExamState> emit,
  ) async {
    emit(ExamUpcomingLoading());
    try {
      final result = await _examService.getUpcomingExams(limit: event.limit);
      emit(ExamUpcomingLoaded(result.results, result.count));
    } catch (e) {
      emit(ExamError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }
}
