part of 'auth_bloc.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class AuthCheckRequested extends AuthEvent {}

class AuthLoginRequested extends AuthEvent {
  final String email;
  final String password;

  const AuthLoginRequested({required this.email, required this.password});

  @override
  List<Object?> get props => [email, password];
}

class AuthLogoutRequested extends AuthEvent {}

class AuthRegisterRequested extends AuthEvent {
  final String name;
  final String email;
  final String? phone;
  final String school;
  final String password;

  const AuthRegisterRequested({
    required this.name,
    required this.email,
    this.phone,
    required this.school,
    required this.password,
  });

  @override
  List<Object?> get props => [name, email, phone, school, password];
}

class AuthForgotPasswordRequested extends AuthEvent {
  final String email;

  const AuthForgotPasswordRequested({required this.email});

  @override
  List<Object?> get props => [email];
}

class AuthProfileUpdated extends AuthEvent {
  final User user;

  const AuthProfileUpdated(this.user);

  @override
  List<Object?> get props => [user];
}

class AuthResendVerificationEmailRequested extends AuthEvent {
  final String email;

  const AuthResendVerificationEmailRequested({required this.email});

  @override
  List<Object?> get props => [email];
}
