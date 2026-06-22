import '../../domain/entities/user.entity.dart';
import '../constants/app_constants.dart';
import 'api_client.dart';

class UserService {
  UserService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<PaginatedUsers> getStudents({
    int page = 1,
    int limit = 50,
    String? classId,
    String? search,
  }) {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
      'role': 'student',
    };
    if (classId != null && classId.isNotEmpty) queryParams['classId'] = classId;
    if (search != null && search.isNotEmpty) queryParams['search'] = search;

    return _apiClient.get<PaginatedUsers>(
      ApiConstants.users,
      queryParameters: queryParams,
      parser: (data) => PaginatedUsers.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<PaginatedUsers> getAvailableStudents({
    required String classId,
    int page = 1,
    int limit = 20,
    String? search,
  }) {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (search != null && search.isNotEmpty) queryParams['search'] = search;

    return _apiClient.get<PaginatedUsers>(
      '${ApiConstants.classes}/$classId/available-students',
      queryParameters: queryParams,
      parser: (data) => PaginatedUsers.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<PaginatedUsers> getTeachers({
    int page = 1,
    int limit = 20,
  }) {
    return _apiClient.get<PaginatedUsers>(
      ApiConstants.users,
      queryParameters: {
        'page': page,
        'limit': limit,
        'role': 'teacher',
      },
      parser: (data) => PaginatedUsers.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<User> getUserById(String userId) {
    return _apiClient.get<User>(
      '${ApiConstants.users}/$userId',
      parser: (data) {
        final json = data['data'] as Map<String, dynamic>? ?? data as Map<String, dynamic>;
        return User.fromJson(json);
      },
    );
  }

  Future<User> updateProfile({
    required String userId,
    String? name,
    String? phone,
    String? gender,
    DateTime? dateOfBirth,
  }) {
    final data = <String, dynamic>{};
    if (name != null) data['name'] = name;
    if (phone != null) data['phone'] = phone;
    if (gender != null) data['gender'] = gender;
    if (dateOfBirth != null) data['dateOfBirth'] = dateOfBirth.toIso8601String();

    return _apiClient.patch<User>(
      '${ApiConstants.users}/$userId',
      data: data,
      parser: (data) => User.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<void> changePassword({
    required String userId,
    required String currentPassword,
    required String newPassword,
  }) async {
    await _apiClient.post<void>(
      '${ApiConstants.users}/$userId/change-password',
      data: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      },
      parser: (_) {},
    );
  }

  Future<void> uploadAvatar({
    required String userId,
    required String imagePath,
  }) async {
    await _apiClient.post<void>(
      '${ApiConstants.users}/$userId/avatar',
      data: {'image': imagePath},
      parser: (_) {},
    );
  }

  Future<User> createUser({
    required String name,
    required String email,
    required String password,
    required String role,
    String? schoolId,
    String? phone,
  }) {
    return _apiClient.post<User>(
      ApiConstants.users,
      data: {
        'name': name,
        'email': email,
        'password': password,
        'role': role,
        if (schoolId != null) 'schoolId': schoolId,
        if (phone != null) 'phone': phone,
      },
      parser: (data) {
        final json = data is Map<String, dynamic> ? data : (data as Map<String, dynamic>)['data'] as Map<String, dynamic>?;
        return User.fromJson(json!);
      },
    );
  }

  Future<User> updateUser({
    required String userId,
    String? name,
    String? email,
    String? role,
    String? phone,
    bool? isActive,
  }) {
    final data = <String, dynamic>{};
    if (name != null) data['name'] = name;
    if (email != null) data['email'] = email;
    if (role != null) data['role'] = role;
    if (phone != null) data['phone'] = phone;
    if (isActive != null) data['isActive'] = isActive;

    return _apiClient.patch<User>(
      '${ApiConstants.users}/$userId',
      data: data,
      parser: (data) {
        final json = data is Map<String, dynamic> ? data : (data as Map<String, dynamic>)['data'] as Map<String, dynamic>?;
        return User.fromJson(json!);
      },
    );
  }

  Future<void> deleteUser(String userId) async {
    await _apiClient.delete<void>(
      '${ApiConstants.users}/$userId',
      parser: (_) {},
    );
  }

  Future<PaginatedUsers> getAllUsers({
    int page = 1,
    int limit = 100,
    String? role,
    String? search,
  }) {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (role != null && role.isNotEmpty) queryParams['role'] = role;
    if (search != null && search.isNotEmpty) queryParams['name'] = search;

    return _apiClient.get<PaginatedUsers>(
      ApiConstants.users,
      queryParameters: queryParams,
      parser: (data) => PaginatedUsers.fromJson(data as Map<String, dynamic>),
    );
  }
}

class PaginatedUsers {
  final List<User> results;
  final int page;
  final int limit;
  final int total;
  final int pages;

  PaginatedUsers({
    required this.results,
    required this.page,
    required this.limit,
    required this.total,
    required this.pages,
  });

  factory PaginatedUsers.fromJson(Map<String, dynamic> json) {
    final resultsRaw = json['results'] as List<dynamic>? ?? [];
    return PaginatedUsers(
      results: resultsRaw
          .whereType<Map<String, dynamic>>()
          .map((e) => User.fromJson(e))
          .toList(),
      page: (json['page'] as num?)?.toInt() ?? 1,
      limit: (json['limit'] as num?)?.toInt() ?? 20,
      total: (json['total'] as num?)?.toInt() ?? 0,
      pages: (json['pages'] as num?)?.toInt() ?? 1,
    );
  }
}
