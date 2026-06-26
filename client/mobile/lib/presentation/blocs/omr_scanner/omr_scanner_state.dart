part of 'omr_scanner_bloc.dart';

abstract class OMRScannerState extends Equatable {
  const OMRScannerState();

  @override
  List<Object?> get props => [];
}

class OMRScannerInitial extends OMRScannerState {}

class OMRScannerLoadingTemplate extends OMRScannerState {}

class OMRScannerTemplateReady extends OMRScannerState {
  final Map<String, dynamic> templateJson;
  final String? examId;
  final String? examName;
  final String? classId;
  final String? className;

  const OMRScannerTemplateReady({
    required this.templateJson,
    this.examId,
    this.examName,
    this.classId,
    this.className,
  });

  @override
  List<Object?> get props => [templateJson, examId, examName, classId, className];
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
  final String? studentCode;
  final String? versionCode;
  final ClassStudent? matchedStudent;

  const OMRScannerSuccess({
    required this.imageBytes,
    required this.processingResult,
    required this.gradingResult,
    this.questionScores,
    this.studentCode,
    this.versionCode,
    this.matchedStudent,
  });

  @override
  List<Object?> get props => [
    imageBytes, processingResult, gradingResult,
    questionScores, studentCode, versionCode, matchedStudent
  ];
}

class OMRScannerStudentConfirmed extends OMRScannerState {
  final Uint8List imageBytes;
  final OMRGradingResult gradingResult;
  final ClassStudent student;

  const OMRScannerStudentConfirmed({
    required this.imageBytes,
    required this.gradingResult,
    required this.student,
  });

  @override
  List<Object?> get props => [imageBytes, gradingResult, student];
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
  final ClassStudent? student;

  const OMRScannerSubmitted({
    required this.gradingResult,
    required this.submittedOnline,
    this.student,
  });

  @override
  List<Object?> get props => [gradingResult, submittedOnline, student];
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
