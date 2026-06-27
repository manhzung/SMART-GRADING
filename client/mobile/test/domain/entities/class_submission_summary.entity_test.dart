import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/entities/class_submission_summary.entity.dart';

void main() {
  group('ClassSubmissionSummary', () {
    test('fromJson parses correctly with all fields', () {
      final json = {
        'classId': 'class-1',
        'className': 'Lớp 10A',
        'classCode': '10A',
        'totalStudents': 35,
        'totalSubmitted': 28,
        'totalGraded': 20,
        'submissions': <Map<String, dynamic>>[],
      };

      final summary = ClassSubmissionSummary.fromJson(json);

      expect(summary.classId, 'class-1');
      expect(summary.className, 'Lớp 10A');
      expect(summary.classCode, '10A');
      expect(summary.totalStudents, 35);
      expect(summary.totalSubmitted, 28);
      expect(summary.totalGraded, 20);
      expect(summary.submissions, isEmpty);
    });

    test('fromJson handles missing optional fields with defaults', () {
      final json = {
        'classId': 'class-1',
        'className': 'Lớp 10A',
      };

      final summary = ClassSubmissionSummary.fromJson(json);

      expect(summary.classId, 'class-1');
      expect(summary.className, 'Lớp 10A');
      expect(summary.classCode, '');
      expect(summary.totalStudents, 0);
      expect(summary.totalSubmitted, 0);
      expect(summary.totalGraded, 0);
      expect(summary.submissions, isEmpty);
    });

    test('isEmpty returns true when no submissions', () {
      const summary = ClassSubmissionSummary(
        classId: 'class-1',
        className: 'Lớp 10A',
        classCode: '10A',
      );
      expect(summary.isEmpty, isTrue);
    });

    test('isEmpty returns false when submissions exist', () {
      final json = {
        'classId': 'class-1',
        'className': 'Lớp 10A',
        'classCode': '10A',
        'submissions': [
          {
            '_id': 's1',
            'examId': 'e1',
            'studentId': 'st1',
            'status': 'GRADED',
          },
        ],
      };

      final summary = ClassSubmissionSummary.fromJson(json);
      expect(summary.isEmpty, isFalse);
      expect(summary.submissions.length, 1);
    });
  });
}
