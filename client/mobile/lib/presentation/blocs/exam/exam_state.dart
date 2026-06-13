part of 'exam_bloc.dart';

abstract class ExamState extends Equatable {
  const ExamState();

  @override
  List<Object?> get props => [];
}

class ExamInitial extends ExamState {}

class ExamLoading extends ExamState {}

class ExamLoaded extends ExamState {
  final List<Exam> exams;
  final int total;
  final bool hasMore;
  final int currentPage;
  final bool isLoadingMore;

  const ExamLoaded({
    required this.exams,
    this.total = 0,
    this.hasMore = false,
    this.currentPage = 1,
    this.isLoadingMore = false,
  });

  ExamLoaded copyWith({
    List<Exam>? exams,
    int? total,
    bool? hasMore,
    int? currentPage,
    bool? isLoadingMore,
  }) {
    return ExamLoaded(
      exams: exams ?? this.exams,
      total: total ?? this.total,
      hasMore: hasMore ?? this.hasMore,
      currentPage: currentPage ?? this.currentPage,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
    );
  }

  @override
  List<Object?> get props => [exams, total, hasMore, currentPage, isLoadingMore];
}

class ExamError extends ExamState {
  final String message;

  const ExamError({required this.message});

  @override
  List<Object?> get props => [message];
}
