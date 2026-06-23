import 'omr_models.dart';

class ScoringEngine {
  OmrGradingResult grade({
    required Map<String, String> detectedAnswers,
    required Map<String, String> answerKey,
    required Map<String, double> questionScores,
    required double totalScore,
  }) {
    final questionResults = <QuestionScoreResult>[];
    double earnedScore = 0;
    int correctCount = 0;
    int incorrectCount = 0;
    int unmarkedCount = 0;

    final qIds = answerKey.keys.toList()..sort();

    for (int i = 0; i < qIds.length; i++) {
      final qId = qIds[i];
      final detected = detectedAnswers[qId];
      final correct = answerKey[qId];
      final maxScore = questionScores[qId] ?? 1.0;

      final isUnmarked = detected == null;
      final isCorrect = !isUnmarked && detected == correct;
      final score = isCorrect ? maxScore : 0.0;

      if (isUnmarked) {
        unmarkedCount++;
      } else if (isCorrect) {
        correctCount++;
        earnedScore += score;
      } else {
        incorrectCount++;
      }

      questionResults.add(QuestionScoreResult(
        position: i + 1,
        detectedAnswer: detected,
        correctAnswer: correct,
        isCorrect: isCorrect,
        isUnmarked: isUnmarked,
        score: score,
        maxScore: maxScore,
      ));
    }

    final percentage = totalScore > 0 ? (earnedScore / totalScore) * 100 : 0.0;
    final grade = _computeGrade(percentage);

    return OmrGradingResult(
      totalScore: earnedScore,
      maxScore: totalScore,
      percentage: percentage,
      grade: grade,
      questionScores: questionResults,
      correctCount: correctCount,
      incorrectCount: incorrectCount,
      unmarkedCount: unmarkedCount,
    );
  }

  String _computeGrade(double percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'B+';
    if (percentage >= 75) return 'B';
    if (percentage >= 70) return 'C+';
    if (percentage >= 65) return 'C';
    if (percentage >= 55) return 'D';
    return 'F';
  }
}
