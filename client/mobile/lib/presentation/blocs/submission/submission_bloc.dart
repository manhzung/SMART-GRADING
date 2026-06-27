import 'dart:developer' as developer;
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
    on<SubmissionLoadMoreRequested>(_onLoadMoreRequested);
    on<SubmissionRefreshRequested>(_onRefreshRequested);
  }

  final SubmissionService _submissionService;
  int _currentPage = 1;
  bool _hasMore = false;
  List<Submission> _allSubmissions = [];

  Future<void> _onScanRequested(
    SubmissionScanRequested event,
    Emitter<SubmissionState> emit,
  ) async {
    developer.log('SubmissionBloc: SubmissionScanRequested examId=${event.examId}', name: 'SubmissionBloc');
    emit(SubmissionScanning());
    try {
      final result = await _submissionService.scanSubmission(
        examId: event.examId,
        imagePath: event.imagePath,
      );
      emit(SubmissionScanned(submission: result));
    } catch (e) {
      developer.log('SubmissionBloc: SubmissionScanRequested error=$e', name: 'SubmissionBloc');
      emit(SubmissionError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onLoadRequested(
    SubmissionLoadRequested event,
    Emitter<SubmissionState> emit,
  ) async {
    developer.log('SubmissionBloc: SubmissionLoadRequested examId=${event.examId}', name: 'SubmissionBloc');
    emit(SubmissionLoading());
    _currentPage = 1;
    _allSubmissions = [];
    try {
      final result = await _submissionService.getSubmissions(
        page: 1,
        limit: 50,
        examId: event.examId,
      );
      developer.log(
        'SubmissionBloc: got ${result.results.length} submissions, total=${result.total}, pages=${result.pages}',
        name: 'SubmissionBloc',
      );
      _allSubmissions = result.results;
      _hasMore = result.page < result.pages;
      emit(SubmissionLoaded(
        submissions: _allSubmissions,
        hasMore: _hasMore,
        currentPage: result.page,
      ));
    } catch (e) {
      developer.log('SubmissionBloc: SubmissionLoadRequested error=$e', name: 'SubmissionBloc');
      emit(SubmissionError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onLoadMoreRequested(
    SubmissionLoadMoreRequested event,
    Emitter<SubmissionState> emit,
  ) async {
    if (!_hasMore) return;
    
    try {
      _currentPage++;
      final result = await _submissionService.getSubmissions(
        page: _currentPage,
        limit: 50,
        examId: event.examId,
      );
      _allSubmissions = [..._allSubmissions, ...result.results];
      _hasMore = result.page < result.pages;
      emit(SubmissionLoaded(
        submissions: _allSubmissions,
        hasMore: _hasMore,
        currentPage: result.page,
      ));
    } catch (e) {
      emit(SubmissionError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onRefreshRequested(
    SubmissionRefreshRequested event,
    Emitter<SubmissionState> emit,
  ) async {
    _currentPage = 1;
    _allSubmissions = [];
    try {
      final result = await _submissionService.getSubmissions(
        page: 1,
        limit: 50,
        examId: event.examId,
      );
      _allSubmissions = result.results;
      _hasMore = result.page < result.pages;
      emit(SubmissionLoaded(
        submissions: _allSubmissions,
        hasMore: _hasMore,
        currentPage: result.page,
      ));
    } catch (e) {
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
