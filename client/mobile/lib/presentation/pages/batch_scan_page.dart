import 'dart:typed_data';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:smart_grading_mobile/presentation/blocs/batch_scan/batch_scan_bloc.dart';
import 'package:smart_grading_mobile/presentation/blocs/camera/camera_bloc.dart';
import 'package:smart_grading_mobile/presentation/widgets/confirmation_popup.dart';
import 'package:smart_grading_mobile/presentation/widgets/batch_counter_badge.dart';
import 'package:smart_grading_mobile/presentation/pages/batch_summary_page.dart';
import 'package:smart_grading_mobile/domain/omr/engine_v2/omr_engine_service.dart';
import 'package:get_it/get_it.dart';

class BatchScanPage extends StatefulWidget {
  final String examId;
  final String examName;
  final String? classId;
  final String? className;
  final Map<String, dynamic>? templateJson;

  const BatchScanPage({
    super.key,
    required this.examId,
    required this.examName,
    this.classId,
    this.className,
    this.templateJson,
  });

  @override
  State<BatchScanPage> createState() => _BatchScanPageState();
}

class _BatchScanPageState extends State<BatchScanPage> {
  late CameraBloc _cameraBloc;
  late BatchScanBloc _batchScanBloc;
  late OmrEngineService _omrEngine;

  @override
  void initState() {
    super.initState();
    _cameraBloc = CameraBloc();
    _cameraBloc.add(CameraInitialize());
    _batchScanBloc = BatchScanBloc();
    
    // Get OMR engine from GetIt or create new instance
    try {
      _omrEngine = GetIt.instance<OmrEngineService>();
    } catch (_) {
      _omrEngine = OmrEngineService();
    }

    _batchScanBloc.add(InitializeBatchScan(
      examId: widget.examId,
      examName: widget.examName,
      classId: widget.classId ?? '',
      className: widget.className ?? '',
    ));
  }

  @override
  void dispose() {
    _cameraBloc.add(CameraDispose());
    _cameraBloc.close();
    _batchScanBloc.close();
    super.dispose();
  }

  Future<void> _onCapture() async {
    final cameraState = _cameraBloc.state;
    if (cameraState is! CameraStable) {
      _showSnackBar('Please align the sheet first');
      return;
    }

    final controller = _cameraBloc.controller;
    if (controller == null) return;

    try {
      final XFile file = await controller.takePicture();
      final Uint8List bytes = await file.readAsBytes();
      
      _batchScanBloc.add(CaptureForBatch(imageBytes: bytes));
      _processImage(bytes);
    } catch (e) {
      _showSnackBar('Camera capture error: $e');
    }
  }

  Future<void> _processImage(Uint8List imageBytes) async {
    try {
      // Use templateJson if provided, otherwise use default
      final templateJson = widget.templateJson ?? _getDefaultTemplateJson();
      
      // Call OMR engine to scan and grade
      final result = await _omrEngine.scanAndGrade(
        imageBytes: imageBytes,
        templateJson: templateJson,
      );
      
      _batchScanBloc.add(OMRProcessingComplete(
        imageBytes: imageBytes,
        gradingResult: result.gradingResult,
        studentCode: result.scanResult.studentId.isNotEmpty ? result.scanResult.studentId : null,
        versionCode: result.scanResult.versionCode.isNotEmpty ? result.scanResult.versionCode : null,
      ));
    } catch (e) {
      _batchScanBloc.add(OMRProcessingFailed(message: e.toString()));
    }
  }

  Map<String, dynamic> _getDefaultTemplateJson() {
    // Default template for 20 MCQ questions, 4 options (A,B,C,D)
    // With 7-digit Student ID and 2-digit Version Code
    return {
      'totalScore': 10.0,
      'template': {
        'pageWidth': 2480,
        'pageHeight': 3508,
        'bubbleWidth': 47,
        'bubbleHeight': 47,
        'autoAlign': false,
        'answerKey': {
          for (int i = 1; i <= 20; i++) 'q$i': 'A',
        },
        // Student ID: 7 digits (sbd1-sbd7), each with 10 bubble options (1-10)
        // Positions based on AMC template layout
        'studentId': {
          'digits': 7,
          'coords': _generateStudentIdCoords(),
        },
        // Version Code: 2 digits (md1-md2), each with 10 bubble options (1-10)
        'versionCodeZone': {
          'digits': 2,
          'coords': _generateVersionCodeCoords(),
        },
      },
    };
  }

  List<Map<String, dynamic>> _generateStudentIdCoords() {
    // AMC layout: Student ID bubbles
    // X columns: 1080, 985, 890, 795, 700, 605, 511 (right to left, digit 1-7)
    // Y values: 10 rows from 2850 to 2212 (value 1-10)
    final xCols = [1080, 985, 890, 795, 700, 605, 511];
    final yValues = [2850, 2779, 2708, 2637, 2567, 2496, 2425, 2354, 2283, 2212];
    final coords = <Map<String, dynamic>>[];

    for (int digit = 0; digit < 7; digit++) {
      for (int value = 1; value <= 10; value++) {
        coords.add({
          'x': xCols[digit],
          'y': yValues[value - 1],
          'w': 47,
          'h': 47,
          'digit': digit,
          'value': value,
        });
      }
    }
    return coords;
  }

