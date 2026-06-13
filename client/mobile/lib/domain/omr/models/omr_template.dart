import 'field_block.dart';

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
  });

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
    );
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
