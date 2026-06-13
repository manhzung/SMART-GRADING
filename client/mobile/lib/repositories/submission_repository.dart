import 'dart:convert';

import 'package:http/http.dart' as http;

class SubmissionRepository {
  final String baseUrl;
  final http.Client httpClient;
  String? _token;

  SubmissionRepository({required this.baseUrl, http.Client? httpClient})
      : httpClient = httpClient ?? http.Client();

  void setAuthToken(String? token) {
    _token = token;
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  Future<Map<String, dynamic>> scan({
    required String examId,
    required String originalUrl,
    required String originalPublicId,
    required Map<String, dynamic> imageMeta,
    required Map<String, dynamic> deviceInfo,
  }) async {
    final body = jsonEncode({
      'examId': examId,
      'originalUrl': originalUrl,
      'originalPublicId': originalPublicId,
      'imageMeta': imageMeta,
      'deviceInfo': deviceInfo,
    });
    final res = await httpClient.post(
      Uri.parse('$baseUrl/api/v1/submissions/scan'),
      headers: _headers,
      body: body,
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Scan failed: HTTP ${res.statusCode} ${res.body}');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}
