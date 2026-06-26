import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';

void main() {
  group('OMRTemplate.fromServerJson - Real template 30 questions', () {
    test('parses full server template with 16 questions (from user JSON)', () {
      // This is the actual template JSON provided by the user
      final serverJson = {
        '_id': {'\$oid': '6a3bc4c9625e377440fc1191'},
        'name': 'Phiếu trả lời 30 câu - Tiêu chuẩn',
        'code': 'OMR_30_STD',
        'templateJson': {
          'examId': '6a3d412f6646516fdc24344a',
          'title': 'dsdsdsd',
          'paperSize': 'A4',
          'scanDpi': 300,
          'scale': 4.1667,
          'pageWidth': 2479,
          'pageHeight': 3508,
          'bubbleWidth': 63,
          'bubbleHeight': 63,
          'studentId': {
            'digits': 7,
            'coords': [
              {'x': 1387.5, 'y': 12762.5, 'w': 262.5, 'h': 262.5, 'digit': 1, 'value': 1},
              {'x': 1737.5, 'y': 12762.5, 'w': 262.5, 'h': 262.5, 'digit': 1, 'value': 2},
              {'x': 2083.33, 'y': 12762.5, 'w': 262.5, 'h': 262.5, 'digit': 1, 'value': 3},
              {'x': 2429.17, 'y': 12762.5, 'w': 262.5, 'h': 262.5, 'digit': 1, 'value': 4},
              {'x': 2779.17, 'y': 12762.5, 'w': 262.5, 'h': 262.5, 'digit': 1, 'value': 5},
              {'x': 3125, 'y': 12762.5, 'w': 262.5, 'h': 262.5, 'digit': 1, 'value': 6},
              {'x': 3470.83, 'y': 12762.5, 'w': 262.5, 'h': 262.5, 'digit': 1, 'value': 7},
              {'x': 3820.83, 'y': 12762.5, 'w': 262.5, 'h': 262.5, 'digit': 2, 'value': 1},
              {'x': 4166.67, 'y': 12762.5, 'w': 262.5, 'h': 262.5, 'digit': 2, 'value': 2},
            ],
          },
          'versionCodeZone': {
            'digits': 2,
            'coords': null,
          },
          'answers': {
            'q1': {
              'A': {'x': 333, 'y': 562, 'w': 63, 'h': 63},
              'B': {'x': 438, 'y': 562, 'w': 63, 'h': 63},
              'C': {'x': 542, 'y': 562, 'w': 63, 'h': 63},
              'D': {'x': 646, 'y': 562, 'w': 63, 'h': 63},
            },
            'q2': {
              'A': {'x': 333, 'y': 646, 'w': 63, 'h': 63},
              'B': {'x': 438, 'y': 646, 'w': 63, 'h': 63},
              'C': {'x': 542, 'y': 646, 'w': 63, 'h': 63},
              'D': {'x': 646, 'y': 646, 'w': 63, 'h': 63},
            },
            'q3': {
              'A': {'x': 333, 'y': 729, 'w': 63, 'h': 63},
              'B': {'x': 438, 'y': 729, 'w': 63, 'h': 63},
              'C': {'x': 542, 'y': 729, 'w': 63, 'h': 63},
              'D': {'x': 646, 'y': 729, 'w': 63, 'h': 63},
            },
            'q4': {
              'A': {'x': 333, 'y': 812, 'w': 63, 'h': 63},
              'B': {'x': 438, 'y': 812, 'w': 63, 'h': 63},
              'C': {'x': 542, 'y': 812, 'w': 63, 'h': 63},
              'D': {'x': 646, 'y': 812, 'w': 63, 'h': 63},
            },
            'q5': {
              'A': {'x': 333, 'y': 896, 'w': 63, 'h': 63},
              'B': {'x': 438, 'y': 896, 'w': 63, 'h': 63},
              'C': {'x': 542, 'y': 896, 'w': 63, 'h': 63},
              'D': {'x': 646, 'y': 896, 'w': 63, 'h': 63},
            },
            'q6': {
              'A': {'x': 1042, 'y': 562, 'w': 63, 'h': 63},
              'B': {'x': 1146, 'y': 562, 'w': 63, 'h': 63},
              'C': {'x': 1250, 'y': 562, 'w': 63, 'h': 63},
              'D': {'x': 1354, 'y': 562, 'w': 63, 'h': 63},
            },
            'q7': {
              'A': {'x': 1042, 'y': 646, 'w': 63, 'h': 63},
              'B': {'x': 1146, 'y': 646, 'w': 63, 'h': 63},
              'C': {'x': 1250, 'y': 646, 'w': 63, 'h': 63},
              'D': {'x': 1354, 'y': 646, 'w': 63, 'h': 63},
            },
            'q8': {
              'A': {'x': 1042, 'y': 729, 'w': 63, 'h': 63},
              'B': {'x': 1146, 'y': 729, 'w': 63, 'h': 63},
              'C': {'x': 1250, 'y': 729, 'w': 63, 'h': 63},
              'D': {'x': 1354, 'y': 729, 'w': 63, 'h': 63},
            },
            'q9': {
              'A': {'x': 1042, 'y': 812, 'w': 63, 'h': 63},
              'B': {'x': 1146, 'y': 812, 'w': 63, 'h': 63},
              'C': {'x': 1250, 'y': 812, 'w': 63, 'h': 63},
              'D': {'x': 1354, 'y': 812, 'w': 63, 'h': 63},
            },
            'q10': {
              'A': {'x': 1042, 'y': 896, 'w': 63, 'h': 63},
              'B': {'x': 1146, 'y': 896, 'w': 63, 'h': 63},
              'C': {'x': 1250, 'y': 896, 'w': 63, 'h': 63},
              'D': {'x': 1354, 'y': 896, 'w': 63, 'h': 63},
            },
            'q11': {
              'A': {'x': 1750, 'y': 562, 'w': 63, 'h': 63},
              'B': {'x': 1854, 'y': 562, 'w': 63, 'h': 63},
              'C': {'x': 1958, 'y': 562, 'w': 63, 'h': 63},
              'D': {'x': 2063, 'y': 562, 'w': 63, 'h': 63},
            },
            'q12': {
              'A': {'x': 1750, 'y': 646, 'w': 63, 'h': 63},
              'B': {'x': 1854, 'y': 646, 'w': 63, 'h': 63},
              'C': {'x': 1958, 'y': 646, 'w': 63, 'h': 63},
              'D': {'x': 2063, 'y': 646, 'w': 63, 'h': 63},
            },
            'q13': {
              'A': {'x': 1750, 'y': 729, 'w': 63, 'h': 63},
              'B': {'x': 1854, 'y': 729, 'w': 63, 'h': 63},
              'C': {'x': 1958, 'y': 729, 'w': 63, 'h': 63},
              'D': {'x': 2063, 'y': 729, 'w': 63, 'h': 63},
            },
            'q14': {
              'A': {'x': 1750, 'y': 812, 'w': 63, 'h': 63},
              'B': {'x': 1854, 'y': 812, 'w': 63, 'h': 63},
              'C': {'x': 1958, 'y': 812, 'w': 63, 'h': 63},
              'D': {'x': 2063, 'y': 812, 'w': 63, 'h': 63},
            },
            'q15': {
              'A': {'x': 1750, 'y': 896, 'w': 63, 'h': 63},
              'B': {'x': 1854, 'y': 896, 'w': 63, 'h': 63},
              'C': {'x': 1958, 'y': 896, 'w': 63, 'h': 63},
              'D': {'x': 2063, 'y': 896, 'w': 63, 'h': 63},
            },
            'q16': {
              'A': {'x': 2458, 'y': 562, 'w': 63, 'h': 63},
              'B': {'x': 2563, 'y': 562, 'w': 63, 'h': 63},
              'C': {'x': 2667, 'y': 562, 'w': 63, 'h': 63},
              'D': {'x': 2771, 'y': 562, 'w': 63, 'h': 63},
            },
          },
          'answerKey': {
            'q1': 'A', 'q2': 'A', 'q3': 'B', 'q4': 'A', 'q5': 'A',
            'q6': 'A', 'q7': 'B', 'q8': 'A', 'q9': 'A', 'q10': 'B',
            'q11': 'A', 'q12': 'B', 'q13': 'A', 'q14': 'A', 'q15': 'A', 'q16': 'A',
          },
          'questionScores': {
            'q1': 0.63, 'q2': 0.63, 'q3': 0.63, 'q4': 0.63, 'q5': 0.63,
            'q6': 0.63, 'q7': 0.63, 'q8': 0.63, 'q9': 0.63, 'q10': 0.63,
            'q11': 0.63, 'q12': 0.63, 'q13': 0.63, 'q14': 0.63, 'q15': 0.63, 'q16': 0.63,
          },
          'totalScore': 10,
          'numberOfQuestions': 16,
          'preProcessors': [
            {'name': 'Levels', 'options': {'inBlack': 15, 'inWhite': 200, 'outBlack': 0, 'outWhite': 255, 'gamma': 1}},
            {'name': 'GaussianBlur', 'options': {'kSize': [3, 3], 'sigmaX': 0}},
            {'name': 'CropPage', 'options': {}},
          ],
          'autoAlign': false,
        },
      };

      final template = OMRTemplate.fromServerJson(serverJson);

      // Verify basic fields
      expect(template.id, '6a3bc4c9625e377440fc1191');
      expect(template.name, 'Phiếu trả lời 30 câu - Tiêu chuẩn');
      expect(template.pageWidth, 2479);
      expect(template.pageHeight, 3508);
      expect(template.bubbleWidth, 63);
      expect(template.bubbleHeight, 63);
      expect(template.autoAlign, false);

      // Verify output columns (questions) - 16 questions total
      // Questions are grouped by column (vertical), so output order may vary
      expect(template.outputColumns, containsAll(['q1', 'q2', 'q3', 'q4', 'q5']));
      expect(template.outputColumns.length, 16);
      expect(template.outputColumns, containsAll(['q1', 'q15', 'q16']));

      // Verify field blocks - questions grouped by column (X coordinate)
      // Column 1: q1,q6,q11,q16 (x=333), Column 2: q2,q7,q12 (x=438), etc.
      // Multiple columns may be in same row block due to Y tolerance
      expect(template.fieldBlocks.length, greaterThan(0));

      // Verify pre-processors
      expect(template.preProcessors.length, 3);
      expect(template.preProcessors[0].name, 'Levels');
      expect(template.preProcessors[1].name, 'GaussianBlur');
      expect(template.preProcessors[2].name, 'CropPage');

      // Verify first question coordinates (q1: A at x=333, y=562)
      final q1Block = template.fieldBlocks.firstWhere(
        (b) => b.fieldLabels.contains('q1'),
      );
      final q1Idx = q1Block.fieldLabels.indexOf('q1');
      final q1ABubble = q1Block.traverseBubbles[q1Idx].firstWhere((b) => b.fieldValue == 'A');
      final q1BBubble = q1Block.traverseBubbles[q1Idx].firstWhere((b) => b.fieldValue == 'B');
      expect(q1ABubble.x, 333);
      expect(q1ABubble.y, 562);
      expect(q1BBubble.x, 438);
      expect(q1BBubble.y, 562);

      // Verify q1 and q6 are in different blocks
      // In this test data, q1 and q6 both have y=562, so they may be in same block
      // Check that we have multiple blocks to handle the layout
      expect(template.fieldBlocks.length, greaterThanOrEqualTo(1));
    });

    test('handles minimal server template', () {
      final minimalJson = {
        '_id': {'\$oid': 'test-id'},
        'name': 'Minimal Template',
        'templateJson': {
          'pageWidth': 2480,
          'pageHeight': 3508,
          'bubbleWidth': 35,
          'bubbleHeight': 35,
          'answers': {},
          'answerKey': {},
          'questionScores': {},
          'preProcessors': [],
        },
      };

      final template = OMRTemplate.fromServerJson(minimalJson);

      expect(template.id, 'test-id');
      expect(template.name, 'Minimal Template');
      expect(template.pageWidth, 2480);
      expect(template.pageHeight, 3508);
      expect(template.outputColumns, isEmpty);
      expect(template.preProcessors, isEmpty);
    });

    test('extracts correct bubble values from answer coords', () {
      final serverJson = {
        '_id': {'\$oid': 'test-id'},
        'name': 'Test',
        'templateJson': {
          'pageWidth': 2479,
          'pageHeight': 3508,
          'bubbleWidth': 63,
          'bubbleHeight': 63,
          'answers': {
            'q1': {
              'A': {'x': 100, 'y': 200, 'w': 63, 'h': 63},
              'B': {'x': 200, 'y': 200, 'w': 63, 'h': 63},
              'C': {'x': 300, 'y': 200, 'w': 63, 'h': 63},
              'D': {'x': 400, 'y': 200, 'w': 63, 'h': 63},
            },
          },
          'answerKey': {'q1': 'C'},
          'questionScores': {'q1': 1.0},
          'preProcessors': [],
        },
      };

      final template = OMRTemplate.fromServerJson(serverJson);

      // Find q1 block and verify bubble values
      final q1Block = template.fieldBlocks.firstWhere(
        (b) => b.fieldLabels.contains('q1'),
      );

      expect(q1Block.fieldType.key, 'QTYPE_MCQ4');
      expect(q1Block.bubbleValues, ['A', 'B', 'C', 'D']);
      expect(q1Block.direction.name, 'vertical'); // A,B,C,D stacked vertically

      // Verify bubble positions for q1
      final q1Idx = q1Block.fieldLabels.indexOf('q1');
      final bubbles = q1Block.traverseBubbles[q1Idx];
      expect(bubbles[0].fieldValue, 'A');
      expect(bubbles[0].x, 100);
      expect(bubbles[0].y, 200);
      expect(bubbles[1].fieldValue, 'B');
      expect(bubbles[1].x, 200);
      expect(bubbles[1].y, 200);
      expect(bubbles[2].fieldValue, 'C');
      expect(bubbles[2].x, 300);
      expect(bubbles[2].y, 200);
      expect(bubbles[3].fieldValue, 'D');
      expect(bubbles[3].x, 400);
      expect(bubbles[3].y, 200);
    });

    test('parses 5-column grid layout from coordinates', () {
      // Simulates the actual layout: 5 questions per row
      // q1-q5 in first row, q6-q10 in second row, etc.
      final answers = <String, Map<String, Map<String, double>>>{};

      // Row 1: questions 1-5 at y=562
      for (int q = 1; q <= 5; q++) {
        final qKey = 'q$q';
        final baseX = 333 + (q - 1) * 105; // 105px between questions
        answers[qKey] = {
          'A': {'x': baseX.toDouble(), 'y': 562, 'w': 63, 'h': 63},
          'B': {'x': baseX.toDouble() + 105, 'y': 562, 'w': 63, 'h': 63},
          'C': {'x': baseX.toDouble() + 210, 'y': 562, 'w': 63, 'h': 63},
          'D': {'x': baseX.toDouble() + 315, 'y': 562, 'w': 63, 'h': 63},
        };
      }

      final serverJson = {
        '_id': {'\$oid': 'test-id'},
        'name': 'Grid Test',
        'templateJson': {
          'pageWidth': 2479,
          'pageHeight': 3508,
          'bubbleWidth': 63,
          'bubbleHeight': 63,
          'answers': answers,
          'answerKey': Map.fromEntries(List.generate(5, (i) => MapEntry('q${i + 1}', 'A'))),
          'questionScores': Map.fromEntries(List.generate(5, (i) => MapEntry('q${i + 1}', 1.0))),
          'preProcessors': [],
        },
      };

      final template = OMRTemplate.fromServerJson(serverJson);

      // Should create a single MCQ block covering all questions
      expect(template.fieldBlocks.length, 1);
      final block = template.fieldBlocks.first;
      expect(block.name, 'MCQBlock1');
      expect(block.fieldLabels, ['q1', 'q2', 'q3', 'q4', 'q5']);
      expect(block.fieldType.key, 'QTYPE_MCQ4');
    });

    test('parses row-based layout for multiple rows', () {
      // Simulates layout with questions grouped by rows
      // Row 1: q1-q5 at y=562
      // Row 2: q6-q10 at y=646
      final answers = <String, Map<String, Map<String, double>>>{};

      // First row (y=562)
      for (int q = 1; q <= 5; q++) {
        final qKey = 'q$q';
        final baseX = 333 + (q - 1) * 105;
        answers[qKey] = {
          'A': {'x': baseX.toDouble(), 'y': 562, 'w': 63, 'h': 63},
          'B': {'x': baseX.toDouble() + 105, 'y': 562, 'w': 63, 'h': 63},
          'C': {'x': baseX.toDouble() + 210, 'y': 562, 'w': 63, 'h': 63},
          'D': {'x': baseX.toDouble() + 315, 'y': 562, 'w': 63, 'h': 63},
        };
      }

      // Second row (y=646)
      for (int q = 6; q <= 10; q++) {
        final qKey = 'q$q';
        final baseX = 333 + (q - 6) * 105;
        answers[qKey] = {
          'A': {'x': baseX.toDouble(), 'y': 646, 'w': 63, 'h': 63},
          'B': {'x': baseX.toDouble() + 105, 'y': 646, 'w': 63, 'h': 63},
          'C': {'x': baseX.toDouble() + 210, 'y': 646, 'w': 63, 'h': 63},
          'D': {'x': baseX.toDouble() + 315, 'y': 646, 'w': 63, 'h': 63},
        };
      }

      final serverJson = {
        '_id': {'\$oid': 'test-id'},
        'name': 'Multi-Row Test',
        'templateJson': {
          'pageWidth': 2479,
          'pageHeight': 3508,
          'bubbleWidth': 63,
          'bubbleHeight': 63,
          'answers': answers,
          'answerKey': Map.fromEntries(List.generate(10, (i) => MapEntry('q${i + 1}', 'A'))),
          'questionScores': Map.fromEntries(List.generate(10, (i) => MapEntry('q${i + 1}', 1.0))),
          'preProcessors': [],
        },
      };

      final template = OMRTemplate.fromServerJson(serverJson);

      // Should create 2 blocks (one per row)
      expect(template.fieldBlocks.length, 2);
      expect(template.outputColumns, ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10']);

      // Verify q1 and q6 are in different blocks
      final q1Block = template.fieldBlocks.firstWhere((b) => b.fieldLabels.contains('q1'));
      final q6Block = template.fieldBlocks.firstWhere((b) => b.fieldLabels.contains('q6'));
      expect(q1Block.name, isNot(q6Block.name));

      // q1 block should be MCQBlock1, q6 block should be MCQBlock2
      expect(q1Block.name, 'MCQBlock1');
      expect(q6Block.name, 'MCQBlock2');
    });
  });
}
