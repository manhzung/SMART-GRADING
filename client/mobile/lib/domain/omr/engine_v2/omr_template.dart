class OmrBubbleCoords {
  final int x, y, w, h;
  final int? digit;
  final int? value;
  
  OmrBubbleCoords(this.x, this.y, this.w, this.h, {this.digit, this.value});

  factory OmrBubbleCoords.fromJson(Map<String, dynamic> json) {
    return OmrBubbleCoords(
      (json['x'] as num).toInt(),
      (json['y'] as num).toInt(),
      (json['w'] as num).toInt(),
      (json['h'] as num).toInt(),
      digit: json['digit'] != null ? (json['digit'] as num).toInt() : null,
      value: json['value'] != null ? (json['value'] as num).toInt() : null,
    );
  }
}

class OmrTemplate {
  final String examId;
  final String versionCode;
  final List<OmrBubbleCoords> studentIdCoords;
  final List<OmrBubbleCoords> versionCodeCoords;
  final Map<String, Map<String, OmrBubbleCoords>> answers;
  final Map<String, String> answerKey;
  final Map<String, double> questionScores;
  final double totalScore;
  final int numberOfQuestions;
  final int pageWidth;
  final int pageHeight;
  final double scale;

  OmrTemplate({
    required this.examId,
    required this.versionCode,
    required this.studentIdCoords,
    required this.versionCodeCoords,
    required this.answers,
    required this.answerKey,
    required this.questionScores,
    required this.totalScore,
    required this.numberOfQuestions,
    this.pageWidth = 2480,
    this.pageHeight = 3508,
    this.scale = 300 / 72,
  });

  /// Parse FieldBlock format from convertTemplate()
  /// 
  /// FieldBlock format:
  /// {
  ///   pageDimensions: [w, h],
  ///   bubbleDimensions: [bw, bh],
  ///   fieldBlocks: {
  ///     student_code: { fieldType: 'QTYPE_INT', fieldLabels: ['roll1',...], origin: [x,y], bubblesGap: bh+gap, labelsGap: bw+gap, bubbleWidth: bw, bubbleHeight: bh },
  ///     version_code: { ... },
  ///     answer_area_col_0: { fieldType: 'QTYPE_MCQ4', fieldLabels: ['q1','q2',...], direction: 'horizontal', origin: [x,y], bubblesGap: stepX, labelsGap: stepY, bubbleWidth: bw, bubbleHeight: bh },
  ///     ...
  ///   },
  ///   outputColumns: ['q1', 'q2', ...],
  ///   emptyValue: '',
  /// }
  factory OmrTemplate.fromFieldBlocks(Map<String, dynamic> t) {
    final fieldBlocks = t['fieldBlocks'] as Map<String, dynamic>? ?? {};
    final pageDims = t['pageDimensions'] as List?;
    final pageWidth = pageDims != null && pageDims.isNotEmpty ? (pageDims[0] as num).toInt() : 2480;
    final pageHeight = pageDims != null && pageDims.length >= 2 ? (pageDims[1] as num).toInt() : 3508;
    
    final bubbleDims = t['bubbleDimensions'] as List?;
    final defaultBw = bubbleDims != null && bubbleDims.isNotEmpty ? (bubbleDims[0] as num).toDouble() : 47.0;
    final defaultBh = bubbleDims != null && bubbleDims.length >= 2 ? (bubbleDims[1] as num).toDouble() : 47.0;
    
    final outputColumns = (t['outputColumns'] as List?)?.cast<String>() ?? [];
    final totalScore = (t['totalScore'] as num?)?.toDouble() ?? 10.0;
    final totalQuestions = outputColumns.length;
    final scorePerQ = totalQuestions > 0 ? totalScore / totalQuestions : 1.0;

    // Parse student ID block
    final studentIdCoords = <OmrBubbleCoords>[];
    final scBlock = fieldBlocks['student_code'] as Map<String, dynamic>?;
    if (scBlock != null) {
      final origin = (scBlock['origin'] as List?)?.cast<num>() ?? [0, 0];
      final ox = origin[0].toInt();
      final oy = origin[1].toInt();
      final bw = (scBlock['bubbleWidth'] as num?)?.toDouble() ?? defaultBw;
      final bh = (scBlock['bubbleHeight'] as num?)?.toDouble() ?? defaultBh;
      final digitGap = (scBlock['bubblesGap'] as num?)?.toDouble() ?? bh;
      final labels = (scBlock['fieldLabels'] as List?)?.cast<String>() ?? [];
      
      for (int d = 0; d < labels.length; d++) {
        for (int v = 0; v < 10; v++) {
          studentIdCoords.add(OmrBubbleCoords(
            ox + (d * digitGap).toInt(),
            oy + (v * bh).toInt(),
            bw.toInt(),
            bh.toInt(),
            digit: d,
            value: v,
          ));
        }
      }
    }

    // Parse version code block
    final versionCodeCoords = <OmrBubbleCoords>[];
    final vcBlock = fieldBlocks['version_code'] as Map<String, dynamic>?;
    if (vcBlock != null) {
      final origin = (vcBlock['origin'] as List?)?.cast<num>() ?? [0, 0];
      final ox = origin[0].toInt();
      final oy = origin[1].toInt();
      final bw = (vcBlock['bubbleWidth'] as num?)?.toDouble() ?? defaultBw;
      final bh = (vcBlock['bubbleHeight'] as num?)?.toDouble() ?? defaultBh;
      final digitGap = (vcBlock['bubblesGap'] as num?)?.toDouble() ?? bw;
      final labels = (vcBlock['fieldLabels'] as List?)?.cast<String>() ?? [];
      
      for (int d = 0; d < labels.length; d++) {
        for (int v = 1; v <= 4; v++) {
          versionCodeCoords.add(OmrBubbleCoords(
            ox + (d * digitGap).toInt(),
            oy + ((v - 1) * bh).toInt(),
            bw.toInt(),
            bh.toInt(),
            digit: d,
            value: v,
          ));
        }
      }
    }

    // Parse answer blocks (QTYPE_MCQ4)
    final answers = <String, Map<String, OmrBubbleCoords>>{};
    final answerKey = <String, String>{};
    final questionScores = <String, double>{};

    for (final entry in fieldBlocks.entries) {
      final name = entry.key;
      if (!name.startsWith('answer_area_col_')) continue;
      
      final block = entry.value as Map<String, dynamic>;
      if (block['fieldType'] != 'QTYPE_MCQ4') continue;
      
      final origin = (block['origin'] as List?)?.cast<num>() ?? [0, 0];
      final ox = origin[0].toInt();
      final oy = origin[1].toInt();
      final bw = (block['bubbleWidth'] as num?)?.toDouble() ?? defaultBw;
      final bh = (block['bubbleHeight'] as num?)?.toDouble() ?? defaultBh;
      final stepX = (block['bubblesGap'] as num?)?.toDouble() ?? (bw + 12);
      final stepY = (block['labelsGap'] as num?)?.toDouble() ?? (bh + 20);
      final labels = (block['fieldLabels'] as List?)?.cast<String>() ?? [];
      
      for (int i = 0; i < labels.length; i++) {
        final qId = labels[i];
        if (qId == null || !qId.startsWith('q')) continue;
        
        answers[qId] = {};
        final baseY = oy + (i * stepY).toInt();
        
        for (int j = 0; j < 4; j++) {
          final letter = ['A', 'B', 'C', 'D'][j];
          answers[qId]![letter] = OmrBubbleCoords(
            ox + (j * stepX).toInt(),
            baseY,
            bw.toInt(),
            bh.toInt(),
          );
        }
        
        // Default answer key & score
        answerKey[qId] = 'A';
        questionScores[qId] = scorePerQ;
      }
    }

    return OmrTemplate(
      examId: t['examId']?.toString() ?? '',
      versionCode: '',
      studentIdCoords: studentIdCoords,
      versionCodeCoords: versionCodeCoords,
      answers: answers,
      answerKey: answerKey,
      questionScores: questionScores,
      totalScore: totalScore,
      numberOfQuestions: totalQuestions,
      pageWidth: pageWidth,
      pageHeight: pageHeight,
      scale: 300 / 72,
    );
  }

