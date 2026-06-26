import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/omr/engine_v2/omr_template.dart';

void main() {
  group('OmrTemplate.fromJson', () {
    test('parses AMC-style template with studentId.coords', () {
      final json = {
        'examId': 'exam1',
        'versionCode': '101',
        'paperSize': 'A4',
        'scanDpi': 300,
        'scale': 300 / 72,
        'pageWidth': 2480,
        'pageHeight': 3508,
        'studentId': {
          'digits': 3,
          'coords': [
            {'x': 300, 'y': 833, 'w': 75, 'h': 75, 'digit': 1, 'value': 1},
            {'x': 380, 'y': 833, 'w': 75, 'h': 75, 'digit': 1, 'value': 2},
            {'x': 460, 'y': 833, 'w': 75, 'h': 75, 'digit': 1, 'value': 3},
            {'x': 300, 'y': 908, 'w': 75, 'h': 75, 'digit': 2, 'value': 1},
            {'x': 380, 'y': 908, 'w': 75, 'h': 75, 'digit': 2, 'value': 2},
          ],
        },
        'versionCodeZone': {
          'digits': 1,
          'coords': [
            {'x': 2000, 'y': 833, 'w': 75, 'h': 75, 'digit': 1, 'value': 1},
          ],
        },
        // Note: answers keys use 'q' prefix
        'answers': {
          'q1': {
            'A': {'x': 500, 'y': 1250, 'w': 62, 'h': 62},
            'B': {'x': 580, 'y': 1250, 'w': 62, 'h': 62},
            'C': {'x': 660, 'y': 1250, 'w': 62, 'h': 62},
            'D': {'x': 740, 'y': 1250, 'w': 62, 'h': 62},
          },
          'q2': {
            'A': {'x': 500, 'y': 1312, 'w': 62, 'h': 62},
            'B': {'x': 580, 'y': 1312, 'w': 62, 'h': 62},
            'C': {'x': 660, 'y': 1312, 'w': 62, 'h': 62},
            'D': {'x': 740, 'y': 1312, 'w': 62, 'h': 62},
          },
        },
        // Note: answerKey uses 'q' prefix
        'answerKey': {'q1': 'B', 'q2': 'A'},
        // Note: questionScores uses 'q' prefix
        'questionScores': {'q1': 5.0, 'q2': 5.0},
        'totalScore': 10.0,
        'numberOfQuestions': 2,
      };

      final template = OmrTemplate.fromJson({'template': json});

      expect(template.examId, 'exam1');
      expect(template.versionCode, '101');
      expect(template.pageWidth, 2480);
      expect(template.pageHeight, 3508);
      expect(template.scale, closeTo(4.1667, 0.001));
      
      // Student ID coords - flat array format
      expect(template.studentIdCoords.length, 5);
      expect(template.studentIdCoords[0].x, 300);
      expect(template.studentIdCoords[0].digit, 1);
      expect(template.studentIdCoords[0].value, 1);
      
      // Version code coords
      expect(template.versionCodeCoords.length, 1);
      
      // Answers - uses 'q' prefix
      expect(template.answers['q1']!.length, 4);
      expect(template.answers['q1']!['B']!.x, 580);
      expect(template.answers['q2']!['A']!.x, 500);
      
      // Answer key - uses 'q' prefix
      expect(template.answerKey['q1'], 'B');
      expect(template.answerKey['q2'], 'A');
      
      // Question scores - uses 'q' prefix
      expect(template.questionScores['q1'], 5.0);
      expect(template.questionScores['q2'], 5.0);
      
      expect(template.totalScore, 10.0);
    });

    test('falls back to defaults for missing fields', () {
      final template = OmrTemplate.fromJson({'template': {
        'studentId': {'digits': 0, 'coords': []},
        'versionCodeZone': {'digits': 0, 'coords': []},
        'answers': {},
        'answerKey': {},
        'questionScores': {},
      }});

      expect(template.pageWidth, 2480);
      expect(template.pageHeight, 3508);
      expect(template.totalScore, 10.0);
      expect(template.studentIdCoords, isEmpty);
      expect(template.scale, closeTo(300 / 72, 0.001));
    });

    test('reads root-level fields when template wrapper absent', () {
      final template = OmrTemplate.fromJson({
        'examId': 'root-exam',
        'versionCode': '101',
        'answers': {
          'q1': {
            'A': {'x': 1, 'y': 2, 'w': 3, 'h': 4},
          },
        },
        'answerKey': {'q1': 'A'},
        'questionScores': {'q1': 1.0},
      });

      expect(template.examId, 'root-exam');
      expect(template.answers['q1']!['A']!.x, 1);
      expect(template.answerKey['q1'], 'A');
    });
  });
}