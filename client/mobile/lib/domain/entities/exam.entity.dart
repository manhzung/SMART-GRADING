class Question {
  final String id;
  final String content;
  final String type;
  final List<String>? options;
  final String? correctAnswer;
  final String? difficulty;
  final String? topic;
  final String? explanation;
  final String? imageUrl;
  final int score;

  Question({
    required this.id,
    required this.content,
    required this.type,
    this.options,
    this.correctAnswer,
    this.difficulty,
    this.topic,
    this.explanation,
    this.imageUrl,
    this.score = 5,
  });

  factory Question.fromJson(Map<String, dynamic> json) {
    int score = 5;
    if (json['score'] != null) {
      score = (json['score'] as num).toInt();
    } else if (json['points'] != null) {
      score = (json['points'] as num).toInt();
    }
    return Question(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      content: (json['content'] ?? '').toString(),
      type: (json['type'] ?? 'multiple_choice').toString(),
      options: (json['options'] as List<dynamic>?)?.map((e) => e.toString()).toList(),
      correctAnswer: json['correctAnswer']?.toString(),
      difficulty: json['difficulty']?.toString(),
      topic: json['topicName']?.toString() ?? json['topic']?.toString(),
      explanation: json['explanation']?.toString(),
      imageUrl: json['imageUrl']?.toString(),
      score: score,
    );
  }
}

class ExamClass {
  final String id;
  final String name;
  final String code;
  final int? studentCount;

  ExamClass({
    required this.id,
    required this.name,
    required this.code,
    this.studentCount,
  });

  factory ExamClass.fromJson(Map<String, dynamic> json) {
    return ExamClass(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      code: (json['code'] ?? '').toString(),
      studentCount: json['studentCount'] as int?,
    );
  }
}

class Exam {
  final String id;
  final String title;
  final String? description;
  final List<ExamClass> classIds;
  final ExamClass? primaryClassId;
  final String? omrTemplateId;
  final DateTime? examDate;
  final int duration;
  final int totalScore;
  final String status;
  final List<String> questionIds;
  final List<Question> questions;
  final int numberOfVersions;
  final int numberOfQuestions;
  final int totalStudents;
  final int totalSubmissions;
  final DateTime? publishedAt;
  final DateTime? completedAt;
  final DateTime createdAt;

  Exam({
    required this.id,
    required this.title,
    this.description,
    this.classIds = const [],
    this.primaryClassId,
    this.omrTemplateId,
    this.examDate,
    this.duration = 60,
    this.totalScore = 0,
    this.totalStudents = 0,
    this.totalSubmissions = 0,
    this.numberOfVersions = 1,
    this.numberOfQuestions = 0,
    required this.status,
    this.questionIds = const [],
    this.questions = const [],
    this.publishedAt,
    this.completedAt,
    required this.createdAt,
  });

  factory Exam.fromJson(Map<String, dynamic> json) {
    final classIdsRaw = json['classIds'] as List<dynamic>? ?? [];
    final classIds = classIdsRaw
        .whereType<Map<String, dynamic>>()
        .map((e) => ExamClass.fromJson(e))
        .toList();

    ExamClass? primary;
    if (json['primaryClassId'] != null) {
      primary = ExamClass.fromJson(json['primaryClassId'] as Map<String, dynamic>);
    }

    final questionIdsRaw = json['questionIds'] as List<dynamic>? ?? [];
    final List<String> questionIds = [];
    final List<Question> questions = [];

    for (final q in questionIdsRaw) {
      if (q is Map<String, dynamic>) {
        questions.add(Question.fromJson(q));
        questionIds.add((q['_id'] ?? q['id'] ?? '').toString());
      } else if (q != null) {
        questionIds.add(q.toString());
      }
    }

    return Exam(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      description: json['description']?.toString(),
      classIds: classIds,
      primaryClassId: primary,
      omrTemplateId: json['omrTemplateId'] is Map<String, dynamic>
          ? (json['omrTemplateId']['_id'] ?? json['omrTemplateId']['id'] ?? '').toString()
          : json['omrTemplateId']?.toString(),
      examDate: json['examDate'] != null
          ? DateTime.tryParse(json['examDate'].toString())
          : null,
      duration: (json['duration'] as num?)?.toInt() ?? 60,
      totalScore: (json['totalScore'] as num?)?.toInt() ?? 0,
      status: (json['status'] ?? 'draft').toString(),
      questionIds: questionIds,
      questions: questions,
      numberOfVersions: (json['numberOfVersions'] as num?)?.toInt() ?? 1,
      numberOfQuestions: (json['numberOfQuestions'] as num?)?.toInt() ?? 0,
      totalStudents: (json['totalStudents'] as num?)?.toInt() ?? 0,
      totalSubmissions: (json['totalSubmissions'] as num?)?.toInt() ?? 0,
      publishedAt: json['publishedAt'] != null
          ? DateTime.tryParse(json['publishedAt'].toString())
          : null,
      completedAt: json['completedAt'] != null
          ? DateTime.tryParse(json['completedAt'].toString())
          : null,
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString()) ?? DateTime.now(),
    );
  }

  String get primaryClassName {
    if (primaryClassId != null) return primaryClassId!.name;
    if (classIds.isNotEmpty) return classIds.first.name;
    return 'No class';
  }

  String get primaryClassCode {
    if (primaryClassId != null) return primaryClassId!.code;
    if (classIds.isNotEmpty) return classIds.first.code;
    return '';
  }
}

