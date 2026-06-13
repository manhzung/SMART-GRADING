import '../../domain/entities/user.entity.dart';
import '../constants/app_constants.dart';
import 'api_client.dart';

class SchoolService {
  SchoolService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<List<School>> getSchools() {
    return _apiClient.get<List<School>>(
      ApiConstants.schools,
      queryParameters: {
        'limit': 100,
        'sortBy': 'name',
        'order': 'asc',
      },
      parser: (data) {
        final payload = data as Map<String, dynamic>? ?? const {};
        final results = payload['results'] as List<dynamic>? ?? const [];
        return results
            .whereType<Map<String, dynamic>>()
            .map(School.fromJson)
            .toList();
      },
    );
  }
}
