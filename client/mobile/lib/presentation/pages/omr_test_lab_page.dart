import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:smart_grading_mobile/domain/omr/engine/omr_engine.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/presentation/widgets/omr_bubble_details_table.dart';
import 'package:smart_grading_mobile/presentation/widgets/omr_bubble_overlay.dart';
import 'package:smart_grading_mobile/presentation/widgets/omr_processing_log.dart';
import 'package:smart_grading_mobile/presentation/widgets/template_picker.dart';

enum _CaptureState { idle, capturing, processing, done, error }

class OMRTestLabPage extends StatefulWidget {
  const OMRTestLabPage({super.key});

  @override
  State<OMRTestLabPage> createState() => _OMRTestLabPageState();
}

class _OMRTestLabPageState extends State<OMRTestLabPage>
    with SingleTickerProviderStateMixin {
  _CaptureState _state = _CaptureState.idle;
  Uint8List? _imageBytes;
  OMRProcessingResult? _processingResult;
  String? _errorMessage;
  final ImagePicker _imagePicker = ImagePicker();

  late final TabController _tabController;
  OMRTemplate _template = OMRTemplate.sample4();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _processImage(Uint8List bytes) async {
    setState(() {
      _state = _CaptureState.processing;
    });

    try {
      final result = await OMREngine().processImage(
        imageBytes: bytes,
        template: _template,
      );

      if (!mounted) return;
      setState(() {
        _imageBytes = bytes;
        _processingResult = result;
        _state = result.hasError ? _CaptureState.error : _CaptureState.done;
        if (result.hasError) {
          _errorMessage = result.errorMessage;
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _state = _CaptureState.error;
        _errorMessage = 'Processing failed: $e';
      });
    }
  }

  void _reset() {
    setState(() {
      _state = _CaptureState.idle;
      _imageBytes = null;
      _processingResult = null;
      _errorMessage = null;
    });
  }

  /// Returns the cropped image bytes if available, otherwise the original image.
  Uint8List? get _displayImageBytes {
    final r = _processingResult;
    if (r == null) return _imageBytes;
    return r.croppedImageBytes ?? _imageBytes;
  }

  int get _displayImageWidth {
    final r = _processingResult;
    if (r == null) return 0;
    return r.croppedWidth ?? 0;
  }

  int get _displayImageHeight {
    final r = _processingResult;
    if (r == null) return 0;
    return r.croppedHeight ?? 0;
  }

  Future<void> _captureFromCamera() async {
    setState(() {
      _state = _CaptureState.capturing;
    });

    final XFile? picked = await _imagePicker.pickImage(
      source: ImageSource.camera,
      imageQuality: 90,
      maxWidth: 2000,
    );

    if (!mounted) return;

    if (picked == null) {
      setState(() {
        _state = _CaptureState.idle;
      });
      return;
    }

    final bytes = await picked.readAsBytes();
    _processImage(bytes);
  }

  Future<void> _pickFromGallery() async {
    setState(() {
      _state = _CaptureState.capturing;
    });

    final XFile? picked = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 90,
      maxWidth: 2000,
    );

    if (!mounted) return;

    if (picked == null) {
      setState(() {
        _state = _CaptureState.idle;
      });
      return;
    }

    final bytes = await picked.readAsBytes();
    _processImage(bytes);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Text(
          'OMR Test Lab',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: switch (_state) {
        _CaptureState.idle || _CaptureState.capturing => _buildCaptureScreen(),
        _CaptureState.processing => _buildProcessingScreen(),
        _CaptureState.done => _buildResultScreen(),
        _CaptureState.error => _buildErrorScreen(),
      },
    );
  }

  Widget _buildCaptureScreen() {
    final isCapturing = _state == _CaptureState.capturing;

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TemplatePicker(
              selected: _template,
              onChanged: (t) {
                setState(() => _template = t);
                _reset();
              },
            ),
            const SizedBox(height: 24),
            const Icon(
              Icons.science_outlined,
              size: 80,
              color: Color(0xFF6366F1),
            ),
            const SizedBox(height: 24),
            const Text(
              'OMR Scanner Test Lab',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Capture or select an OMR sheet to test bubble detection.',
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF64748B),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F0FE),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text(
                '11 Questions | 4 Options',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF6366F1),
                ),
              ),
            ),
            const SizedBox(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _CaptureButton(
                  icon: Icons.camera_alt_outlined,
                  label: 'Camera',
                  onTap: isCapturing ? null : _captureFromCamera,
                ),
                const SizedBox(width: 16),
                _CaptureButton(
                  icon: Icons.photo_library_outlined,
                  label: 'Gallery',
                  onTap: isCapturing ? null : _pickFromGallery,
                ),
              ],
            ),
            if (isCapturing) ...[
              const SizedBox(height: 24),
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Color(0xFF6366F1),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildProcessingScreen() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(
            color: Color(0xFF6366F1),
          ),
          SizedBox(height: 16),
          Text(
            'Processing OMR...',
            style: TextStyle(
              fontSize: 16,
              color: Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResultScreen() {
    final displayBytes = _displayImageBytes;
    final displayWidth = _displayImageWidth;
    final displayHeight = _displayImageHeight;

    // Guard against zero dimensions (would cause divide-by-zero in overlay scaling)
    final hasValidDimensions = displayWidth > 0 && displayHeight > 0;
    final showBubbleOverlay = hasValidDimensions && displayBytes != null;

    return Column(
      children: [
        Container(
          color: Colors.white,
          child: TabBar(
            controller: _tabController,
            labelColor: const Color(0xFF6366F1),
            unselectedLabelColor: const Color(0xFF64748B),
            indicatorColor: const Color(0xFF6366F1),
            tabs: const [
              Tab(text: 'Bubble Overlay'),
              Tab(text: 'Details'),
              Tab(text: 'Pipeline Log'),
            ],
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              if (showBubbleOverlay)
                OMRBubbleOverlay(
                  imageBytes: displayBytes,
                  imageWidth: displayWidth,
                  imageHeight: displayHeight,
                  result: _processingResult!,
                )
              else
                _buildNoImageOverlay(),
              OMRBubbleDetailsTable(result: _processingResult!),
              OMRProcessingLog(result: _processingResult!),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildNoImageOverlay() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.image_not_supported_outlined,
              size: 64, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          Text(
            'Cropped image not available',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorScreen() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: Color(0xFFEF4444),
            ),
            const SizedBox(height: 16),
            const Text(
              'Processing Error',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _errorMessage ?? 'An unknown error occurred.',
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF64748B),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _reset,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6366F1),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }
}

class _CaptureButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  const _CaptureButton({
    required this.icon,
    required this.label,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 120,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: const Color(0xFFE2E8F0),
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 32,
              color: onTap != null
                  ? const Color(0xFF6366F1)
                  : const Color(0xFF94A3B8),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: onTap != null
                    ? const Color(0xFF0F172A)
                    : const Color(0xFF94A3B8),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
