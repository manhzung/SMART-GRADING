// ignore_for_file: use_null_aware_elements

import '../../domain/entities/user.entity.dart';
import '../constants/app_constants.dart';
import 'api_client.dart';

class ClassService {
  ClassService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<PaginatedClasses> getClasses({
    int page = 1,
    int limit = 20,
    String? schoolId,
    String? academicYear,
    int? gradeLevel,
  }) {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (schoolId != null && schoolId.isNotEmpty) queryParams['schoolId'] = schoolId;
    if (academicYear != null && academicYear.isNotEmpty) queryParams['academicYear'] = academicYear;
    if (gradeLevel != null) queryParams['gradeLevel'] = gradeLevel;

    return _apiClient.get<PaginatedClasses>(
      ApiConstants.classes,
      queryParameters: queryParams,
      parser: (data) => PaginatedClasses.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<Class> getClassById(String classId) {
    return _apiClient.get<Class>(
      '${ApiConstants.classes}/$classId',
      parser: (data) => Class.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<Class> addStudents({
    required String classId,
    required List<String> studentIds,
  }) {
    return _apiClient.post<Class>(
      '${ApiConstants.classes}/$classId/students',
      data: {'studentIds': studentIds},
      parser: (data) => Class.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<Map<String, dynamic>> importStudents({
    required String classId,
    required List<Map<String, dynamic>> students,
  }) {
    return _apiClient.post<Map<String, dynamic>>(
      '${ApiConstants.classes}/$classId/students/import',
      data: {'students': students},
      parser: (data) => data as Map<String, dynamic>,
    );
  }

  Future<Class> createClass({
    required String name,
    required String code,
    required int gradeLevel,
    required String academicYear,
    String? schoolId,
    String? homeroomTeacherId,
  }) {
    return _apiClient.post<Class>(
      ApiConstants.classes,
      data: {
        'name': name,
        'code': code,
        'gradeLevel': gradeLevel,
        'academicYear': academicYear,
        if (schoolId != null) 'schoolId': schoolId,
        if (homeroomTeacherId != null && homeroomTeacherId.isNotEmpty)
          'homeroomTeacherId': homeroomTeacherId,
      },
      parser: (data) => Class.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<Class> updateClass(
    String id, {
    String? name,
    String? code,
    int? gradeLevel,
    String? academicYear,
    String? homeroomTeacherId,
  }) {
    return _apiClient.patch<Class>(
      '${ApiConstants.classes}/$id',
      data: {
        if (name != null) 'name': name,
        if (code != null) 'code': code,
        if (gradeLevel != null) 'gradeLevel': gradeLevel,
        if (academicYear != null) 'academicYear': academicYear,
        if (homeroomTeacherId != null) 'homeroomTeacherId': homeroomTeacherId,
      },
      parser: (data) => Class.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<List<ClassStudent>> getStudentsByClass(String classId) {
    return _apiClient.get<List<ClassStudent>>(
      '${ApiConstants.classes}/$classId/students',
      parser: (data) {
        final results = data['results'] as List<dynamic>? ?? data as List<dynamic>;
        return results
            .whereType<Map<String, dynamic>>()
            .map((e) => ClassStudent.fromJson(e))
            .toList();
      },
    );
  }

  Future<void> deleteClass(String id) async {
    await _apiClient.delete('${ApiConstants.classes}/$id');
  }
}

class PaginatedClasses {
  final List<Class> results;
  final int page;
  final int limit;
  final int total;
  final int pages;

  PaginatedClasses({
    required this.results,
    required this.page,
    required this.limit,
    required this.total,
    required this.pages,
  });

  factory PaginatedClasses.fromJson(Map<String, dynamic> json) {
    final resultsRaw = json['results'] as List<dynamic>? ?? [];
    return PaginatedClasses(
      results: resultsRaw
          .whereType<Map<String, dynamic>>()
          .map((e) => Class.fromJson(e))
          .toList(),
      page: (json['page'] as num?)?.toInt() ?? 1,
      limit: (json['limit'] as num?)?.toInt() ?? 20,
      total: (json['total'] as num?)?.toInt() ?? 0,
      pages: (json['pages'] as num?)?.toInt() ?? 1,
    );
  }
}
