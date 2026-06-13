/// Scoring/grading configuration parsed from evaluation.json.
class EvaluationConfig {
  final List<String> questionsInOrder;
  final List<dynamic> answersInOrder;
  final MarkingScheme defaultScheme;
  final Map<String, SectionMarkingScheme> sectionSchemes;
  final bool shouldExplainScoring;

  const EvaluationConfig({
    required this.questionsInOrder,
    required this.answersInOrder,
    required this.defaultScheme,
    this.sectionSchemes = const {},
    this.shouldExplainScoring = false,
  });

  factory EvaluationConfig.fromJson(Map<String, dynamic> json, {String emptyVal = ''}) {
    final options = json['options'] as Map<String, dynamic>? ?? {};
    final markingRaw = json['marking_schemes'] as Map<String, dynamic>? ?? {};

    final questions = (options['questions_in_order'] as List<dynamic>?)
        ?.map((e) => e.toString())
        .toList() ??
        [];
    final answers = (options['answers_in_order'] as List<dynamic>?)
        ?.map((e) => e)
        .toList() ??
        [];

    final defaultMarking = markingRaw['DEFAULT'] as Map<String, dynamic>? ??
        markingRaw['default'] as Map<String, dynamic>? ??
        {'correct': 1, 'incorrect': 0, 'unmarked': 0};
    final defaultScheme = MarkingScheme.fromJson(defaultMarking, emptyVal);

    final sections = <String, SectionMarkingScheme>{};
    for (final entry in markingRaw.entries) {
      if (entry.key == 'DEFAULT' || entry.key == 'default') continue;
      final cfg = entry.value as Map<String, dynamic>;
      final qRaw = cfg['questions'] as List<dynamic>?;
      final questions_ = qRaw?.map((e) => e.toString()).toList() ?? [];
      final marking = cfg['marking'] as Map<String, dynamic>? ?? defaultMarking;
      sections[entry.key] = SectionMarkingScheme(
        sectionKey: entry.key,
        questions: questions_,
        marking: MarkingScheme.fromJson(marking, emptyVal),
      );
    }

    return EvaluationConfig(
      questionsInOrder: questions,
      answersInOrder: answers,
      defaultScheme: defaultScheme,
      sectionSchemes: sections,
      shouldExplainScoring: options['should_explain_scoring'] as bool? ?? false,
    );
  }

  /// Creates a simple evaluation config from a map of questions and correct answers.
  factory EvaluationConfig.simple({
    required Map<String, String> questionAnswers,
    double correct = 1.0,
    double incorrect = 0.0,
    double unmarked = 0.0,
  }) {
    final questions = questionAnswers.keys.toList();
    final answers = questionAnswers.values.toList();
    return EvaluationConfig(
      questionsInOrder: questions,
      answersInOrder: answers,
      defaultScheme: MarkingScheme(correct: correct, incorrect: incorrect, unmarked: unmarked),
    );
  }
}

/// The marking scheme for a section (correct/incorrect/unmarked scores).
class MarkingScheme {
  final double correct;
  final double incorrect;
  final double unmarked;
  final String emptyValue;

  const MarkingScheme({
    required this.correct,
    required this.incorrect,
    required this.unmarked,
    this.emptyValue = '',
  });

  factory MarkingScheme.fromJson(Map<String, dynamic> json, String emptyVal) {
    return MarkingScheme(
      correct: _parseScore(json['correct']),
      incorrect: _parseScore(json['incorrect']),
      unmarked: _parseScore(json['unmarked']),
      emptyValue: json['emptyValue']?.toString() ?? emptyVal,
    );
  }

  static double _parseScore(dynamic value) {
    if (value == null) return 0.0;
    if (value is num) return value.toDouble();
    final str = value.toString();
    if (str.contains('/')) {
      final parts = str.split('/');
      final num = double.tryParse(parts[0]) ?? 0;
      final den = double.tryParse(parts[1]) ?? 1;
      return den == 0 ? 0 : num / den;
    }
    return double.tryParse(str) ?? 0.0;
  }
}

/// A section with custom marking scheme.
class SectionMarkingScheme {
  final String sectionKey;
  final List<String> questions;
  final MarkingScheme marking;

  const SectionMarkingScheme({
    required this.sectionKey,
    required this.questions,
    required this.marking,
  });

  bool containsQuestion(String q) => questions.contains(q);
}
