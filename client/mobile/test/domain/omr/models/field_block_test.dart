import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/omr/models/field_block.dart';

void main() {
  group('FieldBlock.withShift()', () {
    test('horizontal: shifts originX by the given amount', () {
      final block = FieldBlock.fromConfig(
        name: 'mcq',
        config: {
          'fieldType': 'QTYPE_MCQ4',
          'fieldLabels': ['q1', 'q2'],
          'bubblesGap': 59,
          'labelsGap': 141,
          'origin': [365, 1299],
        },
        globalBubbleWidth: 47,
        globalBubbleHeight: 47,
        globalEmptyValue: '',
      );

      final shifted = block.withShift(5);

      // q1: A at (365+5, 1299)
      expect(shifted.traverseBubbles[0][0].x, equals(370));
      expect(shifted.traverseBubbles[0][0].y, equals(1299));
      // q2: A at (365+5, 1299+141) — fi=1 adds to Y
      expect(shifted.traverseBubbles[1][0].x, equals(370));
      expect(shifted.traverseBubbles[1][0].y, equals(1440));
      // D (vi=3) at (365+5+3*59, 1299) = (547, 1299)
      expect(shifted.traverseBubbles[0][3].x, equals(547));
    });

    test('vertical: shifts originX AND fi*labelsGap per field', () {
      final block = FieldBlock.fromConfig(
        name: 'roll',
        config: {
          'fieldType': 'QTYPE_INT',
          'fieldLabels': ['r1', 'r2'],
          'bubblesGap': 42,
          'labelsGap': 42,
          'origin': [286, 780],
        },
        globalBubbleWidth: 30,
        globalBubbleHeight: 30,
        globalEmptyValue: '',
      );

      final shifted = block.withShift(5);

      // r1 (fi=0): value 0 at (286+5, 780)
      expect(shifted.traverseBubbles[0][0].x, equals(291));
      expect(shifted.traverseBubbles[0][0].y, equals(780));
      // r2 (fi=1): value 0 at (286+5+1*42, 780) = (333, 780)
      expect(shifted.traverseBubbles[1][0].x, equals(333));
      expect(shifted.traverseBubbles[1][0].y, equals(780));
    });
  });
}
