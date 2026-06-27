import 'package:flutter/foundation.dart';
import '../engine/app_omr_engine.dart';
import '../engine/app_omr_models.dart';
import '../models/omr_template.dart';
import '../models/field_block.dart';
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
    Map<String, String>? serverAnswerKey,
  }) async {
    debugPrint('═══ OmrEngineService Template Info ═══');
    debugPrint('Template keys: ${templateJson.keys.toList()}');
    final t = templateJson['template'] ?? templateJson;
    if (t is Map<String, dynamic>) {
      debugPrint('Template pageDimensions: ${t['pageDimensions']}');
      debugPrint('Template bubbleDimensions: ${t['bubbleDimensions']}');
      debugPrint('Template fieldBlocks: ${t['fieldBlocks']?.keys.toList() ?? 'none'}');
      debugPrint('Template answerKey: ${t['answerKey']}');
    }
    debugPrint('═══════════════════════════════════════');

    // LOG: Server answerKey override
    if (serverAnswerKey != null) {
      debugPrint('[OmrEngineService] Using SERVER answerKey (${serverAnswerKey.length} entries)');
      for (final e in serverAnswerKey.entries.take(5)) {
        debugPrint('  ${e.key} -> ${e.value}');
      }
      if (serverAnswerKey.length > 5) {
        debugPrint('  ... and ${serverAnswerKey.length - 5} more');
      }
    } else {
      debugPrint('[OmrEngineService] No server answerKey, using template answerKey');
    }

    final template = _convertToAppOmrTemplate(templateJson);
    
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

    // Extract answer key for grading AND annotation coloring
    // PRIORITY: serverAnswerKey > template answerKey
    final answerKey = serverAnswerKey ?? _extractAnswerKey(templateJson);

    debugPrint('[OmrEngineService] Final answerKey for grading (${answerKey.length} entries):');
    for (final e in answerKey.entries.take(10)) {
      debugPrint('  ${e.key} -> ${e.value}');
    }

    final engine = AppOMREngine(template);
    final (appResult, annotatedBytes) = engine.processImage(bytes, answerKey: answerKey);

    final scanResult = _convertToOmrScanResult(appResult, annotatedBytes);

    // Convert responses to answer format for grading
    final detectedAnswers = <String, String>{};
    for (final entry in appResult.responses.entries) {
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
    final hasTemplate = json.containsKey('template');
    final hasTemplateJson = json.containsKey('templateJson');
    
    OMRTemplate serverTemplate;
    
    if (hasTemplate) {
      // Server format: { template: {...}, answerKey: {...}, ... }
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
    
    return _serverTemplateToAppTemplate(serverTemplate);
  }
  
  AppOmrTemplate _serverTemplateToAppTemplate(OMRTemplate serverTemplate) {
    // Convert existing fieldBlocks from serverTemplate
    final fieldBlocks = serverTemplate.fieldBlocks.map((fb) {
      return AppOmrFieldBlock(
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
        exactCoords: _extractExactCoordsFromFieldBlock(fb),
      );
    }).toList();
    
    // Add Student ID blocks
    fieldBlocks.addAll(_createStudentIdBlocks(serverTemplate.templateJson, serverTemplate.studentId));
    
    // Add Version Code blocks
    fieldBlocks.addAll(_createVersionCodeBlocks(serverTemplate.templateJson, serverTemplate.versionCodeZone));
    
    final preprocessors = serverTemplate.preProcessors.map((pp) {
      return AppOmrPreProcessor(name: pp.name, options: pp.options);
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
  
  /// Extract exact coords from FieldBlock.traverseBubbles
  List<AppBubbleCoord>? _extractExactCoordsFromFieldBlock(FieldBlock fb) {
    if (fb.traverseBubbles.isEmpty) return null;
    
    final coords = <AppBubbleCoord>[];
    for (int labelIdx = 0; labelIdx < fb.traverseBubbles.length; labelIdx++) {
      if (labelIdx >= fb.fieldLabels.length) break;
      final label = fb.fieldLabels[labelIdx];
      final row = fb.traverseBubbles[labelIdx];
      for (int valueIdx = 0; valueIdx < row.length; valueIdx++) {
        if (valueIdx >= fb.bubbleValues.length) break;
        final bubble = row[valueIdx];
        coords.add(AppBubbleCoord(
          label: label,
          value: fb.bubbleValues[valueIdx],
          x: bubble.x,
          y: bubble.y,
          w: fb.bubbleWidth,
          h: fb.bubbleHeight,
        ));
      }
    }
    return coords.isEmpty ? null : coords;
  }
  
  /// Parse MCQ blocks from templateJson.answers
  /// Auto-detects AMC vs Hardcoded layout.
  List<AppOmrFieldBlock> _parseMCQBlocks(Map<String, dynamic>? templateJson) {
    if (templateJson == null) return [];
    
    final answers = templateJson['answers'];
    if (answers is! Map) return [];
    
    final questions = <_QInfo>[];
    for (final entry in answers.entries) {
      final qId = entry.key.toString();
      final options = entry.value as Map;
      if (options.isEmpty) continue;
      
      final optPositions = <String, _Point>{};
      for (final optEntry in options.entries) {
        final optKey = optEntry.key.toString();
        final coord = optEntry.value as Map<String, dynamic>?;
        if (coord != null) {
          optPositions[optKey] = _Point(
            (coord['x'] as num?)?.toInt() ?? 0,
            (coord['y'] as num?)?.toInt() ?? 0,
          );
        }
      }
      
      if (optPositions.isNotEmpty) {
        final firstOpt = optPositions.values.first;
        questions.add(_QInfo(
          id: qId,
          firstX: firstOpt.x,
          firstY: firstOpt.y,
          options: optPositions,
        ));
      }
    }
    
    if (questions.isEmpty) return [];
    
    final layoutType = _detectMCQLayout(questions);
    debugPrint('MCQ Layout detected: ${layoutType == _MCQLayoutType.amc ? "AMC" : "Hardcoded"}');
    
    final groups = layoutType == _MCQLayoutType.amc
        ? _groupByColumn(questions)
        : _groupByRow(questions);
    
    debugPrint('MCQ Groups: ${groups.length}');
    for (int i = 0; i < groups.length; i++) {
      debugPrint('  Group $i: ${groups[i].length} questions, origin=(${groups[i].first.firstX},${groups[i].first.firstY})');
    }
    
    final fieldBlocks = <AppOmrFieldBlock>[];
    
    for (int i = 0; i < groups.length; i++) {
      final group = groups[i];
      
      if (layoutType == _MCQLayoutType.amc) {
        group.sort((a, b) => a.firstY.compareTo(b.firstY));
      } else {
        group.sort((a, b) => a.firstX.compareTo(b.firstX));
      }
      
      final bubbleCoords = <AppBubbleCoord>[];
      final fieldLabels = <String>[];
      
      for (final q in group) {
        fieldLabels.add(q.id);
        for (final entry in q.options.entries) {
          bubbleCoords.add(AppBubbleCoord(
            label: q.id,
            value: entry.key,
            x: entry.value.x,
            y: entry.value.y,
            w: 46,
            h: 46,
          ));
        }
      }
      
      if (bubbleCoords.isEmpty) continue;
      
      final originX = group.first.firstX;
      final originY = group.first.firstY;
      
      int bubblesGap;
      int labelsGap;
      String direction;
      
      if (layoutType == _MCQLayoutType.amc) {
        direction = 'horizontal';
        
        final firstQBubbles = bubbleCoords.where((b) => b.label == group.first.id).toList()
          ..sort((a, b) => a.x.compareTo(b.x));
        if (firstQBubbles.length >= 2) {
          bubblesGap = firstQBubbles[1].x - firstQBubbles[0].x;
        } else {
          bubblesGap = 75;
        }
        
        if (group.length >= 2) {
          labelsGap = group[1].firstY - group[0].firstY;
        } else {
          labelsGap = 68;
        }
      } else {
        direction = 'vertical';
        
        final firstQBubbles = bubbleCoords.where((b) => b.label == group.first.id).toList()
          ..sort((a, b) => a.y.compareTo(b.y));
        if (firstQBubbles.length >= 2) {
          bubblesGap = firstQBubbles[1].y - firstQBubbles[0].y;
        } else {
          bubblesGap = 46;
        }
        
        if (group.length >= 2) {
          labelsGap = group[1].firstX - group[0].firstX;
        } else {
          labelsGap = 607;
        }
      }
      
      fieldBlocks.add(AppOmrFieldBlock(
        name: 'MCQBlock${i + 1}',
        originX: originX,
        originY: originY,
        shift: 0,
        bubbleWidth: 46,
        bubbleHeight: 46,
        fieldLabels: fieldLabels,
        bubbleValues: ['A', 'B', 'C', 'D'],
        bubblesGap: bubblesGap.toDouble(),
        labelsGap: labelsGap.toDouble(),
        direction: direction,
        emptyValue: '',
        exactCoords: bubbleCoords,
      ));
    }
    
    return fieldBlocks;
  }

  _MCQLayoutType _detectMCQLayout(List<_QInfo> questions) {
    if (questions.length < 2) return _MCQLayoutType.hardcoded;
    
    final q1 = questions[0];
    final q2 = questions[1];
    
    final dX = (q2.firstX - q1.firstX).abs();
    final dY = (q2.firstY - q1.firstY).abs();
    
    if (dY > dX * 2) {
      return _MCQLayoutType.amc;
    } else if (dX > dY * 2) {
      return _MCQLayoutType.hardcoded;
    }
    
    if (q1.options.length >= 2) {
      final opts = q1.options.entries.toList();
      final dx = (opts[1].value.x - opts[0].value.x).abs();
      final dy = (opts[1].value.y - opts[0].value.y).abs();
      return dx > dy ? _MCQLayoutType.amc : _MCQLayoutType.hardcoded;
    }
    
    return _MCQLayoutType.hardcoded;
  }

  List<List<_QInfo>> _groupByColumn(List<_QInfo> questions) {
    final columns = <_QInfoColumn>[];
    
    for (final q in questions) {
      _QInfoColumn? target;
      for (final col in columns) {
        if ((q.firstX - col.baseX).abs() <= 50) {
          target = col;
          break;
        }
      }
      if (target == null) {
        target = _QInfoColumn(baseX: q.firstX);
        columns.add(target);
      }
      target.questions.add(q);
    }
    
    columns.sort((a, b) => a.baseX.compareTo(b.baseX));
    return columns.map((c) => c.questions).toList();
  }

  List<List<_QInfo>> _groupByRow(List<_QInfo> questions) {
    final rows = <_QInfoColumn>[];
    
    for (final q in questions) {
      _QInfoColumn? target;
      for (final row in rows) {
        if ((q.firstY - row.baseY).abs() <= 70) {
          target = row;
          break;
        }
      }
      if (target == null) {
        target = _QInfoColumn(baseY: q.firstY);
        rows.add(target);
      }
      target.questions.add(q);
    }
    
    rows.sort((a, b) => a.baseY.compareTo(b.baseY));
    return rows.map((r) => r.questions).toList();
  }
  
  List<AppOmrFieldBlock> _createStudentIdBlocks(
    Map<String, dynamic>? templateJson,
    StudentIdField? studentIdField,
  ) {
    if (templateJson == null) return [];
    
    final studentId = templateJson['studentId'] as Map<String, dynamic>?;
    if (studentId == null) return [];
    
    final coords = studentId['coords'] as List<dynamic>?;
    if (coords == null || coords.isEmpty) return [];
    
    final coordsByDigit = <int, List<Map<String, dynamic>>>{};
    for (final c in coords) {
      if (c is Map) {
        final digit = (c['digit'] as num?)?.toInt() ?? 0;
        coordsByDigit.putIfAbsent(digit, () => []).add(Map<String, dynamic>.from(c));
      }
    }
    
    if (coordsByDigit.isEmpty) return [];
    
    final sortedDigits = coordsByDigit.keys.toList()..sort();
    final fieldBlocks = <AppOmrFieldBlock>[];
    
    debugPrint('Student ID: ${sortedDigits.length} digits');
    
    for (int digitIdx = 0; digitIdx < sortedDigits.length; digitIdx++) {
      final digit = sortedDigits[digitIdx];
      final digitCoords = coordsByDigit[digit]!;
      
      // Sort by value (1-10)
      digitCoords.sort((a, b) => ((a['value'] as num?)?.toInt() ?? 0)
          .compareTo((b['value'] as num?)?.toInt() ?? 0));
      
      final bubbleCoords = <AppBubbleCoord>[];
      for (final coord in digitCoords) {
        bubbleCoords.add(AppBubbleCoord(
          label: 'sbd${digitIdx + 1}',
          value: (coord['value'] ?? 0).toString(),
          x: (coord['x'] as num?)?.toInt() ?? 0,
          y: (coord['y'] as num?)?.toInt() ?? 0,
          w: (coord['w'] as num?)?.toInt() ?? 46,
          h: (coord['h'] as num?)?.toInt() ?? 46,
        ));
      }
      
      if (bubbleCoords.isNotEmpty) {
        int yGap = 71;
        if (bubbleCoords.length >= 2) {
          yGap = bubbleCoords[1].y - bubbleCoords[0].y;
        }
        
        fieldBlocks.add(AppOmrFieldBlock(
          name: 'student_code_digit_$digitIdx',
          originX: bubbleCoords.first.x,
          originY: bubbleCoords.first.y,
          shift: 0,
          bubbleWidth: bubbleCoords.first.w,
          bubbleHeight: bubbleCoords.first.h,
          fieldLabels: ['sbd${digitIdx + 1}'],
          bubbleValues: List.generate(10, (i) => '${i + 1}'),
          bubblesGap: yGap.toDouble(),
          labelsGap: 0,
          direction: 'vertical',
          emptyValue: '',
          exactCoords: bubbleCoords,
        ));
      }
    }
    
    return fieldBlocks;
  }
  
  List<AppOmrFieldBlock> _createVersionCodeBlocks(
    Map<String, dynamic>? templateJson,
    VersionCodeField? versionCodeField,
  ) {
    if (templateJson == null) return [];
    
    final versionCodeZone = templateJson['versionCodeZone'] as Map<String, dynamic>?;
    if (versionCodeZone == null) return [];
    
    final coords = versionCodeZone['coords'] as List<dynamic>?;
    if (coords == null || coords.isEmpty) return [];
    
    final coordsByDigit = <int, List<Map<String, dynamic>>>{};
    for (final c in coords) {
      if (c is Map) {
        final digit = (c['digit'] as num?)?.toInt() ?? 0;
        coordsByDigit.putIfAbsent(digit, () => []).add(Map<String, dynamic>.from(c));
      }
    }
    
    if (coordsByDigit.isEmpty) return [];
    
    final sortedDigits = coordsByDigit.keys.toList()..sort();
    final fieldBlocks = <AppOmrFieldBlock>[];
    
    debugPrint('Version Code: ${sortedDigits.length} digits');
    
    for (int digitIdx = 0; digitIdx < sortedDigits.length; digitIdx++) {
      final digit = sortedDigits[digitIdx];
      final digitCoords = coordsByDigit[digit]!;
      
      // Sort by value (1-10)
      digitCoords.sort((a, b) => ((a['value'] as num?)?.toInt() ?? 0)
          .compareTo((b['value'] as num?)?.toInt() ?? 0));
      
      final bubbleCoords = <AppBubbleCoord>[];
      for (final coord in digitCoords) {
        bubbleCoords.add(AppBubbleCoord(
          label: 'ver${digitIdx + 1}',
          value: (coord['value'] ?? 0).toString(),
          x: (coord['x'] as num?)?.toInt() ?? 0,
          y: (coord['y'] as num?)?.toInt() ?? 0,
          w: (coord['w'] as num?)?.toInt() ?? 46,
          h: (coord['h'] as num?)?.toInt() ?? 46,
        ));
      }
      
      if (bubbleCoords.isNotEmpty) {
        int yGap = 71;
        if (bubbleCoords.length >= 2) {
          yGap = bubbleCoords[1].y - bubbleCoords[0].y;
        }
        
        fieldBlocks.add(AppOmrFieldBlock(
          name: 'version_code_digit_$digitIdx',
          originX: bubbleCoords.first.x,
          originY: bubbleCoords.first.y,
          shift: 0,
          bubbleWidth: bubbleCoords.first.w,
          bubbleHeight: bubbleCoords.first.h,
          fieldLabels: ['ver${digitIdx + 1}'],
          bubbleValues: List.generate(10, (i) => '${i + 1}'),
          bubblesGap: yGap.toDouble(),
          labelsGap: 0,
          direction: 'vertical',
          emptyValue: '',
          exactCoords: bubbleCoords,
        ));
      }
    }
    
    return fieldBlocks;
  }

  OmrScanResult _convertToOmrScanResult(AppOmrResult result, Uint8List? annotatedBytes) {
    // Collect all student ID and version code entries first
    final studentIdEntries = <int, String>{};
    final versionCodeEntries = <int, String>{};

    for (final entry in result.responses.entries) {
      final key = entry.key;
      final value = entry.value;
      if (value.isEmpty) continue;

      if (key.startsWith('sbd') || key.startsWith('student')) {
        // Extract digit number from label (sbd1, sbd2, etc.)
        final digitStr = key.replaceAll(RegExp(r'[^0-9]'), '');
        final digit = int.tryParse(digitStr) ?? 0;
        studentIdEntries[digit] = value;
      } else if (key.startsWith('ver')) {
        // Extract digit number from label (ver1, ver2, etc.)
        final digitStr = key.replaceAll(RegExp(r'[^0-9]'), '');
        final digit = int.tryParse(digitStr) ?? 0;
        versionCodeEntries[digit] = value;
      }
    }

    // Build studentId and versionCode in correct order
    // AMC layout: columns are right-to-left, so we need to iterate in reverse
    // to read digits left-to-right (from sheet's perspective)
    // Also: AMC uses bubble values 1-10 to represent digits 0-9
    final studentIdDigits = studentIdEntries.keys.toList()..sort();
    final versionCodeDigits = versionCodeEntries.keys.toList()..sort();

    String studentId = '';
    String versionCode = '';

    // Read student ID: reverse order to correct right-to-left AMC layout
    // Convert bubble value (1-10) to digit (0-9) by subtracting 1
    for (final digit in studentIdDigits.reversed) {
      final value = studentIdEntries[digit];
      if (value != null && value.isNotEmpty) {
        final digitValue = (int.tryParse(value) ?? 1) - 1;
        studentId += digitValue.toString();
      }
    }

    // Read version code: reverse order to correct right-to-left AMC layout
    // Convert bubble value (1-10) to digit (0-9) by subtracting 1
    for (final digit in versionCodeDigits.reversed) {
      final value = versionCodeEntries[digit];
      if (value != null && value.isNotEmpty) {
        final digitValue = (int.tryParse(value) ?? 1) - 1;
        versionCode += digitValue.toString();
      }
    }

    debugPrint('Scanned: studentId=$studentId, versionCode=$versionCode');
    debugPrint('Responses: ${result.responses}');

    return OmrScanResult(
      studentId: studentId,
      versionCode: versionCode,
      answers: Map.fromEntries(
        result.responses.entries.where(
          (e) => e.key.startsWith('q'),
        ),
      ),
      processingTime: Duration.zero,
      processingSteps: [result.preprocessorUsed],
      wasWarped: result.warpSucceeded,
    );
  }

  /// Extract answer key from template JSON.
  /// Handles both formats:
  /// - Server format: { answerKey: { 1: "A", 2: "B" } }  (numeric keys)
  /// - Internal format: { template: { answerKey: { "q1": "A", "q2": "B" } } } (string keys)
  Map<String, String> _extractAnswerKey(Map<String, dynamic> templateJson) {
    final answerKey = <String, String>{};
    
    // Try server format first: answerKey at root level with numeric keys
    if (templateJson.containsKey('answerKey')) {
      final ak = templateJson['answerKey'];
      if (ak is Map) {
        for (final entry in ak.entries) {
          final key = entry.key.toString();
          final value = entry.value?.toString() ?? '';
          // Convert numeric key to q-prefixed key
          if (int.tryParse(key) != null) {
            answerKey['q$key'] = value;
          } else {
            answerKey[key] = value;
          }
        }
      }
      debugPrint('AnswerKey (from root): ${answerKey.length} entries');
    }
    
    // Also check nested format: template.answerKey
    final t = templateJson['template'];
    if (t is Map<String, dynamic> && t.containsKey('answerKey')) {
      final ak = t['answerKey'];
      if (ak is Map) {
        for (final entry in ak.entries) {
          final key = entry.key.toString();
          final value = entry.value?.toString() ?? '';
          if (!answerKey.containsKey(key)) {
            if (int.tryParse(key) != null) {
              answerKey['q$key'] = value;
            } else {
              answerKey[key] = value;
            }
          }
        }
      }
      debugPrint('AnswerKey (from template): ${answerKey.length} entries');
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
    final numQuestions = answerKey.isNotEmpty ? answerKey.length : detectedAnswers.length;
    final scorePerQ = numQuestions > 0 ? totalScore / numQuestions : 1.0;

    debugPrint('═══ GRADING STEP ═══');
    debugPrint('[GRADING] totalScore=$totalScore, numQuestions=$numQuestions, scorePerQ=$scorePerQ');
    debugPrint('[GRADING] AnswerKey entries:');
    for (final e in answerKey.entries) {
      debugPrint('  ${e.key} -> ${e.value}');
    }
    debugPrint('[GRADING] DetectedAnswers entries:');
    for (final e in detectedAnswers.entries) {
      debugPrint('  ${e.key} -> ${e.value}');
    }

    final questionScores = <QuestionScoreResult>[];
    int correctCount = 0;
    int incorrectCount = 0;
    int unmarkedCount = 0;

    for (final entry in answerKey.entries) {
      final qId = entry.key;
      final correct = entry.value;

      // Normalize keys for matching: handle both "1" and "q1" formats
      // answerKey might use "1" while detectedAnswers uses "q1"
      String? detected;
      if (detectedAnswers.containsKey(qId)) {
        detected = detectedAnswers[qId];
      } else if (qId.startsWith('q')) {
        // Try without "q" prefix
        final withoutQ = qId.substring(1);
        if (detectedAnswers.containsKey(withoutQ)) {
          detected = detectedAnswers[withoutQ];
        }
      } else {
        // Try with "q" prefix
        final withQ = 'q$qId';
        if (detectedAnswers.containsKey(withQ)) {
          detected = detectedAnswers[withQ];
        }
      }

      bool isCorrect = false;
      bool isUnmarked = detected == null || detected.isEmpty;

      if (!isUnmarked) {
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
        detectedAnswer: detected,
        correctAnswer: correct,
        isCorrect: isCorrect,
        isUnmarked: isUnmarked,
        score: isCorrect ? scorePerQ : 0,
        maxScore: scorePerQ,
      ));
    }

    questionScores.sort((a, b) => a.position.compareTo(b.position));

    final obtainedScore = correctCount * scorePerQ;
    final percentage = numQuestions > 0 ? (obtainedScore / totalScore) * 100 : 0.0;

    debugPrint('[GRADING] Result: score=$obtainedScore/$totalScore, correct=$correctCount, incorrect=$incorrectCount, unmarked=$unmarkedCount');
    debugPrint('[GRADING] Question details:');
    for (final qs in questionScores) {
      debugPrint('  Q${qs.position}: detected=${qs.detectedAnswer ?? "unmarked"}, correct=${qs.correctAnswer}, isCorrect=${qs.isCorrect}');
    }
    debugPrint('═══ END GRADING ═══');

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

// Helper classes
class _QInfo {
  final String id;
  final int firstX;
  final int firstY;
  final Map<String, _Point> options;
  
  _QInfo({required this.id, required this.firstX, required this.firstY, required this.options});
}

class _QInfoColumn {
  final int baseX;
  final int baseY;
  final List<_QInfo> questions;
  
  _QInfoColumn({int? baseX, int? baseY})
      : baseX = baseX ?? 0,
        baseY = baseY ?? 0,
        questions = [];
}

class _Point {
  final int x;
  final int y;
  const _Point(this.x, this.y);
}

enum _MCQLayoutType {
  amc,
  hardcoded,
}
