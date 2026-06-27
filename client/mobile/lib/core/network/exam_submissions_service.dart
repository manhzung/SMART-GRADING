import '../../domain/entities/class_submission_summary.entity.dart';
import '../../domain/entities/exam.entity.dart';
import '../constants/app_constants.dart';
import 'api_client.dart';
import 'submission_service.dart' show PaginatedSubmissions;

class ExamSubmissionsService {
  ExamSubmissionsService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// Fetch all submissions for an exam, grouped by classId.
  ///
  /// Paginates through the API until all submissions are loaded,
  /// then groups them by [Submission.classId]. Falls back to a
  /// synthetic classId derived from [Submission.className] when
  /// classId is missing.
  Future<Map<String, ClassSubmissionSummary>> getExamSubmissionsByClass(String examId) async {
    const int limit = 50;
    final Map<String, List<Submission>> grouped = {};
    final Map<String, _ClassMetadata> metadata = {};

    int currentPage = 1;
    int totalPages = 1;

    while (currentPage <= totalPages) {
      final result = await _apiClient.get<PaginatedSubmissions>(
        ApiConstants.submissions,
        queryParameters: {
          'examId': examId,
          'page': currentPage,
          'limit': limit,
        },
        parser: (data) => PaginatedSubmissions.fromJson(data as Map<String, dynamic>),
      );

      for (final submission in result.results) {
        final classInfo = _extractClassInfo(submission);
        grouped.putIfAbsent(classInfo.id, () => []).add(submission);
        metadata[classInfo.id] = classInfo;
      }

      totalPages = result.pages > 0 ? result.pages : 1;
      currentPage++;

      if (result.results.isEmpty) break;
    }

    return grouped.map((classId, submissions) {
      final meta = metadata[classId]!;
      final gradedCount = submissions.where((s) => s.status.toUpperCase() == 'GRADED').length;
      return MapEntry(
        classId,
        ClassSubmissionSummary(
          classId: meta.id,
          className: meta.name,
          classCode: meta.code,
          totalStudents: submissions.length,
          totalSubmitted: submissions.length,
          totalGraded: gradedCount,
          submissions: submissions,
        ),
      );
    });
  }

  _ClassMetadata _extractClassInfo(Submission submission) {
    if (submission.classId != null && submission.classId!.isNotEmpty) {
      return _ClassMetadata(
        id: submission.classId!,
        name: submission.className ?? 'Chưa xác định',
        code: submission.className ?? '',
      );
    }
    final fallbackId = submission.className ?? 'unknown-class';
    return _ClassMetadata(
      id: 'class-$fallbackId',
      name: submission.className ?? 'Chưa xác định',
      code: fallbackId,
    );
  }
}

class _ClassMetadata {
  final String id;
  final String name;
  final String code;
  _ClassMetadata({required this.id, required this.name, required this.code});
}
