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
    // Response is the full data already from _apiClient.get
    if (response is Map<String, dynamic>) {
      return response;
    }
    throw Exception('Invalid template response format');
  }
}
