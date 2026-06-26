import 'dart:typed_data';
import 'dart:developer' as developer;
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_grading_mobile/domain/omr/models/models.dart';
import 'package:smart_grading_mobile/domain/omr/engine_v2/omr_engine_service.dart';
import 'package:smart_grading_mobile/domain/omr/engine_v2/omr_models.dart';
import 'package:smart_grading_mobile/domain/omr/engine_v2/omr_template.dart';
import 'package:smart_grading_mobile/domain/omr/engine_v2/scoring_engine.dart';
import 'package:smart_grading_mobile/domain/entities/user.entity.dart';
import 'package:smart_grading_mobile/core/network/omr_submission_sync_service.dart';
import 'package:smart_grading_mobile/core/network/omr_template_service.dart';
import 'package:smart_grading_mobile/core/network/class_service.dart';
import 'package:smart_grading_mobile/core/storage/omr_local_storage.dart';
import 'package:get_it/get_it.dart';

part 'omr_scanner_event.dart';
part 'omr_scanner_state.dart';

class OMRScannerBloc extends Bloc<OMRScannerEvent, OMRScannerState> {
  final Connectivity _connectivity;
  OMRLocalStorage? _localStorage;
  List<ClassStudent>? _cachedClassStudents;

  OMRScannerBloc({Connectivity? connectivity})
      : _connectivity = connectivity ?? Connectivity(),
        super(OMRScannerInitial()) {
    on<OMRScannerTemplateSet>(_onTemplateSet);
    on<OMRScannerLoadFromServer>(_onLoadFromServer);
    on<OMRScannerLoadClassStudents>(_onLoadClassStudents);
    on<OMRScannerImageCaptured>(_onImageCaptured);
    on<OMRScannerProcessStarted>(_onProcessStarted);
    on<OMRScannerReset>(_onReset);
    on<OMRScannerImagePicked>(_onImagePicked);
    on<OMRScannerSubmit>(_onSubmit);
    on<OMRScannerConfirmStudent>(_onConfirmStudent);
  }

  Future<void> _onTemplateSet(
    OMRScannerTemplateSet event,
    Emitter<OMRScannerState> emit,
  ) async {
    emit(OMRScannerTemplateReady(
      templateJson: event.templateJson,
      examId: event.examId,
      examName: event.examName,
      classId: event.classId,
      className: event.className,
    ));
    
    if (event.classId != null) {
      add(OMRScannerLoadClassStudents(event.classId!));
    }
  }

  Future<void> _onLoadClassStudents(
    OMRScannerLoadClassStudents event,
    Emitter<OMRScannerState> emit,
  ) async {
    try {
      final classService = GetIt.instance<ClassService>();
      _cachedClassStudents = await classService.getStudentsByClass(event.classId);
    } catch (e) {
      developer.log('Failed to load class students: $e', name: 'OMRScanner');
    }
  }

  Future<void> _onLoadFromServer(
    OMRScannerLoadFromServer event,
    Emitter<OMRScannerState> emit,
  ) async {
    emit(OMRScannerLoadingTemplate());
    try {
      final templateService = GetIt.instance<OMRTemplateService>();
      final templateJson = await templateService.getTemplateJsonForExam(event.examId);
      
      emit(OMRScannerTemplateReady(
        templateJson: templateJson,
        examId: event.examId,
        examName: event.examName,
      ));
    } catch (e) {
      emit(OMRScannerError(message: 'Failed to load template: $e'));
    }
  }

  Future<void> _onImageCaptured(
    OMRScannerImageCaptured event,
    Emitter<OMRScannerState> emit,
  ) async {
    final current = state;
    final hasTemplate = current is OMRScannerTemplateReady;
    
    if (hasTemplate) {
      final templateState = current;
      
      // Emit processing state directly with template info
      emit(OMRScannerProcessing(
        imageBytes: event.imageBytes,
        steps: const ['Starting OMR processing with Engine v2...'],
      ));
      
      // Process directly since we have the template
      await _processWithTemplate(
        imageBytes: event.imageBytes,
        templateJson: templateState.templateJson,
        examId: templateState.examId,
        examName: templateState.examName,
        classId: templateState.classId,
        className: templateState.className,
        emit: emit,
      );
    } else {
      emit(OMRScannerImageReady(imageBytes: event.imageBytes));
      developer.log(
        '[OMRScanner] ERROR: Template not ready. State: ${current.runtimeType}',
        name: 'OMRScanner',
        error: 'Template not ready',
      );
    }
  }
  
