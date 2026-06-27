import 'bubble.dart';
import 'field_block.dart';
import 'template_layout.dart';

/// Represents the student ID field (Số báo danh) in AMC templates.
/// Contains coordinates for each digit position and possible values.
class StudentIdField {
  final int digits;
  final List<IdBubbleCoord> coords;

  const StudentIdField({
    required this.digits,
    required this.coords,
  });

  factory StudentIdField.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return const StudentIdField(digits: 0, coords: []);
    }
    final coordsRaw = json['coords'] as List<dynamic>? ?? [];
    final coords = coordsRaw
        .map((c) => IdBubbleCoord.fromJson(c as Map<String, dynamic>))
        .toList();
    return StudentIdField(
      digits: (json['digits'] as num?)?.toInt() ?? 7,
      coords: coords,
    );
  }
}

/// Represents a single bubble coordinate with digit/position info.
class IdBubbleCoord {
  final int x;
  final int y;
  final int w;
  final int h;
  final int digit;  // Position index (0, 1, 2...)
  final int value;  // Value at this position (0-9 for student ID)

  const IdBubbleCoord({
    required this.x,
    required this.y,
    required this.w,
    required this.h,
    required this.digit,
    required this.value,
  });

  factory IdBubbleCoord.fromJson(Map<String, dynamic> json) {
    return IdBubbleCoord(
      x: (json['x'] as num?)?.toInt() ?? 0,
      y: (json['y'] as num?)?.toInt() ?? 0,
      w: (json['w'] as num?)?.toInt() ?? 20,
      h: (json['h'] as num?)?.toInt() ?? 20,
      digit: (json['digit'] as num?)?.toInt() ?? 0,
      value: (json['value'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Represents the version code field (Mã đề) in AMC templates.
class VersionCodeField {
  final int digits;
  final List<IdBubbleCoord> coords;

  const VersionCodeField({
    required this.digits,
    required this.coords,
  });

  factory VersionCodeField.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return const VersionCodeField(digits: 0, coords: []);
    }
    final coordsRaw = json['coords'] as List<dynamic>? ?? [];
    final coords = coordsRaw
        .map((c) => IdBubbleCoord.fromJson(c as Map<String, dynamic>))
        .toList();
    return VersionCodeField(
      digits: (json['digits'] as num?)?.toInt() ?? 2,
      coords: coords,
    );
  }
}

/// Represents a fiducial marker (4 góc tròn) for document alignment/cropping.
class FiducialMarker {
  final int x;
  final int y;
  final int radius;

  const FiducialMarker({
    required this.x,
    required this.y,
    required this.radius,
  });

  factory FiducialMarker.fromJson(Map<String, dynamic> json) {
    return FiducialMarker(
      x: (json['x'] as num?)?.toInt() ?? 0,
      y: (json['y'] as num?)?.toInt() ?? 0,
      radius: (json['radius'] as num?)?.toInt() ?? 15,
    );
  }

  Map<String, dynamic> toJson() => {'x': x, 'y': y, 'radius': radius};
}

/// Represents an OMR template configuration parsed from template.json.
class OMRTemplate {
  final String? id;
  final String name;
  final int pageWidth;
  final int pageHeight;
  final int bubbleWidth;
  final int bubbleHeight;
  final String emptyValue;
  final List<String> outputColumns;
  final List<FieldBlock> fieldBlocks;
  final Map<String, List<String>> customLabels;
  final List<OMRPreProcessor> preProcessors;

  /// When true (default), the OMR engine auto-aligns detected bubbles by computing
  /// small X-shifts to compensate for scan misalignment. When false, the engine uses
  /// the template coordinates exactly - useful for templates that have been visually
  /// calibrated against a real scanned sheet.
  final bool autoAlign;

  /// Student ID field (Số báo danh) - extracted from AMC calage data.
  final StudentIdField? studentId;

  /// Version code field (Mã đề) - extracted from AMC calage data.
  final VersionCodeField? versionCodeZone;

  /// Answer key extracted from CSV (format: {'q1': 'A', 'q2': 'B', ...}).
  final Map<String, String>? answerKey;

  /// Question scores (format: {'q1': 0.5, 'q2': 0.5, ...}).
  final Map<String, double>? questionScores;

  /// 4 fiducial markers for document alignment (top-left, top-right, bottom-right, bottom-left).
  final List<FiducialMarker>? fiducialMarkers;

  /// Raw templateJson from server - used by overlay for accurate bubble positions.
  final Map<String, dynamic>? templateJson;

  const OMRTemplate({
    this.id,
    required this.name,
    required this.pageWidth,
    required this.pageHeight,
    required this.bubbleWidth,
    required this.bubbleHeight,
    required this.emptyValue,
    required this.outputColumns,
    required this.fieldBlocks,
    required this.customLabels,
    required this.preProcessors,
    this.autoAlign = true,
    this.studentId,
    this.versionCodeZone,
    this.answerKey,
    this.questionScores,
    this.fiducialMarkers,
    this.templateJson,
  });

  Map<String, dynamic> toJson() {
    final fieldBlocksMap = <String, dynamic>{};
    for (final block in fieldBlocks) {
      fieldBlocksMap[block.name] = block.toConfig();
    }

    return {
      '_id': id,
      'name': name,
      'pageDimensions': [pageWidth, pageHeight],
      'bubbleDimensions': [bubbleWidth, bubbleHeight],
      'emptyValue': emptyValue,
      'outputColumns': outputColumns,
      'fieldBlocks': fieldBlocksMap,
      'customLabels': customLabels,
      'preProcessors': preProcessors.map((p) => {
        'name': p.name,
        'options': p.options,
      }).toList(),
      'autoAlign': autoAlign,
    };
  }

  /// Debug-only: validate this template against the layout calculator
  /// (no-overlap rules, page bounds). Stripped out in release builds
  /// because the entire body is wrapped in `assert`.
  ///
  /// Factories call this with `.._debugValidate()` to catch layout
  /// mistakes at the first place they appear, in tests and during
  /// development, without paying any cost in production.
  void _debugValidate() {
    assert(
      () {
        TemplateLayout.assertNoOverlap(this);
        return true;
      }(),
      'OMRTemplate "$name" failed layout validation. '
      'See TemplateLayout.assertNoOverlap for the specific rule.',
    );
  }

  factory OMRTemplate.fromJson(Map<String, dynamic> json) {
    final pageDims = json['pageDimensions'] as List<dynamic>?;
    final bubbleDims = json['bubbleDimensions'] as List<dynamic>?;

    final fieldBlocksConfig = json['fieldBlocks'] as Map<String, dynamic>? ?? {};
    final globalBubbleW = (bubbleDims?[0] as num?)?.toInt() ?? 35;
    final globalBubbleH = (bubbleDims?[1] as num?)?.toInt() ?? 35;
    final globalEmptyVal = json['emptyValue']?.toString() ?? '';

    final fieldBlocks = <FieldBlock>[];
    for (final entry in fieldBlocksConfig.entries) {
      fieldBlocks.add(FieldBlock.fromConfig(
        name: entry.key,
        config: entry.value as Map<String, dynamic>,
        globalBubbleWidth: globalBubbleW,
        globalBubbleHeight: globalBubbleH,
        globalEmptyValue: globalEmptyVal,
      ));
    }

    // Parse custom labels
    final customLabelsRaw = json['customLabels'] is Map
        ? Map<String, dynamic>.from(json['customLabels'] as Map)
        : <String, dynamic>{};
    final customLabels = <String, List<String>>{};
    for (final entry in customLabelsRaw.entries) {
      customLabels[entry.key] = (entry.value as List<dynamic>)
          .expand((item) {
            final str = item.toString();
            if (str.contains('..')) {
              final parts = str.split('..');
              final prefix = parts[0];
              final start = int.tryParse(prefix.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0;
              final suffixOnly = prefix.replaceAll(RegExp(r'[0-9]'), '');
              final end = int.tryParse(parts[1]) ?? start;
              return List.generate(
                end - start + 1,
                (i) => '$suffixOnly${start + i}',
              );
            }
            return [str];
          })
          .toList();
    }

    // Parse pre-processors
    final preProcsRaw = json['preProcessors'] as List<dynamic>? ?? [];
    final preProcessors = preProcsRaw.map((p) {
      final opts = p['options'] as Map<String, dynamic>? ?? {};
      return OMRPreProcessor(
        name: p['name']?.toString() ?? '',
        options: opts,
      );
    }).toList();

    // Parse output columns
    final outputCols = (json['outputColumns'] as List<dynamic>?)
        ?.map((e) => e.toString())
        .toList() ??
        [];

    return OMRTemplate(
      id: json['_id']?.toString() ?? json['id']?.toString(),
      name: json['name']?.toString() ?? 'OMR Template',
      pageWidth: (pageDims?[0] as num?)?.toInt() ?? 2480,
      pageHeight: (pageDims?[1] as num?)?.toInt() ?? 3508,
      bubbleWidth: globalBubbleW,
      bubbleHeight: globalBubbleH,
      emptyValue: globalEmptyVal,
      outputColumns: outputCols,
      fieldBlocks: fieldBlocks,
      customLabels: customLabels,
      preProcessors: preProcessors,
      autoAlign: json['autoAlign'] as bool? ?? true,
    );
  }

  /// Creates a simple MCQ template for testing.
  factory OMRTemplate.simpleMcq({
    required int numQuestions,
    required int numOptions,
    int pageWidth = 2480,
    int pageHeight = 3508,
    int bubbleWidth = 35,
    int bubbleHeight = 35,
  }) {
    return OMRTemplate(
      name: 'Simple MCQ Template',
      pageWidth: pageWidth,
      pageHeight: pageHeight,
      bubbleWidth: bubbleWidth,
      bubbleHeight: bubbleHeight,
      emptyValue: '',
      outputColumns: List.generate(numQuestions, (i) => 'q${i + 1}'),
      fieldBlocks: [
        FieldBlock.fromConfig(
          name: 'mcq_block',
          config: {
            'fieldType': numOptions <= 4 ? 'QTYPE_MCQ4' : 'QTYPE_MCQ5',
            'fieldLabels': List.generate(numQuestions, (i) => 'q${i + 1}'),
            'bubblesGap': 55,
            'labelsGap': 45,
            'origin': [200, 400],
          },
          globalBubbleWidth: bubbleWidth,
          globalBubbleHeight: bubbleHeight,
          globalEmptyValue: '',
        ),
      ],
      customLabels: {},
      preProcessors: [
        OMRPreProcessor(name: 'Levels', options: {'inBlack': 15.0, 'inWhite': 200.0, 'outBlack': 0.0, 'outWhite': 255.0, 'gamma': 1.0}),
        OMRPreProcessor(name: 'GaussianBlur', options: {'kSize': [3, 3], 'sigmaX': 0}),
        OMRPreProcessor(name: 'CropPage', options: {}),
      ],
    );
  }

  /// Creates a template matching OMRChecker/sample4:
  /// 11 MCQ questions (q1-q11), 4 options (A-D), page 1189x1682.
  factory OMRTemplate.sample4() {
    return OMRTemplate(
      id: 'sample4',
      name: 'Sample 4 - 11 MCQ',
      pageWidth: 1189,
      pageHeight: 1682,
      bubbleWidth: 30,
      bubbleHeight: 30,
      emptyValue: '',
      outputColumns: List.generate(11, (i) => 'q${i + 1}'),
      fieldBlocks: [
        FieldBlock.fromConfig(
          name: 'MCQBlock1',
          config: {
            'fieldType': 'QTYPE_MCQ4',
            'fieldLabels': List.generate(11, (i) => 'q${i + 1}'),
            'bubblesGap': 79,
            'labelsGap': 62,
            'origin': [134, 684],
          },
          globalBubbleWidth: 30,
          globalBubbleHeight: 30,
          globalEmptyValue: '',
        ),
      ],
      customLabels: {},
      preProcessors: [
        OMRPreProcessor(name: 'Levels', options: {'inBlack': 15.0, 'inWhite': 200.0, 'outBlack': 0.0, 'outWhite': 255.0, 'gamma': 1.0}),
        OMRPreProcessor(name: 'GaussianBlur', options: {'kSize': [3, 3], 'sigmaX': 0}),
        OMRPreProcessor(name: 'CropPage', options: {'morphKernel': [10, 10]}),
      ],
    ).._debugValidate();
  }

  /// Creates a template matching the 15-question A5 sheet:
  /// - A5 portrait: 148 x 210 mm @ 300 DPI = 1748 x 2480 px
  /// - 2-digit SBD (student code) + 2-digit MD (version code) + 15 MCQ4 questions
  /// - Layout: 5 questions/row x 3 rows for answers
  ///
  /// **Coordinate provenance:** All `origin`, `bubblesGap`, and `labelsGap`
  /// values below are design-time estimates from the 15-question sheet
  /// spec (`docs/superpowers/specs/2026-06-14-omr-15question-template-design.md`).
  /// They have NOT been verified against a real scanned sheet yet.
  ///
  /// TODO(calibration): When a real 15q A5 sheet image is available, open
  /// the Test Lab, scan the sheet with this template, and visually compare
  /// the overlay circle positions to the actual printed bubbles. Adjust the
  /// `origin` / `bubblesGap` / `labelsGap` values below if bubbles are
  /// offset. Typical first-pass adjustments: +/- 10-20 px on `originX/Y`.
  factory OMRTemplate.from15Question() {
    return OMRTemplate(
      id: '15q',
      name: 'Phiếu 15 câu - Ngắn (A5)',
      pageWidth: 1748,
      pageHeight: 2480,
      bubbleWidth: 30,
      bubbleHeight: 30,
      emptyValue: '',
      outputColumns: [
        'sbd1', 'sbd2', 'md1', 'md2',
        ...List.generate(15, (i) => 'q${i + 1}'),
      ],
      fieldBlocks: [
        FieldBlock.fromConfig(
          name: 'SBD',
          config: {
            'fieldType': 'QTYPE_INT_FROM_1',
            'fieldLabels': ['sbd1', 'sbd2'],
            'origin': [177, 413],
            // bubblesGap (Y) must be >= bubbleHeight (30) to avoid
            // 10 value bubbles overlapping vertically. 31 = 30 + 1 px
            // safety, matching labelsGap.
            'bubblesGap': 31,
            // labelsGap (X) must be >= bubbleWidth (30) to avoid the
            // 2 digit columns overlapping horizontally.
            'labelsGap': 31,
          },
          globalBubbleWidth: 30,
          globalBubbleHeight: 30,
          globalEmptyValue: '',
        ),
        FieldBlock.fromConfig(
          name: 'MD',
          config: {
            'fieldType': 'QTYPE_INT_FROM_1',
            'fieldLabels': ['md1', 'md2'],
            'origin': [1181, 413],
            'bubblesGap': 31,
            'labelsGap': 31,
          },
          globalBubbleWidth: 30,
          globalBubbleHeight: 30,
          globalEmptyValue: '',
        ),
        FieldBlock.fromConfig(
          name: 'Answers Row 1',
          config: {
            'fieldType': 'QTYPE_MCQ4',
            // direction: vertical means each *field* (question) is
            // a column of 4 bubbles stacked along Y, and the 5
            // fields in this row are spread along X. So one row on
            // the printed sheet = 5 questions side-by-side, with
            // each question's A/B/C/D options stacked vertically
            // underneath. This matches the spec's "5 questions/row"
            // geometry: 5 columns of 4 bubbles.
            'direction': 'vertical',
            'fieldLabels': ['q1', 'q2', 'q3', 'q4', 'q5'],
            'origin': [248, 768],
            // bubblesGap (Y) = 3mm bubble + 0.5mm gap = 41 px; used
            // for A→B→C→D spacing *within* a single question column.
            'bubblesGap': 41,
            // labelsGap (X) = center-to-center spacing between two
            // adjacent questions in the same row. Spec §2.4 table:
            // 8mm = 94 px. Each question occupies a 30-px-wide
            // column, so 5 questions span 4*94+30 = 406 px on X.
            'labelsGap': 94,
          },
          globalBubbleWidth: 30,
          globalBubbleHeight: 30,
          globalEmptyValue: '',
        ),
        FieldBlock.fromConfig(
          name: 'Answers Row 2',
          config: {
            'fieldType': 'QTYPE_MCQ4',
            'direction': 'vertical',
            'fieldLabels': ['q6', 'q7', 'q8', 'q9', 'q10'],
            // Row 1 origin Y = 768 (65mm). Spec §2.3: betweenRows
            // = 8mm = 94.5 px, so Row 2 origin Y = 862 (73mm).
            // An earlier draft had 1238 (768 + 470) here, which was
            // 5× the row spacing — that put the overlay for q6-q10
            // ~376 px below the actual printed row on the sheet.
            'origin': [248, 862],
            'bubblesGap': 41,
            'labelsGap': 94,
          },
          globalBubbleWidth: 30,
          globalBubbleHeight: 30,
          globalEmptyValue: '',
        ),
        FieldBlock.fromConfig(
          name: 'Answers Row 3',
          config: {
            'fieldType': 'QTYPE_MCQ4',
            'direction': 'vertical',
            'fieldLabels': ['q11', 'q12', 'q13', 'q14', 'q15'],
            // Row 1 Y = 768, Row 2 Y = 862, Row 3 Y = 956 (81mm).
            // Earlier draft had 1708 (768 + 940 = 5×6 + 5×94), which
            // placed q11-q15 overlay ~752 px too low.
            'origin': [248, 956],
            'bubblesGap': 41,
            'labelsGap': 94,
          },
          globalBubbleWidth: 30,
          globalBubbleHeight: 30,
          globalEmptyValue: '',
        ),
      ],
      customLabels: {
        'studentCode': ['sbd1', 'sbd2'],
        'versionCode': ['md1', 'md2'],
      },
      preProcessors: [
        OMRPreProcessor(
            name: 'Levels',
            options: {
              'inBlack': 15.0,
              'inWhite': 200.0,
              'outBlack': 0.0,
              'outWhite': 255.0,
              'gamma': 1.0,
            }),
        OMRPreProcessor(
            name: 'GaussianBlur',
            options: {
              'kSize': [3, 3],
              'sigmaX': 0,
            }),
        OMRPreProcessor(name: 'CropPage', options: {}),
      ],
    ).._debugValidate();
  }

  /// Creates an OMRTemplate from the server's API response format.
  ///
  /// The server returns a document with this structure:
  /// ```json
  /// {
  ///   "_id": { "$oid": "..." },
  ///   "name": "Template Name",
  ///   "templateJson": {
  ///     "pageWidth": 2479,
  ///     "pageHeight": 3508,
  ///     "bubbleWidth": 63,
  ///     "bubbleHeight": 63,
  ///     "answers": {
  ///       "q1": { "A": {"x":333,"y":562}, "B": {...}, ... },
  ///       ...
  ///     },
  ///     "preProcessors": [...],
  ///     "autoAlign": false,
  ///     ...
  ///   }
  /// }
  /// ```
  ///
  /// This factory converts it to the internal OMRTemplate format:
  /// - `answers` coords are grouped into FieldBlocks by row (same Y)
  /// - Each FieldBlock uses `QTYPE_MCQ4` with `direction=vertical`
  /// - Bubbles are extracted with correct x/y coordinates
  factory OMRTemplate.fromServerJson(Map<String, dynamic> json) {
    final templateJson = json['templateJson'] as Map<String, dynamic>? ?? {};

    // Extract id from _id.$oid or id field
    final idValue = json['_id'];
    final id = idValue is Map ? idValue['\$oid']?.toString() : json['id']?.toString();

    final name = json['name']?.toString() ?? 'Server Template';

    final pageWidth = (templateJson['pageWidth'] as num?)?.toInt() ?? 2480;
    final pageHeight = (templateJson['pageHeight'] as num?)?.toInt() ?? 3508;
    final bubbleWidth = (templateJson['bubbleWidth'] as num?)?.toInt() ?? 35;
    final bubbleHeight = (templateJson['bubbleHeight'] as num?)?.toInt() ?? 35;
    final autoAlign = templateJson['autoAlign'] as bool? ?? true;

    // Parse answers into field blocks (handle dynamic Map from JSON)
    final answersRaw = templateJson['answers'];
    final Map<String, dynamic> answersJson = answersRaw is Map
        ? Map<String, dynamic>.from(answersRaw)
        : {};
    final (fieldBlocks, outputColumns) = _parseAnswersToFieldBlocks(
      answersJson,
      bubbleWidth,
      bubbleHeight,
    );

    // Parse pre-processors (handle dynamic Map from JSON)
    final preProcsRaw = templateJson['preProcessors'] as List<dynamic>? ?? [];
    final preProcessors = preProcsRaw.map((p) {
      final optsRaw = p['options'];
      final Map<String, dynamic> opts = optsRaw is Map
          ? Map<String, dynamic>.from(optsRaw)
          : <String, dynamic>{};
      return OMRPreProcessor(
        name: p['name']?.toString() ?? '',
        options: opts,
      );
    }).toList();

    // Parse student ID field
    final StudentIdField? studentId = _parseStudentId(templateJson['studentId']);

    // Parse version code field
    final VersionCodeField? versionCodeZone = _parseVersionCode(templateJson['versionCodeZone']);

    // Parse answer key
    final answerKey = _parseAnswerKey(templateJson['answerKey']);

    // Parse question scores
    final questionScores = _parseQuestionScores(templateJson['questionScores']);

    // Parse fiducial markers
    final fiducialMarkers = _parseFiducialMarkers(templateJson['fiducialMarkers']);

    return OMRTemplate(
      id: id,
      name: name,
      pageWidth: pageWidth,
      pageHeight: pageHeight,
      bubbleWidth: bubbleWidth,
      bubbleHeight: bubbleHeight,
      emptyValue: '',
      outputColumns: outputColumns,
      fieldBlocks: fieldBlocks,
      customLabels: {},
      preProcessors: preProcessors,
      autoAlign: autoAlign,
      studentId: studentId,
      versionCodeZone: versionCodeZone,
      answerKey: answerKey,
      questionScores: questionScores,
      fiducialMarkers: fiducialMarkers,
      templateJson: templateJson, // Store raw template for overlay
    );
  }

  static StudentIdField? _parseStudentId(dynamic json) {
    if (json == null) return null;
    try {
      final Map<String, dynamic> data = json is Map
          ? Map<String, dynamic>.from(json)
          : <String, dynamic>{};
      return StudentIdField.fromJson(data);
    } catch (_) {
      return null;
    }
  }

  static VersionCodeField? _parseVersionCode(dynamic json) {
    if (json == null) return null;
    try {
      final Map<String, dynamic> data = json is Map
          ? Map<String, dynamic>.from(json)
          : <String, dynamic>{};
      return VersionCodeField.fromJson(data);
    } catch (_) {
      return null;
    }
  }

  static Map<String, String>? _parseAnswerKey(dynamic json) {
    if (json == null) return null;
    if (json is! Map) return null;
    final Map<String, dynamic> data = Map<String, dynamic>.from(json);
    return data.map((k, v) => MapEntry(k, v?.toString() ?? ''));
  }

  static Map<String, double>? _parseQuestionScores(dynamic json) {
    if (json == null) return null;
    if (json is! Map) return null;
    final Map<String, dynamic> data = Map<String, dynamic>.from(json);
    return data.map((k, v) => MapEntry(k, (v as num?)?.toDouble() ?? 0.0));
  }

  static List<FiducialMarker>? _parseFiducialMarkers(dynamic json) {
    if (json == null) return null;
    if (json is! List) return null;
    try {
      return json
          .whereType<Map>()
          .map((m) => FiducialMarker.fromJson(Map<String, dynamic>.from(m)))
          .toList();
    } catch (_) {
      return null;
    }
  }

  /// Parses the server's `answers` map into FieldBlocks.
  ///
  /// Server format: { "q1": { "A": {x,y,w,h}, "B": {...}, ... }, "q2": {...} }
  /// Internal format: FieldBlocks grouped by column (same X for AMC) or row (same Y for hardcoded).
  ///
  /// Auto-detects layout type:
  /// - AMC: options spread horizontally (A→B→C→D along X), questions stack vertically (along Y in same column)
  /// - Hardcoded: options spread vertically (A→B→C→D along Y), questions spread horizontally (along X in same row)
  ///
  /// Returns (fieldBlocks, outputColumns) tuple.
  static (List<FieldBlock>, List<String>) _parseAnswersToFieldBlocks(
    Map<String, dynamic> answersJson,
    int globalBubbleWidth,
    int globalBubbleHeight,
  ) {
    if (answersJson.isEmpty) {
      return ([], []);
    }

    // Collect all question keys and their bubble positions
    final questionInfo = <_QuestionLayoutInfo>[];
    final optionKeys = ['A', 'B', 'C', 'D', 'E'];

    for (final entry in answersJson.entries) {
      final qKey = entry.key;
      final optionsRaw = entry.value;
      final Map<String, dynamic> options = optionsRaw is Map
          ? Map<String, dynamic>.from(optionsRaw)
          : <String, dynamic>{};

      if (options.isEmpty) continue;

      // Collect all option positions
      final optionPositions = <String, _Point>{};
      for (final optKey in optionKeys) {
        if (options.containsKey(optKey)) {
          final optRaw = options[optKey];
          final Map<String, dynamic> opt = optRaw is Map
              ? Map<String, dynamic>.from(optRaw)
              : <String, dynamic>{};
          final x = (opt['x'] as num?)?.toInt() ?? 0;
          final y = (opt['y'] as num?)?.toInt() ?? 0;
          optionPositions[optKey] = _Point(x, y);
        }
      }

      if (optionPositions.isNotEmpty) {
        // Find first option for basic info
        String? firstOption;
        int? firstX;
        int? firstY;
        for (final optKey in optionKeys) {
          if (optionPositions.containsKey(optKey)) {
            firstOption = optKey;
            firstX = optionPositions[optKey]!.x;
            firstY = optionPositions[optKey]!.y;
            break;
          }
        }

        questionInfo.add(_QuestionLayoutInfo(
          key: qKey,
          firstOption: firstOption ?? 'A',
          firstX: firstX ?? 0,
          firstY: firstY ?? 0,
          options: optionPositions,
        ));
      }
    }

    if (questionInfo.isEmpty) {
      return ([], []);
    }

    // Auto-detect layout type by analyzing first few questions
    final layoutType = _detectLayoutType(questionInfo);
    
    List<_QuestionColumn> groups;
    if (layoutType == _LayoutType.amc) {
      // AMC: Group by X (columns), sort by Y within each column
      groups = _groupByColumn(questionInfo);
    } else {
      // Hardcoded: Group by Y (rows), sort by X within each row
      groups = _groupByRow(questionInfo);
    }

    // Build field blocks from groups
    final fieldBlocks = <FieldBlock>[];
    final outputColumns = <String>[];

    for (int groupIdx = 0; groupIdx < groups.length; groupIdx++) {
      final group = groups[groupIdx];
      
      // Sort questions in group
      group.questions.sort((a, b) {
        if (layoutType == _LayoutType.amc) {
          // AMC: sort by Y (top to bottom)
          return a.firstY.compareTo(b.firstY);
        } else {
          // Hardcoded: sort by X (left to right)
          return a.firstX.compareTo(b.firstX);
        }
      });

      final fieldLabels = group.questions.map((q) => q.key).toList();
      outputColumns.addAll(fieldLabels);

      // Build traverseBubbles
      final traverseBubbles = <List<Bubble>>[];

      for (final qInfo in group.questions) {
        final bubbles = <Bubble>[];
        for (final optKey in optionKeys) {
          if (qInfo.options.containsKey(optKey)) {
            final pt = qInfo.options[optKey]!;
            bubbles.add(Bubble(
              x: pt.x,
              y: pt.y,
              fieldLabel: qInfo.key,
              fieldValue: optKey,
            ));
          }
        }
        if (bubbles.isNotEmpty) {
          traverseBubbles.add(bubbles);
        }
      }

      // Calculate origin and gaps based on layout type
      int originX;
      int originY;
      int bubblesGap;
      int labelsGap;
      FieldDirection direction;

      if (layoutType == _LayoutType.amc) {
        // AMC: options spread horizontally, questions stack vertically
        originX = group.questions.first.firstX;
        originY = group.questions.first.firstY;

        // bubblesGap = horizontal spacing between A,B,C,D
        if (traverseBubbles.isNotEmpty && traverseBubbles[0].length >= 2) {
          bubblesGap = traverseBubbles[0][1].x - traverseBubbles[0][0].x;
          if (bubblesGap <= 0) bubblesGap = globalBubbleWidth + 5;
        } else {
          bubblesGap = globalBubbleWidth + 5;
        }

        // labelsGap = vertical spacing between questions in same column
        if (group.questions.length >= 2) {
          labelsGap = group.questions[1].firstY - group.questions[0].firstY;
          if (labelsGap <= 0) labelsGap = globalBubbleHeight + 5;
        } else {
          labelsGap = globalBubbleHeight + 5;
        }

        direction = FieldDirection.horizontal;
      } else {
        // Hardcoded: options spread vertically, questions spread horizontally
        originX = group.questions.first.firstX;
        originY = group.questions.first.firstY;

        // bubblesGap = vertical spacing between A,B,C,D
        if (traverseBubbles.isNotEmpty && traverseBubbles[0].length >= 2) {
          bubblesGap = traverseBubbles[0][1].y - traverseBubbles[0][0].y;
          if (bubblesGap <= 0) bubblesGap = globalBubbleHeight + 5;
        } else {
          bubblesGap = globalBubbleHeight + 5;
        }

        // labelsGap = horizontal spacing between questions in same row
        if (group.questions.length >= 2) {
          labelsGap = group.questions[1].firstX - group.questions[0].firstX;
          if (labelsGap <= 0) labelsGap = globalBubbleWidth + 5;
        } else {
          labelsGap = globalBubbleWidth + 5;
        }

        direction = FieldDirection.vertical;
      }

      // Determine field type from number of options
      final numOptions = traverseBubbles.isNotEmpty ? traverseBubbles[0].length : 4;
      final fieldType = switch (numOptions) {
        5 => FieldType.qtypeMcq5,
        _ => FieldType.qtypeMcq4,
      };

      fieldBlocks.add(FieldBlock(
        name: 'MCQBlock${groupIdx + 1}',
        originX: originX,
        originY: originY,
        blockWidth: 0, // Will be computed
        blockHeight: 0,
        bubbleWidth: globalBubbleWidth,
        bubbleHeight: globalBubbleHeight,
        bubblesGap: bubblesGap,
        labelsGap: labelsGap,
        direction: direction,
        fieldType: fieldType,
        fieldLabels: fieldLabels,
        bubbleValues: fieldType.defaultBubbleValues.sublist(0, numOptions),
        emptyValue: '',
        traverseBubbles: traverseBubbles,
      ));
    }

    return (fieldBlocks, outputColumns);
  }

  /// Auto-detect if this is AMC layout or hardcoded layout
  static _LayoutType _detectLayoutType(List<_QuestionLayoutInfo> questions) {
    if (questions.length < 2) return _LayoutType.hardcoded;

    // Get first 2 questions
    final q1 = questions[0];
    final q2 = questions.length > 1 ? questions[1] : null;

    if (q2 == null) {
      // Only 1 question, check if options spread horizontally or vertically
      if (q1.options.length >= 2) {
        final opts = q1.options.entries.toList();
        final dx = (opts[1].value.x - opts[0].value.x).abs();
        final dy = (opts[1].value.y - opts[0].value.y).abs();
        return dx > dy ? _LayoutType.amc : _LayoutType.hardcoded;
      }
      return _LayoutType.hardcoded;
    }

    // Compare positioning of q1 vs q2
    // If q1 and q2 have same X but different Y → AMC (vertical stack in column)
    // If q1 and q2 have same Y but different X → Hardcoded (horizontal row)
    final dX = (q2.firstX - q1.firstX).abs();
    final dY = (q2.firstY - q1.firstY).abs();

    // If X difference is much larger than Y difference → Hardcoded (spread horizontally)
    // If Y difference is much larger than X difference → AMC (spread vertically)
    if (dX > dY * 2) {
      return _LayoutType.hardcoded;
    } else if (dY > dX * 2) {
      return _LayoutType.amc;
    }

    // Ambiguous, check options spread
    if (q1.options.length >= 2) {
      final opts = q1.options.entries.toList();
      final dx = (opts[1].value.x - opts[0].value.x).abs();
      final dy = (opts[1].value.y - opts[0].value.y).abs();
      return dx > dy ? _LayoutType.amc : _LayoutType.hardcoded;
    }

    return _LayoutType.hardcoded;
  }

  /// Group questions by column (for AMC layout: same X ± tolerance)
  static List<_QuestionColumn> _groupByColumn(List<_QuestionLayoutInfo> questions) {
    final columns = <_QuestionColumn>[];
    const xTolerance = 50; // px tolerance for same column

    for (final qInfo in questions) {
      // Find existing column or create new one
      _QuestionColumn? targetCol;
      for (final col in columns) {
        if ((qInfo.firstX - col.baseX).abs() <= xTolerance) {
          targetCol = col;
          break;
        }
      }

      if (targetCol == null) {
        targetCol = _QuestionColumn(baseX: qInfo.firstX);
        columns.add(targetCol);
      }
      targetCol.questions.add(qInfo);
    }

    // Sort columns by X (left to right)
    columns.sort((a, b) => a.baseX.compareTo(b.baseX));
    return columns;
  }

  /// Group questions by row (for hardcoded layout: same Y ± tolerance)
  static List<_QuestionColumn> _groupByRow(List<_QuestionLayoutInfo> questions) {
    final rows = <_QuestionColumn>[];
    const yTolerance = 70; // px tolerance for same row (AMC spacing ~68px)

    for (final qInfo in questions) {
      // Find existing row or create new one
      _QuestionColumn? targetRow;
      for (final row in rows) {
        if ((qInfo.firstY - row.baseY).abs() <= yTolerance) {
          targetRow = row;
          break;
        }
      }

      if (targetRow == null) {
        targetRow = _QuestionColumn(baseY: qInfo.firstY);
        rows.add(targetRow);
      }
      targetRow.questions.add(qInfo);
    }

    // Sort rows by Y (top to bottom)
    rows.sort((a, b) => a.baseY.compareTo(b.baseY));
    return rows;
  }
}

/// Layout type enumeration
enum _LayoutType {
  amc,      // Options spread horizontally, questions stack vertically
  hardcoded // Options spread vertically, questions spread horizontally
}

/// Simple 2D point
class _Point {
  final int x;
  final int y;
  const _Point(this.x, this.y);
}

/// Helper class for parsing question layout
class _QuestionLayoutInfo {
  final String key;
  final String firstOption;
  final int firstX;
  final int firstY;
  final Map<String, _Point> options; // Changed from Map<String, dynamic>

  _QuestionLayoutInfo({
    required this.key,
    required this.firstOption,
    required this.firstX,
    required this.firstY,
    required this.options,
  });
}

/// Helper class for grouping questions by column or row
class _QuestionColumn {
  final int baseX; // For column grouping (AMC)
  final int baseY; // For row grouping (hardcoded)
  final List<_QuestionLayoutInfo> questions;

  _QuestionColumn({int? baseX, int? baseY})
      : baseX = baseX ?? 0,
        baseY = baseY ?? 0,
        questions = [];
}

/// Represents a pre-processor step in the pipeline.
class OMRPreProcessor {
  final String name;
  final Map<String, dynamic> options;

  const OMRPreProcessor({
    required this.name,
    required this.options,
  });

  String get markerPath => options['relativePath']?.toString() ?? 'omr_marker.jpg';
  double get minMatchingThreshold =>
      (options['min_matching_threshold'] as num?)?.toDouble() ?? 0.3;
  List<int>? get scaleRange {
    final raw = options['marker_rescale_range'] as List<dynamic>?;
    if (raw == null) return null;
    return raw.map((e) => (e as num).toInt()).toList();
  }
}
