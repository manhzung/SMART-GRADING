import 'dart:typed_data';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import 'package:image_picker/image_picker.dart';
import 'package:smart_grading_mobile/core/network/api_client.dart';
import 'package:smart_grading_mobile/core/network/exam_template_service.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/domain/omr/models/evaluation_config.dart';
import 'package:smart_grading_mobile/domain/entities/user.entity.dart';
import 'package:smart_grading_mobile/presentation/blocs/omr_scanner/omr_scanner_bloc.dart';
import 'package:smart_grading_mobile/presentation/blocs/camera/camera_bloc.dart';
import 'package:smart_grading_mobile/presentation/pages/omr_result_page.dart';
import 'package:smart_grading_mobile/presentation/widgets/student_picker_dialog.dart';
import 'package:smart_grading_mobile/presentation/widgets/corner_overlay_painter.dart';

class CameraScannerPage extends StatefulWidget {
  final OMRTemplate? template;
  final EvaluationConfig? evaluationConfig;
  final String? examId;
  final String? examName;
  final String? classId;
  final String? className;
  final String? studentId;
  final String? studentName;
  final bool useNewEngine;

  const CameraScannerPage({
    super.key,
    this.template,
    this.evaluationConfig,
    this.examId,
    this.examName,
    this.classId,
    this.className,
    this.studentId,
    this.studentName,
    this.useNewEngine = true,
  });

  @override
  State<CameraScannerPage> createState() => _CameraScannerPageState();
}

class _CameraScannerPageState extends State<CameraScannerPage> {
  late CameraBloc _cameraBloc;
  final ImagePicker _imagePicker = ImagePicker();
  late ExamTemplateService _examTemplateService;
  Map<String, dynamic>? _cachedTemplateJson;

