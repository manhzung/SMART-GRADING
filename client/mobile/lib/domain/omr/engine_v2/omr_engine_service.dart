import 'dart:typed_data';
import '../engine/app_omr_engine.dart';
import '../engine/app_omr_models.dart';
import 'omr_models.dart';

class OmScanAndGradeResult {
  final OmrScanResult scanResult;
  final OmrGradingResult gradingResult;
  final Uint8List? annotatedBytes;

  OmScanAndGradeResult({
    required this.scanResult,
    required this.gradingResult,
    this.annotatedBytes,
  });
}

class OmrEngineService {
  Future<OmScanAndGradeResult> scanAndGrade({
    required List<int> imageBytes,
    required Map<String, dynamic> templateJson,
  }) async {
    final template = _convertToAppOmrTemplate(templateJson);
    final bytes = Uint8List.fromList(imageBytes);

    // Use AppOMREngine with full corner detection and warp support
    final engine = AppOMREngine(template);
    final (result, annotatedBytes) = engine.processImage(bytes);

    // Convert AppOmrResult to OmrScanResult
    final scanResult = _convertToOmrScanResult(result, annotatedBytes);

    // Extract answer key from template
    final answerKey = _extractAnswerKey(templateJson);

    // Convert responses to answer format for grading
    final detectedAnswers = <String, String>{};
    for (final entry in result.responses.entries) {
      // AppOmrEngine uses fieldLabels as keys (e.g., "q1", "q2", "roll1")
      // We need to convert to grading format
      final label = entry.key;
      final value = entry.value;
      if (value.isNotEmpty && label.isNotEmpty) {
        detectedAnswers[label] = value;
      }
    }

    // Grade the answers
    final gradingResult = _gradeAnswers(
      detectedAnswers: detectedAnswers,
      answerKey: answerKey,
      templateJson: templateJson,
    );

    return OmScanAndGradeResult(
      scanResult: scanResult,
      gradingResult: gradingResult,
      annotatedBytes: annotatedBytes,
    );
  }

  /// Convert server template JSON to AppOmrTemplate
  AppOmrTemplate _convertToAppOmrTemplate(Map<String, dynamic> json) {
    final t = json['template'] != null
        ? json['template'] as Map<String, dynamic>
        : json;

    // Try FieldBlock format first
    if (t['fieldBlocks'] != null) {
      return _convertFieldBlockToAppTemplate(t);
    }

    // Fallback to simple default template
    return _createDefaultTemplate(t);
  }

  AppOmrTemplate _convertFieldBlockToAppTemplate(Map<String, dynamic> t) {
    final pageDims = t['pageDimensions'] as List?;
    final pageWidth = pageDims != null && pageDims.isNotEmpty
        ? (pageDims[0] as num).toInt()
        : 2480;
    final pageHeight = pageDims != null && pageDims.length >= 2
        ? (pageDims[1] as num).toInt()
        : 3508;

    final bubbleDims = t['bubbleDimensions'] as List?;
    final defaultBw = bubbleDims != null && bubbleDims.isNotEmpty
        ? (bubbleDims[0] as num).toDouble()
        : 47.0;
    final defaultBh = bubbleDims != null && bubbleDims.length >= 2
        ? (bubbleDims[1] as num).toDouble()
        : 47.0;

    final fieldBlocks = <AppOmrFieldBlock>[];
    final fieldBlocksMap = t['fieldBlocks'] as Map<String, dynamic>? ?? {};

    for (final entry in fieldBlocksMap.entries) {
      final name = entry.key;
      final block = entry.value as Map<String, dynamic>;
      final fieldType = block['fieldType'] as String? ?? 'QTYPE_MCQ4';

      final origin = (block['origin'] as List?)?.cast<num>() ?? [0, 0];
      final ox = origin[0].toInt();
      final oy = origin[1].toInt();

      final bw = (block['bubbleWidth'] as num?)?.toDouble() ?? defaultBw;
      final bh = (block['bubbleHeight'] as num?)?.toDouble() ?? defaultBh;
      final bubblesGap = (block['bubblesGap'] as num?)?.toDouble() ?? (bh + 10);
      final labelsGap = (block['labelsGap'] as num?)?.toDouble() ?? (bh + 25);
      final labels = (block['fieldLabels'] as List?)?.cast<String>() ?? [];
      final direction = block['direction'] as String? ?? 'horizontal';

      // Determine bubble values based on field type
      List<String> bubbleValues;
      if (fieldType == 'QTYPE_INT') {
        bubbleValues = List.generate(10, (i) => i.toString());
      } else if (fieldType == 'QTYPE_MCQ4') {
        bubbleValues = ['A', 'B', 'C', 'D'];
      } else if (fieldType == 'QTYPE_MCQ5') {
        bubbleValues = ['A', 'B', 'C', 'D', 'E'];
      } else {
        bubbleValues = ['A', 'B', 'C', 'D'];
      }

      fieldBlocks.add(AppOmrFieldBlock(
        name: name,
        originX: ox,
        originY: oy,
        bubbleWidth: bw.toInt(),
        bubbleHeight: bh.toInt(),
        fieldLabels: labels,
        bubbleValues: bubbleValues,
        bubblesGap: bubblesGap,
        labelsGap: labelsGap,
        direction: direction,
        emptyValue: '',
      ));
    }

    // Add CropPage preprocessor for corner detection
    final preprocessors = [
      const AppOmrPreProcessor(
        name: 'GaussianBlur',
        options: {'kSize': [5, 5]},
      ),
      const AppOmrPreProcessor(
        name: 'CropPage',
        options: {},
      ),
    ];

    return AppOmrTemplate(
      pageWidth: pageWidth,
      pageHeight: pageHeight,
      bubbleWidth: defaultBw.toInt(),
      bubbleHeight: defaultBh.toInt(),
      fieldBlocks: fieldBlocks,
      preprocessors: preprocessors,
      autoAlign: true,
    );
  }

