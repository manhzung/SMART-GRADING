class Activity {
  final String id;
  final String type;
  final String title;
  final String description;
  final String entityId;
  final String entityType;
  final String icon;
  final String iconColor;
  final String iconBgColor;
  final DateTime timestamp;
  final ActivityMetadata? metadata;

  Activity({
    required this.id,
    required this.type,
    required this.title,
    required this.description,
    required this.entityId,
    required this.entityType,
    required this.icon,
    required this.iconColor,
    required this.iconBgColor,
    required this.timestamp,
    this.metadata,
  });

  factory Activity.fromJson(Map<String, dynamic> json) {
    return Activity(
      id: json['_id']?.toString() ?? json['entityId']?.toString() ?? '',
      type: (json['type'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      entityId: (json['entityId'] ?? '').toString(),
      entityType: (json['entityType'] ?? '').toString(),
      icon: (json['icon'] ?? 'assignment').toString(),
      iconColor: (json['iconColor'] ?? '#6366F1').toString(),
      iconBgColor: (json['iconBgColor'] ?? '#EEF2FF').toString(),
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'].toString()) ?? DateTime.now()
          : DateTime.now(),
      metadata: json['metadata'] != null
          ? ActivityMetadata.fromJson(json['metadata'] as Map<String, dynamic>)
          : null,
    );
  }

  String get timeAgo {
    final now = DateTime.now();
    final diff = now.difference(timestamp);

    if (diff.inMinutes < 1) {
      return 'Just now';
    } else if (diff.inMinutes < 60) {
      return '${diff.inMinutes} minutes ago';
    } else if (diff.inHours < 24) {
      return '${diff.inHours} hours ago';
    } else if (diff.inDays < 7) {
      return '${diff.inDays} days ago';
    } else if (diff.inDays < 30) {
      return '${(diff.inDays / 7).floor()} weeks ago';
    } else {
      return '${(diff.inDays / 30).floor()} months ago';
    }
  }
}

class ActivityMetadata {
  final String? examTitle;
  final String? studentName;
  final String? studentCode;
  final String? className;
  final String? status;
  final int? score;
  final int? maxScore;
  final int? percentage;
  final int? studentCount;
  final int? totalSubmissions;
  final int? newScore;

  ActivityMetadata({
    this.examTitle,
    this.studentName,
    this.studentCode,
    this.className,
    this.status,
    this.score,
    this.maxScore,
    this.percentage,
    this.studentCount,
    this.totalSubmissions,
    this.newScore,
  });

  factory ActivityMetadata.fromJson(Map<String, dynamic> json) {
    return ActivityMetadata(
      examTitle: json['examTitle']?.toString(),
      studentName: json['studentName']?.toString(),
      studentCode: json['studentCode']?.toString(),
      className: json['className']?.toString(),
      status: json['status']?.toString(),
      score: (json['score'] as num?)?.toInt(),
      maxScore: (json['maxScore'] as num?)?.toInt(),
      percentage: (json['percentage'] as num?)?.toInt(),
      studentCount: (json['studentCount'] as num?)?.toInt(),
      totalSubmissions: (json['totalSubmissions'] as num?)?.toInt(),
      newScore: (json['newScore'] as num?)?.toInt(),
    );
  }
}

class PaginatedActivities {
  final List<Activity> results;
  final int count;

  PaginatedActivities({
    required this.results,
    required this.count,
  });

  factory PaginatedActivities.fromJson(Map<String, dynamic> json) {
    final resultsRaw = json['results'] as List<dynamic>? ?? [];
    return PaginatedActivities(
      results: resultsRaw
          .whereType<Map<String, dynamic>>()
          .map((e) => Activity.fromJson(e))
          .toList(),
      count: (json['count'] as num?)?.toInt() ?? 0,
    );
  }
}
