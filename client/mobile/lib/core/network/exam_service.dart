import '../../domain/entities/exam.entity.dart';
import '../constants/app_constants.dart';
import 'api_client.dart';
import 'package:flutter/foundation.dart' show debugPrint;

class ExamService {
  ExamService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<PaginatedExams> getExams({
    int page = 1,
    int limit = 20,
    String? classId,
    String? status,
    String? fromDate,
    String? toDate,
    String? search,
    String sortBy = 'examDate',
    String order = 'desc',
  }) {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
      'sortBy': sortBy,
      'order': order,
    };
    if (classId != null && classId.isNotEmpty) queryParams['classId'] = classId;
    if (status != null && status.isNotEmpty) queryParams['status'] = status;
    if (fromDate != null && fromDate.isNotEmpty) queryParams['fromDate'] = fromDate;
    if (toDate != null && toDate.isNotEmpty) queryParams['toDate'] = toDate;
    if (search != null && search.isNotEmpty) queryParams['search'] = search;

    return _apiClient.get<PaginatedExams>(
      ApiConstants.exams,
      queryParameters: queryParams,
      parser: (data) => PaginatedExams.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<Exam> getExamById(String examId) {
    return _apiClient.get<Exam>(
      '${ApiConstants.exams}/$examId',
      parser: (data) => Exam.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<UpcomingExams> getUpcomingExams({int limit = 5}) {
    return _apiClient.get<UpcomingExams>(
      '${ApiConstants.exams}/upcoming',
      queryParameters: {'limit': limit},
      parser: (data) => UpcomingExams.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<Exam> createExam({
    required String title,
    String? description,
    List<String>? classIds,
    String? primaryClassId,
    String? subjectId,
    String? omrTemplateId,
    DateTime? examDate,
    int? duration,
    int? totalScore,
    int? numberOfQuestions,
    int? numberOfVersions,
    List<String>? questionIds,
  }) {
    final data = <String, dynamic>{'title': title};
    if (description != null) data['description'] = description;
    if (classIds != null && classIds.isNotEmpty) data['classIds'] = classIds;
    if (primaryClassId != null) data['primaryClassId'] = primaryClassId;
    if (subjectId != null) data['subjectId'] = subjectId;
    if (omrTemplateId != null) data['omrTemplateId'] = omrTemplateId;
    if (examDate != null) data['examDate'] = examDate.toIso8601String();
    if (duration != null) data['duration'] = duration;
    if (totalScore != null) data['totalScore'] = totalScore;
    if (numberOfQuestions != null) data['numberOfQuestions'] = numberOfQuestions;
    if (numberOfVersions != null) data['numberOfVersions'] = numberOfVersions;
    if (questionIds != null) data['questionIds'] = questionIds;

    return _apiClient.post<Exam>(
      ApiConstants.exams,
      data: data,
      parser: (data) => Exam.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<Exam> updateExam(String examId, Map<String, dynamic> data) {
    return _apiClient.patch<Exam>(
      '${ApiConstants.exams}/$examId',
      data: data,
      parser: (data) => Exam.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<void> deleteExam(String examId) {
    return _apiClient.delete<void>('${ApiConstants.exams}/$examId');
  }

  Future<Exam> publishExam(String examId) {
    return _apiClient.post<Exam>(
      '${ApiConstants.exams}/$examId/publish',
      parser: (data) => Exam.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<Exam> completeExam(String examId) {
    return _apiClient.post<Exam>(
      '${ApiConstants.exams}/$examId/complete',
      parser: (data) => Exam.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<void> addClassesToExam(String examId, List<String> classIds) {
    return _apiClient.post<void>(
      '${ApiConstants.exams}/$examId/classes',
      data: {'classIds': classIds},
    );
  }

  Future<void> removeClassesFromExam(String examId, List<String> classIds) {
    return _apiClient.post<void>(
      '${ApiConstants.exams}/$examId/classes',
      data: {'classIds': classIds},
    );
  }

  Future<List<ExamVersion>> getExamVersions(String examId) {
    return _apiClient.get<List<ExamVersion>>(
      '${ApiConstants.exams}/$examId/versions',
      parser: (data) {
        final payload = data is Map<String, dynamic> ? data : <String, dynamic>{};
        final results = payload['results'] as List<dynamic>? ?? const [];
        return results
            .whereType<Map<String, dynamic>>()
            .map((e) => ExamVersion.fromJson(e))
            .toList();
      },
    );
  }

  Future<List<ExamVersion>> getExamVersionsFull(String examId) {
    return _apiClient.get<List<ExamVersion>>(
      '${ApiConstants.exams}/$examId/versions/full',
      parser: (data) {
        final payload = data is Map<String, dynamic> ? data : <String, dynamic>{};
        final results = payload['results'] as List<dynamic>? ?? const [];
        return results
            .whereType<Map<String, dynamic>>()
            .map((e) => ExamVersion.fromJson(e))
            .toList();
      },
    );
  }

  Future<void> generateExamVersions(String examId, {int count = 4}) {
    return _apiClient.post<void>(
      '${ApiConstants.exams}/$examId/versions',
      data: {'count': count},
    );
  }

  Future<ExamVersionAnswerKey> getVersionAnswerKey(String examId, String versionCode) {
    debugPrint('[ExamService] getVersionAnswerKey: examId=$examId, versionCode=$versionCode');
    return _apiClient.get<ExamVersionAnswerKey>(
      '${ApiConstants.exams}/$examId/versions/$versionCode/answer-key',
      parser: (data) => ExamVersionAnswerKey.fromJson(data as Map<String, dynamic>),
    );
  }
}

class PaginatedExams {
  final List<Exam> results;
  final int page;
  final int limit;
  final int total;
  final int pages;

  PaginatedExams({
    required this.results,
    required this.page,
    required this.limit,
    required this.total,
    required this.pages,
  });

  factory PaginatedExams.fromJson(Map<String, dynamic> json) {
    final resultsRaw = json['results'] as List<dynamic>? ?? [];
    return PaginatedExams(
      results: resultsRaw
          .whereType<Map<String, dynamic>>()
          .map((e) => Exam.fromJson(e))
          .toList(),
      page: (json['page'] as num?)?.toInt() ?? 1,
      limit: (json['limit'] as num?)?.toInt() ?? 20,
      total: (json['total'] as num?)?.toInt() ?? 0,
      pages: (json['pages'] as num?)?.toInt() ?? 1,
    );
  }
}

class UpcomingExams {
  final List<Exam> results;
  final int limit;
  final int count;

  UpcomingExams({
    required this.results,
    required this.limit,
    required this.count,
  });

  factory UpcomingExams.fromJson(Map<String, dynamic> json) {
    final resultsRaw = json['results'] as List<dynamic>? ?? [];
    return UpcomingExams(
      results: resultsRaw
          .whereType<Map<String, dynamic>>()
          .map((e) => Exam.fromJson(e))
          .toList(),
      limit: (json['limit'] as num?)?.toInt() ?? 5,
      count: (json['count'] as num?)?.toInt() ?? 0,
    );
  }
}

class ExamVersion {
  final String id;
  final String examId;
  final String versionCode;
  final List<Question> questions;

  ExamVersion({
    required this.id,
    required this.examId,
    required this.versionCode,
    this.questions = const [],
  });

  factory ExamVersion.fromJson(Map<String, dynamic> json) {
    final questionsRaw = json['questions'] as List<dynamic>? ?? [];
    return ExamVersion(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      examId: (json['examId'] ?? '').toString(),
      versionCode: (json['versionCode'] ?? '').toString(),
      questions: questionsRaw
          .whereType<Map<String, dynamic>>()
          .map((q) => Question.fromJson(q))
          .toList(),
    );
  }
}

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
      score: (json['score'] as num?)?.toInt() ??
          (json['points'] as num?)?.toInt() ?? 5,
    );
  }
}

class ExamVersionAnswerKey {
  final String versionCode;
  final Map<String, String> answerKey;
  final int numberOfQuestions;

  ExamVersionAnswerKey({
    required this.versionCode,
    required this.answerKey,
    required this.numberOfQuestions,
  });

  factory ExamVersionAnswerKey.fromJson(Map<String, dynamic> json) {
    debugPrint('[ExamVersionAnswerKey] fromJson: $json');
    final keyRaw = json['answerKey'] as Map<String, dynamic>? ?? {};
    final key = keyRaw.map((k, v) => MapEntry(k, v.toString()));
    debugPrint('[ExamVersionAnswerKey] Parsed answerKey: $key');
    return ExamVersionAnswerKey(
      versionCode: (json['versionCode'] ?? '').toString(),
      answerKey: key,
      numberOfQuestions: (json['numberOfQuestions'] as num?)?.toInt() ?? 0,
    );
  }
}
