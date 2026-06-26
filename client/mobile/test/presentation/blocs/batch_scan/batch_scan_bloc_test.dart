import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/presentation/blocs/batch_scan/batch_scan_bloc.dart';
import 'package:smart_grading_mobile/domain/omr/engine_v2/omr_models.dart';

void main() {
  group('BatchScanBloc', () {
    late BatchScanBloc bloc;

    setUp(() {
      bloc = BatchScanBloc();
    });

    tearDown(() {
      bloc.close();
    });

    test('initial state is BatchScanInitial', () {
      expect(bloc.state, isA<BatchScanInitial>());
    });

    test('emits BatchScanReady when InitializeBatchScan is added', () async {
      final stream = bloc.stream;
      
      bloc.add(const InitializeBatchScan(
        examId: 'exam-1',
        examName: 'Math Exam',
        classId: 'class-1',
        className: '10A1',
      ));
      
      await expectLater(
        stream,
        emits(isA<BatchScanReady>()
            .having((s) => s.examId, 'examId', 'exam-1')
            .having((s) => s.examName, 'examName', 'Math Exam')
            .having((s) => s.scannedCount, 'scannedCount', 0)),
      );
    });

    test('emits BatchScanCapturing when CaptureForBatch is added', () async {
      bloc.add(const InitializeBatchScan(
        examId: 'exam-1',
        examName: 'Math Exam',
        classId: 'class-1',
        className: '10A1',
      ));
      
      await Future.delayed(const Duration(milliseconds: 100));
      
      final stream = bloc.stream;
      
      bloc.add(CaptureForBatch(imageBytes: Uint8List(0)));
      
      await expectLater(
        stream,
        emits(isA<BatchScanCapturing>()
            .having((s) => s.examId, 'examId', 'exam-1')
            .having((s) => s.scannedCount, 'scannedCount', 0)),
      );
    });

    test('emits BatchScanError when OMRProcessingFailed is added', () async {
      bloc.add(const InitializeBatchScan(
        examId: 'exam-1',
        examName: 'Math Exam',
        classId: 'class-1',
        className: '10A1',
      ));
      
      await Future.delayed(const Duration(milliseconds: 100));
      
      final stream = bloc.stream;
      
      bloc.add(const OMRProcessingFailed(message: 'Image unclear'));
      
      await expectLater(
        stream,
        emits(isA<BatchScanError>()
            .having((s) => s.message, 'message', 'Image unclear')
            .having((s) => s.scannedCount, 'scannedCount', 0)),
      );
    });

    test('emits BatchScanInitial when FinishBatchScan is added with empty items', () async {
      bloc.add(const InitializeBatchScan(
        examId: 'exam-1',
        examName: 'Math Exam',
        classId: 'class-1',
        className: '10A1',
      ));
      
      await Future.delayed(const Duration(milliseconds: 100));
      
      final stream = bloc.stream;
      
      bloc.add(const FinishBatchScan());
      
      await expectLater(
        stream,
        emits(isA<BatchScanInitial>()),
      );
    });

    test('increments scannedCount after confirming a scan', () async {
      // Initialize
      bloc.add(const InitializeBatchScan(
        examId: 'exam-1',
        examName: 'Math Exam',
        classId: 'class-1',
        className: '10A1',
      ));
      await Future.delayed(const Duration(milliseconds: 100));
      
      // Add processing complete
      bloc.add(OMRProcessingComplete(
        imageBytes: Uint8List(0),
        gradingResult: OmrGradingResult(
          totalScore: 8,
          maxScore: 10,
          percentage: 80,
          grade: 'B+',
          questionScores: [],
          correctCount: 8,
          incorrectCount: 2,
          unmarkedCount: 0,
        ),
        studentCode: '12345',
        versionCode: 'A',
      ));
      await Future.delayed(const Duration(milliseconds: 100));
      
      // Confirm
      bloc.add(const ConfirmBatchScan());
      await Future.delayed(const Duration(milliseconds: 100));
      
      // Check state
      expect(bloc.state, isA<BatchScanReady>());
      expect((bloc.state as BatchScanReady).scannedCount, equals(1));
    });

    test('resets scannedCount when initializing again', () async {
      // Initialize and add one scan
      bloc.add(const InitializeBatchScan(
        examId: 'exam-1',
        examName: 'Math Exam',
        classId: 'class-1',
        className: '10A1',
      ));
      await Future.delayed(const Duration(milliseconds: 100));
      
      bloc.add(OMRProcessingComplete(
        imageBytes: Uint8List(0),
        gradingResult: OmrGradingResult(
          totalScore: 8,
          maxScore: 10,
          percentage: 80,
          grade: 'B+',
          questionScores: [],
          correctCount: 8,
          incorrectCount: 2,
          unmarkedCount: 0,
        ),
      ));
      await Future.delayed(const Duration(milliseconds: 100));
      
      bloc.add(const ConfirmBatchScan());
      await Future.delayed(const Duration(milliseconds: 100));
      
      // Re-initialize
      bloc.add(const InitializeBatchScan(
        examId: 'exam-2',
        examName: 'Physics Exam',
        classId: 'class-2',
        className: '10A2',
      ));
      await Future.delayed(const Duration(milliseconds: 100));
      
      // Check state is reset
      expect(bloc.state, isA<BatchScanReady>());
      final readyState = bloc.state as BatchScanReady;
      expect(readyState.scannedCount, equals(0));
      expect(readyState.examId, equals('exam-2'));
    });
  });
}
