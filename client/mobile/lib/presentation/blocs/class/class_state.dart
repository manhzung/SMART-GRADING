part of 'class_bloc.dart';

abstract class ClassState extends Equatable {
  const ClassState();

  @override
  List<Object?> get props => [];
}

class ClassInitial extends ClassState {}

class ClassLoading extends ClassState {}

class ClassLoaded extends ClassState {
  final List<Class> classes;
  final bool hasMore;
  final int currentPage;

  const ClassLoaded({
    required this.classes,
    this.hasMore = false,
    this.currentPage = 1,
  });

  @override
  List<Object?> get props => [classes, hasMore, currentPage];
}

class ClassError extends ClassState {
  final String message;

  const ClassError({required this.message});

  @override
  List<Object?> get props => [message];
}

class ClassCreating extends ClassState {}

class ClassCreated extends ClassState {
  final Class createdClass;
  const ClassCreated({required this.createdClass});
}

class ClassUpdating extends ClassState {}

class ClassUpdated extends ClassState {
  final Class updatedClass;
  const ClassUpdated({required this.updatedClass});
}

class ClassDeleting extends ClassState {}

class ClassDeleted extends ClassState {
  final String id;
  const ClassDeleted({required this.id});
}
