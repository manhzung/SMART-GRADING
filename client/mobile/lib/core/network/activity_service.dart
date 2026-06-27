import '../../domain/entities/activity.entity.dart';
import '../constants/app_constants.dart';
import 'api_client.dart';

class ActivityService {
  ActivityService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<PaginatedActivities> getRecentActivities({int limit = 10}) {
    return _apiClient.get<PaginatedActivities>(
      ApiConstants.activities,
      queryParameters: {'limit': limit},
      parser: (data) => PaginatedActivities.fromJson(data as Map<String, dynamic>),
    );
  }
}
