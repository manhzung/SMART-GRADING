import 'package:dio/dio.dart';

class ExamTemplateService {
  final Dio _dio;

  ExamTemplateService(this._dio);

  Future<Map<String, dynamic>> getTemplate(
    String examId, {
    String? versionCode,
  }) async {
    final queryParams = <String, dynamic>{};
    if (versionCode != null) {
      queryParams['versionCode'] = versionCode;
    }

    final response = await _dio.get(
      '/exams/$examId/template',
      queryParameters: queryParams,
    );
    return response.data as Map<String, dynamic>;
  }
}
