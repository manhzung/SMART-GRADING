import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import '../engine/app_omr_engine.dart';
import '../engine/app_omr_models.dart';
import 'omr_models.dart';

class OmScanAndGradeResult {
  final OmrScanResult scanResult;
  final OmrGradingResult gradingResult;
  final Uint8List? annotatedBytes;
  final Uint8List? croppedBytes;

  OmScanAndGradeResult({
    required this.scanResult,
    required this.gradingResult,
    this.annotatedBytes,
    this.croppedBytes,
  });
}

class OmrEngineService {
  Future<OmScanAndGradeResult> scanAndGrade({
    required List<int> imageBytes,
    required Map<String, dynamic> templateJson,
  }) async {
    // LOG: Print template info for debugging
    debugPrint('═══ OmrEngineService Template Info ═══');
    debugPrint('Template keys: ${templateJson.keys.toList()}');
    final t = templateJson['template'] ?? templateJson;
    if (t is Map<String, dynamic>) {
      debugPrint('Template pageDimensions: ${t['pageDimensions']}');
      debugPrint('Template bubbleDimensions: ${t['bubbleDimensions']}');
      debugPrint('Template fieldBlocks: ${t['fieldBlocks']?.keys.toList() ?? 'none'}');
      if (t['fieldBlocks'] != null) {
        for (final entry in (t['fieldBlocks'] as Map<String, dynamic>).entries) {
          final block = entry.value as Map<String, dynamic>;
          debugPrint('  Block "${entry.key}": origin=${block['origin']}, fieldType=${block['fieldType']}, '
              'bubbleWidth=${block['bubbleWidth']}, bubbleHeight=${block['bubbleHeight']}, '
              'labels=${(block['fieldLabels'] as List?)?.length ?? 0}');
        }
      }
      debugPrint('Template answerKey: ${t['answerKey']}');
    }
    debugPrint('═══════════════════════════════════════');

    final template = _convertToAppOmrTemplate(templateJson);
    
    // LOG: Print converted AppOmrTemplate
    debugPrint('═══ Converted AppOmrTemplate ═══');
    debugPrint('pageWidth=${template.pageWidth}, pageHeight=${template.pageHeight}');
    debugPrint('bubbleWidth=${template.bubbleWidth}, bubbleHeight=${template.bubbleHeight}');
    debugPrint('fieldBlocks count=${template.fieldBlocks.length}');
    for (final fb in template.fieldBlocks) {
      debugPrint('  Block "${fb.name}": origin=(${fb.originX},${fb.originY}), '
          'labels=${fb.fieldLabels.length}, values=${fb.bubbleValues}, '
          'bubblesGap=${fb.bubblesGap.toInt()}, labelsGap=${fb.labelsGap.toInt()}, direction=${fb.direction}');
    }
    debugPrint('═══════════════════════════════════');
    
    final bytes = Uint8List.fromList(imageBytes);

    // Use AppOMREngine with full corner detection and warp support
    final engine = AppOMREngine(template);
    final (appResult, annotatedBytes) = engine.processImage(bytes);

    // Convert AppOmrResult to OmrScanResult
    final scanResult = _convertToOmrScanResult(appResult, annotatedBytes);

    // Extract answer key from template
    final answerKey = _extractAnswerKey(templateJson);

    // Convert responses to answer format for grading
    final detectedAnswers = <String, String>{};
    for (final entry in appResult.responses.entries) {
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
      croppedBytes: appResult.croppedImageBytes,
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
    final bubbleWidth = (t['bubbleWidth'] as num?)?.toInt() ?? 46;
    final bubbleHeight = (t['bubbleHeight'] as num?)?.toInt() ?? 46;
    final autoAlign = t['autoAlign'] as bool? ?? false;

    // Parse existing coordinates if available
    final fieldBlocks = <AppOmrFieldBlock>[];

    // Student ID block - parse coords with proper spacing
    final studentId = t['studentId'] as Map<String, dynamic>?;
    if (studentId != null) {
      final coords = studentId['coords'] as List?;
      if (coords != null && coords.isNotEmpty) {
        // Calculate spacing from actual coords
        final sortedByX = List<Map<String, dynamic>>.from(
          coords.map((c) => Map<String, dynamic>.from(c as Map))
        )..sort((a, b) => (a['x'] as num).compareTo(b['x'] as num));
        
        final sortedByY = List<Map<String, dynamic>>.from(
          coords.map((c) => Map<String, dynamic>.from(c as Map))
        )..sort((a, b) => (a['y'] as num).compareTo(b['y'] as num));
        
        int xGap = 0;
        if (sortedByX.length >= 2) {
          xGap = ((sortedByX[1]['x'] as num) - (sortedByX[0]['x'] as num)).toInt();
        }
        
        int yGap = 0;
        if (sortedByY.length >= 2) {
          yGap = ((sortedByY[1]['y'] as num) - (sortedByY[0]['y'] as num)).toInt();
        }

        // Student ID is vertical (digits stacked), use yGap as bubblesGap
        fieldBlocks.add(AppOmrFieldBlock(
          name: 'student_code',
          originX: (coords.first['x'] as num).toInt(),
          originY: (coords.first['y'] as num).toInt(),
          bubbleWidth: (coords.first['w'] as num?)?.toInt() ?? bubbleWidth,
          bubbleHeight: (coords.first['h'] as num?)?.toInt() ?? bubbleHeight,
          fieldLabels: List.generate(coords.length, (i) => 'roll$i'),
          bubbleValues: List.generate(10, (i) => i.toString()),
          bubblesGap: yGap > 0 ? yGap.toDouble() : bubbleHeight + 10,
          labelsGap: xGap > 0 ? xGap.toDouble() : bubbleWidth + 10,
          direction: 'vertical', // digits go vertically
        ));
      }
    }

    // Version code block
    final versionCode = t['versionCodeZone'] as Map<String, dynamic>? ?? t['versionCode'] as Map<String, dynamic>?;
    if (versionCode != null) {
      final coords = versionCode['coords'] as List?;
      if (coords != null && coords.isNotEmpty) {
        final sortedByX = List<Map<String, dynamic>>.from(
          coords.map((c) => Map<String, dynamic>.from(c as Map))
        )..sort((a, b) => (a['x'] as num).compareTo(b['x'] as num));
        
        final sortedByY = List<Map<String, dynamic>>.from(
          coords.map((c) => Map<String, dynamic>.from(c as Map))
        )..sort((a, b) => (a['y'] as num).compareTo(b['y'] as num));
        
        int xGap = 0;
        if (sortedByX.length >= 2) {
          xGap = ((sortedByX[1]['x'] as num) - (sortedByX[0]['x'] as num)).toInt();
        }
        
        int yGap = 0;
        if (sortedByY.length >= 2) {
          yGap = ((sortedByY[1]['y'] as num) - (sortedByY[0]['y'] as num)).toInt();
        }

        fieldBlocks.add(AppOmrFieldBlock(
          name: 'version_code',
          originX: (coords.first['x'] as num).toInt(),
          originY: (coords.first['y'] as num).toInt(),
          bubbleWidth: (coords.first['w'] as num?)?.toInt() ?? bubbleWidth,
          bubbleHeight: (coords.first['h'] as num?)?.toInt() ?? bubbleHeight,
          fieldLabels: List.generate(coords.length, (i) => 'ver$i'),
          bubbleValues: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
          bubblesGap: yGap > 0 ? yGap.toDouble() : bubbleHeight + 10,
          labelsGap: xGap > 0 ? xGap.toDouble() : bubbleWidth + 10,
          direction: 'vertical',
        ));
      }
    }

    // Answer blocks - each question has 4 options (A, B, C, D) in horizontal row
    final answers = t['answers'] as Map<String, dynamic>?;
    if (answers != null) {
      // Get option keys sorted (A, B, C, D)
      final sortedQIds = answers.keys.toList()..sort();
      
      for (final qId in sortedQIds) {
        final options = answers[qId] as Map<String, dynamic>;
        if (options.isNotEmpty) {
          // Get sorted options by x position
          final sortedOpts = options.entries.toList()
            ..sort((a, b) {
              final aX = (a.value as Map)['x'] as num;
              final bX = (b.value as Map)['x'] as num;
              return aX.compareTo(bX);
            });
          
          final firstOpt = sortedOpts.first.value as Map<String, dynamic>;
          final optionKeys = sortedOpts.map((e) => e.key).toList();
          
          // Calculate horizontal spacing between options
          int xGap = 0;
          if (sortedOpts.length >= 2) {
            final firstX = (sortedOpts[0].value as Map)['x'] as num;
            final secondX = (sortedOpts[1].value as Map)['x'] as num;
            xGap = (secondX - firstX).toInt();
          }
          
          // For answers: bubblesGap = spacing between A,B,C,D (horizontal)
          // labelsGap = spacing between questions (vertical) - use bubbleHeight + 10 as default
          fieldBlocks.add(AppOmrFieldBlock(
            name: qId,
            originX: (firstOpt['x'] as num).toInt(),
            originY: (firstOpt['y'] as num).toInt(),
            bubbleWidth: (firstOpt['w'] as num?)?.toInt() ?? bubbleWidth,
            bubbleHeight: (firstOpt['h'] as num?)?.toInt() ?? bubbleHeight,
            fieldLabels: [qId],
            bubbleValues: optionKeys,
            bubblesGap: xGap > 0 ? xGap.toDouble() : bubbleWidth + 25, // spacing between options
            labelsGap: (bubbleHeight + 20).toDouble(), // spacing between questions (estimated)
            direction: 'horizontal',
          ));
        }
      }
    }

    // Parse preprocessors from template
    final preprocessorList = t['preProcessors'] as List?;
    final preprocessors = <AppOmrPreProcessor>[];
    if (preprocessorList != null) {
      for (final pp in preprocessorList) {
        final ppMap = pp as Map<String, dynamic>;
        final options = Map<String, dynamic>.from(ppMap['options'] as Map? ?? {});
        preprocessors.add(AppOmrPreProcessor(
          name: ppMap['name'] as String,
          options: options,
        ));
      }
    }
    
    // Default preprocessors if none specified
    if (preprocessors.isEmpty) {
      preprocessors.addAll([
        const AppOmrPreProcessor(name: 'GaussianBlur', options: {'kSize': [3, 3]}),
        const AppOmrPreProcessor(name: 'CropPage', options: {}),
      ]);
    }

    return AppOmrTemplate(
      pageWidth: pageWidth,
      pageHeight: pageHeight,
      bubbleWidth: bubbleWidth,
      bubbleHeight: bubbleHeight,
      fieldBlocks: fieldBlocks,
      preprocessors: preprocessors,
      autoAlign: autoAlign,
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
