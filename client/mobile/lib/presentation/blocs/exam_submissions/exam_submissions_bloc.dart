import 'dart:developer' as developer;

import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/exam_submissions_service.dart';
import 'exam_submissions_event.dart';
import 'exam_submissions_state.dart';

class ExamSubmissionsBloc extends Bloc<ExamSubmissionsEvent, ExamSubmissionsState> {
  final ExamSubmissionsService service;

  ExamSubmissionsBloc({required this.service}) : super(const ExamSubmissionsInitial()) {
    on<ExamSubmissionsLoadRequested>(_onLoad);
    on<ExamSubmissionsRefreshRequested>(_onRefresh);
    on<ExamSubmissionsFilterChanged>(_onFilterChanged);
    on<ExamSubmissionsSearchChanged>(_onSearchChanged);
    on<ExamSubmissionClassToggled>(_onClassToggled);
  }

  Future<void> _onLoad(
    ExamSubmissionsLoadRequested event,
    Emitter<ExamSubmissionsState> emit,
  ) async {
    developer.log(
      '[ExamSubmissionsBloc] _onLoad examId=${event.examId}',
      name: 'ExamSubmissionsBloc',
    );
    emit(const ExamSubmissionsLoading());
    try {
      final byClass = await service.getExamSubmissionsByClass(event.examId);
      final expandedIds = <String>{
        for (final entry in byClass.entries)
          if (entry.value.submissions.isNotEmpty) entry.key,
      };
      developer.log(
        '[ExamSubmissionsBloc] _onLoad success classes=${byClass.length} ids=${byClass.keys.toList()}',
        name: 'ExamSubmissionsBloc',
      );
      emit(ExamSubmissionsLoaded(
        byClass: byClass,
        expandedClassIds: expandedIds,
      ));
    } catch (e, st) {
      developer.log(
        '[ExamSubmissionsBloc] _onLoad ERROR $e',
        name: 'ExamSubmissionsBloc',
        error: e,
        stackTrace: st,
      );
      emit(ExamSubmissionsError(message: e.toString()));
    }
  }

  Future<void> _onRefresh(
    ExamSubmissionsRefreshRequested event,
    Emitter<ExamSubmissionsState> emit,
  ) async {
    emit(const ExamSubmissionsLoading());
    try {
      final byClass = await service.getExamSubmissionsByClass(event.examId);
      final expandedIds = <String>{
        for (final entry in byClass.entries)
          if (entry.value.submissions.isNotEmpty) entry.key,
      };
      emit(ExamSubmissionsLoaded(
        byClass: byClass,
        expandedClassIds: expandedIds,
      ));
    } catch (e) {
      emit(ExamSubmissionsError(message: e.toString()));
    }
  }

  void _onFilterChanged(
    ExamSubmissionsFilterChanged event,
    Emitter<ExamSubmissionsState> emit,
  ) {
    final s = state;
    if (s is ExamSubmissionsLoaded) {
      emit(s.copyWith(filter: event.filter));
    }
  }

  void _onSearchChanged(
    ExamSubmissionsSearchChanged event,
    Emitter<ExamSubmissionsState> emit,
  ) {
    final s = state;
    if (s is ExamSubmissionsLoaded) {
      emit(s.copyWith(searchQuery: event.query));
    }
  }

  void _onClassToggled(
    ExamSubmissionClassToggled event,
    Emitter<ExamSubmissionsState> emit,
  ) {
    final s = state;
    if (s is ExamSubmissionsLoaded) {
      final newSet = Set<String>.from(s.expandedClassIds);
      if (newSet.contains(event.classId)) {
        newSet.remove(event.classId);
      } else {
        newSet.add(event.classId);
      }
      emit(s.copyWith(expandedClassIds: newSet));
    }
  }
}
