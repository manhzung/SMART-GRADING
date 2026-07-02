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
import 'package:smart_grading_mobile/core/network/exam_service.dart';
import 'package:smart_grading_mobile/core/storage/omr_local_storage.dart';
import 'package:get_it/get_it.dart';

part 'omr_scanner_event.dart';
part 'omr_scanner_state.dart';

class OMRScannerBloc extends Bloc<OMRScannerEvent, OMRScannerState> {
  final Connectivity _connectivity;
  OMRLocalStorage? _localStorage;
  List<ClassStudent>? _cachedClassStudents;

  /// Cached template data — persists across scans so we never reload between shots
  Map<String, dynamic>? _cachedTemplateJson;
  String? _cachedExamId;
  String? _cachedExamName;
  String? _cachedClassId;
  String? _cachedClassName;

  /// Cached answer keys keyed by versionCode — avoids re-fetching from server each scan
  final Map<String, Map<String, String>> _cachedAnswerKeys = {};

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
    // Cache template data for reuse across multiple scans
    _cachedTemplateJson = event.templateJson;
    _cachedExamId = event.examId;
    _cachedExamName = event.examName;
    _cachedClassId = event.classId;
    _cachedClassName = event.className;

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
      developer.log('═══ CLASS STUDENTS LOADED ═══', name: 'OMRScanner');
      developer.log('[ClassStudents] Total students: ${_cachedClassStudents?.length ?? 0}', name: 'OMRScanner');
      for (final student in _cachedClassStudents ?? []) {
        developer.log('[ClassStudents] name="${student.name}", studentCode="${student.studentCode}"', name: 'OMRScanner');
      }
      developer.log('═══════════════════════════════════', name: 'OMRScanner');
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
        classId: event.classId,
      ));
    } catch (e) {
      emit(OMRScannerError(message: 'Failed to load template: $e'));
    }
  }

  Future<void> _onImageCaptured(
    OMRScannerImageCaptured event,
    Emitter<OMRScannerState> emit,
  ) async {
    // Use cached template (survives across scans even when state changes)
    if (_cachedTemplateJson != null) {
      emit(OMRScannerProcessing(
        imageBytes: event.imageBytes,
        steps: const ['Starting OMR processing with Engine v2...'],
      ));

      await _processWithTemplate(
        imageBytes: event.imageBytes,
        templateJson: _cachedTemplateJson!,
        examId: _cachedExamId,
        examName: _cachedExamName,
        classId: _cachedClassId,
        className: _cachedClassName,
        emit: emit,
      );
    } else {
      emit(OMRScannerImageReady(imageBytes: event.imageBytes));
      developer.log(
        '[OMRScanner] ERROR: Template not cached. State: ${state.runtimeType}',
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
      // ═══ STEP 1: Initial scan (no answerKey) to detect versionCode ═══
      developer.log('╔═══ STEP 1: Initial scan to detect versionCode ═══', name: 'OMRScanner');
      emit(OMRScannerProcessing(
        imageBytes: imageBytes,
        steps: const ['[1/3] Scanning to detect version code...'],
      ));

      final omrEngineService = OmrEngineService();

      // First scan WITHOUT answerKey (to get versionCode)
      developer.log('[STEP1] Scanning image without answerKey...', name: 'OMRScanner');
      final initialResult = await omrEngineService.scanAndGrade(
        imageBytes: imageBytes.toList(),
        templateJson: templateJson,
      );

      final versionCode = initialResult.scanResult.versionCode;
      developer.log('[STEP1] Initial scan complete. Detected:', name: 'OMRScanner');
      developer.log('  - studentCode (SBD): ${initialResult.scanResult.studentId}', name: 'OMRScanner');
      developer.log('  - versionCode (MADE): $versionCode', name: 'OMRScanner');
      developer.log('  - answers: ${initialResult.scanResult.answers}', name: 'OMRScanner');

      // ═══ STEP 2: Get answerKey (from cache or server) ═══
      Map<String, String>? serverAnswerKey;
      if (examId != null && versionCode != null && versionCode.isNotEmpty) {
        final cacheKey = '$examId:$versionCode';

        if (_cachedAnswerKeys.containsKey(cacheKey)) {
          // Use cached answer key — instant, no network call needed
          serverAnswerKey = _cachedAnswerKeys[cacheKey];
          developer.log('[STEP2] Using cached answerKey for $cacheKey (${serverAnswerKey?.length} entries)', name: 'OMRScanner');
        } else {
          developer.log('╔═══ STEP 2: Fetching answerKey from server ═══', name: 'OMRScanner');
          emit(OMRScannerProcessing(
            imageBytes: imageBytes,
            steps: const ['[2/3] Fetching answer key from server...'],
          ));

          try {
            final examService = GetIt.instance<ExamService>();
            developer.log('[STEP2] Calling API: examId=$examId, versionCode=$versionCode', name: 'OMRScanner');

            final answerKeyResponse = await examService.getVersionAnswerKey(examId, versionCode);
            serverAnswerKey = answerKeyResponse.answerKey;

            // Store in cache so next scan for same version is instant
            _cachedAnswerKeys[cacheKey] = answerKeyResponse.answerKey;

            developer.log('[STEP2] Received answerKeyResponse:', name: 'OMRScanner');
            developer.log('  - versionCode: ${answerKeyResponse.versionCode}', name: 'OMRScanner');
            developer.log('  - numberOfQuestions: ${answerKeyResponse.numberOfQuestions}', name: 'OMRScanner');
            developer.log('  - answerKey entries: ${answerKeyResponse.answerKey.length}', name: 'OMRScanner');
            developer.log('  - answerKey full: ${answerKeyResponse.answerKey}', name: 'OMRScanner');
            developer.log('[STEP2] Cached answerKey for $cacheKey', name: 'OMRScanner');

            if (serverAnswerKey.isEmpty) {
              developer.log('[STEP2] WARNING: answerKey is empty!', name: 'OMRScanner');
            }
          } catch (e) {
            developer.log('[STEP2] ERROR: Failed to fetch answerKey: $e', name: 'OMRScanner', error: e);
            // Continue without server answerKey
          }
        }
      } else {
        developer.log('[STEP2] SKIP: examId=$examId, versionCode=$versionCode', name: 'OMRScanner');
      }

      // ═══ STEP 3: Final scan with answerKey (or retry with server answerKey) ═══
      developer.log('╔═══ STEP 3: Final scan with answerKey ═══', name: 'OMRScanner');
      emit(OMRScannerProcessing(
        imageBytes: imageBytes,
        steps: const ['[3/3] Grading with answer key...'],
      ));

      final finalResult = await omrEngineService.scanAndGrade(
        imageBytes: imageBytes.toList(),
        templateJson: templateJson,
        serverAnswerKey: serverAnswerKey,
      );

      developer.log('[STEP3] Final scan complete. Score: ${finalResult.gradingResult.totalScore}', name: 'OMRScanner');
      developer.log('╚═══ All steps complete ═══', name: 'OMRScanner');

      // Convert to old format
      final convertedGradingResult = _convertToOldGradingResult(finalResult.gradingResult);
      final processingResult = OMRProcessingResult(
        template: OMRTemplate.fromJson(templateJson),
        gradingResult: convertedGradingResult,
        response: OMRResponseDebug(
          answers: Map.fromEntries(
            finalResult.gradingResult.questionScores.map((q) => MapEntry('q${q.position}', q.detectedAnswer ?? '')),
          ),
          globalThreshold: 0.5,
          bubbleIntensities: {},
          localThresholds: {},
        ),
        processingTime: finalResult.scanResult.processingTime,
        processingSteps: finalResult.scanResult.processingSteps,
        wasWarped: finalResult.scanResult.wasWarped,
        annotatedImageBytes: finalResult.annotatedBytes ?? finalResult.croppedBytes ?? imageBytes,
        croppedImageBytes: finalResult.croppedBytes,
      );

      // Try to find student by studentCode
      ClassStudent? matchedStudent;
      if (finalResult.scanResult.studentId.isNotEmpty && _cachedClassStudents != null) {
        matchedStudent = _findStudentByCode(finalResult.scanResult.studentId);
      }

      // Get examId/classId from template state (may override parameter)
      String finalExamId = examId ?? '';
      String finalClassId = classId ?? '';
      developer.log('[DEBUG] _processWithTemplate params - examId: $examId, classId: $classId', name: 'OMRScanner');

      emit(OMRScannerSuccess(
        imageBytes: imageBytes,
        processingResult: processingResult,
        gradingResult: convertedGradingResult,
        questionScores: finalResult.gradingResult.questionScores,
        studentCode: finalResult.scanResult.studentId,
        versionCode: finalResult.scanResult.versionCode,
        matchedStudent: matchedStudent,
        examId: finalExamId.isEmpty ? null : finalExamId,
        classId: finalClassId.isEmpty ? null : finalClassId,
      ));
    } catch (e) {
      developer.log('[ERROR] Processing failed: $e', name: 'OMRScanner', error: e);
      emit(OMRScannerError(message: 'Processing failed: $e'));
    }
  }

  Future<void> _onImagePicked(
    OMRScannerImagePicked event,
    Emitter<OMRScannerState> emit,
  ) async {
    // Use cached template (survives across scans even when state changes)
    if (_cachedTemplateJson != null) {
      emit(OMRScannerProcessing(
        imageBytes: event.imageBytes,
        steps: const ['Starting OMR processing with Engine v2...'],
      ));

      await _processWithTemplate(
        imageBytes: event.imageBytes,
        templateJson: _cachedTemplateJson!,
        examId: _cachedExamId,
        examName: _cachedExamName,
        classId: _cachedClassId,
        className: _cachedClassName,
        emit: emit,
      );
    } else {
      emit(OMRScannerImageReady(imageBytes: event.imageBytes));
      developer.log(
        '[OMRScanner] ERROR: Template not cached. State: ${state.runtimeType}',
        name: 'OMRScanner',
        error: 'Template not ready',
      );
    }
  }

  Future<void> _onProcessStarted(
    OMRScannerProcessStarted event,
    Emitter<OMRScannerState> emit,
  ) async {
    // Use cached template — available regardless of current state
    if (_cachedTemplateJson == null) {
      developer.log(
        '[OMRScanner] ERROR: No cached template. State: ${state.runtimeType}',
        name: 'OMRScanner',
      );
      emit(OMRScannerError(
        message: 'No template loaded. Please restart the scanner.',
      ));
      return;
    }

    emit(OMRScannerProcessing(
      imageBytes: event.imageBytes,
      steps: const ['Starting OMR processing with Engine v2...'],
    ));

    await _processWithTemplate(
      imageBytes: event.imageBytes,
      templateJson: _cachedTemplateJson!,
      examId: _cachedExamId,
      examName: _cachedExamName,
      classId: _cachedClassId,
      className: _cachedClassName,
      emit: emit,
    );
  }

  ClassStudent? _findStudentByCode(String studentCode) {
    if (_cachedClassStudents == null) return null;
    
    final normalizedCode = studentCode.trim().toLowerCase();
    developer.log('═══ FINDING STUDENT ═══', name: 'OMRScanner');
    developer.log('[FindStudent] Looking for studentCode="$normalizedCode"', name: 'OMRScanner');
    developer.log('[FindStudent] Total students to check: ${_cachedClassStudents!.length}', name: 'OMRScanner');
    
    for (final student in _cachedClassStudents!) {
      final dbCode = student.studentCode?.trim().toLowerCase() ?? '';
      final isMatch = dbCode == normalizedCode;
      developer.log('[FindStudent] Checking: name="${student.name}", studentCode="$dbCode", isMatch=$isMatch', name: 'OMRScanner');
      if (isMatch) {
        developer.log('[FindStudent] ✓ FOUND: name="${student.name}", studentCode="${student.studentCode}"', name: 'OMRScanner');
        developer.log('═══════════════════════════════════', name: 'OMRScanner');
        return student;
      }
    }
    
    developer.log('[FindStudent] ✗ NOT FOUND for code="$normalizedCode"', name: 'OMRScanner');
    developer.log('═══════════════════════════════════', name: 'OMRScanner');
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
      examId: current.examId,
      classId: current.classId,
    ));
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

    // Get examId/classId from the pre-submitting state (OMRScannerSuccess or OMRScannerStudentConfirmed)
    String? examId;
    String? classId;
    if (current is OMRScannerSuccess) {
      examId = current.examId;
      classId = current.classId;
    } else if (current is OMRScannerStudentConfirmed) {
      examId = current.examId;
      classId = current.classId;
    }

    developer.log('[OMRScanner] Submit: examId=$examId, classId=$classId', name: 'OMRScanner');

    // Check if examId is valid (24 hex chars for MongoDB ObjectId)
    final bool hasValidExamId = examId != null && 
        RegExp(r'^[0-9a-fA-F]{24}$').hasMatch(examId!);

    // Check connectivity
    final connectivityResult = await _connectivity.checkConnectivity();
    final isOnline = connectivityResult.isNotEmpty &&
        !connectivityResult.contains(ConnectivityResult.none);

    if (isOnline && hasValidExamId) {
      try {
        final syncService = GetIt.instance<OMRSubmissionSyncService>();
        
        // Get annotated image bytes from processing result
        Uint8List? annotatedBytes;
        if (current is OMRScannerSuccess) {
          annotatedBytes = current.processingResult?.annotatedImageBytes;
          developer.log('[OMRScanner] Annotated bytes: ${annotatedBytes?.length ?? 0} bytes', name: 'OMRScanner');
        }
        
        final success = await syncService.submitWithImage(
          examId: examId!,
          classId: classId,
          imageBytes: imageBytes,
          answers: answers,
          score: gradingResult.score,
          maxScore: gradingResult.maxScore,
          studentId: confirmedStudent?.id,
          studentCode: confirmedStudent?.studentCode ?? studentCode,
          versionCode: versionCode,
          annotatedImageBytes: annotatedBytes,
        );

        if (success) {
          developer.log('[OMRScanner] ✓ Submitted with image for student: ${confirmedStudent?.name ?? studentCode}', name: 'OMRScanner');
          emit(OMRScannerSubmitted(
            gradingResult: gradingResult,
            submittedOnline: true,
            student: confirmedStudent,
          ));
          return;
        }
      } catch (e) {
        developer.log('[OMRScanner] Submit with image failed, trying offline: $e', name: 'OMRScanner');
        // Fall through to offline
      }
    } else if (isOnline) {
      // No valid examId - submit results only without image
      developer.log('[OMRScanner] No valid examId, submitting results only', name: 'OMRScanner');
      try {
        final syncService = GetIt.instance<OMRSubmissionSyncService>();
        
        // Get annotated image bytes from processing result
        Uint8List? annotatedBytes;
        if (current is OMRScannerSuccess) {
          annotatedBytes = current.processingResult?.annotatedImageBytes;
        }
        
        final success = await syncService.submitResultOnly(
          examId: examId ?? 'unknown',
          answers: answers,
          score: gradingResult.score,
          maxScore: gradingResult.maxScore,
          studentId: confirmedStudent?.id,
          classId: classId,
          studentCode: confirmedStudent?.studentCode ?? studentCode,
          versionCode: versionCode,
          annotatedImageBytes: annotatedBytes,
        );

        if (success) {
          developer.log('[OMRScanner] ✓ Submitted results only for student: ${confirmedStudent?.name ?? studentCode}', name: 'OMRScanner');
          emit(OMRScannerSubmitted(
            gradingResult: gradingResult,
            submittedOnline: true,
            student: confirmedStudent,
          ));
          return;
        }
      } catch (e) {
        developer.log('[OMRScanner] Submit results only failed: $e', name: 'OMRScanner');
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
    // If we have a cached template, restore to TemplateReady so next scan
    // is instant without needing to reload the template
    if (_cachedTemplateJson != null) {
      emit(OMRScannerTemplateReady(
        templateJson: _cachedTemplateJson!,
        examId: _cachedExamId,
        examName: _cachedExamName,
        classId: _cachedClassId,
        className: _cachedClassName,
      ));
    } else {
      emit(OMRScannerInitial());
    }
  }

  Future<OMRLocalStorage> _getLocalStorage() async {
    _localStorage ??= OMRLocalStorage(prefs: await SharedPreferences.getInstance());
    return _localStorage!;
  }
}
