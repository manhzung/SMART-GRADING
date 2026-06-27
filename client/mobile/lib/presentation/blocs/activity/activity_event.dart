part of 'activity_bloc.dart';

abstract class ActivityEvent extends Equatable {
  const ActivityEvent();

  @override
  List<Object?> get props => [];
}

class ActivityLoadRequested extends ActivityEvent {
  final int limit;

  const ActivityLoadRequested({this.limit = 10});

  @override
  List<Object?> get props => [limit];
}

class ActivityRefreshRequested extends ActivityEvent {}
