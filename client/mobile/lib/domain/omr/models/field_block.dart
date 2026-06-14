import 'bubble.dart';

/// Defines the direction bubble values are arranged.
enum FieldDirection {
  vertical,
  horizontal;

  static FieldDirection fromString(String value) {
    switch (value.toLowerCase()) {
      case 'vertical':
        return FieldDirection.vertical;
      case 'horizontal':
        return FieldDirection.horizontal;
      default:
        return FieldDirection.vertical;
    }
  }
}

/// Defines the type of field block (MCQ, integer input, etc.).
enum FieldType {
  qtypeInt('QTYPE_INT', ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], FieldDirection.vertical),
  qtypeIntFrom1('QTYPE_INT_FROM_1', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], FieldDirection.vertical),
  qtypeMcq4('QTYPE_MCQ4', ['A', 'B', 'C', 'D'], FieldDirection.horizontal),
  qtypeMcq5('QTYPE_MCQ5', ['A', 'B', 'C', 'D', 'E'], FieldDirection.horizontal),
  qtypeMcq4Rtl('QTYPE_MCQ4_RTL', ['D', 'C', 'B', 'A'], FieldDirection.horizontal),
  qtypeMcq5Rtl('QTYPE_MCQ5_RTL', ['E', 'D', 'C', 'B', 'A'], FieldDirection.horizontal),
  custom('__CUSTOM__', <String>[], FieldDirection.vertical);

  final String key;
  final List<String> defaultBubbleValues;
  final FieldDirection defaultDirection;

  const FieldType(this.key, this.defaultBubbleValues, this.defaultDirection);

  static FieldType fromKey(String key) {
    for (final type in FieldType.values) {
      if (type.key == key) return type;
    }
    return FieldType.custom;
  }
}

/// Represents a group of bubbles that share a common origin and layout.
class FieldBlock {
  final String name;
  final int originX;
  final int originY;
  final int blockWidth;
  final int blockHeight;
  final int bubbleWidth;
  final int bubbleHeight;
  final int bubblesGap;
  final int labelsGap;
  final FieldDirection direction;
  final FieldType fieldType;
  final List<String> fieldLabels;
  final List<String> bubbleValues;
  final String emptyValue;

  /// 2D grid: traverseBubbles[fieldIdx][valueIdx] -> Bubble
  final List<List<Bubble>> traverseBubbles;

  const FieldBlock({
    required this.name,
    required this.originX,
    required this.originY,
    required this.blockWidth,
    required this.blockHeight,
    required this.bubbleWidth,
    required this.bubbleHeight,
    required this.bubblesGap,
    required this.labelsGap,
    required this.direction,
    required this.fieldType,
    required this.fieldLabels,
    required this.bubbleValues,
    required this.emptyValue,
    required this.traverseBubbles,
  });

