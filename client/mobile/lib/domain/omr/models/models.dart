import '../engine_v2/omr_template.dart' as engine_v2;
import '../engine_v2/omr_models.dart';
import 'grading_result.dart';
import 'omr_response.dart';
import 'evaluation_config.dart';

export 'evaluation_config.dart';
export 'grading_result.dart';
export 'omr_response.dart';
export 'omr_template.dart';

// Re-export engine classes  
export '../engine/omr_engine.dart' show OMRProcessingResult;
export '../engine_v2/omr_template.dart' show OmrTemplate, OmrBubbleCoords;
export '../engine_v2/omr_models.dart' show OmrScanResult, OmrGradingResult, QuestionScoreResult;
export '../engine_v2/scoring_engine.dart' show ScoringEngine;
