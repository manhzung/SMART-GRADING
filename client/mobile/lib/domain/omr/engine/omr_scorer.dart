import '../models/grading_result.dart';
import '../models/evaluation_config.dart';
import '../models/omr_response.dart';

/// Grades OMR responses against an evaluation config.
class OMRScorer {
  OMRGradingResult grade(
    OMRResponse omrResponse,
    EvaluationConfig config,
  ) {
    final verdicts = <QuestionVerdict>[];
    double currentScore = 0;
    var multiMarked = omrResponse.multiMarked;
    var hasUnmarked = omrResponse.hasUnmarked;

    for (final question in config.questionsInOrder) {
      final markedAnswer = omrResponse.answers[question] ?? '';
      final correctAnswerRaw = _getAnswerForQuestion(question, config);
      final scheme = _getSchemeForQuestion(question, config);

      final verdict = _matchAnswer(markedAnswer, correctAnswerRaw, scheme);

      verdicts.add(QuestionVerdict(
        question: question,
        markedAnswer: markedAnswer,
        correctAnswer: _formatAnswer(correctAnswerRaw),
        verdict: verdict.verdict,
        delta: verdict.delta,
        cumulativeScore: currentScore + verdict.delta,
      ));

      currentScore += verdict.delta;
    }

    final maxScore = config.defaultScheme.correct *
            config.questionsInOrder.length;

    return OMRGradingResult(
      score: currentScore,
      maxScore: maxScore,
      verdicts: verdicts,
      hasMultiMarked: multiMarked,
      hasUnmarked: hasUnmarked,
    );
  }

  _AnswerMatchResult _matchAnswer(
    String markedAnswer,
    dynamic correctAnswer,
    MarkingScheme scheme,
  ) {
    if (correctAnswer is String) {
      return _matchStandard(markedAnswer, correctAnswer, scheme);
    } else if (correctAnswer is List) {
      return _matchMultiple(correctAnswer, markedAnswer, scheme);
    } else {
      return _matchStandard(markedAnswer, markedAnswer, scheme);
    }
  }

  _AnswerMatchResult _matchStandard(
    String marked,
    String correct,
    MarkingScheme scheme,
  ) {
    if (marked.isEmpty || marked == scheme.emptyValue) {
      return _AnswerMatchResult('unmarked', scheme.unmarked);
    }
    if (marked == correct) {
      return _AnswerMatchResult('correct', scheme.correct);
    }
    return _AnswerMatchResult('incorrect', scheme.incorrect);
  }

  _AnswerMatchResult _matchMultiple(
    List<dynamic> allowedAnswers,
    String marked,
    MarkingScheme scheme,
  ) {
    if (marked.isEmpty || marked == scheme.emptyValue) {
      return _AnswerMatchResult('unmarked', scheme.unmarked);
    }
    if (allowedAnswers.contains(marked)) {
      return _AnswerMatchResult('correct', scheme.correct);
    }
    return _AnswerMatchResult('incorrect', scheme.incorrect);
  }

  dynamic _getAnswerForQuestion(String question, EvaluationConfig config) {
    final idx = config.questionsInOrder.indexOf(question);
    if (idx < 0 || idx >= config.answersInOrder.length) {
      return '';
    }
    return config.answersInOrder[idx];
  }

  MarkingScheme _getSchemeForQuestion(String question, EvaluationConfig config) {
    for (final section in config.sectionSchemes.values) {
      if (section.containsQuestion(question)) {
        return section.marking;
      }
    }
    return config.defaultScheme;
  }

  String _formatAnswer(dynamic answer) {
    if (answer is List) {
      return answer.join(', ');
    }
    return answer.toString();
  }
}

class _AnswerMatchResult {
  final String verdict;
  final double delta;

  _AnswerMatchResult(this.verdict, this.delta);
}
