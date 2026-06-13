import '../../domain/entities/exam.entity.dart';
import '../constants/app_constants.dart';
import 'api_client.dart';

class SubmissionService {
  SubmissionService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<PaginatedSubmissions> getSubmissions({
    int page = 1,
    int limit = 20,
    String? examId,
    String? studentId,
    String? versionId,
    String? status,
    String? fromDate,
    String? toDate,
  }) {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (examId != null && examId.isNotEmpty) queryParams['examId'] = examId;
    if (studentId != null && studentId.isNotEmpty) queryParams['studentId'] = studentId;
    if (versionId != null && versionId.isNotEmpty) queryParams['versionId'] = versionId;
    if (status != null && status.isNotEmpty) queryParams['status'] = status;
    if (fromDate != null && fromDate.isNotEmpty) queryParams['fromDate'] = fromDate;
    if (toDate != null && toDate.isNotEmpty) queryParams['toDate'] = toDate;

    return _apiClient.get<PaginatedSubmissions>(
      ApiConstants.submissions,
      queryParameters: queryParams,
      parser: (data) => PaginatedSubmissions.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<Submission> getSubmissionById(String submissionId) {
    return _apiClient.get<Submission>(
      '${ApiConstants.submissions}/$submissionId',
      parser: (data) => Submission.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<List<Submission>> getSubmissionsByExam(String examId) {
    return _apiClient.get<List<Submission>>(
      '${ApiConstants.exams}/$examId/submissions',
      parser: (data) {
        final results = data['results'] as List<dynamic>? ?? data as List<dynamic>? ?? [];
        return results
            .whereType<Map<String, dynamic>>()
            .map((e) => Submission.fromJson(e))
            .toList();
      },
    );
  }

  Future<ExamStatistics> getExamStatistics(String examId) {
    return _apiClient.get<ExamStatistics>(
      '${ApiConstants.exams}/$examId/submissions/statistics',
      parser: (data) => ExamStatistics.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<Submission> scanSubmission({
    required String examId,
    required String imagePath,
  }) {
    return _apiClient.post<Submission>(
      '${ApiConstants.submissions}/scan',
      data: {
        'examId': examId,
        'image': imagePath,
      },
      parser: (data) => Submission.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<void> deleteSubmission(String submissionId) {
    return _apiClient.delete<void>('${ApiConstants.submissions}/$submissionId');
  }
}

class PaginatedSubmissions {
  final List<Submission> results;
  final int page;
  final int limit;
  final int total;
  final int pages;

  PaginatedSubmissions({
    required this.results,
    required this.page,
    required this.limit,
    required this.total,
    required this.pages,
  });

  factory PaginatedSubmissions.fromJson(Map<String, dynamic> json) {
    final resultsRaw = json['results'] as List<dynamic>? ?? [];
    return PaginatedSubmissions(
      results: resultsRaw
          .whereType<Map<String, dynamic>>()
          .map((e) => Submission.fromJson(e))
          .toList(),
      page: (json['page'] as num?)?.toInt() ?? 1,
      limit: (json['limit'] as num?)?.toInt() ?? 20,
      total: (json['total'] as num?)?.toInt() ?? 0,
      pages: (json['pages'] as num?)?.toInt() ?? 1,
    );
  }
}
