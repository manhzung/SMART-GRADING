import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:smart_grading_mobile/core/network/api_client.dart';
import 'package:smart_grading_mobile/core/network/omr_template_service.dart';
import 'package:smart_grading_mobile/domain/omr/engine/omr_engine.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/presentation/widgets/omr_bubble_details_table.dart';
import 'package:smart_grading_mobile/presentation/widgets/omr_bubble_overlay.dart';
import 'package:smart_grading_mobile/presentation/widgets/omr_processing_log.dart';

enum _CaptureState { idle, capturing, processing, done, error }

/// Source of an OMR template. Test Lab loads templates from the server
/// (single source of truth) but can fall back to the bundled `sample4`
/// factory if the backend is unreachable.
enum _TemplateSource { serverFetched, offlineFallback }

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

  // Loaded templates from the backend (id → template JSON, px @ 300 DPI).
  final Map<String, OMRTemplate> _serverTemplates = {};
  bool _isLoadingTemplates = false;
  String? _templateLoadError;
  OMRTemplate? _template;
  _TemplateSource? _templateSource;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    // Start with the bundled Sample 4 — keeps the test lab working even
    // when the backend is offline. User can switch to a server template
    // (or the "Phiếu 15 câu" server template) once they load.
    _template = OMRTemplate.sample4();
    _templateSource = _TemplateSource.offlineFallback;
    _loadServerTemplates();
  }

  Future<void> _loadServerTemplates() async {
    setState(() {
      _isLoadingTemplates = true;
      _templateLoadError = null;
    });
    try {
      final apiClient = ApiClient();
      final service = OMRTemplateService(apiClient: apiClient);
      // Fetch all templates (metadata only)
      final metadataList = await service.getAll();
      _serverTemplates.clear();
      for (final meta in metadataList) {
        // We need the id; OMRTemplate parses _id into the id field.
        final id = meta.id;
        if (id == null) continue;
        try {
          // Fetch the full Flutter-ready JSON (single source of truth)
          final fullTemplate = await service.getJsonById(id);
          _serverTemplates[id] = fullTemplate;
        } catch (e) {
          debugPrint('OMRTestLab: failed to load template $id: $e');
        }
      }
      if (mounted) {
        setState(() {
          _isLoadingTemplates = false;
          _templateLoadError = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingTemplates = false;
          _templateLoadError = 'Cannot reach server: $e. Using offline fallback.';
        });
      }
    }
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
      final t = _template;
      if (t == null) {
        throw Exception('No template selected');
      }
      final result = await OMREngine().processImage(
        imageBytes: bytes,
        template: t,
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
        actions: [
          IconButton(
            icon: _isLoadingTemplates
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh),
            tooltip: 'Reload templates from server',
            onPressed: _isLoadingTemplates ? null : _loadServerTemplates,
          ),
        ],
      ),
      body: switch (_state) {
        _CaptureState.idle || _CaptureState.capturing => _buildCaptureScreen(),
        _CaptureState.processing => _buildProcessingScreen(),
        _CaptureState.done => _buildResultScreen(),
        _CaptureState.error => _buildErrorScreen(),
      },
    );
  }

  Widget _buildTemplateSelector() {
    final selected = _template;
    if (selected == null) {
      return const Text('No template selected');
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(
          'Active template: ${selected.name}',
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: Color(0xFF0F172A),
          ),
        ),
        if (_templateSource == _TemplateSource.offlineFallback) ...[
          const SizedBox(height: 4),
          Text(
            'Offline fallback (Sample 4) — server templates not loaded',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildTemplateMenu() {
    final selected = _template;
    if (selected == null) {
      return const Text('No template selected');
    }

    final entries = <_TemplateMenuEntry>[];

    // Always offer the bundled Sample 4 as a fallback option.
    entries.add(_TemplateMenuEntry(
      label: 'Sample 4 (bundled)',
      source: _TemplateSource.offlineFallback,
      template: OMRTemplate.sample4(),
    ));

    // Add every server template loaded from the /json endpoint.
    for (final entry in _serverTemplates.entries) {
      final t = entry.value;
      entries.add(_TemplateMenuEntry(
        label: '${t.name} (server)',
        source: _TemplateSource.serverFetched,
        template: t,
      ));
    }

    return PopupMenuButton<_TemplateMenuEntry>(
      tooltip: 'Switch template',
      onSelected: (entry) {
        setState(() {
          _template = entry.template;
          _templateSource = entry.source;
        });
        _reset();
      },
      itemBuilder: (context) => entries
          .map((e) => PopupMenuItem<_TemplateMenuEntry>(
                value: e,
                child: Text(
                  e.label,
                  style: TextStyle(
                    fontWeight: e.template.id == selected.id
                        ? FontWeight.bold
                        : FontWeight.normal,
                    color: e.template.id == selected.id
                        ? const Color(0xFF6366F1)
                        : null,
                  ),
                ),
              ))
          .toList(),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: const Color(0xFFE2E8F0),
            width: 1.5,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.description_outlined, size: 18, color: Color(0xFF6366F1)),
            const SizedBox(width: 8),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 200),
              child: Text(
                selected.name,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF0F172A),
                ),
              ),
            ),
            const SizedBox(width: 4),
            const Icon(Icons.arrow_drop_down, size: 20, color: Color(0xFF64748B)),
          ],
        ),
      ),
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
            _buildTemplateMenu(),
            const SizedBox(height: 8),
            _buildTemplateSelector(),
            if (_templateLoadError != null) ...[
              const SizedBox(height: 8),
              Text(
                _templateLoadError!,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.orange.shade700,
                ),
              ),
            ],
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
              child: Text(
                '${_template?.outputColumns.length ?? 0} Questions | 4 Options',
                style: const TextStyle(
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
        if (_template?.id == '15q') _buildSbdMdHeader(),
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

  Widget _buildSbdMdHeader() {
    final answers = _processingResult?.response.answers ?? const <String, String>{};
    final sbd = '${answers['sbd1'] ?? ''}${answers['sbd2'] ?? ''}';
    final md = '${answers['md1'] ?? ''}${answers['md2'] ?? ''}';
    return Container(
      width: double.infinity,
      color: const Color(0xFFE8F0FE),
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _CodeLabel(label: 'SBD', value: sbd),
          _CodeLabel(label: 'MĐ', value: md),
        ],
      ),
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

class _TemplateMenuEntry {
  final String label;
  final _TemplateSource source;
  final OMRTemplate template;

  const _TemplateMenuEntry({
    required this.label,
    required this.source,
    required this.template,
  });
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

class _CodeLabel extends StatelessWidget {
  final String label;
  final String value;

  const _CodeLabel({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Color(0xFF64748B),
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value.isEmpty ? '--' : value,
          style: const TextStyle(
            fontSize: 20,
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
            letterSpacing: 2,
          ),
        ),
      ],
    );
  }
}
