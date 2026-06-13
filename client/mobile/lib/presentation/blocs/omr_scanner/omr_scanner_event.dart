part of 'omr_scanner_bloc.dart';

abstract class OMRScannerEvent extends Equatable {
  const OMRScannerEvent();

  @override
  List<Object?> get props => [];
}

class OMRScannerTemplateSet extends OMRScannerEvent {
  final OMRTemplate template;
  final EvaluationConfig? evaluationConfig;
  final String? examId;
  final String? examName;
  final String? classId;
  final String? className;

  const OMRScannerTemplateSet({
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

class OMRScannerLoadFromServer extends OMRScannerEvent {
  final String examId;
  final String? examName;

  const OMRScannerLoadFromServer({required this.examId, this.examName});

  @override
  List<Object?> get props => [examId, examName];
}

class OMRScannerImageCaptured extends OMRScannerEvent {
  final Uint8List imageBytes;

  const OMRScannerImageCaptured({required this.imageBytes});

  @override
  List<Object?> get props => [imageBytes];
}

class OMRScannerImagePicked extends OMRScannerEvent {
  final Uint8List imageBytes;

  const OMRScannerImagePicked({required this.imageBytes});

  @override
  List<Object?> get props => [imageBytes];
}

class OMRScannerProcessStarted extends OMRScannerEvent {
  final Uint8List imageBytes;

  const OMRScannerProcessStarted({required this.imageBytes});

  @override
  List<Object?> get props => [imageBytes];
}

class OMRScannerSubmit extends OMRScannerEvent {}

class OMRScannerReset extends OMRScannerEvent {}
