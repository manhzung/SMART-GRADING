import 'package:equatable/equatable.dart';

abstract class ExamSubmissionsEvent extends Equatable {
  const ExamSubmissionsEvent();
  @override
  List<Object?> get props => [];
}

class ExamSubmissionsLoadRequested extends ExamSubmissionsEvent {
  final String examId;
  const ExamSubmissionsLoadRequested({required this.examId});
  @override
  List<Object?> get props => [examId];
}

class ExamSubmissionsRefreshRequested extends ExamSubmissionsEvent {
  final String examId;
  const ExamSubmissionsRefreshRequested({required this.examId});
  @override
  List<Object?> get props => [examId];
}

class ExamSubmissionsFilterChanged extends ExamSubmissionsEvent {
  final String filter;
  const ExamSubmissionsFilterChanged({required this.filter});
  @override
  List<Object?> get props => [filter];
}

class ExamSubmissionsSearchChanged extends ExamSubmissionsEvent {
  final String query;
  const ExamSubmissionsSearchChanged({required this.query});
  @override
  List<Object?> get props => [query];
}

class ExamSubmissionClassToggled extends ExamSubmissionsEvent {
  final String classId;
  const ExamSubmissionClassToggled({required this.classId});
  @override
  List<Object?> get props => [classId];
}
