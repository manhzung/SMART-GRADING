// Re-export from engine_v2 for backward compatibility
// These models are now the canonical source
export '../engine_v2/omr_models.dart';

import 'omr_response.dart';

/// Backward compatibility alias - deprecated, use engine_v2/omr_models.dart
@Deprecated('Use OmrGradingResult from engine_v2/omr_models.dart')
class OMRGradingResult {
  final double score;
  final double maxScore;
  final List<QuestionVerdict> verdicts;
  final bool hasMultiMarked;
  final bool hasUnmarked;
  final OMRResponseDebug? debug;

  const OMRGradingResult({
    required this.score,
    required this.maxScore,
    required this.verdicts,
    this.hasMultiMarked = false,
    this.hasUnmarked = false,
    this.debug,
  });

  double get percentage => maxScore > 0 ? (score / maxScore) * 100 : 0.0;

  int get correctCount => verdicts.where((v) => v.verdict == 'correct').length;
  int get incorrectCount => verdicts.where((v) => v.verdict == 'incorrect').length;
  int get unmarkedCount => verdicts.where((v) => v.verdict == 'unmarked').length;

  String get grade {
    final pct = percentage;
    if (pct >= 90) return 'A+';
    if (pct >= 85) return 'A';
    if (pct >= 80) return 'B+';
    if (pct >= 75) return 'B';
    if (pct >= 70) return 'C+';
    if (pct >= 65) return 'C';
    if (pct >= 60) return 'D+';
    if (pct >= 55) return 'D';
    return 'F';
  }

  factory OMRGradingResult.empty() => const OMRGradingResult(
    score: 0,
    maxScore: 0,
    verdicts: [],
  );
}

/// Backward compatibility - deprecated, use QuestionScoreResult from engine_v2/omr_models.dart
@Deprecated('Use QuestionScoreResult from engine_v2/omr_models.dart')
class QuestionVerdict {
  final String question;
  final String markedAnswer;
  final String correctAnswer;
  final String verdict;
  final double delta;
  final double cumulativeScore;

  const QuestionVerdict({
    required this.question,
    required this.markedAnswer,
    required this.correctAnswer,
    required this.verdict,
    required this.delta,
    required this.cumulativeScore,
  });
}
