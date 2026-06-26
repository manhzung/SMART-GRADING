part of 'batch_scan_bloc.dart';

abstract class BatchScanState extends Equatable {
  const BatchScanState();

  @override
  List<Object?> get props => [];
}

class BatchScanInitial extends BatchScanState {}

class BatchScanReady extends BatchScanState {
  final String examId;
  final String examName;
  final String classId;
  final String className;
  final int scannedCount;

  const BatchScanReady({
    required this.examId,
    required this.examName,
    required this.classId,
    required this.className,
    this.scannedCount = 0,
  });

  @override
  List<Object?> get props => [examId, examName, classId, className, scannedCount];
}

class BatchScanCapturing extends BatchScanState {
  final String examId;
  final int scannedCount;

  const BatchScanCapturing({
    required this.examId,
    required this.scannedCount,
  });

  @override
  List<Object?> get props => [examId, scannedCount];
}

class BatchScanResultReady extends BatchScanState {
  final String examId;
  final Uint8List imageBytes;
  final OmrGradingResult gradingResult;
  final String? studentCode;
  final String? versionCode;
  final int scannedCount;

  const BatchScanResultReady({
    required this.examId,
    required this.imageBytes,
    required this.gradingResult,
    this.studentCode,
    this.versionCode,
    required this.scannedCount,
  });

  @override
  List<Object?> get props => [examId, imageBytes, gradingResult, studentCode, versionCode, scannedCount];
}

class BatchScanSubmitting extends BatchScanState {
  final String examId;
  final int scannedCount;

  const BatchScanSubmitting({
    required this.examId,
    required this.scannedCount,
  });

  @override
  List<Object?> get props => [examId, scannedCount];
}

class BatchScanSummary extends BatchScanState {
  final String examId;
  final String classId;
  final List<BatchScanItem> results;
  final int totalScanned;
  final double averageScore;
  final double highestScore;
  final double lowestScore;

  const BatchScanSummary({
    required this.examId,
    required this.classId,
    required this.results,
    required this.totalScanned,
    required this.averageScore,
    required this.highestScore,
    required this.lowestScore,
  });

  @override
  List<Object?> get props => [examId, classId, results, totalScanned, averageScore, highestScore, lowestScore];
}

class BatchScanError extends BatchScanState {
  final String message;
  final String examId;
  final int scannedCount;

  const BatchScanError({
    required this.message,
    required this.examId,
    required this.scannedCount,
  });

  @override
  List<Object?> get props => [message, examId, scannedCount];
}

class BatchScanItem {
  final String id;
  final Uint8List thumbnail;
  final OmrGradingResult gradingResult;
  final String? studentCode;
  final String? versionCode;
  final DateTime scannedAt;

  const BatchScanItem({
    required this.id,
    required this.thumbnail,
    required this.gradingResult,
    this.studentCode,
    this.versionCode,
    required this.scannedAt,
  });
}
