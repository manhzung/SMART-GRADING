// ignore_for_file: use_null_aware_elements

import '../../core/network/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../domain/entities/ai_chat_message.entity.dart';
import '../../domain/entities/ai_conversation.entity.dart';
import '../../domain/entities/ai_report.entity.dart';

class AIService {
  AIService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<AIChatMessage> sendMessage({
    required String message,
    List<AIChatMessage>? history,
    AIChatContext? context,
  }) async {
    final data = <String, dynamic>{
      'message': message,
    };

    if (history != null) {
      data['history'] = history.map((m) {
        return {
          'role': m.role,
          'content': m.content,
        };
      }).toList();
    }

    if (context != null) {
      data['context'] = {
        if (context.examId != null) 'examId': context.examId,
        if (context.questionIds != null) 'questionIds': context.questionIds,
        if (context.recentMistakes != null)
          'recentMistakes': context.recentMistakes!
              .map((m) {
                    return {
                      'questionContent': m.questionContent,
                      'studentAnswer': m.studentAnswer,
                      'correctAnswer': m.correctAnswer,
                    };
                  })
              .toList(),
        if (context.weakTopics != null) 'weakTopics': context.weakTopics,
        'gradeLevel': context.gradeLevel,
      };
    }

    final result = await _apiClient.post<Map<String, dynamic>>(
      '${ApiConstants.aiChat}/send',
      data: data,
      parser: (data) => data as Map<String, dynamic>,
    );

    final msgData = result['data'] as Map<String, dynamic>;
    return AIChatMessage.fromJson({
      ...msgData,
      'role': 'assistant',
    });
  }

  Future<List<AIConversation>> getConversations({int limit = 20}) async {
    final result = await _apiClient.get<Map<String, dynamic>>(
      '${ApiConstants.aiChat}/conversations',
      queryParameters: {'limit': limit},
      parser: (data) => data as Map<String, dynamic>,
    );

    final List<dynamic> data = result['data'] ?? [];
    return data
        .map((json) => AIConversation.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<List<AIChatMessage>> getHistory(String conversationId) async {
    final result = await _apiClient.get<Map<String, dynamic>>(
      '${ApiConstants.aiChat}/history/$conversationId',
      parser: (data) => data as Map<String, dynamic>,
    );

    final data = result['data'] as Map<String, dynamic>;
    final List<dynamic> messages = data['messages'] ?? [];
    return messages
        .map((json) => AIChatMessage.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<AIConversation> createConversation({String? examId}) async {
    final result = await _apiClient.post<Map<String, dynamic>>(
      '${ApiConstants.aiChat}/conversations',
      data: examId != null ? {'examId': examId} : {},
      parser: (data) => data as Map<String, dynamic>,
    );

    return AIConversation.fromJson(result['data'] as Map<String, dynamic>);
  }

  Future<List<AIReport>> getReports({
    String? examId,
    String? subjectId,
    int limit = 10,
  }) async {
    final queryParams = <String, dynamic>{'limit': limit};
    if (examId != null) queryParams['examId'] = examId;
    if (subjectId != null) queryParams['subjectId'] = subjectId;

    final result = await _apiClient.get<Map<String, dynamic>>(
      '${ApiConstants.aiChat}/reports',
      queryParameters: queryParams,
      parser: (data) => data as Map<String, dynamic>,
    );

    final List<dynamic> data = result['data'] ?? [];
    return data
        .map((json) => AIReport.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<AIReport> generateReport(String examId) async {
    final result = await _apiClient.post<Map<String, dynamic>>(
      '${ApiConstants.aiReports}/exam/$examId',
      parser: (data) => data as Map<String, dynamic>,
    );

    return AIReport.fromJson(result['data'] as Map<String, dynamic>);
  }
}
