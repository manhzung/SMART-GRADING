// ignore_for_file: use_null_aware_elements

import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'dart:convert';
import 'dart:developer' as developer;
import 'package:dio/dio.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/errors/app_exceptions.dart';

/// Handles syncing pending OMR submissions to the backend when online.
class OMRSubmissionSyncService {
  final ApiClient _apiClient;
  final String _baseUrl;
  final Connectivity _connectivity;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  
  static const int _maxRetries = 3;
  static const Duration _retryDelay = Duration(seconds: 2);

  OMRSubmissionSyncService({
    required ApiClient apiClient,
    required String baseUrl,
    Connectivity? connectivity,
  })  : _apiClient = apiClient,
        _baseUrl = baseUrl,
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

  /// Get upload signature from server
  Future<Map<String, dynamic>> _getUploadSignature({
    required String examId,
    String? submissionId,
    String type = 'original',
  }) async {
    final qs = <String, String>{
      'examId': examId,
      'type': type,
    };
    if (submissionId != null) qs['submissionId'] = submissionId;
    
    // _baseUrl is like "http://10.0.2.2:3000" - no /api/v1 suffix
    final uri = Uri.parse('$_baseUrl/api/v1/upload/signature')
        .replace(queryParameters: qs);
    final res = await httpClient.get(uri, headers: _headers);
    
    if (res.statusCode != 200) {
      throw Exception('Failed to get upload signature: HTTP ${res.statusCode}');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  http.Client get httpClient => http.Client();

  Map<String, String> get _headers {
    final token = _apiClient.getToken?.call();
    return {
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  /// Upload image to Cloudinary using server signature
  Future<Map<String, dynamic>> _uploadToCloudinary({
    required Uint8List imageBytes,
    required Map<String, dynamic> signature,
  }) async {
    final form = FormData.fromMap({
      'file': MultipartFile.fromBytes(
        imageBytes,
        filename: 'omr_scan_${DateTime.now().millisecondsSinceEpoch}.jpg',
      ),
      'api_key': signature['apiKey'],
      'timestamp': signature['timestamp'],
      'signature': signature['signature'],
      'folder': signature['folder'],
      'public_id': signature['publicId'],
    });

    final dio = Dio();
    final res = await dio.post(
      signature['uploadUrl'] as String,
      data: form,
      options: Options(
        headers: {'Content-Type': 'multipart/form-data'},
        responseType: ResponseType.plain,
      ),
    );

    if (res.statusCode != 200) {
      throw Exception('Cloudinary upload failed: HTTP ${res.statusCode}');
    }
    return jsonDecode(res.data.toString()) as Map<String, dynamic>;
  }

  /// Submit scan result WITH image upload to Cloudinary
  Future<bool> submitWithImage({
    required String examId,
    required Uint8List imageBytes,
    required Map<String, String> answers,
    required double score,
    required double maxScore,
    String? studentId,
    String? classId,
    String? studentCode,
    String? versionCode,
    Uint8List? annotatedImageBytes,
  }) async {
    for (int attempt = 1; attempt <= _maxRetries; attempt++) {
      try {
        // 1. Get upload signatures
        final sigOriginal = await _getUploadSignature(examId: examId, type: 'original');
        
        // 2. Upload original to Cloudinary
        final uploadResult = await _uploadToCloudinary(
          imageBytes: imageBytes,
          signature: sigOriginal,
        );
        
        final cloudinaryUrl = uploadResult['secure_url'] as String;
        final publicId = uploadResult['public_id'] as String;

        // 3. Upload annotated image if provided
        String? annotatedUrl;
        String? annotatedPublicId;
        developer.log('[OMRSubmissionSync] Annotated bytes check: ${annotatedImageBytes?.length ?? "null"}', name: 'OMRScanner');
        if (annotatedImageBytes != null && annotatedImageBytes.isNotEmpty) {
          try {
            developer.log('[OMRSubmissionSync] Uploading annotated image...', name: 'OMRScanner');
            final sigAnnotated = await _getUploadSignature(examId: examId, type: 'annotated');
            final annotatedUpload = await _uploadToCloudinary(
              imageBytes: annotatedImageBytes,
              signature: sigAnnotated,
            );
            annotatedUrl = annotatedUpload['secure_url'] as String;
            annotatedPublicId = annotatedUpload['public_id'] as String;
            developer.log('[OMRSubmissionSync] Annotated uploaded: $annotatedUrl', name: 'OMRScanner');
          } catch (e, st) {
            developer.log('[OMRSubmissionSync] Failed to upload annotated image: $e\n$st', name: 'OMRScanner');
          }
        }

        // 4. Submit with Cloudinary URLs
        await _apiClient.post(
          ApiConstants.submissions,
          data: {
            'examId': examId,
            'answers': jsonEncode(answers),
            'score': score.toString(),
            'maxScore': maxScore.toString(),
            if (studentId != null) 'studentId': studentId,
            if (classId != null) 'classId': classId,
            if (studentCode != null) 'studentCode': studentCode,
            if (versionCode != null) 'versionCode': versionCode,
            'originalUrl': cloudinaryUrl,
            'originalPublicId': publicId,
            if (annotatedUrl != null) 'annotatedUrl': annotatedUrl,
            if (annotatedPublicId != null) 'annotatedPublicId': annotatedPublicId,
          },
        );
        return true;
      } on ForbiddenException {
        rethrow;
      } on AuthException {
        rethrow;
      } catch (e) {
        developer.log('[OMRSubmissionSync] Submit attempt $attempt failed: $e', name: 'OMRScanner');
        if (attempt < _maxRetries) {
          await Future.delayed(_retryDelay * attempt);
        }
      }
    }
    return false;
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
    return submitWithImage(
      examId: examId,
      imageBytes: imageBytes,
      answers: answers,
      score: score,
      maxScore: maxScore,
      classId: classId,
    );
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
    Uint8List? annotatedImageBytes,
  }) async {
    try {
      final Map<String, dynamic> data = {
        'examId': examId,
        'answers': jsonEncode(answers),
        'score': score.toString(),
        'maxScore': maxScore.toString(),
        if (studentId != null) 'studentId': studentId,
        if (classId != null) 'classId': classId,
        if (submissionId != null) 'submissionId': submissionId,
        if (studentCode != null) 'studentCode': studentCode,
        if (versionCode != null) 'versionCode': versionCode,
      };

      // Upload annotated image if provided
      if (annotatedImageBytes != null && annotatedImageBytes.isNotEmpty) {
        try {
          final sig = await _getUploadSignature(examId: examId, type: 'annotated');
          final uploadResult = await _uploadToCloudinary(
            imageBytes: annotatedImageBytes,
            signature: sig,
          );
          data['annotatedUrl'] = uploadResult['secure_url'];
          data['annotatedPublicId'] = uploadResult['public_id'];
        } catch (e) {
          developer.log('[OMRSubmissionSync] Failed to upload annotated image: $e', name: 'OMRScanner');
        }
      }

      await _apiClient.post(
        ApiConstants.submissions,
        data: data,
      );
      return true;
    } catch (e) {
      developer.log('[OMRSubmissionSync] submitResultOnly failed: $e', name: 'OMRScanner');
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
