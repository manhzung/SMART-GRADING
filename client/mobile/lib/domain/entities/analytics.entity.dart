class DashboardStats {
  final int totalClasses;
  final int totalExams;
  final int totalStudents;
  final int totalSubmissions;
  final int pendingAppeals;
  final int publishedExams;
  final double avgScore;
  final int passRate;

  DashboardStats({
    required this.totalClasses,
    required this.totalExams,
    required this.totalStudents,
    required this.totalSubmissions,
    required this.pendingAppeals,
    required this.publishedExams,
    required this.avgScore,
    required this.passRate,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    return DashboardStats(
      totalClasses: (json['totalClasses'] as num?)?.toInt() ?? 0,
      totalExams: (json['totalExams'] as num?)?.toInt() ?? 0,
      totalStudents: (json['totalStudents'] as num?)?.toInt() ?? 0,
      totalSubmissions: (json['totalSubmissions'] as num?)?.toInt() ?? 0,
      pendingAppeals: (json['pendingAppeals'] as num?)?.toInt() ?? 0,
      publishedExams: (json['publishedExams'] as num?)?.toInt() ?? 0,
      avgScore: (json['avgScore'] as num?)?.toDouble() ?? 0.0,
      passRate: (json['passRate'] as num?)?.toInt() ?? 0,
    );
  }
}

class AnalyticsData {
  final AnalyticsSummary summary;
  final List<SubjectPerformance> subjectPerformance;
  final List<GradeCount> gradeDistribution;
  final List<StudentRanking> studentRankings;
  final List<TrendPoint> recentTrends;

  AnalyticsData({
    required this.summary,
    required this.subjectPerformance,
    required this.gradeDistribution,
    required this.studentRankings,
    required this.recentTrends,
  });

  factory AnalyticsData.fromJson(Map<String, dynamic> json) {
    final summaryJson = json['summary'] as Map<String, dynamic>? ?? {};
    final subjectList = json['subjectPerformance'] as List<dynamic>? ?? [];
    final gradeList = json['gradeDistribution'] as List<dynamic>? ?? [];
    final rankingsList = json['studentRankings'] as List<dynamic>? ?? [];
    final trendsList = json['recentTrends'] as List<dynamic>? ?? [];

    return AnalyticsData(
      summary: AnalyticsSummary.fromJson(summaryJson),
      subjectPerformance: subjectList
          .whereType<Map<String, dynamic>>()
          .map((e) => SubjectPerformance.fromJson(e))
          .toList(),
      gradeDistribution: gradeList
          .whereType<Map<String, dynamic>>()
          .map((e) => GradeCount.fromJson(e))
          .toList(),
      studentRankings: rankingsList
          .whereType<Map<String, dynamic>>()
          .map((e) => StudentRanking.fromJson(e))
          .toList(),
      recentTrends: trendsList
          .whereType<Map<String, dynamic>>()
          .map((e) => TrendPoint.fromJson(e))
          .toList(),
    );
  }
}

class AnalyticsSummary {
  final int totalExams;
  final int totalSubmissions;
  final double avgScore;
  final int totalStudents;

  AnalyticsSummary({
    required this.totalExams,
    required this.totalSubmissions,
    required this.avgScore,
    required this.totalStudents,
  });

  factory AnalyticsSummary.fromJson(Map<String, dynamic> json) {
    return AnalyticsSummary(
      totalExams: (json['totalExams'] as num?)?.toInt() ?? 0,
      totalSubmissions: (json['totalSubmissions'] as num?)?.toInt() ?? 0,
      avgScore: (json['avgScore'] as num?)?.toDouble() ?? 0.0,
      totalStudents: (json['totalStudents'] as num?)?.toInt() ?? 0,
    );
  }
}

class SubjectPerformance {
  final String subject;
  final double avgScore;
  final int examCount;

  SubjectPerformance({
    required this.subject,
    required this.avgScore,
    required this.examCount,
  });

  factory SubjectPerformance.fromJson(Map<String, dynamic> json) {
    return SubjectPerformance(
      subject: (json['subject'] ?? json['title'] ?? json['name'] ?? '').toString(),
      avgScore: (json['avgScore'] as num?)?.toDouble() ?? 0.0,
      examCount: (json['examCount'] as num?)?.toInt() ?? 0,
    );
  }
}

class GradeCount {
  final String grade;
  final int count;
  final double percentage;

  GradeCount({
    required this.grade,
    required this.count,
    required this.percentage,
  });

  factory GradeCount.fromJson(Map<String, dynamic> json) {
    return GradeCount(
      grade: (json['grade'] ?? json['_id'] ?? '').toString(),
      count: (json['count'] as num?)?.toInt() ?? 0,
      percentage: (json['percentage'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class StudentRanking {
  final String id;
  final String name;
  final String? email;
  final double avgScore;
  final int totalExams;
  final String? trend;

  StudentRanking({
    required this.id,
    required this.name,
    this.email,
    required this.avgScore,
    required this.totalExams,
    this.trend,
  });

  factory StudentRanking.fromJson(Map<String, dynamic> json) {
    return StudentRanking(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      email: json['email']?.toString(),
      avgScore: (json['avgScore'] as num?)?.toDouble() ?? 0.0,
      totalExams: (json['totalExams'] as num?)?.toInt() ?? 0,
      trend: json['trend']?.toString(),
    );
  }
}

class TrendPoint {
  final String date;
  final double avgScore;
  final int submissions;

  TrendPoint({
    required this.date,
    required this.avgScore,
    required this.submissions,
  });

  factory TrendPoint.fromJson(Map<String, dynamic> json) {
    return TrendPoint(
      date: (json['date'] ?? '').toString(),
      avgScore: (json['avgScore'] as num?)?.toDouble() ?? 0.0,
      submissions: (json['submissions'] as num?)?.toInt() ?? 0,
    );
  }
}
