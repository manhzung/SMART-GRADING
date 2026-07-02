import 'dart:developer' as developer;
import '../../domain/entities/class_submission_summary.entity.dart';
import '../../domain/entities/exam.entity.dart';
import '../constants/app_constants.dart';
import 'api_client.dart';

class ExamSubmissionsService {
  ExamSubmissionsService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// Fetch submissions for an exam, grouped by classId.
  ///
  /// Uses the dedicated `/submissions/exam/:examId/grouped-by-class`
  /// endpoint which on the server side recovers missing classId values
  /// from the related student's `classIds[0]`.
  Future<Map<String, ClassSubmissionSummary>> getExamSubmissionsByClass(String examId) async {
    developer.log(
      '[ExamSubmissionsService] START getExamSubmissionsByClass examId=$examId',
      name: 'ExamSubmissionsService',
    );

    final endpoint = '${ApiConstants.submissions}/exam/$examId/grouped-by-class';
    final response = await _apiClient.get<Map<String, dynamic>>(
      endpoint,
      parser: (data) => data as Map<String, dynamic>,
    );

    developer.log(
      '[ExamSubmissionsService] Raw response keys: ${response.keys.toList()}',
      name: 'ExamSubmissionsService',
    );

    final classes = (response['classes'] as List?) ?? const [];
    developer.log(
      '[ExamSubmissionsService] Found ${classes.length} classes, total submissions=${response['total']}',
      name: 'ExamSubmissionsService',
    );

    final result = <String, ClassSubmissionSummary>{};
    for (final entry in classes) {
      final map = entry as Map<String, dynamic>;
      final classId = (map['classId'] ?? 'unknown').toString();
      final className = (map['className'] ?? 'Undefined').toString();
      final submissionsList = (map['submissions'] as List?) ?? const [];
      final submissions = submissionsList
          .map((e) => Submission.fromJson(e as Map<String, dynamic>))
          .toList();

      developer.log(
        '[ExamSubmissionsService] classId=$classId className=$className count=${submissions.length}',
        name: 'ExamSubmissionsService',
      );

      final gradedCount = submissions.where((s) => s.status.toUpperCase() == 'GRADED').length;
      result[classId] = ClassSubmissionSummary(
        classId: classId,
        className: className,
        classCode: className,
        totalStudents: submissions.length,
        totalSubmitted: submissions.length,
        totalGraded: gradedCount,
        submissions: submissions,
      );
    }

    developer.log(
      '[ExamSubmissionsService] END: ${result.length} classes found',
      name: 'ExamSubmissionsService',
    );
    return result;
  }
}