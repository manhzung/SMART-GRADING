import 'app_omr_models.dart';

/// Answer key entry for a single question
class AppAnswerKeyEntry {
  final String correctAnswer;
  final double pointValue;

  const AppAnswerKeyEntry({
    required this.correctAnswer,
    required this.pointValue,
  });

  bool isAnswerCorrect(String? studentAnswer) {
    if (studentAnswer == null || studentAnswer.isEmpty) return false;
    if (correctAnswer.isEmpty) return false;

    final correctSet = correctAnswer
        .toUpperCase()
        .split(',')
        .map((s) => s.trim())
        .toSet();
    final studentSet = studentAnswer
        .toUpperCase()
        .split(',')
        .map((s) => s.trim())
        .toSet();

    return correctSet.length == studentSet.length &&
        correctSet.containsAll(studentSet);
  }
}

/// Answer key containing all questions and correct answers
class AppAnswerKey {
  final Map<String, AppAnswerKeyEntry> entries;

  const AppAnswerKey({required this.entries});

  factory AppAnswerKey.fromMap(Map<String, String> answers,
      {double pointPerQuestion = 1.0}) {
    final entries = <String, AppAnswerKeyEntry>{};
    for (final entry in answers.entries) {
      entries[entry.key] = AppAnswerKeyEntry(
        correctAnswer: entry.value,
        pointValue: pointPerQuestion,
      );
    }
    return AppAnswerKey(entries: entries);
  }

  factory AppAnswerKey.fromQuestions(
    List<Map<String, dynamic>> questions, {
    double defaultPointValue = 1.0,
  }) {
    final entries = <String, AppAnswerKeyEntry>{};
    for (final q in questions) {
      final label =
          q['label'] as String? ?? q['_id'] as String? ?? q['id'] as String? ?? '';
      if (label.isEmpty) continue;

      final correctAnswer =
          q['correctAnswer'] as String? ?? q['answer'] as String? ?? '';
      final pointValue = (q['score'] as num?)?.toDouble() ?? defaultPointValue;

      entries[label] = AppAnswerKeyEntry(
        correctAnswer: correctAnswer,
        pointValue: pointValue,
      );
    }
    return AppAnswerKey(entries: entries);
  }

  AppAnswerKeyEntry? getEntry(String questionLabel) => entries[questionLabel];
}

/// Grading result for a single question
class AppQuestionGradingDetail {
  final String questionLabel;
  final String? studentAnswer;
  final String? correctAnswer;
  final bool isCorrect;
  final bool isUnanswered;
  final double pointValue;
  final double pointsEarned;
  final bool isMultiMarked;

  const AppQuestionGradingDetail({
    required this.questionLabel,
    this.studentAnswer,
    this.correctAnswer,
    required this.isCorrect,
    required this.isUnanswered,
    required this.pointValue,
    required this.pointsEarned,
    this.isMultiMarked = false,
  });

  Map<String, dynamic> toJson() => {
        'questionLabel': questionLabel,
        'studentAnswer': studentAnswer,
        'correctAnswer': correctAnswer,
        'isCorrect': isCorrect,
        'isUnanswered': isUnanswered,
        'pointValue': pointValue,
        'pointsEarned': pointsEarned,
        'isMultiMarked': isMultiMarked,
      };
}

/// Complete grading result
class AppGradingResult {
  final double totalScore;
  final double maxScore;
  final double percentage;
  final int correctCount;
  final int incorrectCount;
  final int unansweredCount;
  final int totalQuestions;
  final bool? passed;
  final double? passingScore;
  final List<AppQuestionGradingDetail> details;

  const AppGradingResult({
    required this.totalScore,
    required this.maxScore,
    required this.percentage,
    required this.correctCount,
    required this.incorrectCount,
    required this.unansweredCount,
    required this.totalQuestions,
    this.passed,
    this.passingScore,
    required this.details,
  });

