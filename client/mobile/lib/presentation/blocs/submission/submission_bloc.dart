import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/submission_service.dart';
import '../../../domain/entities/exam.entity.dart';

part 'submission_event.dart';
part 'submission_state.dart';

class SubmissionBloc extends Bloc<SubmissionEvent, SubmissionState> {
  SubmissionBloc({required ApiClient apiClient})
      : _submissionService = SubmissionService(apiClient: apiClient),
        super(SubmissionInitial()) {
    on<SubmissionScanRequested>(_onScanRequested);
    on<SubmissionLoadRequested>(_onLoadRequested);
    on<SubmissionLoadByExamRequested>(_onLoadByExamRequested);
  }

  final SubmissionService _submissionService;

  Future<void> _onScanRequested(
    SubmissionScanRequested event,
    Emitter<SubmissionState> emit,
  ) async {
    emit(SubmissionScanning());
    try {
      final result = await _submissionService.scanSubmission(
        examId: event.examId,
        imagePath: event.imagePath,
      );
      emit(SubmissionScanned(submission: result));
    } catch (e) {
      emit(SubmissionError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onLoadRequested(
    SubmissionLoadRequested event,
    Emitter<SubmissionState> emit,
  ) async {
    debugPrint('[SubmissionBloc] _onLoadRequested examId=${event.examId}');
    emit(SubmissionLoading());
    try {
      final result = await _submissionService.getSubmissions(
        page: 1,
        limit: 20,
        examId: event.examId,
      );
      debugPrint('[SubmissionBloc] getSubmissions returned: total=${result.total} results=${result.results.length}');
      for (final s in result.results.take(3)) {
        debugPrint('[SubmissionBloc]   raw: id=${s.id} status="${s.status}" examId=${s.examId} studentId=${s.studentId} examTitle=${s.examTitle}');
      }
      emit(SubmissionLoaded(
        submissions: result.results,
        hasMore: result.page < result.pages,
        currentPage: result.page,
      ));
    } catch (e) {
      debugPrint('[SubmissionBloc] _onLoadRequested ERROR: $e');
      emit(SubmissionError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onLoadByExamRequested(
    SubmissionLoadByExamRequested event,
    Emitter<SubmissionState> emit,
  ) async {
    emit(SubmissionLoading());
    try {
      final submissions = await _submissionService.getSubmissionsByExam(event.examId);
      emit(SubmissionLoaded(
        submissions: submissions,
        hasMore: false,
        currentPage: 1,
      ));
    } catch (e) {
      emit(SubmissionError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }
}
