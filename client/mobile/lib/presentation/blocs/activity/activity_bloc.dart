import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/activity_service.dart';
import '../../../domain/entities/activity.entity.dart';

part 'activity_event.dart';
part 'activity_state.dart';

class ActivityBloc extends Bloc<ActivityEvent, ActivityState> {
  ActivityBloc({required ApiClient apiClient})
      : _activityService = ActivityService(apiClient: apiClient),
        super(ActivityInitial()) {
    on<ActivityLoadRequested>(_onLoadRequested);
    on<ActivityRefreshRequested>(_onRefreshRequested);
  }

  final ActivityService _activityService;

  Future<void> _onLoadRequested(
    ActivityLoadRequested event,
    Emitter<ActivityState> emit,
  ) async {
    emit(ActivityLoading());
    try {
      final result = await _activityService.getRecentActivities(limit: event.limit);
      emit(ActivityLoaded(result.results));
    } catch (e) {
      emit(ActivityError(e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onRefreshRequested(
    ActivityRefreshRequested event,
    Emitter<ActivityState> emit,
  ) async {
    try {
      final result = await _activityService.getRecentActivities(limit: 10);
      emit(ActivityLoaded(result.results));
    } catch (e) {
      emit(ActivityError(e.toString().replaceFirst('Exception: ', '')));
    }
  }
}
