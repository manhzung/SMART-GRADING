part of 'admin_bloc.dart';

abstract class AdminEvent extends Equatable {
  const AdminEvent();

  @override
  List<Object?> get props => [];
}

class AdminLoadUsersRequested extends AdminEvent {}

class AdminLoadSchoolsRequested extends AdminEvent {}

class AdminAddUserRequested extends AdminEvent {
  final String name;
  final String email;
  final String role;
  final String? schoolId;

  const AdminAddUserRequested({
    required this.name,
    required this.email,
    required this.role,
    this.schoolId,
  });

  @override
  List<Object?> get props => [name, email, role, schoolId];
}

class AdminUpdateUserRequested extends AdminEvent {
  final String userId;
  final String name;
  final String role;

  const AdminUpdateUserRequested({
    required this.userId,
    required this.name,
    required this.role,
  });

  @override
  List<Object?> get props => [userId, name, role];
}

class AdminDeleteUserRequested extends AdminEvent {
  final String userId;

  const AdminDeleteUserRequested({required this.userId});

  @override
  List<Object?> get props => [userId];
}

class AdminAddSchoolRequested extends AdminEvent {
  final String name;
  final String? address;

  const AdminAddSchoolRequested({required this.name, this.address});

  @override
  List<Object?> get props => [name, address];
}

class AdminUpdateSchoolRequested extends AdminEvent {
  final String schoolId;
  final String name;
  final String? address;

  const AdminUpdateSchoolRequested({
    required this.schoolId,
    required this.name,
    this.address,
  });

  @override
  List<Object?> get props => [schoolId, name, address];
}

class AdminDeleteSchoolRequested extends AdminEvent {
  final String schoolId;

  const AdminDeleteSchoolRequested({required this.schoolId});

  @override
  List<Object?> get props => [schoolId];
}
