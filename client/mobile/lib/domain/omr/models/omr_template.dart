import 'field_block.dart';
import 'template_layout.dart';

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
  });

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
            'fieldLabels': ['q1', 'q2', 'q3', 'q4', 'q5'],
            'origin': [248, 768],
            'bubblesGap': 41,
            // labelsGap is the Y spacing between adjacent questions
            // *within* a single row. Spec §2.4 table pins this to
            // 8mm = 94 px. With the spec's row gap of 8mm, the
            // 5-question row's *bbox* (as computed by FieldBlock
            // linear math) will extend 4*94+30 = 406 px below the
            // row origin, well past the 94-px gap to the next row.
            // This is a known limitation of FieldBlock's linear
            // model when a layout is actually a multi-row grid -
            // see TemplateLayout.assertNoOverlap, which now skips
            // the cross-block bbox check for that reason.
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
