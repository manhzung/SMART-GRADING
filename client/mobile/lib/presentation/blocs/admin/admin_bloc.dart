import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/user_service.dart';
import '../../../core/network/school_service.dart';
import '../../../domain/entities/user.entity.dart';

part 'admin_event.dart';
part 'admin_state.dart';

class AdminBloc extends Bloc<AdminEvent, AdminState> {
  AdminBloc({required ApiClient apiClient})
      : _userService = UserService(apiClient: apiClient),
        _schoolService = SchoolService(apiClient: apiClient),
        super(AdminInitial()) {
    on<AdminLoadUsersRequested>(_onLoadUsers);
    on<AdminLoadSchoolsRequested>(_onLoadSchools);
    on<AdminAddUserRequested>(_onAddUser);
    on<AdminUpdateUserRequested>(_onUpdateUser);
    on<AdminDeleteUserRequested>(_onDeleteUser);
    on<AdminAddSchoolRequested>(_onAddSchool);
    on<AdminUpdateSchoolRequested>(_onUpdateSchool);
    on<AdminDeleteSchoolRequested>(_onDeleteSchool);
  }

  final UserService _userService;
  final SchoolService _schoolService;

  Future<void> _onLoadUsers(
    AdminLoadUsersRequested event,
    Emitter<AdminState> emit,
  ) async {
    emit(AdminLoading());
    try {
      final result = await _userService.getStudents(page: 1, limit: 100);
      final teachersResult = await _userService.getTeachers(page: 1, limit: 100);
      final allUsers = [...result.results, ...teachersResult.results];
      emit(AdminUsersLoaded(users: allUsers));
    } catch (e) {
      emit(AdminError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onLoadSchools(
    AdminLoadSchoolsRequested event,
    Emitter<AdminState> emit,
  ) async {
    emit(AdminLoading());
    try {
      final schools = await _schoolService.getSchools();
      emit(AdminSchoolsLoaded(schools: schools));
    } catch (e) {
      emit(AdminError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onAddUser(
    AdminAddUserRequested event,
    Emitter<AdminState> emit,
  ) async {
    try {
      await _userService.createUser(
        name: event.name,
        email: event.email,
        password: 'SmartGrading123',
        role: event.role,
        schoolId: event.schoolId,
      );
      add(AdminLoadUsersRequested());
    } catch (e) {
      emit(AdminError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onUpdateUser(
    AdminUpdateUserRequested event,
    Emitter<AdminState> emit,
  ) async {
    try {
      await _userService.updateUser(
        userId: event.userId,
        name: event.name,
        role: event.role,
      );
      add(AdminLoadUsersRequested());
    } catch (e) {
      emit(AdminError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onDeleteUser(
    AdminDeleteUserRequested event,
    Emitter<AdminState> emit,
  ) async {
    try {
      await _userService.deleteUser(event.userId);
      add(AdminLoadUsersRequested());
    } catch (e) {
      emit(AdminError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onAddSchool(
    AdminAddSchoolRequested event,
    Emitter<AdminState> emit,
  ) async {
    try {
      await _schoolService.createSchool(
        name: event.name,
        address: event.address,
      );
      add(AdminLoadSchoolsRequested());
    } catch (e) {
      emit(AdminError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onUpdateSchool(
    AdminUpdateSchoolRequested event,
    Emitter<AdminState> emit,
  ) async {
    try {
      await _schoolService.updateSchool(
        schoolId: event.schoolId,
        name: event.name,
        address: event.address,
      );
      add(AdminLoadSchoolsRequested());
    } catch (e) {
      emit(AdminError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onDeleteSchool(
    AdminDeleteSchoolRequested event,
    Emitter<AdminState> emit,
  ) async {
    try {
      await _schoolService.deleteSchool(event.schoolId);
      add(AdminLoadSchoolsRequested());
    } catch (e) {
      emit(AdminError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }
}
