import '../network/api_client.dart';

class ExamTemplateService {
  final ApiClient _apiClient;

  ExamTemplateService(this._apiClient);

  Future<Map<String, dynamic>> getTemplate(
    String examId, {
    String? versionCode,
  }) async {
    final queryParams = <String, dynamic>{};
    if (versionCode != null) {
      queryParams['versionCode'] = versionCode;
    }

    final response = await _apiClient.get<dynamic>(
      '/exams/$examId/template',
      queryParameters: queryParams,
    );
    return response as Map<String, dynamic>;
  }
}
