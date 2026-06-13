class AppNotification {
  final String id;
  final String type;
  final String title;
  final String body;
  final bool isRead;
  final DateTime? readAt;
  final DateTime createdAt;
  final String priority;
  final NotificationData? data;

  AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    this.isRead = false,
    this.readAt,
    required this.createdAt,
    this.priority = 'normal',
    this.data,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    NotificationData? notifData;
    if (json['data'] != null && json['data'] is Map<String, dynamic>) {
      notifData = NotificationData.fromJson(json['data'] as Map<String, dynamic>);
    }

    return AppNotification(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      type: (json['type'] ?? 'system').toString(),
      title: (json['title'] ?? '').toString(),
      body: (json['body'] ?? '').toString(),
      isRead: json['isRead'] as bool? ?? false,
      readAt: json['readAt'] != null
          ? DateTime.tryParse(json['readAt'].toString())
          : null,
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString()) ?? DateTime.now(),
      priority: (json['priority'] ?? 'normal').toString(),
      data: notifData,
    );
  }

  String get filterType {
    switch (type) {
      case 'exam_published':
      case 'exam_reminder':
      case 'score_available':
        return 'Ky thi';
      case 'appeal_submitted':
      case 'appeal_resolved':
        return 'Khieu nai';
      default:
        return 'Khac';
    }
  }

  String get priorityLabel {
    switch (priority) {
      case 'urgent':
        return 'Uu tien cao';
      case 'high':
        return 'Cao';
      case 'normal':
        return 'Trung binh';
      case 'low':
        return 'Thap';
      default:
        return 'Trung binh';
    }
  }
}

class NotificationData {
  final String? examId;
  final String? submissionId;
  final String? appealId;
  final String? classId;
  final String? questionId;

  NotificationData({
    this.examId,
    this.submissionId,
    this.appealId,
    this.classId,
    this.questionId,
  });

  factory NotificationData.fromJson(Map<String, dynamic> json) {
    return NotificationData(
      examId: _extractId(json['examId']),
      submissionId: _extractId(json['submissionId']),
      appealId: _extractId(json['appealId']),
      classId: _extractId(json['classId']),
      questionId: _extractId(json['questionId']),
    );
  }

  static String? _extractId(dynamic val) {
    if (val == null) return null;
    if (val is Map<String, dynamic>) {
      return (val['_id'] ?? val['id'] ?? '').toString();
    }
    return val.toString();
  }
}

class PaginatedNotifications {
  final List<AppNotification> results;
  final int page;
  final int limit;
  final int total;
  final int pages;

  PaginatedNotifications({
    required this.results,
    required this.page,
    required this.limit,
    required this.total,
    required this.pages,
  });

  factory PaginatedNotifications.fromJson(Map<String, dynamic> json) {
    final resultsRaw = json['results'] as List<dynamic>? ?? [];
    return PaginatedNotifications(
      results: resultsRaw
          .whereType<Map<String, dynamic>>()
          .map((e) => AppNotification.fromJson(e))
          .toList(),
      page: (json['page'] as num?)?.toInt() ?? 1,
      limit: (json['limit'] as num?)?.toInt() ?? 20,
      total: (json['total'] as num?)?.toInt() ?? 0,
      pages: (json['pages'] as num?)?.toInt() ?? 1,
    );
  }
}
