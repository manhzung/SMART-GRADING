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

/// Represents a single bubble at an exact position
class AppBubbleCoord {
  final String label;     // e.g. "q1", "sbd1"
  final String value;     // e.g. "A", "B", "1", "2"
  final int x;
  final int y;
  final int w;
  final int h;

  const AppBubbleCoord({
    required this.label,
    required this.value,
    required this.x,
    required this.y,
    required this.w,
    required this.h,
  });

  factory AppBubbleCoord.fromJson(Map<String, dynamic> json) {
    return AppBubbleCoord(
      label: json['label'] as String? ?? '',
      value: json['value'] as String? ?? '',
      x: (json['x'] as num?)?.toInt() ?? 0,
      y: (json['y'] as num?)?.toInt() ?? 0,
      w: (json['w'] as num?)?.toInt() ?? 46,
      h: (json['h'] as num?)?.toInt() ?? 46,
    );
  }

  Map<String, dynamic> toJson() => {
    'label': label,
    'value': value,
    'x': x,
    'y': y,
    'w': w,
    'h': h,
  };
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
  /// Exact bubble coordinates for each (label, value) pair.
  /// When provided, engine uses these instead of computed coords.
  final List<AppBubbleCoord>? exactCoords;

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
    this.exactCoords,
  });

  factory AppOmrFieldBlock.fromMap(Map<String, dynamic> map) {
    final coordsRaw = map['exactCoords'] as List<dynamic>?;
    final exactCoords = coordsRaw != null
        ? coordsRaw
            .map((e) => AppBubbleCoord.fromJson(e as Map<String, dynamic>))
            .toList()
        : null;

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
      exactCoords: exactCoords,
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
        if (exactCoords != null) 'exactCoords': exactCoords!.map((c) => c.toJson()).toList(),
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
      exactCoords: exactCoords,
    );
  }

  /// Returns all exact coordinates grouped by field label.
  /// Returns empty map if exactCoords is not available.
  Map<String, Map<String, AppBubbleCoord>> get coordsByLabelAndValue {
    if (exactCoords == null) return {};
    final result = <String, Map<String, AppBubbleCoord>>{};
    for (final coord in exactCoords!) {
      result.putIfAbsent(coord.label, () => {});
      result[coord.label]![coord.value] = coord;
    }
    return result;
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
  /// Whether this bubble's answer is correct (for MCQ questions only)
  final bool? isCorrect;
  /// Whether this is a student ID / version code field (no correctness check)
  final bool isStudentField;

  const AppBubbleResult({
    required this.label,
    required this.markedValue,
    required this.isMultiMarked,
    required this.intensity,
    this.allIntensities = const [],
    this.isCorrect,
    this.isStudentField = false,
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
      isCorrect: map['isCorrect'] as bool?,
      isStudentField: map['isStudentField'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toMap() => {
        'label': label,
        'markedValue': markedValue,
        'isMultiMarked': isMultiMarked,
        'intensity': intensity,
        'allIntensities': allIntensities,
        'isCorrect': isCorrect,
        'isStudentField': isStudentField,
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
  /// Auto-alignment shifts per field block (px), computed during processing.
  /// Empty when autoAlign=false. Use AppOMREngine.alignmentShifts after processImage().
  final List<int> alignmentShifts;

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
    this.alignmentShifts = const [],
  });

  factory AppOmrResult.fromMap(Map<String, dynamic> map) {
    final rawShifts = map['alignmentShifts'];
    final alignmentShifts = rawShifts is List
        ? rawShifts.map((e) => (e as num).toInt()).toList()
        : <int>[];
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
      alignmentShifts: alignmentShifts,
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
        if (alignmentShifts.isNotEmpty) 'alignmentShifts': alignmentShifts,
      };
}
