class Appeal {
  final String id;
  final String? studentId;
  final String? studentName;
  final String? studentEmail;
  final String? studentCode;
  final String? examId;
  final String? examTitle;
  final int? questionNumber;
  final String? questionText;
  final String? studentAnswer;
  final String? correctAnswer;
  final String? reason;
  final String? resolutionNote;
  final String status;
  final String? className;
  final double? score;
  final DateTime? submittedAt;
  final DateTime? reviewedAt;
  final String? reviewedBy;

  Appeal({
    required this.id,
    this.studentId,
    this.studentName,
    this.studentEmail,
    this.studentCode,
    this.examId,
    this.examTitle,
    this.questionNumber,
    this.questionText,
    this.studentAnswer,
    this.correctAnswer,
    this.reason,
    this.resolutionNote,
    required this.status,
    this.className,
    this.score,
    this.submittedAt,
    this.reviewedAt,
    this.reviewedBy,
  });

  factory Appeal.fromJson(Map<String, dynamic> json) {
    String id = '';
    if (json['_id'] != null) {
      id = json['_id'].toString();
    } else if (json['id'] != null) {
      id = json['id'].toString();
    }

    String status = 'pending';
    if (json['status'] != null) status = json['status'].toString();

    String? studentId;
    String? studentName;
    String? studentEmail;
    String? studentCode;
    if (json['studentId'] != null) {
      final student = json['studentId'];
      if (student is Map<String, dynamic>) {
        studentId = (student['_id'] ?? student['id'] ?? '').toString();
        studentName = student['name']?.toString();
        studentEmail = student['email']?.toString();
        studentCode = student['studentCode']?.toString();
      } else {
        studentId = student.toString();
      }
    }

    String? examId;
    String? examTitle;
    if (json['examId'] != null) {
      final exam = json['examId'];
      if (exam is Map<String, dynamic>) {
        examId = (exam['_id'] ?? exam['id'] ?? '').toString();
        examTitle = exam['title']?.toString();
      } else {
        examId = exam.toString();
      }
    }

    return Appeal(
      id: id,
      studentId: studentId,
      studentName: studentName,
      studentEmail: studentEmail,
      studentCode: studentCode,
      examId: examId,
      examTitle: examTitle,
      questionNumber: json['questionNumber'] as int?,
      questionText: json['questionText']?.toString(),
      studentAnswer: json['studentAnswer']?.toString(),
      correctAnswer: json['correctAnswer']?.toString(),
      reason: json['reason']?.toString(),
      resolutionNote: json['resolutionNote']?.toString(),
      status: status,
      className: json['className']?.toString(),
      score: (json['score'] as num?)?.toDouble(),
      submittedAt: json['submittedAt'] != null
          ? DateTime.tryParse(json['submittedAt'].toString())
          : json['createdAt'] != null
              ? DateTime.tryParse(json['createdAt'].toString())
              : null,
      reviewedAt: json['reviewedAt'] != null
          ? DateTime.tryParse(json['reviewedAt'].toString())
          : null,
      reviewedBy: json['reviewedBy']?.toString(),
    );
  }

  String get displayName => studentName ?? studentCode ?? 'Unknown Student';
}

class PaginatedAppeals {
  final List<Appeal> results;
  final int page;
  final int limit;
  final int total;
  final int pages;

  PaginatedAppeals({
    required this.results,
    required this.page,
    required this.limit,
    required this.total,
    required this.pages,
  });

  factory PaginatedAppeals.fromJson(Map<String, dynamic> json) {
    final resultsRaw = json['results'] as List<dynamic>? ?? [];
    return PaginatedAppeals(
      results: resultsRaw
          .whereType<Map<String, dynamic>>()
          .map((e) => Appeal.fromJson(e))
          .toList(),
      page: (json['page'] as num?)?.toInt() ?? 1,
      limit: (json['limit'] as num?)?.toInt() ?? 20,
      total: (json['total'] as num?)?.toInt() ?? 0,
      pages: (json['pages'] as num?)?.toInt() ?? 1,
    );
  }
}
