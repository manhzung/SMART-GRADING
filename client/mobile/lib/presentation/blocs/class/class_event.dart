part of 'class_bloc.dart';

abstract class ClassEvent extends Equatable {
  const ClassEvent();

  @override
  List<Object?> get props => [];
}

class ClassFetchRequested extends ClassEvent {
  final String? schoolId;
  final String? academicYear;
  final int? gradeLevel;

  const ClassFetchRequested({this.schoolId, this.academicYear, this.gradeLevel});

  @override
  List<Object?> get props => [schoolId, academicYear, gradeLevel];
}

class ClassLoadMoreRequested extends ClassEvent {}

class ClassCreateRequested extends ClassEvent {
  final String name;
  final String code;
  final int gradeLevel;
  final String academicYear;
  final String? schoolId;

  const ClassCreateRequested({
    required this.name,
    required this.code,
    required this.gradeLevel,
    required this.academicYear,
    this.schoolId,
  });

  @override
  List<Object?> get props => [name, code, gradeLevel, academicYear, schoolId];
}

class ClassUpdateRequested extends ClassEvent {
  final String id;
  final String? name;
  final String? code;
  final int? gradeLevel;
  final String? academicYear;

  const ClassUpdateRequested({
    required this.id,
    this.name,
    this.code,
    this.gradeLevel,
    this.academicYear,
  });

  @override
  List<Object?> get props => [id, name, code, gradeLevel, academicYear];
}

class ClassDeleteRequested extends ClassEvent {
  final String id;

  const ClassDeleteRequested({required this.id});

  @override
  List<Object?> get props => [id];
}
