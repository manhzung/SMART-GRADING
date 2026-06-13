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

    test('parses autoAlign from JSON (true)', () {
      final json = {
        'pageDimensions': [2480, 3508],
        'bubbleDimensions': [35, 35],
        'fieldBlocks': <String, dynamic>{},
        'customLabels': <String, dynamic>{},
        'preProcessors': <dynamic>[],
        'outputColumns': <dynamic>[],
        'autoAlign': true,
      };
      final template = OMRTemplate.fromJson(json);
      expect(template.autoAlign, isTrue);
    });

    test('parses autoAlign from JSON (false)', () {
      final json = {
        'pageDimensions': [2480, 3508],
        'bubbleDimensions': [35, 35],
        'fieldBlocks': <String, dynamic>{},
        'customLabels': <String, dynamic>{},
        'preProcessors': <dynamic>[],
        'outputColumns': <dynamic>[],
        'autoAlign': false,
      };
      final template = OMRTemplate.fromJson(json);
      expect(template.autoAlign, isFalse);
    });

    test('defaults autoAlign to true when missing (backward compat)', () {
      final json = {
        'pageDimensions': [2480, 3508],
        'bubbleDimensions': [35, 35],
        'fieldBlocks': <String, dynamic>{},
        'customLabels': <String, dynamic>{},
        'preProcessors': <dynamic>[],
        'outputColumns': <dynamic>[],
        // no autoAlign key
      };
      final template = OMRTemplate.fromJson(json);
      expect(template.autoAlign, isTrue);
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

      // For QTYPE_MCQ4 (horizontal), width = values dimension, height = fields dimension
      // valuesDimension = (4-1) * 55 + 35 = 200 (A,B,C,D along X)
      // fieldsDimension = (3-1) * 45 + 35 = 125 (q1,q2,q3 along Y)
      // blockWidth = valuesDimension = 200, blockHeight = fieldsDimension = 125
      expect(block.blockWidth, equals(200));
      expect(block.blockHeight, equals(125));
    });

    test('sample 4 layout infers horizontal direction for QTYPE_MCQ4', () {
      // Reproduces OMRChecker samples/sample4/template.json:
      // MCQ4 block, 11 questions, origin (134, 684), bubblesGap=79, labelsGap=62.
      // Python OMRChecker treats QTYPE_MCQ4 as horizontal (bubble_values in X,
      // questions in Y), so q1.A=(134,684) and q2.A=(134,746).
      final block = FieldBlock.fromConfig(
        name: 'MCQBlock1',
        config: {
          'fieldType': 'QTYPE_MCQ4',
          'fieldLabels': [
            'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11'
          ],
          'bubblesGap': 79,
          'labelsGap': 62,
          'origin': [134, 684],
          // no 'direction' key — must be inferred from fieldType
        },
        globalBubbleWidth: 30,
        globalBubbleHeight: 30,
        globalEmptyValue: '',
      );

      // Direction should be inferred as horizontal (matches OMRChecker Python).
      expect(block.direction, equals(FieldDirection.horizontal));

      // q1: A=(134, 684), B=(213, 684), C=(292, 684), D=(371, 684)
      expect(block.traverseBubbles[0][0].x, equals(134));
      expect(block.traverseBubbles[0][0].y, equals(684));
      expect(block.traverseBubbles[0][1].x, equals(213));
      expect(block.traverseBubbles[0][1].y, equals(684));
      expect(block.traverseBubbles[0][2].x, equals(292));
      expect(block.traverseBubbles[0][2].y, equals(684));
      expect(block.traverseBubbles[0][3].x, equals(371));
      expect(block.traverseBubbles[0][3].y, equals(684));

      // q2 (one row down): A=(134, 746), D=(371, 746)
      expect(block.traverseBubbles[1][0].x, equals(134));
      expect(block.traverseBubbles[1][0].y, equals(746));
      expect(block.traverseBubbles[1][3].x, equals(371));
      expect(block.traverseBubbles[1][3].y, equals(746));

      // q11 (last): A=(134, 684 + 10*62) = (134, 1304)
      expect(block.traverseBubbles[10][0].x, equals(134));
      expect(block.traverseBubbles[10][0].y, equals(1304));
    });

    test('OMRTemplate.sample4() infers horizontal direction for QTYPE_MCQ4', () {
      final template = OMRTemplate.sample4();
      final block = template.fieldBlocks.first;

      // Bug regression: sample 4 must be horizontal so that bubble A,B,C,D
      // are spread along X (matching the actual scanned sheet) and the
      // 11 questions are spread along Y.
      expect(block.direction, equals(FieldDirection.horizontal));
      expect(block.traverseBubbles.first.first.x, equals(134));
      expect(block.traverseBubbles.first.first.y, equals(684));
      expect(block.traverseBubbles[1].first.y, equals(746));
    });

    test('explicit direction overrides fieldType default', () {
      // Even though QTYPE_MCQ4 defaults to horizontal, an explicit
      // 'direction: vertical' in config should win.
      final block = FieldBlock.fromConfig(
        name: 'mcq_vertical',
        config: {
          'fieldType': 'QTYPE_MCQ4',
          'direction': 'vertical',
          'fieldLabels': ['q1'],
          'bubblesGap': 55,
          'labelsGap': 45,
          'origin': [100, 200],
        },
        globalBubbleWidth: 35,
        globalBubbleHeight: 35,
        globalEmptyValue: '',
      );

      expect(block.direction, equals(FieldDirection.vertical));
      // A=(100,200), B=(100,255), C=(100,310), D=(100,365)
      expect(block.traverseBubbles[0][0].x, equals(100));
      expect(block.traverseBubbles[0][0].y, equals(200));
      expect(block.traverseBubbles[0][3].x, equals(100));
      expect(block.traverseBubbles[0][3].y, equals(365));
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
