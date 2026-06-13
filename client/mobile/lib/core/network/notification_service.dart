import '../../domain/entities/notification.entity.dart';
import '../constants/app_constants.dart';
import 'api_client.dart';

class NotificationService {
  NotificationService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<PaginatedNotifications> getNotifications({
    int page = 1,
    int limit = 20,
  }) {
    return _apiClient.get<PaginatedNotifications>(
      ApiConstants.notifications,
      queryParameters: {
        'page': page,
        'limit': limit,
      },
      parser: (data) => PaginatedNotifications.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<int> getUnreadCount() async {
    try {
      final result = await _apiClient.get<Map<String, dynamic>>(
        '${ApiConstants.notifications}/unread-count',
        parser: (data) => data as Map<String, dynamic>,
      );
      return (result['count'] as num?)?.toInt() ?? 0;
    } catch (_) {
      return 0;
    }
  }

  Future<void> markAsRead(String notificationId) async {
    await _apiClient.post<void>(
      '${ApiConstants.notifications}/$notificationId/read',
    );
  }

  Future<void> markAllAsRead() async {
    await _apiClient.post<void>('${ApiConstants.notifications}/read-all');
  }

  Future<void> deleteNotification(String notificationId) async {
    await _apiClient.delete<void>('${ApiConstants.notifications}/$notificationId');
  }
}