  AppOmrTemplate _createDefaultTemplate(Map<String, dynamic> t) {
    final pageWidth = (t['pageWidth'] as num?)?.toInt() ?? 2480;
    final pageHeight = (t['pageHeight'] as num?)?.toInt() ?? 3508;

    // Parse existing coordinates if available
    final fieldBlocks = <AppOmrFieldBlock>[];

    // Student ID block
    final studentId = t['studentId'] as Map<String, dynamic>?;
    if (studentId != null) {
      final coords = studentId['coords'] as List?;
      if (coords != null && coords.isNotEmpty) {
        final first = coords.first as Map<String, dynamic>;
        fieldBlocks.add(AppOmrFieldBlock(
          name: 'student_code',
          originX: (first['x'] as num?)?.toInt() ?? 0,
          originY: (first['y'] as num?)?.toInt() ?? 0,
          bubbleWidth: (first['w'] as num?)?.toInt() ?? 40,
          bubbleHeight: (first['h'] as num?)?.toInt() ?? 40,
          fieldLabels: List.generate(coords.length, (i) => 'roll$i'),
          bubbleValues: List.generate(10, (i) => i.toString()),
          bubblesGap: 40,
          labelsGap: 40,
        ));
      }
    }

    // Version code block
    final versionCode = t['versionCodeZone'] as Map<String, dynamic>? ?? t['versionCode'] as Map<String, dynamic>?;
    if (versionCode != null) {
      final coords = versionCode['coords'] as List?;
      if (coords != null && coords.isNotEmpty) {
        final first = coords.first as Map<String, dynamic>;
        fieldBlocks.add(AppOmrFieldBlock(
          name: 'version_code',
          originX: (first['x'] as num?)?.toInt() ?? 0,
          originY: (first['y'] as num?)?.toInt() ?? 0,
          bubbleWidth: (first['w'] as num?)?.toInt() ?? 40,
          bubbleHeight: (first['h'] as num?)?.toInt() ?? 40,
          fieldLabels: List.generate(coords.length, (i) => 'ver$i'),
          bubbleValues: ['1', '2', '3', '4'],
          bubblesGap: 40,
          labelsGap: 40,
        ));
      }
    }

    // Answer blocks
    final answers = t['answers'] as Map<String, dynamic>?;
    if (answers != null) {
      for (final entry in answers.entries) {
        final qId = entry.key;
        final options = entry.value as Map<String, dynamic>;
        if (options.isNotEmpty) {
          final firstOpt = options.values.first as Map<String, dynamic>;
          fieldBlocks.add(AppOmrFieldBlock(
            name: qId,
            originX: (firstOpt['x'] as num?)?.toInt() ?? 0,
            originY: (firstOpt['y'] as num?)?.toInt() ?? 0,
            bubbleWidth: (firstOpt['w'] as num?)?.toInt() ?? 40,
            bubbleHeight: (firstOpt['h'] as num?)?.toInt() ?? 40,
            fieldLabels: [qId],
            bubbleValues: options.keys.toList(),
          bubblesGap: 50,
          labelsGap: 50,
        ));
      }
    }
    }

    final preprocessors = [
      const AppOmrPreProcessor(
        name: 'GaussianBlur',
        options: {'kSize': [5, 5]},
      ),
      const AppOmrPreProcessor(
        name: 'CropPage',
        options: {},
      ),
    ];

    return AppOmrTemplate(
      pageWidth: pageWidth,
      pageHeight: pageHeight,
      bubbleWidth: 40,
      bubbleHeight: 40,
      fieldBlocks: fieldBlocks,
      preprocessors: preprocessors,
      autoAlign: true,
    );
  }

