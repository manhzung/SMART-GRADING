// ignore_for_file: use_null_aware_elements

import '../../core/network/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../domain/entities/question.entity.dart';

class QuestionService {
  QuestionService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<PaginatedQuestions> getQuestions({
    int page = 1,
    int limit = 20,
    String? difficulty,
    String? isApproved,
    String? tags,
    String? search,
    String? source,
    String? bankId,
  }) {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (difficulty != null && difficulty.isNotEmpty) queryParams['difficulty'] = difficulty.toLowerCase();
    if (isApproved != null && isApproved.isNotEmpty) queryParams['isApproved'] = isApproved;
    if (tags != null && tags.isNotEmpty) queryParams['tags'] = tags;
    if (search != null && search.isNotEmpty) queryParams['search'] = search;
    if (source != null && source.isNotEmpty) queryParams['source'] = source;
    if (bankId != null && bankId.isNotEmpty) queryParams['bankId'] = bankId;

    return _apiClient.get<PaginatedQuestions>(
      ApiConstants.questions,
      queryParameters: queryParams,
      parser: (data) => PaginatedQuestions.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<QuestionModel> getQuestionById(String questionId) {
    return _apiClient.get<QuestionModel>(
      '${ApiConstants.questions}/$questionId',
      parser: (data) => QuestionModel.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<QuestionModel> createQuestion({
    required String content,
    required List<QuestionOption> options,
    required String correctAnswer,
    required String difficulty,
    List<String>? tags,
    String? explanation,
  }) {
    return _apiClient.post<QuestionModel>(
      ApiConstants.questions,
      data: {
        'content': content,
        'type': 'single_choice',
        'options': options.map((o) => {
          'id': o.id.isEmpty ? 'opt_${DateTime.now().millisecondsSinceEpoch}_${options.indexOf(o)}' : o.id,
          'text': o.text,
          'isCorrect': o.id == correctAnswer,
        }).toList(),
        'difficulty': difficulty.toLowerCase(),
        if (tags != null) 'tags': tags,
        if (explanation != null && explanation.isNotEmpty) 'explanation': explanation,
      },
      parser: (data) => QuestionModel.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<QuestionModel> updateQuestion(String questionId, Map<String, dynamic> data) {
    return _apiClient.patch<QuestionModel>(
      '${ApiConstants.questions}/$questionId',
      data: data,
      parser: (data) => QuestionModel.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<void> deleteQuestion(String questionId) {
    return _apiClient.delete<void>('${ApiConstants.questions}/$questionId');
  }

  Future<QuestionModel> approveQuestion(String questionId) {
    return _apiClient.post<QuestionModel>(
      '${ApiConstants.questions}/$questionId/approve',
      parser: (data) => QuestionModel.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<QuestionStats> getStats() {
    return _apiClient.get<QuestionStats>(
      '${ApiConstants.questions}/stats',
      parser: (data) => QuestionStats.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<List<String>> getTags() async {
    try {
      final result = await _apiClient.get<Map<String, dynamic>>(
        '${ApiConstants.questions}/tags',
        parser: (data) => data as Map<String, dynamic>,
      );
      final tags = result['tags'] as List<dynamic>? ?? [];
      return tags.map((t) => t.toString()).toList();
    } catch (_) {
      return [];
    }
  }
}
