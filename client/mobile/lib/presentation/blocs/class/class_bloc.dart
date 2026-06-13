import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/class_service.dart';
import '../../../domain/entities/user.entity.dart';

part 'class_event.dart';
part 'class_state.dart';

class ClassBloc extends Bloc<ClassEvent, ClassState> {
  ClassBloc({required ApiClient apiClient})
      : _classService = ClassService(apiClient: apiClient),
        super(ClassInitial()) {
    on<ClassFetchRequested>(_onFetchRequested);
    on<ClassLoadMoreRequested>(_onLoadMoreRequested);
    on<ClassCreateRequested>(_onCreateRequested);
    on<ClassUpdateRequested>(_onUpdateRequested);
    on<ClassDeleteRequested>(_onDeleteRequested);
  }

  final ClassService _classService;

  Future<void> _onFetchRequested(
    ClassFetchRequested event,
    Emitter<ClassState> emit,
  ) async {
    emit(ClassLoading());
    try {
      final result = await _classService.getClasses(
        page: 1,
        limit: 20,
        schoolId: event.schoolId,
        academicYear: event.academicYear,
        gradeLevel: event.gradeLevel,
      );
      emit(ClassLoaded(
        classes: result.results,
        hasMore: result.page < result.pages,
        currentPage: result.page,
      ));
    } catch (e) {
      emit(ClassError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onLoadMoreRequested(
    ClassLoadMoreRequested event,
    Emitter<ClassState> emit,
  ) async {
    final currentState = state;
    if (currentState is! ClassLoaded || !currentState.hasMore) return;

    try {
      final result = await _classService.getClasses(
        page: currentState.currentPage + 1,
        limit: 20,
      );
      emit(ClassLoaded(
        classes: [...currentState.classes, ...result.results],
        hasMore: result.page < result.pages,
        currentPage: result.page,
      ));
    } catch (e) {
      emit(ClassError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onCreateRequested(
    ClassCreateRequested event,
    Emitter<ClassState> emit,
  ) async {
    emit(ClassCreating());
    try {
      final created = await _classService.createClass(
        name: event.name,
        code: event.code,
        gradeLevel: event.gradeLevel,
        academicYear: event.academicYear,
        schoolId: event.schoolId,
      );
      emit(ClassCreated(createdClass: created));
      add(const ClassFetchRequested());
    } catch (e) {
      emit(ClassError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onUpdateRequested(
    ClassUpdateRequested event,
    Emitter<ClassState> emit,
  ) async {
    emit(ClassUpdating());
    try {
      final updated = await _classService.updateClass(
        event.id,
        name: event.name,
        code: event.code,
        gradeLevel: event.gradeLevel,
        academicYear: event.academicYear,
      );
      emit(ClassUpdated(updatedClass: updated));
      add(const ClassFetchRequested());
    } catch (e) {
      emit(ClassError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onDeleteRequested(
    ClassDeleteRequested event,
    Emitter<ClassState> emit,
  ) async {
    emit(ClassDeleting());
    try {
      await _classService.deleteClass(event.id);
      emit(ClassDeleted(id: event.id));
      add(const ClassFetchRequested());
    } catch (e) {
      emit(ClassError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }
}
