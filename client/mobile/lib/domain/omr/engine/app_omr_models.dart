import 'dart:typed_data';

/// Preprocessor configuration - mirrors PreprocessorConfig in omr_engine_v2.dart
class AppOmrPreProcessor {
  final String name;
  final Map<String, dynamic> options;

  const AppOmrPreProcessor({
    required this.name,
    this.options = const {},
  });

  Map<String, dynamic> toMap() => {'name': name, 'options': options};

  factory AppOmrPreProcessor.fromMap(Map<String, dynamic> map) {
    return AppOmrPreProcessor(
      name: map['name'] as String? ?? '',
      options: Map<String, dynamic>.from(map['options'] as Map? ?? {}),
    );
  }
}

/// Field block definition - mirrors OmrFieldBlock in omr_engine_v2.dart
class AppOmrFieldBlock {
  final String name;
  final int originX;
  final int originY;
  final int shift;
  final int bubbleWidth;
  final int bubbleHeight;
  final List<String> fieldLabels;
  final List<String> bubbleValues;
  final double bubblesGap;
  final double labelsGap;
  final String direction;
  final String emptyValue;

  const AppOmrFieldBlock({
    required this.name,
    required this.originX,
    required this.originY,
    this.shift = 0,
    required this.bubbleWidth,
    required this.bubbleHeight,
    required this.fieldLabels,
    required this.bubbleValues,
    required this.bubblesGap,
    required this.labelsGap,
    this.direction = 'vertical',
    this.emptyValue = '',
  });