  OmrScanResult _convertToOmrScanResult(AppOmrResult result, Uint8List? annotatedBytes) {
    String studentId = '';
    String versionCode = '';

    // Extract student ID and version code from responses
    for (final entry in result.responses.entries) {
      final key = entry.key;
      final value = entry.value;

      if (key.startsWith('roll') || key.startsWith('student')) {
        studentId += value;
      } else if (key.startsWith('ver') || key.startsWith('version')) {
        versionCode += value;
      }
    }

    return OmrScanResult(
      studentId: studentId,
      versionCode: versionCode,
      answers: Map.fromEntries(
        result.responses.entries.where(
          (e) => e.key.startsWith('q') || e.key.startsWith('question'),
        ),
      ),
      processingTime: Duration.zero, // AppOMREngine doesn't track time
      processingSteps: [result.preprocessorUsed],
      wasWarped: result.warpSucceeded,
    );
  }

  Map<String, String> _extractAnswerKey(Map<String, dynamic> templateJson) {
    final answerKey = <String, String>{};
    final t = templateJson['template'] != null
        ? templateJson['template'] as Map<String, dynamic>
        : templateJson;

    if (t['answerKey'] != null) {
      for (final entry in (t['answerKey'] as Map).entries) {
        answerKey[entry.key.toString()] = entry.value.toString();
      }
    }

    return answerKey;
  }

  OmrGradingResult _gradeAnswers({
    required Map<String, String> detectedAnswers,
    required Map<String, String> answerKey,
    required Map<String, dynamic> templateJson,
  }) {
    final t = templateJson['template'] != null
        ? templateJson['template'] as Map<String, dynamic>
        : templateJson;

    final totalScore = (t['totalScore'] as num?)?.toDouble() ?? 10.0;

    // Count questions
    final outputColumns = (t['outputColumns'] as List?)?.cast<String>();
    final numQuestions = outputColumns?.length ?? detectedAnswers.length;

    // Default: equal score per question
    final scorePerQ = numQuestions > 0 ? totalScore / numQuestions : 1.0;

    final questionScores = <QuestionScoreResult>[];
    int correctCount = 0;
    int incorrectCount = 0;
    int unmarkedCount = 0;

    // Process each detected answer
    for (final entry in detectedAnswers.entries) {
      final qId = entry.key;
      final detected = entry.value;
      final correct = answerKey[qId];

      bool isCorrect = false;
      bool isUnmarked = detected.isEmpty;

      if (!isUnmarked && correct != null) {
        isCorrect = detected == correct;
      }

      if (isUnmarked) {
        unmarkedCount++;
      } else if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }

      questionScores.add(QuestionScoreResult(
        position: int.tryParse(qId.replaceAll('q', '')) ?? questionScores.length,
        detectedAnswer: detected.isNotEmpty ? detected : null,
        correctAnswer: correct,
        isCorrect: isCorrect,
        isUnmarked: isUnmarked,
        score: isCorrect ? scorePerQ : 0,
        maxScore: scorePerQ,
      ));
    }

    // Sort by position
    questionScores.sort((a, b) => a.position.compareTo(b.position));

    final obtainedScore = correctCount * scorePerQ;
    final percentage = numQuestions > 0 ? (obtainedScore / totalScore) * 100 : 0.0;

    return OmrGradingResult(
      totalScore: obtainedScore,
      maxScore: totalScore,
      percentage: percentage,
      grade: _calculateGrade(percentage),
      questionScores: questionScores,
      correctCount: correctCount,
      incorrectCount: incorrectCount,
      unmarkedCount: unmarkedCount,
    );
  }

  String _calculateGrade(double percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  }
}
