import '../config/environment.dart';

class ApiConstants {
  static String get baseUrl => EnvironmentConfig.apiBaseUrl;
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // Endpoints
  static const String auth = '/auth';
  static const String users = '/users';
  static const String schools = '/schools';
  static const String classes = '/classes';
  static const String exams = '/exams';
  static const String questions = '/questions';
  static const String submissions = '/submissions';
  static const String results = '/results';
  static const String appeals = '/appeals';
  static const String omrTemplates = '/omr-templates';
  static const String analytics = '/analytics';
  static const String notifications = '/notifications';
  static const String subjects = '/subjects';
  static const String aiReports = '/ai-reports';
  static const String aiChat = '/ai-chat';
  static const String activities = '/activities';
}

class AppConstants {
  static const String appName = 'Smart Grading';
  static const String appVersion = '1.0.0';

  // Storage Keys
  static const String tokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userKey = 'current_user';

  // Pagination
  static const int defaultPageSize = 20;

  // User Roles
  static const String roleAdmin = 'admin';
  static const String roleTeacher = 'teacher';
  static const String roleStudent = 'student';
  static const String roleParent = 'parent';
}
