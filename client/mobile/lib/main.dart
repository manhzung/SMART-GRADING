import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';

import 'core/network/notification_service.dart';
import 'core/network/subject_service.dart';
import 'core/network/api_client.dart';
import 'core/network/ai_service.dart';
import 'core/network/class_service.dart';
import 'core/network/omr_template_service.dart';
import 'core/network/omr_submission_sync_service.dart';
import 'core/network/user_service.dart';
import 'core/network/appeal_service.dart';
import 'core/network/analytics_service.dart';
import 'core/network/question_service.dart';
import 'core/network/school_service.dart';
import 'core/constants/app_constants.dart';
import 'presentation/pages/splash_page.dart';
import 'presentation/pages/login_page.dart';
import 'presentation/pages/register_page.dart';
import 'presentation/pages/verify_email_page.dart';
import 'presentation/pages/forgot_password_page.dart';
import 'presentation/pages/reset_password_page.dart';
import 'presentation/pages/home_page.dart';
import 'presentation/pages/notification_page.dart';
import 'presentation/pages/create_exam_page.dart';
import 'presentation/pages/edit_exam_page.dart';
import 'presentation/pages/exam_detail_page.dart';
import 'presentation/pages/exam_questions_page.dart';
import 'presentation/pages/submissions_page.dart';
import 'presentation/pages/submission_detail_page.dart';
import 'presentation/pages/analytics_page.dart';
import 'presentation/pages/appeals_page.dart';
import 'presentation/pages/question_bank_page.dart';
import 'presentation/pages/settings_page.dart';
import 'presentation/pages/help_page.dart';
import 'presentation/pages/create_edit_class_page.dart';
import 'presentation/pages/class_detail_page.dart';
import 'presentation/pages/add_students_page.dart';
import 'presentation/pages/student_list_page.dart';
import 'presentation/pages/class_selection_page.dart';
import 'presentation/pages/camera_scanner_page.dart';
import 'presentation/pages/omr_result_page.dart';
import 'presentation/blocs/auth/auth_bloc.dart';
import 'presentation/blocs/exam/exam_bloc.dart';
import 'presentation/blocs/submission/submission_bloc.dart';
import 'presentation/blocs/school/school_bloc.dart';
import 'presentation/blocs/class/class_bloc.dart';
import 'presentation/blocs/omr_scanner/omr_scanner_bloc.dart';
import 'presentation/blocs/admin/admin_bloc.dart';
import 'presentation/pages/email_verification_pending_page.dart';
import 'presentation/pages/my_scores_page.dart';
import 'presentation/pages/my_appeals_page.dart';
import 'presentation/pages/admin/admin_dashboard_page.dart';
import 'presentation/pages/admin/schools_management_page.dart';
import 'presentation/pages/admin/users_management_page.dart';
import 'domain/entities/exam.entity.dart';
import 'domain/entities/user.entity.dart';
import 'domain/omr/models/grading_result.dart';
import 'domain/omr/models/omr_template.dart';
import 'domain/omr/models/omr_response.dart';
import 'domain/omr/engine/omr_engine.dart';

final getIt = GetIt.instance;

