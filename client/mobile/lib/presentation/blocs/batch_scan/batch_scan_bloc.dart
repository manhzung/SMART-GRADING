import 'dart:typed_data';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:smart_grading_mobile/domain/omr/engine_v2/omr_models.dart';

part 'batch_scan_event.dart';
part 'batch_scan_state.dart';

class BatchScanBloc extends Bloc<BatchScanEvent, BatchScanState> {
  final List<BatchScanItem> _items = [];
  Uint8List? _currentImage;
  OmrGradingResult? _currentGradingResult;
  String? _currentStudentCode;
  String? _currentVersionCode;

  BatchScanBloc() : super(BatchScanInitial()) {
    on<InitializeBatchScan>(_onInitialize);
    on<CaptureForBatch>(_onCapture);
    on<OMRProcessingComplete>(_onProcessingComplete);
    on<OMRProcessingFailed>(_onProcessingFailed);
    on<ConfirmBatchScan>(_onConfirm);
    on<RetakeBatchScan>(_onRetake);
    on<DiscardBatchScan>(_onDiscard);
    on<FinishBatchScan>(_onFinish);
  }

  void _onInitialize(InitializeBatchScan event, Emitter<BatchScanState> emit) {
    _items.clear();
    emit(BatchScanReady(
      examId: event.examId,
      examName: event.examName,
      classId: event.classId,
      className: event.className,
      scannedCount: 0,
    ));
  }

  void _onCapture(CaptureForBatch event, Emitter<BatchScanState> emit) {
    _currentImage = event.imageBytes;
    final current = state;
    final count = current is BatchScanReady ? current.scannedCount :
                  current is BatchScanResultReady ? current.scannedCount : 0;
    
    emit(BatchScanCapturing(
      examId: _getExamId(),
      scannedCount: count,
    ));
  }

  void _onProcessingComplete(OMRProcessingComplete event, Emitter<BatchScanState> emit) {
    _currentImage = event.imageBytes;
    _currentGradingResult = event.gradingResult;
    _currentStudentCode = event.studentCode;
    _currentVersionCode = event.versionCode;

    final count = _items.length;
    emit(BatchScanResultReady(
      examId: _getExamId(),
      imageBytes: event.imageBytes,
      gradingResult: event.gradingResult,
      studentCode: event.studentCode,
      versionCode: event.versionCode,
      scannedCount: count,
    ));
  }

  void _onProcessingFailed(OMRProcessingFailed event, Emitter<BatchScanState> emit) {
    final count = _items.length;
    emit(BatchScanError(
      message: event.message,
      examId: _getExamId(),
      scannedCount: count,
    ));
  }

  void _onConfirm(ConfirmBatchScan event, Emitter<BatchScanState> emit) {
    if (_currentImage == null || _currentGradingResult == null) return;

    final item = BatchScanItem(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      thumbnail: _currentImage!,
      gradingResult: _currentGradingResult!,
      studentCode: _currentStudentCode,
      versionCode: _currentVersionCode,
      scannedAt: DateTime.now(),
    );
    _items.add(item);

    _currentImage = null;
    _currentGradingResult = null;
    _currentStudentCode = null;
    _currentVersionCode = null;

    emit(BatchScanReady(
      examId: _getExamId(),
      examName: _getExamName(),
      classId: _getClassId(),
      className: _getClassName(),
      scannedCount: _items.length,
    ));
  }

  void _onRetake(RetakeBatchScan event, Emitter<BatchScanState> emit) {
    _currentImage = null;
    _currentGradingResult = null;
    _currentStudentCode = null;
    _currentVersionCode = null;

    emit(BatchScanReady(
      examId: _getExamId(),
      examName: _getExamName(),
      classId: _getClassId(),
      className: _getClassName(),
      scannedCount: _items.length,
    ));
  }

  void _onDiscard(DiscardBatchScan event, Emitter<BatchScanState> emit) {
    _currentImage = null;
    _currentGradingResult = null;
    _currentStudentCode = null;
    _currentVersionCode = null;

    emit(BatchScanReady(
      examId: _getExamId(),
      examName: _getExamName(),
      classId: _getClassId(),
      className: _getClassName(),
      scannedCount: _items.length,
    ));
  }

  void _onFinish(FinishBatchScan event, Emitter<BatchScanState> emit) {
    if (_items.isEmpty) {
      emit(BatchScanInitial());
      return;
    }

    double totalScore = 0;
    double highest = 0;
    double lowest = double.infinity;

    for (final item in _items) {
      final score = item.gradingResult.totalScore;
      totalScore += score;
      if (score > highest) highest = score;
      if (score < lowest) lowest = score;
    }

    final avgScore = _items.isNotEmpty ? totalScore / _items.length : 0.0;

    emit(BatchScanSummary(
      examId: _getExamId(),
      classId: _getClassId(),
      results: List.from(_items),
      totalScanned: _items.length,
      averageScore: avgScore,
      highestScore: _items.isEmpty ? 0 : highest,
      lowestScore: _items.isEmpty ? 0 : lowest,
    ));
  }

  String _getExamId() {
    final current = state;
    if (current is BatchScanReady) return current.examId;
    if (current is BatchScanCapturing) return current.examId;
    if (current is BatchScanResultReady) return current.examId;
    if (current is BatchScanError) return current.examId;
    if (current is BatchScanSummary) return current.examId;
    return '';
  }

  String _getExamName() {
    final current = state;
    if (current is BatchScanReady) return current.examName;
    return '';
  }

  String _getClassId() {
    final current = state;
    if (current is BatchScanReady) return current.classId;
    return '';
  }

  String _getClassName() {
    final current = state;
    if (current is BatchScanReady) return current.className;
    return '';
  }
}
