class QuestionBank {
  final String id;
  final String name;
  final String? description;
  final String type;
  final String? schoolId;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  QuestionBank({
    required this.id,
    required this.name,
    this.description,
    required this.type,
    this.schoolId,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  factory QuestionBank.fromJson(Map<String, dynamic> json) {
    return QuestionBank(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      description: json['description']?.toString(),
      type: (json['type'] ?? 'public').toString(),
      schoolId: json['schoolId']?.toString(),
      isActive: json['isActive'] as bool? ?? true,
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString()) ?? DateTime.now(),
      updatedAt: DateTime.tryParse((json['updatedAt'] ?? '').toString()) ?? DateTime.now(),
    );
  }

  Map<String, dynamic>? toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'type': type,
      'schoolId': schoolId,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}