void setupDependencies() {
  getIt.registerLazySingleton<ApiClient>(() => ApiClient());
  getIt.registerLazySingleton<OMRTemplateService>(
    () => OMRTemplateService(apiClient: getIt<ApiClient>()),
  );
  getIt.registerLazySingleton<OMRSubmissionSyncService>(
    () => OMRSubmissionSyncService(apiClient: getIt<ApiClient>()),
  );
  getIt.registerLazySingleton<UserService>(
    () => UserService(apiClient: getIt<ApiClient>()),
  );
  getIt.registerLazySingleton<AppealService>(
    () => AppealService(apiClient: getIt<ApiClient>()),
  );
  getIt.registerLazySingleton<AnalyticsService>(
    () => AnalyticsService(apiClient: getIt<ApiClient>()),
  );
  getIt.registerLazySingleton<QuestionService>(
    () => QuestionService(apiClient: getIt<ApiClient>()),
  );
  getIt.registerLazySingleton<NotificationService>(
    () => NotificationService(apiClient: getIt<ApiClient>()),
  );
  getIt.registerLazySingleton<SubjectService>(
    () => SubjectService(apiClient: getIt<ApiClient>()),
  );
  getIt.registerLazySingleton<ClassService>(
    () => ClassService(apiClient: getIt<ApiClient>()),
  );
  getIt.registerLazySingleton<AIService>(
    () => AIService(apiClient: getIt<ApiClient>()),
  );
  getIt.registerLazySingleton<SchoolService>(
    () => SchoolService(apiClient: getIt<ApiClient>()),
  );
}

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  setupDependencies();
  runApp(const SmartGradingApp());
}

