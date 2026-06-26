import 'package:flutter/foundation.dart';
import '../engine/app_omr_engine.dart';
import '../engine/app_omr_models.dart';
import '../models/omr_template.dart';
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

  AppOmrTemplate _convertToAppOmrTemplate(Map<String, dynamic> json) {
    // Check if this is the new API format with 'template' key (flat structure)
    // or the old format with 'templateJson' key (nested structure)
    final hasTemplate = json.containsKey('template');
    final hasTemplateJson = json.containsKey('templateJson');
    
    OMRTemplate serverTemplate;
    
    if (hasTemplate) {
      // New format: { template: {...}, examId: ..., answerKey: ... }
      // Convert to OMRTemplate.fromServerJson compatible format
      final inner = json['template'] as Map<String, dynamic>;
      final compatibleJson = {
        '_id': {'\$oid': 'generated_${DateTime.now().millisecondsSinceEpoch}'},
        'name': json['name'] ?? json['examId'] ?? 'Server Template',
        'templateJson': inner,
      };
      serverTemplate = OMRTemplate.fromServerJson(compatibleJson);
    } else if (hasTemplateJson) {
      // Old format: { _id: {...}, templateJson: {...}, name: ... }
      serverTemplate = OMRTemplate.fromServerJson(json);
    } else {
      // Direct format: treat whole JSON as templateJson
      serverTemplate = OMRTemplate.fromServerJson({'templateJson': json});
    }
    
    // Convert to AppOmrTemplate using exact coords from templateJson
    return _serverTemplateToAppTemplate(serverTemplate);
  }
  
  /// Convert OMRTemplate to AppOmrTemplate using exact coords from templateJson
  /// This replicates OMREngine._toAppTemplate logic
  AppOmrTemplate _serverTemplateToAppTemplate(OMRTemplate serverTemplate) {
    // Extract exact coordinates from templateJson.answers if available
    final Map<String, Map<String, Map<String, dynamic>>>? exactCoords =
        _extractExactCoords(serverTemplate.templateJson);
    
    final fieldBlocks = <AppOmrFieldBlock>[];
    
    // Convert existing field blocks
    for (final fb in serverTemplate.fieldBlocks) {
      // Get exact coords for this block if available
      List<AppBubbleCoord>? exactBubbleCoords;
      if (exactCoords != null) {
        exactBubbleCoords = <AppBubbleCoord>[];
        for (final label in fb.fieldLabels) {
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
      
      fieldBlocks.add(AppOmrFieldBlock(
        name: fb.name,
        originX: fb.originX,
        originY: fb.originY,
        shift: 0,
        bubbleWidth: fb.bubbleWidth,
        bubbleHeight: fb.bubbleHeight,
        fieldLabels: fb.fieldLabels,
        bubbleValues: fb.bubbleValues,
        bubblesGap: fb.bubblesGap.toDouble(),
        labelsGap: fb.labelsGap.toDouble(),
        direction: fb.direction.name,
        emptyValue: fb.emptyValue,
        exactCoords: exactBubbleCoords,
      ));
    }
    
    // Add Student ID field block
    fieldBlocks.addAll(_createStudentIdBlocks(serverTemplate.templateJson, serverTemplate.studentId));
    
    // Add Version Code field block
    fieldBlocks.addAll(_createVersionCodeBlocks(serverTemplate.templateJson, serverTemplate.versionCodeZone));
    
    final preprocessors = serverTemplate.preProcessors.map((pp) {
      return AppOmrPreProcessor(
        name: pp.name,
        options: pp.options,
      );
    }).toList();
    
    return AppOmrTemplate(
      pageWidth: serverTemplate.pageWidth,
      pageHeight: serverTemplate.pageHeight,
      bubbleWidth: serverTemplate.bubbleWidth,
      bubbleHeight: serverTemplate.bubbleHeight,
      fieldBlocks: fieldBlocks,
      preprocessors: preprocessors,
      procWidth: null,
      procHeight: null,
      minJump: 8.0,
      autoAlign: serverTemplate.autoAlign,
      useMarkers: false,
    );
  }
  
  /// Extract exact coordinates from templateJson.answers format
  Map<String, Map<String, Map<String, dynamic>>>? _extractExactCoords(Map<String, dynamic>? templateJson) {
    if (templateJson == null) return null;
    
    final answers = templateJson['answers'];
    if (answers is! Map) return null;
    
    final result = <String, Map<String, Map<String, dynamic>>>{};
    
    for (final entry in answers.entries) {
      final qId = entry.key.toString();
      final options = entry.value;
      if (options is Map) {
        result[qId] = <String, Map<String, dynamic>>{};
        for (final optEntry in options.entries) {
          final optKey = optEntry.key.toString();
          if (optEntry.value is Map) {
            result[qId]![optKey] = Map<String, dynamic>.from(optEntry.value as Map);
          } else {
            result[qId]![optKey] = {};
          }
        }
      }
    }
    
    return result.isEmpty ? null : result;
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
    
    // Parse all coords into AppBubbleCoord list
    final allCoords = <AppBubbleCoord>[];
    for (final c in coords) {
      if (c is Map) {
        final coord = Map<String, dynamic>.from(c);
        allCoords.add(AppBubbleCoord(
          label: 'student_code',
          value: (coord['value'] ?? 0).toString(),
          x: (coord['x'] as num?)?.toInt() ?? 0,
          y: (coord['y'] as num?)?.toInt() ?? 0,
          w: (coord['w'] as num?)?.toInt() ?? 46,
          h: (coord['h'] as num?)?.toInt() ?? 46,
        ));
      }
    }
    
    if (allCoords.isEmpty) return [];
    
    // Sort by x then y to get proper layout
    allCoords.sort((a, b) {
      final xDiff = a.x.compareTo(b.x);
      if (xDiff != 0) return xDiff;
      return a.y.compareTo(b.y);
    });
    
    // Find spacing from coords
    int xGap = 46;
    int yGap = 71;
    if (allCoords.length >= 2) {
      // Check if same x (vertical stack) or same y (horizontal row)
      if (allCoords[0].x == allCoords[1].x) {
        yGap = allCoords[1].y - allCoords[0].y;
      } else {
        xGap = allCoords[1].x - allCoords[0].x;
      }
    }
    
    return [
      AppOmrFieldBlock(
        name: 'student_code',
        originX: allCoords.first.x,
        originY: allCoords.first.y,
        shift: 0,
        bubbleWidth: allCoords.first.w,
        bubbleHeight: allCoords.first.h,
        fieldLabels: List.generate(allCoords.length, (i) => 'roll$i'),
        bubbleValues: List.generate(10, (i) => i.toString()),
        bubblesGap: yGap.toDouble(),
        labelsGap: xGap.toDouble(),
        direction: 'vertical',
        emptyValue: '',
        exactCoords: allCoords,
      ),
    ];
  }
  
  /// Create field blocks for Version Code from templateJson
  List<AppOmrFieldBlock> _createVersionCodeBlocks(
    Map<String, dynamic>? templateJson,
    VersionCodeField? versionCodeField,
  ) {
    if (templateJson == null) return [];
    
    final versionCodeZone = templateJson['versionCodeZone'] as Map<String, dynamic>?;
    if (versionCodeZone == null) return [];
    
    final coords = versionCodeZone['coords'] as List<dynamic>?;
    if (coords == null || coords.isEmpty) return [];
    
    // Parse all coords into AppBubbleCoord list
    final allCoords = <AppBubbleCoord>[];
    for (final c in coords) {
      if (c is Map) {
        final coord = Map<String, dynamic>.from(c);
        allCoords.add(AppBubbleCoord(
          label: 'version_code',
          value: (coord['value'] ?? 0).toString(),
          x: (coord['x'] as num?)?.toInt() ?? 0,
          y: (coord['y'] as num?)?.toInt() ?? 0,
          w: (coord['w'] as num?)?.toInt() ?? 46,
          h: (coord['h'] as num?)?.toInt() ?? 46,
        ));
      }
    }
    
    if (allCoords.isEmpty) return [];
    
    // Sort by x then y
    allCoords.sort((a, b) {
      final xDiff = a.x.compareTo(b.x);
      if (xDiff != 0) return xDiff;
      return a.y.compareTo(b.y);
    });
    
    // Find spacing
    int xGap = 46;
    int yGap = 71;
    if (allCoords.length >= 2) {
      if (allCoords[0].x == allCoords[1].x) {
        yGap = allCoords[1].y - allCoords[0].y;
      } else {
        xGap = allCoords[1].x - allCoords[0].x;
      }
    }
    
    return [
      AppOmrFieldBlock(
        name: 'version_code',
        originX: allCoords.first.x,
        originY: allCoords.first.y,
        shift: 0,
        bubbleWidth: allCoords.first.w,
        bubbleHeight: allCoords.first.h,
        fieldLabels: List.generate(allCoords.length, (i) => 'ver$i'),
        bubbleValues: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        bubblesGap: yGap.toDouble(),
        labelsGap: xGap.toDouble(),
        direction: 'vertical',
        emptyValue: '',
        exactCoords: allCoords,
      ),
    ];
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
