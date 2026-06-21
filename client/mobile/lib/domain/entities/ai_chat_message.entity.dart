class AIChatMessage {
  final String id;
  final String content;
  final String role;
  final DateTime createdAt;

  AIChatMessage({
    required this.id,
    required this.content,
    required this.role,
    required this.createdAt,
  });

  factory AIChatMessage.fromJson(Map<String, dynamic> json) {
    return AIChatMessage(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      content: json['content']?.toString() ?? json['message']?.toString() ?? '',
      role: json['role']?.toString() ?? 'assistant',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class AIChatContext {
  final String? examId;
  final List<String>? questionIds;
  final List<AIRecentMistake>? recentMistakes;
  final List<String>? weakTopics;
  final int gradeLevel;

  AIChatContext({
    this.examId,
    this.questionIds,
    this.recentMistakes,
    this.weakTopics,
    this.gradeLevel = 10,
  });
}

class AIRecentMistake {
  final String? questionContent;
  final String? studentAnswer;
  final String? correctAnswer;

  AIRecentMistake({
    this.questionContent,
    this.studentAnswer,
    this.correctAnswer,
  });

  factory AIRecentMistake.fromJson(Map<String, dynamic> json) {
    return AIRecentMistake(
      questionContent: json['questionContent']?.toString(),
      studentAnswer: json['studentAnswer']?.toString(),
      correctAnswer: json['correctAnswer']?.toString(),
    );
  }
}