  List<Map<String, dynamic>> _generateVersionCodeCoords() {
    // AMC layout: Version code bubbles
    // X columns: 1709, 1614 (right to left, digit 1-2)
    // Y values: same as student ID
    final xCols = [1709, 1614];
    final yValues = [2850, 2779, 2708, 2637, 2567, 2496, 2425, 2354, 2283, 2212];
    final coords = <Map<String, dynamic>>[];

    for (int digit = 0; digit < 2; digit++) {
      for (int value = 1; value <= 10; value++) {
        coords.add({
          'x': xCols[digit],
          'y': yValues[value - 1],
          'w': 47,
          'h': 47,
          'digit': digit,
          'value': value,
        });
      }
    }
    return coords;
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider.value(value: _batchScanBloc),
        BlocProvider.value(value: _cameraBloc),
      ],
      child: BlocConsumer<BatchScanBloc, BatchScanState>(
        listener: (context, state) {
          if (state is BatchScanResultReady) {
            _showConfirmationPopup(state);
          } else if (state is BatchScanError) {
            _showSnackBar(state.message);
          }
        },
        builder: (context, batchState) {
          if (batchState is BatchScanSummary) {
            return BatchSummaryPage(
              state: batchState,
              onViewDetails: () {
                // TODO: Navigate to details
              },
              onContinueScanning: () {
                _batchScanBloc.add(InitializeBatchScan(
                  examId: widget.examId,
                  examName: widget.examName,
                  classId: widget.classId ?? '',
                  className: widget.className ?? '',
                ));
              },
            );
          }

          return _buildScannerUI(batchState);
        },
      ),
    );
  }

  Widget _buildScannerUI(BatchScanState batchState) {
    final scannedCount = batchState is BatchScanReady ? batchState.scannedCount : 0;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text(
          widget.examName,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          if (scannedCount > 0)
            TextButton.icon(
              onPressed: () => _batchScanBloc.add(const FinishBatchScan()),
              icon: const Icon(Icons.done_all, color: Color(0xFF22C55E)),
              label: const Text(
                'Done',
                style: TextStyle(color: Color(0xFF22C55E)),
              ),
            ),
        ],
      ),
      body: BlocBuilder<CameraBloc, CameraBlocState>(
        builder: (context, cameraState) {
          return Stack(
            fit: StackFit.expand,
            children: [
              _buildCameraPreview(cameraState),
              // Counter badge
              Positioned(
                top: 16,
                right: 16,
                child: BatchCounterBadge(count: scannedCount),
              ),
              // Capture button
              Positioned(
                bottom: 32,
                left: 0,
                right: 0,
                child: _buildCaptureButton(cameraState, batchState),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildCameraPreview(CameraBlocState state) {
    final controller = _cameraBloc.controller;
    if (controller == null || !controller.value.isInitialized) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.white),
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        CameraPreview(controller),
        // Alignment guide overlay
        if (state is CameraStable)
          Positioned(
            bottom: 120,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF22C55E).withValues(alpha: 0.9),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.check_circle, color: Colors.white, size: 18),
                    SizedBox(width: 8),
                    Text(
                      'Aligned - Ready to capture',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildCaptureButton(CameraBlocState cameraState, BatchScanState batchState) {
    final bool isCapturing = batchState is BatchScanCapturing;
    final bool canCapture = cameraState is CameraStable && !isCapturing;

    return Center(
      child: GestureDetector(
        onTap: canCapture ? _onCapture : null,
        child: Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: canCapture ? Colors.white : Colors.grey,
            border: Border.all(
              color: canCapture ? const Color(0xFF6366F1) : Colors.grey,
              width: 4,
            ),
          ),
          child: isCapturing
              ? const Center(
                  child: SizedBox(
                    width: 40,
                    height: 40,
                    child: CircularProgressIndicator(
                      color: Color(0xFF6366F1),
                      strokeWidth: 3,
                    ),
                  ),
                )
              : const Icon(
                  Icons.camera,
                  color: Color(0xFF6366F1),
                  size: 36,
                ),
        ),
      ),
    );
  }

  void _showConfirmationPopup(BatchScanResultReady state) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (context) => ConfirmationPopup(
          imageBytes: state.imageBytes,
          gradingResult: state.gradingResult,
          studentCode: state.studentCode,
          versionCode: state.versionCode,
          scannedCount: state.scannedCount,
          onConfirm: () {
            Navigator.of(context).pop();
            _batchScanBloc.add(const ConfirmBatchScan());
          },
          onRetake: () {
            Navigator.of(context).pop();
            _batchScanBloc.add(const RetakeBatchScan());
          },
        ),
      ),
    );
  }
}