  factory AppOmrFieldBlock.fromMap(Map<String, dynamic> map) {
    return AppOmrFieldBlock(
      name: map['name'] as String? ?? '',
      originX: (map['originX'] as num?)?.toInt() ?? 0,
      originY: (map['originY'] as num?)?.toInt() ?? 0,
      shift: (map['shift'] as num?)?.toInt() ?? 0,
      bubbleWidth: (map['bubbleWidth'] as num?)?.toInt() ?? 35,
      bubbleHeight: (map['bubbleHeight'] as num?)?.toInt() ?? 35,
      fieldLabels: (map['fieldLabels'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      bubbleValues: (map['bubbleValues'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      bubblesGap: (map['bubblesGap'] as num?)?.toDouble() ?? 50.0,
      labelsGap: (map['labelsGap'] as num?)?.toDouble() ?? 50.0,
      direction: map['direction'] as String? ?? 'vertical',
      emptyValue: map['emptyValue'] as String? ?? '',
    );
  }

  Map<String, dynamic> toMap() => {
        'name': name,
        'originX': originX,
        'originY': originY,
        'shift': shift,
        'bubbleWidth': bubbleWidth,
        'bubbleHeight': bubbleHeight,
        'fieldLabels': fieldLabels,
        'bubbleValues': bubbleValues,
        'bubblesGap': bubblesGap,
        'labelsGap': labelsGap,
        'direction': direction,
        'emptyValue': emptyValue,
      };

  AppOmrFieldBlock withShift(int newShift) {
    return AppOmrFieldBlock(
      name: name,
      originX: originX,
      originY: originY,
      shift: newShift,
      bubbleWidth: bubbleWidth,
      bubbleHeight: bubbleHeight,
      fieldLabels: fieldLabels,
      bubbleValues: bubbleValues,
      bubblesGap: bubblesGap,
      labelsGap: labelsGap,
      direction: direction,
      emptyValue: emptyValue,
    );
  }
}

/// OMR Template - mirrors OmrTemplate in omr_engine_v2.dart
class AppOmrTemplate {
  final int pageWidth;
  final int pageHeight;
  final int bubbleWidth;
  final int bubbleHeight;
  final List<AppOmrFieldBlock> fieldBlocks;
  final List<AppOmrPreProcessor> preprocessors;
  final int? procWidth;
  final int? procHeight;
  final double minJump;
  final bool autoAlign;
  final bool useMarkers;

  const AppOmrTemplate({
    required this.pageWidth,
    required this.pageHeight,
    required this.bubbleWidth,
    required this.bubbleHeight,
    required this.fieldBlocks,
    this.preprocessors = const [],
    this.procWidth,
    this.procHeight,
    this.minJump = 8.0,
    this.autoAlign = true,
    this.useMarkers = false,
  });

  int get processingWidth => procWidth ?? pageWidth;
  int get processingHeight => procHeight ?? pageHeight;

  factory AppOmrTemplate.fromMap(Map<String, dynamic> map) {
    return AppOmrTemplate(
      pageWidth: (map['pageWidth'] as num?)?.toInt() ?? 2480,
      pageHeight: (map['pageHeight'] as num?)?.toInt() ?? 3508,
      bubbleWidth: (map['bubbleWidth'] as num?)?.toInt() ?? 35,
      bubbleHeight: (map['bubbleHeight'] as num?)?.toInt() ?? 35,
      fieldBlocks: (map['fieldBlocks'] as List<dynamic>?)
              ?.map((e) => AppOmrFieldBlock.fromMap(e as Map<String, dynamic>))
              .toList() ??
          [],
      preprocessors: (map['preprocessors'] as List<dynamic>?)
              ?.map((e) => AppOmrPreProcessor.fromMap(e as Map<String, dynamic>))
              .toList() ??
          [],
      procWidth: (map['procWidth'] as num?)?.toInt(),
      procHeight: (map['procHeight'] as num?)?.toInt(),
      minJump: (map['minJump'] as num?)?.toDouble() ?? 8.0,
      autoAlign: map['autoAlign'] as bool? ?? false,
      useMarkers: map['useMarkers'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toMap() => {
        'pageWidth': pageWidth,
        'pageHeight': pageHeight,
        'bubbleWidth': bubbleWidth,
        'bubbleHeight': bubbleHeight,
        'fieldBlocks': fieldBlocks.map((e) => e.toMap()).toList(),
        'preprocessors': preprocessors.map((e) => e.toMap()).toList(),
        if (procWidth != null) 'procWidth': procWidth,
        if (procHeight != null) 'procHeight': procHeight,
        'minJump': minJump,
        'autoAlign': autoAlign,
        'useMarkers': useMarkers,
      };
}

/// Bubble detection result for a single question
class AppBubbleResult {
  final String label;
  final String markedValue;
  final bool isMultiMarked;
  final double intensity;
  /// Intensity value for every bubble option (e.g. [50, 200, 180, 195] for A,B,C,D)
  final List<double> allIntensities;

  const AppBubbleResult({
    required this.label,
    required this.markedValue,
    required this.isMultiMarked,
    required this.intensity,
    this.allIntensities = const [],
  });

  factory AppBubbleResult.fromMap(Map<String, dynamic> map) {
    final rawIntensities = map['allIntensities'];
    final allIntensities = rawIntensities is List
        ? rawIntensities.map((e) => (e as num).toDouble()).toList()
        : <double>[];
    return AppBubbleResult(
      label: map['label'] as String? ?? '',
      markedValue: map['markedValue'] as String? ?? '',
      isMultiMarked: map['isMultiMarked'] as bool? ?? false,
      intensity: (map['intensity'] as num?)?.toDouble() ?? 255.0,
      allIntensities: allIntensities,
    );
  }

  Map<String, dynamic> toMap() => {
        'label': label,
        'markedValue': markedValue,
        'isMultiMarked': isMultiMarked,
        'intensity': intensity,
        'allIntensities': allIntensities,
      };
}

/// Complete OMR processing result - mirrors OmrResult in omr_engine_v2.dart
class AppOmrResult {
  final Map<String, String> responses;
  final double confidence;
  final bool warpSucceeded;
  final String preprocessorUsed;
  final List<AppBubbleResult> details;
  final Uint8List? annotatedImageBytes;
  final int? annotatedWidth;
  final int? annotatedHeight;
  final Uint8List? croppedImageBytes;
  final int? croppedWidth;
  final int? croppedHeight;

  const AppOmrResult({
    required this.responses,
    required this.confidence,
    required this.warpSucceeded,
    required this.preprocessorUsed,
    required this.details,
    this.annotatedImageBytes,
    this.annotatedWidth,
    this.annotatedHeight,
    this.croppedImageBytes,
    this.croppedWidth,
    this.croppedHeight,
  });

  factory AppOmrResult.fromMap(Map<String, dynamic> map) {
    return AppOmrResult(
      responses: Map<String, String>.from(map['responses'] as Map? ?? {}),
      confidence: (map['confidence'] as num?)?.toDouble() ?? 0.0,
      warpSucceeded: map['warpSucceeded'] as bool? ?? false,
      preprocessorUsed: map['preprocessorUsed'] as String? ?? 'None',
      details: (map['details'] as List<dynamic>?)
              ?.map((e) => AppBubbleResult.fromMap(e as Map<String, dynamic>))
              .toList() ??
          [],
      croppedImageBytes: map['croppedImageBytes'] as Uint8List?,
      croppedWidth: (map['croppedWidth'] as num?)?.toInt(),
      croppedHeight: (map['croppedHeight'] as num?)?.toInt(),
    );
  }

  Map<String, dynamic> toMap() => {
        'responses': responses,
        'confidence': confidence,
        'warpSucceeded': warpSucceeded,
        'preprocessorUsed': preprocessorUsed,
        'details': details.map((e) => e.toMap()).toList(),
        if (croppedImageBytes != null) 'croppedImageBytes': croppedImageBytes,
        if (croppedWidth != null) 'croppedWidth': croppedWidth,
        if (croppedHeight != null) 'croppedHeight': croppedHeight,
      };
}
