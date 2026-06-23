part of 'omr_scanner_bloc.dart';

abstract class OMRScannerState extends Equatable {
  const OMRScannerState();

  @override
  List<Object?> get props => [];
}

class OMRScannerInitial extends OMRScannerState {}

class OMRScannerLoadingTemplate extends OMRScannerState {}

class OMRScannerTemplateReady extends OMRScannerState {
  final OMRTemplate template;
  final EvaluationConfig? evaluationConfig;
  final String? examId;
  final String? examName;
  final String? classId;
  final String? className;

  const OMRScannerTemplateReady({
    required this.template,
    this.evaluationConfig,
    this.examId,
    this.examName,
    this.classId,
    this.className,
  });

  @override
  List<Object?> get props => [template, evaluationConfig, examId, examName, classId, className];
}

class OMRScannerImageReady extends OMRScannerState {
  final Uint8List imageBytes;

  const OMRScannerImageReady({required this.imageBytes});

  @override
  List<Object?> get props => [imageBytes];
}

class OMRScannerProcessing extends OMRScannerState {
  final Uint8List imageBytes;
  final List<String> steps;

  const OMRScannerProcessing({
    required this.imageBytes,
    required this.steps,
  });

  @override
  List<Object?> get props => [imageBytes, steps];
}

class OMRScannerSuccess extends OMRScannerState {
  final Uint8List imageBytes;
  final OMRProcessingResult processingResult;
  final OMRGradingResult gradingResult;
  final List<QuestionScoreResult>? questionScores;

  const OMRScannerSuccess({
    required this.imageBytes,
    required this.processingResult,
    required this.gradingResult,
    this.questionScores,
  });

  @override
  List<Object?> get props => [imageBytes, processingResult, gradingResult, questionScores];
}

class OMRScannerSubmitting extends OMRScannerState {
  final Uint8List imageBytes;
  final OMRGradingResult gradingResult;

  const OMRScannerSubmitting({
    required this.imageBytes,
    required this.gradingResult,
  });

  @override
  List<Object?> get props => [imageBytes, gradingResult];
}

class OMRScannerSubmitted extends OMRScannerState {
  final OMRGradingResult gradingResult;
  final bool submittedOnline;

  const OMRScannerSubmitted({
    required this.gradingResult,
    required this.submittedOnline,
  });

  @override
  List<Object?> get props => [gradingResult, submittedOnline];
}

class OMRScannerError extends OMRScannerState {
  final String message;
  final List<String> steps;

  const OMRScannerError({
    required this.message,
    this.steps = const [],
  });

  @override
  List<Object?> get props => [message, steps];
}
