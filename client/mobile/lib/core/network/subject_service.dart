import '../../domain/entities/user.entity.dart';
import '../constants/app_constants.dart';
import 'api_client.dart';

class SubjectService {
  SubjectService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<List<Subject>> getSubjects() {
    return _apiClient.get<List<Subject>>(
      ApiConstants.subjects,
      queryParameters: {
        'limit': 100,
        'sortBy': 'name',
        'order': 'asc',
      },
      parser: (data) {
        final payload = data is Map<String, dynamic>
            ? data
            : <String, dynamic>{};
        final results = payload['results'] as List<dynamic>? ?? const [];
        return results
            .whereType<Map<String, dynamic>>()
            .map((e) => Subject.fromJson(e))
            .toList();
      },
    );
  }

  Future<Subject> getSubjectById(String subjectId) {
    return _apiClient.get<Subject>(
      '${ApiConstants.subjects}/$subjectId',
      parser: (data) {
        final json = Map<String, dynamic>.from(
            data is Map<String, dynamic> ? data : <String, dynamic>{});
        return Subject.fromJson(json);
      },
    );
  }
}
