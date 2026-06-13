part of 'submission_bloc.dart';

abstract class SubmissionState extends Equatable {
  const SubmissionState();

  @override
  List<Object?> get props => [];
}

class SubmissionInitial extends SubmissionState {}

class SubmissionLoading extends SubmissionState {}

class SubmissionScanning extends SubmissionState {}

class SubmissionScanned extends SubmissionState {
  final Submission? submission;

  const SubmissionScanned({this.submission});

  @override
  List<Object?> get props => [submission];
}

class SubmissionLoaded extends SubmissionState {
  final List<Submission> submissions;
  final bool hasMore;
  final int currentPage;

  const SubmissionLoaded({
    required this.submissions,
    this.hasMore = false,
    this.currentPage = 1,
  });

  @override
  List<Object?> get props => [submissions, hasMore, currentPage];
}

class SubmissionError extends SubmissionState {
  final String message;

  const SubmissionError({required this.message});

  @override
  List<Object?> get props => [message];
}
