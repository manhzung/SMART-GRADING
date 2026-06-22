part of 'admin_bloc.dart';

abstract class AdminState extends Equatable {
  const AdminState();

  @override
  List<Object?> get props => [];
}

class AdminInitial extends AdminState {}

class AdminLoading extends AdminState {}

class AdminUsersLoaded extends AdminState {
  final List<User> users;

  const AdminUsersLoaded({required this.users});

  @override
  List<Object?> get props => [users];
}

class AdminSchoolsLoaded extends AdminState {
  final List<School> schools;

  const AdminSchoolsLoaded({required this.schools});

  @override
  List<Object?> get props => [schools];
}

class AdminError extends AdminState {
  final String message;

  const AdminError({required this.message});

  @override
  List<Object?> get props => [message];
}

class AdminOperationSuccess extends AdminState {
  final String message;

  const AdminOperationSuccess({required this.message});

  @override
  List<Object?> get props => [message];
}
