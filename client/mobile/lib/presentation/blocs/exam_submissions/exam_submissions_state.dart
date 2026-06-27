import 'package:equatable/equatable.dart';
import '../../../domain/entities/class_submission_summary.entity.dart';

abstract class ExamSubmissionsState extends Equatable {
  const ExamSubmissionsState();
  @override
  List<Object?> get props => [];
}

class ExamSubmissionsInitial extends ExamSubmissionsState {
  const ExamSubmissionsInitial();
}

class ExamSubmissionsLoading extends ExamSubmissionsState {
  const ExamSubmissionsLoading();
}

class ExamSubmissionsLoaded extends ExamSubmissionsState {
  final Map<String, ClassSubmissionSummary> byClass;
  final String filter;
  final String searchQuery;
  final Set<String> expandedClassIds;

  const ExamSubmissionsLoaded({
    required this.byClass,
    this.filter = 'ALL',
    this.searchQuery = '',
    this.expandedClassIds = const {},
  });

  ExamSubmissionsLoaded copyWith({
    Map<String, ClassSubmissionSummary>? byClass,
    String? filter,
    String? searchQuery,
    Set<String>? expandedClassIds,
  }) {
    return ExamSubmissionsLoaded(
      byClass: byClass ?? this.byClass,
      filter: filter ?? this.filter,
      searchQuery: searchQuery ?? this.searchQuery,
      expandedClassIds: expandedClassIds ?? this.expandedClassIds,
    );
  }

  @override
  List<Object?> get props => [byClass, filter, searchQuery, expandedClassIds];
}

class ExamSubmissionsError extends ExamSubmissionsState {
  final String message;
  const ExamSubmissionsError({required this.message});
  @override
  List<Object?> get props => [message];
}
