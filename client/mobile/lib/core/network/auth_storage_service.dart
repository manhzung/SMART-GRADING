import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../constants/app_constants.dart';

class AuthStorageService {
  AuthStorageService({FlutterSecureStorage? secureStorage})
      : _secureStorage = secureStorage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _secureStorage;

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _secureStorage.write(key: AppConstants.tokenKey, value: accessToken),
      _secureStorage.write(key: AppConstants.refreshTokenKey, value: refreshToken),
    ]);
  }

  Future<void> saveUser(Map<String, dynamic> userJson) async {
    await _secureStorage.write(
      key: AppConstants.userKey,
      value: jsonEncode(userJson),
    );
  }

  Future<String?> getAccessToken() {
    return _secureStorage.read(key: AppConstants.tokenKey);
  }

  Future<String?> getRefreshToken() {
    return _secureStorage.read(key: AppConstants.refreshTokenKey);
  }

  Future<Map<String, dynamic>?> getUser() async {
    final raw = await _secureStorage.read(key: AppConstants.userKey);
    if (raw == null || raw.isEmpty) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<void> clearTokens() async {
    await Future.wait([
      _secureStorage.delete(key: AppConstants.tokenKey),
      _secureStorage.delete(key: AppConstants.refreshTokenKey),
      _secureStorage.delete(key: AppConstants.userKey),
    ]);
  }
}
