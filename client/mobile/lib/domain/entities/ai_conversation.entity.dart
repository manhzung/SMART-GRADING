class AIConversation {
  final String id;
  final String? examId;
  final DateTime? lastMessageAt;

  AIConversation({
    required this.id,
    this.examId,
    this.lastMessageAt,
  });

  factory AIConversation.fromJson(Map<String, dynamic> json) {
    return AIConversation(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      examId: json['examId'] is String ? json['examId'].toString() : null,
      lastMessageAt: json['lastMessageAt'] != null
          ? DateTime.tryParse(json['lastMessageAt'].toString())
          : null,
    );
  }
}
