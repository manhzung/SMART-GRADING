import 'dart:typed_data';
import 'package:dio/dio.dart';
import '../../core/network/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../domain/omr/models/evaluation_config.dart';
import '../../domain/omr/models/omr_template.dart';

/// Service for fetching OMR templates and evaluation configs from the backend.
class OMRTemplateService {
  final ApiClient _apiClient;

  OMRTemplateService({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Fetch OMR scan JSON for an exam.
  /// Returns templateJson (AMC format with bubble coords + answer key).
  /// Used by mobile engine_v2 for OMR scanning.
  Future<Map<String, dynamic>> getTemplateJsonForExam(String examId) async {
    try {
      final response = await _apiClient.get(
        '${ApiConstants.omrTemplates}/exam/$examId/json',
      );
      final data = response.data['data'] as Map<String, dynamic>;
      return data;
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

  /// Fetch all OMR template metadata (for listing/selection).
  /// Returns templates with fieldBlocks populated from server's templateJson.
  Future<List<OMRTemplate>> getAll() async {
    try {
      final response = await _apiClient.get(
        ApiConstants.omrTemplates,
      );
      final data = response.data['data'] as List<dynamic>;
      return data.map((json) => OMRTemplate.fromServerJson(json as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw Exception('Failed to fetch templates: ${e.message}');
    }
  }

  /// Fetch full template JSON by template ID.
  /// Parses the server's templateJson format into OMRTemplate fieldBlocks.
  Future<OMRTemplate> getJsonById(String id) async {
    try {
      final response = await _apiClient.get(
        '${ApiConstants.omrTemplates}/$id',
      );
      final data = response.data['data'] as Map<String, dynamic>;
      return OMRTemplate.fromServerJson(data);
    } on DioException catch (e) {
      throw Exception('Failed to fetch template: ${e.message}');
    }
  }
}
