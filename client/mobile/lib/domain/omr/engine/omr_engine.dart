import 'dart:ui';
import 'package:flutter/foundation.dart';

import '../models/grading_result.dart';
import '../models/omr_response.dart';
import '../models/omr_template.dart';
import '../models/evaluation_config.dart';
import 'app_omr_engine.dart';
import 'app_omr_models.dart';

/// Processing result containing everything from a single OMR scan.
class OMRProcessingResult {
  final OMRTemplate template;
  final OMRGradingResult gradingResult;
  final OMRResponseDebug response;
  final String? errorMessage;
  final Duration processingTime;
  final List<String> processingSteps;
  final List<Offset>? detectedCorners;
  final double? skewAngle;
  final bool wasWarped;
  final Uint8List? annotatedImageBytes;
  final Uint8List? croppedImageBytes;
  final int? croppedWidth;
  final int? croppedHeight;

  const OMRProcessingResult({
    required this.template,
    required this.gradingResult,
    required this.response,
    this.errorMessage,
    required this.processingTime,
    required this.processingSteps,
    this.detectedCorners,
    this.skewAngle,
    this.wasWarped = false,
    this.annotatedImageBytes,
    this.croppedImageBytes,
    this.croppedWidth,
    this.croppedHeight,
  });

  bool get hasError => errorMessage != null;
  bool get isSuccess => errorMessage == null;
}

/// The main OMR processing engine orchestrator.
/// Uses AppOMREngine (OpenCV-based) internally, ports omr_engine_v2.dart logic.
class OMREngine {
  OMREngine();

