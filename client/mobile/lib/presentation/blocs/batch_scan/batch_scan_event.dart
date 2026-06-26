part of 'batch_scan_bloc.dart';

abstract class BatchScanEvent extends Equatable {
  const BatchScanEvent();

  @override
  List<Object?> get props => [];
}

class InitializeBatchScan extends BatchScanEvent {
  final String examId;
  final String examName;
  final String classId;
  final String className;

  const InitializeBatchScan({
    required this.examId,
    required this.examName,
    this.classId = '',
    this.className = '',
  });

  @override
  List<Object?> get props => [examId, examName, classId, className];
}

class CaptureForBatch extends BatchScanEvent {
  final Uint8List imageBytes;

  const CaptureForBatch({required this.imageBytes});

  @override
  List<Object?> get props => [imageBytes];
}

class ConfirmBatchScan extends BatchScanEvent {
  const ConfirmBatchScan();
}

class RetakeBatchScan extends BatchScanEvent {
  const RetakeBatchScan();
}

class DiscardBatchScan extends BatchScanEvent {
  const DiscardBatchScan();
}

class FinishBatchScan extends BatchScanEvent {
  const FinishBatchScan();
}

class OMRProcessingComplete extends BatchScanEvent {
  final Uint8List imageBytes;
  final OmrGradingResult gradingResult;
  final String? studentCode;
  final String? versionCode;

  const OMRProcessingComplete({
    required this.imageBytes,
    required this.gradingResult,
    this.studentCode,
    this.versionCode,
  });

  @override
  List<Object?> get props => [imageBytes, gradingResult, studentCode, versionCode];
}

class OMRProcessingFailed extends BatchScanEvent {
  final String message;

  const OMRProcessingFailed({required this.message});

  @override
  List<Object?> get props => [message];
}
