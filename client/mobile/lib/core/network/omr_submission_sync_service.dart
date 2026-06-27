// ignore_for_file: use_null_aware_elements

import 'dart:async';
import 'dart:typed_data';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/errors/app_exceptions.dart';

/// Handles syncing pending OMR submissions to the backend when online.
class OMRSubmissionSyncService {
  final ApiClient _apiClient;
  final Connectivity _connectivity;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  
  static const int _maxRetries = 3;
  static const Duration _retryDelay = Duration(seconds: 2);

  OMRSubmissionSyncService({
    required ApiClient apiClient,
    Connectivity? connectivity,
  })  : _apiClient = apiClient,
        _connectivity = connectivity ?? Connectivity();

  /// Start listening for connectivity changes and auto-sync when online.
  void startAutoSync() {
    _connectivitySubscription?.cancel();
    _connectivitySubscription = _connectivity.onConnectivityChanged.listen((results) async {
      if (results.isNotEmpty && !results.contains(ConnectivityResult.none)) {
        // Online - try to sync pending submissions
        await syncPendingSubmissions();
      }
    });
  }

  /// Stop auto-sync listener.
  void stopAutoSync() {
    _connectivitySubscription?.cancel();
    _connectivitySubscription = null;
  }

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
          final success = await submitResultOnlyWithRetry(
            examId: data['examId'] as String,
            answers: Map<String, String>.from(data['answers'] as Map),
            score: (data['score'] as num).toDouble(),
            maxScore: (data['maxScore'] as num).toDouble(),
            studentId: data['studentId'] as String?,
            classId: data['classId'] as String?,
            submissionId: data['submissionId'] as String?,
            studentCode: data['studentCode'] as String?,
            versionCode: data['versionCode'] as String?,
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

  /// Submit a single pending scan to the server with retry logic.
  Future<bool> submitScanWithRetry({
    required String examId,
    required Uint8List imageBytes,
    required Map<String, String> answers,
    required double score,
    required double maxScore,
    String? classId,
  }) async {
    for (int attempt = 1; attempt <= _maxRetries; attempt++) {
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
      } on ForbiddenException {
        // Don't retry on forbidden - likely auth issue
        rethrow;
      } on AuthException {
        // Don't retry on auth failure - need to re-login
        rethrow;
      } catch (e) {
        if (attempt < _maxRetries) {
          await Future.delayed(_retryDelay * attempt);
        }
      }
    }
    return false;
  }

  /// Submit a scan result without the image (already processed locally).
  /// For AMC exams, this is the primary submission path — mobile has already
  /// scanned + graded using engine_v2 + templateJson.
  Future<bool> submitResultOnly({
    required String examId,
    required Map<String, String> answers,
    required double score,
    required double maxScore,
    String? studentId,
    String? classId,
    String? submissionId,
    String? studentCode,
    String? versionCode,
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
          if (studentCode != null) 'studentCode': studentCode,
          if (versionCode != null) 'versionCode': versionCode,
        },
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Submit result with retry logic.
  Future<bool> submitResultOnlyWithRetry({
    required String examId,
    required Map<String, String> answers,
    required double score,
    required double maxScore,
    String? studentId,
    String? classId,
    String? submissionId,
    String? studentCode,
    String? versionCode,
  }) async {
    for (int attempt = 1; attempt <= _maxRetries; attempt++) {
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
            if (studentCode != null) 'studentCode': studentCode,
            if (versionCode != null) 'versionCode': versionCode,
          },
        );
        return true;
      } on ForbiddenException {
        rethrow;
      } on AuthException {
        rethrow;
      } catch (e) {
        if (attempt < _maxRetries) {
          await Future.delayed(_retryDelay * attempt);
        }
      }
    }
    return false;
  }

  /// Dispose resources.
  void dispose() {
    stopAutoSync();
  }
}