  /// Process a single image and return grading result.
  Future<OMRProcessingResult> processImage({
    required Uint8List imageBytes,
    required OMRTemplate template,
    EvaluationConfig? evaluationConfig,
  }) async {
    final stopwatch = Stopwatch()..start();
    final steps = <String>[];

    try {
      steps.add('Converting template to AppOmrTemplate...');
      final appTemplate = _toAppTemplate(template);
      steps.add('AppOmrTemplate: ${appTemplate.fieldBlocks.length} blocks, '
          '${appTemplate.preprocessors.length} preprocessors');

      steps.add('Processing image with AppOMREngine (OpenCV)...');
      final appEngine = AppOMREngine(appTemplate);
      final (appResult, annotatedBytes) = appEngine.processImage(imageBytes);

      debugPrint(
          'AppOMREngine result: warpSucceeded=${appResult.warpSucceeded}, '
          'responses=${appResult.responses.length}, '
          'confidence=${(appResult.confidence * 100).toStringAsFixed(1)}%');

      steps.add('Preprocessor used: ${appResult.preprocessorUsed}');

      if (appResult.warpSucceeded) {
        steps.add('Page crop & perspective warp: SUCCESS');
      } else {
        steps.add('Page crop: FAILED (no corners detected)');
      }

      steps.add('Read ${appResult.details.length} bubble rows');

      // Build OMRResponseDebug from AppOmrResult
      steps.add('Building response debug data...');
      final globalThr = _computeGlobalThr(appResult.details);

      // Collect all intensities across all questions for threshold computation
      final allQVals = <double>[];
      for (final detail in appResult.details) {
        allQVals.addAll(detail.allIntensities);
      }
      final globalThreshold = allQVals.isEmpty
          ? globalThr
          : _computeThresholdFromIntensities(allQVals);

      // Build full bubbleIntensities: one BubbleIntensity per bubble option (A,B,C,D...)
      final bubbleIntensities = <String, List<BubbleIntensity>>{};
      final localThresholds = <String, double>{};

      for (final detail in appResult.details) {
        final bubbleValues = _getBubbleValuesForLabel(detail.label, template);
        final intensities = <BubbleIntensity>[];

        for (int i = 0; i < detail.allIntensities.length; i++) {
          final val = i < bubbleValues.length ? bubbleValues[i] : '';
          intensities.add(BubbleIntensity(
            bubbleValue: val,
            meanIntensity: detail.allIntensities[i],
            isMarked: val == detail.markedValue && detail.markedValue.isNotEmpty,
          ));
        }
        bubbleIntensities[detail.label] = intensities;
        localThresholds[detail.label] = globalThreshold;
      }

      final hasMultiMarked =
          appResult.details.any((d) => d.isMultiMarked);
      final hasUnmarked =
          appResult.details.any((d) => d.markedValue.isEmpty);

      final omrResponse = OMRResponseDebug(
        answers: appResult.responses,
        multiMarked: hasMultiMarked,
        hasUnmarked: hasUnmarked,
        bubbleIntensities: bubbleIntensities,
        globalThreshold: globalThreshold,
        localThresholds: localThresholds,
      );

      // Grade if evaluationConfig is provided
      OMRGradingResult gradingResult;
      if (evaluationConfig != null) {
        steps.add('Grading answers against answer key...');
        gradingResult = _gradeWithConfig(
          appResult, omrResponse, evaluationConfig, hasMultiMarked, hasUnmarked);
        steps.add('Score: ${gradingResult.score.toStringAsFixed(1)}/'
            '${gradingResult.maxScore}');
      } else {
        steps.add('No evaluation config - returning read-only results');
        gradingResult = OMRGradingResult(
          score: 0,
          maxScore: 0,
          verdicts: [],
          hasMultiMarked: hasMultiMarked,
          hasUnmarked: hasUnmarked,
        );
      }

      stopwatch.stop();

      // Extract detected corners from appResult if available
      // (AppOmrResult doesn't directly expose corners, but we can infer success)
      final detectedCorners = appResult.warpSucceeded
          ? <Offset>[] // Corners are used internally for warp, result is already cropped
          : null;

      return OMRProcessingResult(
        template: template,
        gradingResult: gradingResult,
        response: omrResponse,
        errorMessage: null,
        processingTime: stopwatch.elapsed,
        processingSteps: steps,
        detectedCorners: detectedCorners,
        skewAngle: null,
        wasWarped: appResult.warpSucceeded,
        annotatedImageBytes: annotatedBytes,
        croppedImageBytes: appResult.croppedImageBytes,
        croppedWidth: appResult.croppedWidth,
        croppedHeight: appResult.croppedHeight,
      );
    } catch (e, st) {
      debugPrint('OMREngine.processImage ERROR: $e\n$st');
      stopwatch.stop();
      return OMRProcessingResult(
        template: template,
        gradingResult: OMRGradingResult.empty(),
        response: OMRResponseDebug(
          answers: {},
          bubbleIntensities: {},
          globalThreshold: 0,
          localThresholds: {},
        ),
        errorMessage: 'Processing failed: $e',
        processingTime: stopwatch.elapsed,
        processingSteps: steps,
        croppedImageBytes: null,
        croppedWidth: null,
        croppedHeight: null,
      );
    }
  }

  AppOmrTemplate _toAppTemplate(OMRTemplate template) {
    final fieldBlocks = template.fieldBlocks.map((fb) {
      final direction = fb.direction;
      final bubbleValues = fb.bubbleValues;
      final fieldLabels = fb.fieldLabels;
      final labelsGap = fb.labelsGap;
      final bubblesGap = fb.bubblesGap;
      final emptyValue = fb.emptyValue;
      return AppOmrFieldBlock(
        name: fb.name,
        originX: fb.originX,
        originY: fb.originY,
        shift: 0,
        fieldLabels: fieldLabels,
        bubbleValues: bubbleValues,
        bubblesGap: bubblesGap.toDouble(),
        labelsGap: labelsGap.toDouble(),
        direction: direction.name,
        emptyValue: emptyValue,
      );
    }).toList();

    final preprocessors = template.preProcessors.map((pp) {
      return AppOmrPreProcessor(
        name: pp.name,
        options: pp.options,
      );
    }).toList();

    return AppOmrTemplate(
      pageWidth: template.pageWidth,
      pageHeight: template.pageHeight,
      bubbleWidth: template.bubbleWidth,
      bubbleHeight: template.bubbleHeight,
      fieldBlocks: fieldBlocks,
      preprocessors: preprocessors,
      procWidth: null,
      procHeight: null,
      minJump: 8.0,
      autoAlign: false,
      useMarkers: false,
    );
  }

