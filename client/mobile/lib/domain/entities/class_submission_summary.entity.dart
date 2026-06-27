import 'exam.entity.dart';

/// Summary of submissions for a single class within an exam.
///
/// Groups all submissions belonging to the same classId and provides
/// aggregate statistics (total submitted, total graded).
class ClassSubmissionSummary {
  final String classId;
  final String className;
  final String classCode;
  final int totalStudents;
  final int totalSubmitted;
  final int totalGraded;
  final List<Submission> submissions;

  const ClassSubmissionSummary({
    required this.classId,
    required this.className,
    required this.classCode,
    this.totalStudents = 0,
    this.totalSubmitted = 0,
    this.totalGraded = 0,
    this.submissions = const [],
  });

  factory ClassSubmissionSummary.fromJson(Map<String, dynamic> json) {
    final submissionsRaw = json['submissions'] as List<dynamic>? ?? [];
    return ClassSubmissionSummary(
      classId: (json['classId'] ?? '').toString(),
      className: (json['className'] ?? '').toString(),
      classCode: (json['classCode'] ?? '').toString(),
      totalStudents: (json['totalStudents'] as num?)?.toInt() ?? 0,
      totalSubmitted: (json['totalSubmitted'] as num?)?.toInt() ?? 0,
      totalGraded: (json['totalGraded'] as num?)?.toInt() ?? 0,
      submissions: submissionsRaw
          .whereType<Map<String, dynamic>>()
          .map((e) => Submission.fromJson(e))
          .toList(),
    );
  }

  bool get isEmpty => submissions.isEmpty;
}
