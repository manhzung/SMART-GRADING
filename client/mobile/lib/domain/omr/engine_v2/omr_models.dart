class OmrScanResult {
  final String studentId;
  final String versionCode;
  final Map<String, String> answers;
  final Duration processingTime;
  final List<String> processingSteps;
  final bool wasWarped;  // true if proper perspective warp, false if simple resize fallback

  OmrScanResult({
    required this.studentId,
    required this.versionCode,
    required this.answers,
    required this.processingTime,
    required this.processingSteps,
    this.wasWarped = true,
  });
}

class QuestionScoreResult {
  final int position;
  final String? detectedAnswer;
  final String? correctAnswer;
  final bool isCorrect;
  final bool isUnmarked;
  final double score;
  final double maxScore;

  QuestionScoreResult({
    required this.position,
    this.detectedAnswer,
    this.correctAnswer,
    required this.isCorrect,
    required this.isUnmarked,
    required this.score,
    required this.maxScore,
  });
}

class OmrGradingResult {
  final double totalScore;
  final double maxScore;
  final double percentage;
  final String grade;
  final List<QuestionScoreResult> questionScores;
  final int correctCount;
  final int incorrectCount;
  final int unmarkedCount;

  OmrGradingResult({
    required this.totalScore,
    required this.maxScore,
    required this.percentage,
    required this.grade,
    required this.questionScores,
    required this.correctCount,
    required this.incorrectCount,
    required this.unmarkedCount,
  });
}