  Future<void> _processWithTemplate({
    required Uint8List imageBytes,
    required Map<String, dynamic> templateJson,
    String? examId,
    String? examName,
    String? classId,
    String? className,
    required Emitter<OMRScannerState> emit,
  }) async {
    try {
      final omrEngineService = OmrEngineService();
      final result = await omrEngineService.scanAndGrade(
        imageBytes: imageBytes.toList(),
        templateJson: templateJson,
      );

      final convertedGradingResult = _convertToOldGradingResult(result.gradingResult);
      final processingResult = OMRProcessingResult(
        template: OMRTemplate.fromJson(templateJson),
        gradingResult: convertedGradingResult,
        response: OMRResponseDebug(
          answers: Map.fromEntries(
            result.gradingResult.questionScores.map((q) => MapEntry('q${q.position}', q.detectedAnswer ?? '')),
          ),
          globalThreshold: 0.5,
          bubbleIntensities: {},
          localThresholds: {},
        ),
        processingTime: result.scanResult.processingTime,
        processingSteps: result.scanResult.processingSteps,
        wasWarped: result.scanResult.wasWarped,
        annotatedImageBytes: result.annotatedBytes ?? result.croppedBytes ?? imageBytes,
        croppedImageBytes: result.croppedBytes,
      );

      // Try to find student by studentCode
      ClassStudent? matchedStudent;
      if (result.scanResult.studentId.isNotEmpty && _cachedClassStudents != null) {
        matchedStudent = _findStudentByCode(result.scanResult.studentId);
      }

      emit(OMRScannerSuccess(
        imageBytes: imageBytes,
        processingResult: processingResult,
        gradingResult: convertedGradingResult,
        questionScores: result.gradingResult.questionScores,
        studentCode: result.scanResult.studentId,
        versionCode: result.scanResult.versionCode,
        matchedStudent: matchedStudent,
      ));
    } catch (e) {
      emit(OMRScannerError(message: 'Processing failed: $e'));
    }
  }

  Future<void> _onImagePicked(
    OMRScannerImagePicked event,
    Emitter<OMRScannerState> emit,
  ) async {
    final current = state;
    final hasTemplate = current is OMRScannerTemplateReady;
    
    if (hasTemplate) {
      final templateState = current;
      
      emit(OMRScannerProcessing(
        imageBytes: event.imageBytes,
        steps: const ['Starting OMR processing with Engine v2...'],
      ));
      
      await _processWithTemplate(
        imageBytes: event.imageBytes,
        templateJson: templateState.templateJson,
        examId: templateState.examId,
        examName: templateState.examName,
        classId: templateState.classId,
        className: templateState.className,
        emit: emit,
      );
    } else {
      emit(OMRScannerImageReady(imageBytes: event.imageBytes));
      developer.log(
        '[OMRScanner] ERROR: Template not ready. State: ${current.runtimeType}',
        name: 'OMRScanner',
        error: 'Template not ready',
      );
    }
  }

  Future<void> _onProcessStarted(
    OMRScannerProcessStarted event,
    Emitter<OMRScannerState> emit,
  ) async {
    // Get template from the state - state should be OMRScannerTemplateReady
    final current = state;
    if (current is! OMRScannerTemplateReady) {
      developer.log(
        '[OMRScanner] ERROR: No template. State: ${current.runtimeType}',
        name: 'OMRScanner',
      );
      emit(OMRScannerError(
        message: 'No template loaded. Current state: ${current.runtimeType}',
      ));
      return;
    }

    emit(OMRScannerProcessing(
      imageBytes: event.imageBytes,
      steps: const ['Starting OMR processing with Engine v2...'],
    ));

    await _processWithTemplate(
      imageBytes: event.imageBytes,
      templateJson: current.templateJson,
      examId: current.examId,
      examName: current.examName,
      classId: current.classId,
      className: current.className,
      emit: emit,
    );
  }

  ClassStudent? _findStudentByCode(String studentCode) {
    if (_cachedClassStudents == null) return null;
    
    final normalizedCode = studentCode.trim().toLowerCase();
    for (final student in _cachedClassStudents!) {
      if (student.studentCode?.trim().toLowerCase() == normalizedCode) {
        return student;
      }
    }
    return null;
  }