  factory FieldBlock.fromConfig({
    required String name,
    required Map<String, dynamic> config,
    required int globalBubbleWidth,
    required int globalBubbleHeight,
    required String globalEmptyValue,
  }) {
    final fieldType = FieldType.fromKey(config['fieldType'] as String? ?? 'QTYPE_INT');
    // Mirror OMRChecker Python: when 'direction' is absent, fall back to the
    // field type's default direction (QTYPE_MCQ* -> horizontal, QTYPE_INT -> vertical).
    // Falling back to a hard-coded 'vertical' made QTYPE_MCQ4 templates default
    // to vertical, which misaligned bubble coordinates vs. the scanned sheet.
    final direction = FieldDirection.fromString(
      config['direction'] as String? ?? fieldType.defaultDirection.name,
    );
    final bubbleValues = (config['bubbleValues'] as List<dynamic>?)
        ?.map((e) => e.toString())
        .toList() ??
        List.from(fieldType.defaultBubbleValues);
    final fieldLabels = (config['fieldLabels'] as List<dynamic>?)
        ?.map((e) => e.toString())
        .toList() ??
        [];
    final origin = config['origin'] as List<dynamic>?;
    final originX = (origin?[0] as num?)?.toInt() ?? 0;
    final originY = (origin?[1] as num?)?.toInt() ?? 0;
    final bubblesGap = (config['bubblesGap'] as num?)?.toInt() ?? 50;
    final labelsGap = (config['labelsGap'] as num?)?.toInt() ?? 50;
    final bubbleW = (config['bubbleWidth'] as num?)?.toInt() ?? globalBubbleWidth;
    final bubbleH = (config['bubbleHeight'] as num?)?.toInt() ?? globalBubbleHeight;
    final emptyValue = config['emptyValue']?.toString() ?? globalEmptyValue;

    // Generate bubble grid
    final traverseBubbles = <List<Bubble>>[];
    final isHorizontal = direction == FieldDirection.horizontal;

    for (int fi = 0; fi < fieldLabels.length; fi++) {
      final fieldBubbles = <Bubble>[];
      final yBase = isHorizontal ? originY + fi * labelsGap : originY;
      final xBase = isHorizontal ? originX : originX + fi * labelsGap;

      for (int vi = 0; vi < bubbleValues.length; vi++) {
        final bx = isHorizontal ? xBase + vi * bubblesGap : xBase;
        final by = isHorizontal ? yBase : yBase + vi * bubblesGap;
        fieldBubbles.add(Bubble(
          x: bx,
          y: by,
          fieldLabel: fieldLabels[fi],
          fieldValue: bubbleValues[vi],
        ));
      }
      traverseBubbles.add(fieldBubbles);
    }

    // Calculate block dimensions
    final valuesDimension = bubblesGap * (bubbleValues.length - 1) + bubbleW;
    final fieldsDimension = labelsGap * (fieldLabels.length - 1) + bubbleH;
    final blockW = isHorizontal ? valuesDimension : fieldsDimension;
    final blockH = isHorizontal ? fieldsDimension : valuesDimension;

    return FieldBlock(
      name: name,
      originX: originX,
      originY: originY,
      blockWidth: blockW,
      blockHeight: blockH,
      bubbleWidth: bubbleW,
      bubbleHeight: bubbleH,
      bubblesGap: bubblesGap,
      labelsGap: labelsGap,
      direction: direction,
      fieldType: fieldType,
      fieldLabels: fieldLabels,
      bubbleValues: bubbleValues,
      emptyValue: emptyValue,
      traverseBubbles: traverseBubbles,
    );
  }

  /// Returns a copy of this FieldBlock with originX shifted by [shift] pixels.
  /// All bubble coordinates are adjusted accordingly. Mirrors v2 shift behavior:
  /// bx = block.originX + shift + col * block.bubblesGap
  FieldBlock withShift(int shift) {
    if (shift == 0) return this;

    final isHorizontal = direction == FieldDirection.horizontal;

    // Rebuild bubble grid with shifted originX
    final newTraverseBubbles = <List<Bubble>>[];
    for (int fi = 0; fi < fieldLabels.length; fi++) {
      final fieldBubbles = <Bubble>[];
      final yBase = isHorizontal ? originY + fi * labelsGap : originY;
      final xBase = isHorizontal ? originX + shift : originX + shift + fi * labelsGap;

      for (int vi = 0; vi < bubbleValues.length; vi++) {
        final bx = isHorizontal ? xBase + vi * bubblesGap : xBase;
        final by = isHorizontal ? yBase : yBase + vi * bubblesGap;
        fieldBubbles.add(Bubble(
          x: bx,
          y: by,
          fieldLabel: fieldLabels[fi],
          fieldValue: bubbleValues[vi],
        ));
      }
      newTraverseBubbles.add(fieldBubbles);
    }

    return FieldBlock(
      name: name,
      originX: originX + shift,
      originY: originY,
      blockWidth: blockWidth,
      blockHeight: blockHeight,
      bubbleWidth: bubbleWidth,
      bubbleHeight: bubbleHeight,
      bubblesGap: bubblesGap,
      labelsGap: labelsGap,
      direction: direction,
      fieldType: fieldType,
      fieldLabels: fieldLabels,
      bubbleValues: bubbleValues,
      emptyValue: emptyValue,
      traverseBubbles: newTraverseBubbles,
    );
  }
}
