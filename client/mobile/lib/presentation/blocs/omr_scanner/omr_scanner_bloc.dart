import 'dart:typed_data';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_grading_mobile/domain/omr/engine/omr_engine.dart';
import 'package:smart_grading_mobile/domain/omr/engine_v2/omr_engine_service.dart';
import 'package:smart_grading_mobile/domain/omr/engine_v2/omr_models.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/domain/omr/models/evaluation_config.dart';
import 'package:smart_grading_mobile/domain/omr/models/grading_result.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_response.dart';
import 'package:smart_grading_mobile/core/network/omr_submission_sync_service.dart';
import 'package:smart_grading_mobile/core/network/omr_template_service.dart';
import 'package:smart_grading_mobile/core/storage/omr_local_storage.dart';
import 'package:get_it/get_it.dart';

part 'omr_scanner_event.dart';
part 'omr_scanner_state.dart';

class OMRScannerBloc extends Bloc<OMRScannerEvent, OMRScannerState> {
  final OMREngine _engine;
  final Connectivity _connectivity;
  OMRLocalStorage? _localStorage;

  OMRScannerBloc({OMREngine? engine, Connectivity? connectivity})
      : _engine = engine ?? OMREngine(),
        _connectivity = connectivity ?? Connectivity(),
        super(OMRScannerInitial()) {
    on<OMRScannerTemplateSet>(_onTemplateSet);
    on<OMRScannerLoadFromServer>(_onLoadFromServer);
    on<OMRScannerImageCaptured>(_onImageCaptured);
    on<OMRScannerProcessStarted>(_onProcessStarted);
    on<OMRScannerProcessWithNewEngine>(_onProcessWithNewEngine);
    on<OMRScannerReset>(_onReset);
    on<OMRScannerImagePicked>(_onImagePicked);
    on<OMRScannerSubmit>(_onSubmit);
  }

  Future<void> _onTemplateSet(
    OMRScannerTemplateSet event,
    Emitter<OMRScannerState> emit,
  ) async {
    emit(OMRScannerTemplateReady(
      template: event.template,
      evaluationConfig: event.evaluationConfig,
      examId: event.examId,
      examName: event.examName,
      classId: event.classId,
      className: event.className,
    ));
  }

  Future<void> _onLoadFromServer(
    OMRScannerLoadFromServer event,
    Emitter<OMRScannerState> emit,
  ) async {
    emit(OMRScannerLoadingTemplate());
    try {
      final templateService = GetIt.instance<OMRTemplateService>();
      final template = await templateService.getTemplateForExam(event.examId);
      EvaluationConfig? eval_;
      try {
        eval_ = await templateService.getEvaluationForExam(event.examId);
      } catch (_) {
        // Evaluation might not exist yet
      }
      emit(OMRScannerTemplateReady(
        template: template,
        evaluationConfig: eval_,
        examId: event.examId,
        examName: event.examName,
      ));
    } catch (e) {
      try {
        final storage = await _getLocalStorage();
        final template = await storage.getTemplateForExam(event.examId);
        final eval_ = await storage.getEvaluation(event.examId);
        if (template != null) {
          emit(OMRScannerTemplateReady(
            template: template,
            evaluationConfig: eval_,
            examId: event.examId,
            examName: event.examName,
          ));
          return;
        }
      } catch (_) {}
      emit(OMRScannerError(message: 'Failed to load template: $e'));
    }
  }

  Future<void> _onImageCaptured(
    OMRScannerImageCaptured event,
    Emitter<OMRScannerState> emit,
  ) async {
    emit(OMRScannerImageReady(imageBytes: event.imageBytes));

    final current = state;
    if (current is OMRScannerTemplateReady) {
      add(OMRScannerProcessStarted(imageBytes: event.imageBytes));
    }
  }

  Future<void> _onImagePicked(
    OMRScannerImagePicked event,
    Emitter<OMRScannerState> emit,
  ) async {
    emit(OMRScannerImageReady(imageBytes: event.imageBytes));

    final current = state;
    if (current is OMRScannerTemplateReady) {
      add(OMRScannerProcessStarted(imageBytes: event.imageBytes));
    }
  }

