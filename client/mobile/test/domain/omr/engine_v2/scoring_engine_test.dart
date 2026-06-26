import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/omr/engine_v2/scoring_engine.dart';

void main() {
  group('ScoringEngine.grade', () {
    final scorer = ScoringEngine();

    test('matches letter answerKey correctly', () {
      final result = scorer.grade(
        detectedAnswers: {'q1': 'B', 'q2': 'A'},
        answerKey: {'q1': 'B', 'q2': 'C'},
        questionScores: {'q1': 1.0, 'q2': 1.0},
        totalScore: 2.0,
      );

      expect(result.correctCount, 1);
      expect(result.incorrectCount, 1);
      expect(result.unmarkedCount, 0);
      expect(result.totalScore, 1.0);
      expect(result.maxScore, 2.0);
      expect(result.percentage, 50.0);
    });

    test('handles all-correct answer key', () {
      final result = scorer.grade(
        detectedAnswers: {'q1': 'A', 'q2': 'C'},
        answerKey: {'q1': 'A', 'q2': 'C'},
        questionScores: {'q1': 1.0, 'q2': 1.0},
        totalScore: 2.0,
      );

      expect(result.correctCount, 2);
      expect(result.totalScore, 2.0);
      expect(result.percentage, 100.0);
      expect(result.grade, 'A+');
    });

    test('handles missing detected answers as unmarked', () {
      final result = scorer.grade(
        detectedAnswers: {'q1': 'A'},
        answerKey: {'q1': 'A', 'q2': 'B'},
        questionScores: {'q1': 1.0, 'q2': 1.0},
        totalScore: 2.0,
      );

      expect(result.unmarkedCount, 1);
      expect(result.correctCount, 1);
    });

    test('honors per-question scores', () {
      final result = scorer.grade(
        detectedAnswers: {'q1': 'A', 'q2': 'C'},
        answerKey: {'q1': 'A', 'q2': 'B'},
        questionScores: {'q1': 0.5, 'q2': 1.5},
        totalScore: 2.0,
      );

      expect(result.correctCount, 1);
      expect(result.totalScore, 0.5);
      expect(result.maxScore, 2.0);
    });
  });
}