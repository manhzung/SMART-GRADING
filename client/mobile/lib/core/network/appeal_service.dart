// ignore_for_file: use_null_aware_elements

import '../../core/network/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../domain/entities/appeal.entity.dart';

class AppealService {
  AppealService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<PaginatedAppeals> getAppeals({
    int page = 1,
    int limit = 20,
    String? examId,
    String? studentId,
    String? status,
  }) {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (examId != null && examId.isNotEmpty) queryParams['examId'] = examId;
    if (studentId != null && studentId.isNotEmpty) queryParams['studentId'] = studentId;
    if (status != null && status.isNotEmpty) queryParams['status'] = status;

    return _apiClient.get<PaginatedAppeals>(
      ApiConstants.appeals,
      queryParameters: queryParams,
      parser: (data) => PaginatedAppeals.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<Appeal> getAppealById(String appealId) {
    return _apiClient.get<Appeal>(
      '${ApiConstants.appeals}/$appealId',
      parser: (data) => Appeal.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<Appeal> createAppeal({
    required String examId,
    required int questionNumber,
    String? reason,
    String? studentAnswer,
    String? correctAnswer,
  }) {
    return _apiClient.post<Appeal>(
      ApiConstants.appeals,
      data: {
        'examId': examId,
        'questionNumber': questionNumber,
        if (reason != null) 'reason': reason,
        if (studentAnswer != null) 'studentAnswer': studentAnswer,
        if (correctAnswer != null) 'correctAnswer': correctAnswer,
      },
      parser: (data) => Appeal.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<Appeal> reviewAppeal(String appealId, {String? status, String? resolutionNote}) {
    return _apiClient.post<Appeal>(
      '${ApiConstants.appeals}/$appealId/review',
      data: {
        if (status != null) 'status': status,
        if (resolutionNote != null) 'resolutionNote': resolutionNote,
      },
      parser: (data) => Appeal.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<int> getPendingCount(String examId) async {
    try {
      final result = await _apiClient.get<Map<String, dynamic>>(
        '${ApiConstants.appeals}/exam/$examId/pending-count',
        parser: (data) => data as Map<String, dynamic>,
      );
      return (result['pendingCount'] as num?)?.toInt() ?? 0;
    } catch (_) {
      return 0;
    }
  }

  Future<PaginatedAppeals> getMyAppeals({
    int page = 1,
    int limit = 20,
    String? examId,
    String? status,
  }) {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (examId != null && examId.isNotEmpty) queryParams['examId'] = examId;
    if (status != null && status.isNotEmpty) queryParams['status'] = status;

    return _apiClient.get<PaginatedAppeals>(
      '${ApiConstants.appeals}/me',
      queryParameters: queryParams,
      parser: (data) => PaginatedAppeals.fromJson(data as Map<String, dynamic>),
    );
  }
}
