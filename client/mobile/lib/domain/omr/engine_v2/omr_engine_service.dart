import 'omr_scanner.dart';
import 'scoring_engine.dart';
import 'omr_template.dart';
import 'omr_models.dart';

class OmrEngineService {
  final OmrScanner _scanner = OmrScanner();
  final ScoringEngine _scorer = ScoringEngine();

  Future<OmrGradingResult> scanAndGrade({
    required List<int> imageBytes,
    required Map<String, dynamic> templateJson,
  }) async {
    final template = OmrTemplate.fromJson(templateJson);
    final scanResult = await _scanner.scan(
      imageBytes: imageBytes,
      template: template,
    );

    final gradingResult = _scorer.grade(
      detectedAnswers: scanResult.answers,
      answerKey: template.answerKey,
      questionScores: template.questionScores,
      totalScore: template.totalScore,
    );

    return gradingResult;
  }
}
