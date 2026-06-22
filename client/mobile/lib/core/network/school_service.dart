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

  Future<School> createSchool({
    required String name,
    String? address,
    String? phone,
    String? email,
  }) {
    return _apiClient.post<School>(
      ApiConstants.schools,
      data: {
        'name': name,
        if (address != null) 'address': address,
        if (phone != null) 'phone': phone,
        if (email != null) 'email': email,
      },
      parser: (data) {
        final json = data is Map<String, dynamic> ? data : (data as Map<String, dynamic>)['data'] as Map<String, dynamic>?;
        return School.fromJson(json!);
      },
    );
  }

  Future<School> updateSchool({
    required String schoolId,
    String? name,
    String? address,
    String? phone,
    String? email,
  }) {
    final data = <String, dynamic>{};
    if (name != null) data['name'] = name;
    if (address != null) data['address'] = address;
    if (phone != null) data['phone'] = phone;
    if (email != null) data['email'] = email;

    return _apiClient.patch<School>(
      '${ApiConstants.schools}/$schoolId',
      data: data,
      parser: (data) {
        final json = data is Map<String, dynamic> ? data : (data as Map<String, dynamic>)['data'] as Map<String, dynamic>?;
        return School.fromJson(json!);
      },
    );
  }

  Future<void> deleteSchool(String schoolId) async {
    await _apiClient.delete<void>(
      '${ApiConstants.schools}/$schoolId',
      parser: (_) {},
    );
  }
}
