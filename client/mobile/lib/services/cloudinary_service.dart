import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:http/http.dart' as http;

import '../models/image_type.dart';
import '../models/upload_result.dart';
import '../models/upload_signature.dart';

class CloudinaryService {
  final String baseUrl;
  final http.Client httpClient;
  final Dio dio;
  String? _authToken;

  CloudinaryService({
    required this.baseUrl,
    http.Client? httpClient,
    Dio? dio,
  })  : httpClient = httpClient ?? http.Client(),
        dio = dio ?? Dio();

  void setAuthToken(String? token) {
    _authToken = token;
  }

  Map<String, String> get _headers => {
        if (_authToken != null) 'Authorization': 'Bearer $_authToken',
      };

  Future<UploadSignature> getUploadSignature({
    required String examId,
    String? submissionId,
    required ImageType type,
  }) async {
    final qs = <String, String>{
      'examId': examId,
      'type': type.wire,
    };
    if (submissionId != null) qs['submissionId'] = submissionId;
    final uri = Uri.parse('$baseUrl/api/v1/upload/signature')
        .replace(queryParameters: qs);
    final res = await httpClient.get(uri, headers: _headers);
    if (res.statusCode != 200) {
      throw CloudinaryException(
        'Failed to get signature: HTTP ${res.statusCode}',
      );
    }
    return UploadSignature.fromJson(
      jsonDecode(res.body) as Map<String, dynamic>,
    );
  }

  Future<UploadResult> uploadImage({
    required File file,
    required UploadSignature signature,
    void Function(double progress)? onProgress,
  }) async {
    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        file.path,
        filename: file.path.split(Platform.pathSeparator).last,
      ),
      'api_key': signature.apiKey,
      'timestamp': signature.timestamp,
      'signature': signature.signature,
      'folder': signature.folder,
      'public_id': signature.publicId,
    });

    final res = await dio.post<dynamic>(
      signature.uploadUrl,
      data: form,
      options: Options(
        headers: {'Content-Type': 'multipart/form-data'},
        responseType: ResponseType.plain,
      ),
      onSendProgress: (sent, total) {
        if (onProgress != null && total > 0) {
          onProgress(sent / total);
        }
      },
    );

    final body = jsonDecode(res.data.toString()) as Map<String, dynamic>;
    if (body['error'] != null) {
      throw CloudinaryException(
        (body['error'] as Map<String, dynamic>)['message']?.toString() ??
            'Upload failed',
      );
    }
    return UploadResult.fromCloudinaryJson(body);
  }

  Future<void> attachImageToSubmission({
    required String submissionId,
    required ImageType type,
    required UploadResult result,
  }) async {
    final uri = Uri.parse(
      '$baseUrl/api/v1/submissions/$submissionId/attach-image',
    );
    final res = await httpClient.post(
      uri,
      headers: {
        ..._headers,
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'type': type.wire,
        'url': result.secureUrl,
        'publicId': result.publicId,
        'width': result.width,
        'height': result.height,
        'bytes': result.bytes,
        'format': result.format,
      }),
    );
    if (res.statusCode != 200) {
      throw CloudinaryException('Failed to attach: HTTP ${res.statusCode}');
    }
  }

  Future<UploadResult> captureAndUpload({
    required String examId,
    required File file,
    String? submissionId,
    void Function(double progress)? onProgress,
  }) async {
    final sig = await getUploadSignature(
      examId: examId,
      submissionId: submissionId,
      type: ImageType.original,
    );
    final result = await uploadImage(
      file: file,
      signature: sig,
      onProgress: onProgress,
    );
    if (submissionId != null) {
      await attachImageToSubmission(
        submissionId: submissionId,
        type: ImageType.original,
        result: result,
      );
    }
    return result;
  }
}

class CloudinaryException implements Exception {
  final String message;
  CloudinaryException(this.message);
  @override
  String toString() => 'CloudinaryException: $message';
}