  OMRGradingResult _convertToOldGradingResult(OmrGradingResult newResult) {
    final verdicts = newResult.questionScores.map((q) {
      String verdictStr;
      if (q.isUnmarked) {
        verdictStr = 'unmarked';
      } else if (q.isCorrect) {
        verdictStr = 'correct';
      } else {
        verdictStr = 'incorrect';
      }
      return QuestionVerdict(
        question: 'q${q.position}',
        markedAnswer: q.detectedAnswer ?? '',
        correctAnswer: q.correctAnswer ?? '',
        verdict: verdictStr,
        delta: q.score,
        cumulativeScore: q.score,
      );
    }).toList();

    return OMRGradingResult(
      score: newResult.totalScore,
      maxScore: newResult.maxScore,
      verdicts: verdicts,
    );
  }

  Future<void> _onConfirmStudent(
    OMRScannerConfirmStudent event,
    Emitter<OMRScannerState> emit,
  ) async {
    final current = state;
    if (current is! OMRScannerSuccess) return;

    emit(OMRScannerStudentConfirmed(
      imageBytes: current.imageBytes,
      gradingResult: current.gradingResult,
      student: event.student,
    ));

    // Auto-submit after confirming student
    add(OMRScannerSubmit());
  }

  Future<void> _onSubmit(
    OMRScannerSubmit event,
    Emitter<OMRScannerState> emit,
  ) async {
    final current = state;
    if (current is! OMRScannerSuccess && current is! OMRScannerStudentConfirmed) return;

    // Get student info from either state
    ClassStudent? confirmedStudent;
    Uint8List imageBytes;
    OMRGradingResult gradingResult;
    String? studentCode;
    String? versionCode;

    if (current is OMRScannerStudentConfirmed) {
      confirmedStudent = current.student;
      imageBytes = current.imageBytes;
      gradingResult = current.gradingResult;
    } else {
      final successState = current as OMRScannerSuccess;
      confirmedStudent = successState.matchedStudent;
      imageBytes = successState.imageBytes;
      gradingResult = successState.gradingResult;
      studentCode = successState.studentCode;
      versionCode = successState.versionCode;
    }

    emit(OMRScannerSubmitting(
      imageBytes: imageBytes,
      gradingResult: gradingResult,
    ));

    final answers = Map<String, String>.fromEntries(
      gradingResult.verdicts
          .map((v) => MapEntry(v.question, v.markedAnswer)),
    );

    String? examId;
    String? classId;
    final templateState = state;
    if (templateState is OMRScannerTemplateReady) {
      examId = templateState.examId;
      classId = templateState.classId;
    }

    // Check connectivity
    final connectivityResult = await _connectivity.checkConnectivity();
    final isOnline = connectivityResult.isNotEmpty &&
        !connectivityResult.contains(ConnectivityResult.none);

    if (isOnline) {
      try {
        final syncService = GetIt.instance<OMRSubmissionSyncService>();
        final success = await syncService.submitResultOnly(
          examId: examId ?? 'unknown',
          classId: classId,
          answers: answers,
          score: gradingResult.score,
          maxScore: gradingResult.maxScore,
          studentId: confirmedStudent?.id,
          studentCode: confirmedStudent?.studentCode ?? studentCode,
          versionCode: versionCode,
        );

        if (success) {
          emit(OMRScannerSubmitted(
            gradingResult: gradingResult,
            submittedOnline: true,
            student: confirmedStudent,
          ));
          return;
        }
      } catch (_) {
        // Fall through to offline
      }
    }

    // Offline: save to local storage
    try {
      final storage = await _getLocalStorage();
      await storage.addPendingSubmission(
        PendingSubmission(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          examId: examId ?? 'unknown',
          classId: classId,
          imageBytes: imageBytes,
          answers: answers,
          score: gradingResult.score,
          maxScore: gradingResult.maxScore,
          timestamp: DateTime.now(),
          studentCode: confirmedStudent?.studentCode ?? studentCode,
          versionCode: versionCode,
        ),
      );
      emit(OMRScannerSubmitted(
        gradingResult: gradingResult,
        submittedOnline: false,
        student: confirmedStudent,
      ));
    } catch (e) {
      emit(OMRScannerError(message: 'Failed to submit: $e'));
    }
  }

  void _onReset(OMRScannerReset event, Emitter<OMRScannerState> emit) {
    emit(OMRScannerInitial());
  }

  Future<OMRLocalStorage> _getLocalStorage() async {
    _localStorage ??= OMRLocalStorage(prefs: await SharedPreferences.getInstance());
    return _localStorage!;
  }
}
