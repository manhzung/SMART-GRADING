import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/school_service.dart';
import '../../../domain/entities/user.entity.dart';

part 'school_event.dart';
part 'school_state.dart';

class SchoolBloc extends Bloc<SchoolEvent, SchoolState> {
  SchoolBloc({required ApiClient apiClient})
      : _schoolService = SchoolService(apiClient: apiClient),
        super(SchoolInitial()) {
    on<SchoolFetchRequested>(_onFetchRequested);
  }

  final SchoolService _schoolService;

  Future<void> _onFetchRequested(
    SchoolFetchRequested event,
    Emitter<SchoolState> emit,
  ) async {
    emit(SchoolLoading());
    try {
      final schools = await _schoolService.getSchools();
      emit(SchoolLoaded(schools: schools));
    } catch (e) {
      emit(SchoolError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }
}