  OMRGradingResult _gradeWithConfig(
    AppOmrResult appResult,
    OMRResponseDebug omrResponse,
    EvaluationConfig config,
    bool hasMultiMarked,
    bool hasUnmarked,
  ) {
    final verdicts = <QuestionVerdict>[];
    double currentScore = 0;

    for (final question in config.questionsInOrder) {
      final markedAnswer = appResult.responses[question] ?? '';
      final correctAnswerRaw = _getAnswerForQuestion(question, config);
      final scheme = _getSchemeForQuestion(question, config);

      String verdict;
      double delta;

      if (markedAnswer.isEmpty || markedAnswer == scheme.emptyValue) {
        verdict = 'unmarked';
        delta = scheme.unmarked;
      } else if (_matchAnswer(markedAnswer, correctAnswerRaw)) {
        verdict = 'correct';
        delta = scheme.correct;
      } else {
        verdict = 'incorrect';
        delta = scheme.incorrect;
      }

      verdicts.add(QuestionVerdict(
        question: question,
        markedAnswer: markedAnswer,
        correctAnswer: _formatAnswer(correctAnswerRaw),
        verdict: verdict,
        delta: delta,
        cumulativeScore: currentScore + delta,
      ));

      currentScore += delta;
    }

    final maxScore =
        config.defaultScheme.correct * config.questionsInOrder.length;

    return OMRGradingResult(
      score: currentScore,
      maxScore: maxScore,
      verdicts: verdicts,
      hasMultiMarked: hasMultiMarked,
      hasUnmarked: hasUnmarked,
    );
  }

  bool _matchAnswer(String marked, dynamic correct) {
    if (correct is String) {
      return marked == correct;
    } else if (correct is List) {
      return correct.contains(marked);
    }
    return false;
  }

  dynamic _getAnswerForQuestion(String question, EvaluationConfig config) {
    final idx = config.questionsInOrder.indexOf(question);
    if (idx < 0 || idx >= config.answersInOrder.length) {
      return '';
    }
    return config.answersInOrder[idx];
  }

  MarkingScheme _getSchemeForQuestion(String question, EvaluationConfig config) {
    for (final section in config.sectionSchemes.values) {
      if (section.containsQuestion(question)) {
        return section.marking;
      }
    }
    return config.defaultScheme;
  }

  String _formatAnswer(dynamic answer) {
    if (answer is List) {
      return answer.join(', ');
    }
    return answer.toString();
  }

  double _computeGlobalThr(List<AppBubbleResult> details) {
    if (details.isEmpty) return 128;
    final intensities = details.map((d) => d.intensity).toList()..sort();
    return intensities[intensities.length ~/ 2];
  }

  double _computeThresholdFromIntensities(List<double> vals) {
    if (vals.isEmpty) return 128;
    final sorted = List<double>.from(vals)..sort();
    const looseness = 4;
    const minJump = 8.0;
    const globalThrWhite = 200.0;
    final ls = (looseness + 1) ~/ 2;
    final l = sorted.length - ls;

    double maxJump = minJump;
    double thr = globalThrWhite;

    for (int i = ls; i < l; i++) {
      final i1 = (i + ls).clamp(0, sorted.length - 1);
      final i2 = (i - ls).clamp(0, sorted.length - 1);
      final jump = sorted[i1] - sorted[i2];
      if (jump > maxJump) {
        maxJump = jump;
        thr = sorted[i2] + jump / 2;
      }
    }
    return thr;
  }

  List<String> _getBubbleValuesForLabel(String label, OMRTemplate t) {
    for (final block in t.fieldBlocks) {
      if (block.fieldLabels.contains(label)) {
        return block.bubbleValues;
      }
    }
    return [];
  }
}
