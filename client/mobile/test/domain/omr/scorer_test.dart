import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/omr/models/evaluation_config.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_response.dart';
import 'package:smart_grading_mobile/domain/omr/models/grading_result.dart';
import 'package:smart_grading_mobile/domain/omr/engine/omr_scorer.dart';

void main() {
  group('OMRScorer', () {
    late OMRScorer scorer;
    late EvaluationConfig evalConfig;

    setUp(() {
      scorer = OMRScorer();
      evalConfig = EvaluationConfig.simple(
        questionAnswers: {
          'q1': 'A',
          'q2': 'B',
          'q3': 'C',
          'q4': 'D',
          'q5': 'A',
        },
        correct: 4.0,
        incorrect: 0.0,
        unmarked: 0.0,
      );
    });

    test('grades all correct answers', () {
      final response = OMRResponse(answers: {
        'q1': 'A',
        'q2': 'B',
        'q3': 'C',
        'q4': 'D',
        'q5': 'A',
      });

      final result = scorer.grade(response, evalConfig);

      expect(result.score, equals(20.0));
      expect(result.correctCount, equals(5));
      expect(result.percentage, equals(100.0));
      expect(result.grade, equals('A+'));
    });

    test('grades all incorrect answers', () {
      final response = OMRResponse(answers: {
        'q1': 'B',
        'q2': 'C',
        'q3': 'D',
        'q4': 'A',
        'q5': 'B',
      });

      final result = scorer.grade(response, evalConfig);

      expect(result.score, equals(0.0));
      expect(result.incorrectCount, equals(5));
    });

    test('grades mixed answers', () {
      final response = OMRResponse(answers: {
        'q1': 'A',
        'q2': 'X',
        'q3': 'C',
        'q4': '',
        'q5': 'A',
      });

      final result = scorer.grade(response, evalConfig);

      expect(result.score, equals(12.0));
      expect(result.correctCount, equals(3));
      expect(result.incorrectCount, equals(1));
      expect(result.unmarkedCount, equals(1));
      expect(result.percentage, equals(60.0));
    });

    test('marks multi-marked response', () {
      final response = OMRResponse(
        answers: {'q1': 'A'},
        multiMarked: true,
      );

      final config = EvaluationConfig.simple(
        questionAnswers: {'q1': 'A'},
        correct: 1.0,
        incorrect: 0.0,
        unmarked: 0.0,
      );

      final result = scorer.grade(response, config);

      expect(result.hasMultiMarked, isTrue);
    });
  });

  group('EvaluationConfig', () {
    test('creates simple config from map', () {
      final config = EvaluationConfig.simple(
        questionAnswers: {'q1': 'A', 'q2': 'B'},
        correct: 2.0,
        incorrect: -1.0,
        unmarked: 0.0,
      );

      expect(config.questionsInOrder, equals(['q1', 'q2']));
      expect(config.answersInOrder, equals(['A', 'B']));
      expect(config.defaultScheme.correct, equals(2.0));
      expect(config.defaultScheme.incorrect, equals(-1.0));
    });

    test('parses JSON evaluation config', () {
      final json = {
        'options': {
          'questions_in_order': ['q1', 'q2', 'q3'],
          'should_explain_scoring': true,
        },
        'marking_schemes': {
          'DEFAULT': {
            'correct': 4,
            'incorrect': 0,
            'unmarked': 0,
          },
        },
      };

      final config = EvaluationConfig.fromJson(json);

      expect(config.questionsInOrder, equals(['q1', 'q2', 'q3']));
      expect(config.shouldExplainScoring, isTrue);
    });

    test('parses fractional scores', () {
      final scheme = MarkingScheme.fromJson({
        'correct': '2/3',
        'incorrect': '-1/3',
        'unmarked': '0',
      }, '');

      expect(scheme.correct, closeTo(0.667, 0.01));
      expect(scheme.incorrect, closeTo(-0.333, 0.01));
    });
  });

  group('OMRResponse', () {
    test('copyWith creates new instance', () {
      final original = OMRResponse(
        answers: {'q1': 'A'},
        multiMarked: false,
      );

      final copy = original.copyWith(multiMarked: true);

      expect(copy.multiMarked, isTrue);
      expect(original.multiMarked, isFalse);
      expect(copy.answers, equals(original.answers));
    });
  });

  group('OMRGradingResult', () {
    test('calculates grade boundaries correctly', () {
      // 89.9% -> A (>= 85)
      expect(
        OMRGradingResult(
          score: 17.98,
          maxScore: 20,
          verdicts: [],
        ).grade,
        equals('A'),
      );
      // 90% -> A+
      expect(
        OMRGradingResult(
          score: 18.0,
          maxScore: 20,
          verdicts: [],
        ).grade,
        equals('A+'),
      );
      // 55% -> D (>= 55)
      expect(
        OMRGradingResult(
          score: 11.0,
          maxScore: 20,
          verdicts: [],
        ).grade,
        equals('D'),
      );
    });

    test('empty result works', () {
      final result = OMRGradingResult.empty();
      expect(result.score, equals(0));
      expect(result.maxScore, equals(0));
      expect(result.percentage, equals(0.0));
    });
  });
}