  @override
  void initState() {
    super.initState();
    _cameraBloc = CameraBloc();
    _cameraBloc.add(CameraInitialize());

    final apiClient = GetIt.instance<ApiClient>();
    _examTemplateService = ExamTemplateService(apiClient);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadTemplate();
    });
  }

  @override
  void dispose() {
    _cameraBloc.add(CameraDispose());
    _cameraBloc.close();
    super.dispose();
  }

  void _loadTemplate() {
    debugPrint('[CameraScanner] _loadTemplate called. template=${widget.template}');

    if (widget.template != null) {
      debugPrint('[CameraScanner] Using widget.template');
      context.read<OMRScannerBloc>().add(OMRScannerTemplateSet(
        templateJson: widget.template!.toJson(),
        examId: widget.examId,
        examName: widget.examName,
        classId: widget.classId,
        className: widget.className,
      ));
      if (widget.useNewEngine && widget.examId != null) {
        _fetchTemplateJson();
      }
    } else {
      debugPrint('[CameraScanner] widget.template is null, creating default template');
      final template = OMRTemplate.simpleMcq(
        numQuestions: 20,
        numOptions: 4,
        bubbleWidth: 35,
        bubbleHeight: 35,
      );
      debugPrint('[CameraScanner] Default template created: ${template.toJson().keys}');
      context.read<OMRScannerBloc>().add(OMRScannerTemplateSet(
        templateJson: template.toJson(),
        examId: widget.examId ?? 'demo',
        examName: widget.examName ?? 'Demo Exam',
        classId: widget.classId,
        className: widget.className,
      ));
    }
  }

  Future<void> _fetchTemplateJson() async {
    if (widget.examId == null) return;
    try {
      _cachedTemplateJson = await _examTemplateService.getTemplate(widget.examId!);
    } catch (e) {
      debugPrint('Failed to fetch template: $e');
    }
  }

  Future<void> _pickFromGallery() async {
    try {
      final XFile? picked = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 90,
        maxWidth: 2000,
      );
      if (picked == null) return;

      final Uint8List imageBytes = await picked.readAsBytes();

      if (!mounted) return;
      context.read<OMRScannerBloc>().add(OMRScannerImagePicked(imageBytes: imageBytes));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to pick image: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }


  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider.value(value: context.read<OMRScannerBloc>()),
        BlocProvider.value(value: _cameraBloc),
      ],
      child: BlocConsumer<OMRScannerBloc, OMRScannerState>(
        listener: (context, state) {
          if (state is OMRScannerSuccess) {
            // NEW FLOW: Auto-detected student or show picker
            if (state.matchedStudent != null) {
              // Student found automatically - show confirmation dialog
              _showAutoDetectConfirmation(context, state);
            } else if (state.studentCode != null && state.studentCode!.isNotEmpty) {
              // Student code detected but not matched - show picker with code pre-filled
              _showStudentPickerWithCode(context, state);
            } else {
              // No student code detected - show normal picker
              StudentPickerDialog.show(
                context: context,
                classId: widget.classId ?? '',
                className: widget.className ?? widget.examName ?? '',
                examId: widget.examId ?? '',
                examName: widget.examName ?? '',
                imageBytes: state.imageBytes,
              );
            }
          } else if (state is OMRScannerStudentConfirmed) {
            // Student manually selected - go to result
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => OMRResultPage(
                  imageBytes: state.imageBytes,
                  gradingResult: state.gradingResult,
                  processingResult: null,
                  examId: widget.examId,
                  examName: widget.examName,
                  student: state.student,
                ),
              ),
            );
          } else if (state is OMRScannerSubmitted) {
            // Submitted successfully - show success and return
            _showSubmittedSnackbar(context, state);
          } else if (state is OMRScannerError) {
            debugPrint('[CameraScanner] OMRScannerError: ${state.message}');
            debugPrint('[CameraScanner] Current widget.template: ${widget.template}');
            debugPrint('[CameraScanner] widget.examId: ${widget.examId}');
            _showErrorSnackbar(context, state);
          }
        },
        builder: (context, omrState) {
          return Scaffold(
            backgroundColor: const Color(0xFF0F172A),
            appBar: AppBar(
              backgroundColor: const Color(0xFF0F172A),
              foregroundColor: Colors.white,
              elevation: 0,
              title: Text(
                widget.studentName != null
                    ? widget.studentName!
                    : (widget.examName ?? 'OMR Scanner'),
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.photo_library_outlined),
                  onPressed: _pickFromGallery,
                  tooltip: 'Pick from gallery',
                ),
              ],
            ),
            body: BlocBuilder<CameraBloc, CameraBlocState>(
              builder: (context, cameraState) {
                return _buildBody(omrState, cameraState);
              },
            ),
          );
        },
      ),
    );
  }

  void _showAutoDetectConfirmation(BuildContext context, OMRScannerSuccess state) {
    final student = state.matchedStudent!;
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF22C55E).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.check_circle, color: Color(0xFF22C55E), size: 24),
            ),
            const SizedBox(width: 12),
            const Text('Student Detected'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStudentInfoCard(student),
            const SizedBox(height: 16),
            Text(
              'MSSV: ${state.studentCode}',
              style: TextStyle(color: Colors.grey[600], fontSize: 13),
            ),
            if (state.versionCode != null && state.versionCode!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                'Mã đề: ${state.versionCode}',
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
              ),
            ],
            const SizedBox(height: 16),
            const Text(
              'Is this the correct student?',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              StudentPickerDialog.show(
                context: context,
                classId: widget.classId ?? '',
                className: widget.className ?? widget.examName ?? '',
                examId: widget.examId ?? '',
                examName: widget.examName ?? '',
                imageBytes: state.imageBytes,
              );
            },
            child: const Text('Change'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              context.read<OMRScannerBloc>().add(OMRScannerConfirmStudent(student));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF22C55E),
              foregroundColor: Colors.white,
            ),
            child: const Text('Confirm & Submit'),
          ),
        ],
      ),
    );
  }

  void _showStudentPickerWithCode(BuildContext context, OMRScannerSuccess state) {
    StudentPickerDialog.show(
      context: context,
      classId: widget.classId ?? '',
      className: widget.className ?? widget.examName ?? '',
      examId: widget.examId ?? '',
      examName: widget.examName ?? '',
      imageBytes: state.imageBytes,
      prefillCode: state.studentCode,
    );
  }

  Widget _buildStudentInfoCard(ClassStudent student) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: const Color(0xFF6366F1).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(
                _getInitials(student.name),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF6366F1),
                ),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  student.name,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: Color(0xFF0F172A),
                  ),
                ),
                if (student.studentCode != null)
                  Text(
                    student.studentCode!,
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF64748B),
                    ),
                  ),
              ],
            ),
          ),
          const Icon(Icons.verified, color: Color(0xFF22C55E), size: 24),
        ],
      ),
    );
  }

  void _showSubmittedSnackbar(BuildContext context, OMRScannerSubmitted state) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              state.submittedOnline ? Icons.cloud_done : Icons.cloud_off,
              color: Colors.white,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Submitted Successfully',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    state.submittedOnline
                        ? 'Uploaded to server'
                        : 'Saved locally, will sync later',
                    style: const TextStyle(fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF22C55E),
        duration: const Duration(seconds: 3),
        action: SnackBarAction(
          label: 'OK',
          textColor: Colors.white,
          onPressed: () {
            Navigator.of(context).pop();
          },
        ),
      ),
    );
    
    // Auto navigate back after short delay
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        Navigator.of(context).pop();
      }
    });
  }

  void _showErrorSnackbar(BuildContext context, OMRScannerError state) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text(state.message)),
          ],
        ),
        backgroundColor: const Color(0xFFEF4444),
        action: SnackBarAction(
          label: 'Retry',
          textColor: Colors.white,
          onPressed: () {
            final bloc = context.read<OMRScannerBloc>();
            final currentState = bloc.state;
            if (currentState is OMRScannerImageReady) {
              bloc.add(OMRScannerProcessStarted(imageBytes: currentState.imageBytes));
            }
          },
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }

  Widget _buildBody(OMRScannerState omrState, CameraBlocState cameraState) {
    if (omrState is OMRScannerInitial || omrState is OMRScannerLoadingTemplate) {
      return _buildLoadingState('Loading template...');
    }

    if (cameraState is CameraInitializing) {
      return _buildLoadingState('Initializing camera...');
    }

    if (cameraState is CameraError) {
      return _buildCameraErrorState(cameraState);
    }

    if (cameraState is CameraImageReady) {
      return _buildCapturedState(cameraState);
    }

    if (cameraState is CameraCapturing) {
      return _buildCapturingState();
    }

    if (omrState is OMRScannerProcessing) {
      return _buildProcessingState(omrState);
    }

    if (omrState is OMRScannerError) {
      return _buildErrorState(omrState, cameraState);
    }

    if (omrState is OMRScannerImageReady) {
      return _buildCapturedImageState(omrState);
    }

    return _buildLivePreview(cameraState);
  }

  Widget _buildLoadingState(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(color: Colors.white),
          const SizedBox(height: 16),
          Text(message, style: const TextStyle(color: Colors.white70)),
        ],
      ),
    );
  }

  Widget _buildCameraErrorState(CameraError state) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, color: Color(0xFFEF4444), size: 64),
            const SizedBox(height: 16),
            const Text(
              'Camera Error',
              style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              state.message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _cameraBloc.add(CameraInitialize()),
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6366F1),
                foregroundColor: Colors.white,
              ),
            ),
            const SizedBox(height: 16),
            TextButton.icon(
              onPressed: _pickFromGallery,
              icon: const Icon(Icons.photo_library, color: Colors.white70),
              label: const Text(
                'Pick from gallery instead',
                style: TextStyle(color: Colors.white70),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCapturingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(
            width: 64,
            height: 64,
            child: CircularProgressIndicator(color: Color(0xFF6366F1), strokeWidth: 4),
          ),
          const SizedBox(height: 24),
          const Text(
            'Capturing...',
            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildLivePreview(CameraBlocState state) {
    final controller = _cameraBloc.controller;

    if (controller == null || !controller.value.isInitialized) {
      return _buildLoadingState('Initializing camera...');
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        CameraPreview(controller),
        Positioned.fill(
          child: CustomPaint(
            painter: CornerOverlayPainter(
              corners: _getCornersFromState(state),
              isStable: state is CameraStable,
              skewAngle: _getSkewAngleFromState(state),
            ),
          ),
        ),
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: _buildStatusBar(state),
        ),
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: _buildCaptureControls(state),
        ),
      ],
    );
  }

  List<Offset>? _getCornersFromState(CameraBlocState state) {
    if (state is CameraStable) return state.corners;
    if (state is CameraCornerDetected) return state.corners;
    return null;
  }

  double _getSkewAngleFromState(CameraBlocState state) {
    if (state is CameraStable) return state.skewAngle;
    if (state is CameraCornerDetected) return state.skewAngle;
    return 0;
  }

  Widget _buildStatusBar(CameraBlocState state) {
    String message;
    Color color;
    IconData icon;

    if (state is CameraStable) {
      message = 'Aligned';
      color = const Color(0xFF22C55E);
      icon = Icons.check_circle;
    } else if (state is CameraCornerDetected) {
      message = 'Hold steady...';
      color = const Color(0xFFF59E0B);
      icon = Icons.pan_tool;
    } else {
      message = 'Position the OMR sheet';
      color = const Color(0xFF94A3B8);
      icon = Icons.camera_alt_outlined;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.black.withValues(alpha: 0.6),
            Colors.transparent,
          ],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 8),
            Text(
              message,
              style: TextStyle(
                color: color,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (state is CameraStable) ...[
              const SizedBox(width: 8),
              const Icon(Icons.check, color: Color(0xFF22C55E), size: 20),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCaptureControls(CameraBlocState state) {
    final bool canCapture = state is! CameraCapturing && state is! CameraImageReady;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.bottomCenter,
          end: Alignment.topCenter,
          colors: [
            Colors.black.withValues(alpha: 0.8),
            Colors.transparent,
          ],
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            const SizedBox(width: 48),
            GestureDetector(
              onTap: canCapture ? () => _cameraBloc.add(CameraCapture()) : null,
              child: Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: canCapture ? Colors.white : Colors.grey,
                  border: Border.all(
                    color: canCapture ? const Color(0xFF6366F1) : Colors.grey,
                    width: 4,
                  ),
                ),
                child: Icon(
                  Icons.camera,
                  color: canCapture ? const Color(0xFF6366F1) : Colors.grey,
                  size: 32,
                ),
              ),
            ),
            IconButton(
              onPressed: _pickFromGallery,
              icon: const Icon(
                Icons.photo_library,
                color: Colors.white,
                size: 28,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCapturedState(CameraImageReady state) {
    return SafeArea(
      child: Column(
        children: [
          Expanded(
            child: Container(
              margin: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                color: const Color(0xFF1E293B),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: Image.memory(state.imageBytes, fit: BoxFit.contain),
              ),
            ),
          ),
          _buildRetakeControls(state.imageBytes),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildCapturedImageState(OMRScannerImageReady state) {
    return SafeArea(
      child: Column(
        children: [
          Expanded(
            child: Container(
              margin: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                color: const Color(0xFF1E293B),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: Image.memory(state.imageBytes, fit: BoxFit.contain),
              ),
            ),
          ),
          _buildRetakeControls(state.imageBytes),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildRetakeControls(Uint8List imageBytes) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: [
          Expanded(
            child: SizedBox(
              height: 56,
              child: OutlinedButton.icon(
                onPressed: () => _cameraBloc.add(CameraRetake()),
                icon: const Icon(Icons.refresh),
                label: const Text('Retake'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Color(0xFF334155)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: SizedBox(
              height: 56,
              child: ElevatedButton.icon(
                onPressed: () => _processImage(imageBytes),
                icon: const Icon(Icons.auto_fix_high),
                label: const Text('Scan & Grade'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _processImage(Uint8List imageBytes) async {
    debugPrint('[CameraScanner] _processImage called. Image size: ${imageBytes.length} bytes');
    debugPrint('[CameraScanner] Current OMRScannerBloc state: ${context.read<OMRScannerBloc>().state.runtimeType}');
    context.read<OMRScannerBloc>().add(
      OMRScannerProcessStarted(imageBytes: imageBytes),
    );
  }

  Widget _buildProcessingState(OMRScannerProcessing state) {
    return SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(
                  width: 48,
                  height: 48,
                  child: CircularProgressIndicator(
                    color: Color(0xFF6366F1),
                    strokeWidth: 3,
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Processing OMR...',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                ...state.steps.map((step) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.check_circle,
                        color: Color(0xFF22C55E),
                        size: 16,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        step,
                        style: const TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                )),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildErrorState(OMRScannerError state, CameraBlocState cameraState) {
    return SafeArea(
      child: Column(
        children: [
          Expanded(
            child: Container(
              margin: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.error_outline,
                      color: Color(0xFFEF4444),
                      size: 64,
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Processing Failed',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32),
                      child: Text(
                        state.message,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          _buildCaptureControls(cameraState),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