  factory AppGradingResult.empty() => const AppGradingResult(
        totalScore: 0,
        maxScore: 0,
        percentage: 0,
        correctCount: 0,
        incorrectCount: 0,
        unansweredCount: 0,
        totalQuestions: 0,
        details: [],
      );

  Map<String, dynamic> toJson() => {
        'totalScore': totalScore,
        'maxScore': maxScore,
        'percentage': percentage,
        'correctCount': correctCount,
        'incorrectCount': incorrectCount,
        'unansweredCount': unansweredCount,
        'totalQuestions': totalQuestions,
        'passed': passed,
        'passingScore': passingScore,
        'details': details.map((d) => d.toJson()).toList(),
      };
}

/// Grading service - ports grading_service.dart logic from APP
class AppOMRGradingService {
  AppGradingResult grade(
    AppOmrResult omrResult,
    AppAnswerKey answerKey, {
    double? passingScore,
  }) {
    final details = <AppQuestionGradingDetail>[];
    double totalScore = 0;
    double maxScore = 0;
    int correctCount = 0;
    int incorrectCount = 0;
    int unansweredCount = 0;

    for (final entry in omrResult.responses.entries) {
      final questionLabel = entry.key;
      final studentAnswer = entry.value;

      final keyEntry = answerKey.getEntry(questionLabel);
      if (keyEntry == null) continue;

      maxScore += keyEntry.pointValue;

      final isUnanswered = studentAnswer.isEmpty;

      final bubbleDetail = omrResult.details.firstWhere(
        (d) => d.label == questionLabel,
        orElse: () => const AppBubbleResult(
          label: '',
          markedValue: '',
          isMultiMarked: false,
          intensity: 255,
        ),
      );

      bool isCorrect = false;
      double pointsEarned = 0;

      if (isUnanswered) {
        unansweredCount++;
      } else if (keyEntry.isAnswerCorrect(studentAnswer)) {
        isCorrect = true;
        correctCount++;
        pointsEarned = keyEntry.pointValue;
        totalScore += keyEntry.pointValue;
      } else {
        incorrectCount++;
      }

      details.add(AppQuestionGradingDetail(
        questionLabel: questionLabel,
        studentAnswer: studentAnswer.isEmpty ? null : studentAnswer,
        correctAnswer: keyEntry.correctAnswer.isEmpty ? null : keyEntry.correctAnswer,
        isCorrect: isCorrect,
        isUnanswered: isUnanswered,
        pointValue: keyEntry.pointValue,
        pointsEarned: pointsEarned,
        isMultiMarked: bubbleDetail.isMultiMarked,
      ));
    }

    details.sort((a, b) {
      final aNum = _extractQuestionNumber(a.questionLabel);
      final bNum = _extractQuestionNumber(b.questionLabel);
      return aNum.compareTo(bNum);
    });

    final percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0.0;

    bool? passed;
    if (passingScore != null && maxScore > 0) {
      passed = percentage >= passingScore;
    }

    return AppGradingResult(
      totalScore: totalScore,
      maxScore: maxScore,
      percentage: percentage,
      correctCount: correctCount,
      incorrectCount: incorrectCount,
      unansweredCount: unansweredCount,
      totalQuestions: details.length,
      passed: passed,
      passingScore: passingScore,
      details: details,
    );
  }

  int _extractQuestionNumber(String label) {
    final match = RegExp(r'\d+').firstMatch(label);
    if (match != null) {
      return int.tryParse(match.group(0)!) ?? 0;
    }
    return 0;
  }

  static AppAnswerKey createFromMap(
    Map<String, String> answers, {
    double pointPerQuestion = 1.0,
  }) {
    return AppAnswerKey.fromMap(answers, pointPerQuestion: pointPerQuestion);
  }

  static AppAnswerKey createFromQuestions(
    List<Map<String, dynamic>> questions, {
    double pointPerQuestion = 1.0,
  }) {
    return AppAnswerKey.fromQuestions(questions,
        defaultPointValue: pointPerQuestion);
  }
}
