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
  /// Auto-alignment shifts per field block (px), computed during OMR scan.
  /// Empty when autoAlign=false. Overlay uses these to draw at correct positions.
  final List<int> alignmentShifts;

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
    this.alignmentShifts = const [],
  });

  bool get hasError => errorMessage != null;
  bool get isSuccess => errorMessage == null;
}

/// The main OMR processing engine orchestrator.
/// Uses AppOMREngine (OpenCV-based) internally, ports omr_engine_v2.dart logic.
class OMREngine {
  OMREngine();

  /// Process a single image and return grading result.
  ///
  /// [evaluationConfig] - If provided with answerKey, annotated image will color bubbles:
  /// - Green: correct answer
  /// - Red: incorrect answer
  /// - Purple: multi-marked
  /// - Blue: student ID / version code
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

      // Extract answerKey from evaluationConfig for coloring annotations
      Map<String, String>? answerKey;
      if (evaluationConfig != null) {
        answerKey = {};
        for (int i = 0; i < evaluationConfig.questionsInOrder.length; i++) {
          final q = evaluationConfig.questionsInOrder[i];
          final a = i < evaluationConfig.answersInOrder.length
              ? evaluationConfig.answersInOrder[i]?.toString() ?? ''
              : '';
          if (q.isNotEmpty) {
            answerKey[q] = a;
          }
        }
        steps.add('Answer key: ${answerKey.length} questions for annotation coloring');
      }

