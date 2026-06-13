import 'dart:typed_data';
import 'package:dio/dio.dart';
import '../../core/network/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../domain/omr/models/omr_template.dart';
import '../../domain/omr/models/evaluation_config.dart';

/// Service for fetching OMR templates and evaluation configs from the backend.
class OMRTemplateService {
  final ApiClient _apiClient;

  OMRTemplateService({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Fetch OMR template for an exam.
  Future<OMRTemplate> getTemplateForExam(String examId) async {
    try {
      final response = await _apiClient.get(
        '${ApiConstants.omrTemplates}/exam/$examId',
      );

      final data = response.data['data'] as Map<String, dynamic>;
      return OMRTemplate.fromJson(data);
    } on DioException catch (e) {
      throw Exception('Failed to fetch template: ${e.message}');
    }
  }

  /// Fetch evaluation config (answer key + marking scheme) for an exam.
  Future<EvaluationConfig> getEvaluationForExam(String examId) async {
    try {
      final response = await _apiClient.get(
        '${ApiConstants.exams}/$examId/evaluation',
      );

      final data = response.data['data'] as Map<String, dynamic>;
      return EvaluationConfig.fromJson(data);
    } on DioException catch (e) {
      throw Exception('Failed to fetch evaluation config: ${e.message}');
    }
  }

  /// Upload scanned image and get server-processed result.
  Future<Map<String, dynamic>> uploadScannedImage({
    required String examId,
    required Uint8List imageBytes,
    required Map<String, String> answers,
    required double score,
    required double maxScore,
  }) async {
    try {
      final formData = FormData.fromMap({
        'examId': examId,
        'image': MultipartFile.fromBytes(
          imageBytes,
          filename: 'omr_scan_${DateTime.now().millisecondsSinceEpoch}.jpg',
        ),
        'answers': answers,
        'score': score.toString(),
        'maxScore': maxScore.toString(),
      });

      final response = await _apiClient.post(
        ApiConstants.submissions,
        data: formData,
      );

      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception('Failed to upload scan: ${e.message}');
    }
  }

  Future<List<OMRTemplate>> getAll() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      ApiConstants.omrTemplates,
      parser: (data) => data as Map<String, dynamic>,
    );
    final results = response['results'] as List<dynamic>? ?? [];
    final templates = <OMRTemplate>[];
    for (final item in results) {
      if (item is Map<String, dynamic>) {
        templates.add(OMRTemplate.fromJson(item));
      }
    }
    return templates;
  }

  /// Download a template as JSON bytes (for offline use).
  Future<Uint8List> downloadTemplateBytes(String templateId) async {
    try {
      final dio = Dio();
      final response = await dio.get(
        '${ApiConstants.baseUrl}${ApiConstants.omrTemplates}/$templateId/json',
        options: Options(responseType: ResponseType.bytes),
      );
      return Uint8List.fromList(response.data);
    } on DioException catch (e) {
      throw Exception('Failed to download template: ${e.message}');
    }
  }
}
