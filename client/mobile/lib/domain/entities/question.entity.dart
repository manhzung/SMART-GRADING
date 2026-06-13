class QuestionModel {
  final String id;
  final String content;
  final String type;
  final List<QuestionOption> options;
  final String? correctAnswer;
  final String difficulty;
  final List<String> tags;
  final String? topic;
  final String? explanation;
  final String? imageUrl;
  final int usageCount;
  final bool isApproved;
  final String? source;
  final DateTime createdAt;
  final String? createdByName;

  QuestionModel({
    required this.id,
    required this.content,
    required this.type,
    required this.options,
    this.correctAnswer,
    required this.difficulty,
    required this.tags,
    this.topic,
    this.explanation,
    this.imageUrl,
    required this.usageCount,
    required this.isApproved,
    this.source,
    required this.createdAt,
    this.createdByName,
  });

  bool get isAiGenerated => source == 'ai';

  int? get correctIndex {
    if (correctAnswer == null) return null;
    final idx = options.indexWhere((o) => o.id == correctAnswer);
    return idx >= 0 ? idx : null;
  }

  factory QuestionModel.fromJson(Map<String, dynamic> json) {
    final optionsRaw = json['options'] as List<dynamic>? ?? [];
    final List<QuestionOption> opts = optionsRaw
        .whereType<Map<String, dynamic>>()
        .map((o) => QuestionOption.fromJson(o))
        .toList();

    String? correctAns;
    if (json['correctAnswer'] != null) {
      correctAns = json['correctAnswer'].toString();
    } else {
      final correctOpt = opts.where((o) => o.isCorrect).toList();
      if (correctOpt.isNotEmpty) correctAns = correctOpt.first.id;
    }

    final tagsRaw = json['tags'] as List<dynamic>? ?? [];
    final List<String> tags = tagsRaw.map((t) => t.toString()).toList();

    return QuestionModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      content: (json['content'] ?? json['question'] ?? '').toString(),
      type: (json['type'] ?? 'single_choice').toString(),
      options: opts,
      correctAnswer: correctAns,
      difficulty: (json['difficulty'] ?? 'medium').toString().toUpperCase(),
      tags: tags,
      topic: json['topicId'] is Map<String, dynamic>
          ? (json['topicId']['name'] ?? '').toString()
          : json['topicId']?.toString(),
      explanation: json['explanation']?.toString(),
      imageUrl: json['imageUrl']?.toString(),
      usageCount: (json['usageCount'] as num?)?.toInt() ?? 0,
      isApproved: json['isApproved'] as bool? ?? false,
      source: json['source']?.toString(),
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString()) ?? DateTime.now(),
      createdByName: json['createdBy'] is Map<String, dynamic>
          ? (json['createdBy']['name'] ?? '').toString()
          : null,
    );
  }
}

class QuestionOption {
  final String id;
  final String text;
  final bool isCorrect;

  QuestionOption({
    required this.id,
    required this.text,
    required this.isCorrect,
  });

  factory QuestionOption.fromJson(Map<String, dynamic> json) {
    return QuestionOption(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      text: (json['text'] ?? json['content'] ?? json['option'] ?? '').toString(),
      isCorrect: json['isCorrect'] as bool? ?? false,
    );
  }
}

class PaginatedQuestions {
  final List<QuestionModel> results;
  final int page;
  final int limit;
  final int total;
  final int pages;

  PaginatedQuestions({
    required this.results,
    required this.page,
    required this.limit,
    required this.total,
    required this.pages,
  });

  factory PaginatedQuestions.fromJson(Map<String, dynamic> json) {
    final resultsRaw = json['results'] as List<dynamic>? ?? [];
    return PaginatedQuestions(
      results: resultsRaw
          .whereType<Map<String, dynamic>>()
          .map((e) => QuestionModel.fromJson(e))
          .toList(),
      page: (json['page'] as num?)?.toInt() ?? 1,
      limit: (json['limit'] as num?)?.toInt() ?? 20,
      total: (json['total'] as num?)?.toInt() ?? 0,
      pages: (json['pages'] as num?)?.toInt() ?? 1,
    );
  }
}

class QuestionStats {
  final int total;
  final int approved;
  final int pending;
  final double integrity;

  QuestionStats({
    required this.total,
    required this.approved,
    required this.pending,
    required this.integrity,
  });

  factory QuestionStats.fromJson(Map<String, dynamic> json) {
    return QuestionStats(
      total: (json['total'] as num?)?.toInt() ?? 0,
      approved: (json['approved'] as num?)?.toInt() ?? 0,
      pending: (json['pending'] as num?)?.toInt() ?? 0,
      integrity: (json['integrity'] as num?)?.toDouble() ?? 0.0,
    );
  }
}