      steps.add('Processing image with AppOMREngine (OpenCV)...');
      final appEngine = AppOMREngine(appTemplate);
      final (appResult, annotatedBytes) = appEngine.processImage(imageBytes, answerKey: answerKey);

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
        alignmentShifts: appResult.alignmentShifts,
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
        alignmentShifts: const [],
      );
    }
  }

  AppOmrTemplate _toAppTemplate(OMRTemplate template) {
    // Extract exact coordinates from templateJson.answers if available
    final Map<String, Map<String, Map<String, dynamic>>>? exactCoords =
        _extractExactCoords(template.templateJson);

    final fieldBlocks = template.fieldBlocks.map((fb) {
      final direction = fb.direction;
      final bubbleValues = fb.bubbleValues;
      final fieldLabels = fb.fieldLabels;
      final labelsGap = fb.labelsGap;
      final bubblesGap = fb.bubblesGap;
      final emptyValue = fb.emptyValue;

      // Get exact coords for this block if available
      List<AppBubbleCoord>? exactBubbleCoords;
      if (exactCoords != null) {
        exactBubbleCoords = <AppBubbleCoord>[];
        for (final label in fieldLabels) {
          final labelCoords = exactCoords[label];
          if (labelCoords != null) {
            for (final entry in labelCoords.entries) {
              final value = entry.key;
              final coord = entry.value;
              exactBubbleCoords.add(AppBubbleCoord(
                label: label,
                value: value,
                x: (coord['x'] as num?)?.toInt() ?? 0,
                y: (coord['y'] as num?)?.toInt() ?? 0,
                w: (coord['w'] as num?)?.toInt() ?? fb.bubbleWidth,
                h: (coord['h'] as num?)?.toInt() ?? fb.bubbleHeight,
              ));
            }
          }
        }
      }

      return AppOmrFieldBlock(
        name: fb.name,
        originX: fb.originX,
        originY: fb.originY,
        shift: 0,
        bubbleWidth: fb.bubbleWidth,
        bubbleHeight: fb.bubbleHeight,
        fieldLabels: fieldLabels,
        bubbleValues: bubbleValues,
        bubblesGap: bubblesGap.toDouble(),
        labelsGap: labelsGap.toDouble(),
        direction: direction.name,
        emptyValue: emptyValue,
        exactCoords: exactBubbleCoords,
      );
    }).toList();

    // Add Student ID field block from templateJson
    final studentIdBlocks = _createStudentIdBlocks(template.templateJson, template.studentId);
    fieldBlocks.addAll(studentIdBlocks);

    // Add Version Code field block from templateJson
    final versionCodeBlocks = _createVersionCodeBlocks(template.templateJson, template.versionCodeZone);
    fieldBlocks.addAll(versionCodeBlocks);

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
      autoAlign: template.autoAlign,
      useMarkers: false,
    );
  }

  /// Create field blocks for Student ID from templateJson
  List<AppOmrFieldBlock> _createStudentIdBlocks(
    Map<String, dynamic>? templateJson,
    StudentIdField? studentIdField,
  ) {
    if (templateJson == null) return [];

    final studentId = templateJson['studentId'] as Map<String, dynamic>?;
    if (studentId == null) return [];

    final coords = studentId['coords'] as List<dynamic>?;
    if (coords == null || coords.isEmpty) return [];

    // Group coords by digit position
    final byDigit = <int, List<Map<String, dynamic>>>{};
    for (final c in coords) {
      if (c is! Map) continue;
      final coord = Map<String, dynamic>.from(c);
      final digit = (coord['digit'] as num?)?.toInt() ?? 0;
      byDigit.putIfAbsent(digit, () => []).add(coord);
    }

    if (byDigit.isEmpty) return [];

    final blocks = <AppOmrFieldBlock>[];

    // Create one field block per digit
    for (final entry in byDigit.entries.toList()..sort((a, b) => a.key.compareTo(b.key))) {
      final digit = entry.key;
      final digitCoords = entry.value;

      // Sort by value (1-10)
      digitCoords.sort((a, b) => ((a['value'] as num?)?.toInt() ?? 0)
          .compareTo((b['value'] as num?)?.toInt() ?? 0));

      // Convert to AppBubbleCoord with bubbleValues as ['1', '2', ..., '10']
      final exactCoords = <AppBubbleCoord>[];
      for (final c in digitCoords) {
        final value = (c['value'] as num?)?.toInt() ?? 0;
        exactCoords.add(AppBubbleCoord(
          label: 'sbd${digit + 1}',
          value: '$value',
          x: (c['x'] as num?)?.toInt() ?? 0,
          y: (c['y'] as num?)?.toInt() ?? 0,
          w: (c['w'] as num?)?.toInt() ?? 46,
          h: (c['h'] as num?)?.toInt() ?? 46,
        ));
      }

      // Get origin from first coord
      final firstCoord = digitCoords.first;
      final originX = (firstCoord['x'] as num?)?.toInt() ?? 0;
      final originY = (firstCoord['y'] as num?)?.toInt() ?? 0;

      blocks.add(AppOmrFieldBlock(
        name: 'StudentId_digit_$digit',
        originX: originX,
        originY: originY,
        shift: 0,
        bubbleWidth: (firstCoord['w'] as num?)?.toInt() ?? 46,
        bubbleHeight: (firstCoord['h'] as num?)?.toInt() ?? 46,
        fieldLabels: ['sbd${digit + 1}'],
        bubbleValues: List.generate(10, (i) => '${i + 1}'),
        bubblesGap: 0, // Not used with exact coords
        labelsGap: 0,   // Not used with exact coords
        direction: 'vertical',
        emptyValue: '',
        exactCoords: exactCoords,
      ));
    }

    return blocks;
  }

  /// Create field blocks for Version Code from templateJson
  List<AppOmrFieldBlock> _createVersionCodeBlocks(
    Map<String, dynamic>? templateJson,
    VersionCodeField? versionCodeField,
  ) {
    if (templateJson == null) return [];

    final versionZone = templateJson['versionCodeZone'] as Map<String, dynamic>?;
    if (versionZone == null) return [];

    final coords = versionZone['coords'] as List<dynamic>?;
    if (coords == null || coords.isEmpty) return [];

    // Group coords by digit position
    final byDigit = <int, List<Map<String, dynamic>>>{};
    for (final c in coords) {
      if (c is! Map) continue;
      final coord = Map<String, dynamic>.from(c);
      final digit = (coord['digit'] as num?)?.toInt() ?? 0;
      byDigit.putIfAbsent(digit, () => []).add(coord);
    }

    if (byDigit.isEmpty) return [];

    final blocks = <AppOmrFieldBlock>[];

    // Create one field block per digit
    for (final entry in byDigit.entries.toList()..sort((a, b) => a.key.compareTo(b.key))) {
      final digit = entry.key;
      final digitCoords = entry.value;

      // Sort by value (1-10)
      digitCoords.sort((a, b) => ((a['value'] as num?)?.toInt() ?? 0)
          .compareTo((b['value'] as num?)?.toInt() ?? 0));

      // Convert to AppBubbleCoord with bubbleValues as ['1', '2', ..., '10']
      final exactCoords = <AppBubbleCoord>[];
      for (final c in digitCoords) {
        final value = (c['value'] as num?)?.toInt() ?? 0;
        exactCoords.add(AppBubbleCoord(
          label: 'md${digit + 1}',
          value: '$value',
          x: (c['x'] as num?)?.toInt() ?? 0,
          y: (c['y'] as num?)?.toInt() ?? 0,
          w: (c['w'] as num?)?.toInt() ?? 46,
          h: (c['h'] as num?)?.toInt() ?? 46,
        ));
      }

      // Get origin from first coord
      final firstCoord = digitCoords.first;
      final originX = (firstCoord['x'] as num?)?.toInt() ?? 0;
      final originY = (firstCoord['y'] as num?)?.toInt() ?? 0;

      blocks.add(AppOmrFieldBlock(
        name: 'VersionCode_digit_$digit',
        originX: originX,
        originY: originY,
        shift: 0,
        bubbleWidth: (firstCoord['w'] as num?)?.toInt() ?? 46,
        bubbleHeight: (firstCoord['h'] as num?)?.toInt() ?? 46,
        fieldLabels: ['md${digit + 1}'],
        bubbleValues: List.generate(10, (i) => '${i + 1}'),
        bubblesGap: 0,
        labelsGap: 0,
        direction: 'vertical',
        emptyValue: '',
        exactCoords: exactCoords,
      ));
    }

    return blocks;
  }

  /// Extract exact coordinates from templateJson.answers
  /// Returns: { "q1": { "A": {x, y, w, h}, "B": {...} }, "q2": {...} }
  Map<String, Map<String, Map<String, dynamic>>>? _extractExactCoords(
      Map<String, dynamic>? templateJson) {
    if (templateJson == null) return null;

    final answers = templateJson['answers'];
    if (answers is! Map) return null;

    final result = <String, Map<String, Map<String, dynamic>>>{};
    for (final entry in answers.entries) {
      final qKey = entry.key.toString();
      final options = entry.value;
      if (options is Map) {
        result[qKey] = {};
        for (final optEntry in options.entries) {
          final optKey = optEntry.key.toString();
          final coord = optEntry.value;
          if (coord is Map) {
            result[qKey]![optKey] = Map<String, dynamic>.from(coord);
          }
        }
      }
    }

    return result.isEmpty ? null : result;
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