class Submission {
  final String id;
  final String examId;
  final String? versionId;
  final String studentId;
  final String? studentName;
  final String? studentCode;
  final List<Map<String, dynamic>>? answers;
  final double? score;
  final double? maxScore;
  final String? imageUrl;
  final String status;
  final DateTime? scannedAt;
  final String? examTitle;
  final DateTime? examDate;
  final String? versionCode;
  final String? classId;
  final String? className;

  Submission({
    required this.id,
    required this.examId,
    this.versionId,
    required this.studentId,
    this.studentName,
    this.studentCode,
    this.answers,
    this.score,
    this.maxScore,
    this.imageUrl,
    required this.status,
    this.scannedAt,
    this.examTitle,
    this.examDate,
    this.versionCode,
    this.classId,
    this.className,
  });

  factory Submission.fromJson(Map<String, dynamic> json) {
    String examId = '';
    String? examTitle;
    DateTime? examDate;
    if (json['examId'] != null) {
      if (json['examId'] is Map<String, dynamic>) {
        final exam = json['examId'] as Map<String, dynamic>;
        examId = (exam['_id'] ?? exam['id'] ?? '').toString();
        examTitle = exam['title']?.toString();
        examDate = exam['examDate'] != null
            ? DateTime.tryParse(exam['examDate'].toString())
            : null;
    } else {
      examId = json['examId'].toString();
    }
    }

    String studentId = '';
    String? studentName;
    String? studentCode;
    if (json['studentId'] != null) {
      final student = json['studentId'];
      if (student is Map<String, dynamic>) {
        studentId = (student['_id'] ?? student['id'] ?? '').toString();
        studentName = student['name']?.toString();
        studentCode = student['studentCode']?.toString();
      } else {
        studentId = student.toString();
      }
    }

    String? versionId;
    String? versionCode;
    if (json['versionId'] != null) {
      if (json['versionId'] is Map<String, dynamic>) {
        versionId = (json['versionId']['_id'] ?? json['versionId']['id'] ?? '').toString();
        versionCode = json['versionId']['versionCode']?.toString();
      } else {
        versionId = json['versionId'].toString();
      }
    }

    String? classId;
    String? className;
    if (json['classId'] != null) {
      if (json['classId'] is Map<String, dynamic>) {
        final cls = json['classId'] as Map<String, dynamic>;
        classId = (cls['_id'] ?? cls['id'] ?? '').toString();
        className = cls['name']?.toString();
      } else {
        classId = json['classId'].toString();
      }
    }

    final answersRaw = json['answers'];
    final List<Map<String, dynamic>>? answers = answersRaw is List
        ? answersRaw
            .whereType<Map<String, dynamic>>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList()
        : null;

    final submission = Submission(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      examId: examId,
      versionId: versionId,
      studentId: studentId,
      studentName: studentName,
      studentCode: studentCode,
      answers: answers,
      score: (json['totalScore'] as num?)?.toDouble(),
      maxScore: (json['maxScore'] as num?)?.toDouble(),
      imageUrl: json['images']?['original']?['url']?.toString(),
      status: (json['status'] ?? 'pending').toString(),
      scannedAt: json['scannedAt'] != null
          ? DateTime.tryParse(json['scannedAt'].toString())
          : null,
      examTitle: examTitle,
      examDate: examDate,
      versionCode: versionCode,
      classId: classId,
      className: className,
    );
    return submission;
  }

  String get displayName => studentName ?? studentCode ?? 'Unknown Student';

  String get displayExam {
    if (examTitle != null) {
      if (examDate != null) {
        return '$examTitle \u2022 ${_formatTime(examDate!)}';
      }
      return examTitle!;
    }
    return examId;
  }

  String _formatTime(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}

class ExamStatistics {
  final int totalSubmissions;
  final int totalStudents;
  final double submissionRate;
  final double averageScore;
  final double highestScore;
  final double lowestScore;
  final List<GradeDistribution> gradeDistribution;
  final double passRate;

  ExamStatistics({
    this.totalSubmissions = 0,
    this.totalStudents = 0,
    this.submissionRate = 0,
    this.averageScore = 0,
    this.highestScore = 0,
    this.lowestScore = 0,
    this.gradeDistribution = const [],
    this.passRate = 0,
  });

  factory ExamStatistics.fromJson(Map<String, dynamic> json) {
    return ExamStatistics(
      totalSubmissions: (json['totalSubmissions'] as num?)?.toInt() ?? 0,
      totalStudents: (json['totalStudents'] as num?)?.toInt() ?? 0,
      submissionRate: (json['submissionRate'] as num?)?.toDouble() ?? 0,
      averageScore: (json['averageScore'] as num?)?.toDouble() ?? 0,
      highestScore: (json['highestScore'] as num?)?.toDouble() ?? 0,
      lowestScore: (json['lowestScore'] as num?)?.toDouble() ?? 0,
      gradeDistribution: (json['gradeDistribution'] as List<dynamic>?)
              ?.map((e) => GradeDistribution.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      passRate: (json['passRate'] as num?)?.toDouble() ?? 0,
    );
  }
}

class GradeDistribution {
  final String grade;
  final int count;
  final double percentage;

  GradeDistribution({
    required this.grade,
    required this.count,
    required this.percentage,
  });

  factory GradeDistribution.fromJson(Map<String, dynamic> json) {
    return GradeDistribution(
      grade: (json['grade'] ?? '').toString(),
      count: (json['count'] as num?)?.toInt() ?? 0,
      percentage: (json['percentage'] as num?)?.toDouble() ?? 0,
    );
  }
}
