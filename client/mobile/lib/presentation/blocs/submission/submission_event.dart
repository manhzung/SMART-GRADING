part of 'submission_bloc.dart';

abstract class SubmissionEvent extends Equatable {
  const SubmissionEvent();

  @override
  List<Object?> get props => [];
}

class SubmissionScanRequested extends SubmissionEvent {
  final String examId;
  final String imagePath;

  const SubmissionScanRequested({required this.examId, required this.imagePath});

  @override
  List<Object?> get props => [examId, imagePath];
}

class SubmissionLoadRequested extends SubmissionEvent {
  final String? examId;

  const SubmissionLoadRequested({this.examId});

  @override
  List<Object?> get props => [examId];
}

class SubmissionLoadByExamRequested extends SubmissionEvent {
  final String examId;

  const SubmissionLoadByExamRequested(this.examId);

  @override
  List<Object?> get props => [examId];
}

class SubmissionLoadMoreRequested extends SubmissionEvent {
  final String? examId;

  const SubmissionLoadMoreRequested({this.examId});

  @override
  List<Object?> get props => [examId];
}

class SubmissionRefreshRequested extends SubmissionEvent {
  final String? examId;

  const SubmissionRefreshRequested({this.examId});

  @override
  List<Object?> get props => [examId];
}