class SmartGradingApp extends StatelessWidget {
  const SmartGradingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>(
          create: (_) => AuthBloc(apiClient: getIt<ApiClient>()),
        ),
        BlocProvider<SchoolBloc>(
          create: (_) => SchoolBloc(apiClient: getIt<ApiClient>()),
        ),
        BlocProvider<ExamBloc>(
          create: (_) => ExamBloc(apiClient: getIt<ApiClient>()),
        ),
        BlocProvider<SubmissionBloc>(
          create: (_) => SubmissionBloc(apiClient: getIt<ApiClient>()),
        ),
        BlocProvider<OMRScannerBloc>(
          create: (_) => OMRScannerBloc(),
        ),
        BlocProvider<ClassBloc>(
          create: (_) => ClassBloc(apiClient: getIt<ApiClient>()),
        ),
        BlocProvider<AdminBloc>(
          create: (_) => AdminBloc(apiClient: getIt<ApiClient>()),
        ),
      ],
      child: MaterialApp(
        title: AppConstants.appName,
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF6366F1),
            brightness: Brightness.light,
          ),
          useMaterial3: true,
          fontFamily: 'Roboto',
        ),
        darkTheme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF6366F1),
            brightness: Brightness.dark,
          ),
          useMaterial3: true,
          fontFamily: 'Roboto',
        ),
        initialRoute: '/',
        routes: {
          '/': (context) => const SplashPage(),
          '/login': (context) => const LoginPage(),
          '/register': (context) => const RegisterPage(),
          '/verify-email': (context) => const VerifyEmailPage(),
          '/forgot-password': (context) => const ForgotPasswordPage(),
          '/reset-password': (context) => const ResetPasswordPage(),
          '/home': (context) => const HomePage(),
          '/notifications': (context) => const NotificationPage(),
          '/create-exam': (context) => const CreateExamPage(),
          '/edit-exam': (context) {
            final args = ModalRoute.of(context)?.settings.arguments;
            final exam = args is Exam ? args : null;
            return EditExamPage(exam: exam ?? Exam(
              id: '',
              title: '',
              status: 'draft',
              createdAt: DateTime.now(),
            ));
          },
          '/exam-detail': (context) {
            final args = ModalRoute.of(context)?.settings.arguments;
            final exam = args is Exam ? args : null;
            return ExamDetailPage(exam: exam ?? Exam(
              id: '',
              title: '',
              status: 'draft',
              createdAt: DateTime.now(),
            ));
          },
          '/exam-questions': (context) {
            final args = ModalRoute.of(context)?.settings.arguments;
            final exam = args is Exam ? args : null;
            return ExamQuestionsPage(exam: exam ?? Exam(
              id: '',
              title: '',
              status: 'draft',
              createdAt: DateTime.now(),
            ));
          },
          '/submissions': (context) => const SubmissionsPage(),
          '/submission-detail': (context) {
            final args = ModalRoute.of(context)?.settings.arguments;
            final submission = args is Submission ? args : null;
            return SubmissionDetailPage(submission: submission ?? Submission(
              id: '',
              examId: '',
              studentId: '',
              status: '',
            ));
          },
          '/analytics': (context) => const AnalyticsPage(),
          '/appeals': (context) => const AppealsPage(),
          '/question-bank': (context) => const QuestionBankPage(),
          '/settings': (context) => const SettingsPage(),
          '/help': (context) => const HelpPage(),
          '/class-create': (context) => const CreateEditClassPage(),
          '/class-detail': (context) {
            final args = ModalRoute.of(context)?.settings.arguments;
            final cls = args is Class ? args : null;
            return ClassDetailPage(cls: cls ?? Class(
              id: '',
              name: '',
              code: '',
              createdAt: DateTime.now(),
            ));
          },
          '/class-edit': (context) {
            final args = ModalRoute.of(context)?.settings.arguments;
            final cls = args is Class ? args : null;
            return CreateEditClassPage(cls: cls);
          },
          '/class-add-students': (context) {
            final args = ModalRoute.of(context)?.settings.arguments;
            final cls = args is Class ? args : null;
            return AddStudentsPage(cls: cls ?? Class(
              id: '',
              name: '',
              code: '',
              createdAt: DateTime.now(),
            ));
          },
          '/class-students': (context) {
            final args = ModalRoute.of(context)?.settings.arguments;
            final exam = args is Exam ? args : null;
            if (exam == null) {
              return const Scaffold(body: Center(child: Text('Missing exam')));
            }
            final classId = args is Map ? (args['classId'] as String? ?? '') : '';
            final className = args is Map ? (args['className'] as String? ?? exam.title) : exam.title;
            if (classId.isEmpty) {
              return ClassSelectionPage(exam: exam);
            }
            return StudentListPage(
              exam: exam,
              classId: classId,
              className: className,
            );
          },
          '/scan': (context) {
            final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
            return CameraScannerPage(
              examId: args?['examId'] as String?,
              examName: args?['examName'] as String?,
              classId: args?['classId'] as String?,
              className: args?['className'] as String?,
              studentId: args?['studentId'] as String?,
            );
          },
          '/scan-result': (context) {
            final args = ModalRoute.of(context)?.settings.arguments;
            if (args is OMRGradingResult) {
              return OMRResultPage(
                imageBytes: Uint8List(0),
                gradingResult: args,
                processingResult: OMRProcessingResult(
                  template: OMRTemplate.simpleMcq(
                    numQuestions: 20,
                    numOptions: 4,
                    bubbleWidth: 35,
                    bubbleHeight: 35,
                  ),
                  gradingResult: OMRGradingResult.empty(),
                  response: OMRResponseDebug(
                    answers: const {},
                    bubbleIntensities: const {},
                    globalThreshold: 0,
                    localThresholds: const {},
                  ),
                  processingTime: Duration.zero,
                  processingSteps: const [],
                ),
              );
            }
            return OMRResultPage(
              imageBytes: Uint8List(0),
              gradingResult: OMRGradingResult.empty(),
              processingResult: OMRProcessingResult(
                template: OMRTemplate.simpleMcq(
                  numQuestions: 20,
                  numOptions: 4,
                  bubbleWidth: 35,
                  bubbleHeight: 35,
                ),
                gradingResult: OMRGradingResult.empty(),
                response: OMRResponseDebug(
                  answers: const {},
                  bubbleIntensities: const {},
                  globalThreshold: 0,
                  localThresholds: const {},
                ),
                processingTime: Duration.zero,
                processingSteps: const [],
              ),
            );
          },
          '/admin': (context) => const AdminDashboardPage(),
          '/admin/schools': (context) => const SchoolsManagementPage(),
          '/admin/users': (context) => const UsersManagementPage(),
          '/my-scores': (context) => const MyScoresPage(),
          '/my-appeals': (context) => const MyAppealsPage(),
          '/email-verification-pending': (context) {
            final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
            return EmailVerificationPendingPage(email: args?['email'] ?? '');
          },
        },
      ),
    );
  }
}
