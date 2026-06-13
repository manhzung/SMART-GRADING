import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/domain/omr/models/field_block.dart';

void main() {
  group('OMRTemplate', () {
    test('parses JSON template correctly', () {
      final json = {
        'pageDimensions': [2480, 3508],
        'bubbleDimensions': [35, 35],
        'emptyValue': '',
        'fieldBlocks': {
          'mcq_block': {
            'fieldType': 'QTYPE_MCQ4',
            'fieldLabels': ['q1', 'q2', 'q3'],
            'bubblesGap': 55,
            'labelsGap': 45,
            'origin': [200, 400],
          },
        },
        'customLabels': {},
        'preProcessors': [],
        'outputColumns': ['q1', 'q2', 'q3'],
      };

      final template = OMRTemplate.fromJson(json);

      expect(template.pageWidth, equals(2480));
      expect(template.pageHeight, equals(3508));
      expect(template.bubbleWidth, equals(35));
      expect(template.bubbleHeight, equals(35));
      expect(template.fieldBlocks.length, equals(1));
      expect(template.outputColumns, equals(['q1', 'q2', 'q3']));
    });

    test('creates simple MCQ template', () {
      final template = OMRTemplate.simpleMcq(
        numQuestions: 5,
        numOptions: 4,
      );

      expect(template.name, equals('Simple MCQ Template'));
      expect(template.outputColumns.length, equals(5));
      expect(template.fieldBlocks.length, equals(1));
      expect(template.fieldBlocks[0].bubbleValues, equals(['A', 'B', 'C', 'D']));
      expect(template.fieldBlocks[0].fieldLabels.length, equals(5));
    });
  });

  group('FieldBlock', () {
    test('generates bubble grid for horizontal MCQ', () {
      final block = FieldBlock.fromConfig(
        name: 'mcq',
        config: {
          'fieldType': 'QTYPE_MCQ4',
          'fieldLabels': ['q1', 'q2'],
          'bubblesGap': 55,
          'labelsGap': 45,
          'origin': [100, 200],
        },
        globalBubbleWidth: 35,
        globalBubbleHeight: 35,
        globalEmptyValue: '',
      );

      expect(block.traverseBubbles.length, equals(2));
      expect(block.traverseBubbles[0].length, equals(4));
      expect(block.traverseBubbles[0][0].fieldLabel, equals('q1'));
      expect(block.traverseBubbles[0][0].fieldValue, equals('A'));
    });

    test('generates bubble grid for vertical integer', () {
      final block = FieldBlock.fromConfig(
        name: 'roll',
        config: {
          'fieldType': 'QTYPE_INT',
          'fieldLabels': ['r1'],
          'bubblesGap': 40,
          'labelsGap': 0,
          'origin': [100, 200],
        },
        globalBubbleWidth: 35,
        globalBubbleHeight: 35,
        globalEmptyValue: '',
      );

      expect(block.traverseBubbles.length, equals(1));
      expect(block.traverseBubbles[0].length, equals(10));
      expect(block.traverseBubbles[0][0].fieldValue, equals('0'));
      expect(block.traverseBubbles[0][9].fieldValue, equals('9'));
    });

    test('calculates block dimensions correctly', () {
      final block = FieldBlock.fromConfig(
        name: 'mcq',
        config: {
          'fieldType': 'QTYPE_MCQ4',
          'fieldLabels': ['q1', 'q2', 'q3'],
          'bubblesGap': 55,
          'labelsGap': 45,
          'origin': [0, 0],
        },
        globalBubbleWidth: 35,
        globalBubbleHeight: 35,
        globalEmptyValue: '',
      );

      // For QTYPE_MCQ4 (horizontal), width = fields dimension, height = values dimension
      // valuesDimension = (4-1) * 55 + 35 = 200
      // fieldsDimension = (3-1) * 45 + 35 = 125
      // blockWidth = fieldsDimension = 125, blockHeight = valuesDimension = 200
      expect(block.blockWidth, equals(125));
      expect(block.blockHeight, equals(200));
    });
  });

  group('FieldDirection', () {
    test('parses string to enum', () {
      expect(FieldDirection.fromString('vertical'), equals(FieldDirection.vertical));
      expect(FieldDirection.fromString('horizontal'), equals(FieldDirection.horizontal));
      expect(FieldDirection.fromString('VERTICAL'), equals(FieldDirection.vertical));
      expect(FieldDirection.fromString('unknown'), equals(FieldDirection.vertical));
    });
  });

  group('FieldType', () {
    test('maps known keys correctly', () {
      expect(FieldType.fromKey('QTYPE_MCQ4'), equals(FieldType.qtypeMcq4));
      expect(FieldType.fromKey('QTYPE_MCQ5'), equals(FieldType.qtypeMcq5));
      expect(FieldType.fromKey('QTYPE_INT'), equals(FieldType.qtypeInt));
      expect(FieldType.fromKey('UNKNOWN'), equals(FieldType.custom));
    });

    test('has correct default bubble values', () {
      expect(FieldType.qtypeMcq4.defaultBubbleValues, equals(['A', 'B', 'C', 'D']));
      expect(FieldType.qtypeMcq5.defaultBubbleValues, equals(['A', 'B', 'C', 'D', 'E']));
      expect(FieldType.qtypeInt.defaultBubbleValues.length, equals(10));
    });
  });
}