  /// Parse AMC format (legacy) or FieldBlock format
  factory OmrTemplate.fromJson(Map<String, dynamic> json) {
    final t = json['template'] != null
        ? json['template'] as Map<String, dynamic>
        : json;

    // Detect format: FieldBlock has fieldBlocks[], AMC has answers{}
    if (t['fieldBlocks'] != null) {
      return OmrTemplate.fromFieldBlocks(t);
    }

    // Legacy AMC format parsing
    final studentIdCoords = <OmrBubbleCoords>[];
    final studentIdZone = t['studentId'];
    if (studentIdZone is Map) {
      final coords = studentIdZone['coords'];
      if (coords is List) {
        for (final c in coords) {
          studentIdCoords.add(OmrBubbleCoords.fromJson(c as Map<String, dynamic>));
        }
      }
    }

    final versionCodeCoords = <OmrBubbleCoords>[];
    final versionCodeZone = t['versionCodeZone'] ?? t['versionCode'];
    if (versionCodeZone is Map) {
      final coords = versionCodeZone['coords'];
      if (coords is List) {
        for (final c in coords) {
          versionCodeCoords.add(OmrBubbleCoords.fromJson(c as Map<String, dynamic>));
        }
      }
    }

    final answers = <String, Map<String, OmrBubbleCoords>>{};
    if (t['answers'] != null) {
      for (final entry in (t['answers'] as Map).entries) {
        answers[entry.key as String] = {};
        for (final opt in (entry.value as Map).entries) {
          answers[entry.key]![opt.key as String] =
              OmrBubbleCoords.fromJson(opt.value as Map<String, dynamic>);
        }
      }
    }

    final questionScores = <String, double>{};
    if (t['questionScores'] != null) {
      for (final entry in (t['questionScores'] as Map).entries) {
        questionScores[entry.key.toString()] = (entry.value as num).toDouble();
      }
    }

    final answerKey = <String, String>{};
    if (t['answerKey'] != null) {
      for (final entry in (t['answerKey'] as Map).entries) {
        answerKey[entry.key.toString()] = entry.value.toString();
      }
    }

    return OmrTemplate(
      examId: t['examId']?.toString() ?? '',
      versionCode: t['versionCode']?.toString() ?? '',
      studentIdCoords: studentIdCoords,
      versionCodeCoords: versionCodeCoords,
      answers: answers,
      answerKey: answerKey,
      questionScores: questionScores,
      totalScore: (t['totalScore'] as num?)?.toDouble() ?? 10.0,
      numberOfQuestions: (t['numberOfQuestions'] as num?)?.toInt() ?? 0,
      pageWidth: (t['pageWidth'] as num?)?.toInt() ?? 2480,
      pageHeight: (t['pageHeight'] as num?)?.toInt() ?? 3508,
      scale: (t['scale'] as num?)?.toDouble() ?? (300 / 72),
    );
  }
}