  Future<void> _onProcessStarted(
    OMRScannerProcessStarted event,
    Emitter<OMRScannerState> emit,
  ) async {
    final current = state;
    OMRTemplate template;
    EvaluationConfig? evalConfig;

    if (current is OMRScannerTemplateReady) {
      template = current.template;
      evalConfig = current.evaluationConfig;
    } else {
      emit(const OMRScannerError(
        message: 'No template loaded. Please load an exam template first.',
      ));
      return;
    }

    emit(OMRScannerProcessing(
      imageBytes: event.imageBytes,
      steps: const ['Starting OMR processing...'],
    ));

    final result = await _engine.processImage(
      imageBytes: event.imageBytes,
      template: template,
      evaluationConfig: evalConfig,
    );

    if (result.isSuccess) {
      emit(OMRScannerSuccess(
        imageBytes: event.imageBytes,
        processingResult: result,
        gradingResult: result.gradingResult,
      ));
    } else {
      emit(OMRScannerError(
        message: result.errorMessage ?? 'Unknown processing error',
        steps: result.processingSteps,
      ));
    }
  }

  Future<void> _onProcessWithNewEngine(
    OMRScannerProcessWithNewEngine event,
    Emitter<OMRScannerState> emit,
  ) async {
    emit(OMRScannerProcessing(
      imageBytes: event.imageBytes,
      steps: const ['Starting OMR processing with Engine v2...'],
    ));

    try {
      final omrEngineService = OmrEngineService();
      final gradingResult = await omrEngineService.scanAndGrade(
        imageBytes: event.imageBytes.toList(),
        templateJson: event.templateJson,
      );

      final convertedGradingResult = _convertToOldGradingResult(gradingResult);
      final processingResult = OMRProcessingResult(
        template: OMRTemplate.simpleMcq(numQuestions: gradingResult.questionScores.length, numOptions: 4),
        gradingResult: convertedGradingResult,
        response: OMRResponseDebug(
          answers: Map.fromEntries(
            gradingResult.questionScores.map((q) => MapEntry('q${q.position}', q.detectedAnswer ?? '')),
          ),
          globalThreshold: 0.5,
          bubbleIntensities: {},
          localThresholds: {},
        ),
        processingTime: const Duration(milliseconds: 500),
        processingSteps: [
          'Image captured',
          'Template loaded from server',
          'OMR Engine v2 processed',
          'Scored ${gradingResult.correctCount} correct, ${gradingResult.incorrectCount} incorrect, ${gradingResult.unmarkedCount} unmarked',
        ],
        wasWarped: false,
        annotatedImageBytes: event.imageBytes,
      );

      emit(OMRScannerSuccess(
        imageBytes: event.imageBytes,
        processingResult: processingResult,
        gradingResult: convertedGradingResult,
        questionScores: gradingResult.questionScores,
      ));
    } catch (e) {
      emit(OMRScannerError(message: 'Processing failed: $e'));
    }
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

  Future<void> _onSubmit(
    OMRScannerSubmit event,
    Emitter<OMRScannerState> emit,
  ) async {
    final current = state;
    if (current is! OMRScannerSuccess) return;

    emit(OMRScannerSubmitting(
      imageBytes: current.imageBytes,
      gradingResult: current.gradingResult,
    ));

    final answers = Map<String, String>.fromEntries(
      current.gradingResult.verdicts
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
          score: current.gradingResult.score,
          maxScore: current.gradingResult.maxScore,
        );

        if (success) {
          emit(OMRScannerSubmitted(
            gradingResult: current.gradingResult,
            submittedOnline: true,
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
          imageBytes: current.imageBytes,
          answers: answers,
          score: current.gradingResult.score,
          maxScore: current.gradingResult.maxScore,
          timestamp: DateTime.now(),
        ),
      );
      emit(OMRScannerSubmitted(
        gradingResult: current.gradingResult,
        submittedOnline: false,
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
