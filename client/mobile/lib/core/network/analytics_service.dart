import '../../core/network/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../domain/entities/analytics.entity.dart';

class AnalyticsService {
  AnalyticsService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<DashboardStats> getDashboardStats() {
    return _apiClient.get<DashboardStats>(
      '${ApiConstants.analytics}/dashboard-stats',
      parser: (data) => DashboardStats.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<AnalyticsData> getAnalytics({String period = 'month'}) {
    return _apiClient.get<AnalyticsData>(
      '${ApiConstants.analytics}/analytics',
      queryParameters: {'period': period},
      parser: (data) => AnalyticsData.fromJson(data as Map<String, dynamic>),
    );
  }
}
