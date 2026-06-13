part of 'exam_bloc.dart';

abstract class ExamEvent extends Equatable {
  const ExamEvent();

  @override
  List<Object?> get props => [];
}

class ExamLoadRequested extends ExamEvent {
  final String? classId;
  final String? status;
  final String? fromDate;
  final String? toDate;
  final String? search;

  const ExamLoadRequested({
    this.classId,
    this.status,
    this.fromDate,
    this.toDate,
    this.search,
  });

  @override
  List<Object?> get props => [classId, status, fromDate, toDate, search];
}

class ExamLoadMoreRequested extends ExamEvent {}

class ExamCreateRequested extends ExamEvent {
  final Exam exam;

  const ExamCreateRequested(this.exam);

  @override
  List<Object?> get props => [exam];
}

class ExamUpdateRequested extends ExamEvent {
  final Exam exam;

  const ExamUpdateRequested(this.exam);

  @override
  List<Object?> get props => [exam];
}

class ExamDeleteRequested extends ExamEvent {
  final String examId;

  const ExamDeleteRequested(this.examId);

  @override
  List<Object?> get props => [examId];
}
