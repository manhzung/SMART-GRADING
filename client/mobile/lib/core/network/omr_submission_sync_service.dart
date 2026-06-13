// ignore_for_file: use_null_aware_elements

import 'dart:typed_data';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/app_constants.dart';

/// Handles syncing pending OMR submissions to the backend when online.
class OMRSubmissionSyncService {
  final ApiClient _apiClient;

  OMRSubmissionSyncService({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Sync all pending submissions stored locally.
  Future<int> syncPendingSubmissions() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final pendingJson = prefs.getStringList('pending_submissions') ?? [];
      if (pendingJson.isEmpty) return 0;

      int synced = 0;
      final updatedPending = <String>[];

      for (final json in pendingJson) {
        try {
          final data = jsonDecode(json) as Map<String, dynamic>;
          final success = await submitResultOnly(
            examId: data['examId'] as String,
            answers: Map<String, String>.from(data['answers'] as Map),
            score: (data['score'] as num).toDouble(),
            maxScore: (data['maxScore'] as num).toDouble(),
            studentId: data['studentId'] as String?,
            classId: data['classId'] as String?,
            submissionId: data['submissionId'] as String?,
          );
          if (success) {
            synced++;
          } else {
            updatedPending.add(json);
          }
        } catch (_) {
          updatedPending.add(json);
        }
      }

      await prefs.setStringList('pending_submissions', updatedPending);
      return synced;
    } catch (_) {
      return 0;
    }
  }

  /// Submit a single pending scan to the server.
  Future<bool> submitScan({
    required String examId,
    required Uint8List imageBytes,
    required Map<String, String> answers,
    required double score,
    required double maxScore,
    String? classId,
  }) async {
    try {
      final formData = FormData.fromMap({
        'examId': examId,
        if (classId != null) 'classId': classId,
        'image': MultipartFile.fromBytes(
          imageBytes,
          filename: 'omr_scan_${DateTime.now().millisecondsSinceEpoch}.jpg',
        ),
        'answers': jsonEncode(answers),
        'score': score.toString(),
        'maxScore': maxScore.toString(),
      });

      await _apiClient.post(
        ApiConstants.submissions,
        data: formData,
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Submit a scan result without the image (already processed locally).
  Future<bool> submitResultOnly({
    required String examId,
    required Map<String, String> answers,
    required double score,
    required double maxScore,
    String? studentId,
    String? classId,
    String? submissionId,
  }) async {
    try {
      await _apiClient.post(
        ApiConstants.submissions,
        data: {
          'examId': examId,
          'answers': jsonEncode(answers),
          'score': score.toString(),
          'maxScore': maxScore.toString(),
          if (studentId != null) 'studentId': studentId,
          if (classId != null) 'classId': classId,
          if (submissionId != null) 'submissionId': submissionId,
        },
      );
      return true;
    } catch (e) {
      return false;
    }
  }
}
