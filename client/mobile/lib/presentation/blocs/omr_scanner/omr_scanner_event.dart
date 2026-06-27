part of 'omr_scanner_bloc.dart';

abstract class OMRScannerEvent extends Equatable {
  const OMRScannerEvent();

  @override
  List<Object?> get props => [];
}

class OMRScannerTemplateSet extends OMRScannerEvent {
  final Map<String, dynamic> templateJson;
  final String? examId;
  final String? examName;
  final String? classId;
  final String? className;

  const OMRScannerTemplateSet({
    required this.templateJson,
    this.examId,
    this.examName,
    this.classId,
    this.className,
  });

  @override
  List<Object?> get props => [templateJson, examId, examName, classId, className];
}

class OMRScannerLoadFromServer extends OMRScannerEvent {
  final String examId;
  final String? examName;
  final String? classId;

  const OMRScannerLoadFromServer({required this.examId, this.examName, this.classId});

  @override
  List<Object?> get props => [examId, examName, classId];
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

class OMRScannerLoadClassStudents extends OMRScannerEvent {
  final String classId;

  const OMRScannerLoadClassStudents(this.classId);

  @override
  List<Object?> get props => [classId];
}

class OMRScannerConfirmStudent extends OMRScannerEvent {
  final ClassStudent student;

  const OMRScannerConfirmStudent(this.student);

  @override
  List<Object?> get props => [student];
}
