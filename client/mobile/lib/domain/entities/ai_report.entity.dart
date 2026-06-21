class AIReport {
  final String id;
  final String? examId;
  final String summary;
  final List<String> recommendations;
  final DateTime createdAt;

  AIReport({
    required this.id,
    this.examId,
    required this.summary,
    required this.recommendations,
    required this.createdAt,
  });

  factory AIReport.fromJson(Map<String, dynamic> json) {
    String? examIdStr;
    final examIdData = json['examId'];
    if (examIdData is String) {
      examIdStr = examIdData;
    } else if (examIdData is Map) {
      examIdStr = examIdData['_id']?.toString();
    }

    return AIReport(
      id: json['_id']?.toString() ?? '',
      examId: examIdStr,
      summary: json['summary']?.toString() ??
          (json['statistics'] as Map?)?['summary']?.toString() ??
          json['overallAnalysis']?.toString() ??
          '',
      recommendations: (json['recommendations'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
