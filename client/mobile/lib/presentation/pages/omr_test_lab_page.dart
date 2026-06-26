import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import 'package:image_picker/image_picker.dart';
import 'package:smart_grading_mobile/core/network/api_client.dart';
import 'package:smart_grading_mobile/core/network/omr_template_service.dart';
import 'package:smart_grading_mobile/domain/omr/engine/omr_engine.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/presentation/widgets/omr_bubble_details_table.dart';
import 'package:smart_grading_mobile/presentation/widgets/omr_processing_log.dart';
import 'package:smart_grading_mobile/presentation/widgets/omr_test_lab_overlay.dart';

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
    // Use AMC user template with templateJson for full bubble coordinates
    _template = _create30QuestionDemoTemplate();
    _templateSource = _TemplateSource.offlineFallback;
    _loadServerTemplates();
  }

  Future<void> _loadServerTemplates() async {
    setState(() {
      _isLoadingTemplates = true;
      _templateLoadError = null;
    });
    try {
      // Use the shared authenticated ApiClient from GetIt so requests
      // carry the user's access token (Bearer auth).
      final apiClient = GetIt.instance<ApiClient>();
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
      debugPrint('OMRTestLab _processImage: template=$t, fieldBlocks=${t.fieldBlocks.map((b) => '${b.name}:${b.originY}').toList()}');
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

  /// Build a hard-coded template matching the user's AMC template exactly
  OMRTemplate _create30QuestionDemoTemplate() {
    // Student ID: 7 digits × 10 values each (70 coords)
    // From user's template: x columns at 511, 605, 700, 795, 890, 985, 1080
    // y values: 2850, 2779, 2708, 2637, 2567, 2496, 2425, 2354, 2283, 2212
    final studentIdCoords = <Map<String, dynamic>>[];
    final studentIdXCols = [1080, 985, 890, 795, 700, 605, 511]; // digit 1-7 (right to left)
    final studentIdYValues = [2850, 2779, 2708, 2637, 2567, 2496, 2425, 2354, 2283, 2212]; // value 1-10

    for (int digitIdx = 0; digitIdx < 7; digitIdx++) {
      for (int valueIdx = 0; valueIdx < 10; valueIdx++) {
        studentIdCoords.add({
          'x': studentIdXCols[digitIdx],
          'y': studentIdYValues[valueIdx],
          'w': 46,
          'h': 46,
          'digit': digitIdx + 1,
          'value': valueIdx + 1,
        });
      }
    }

    // Version Code: 2 digits × 10 values (20 coords)
    // From user's template: x columns at 1272, 1367
    final versionCoords = <Map<String, dynamic>>[];
    final versionXCols = [1367, 1272]; // digit 1-2
    for (int digitIdx = 0; digitIdx < 2; digitIdx++) {
      for (int valueIdx = 0; valueIdx < 10; valueIdx++) {
        versionCoords.add({
          'x': versionXCols[digitIdx],
          'y': studentIdYValues[valueIdx], // same y as studentId
          'w': 46,
          'h': 46,
          'digit': digitIdx + 1,
          'value': valueIdx + 1,
        });
      }
    }

    // Answers: q1-q16 with A,B,C,D (exact coords from user's template)
    final answers = <String, Map<String, Map<String, dynamic>>>{};

    // Column 1: q1-q6 (x: 492, 597, 701, 805)
    // y: 1993, 1925, 1856, 1788, 1720, 1652
    final col1Y = [1993, 1925, 1856, 1788, 1720, 1652];
    for (int q = 1; q <= 6; q++) {
      final y = col1Y[q - 1];
      answers['q$q'] = {
        'A': {'x': 492, 'y': y, 'w': 46, 'h': 46},
        'B': {'x': 597, 'y': y, 'w': 46, 'h': 46},
        'C': {'x': 701, 'y': y, 'w': 46, 'h': 46},
        'D': {'x': 805, 'y': y, 'w': 46, 'h': 46},
      };
    }

    // Column 2: q7-q12 (x: 1099, 1204, 1308, 1412)
    final col2Y = [1993, 1925, 1856, 1788, 1720, 1652];
    for (int q = 7; q <= 12; q++) {
      final y = col2Y[q - 7];
      answers['q$q'] = {
        'A': {'x': 1099, 'y': y, 'w': 46, 'h': 46},
        'B': {'x': 1204, 'y': y, 'w': 46, 'h': 46},
        'C': {'x': 1308, 'y': y, 'w': 46, 'h': 46},
        'D': {'x': 1412, 'y': y, 'w': 46, 'h': 46},
      };
    }

    // Column 3: q13-q16 (x: 1705, 1811, 1914, 2018)
    final col3Y = [1993, 1925, 1856, 1788];
    for (int q = 13; q <= 16; q++) {
      final y = col3Y[q - 13];
      answers['q$q'] = {
        'A': {'x': 1705, 'y': y, 'w': 46, 'h': 46},
        'B': {'x': 1811, 'y': y, 'w': 46, 'h': 46},
        'C': {'x': 1914, 'y': y, 'w': 46, 'h': 46},
        'D': {'x': 2018, 'y': y, 'w': 46, 'h': 46},
      };
    }

    return OMRTemplate.fromServerJson({
      '_id': {'\$oid': 'demo-amc-user-template'},
      'name': 'AMC User Template (adawdwd2222)',
      'templateJson': {
        'pageWidth': 2479,
        'pageHeight': 3508,
        'bubbleWidth': 46,
        'bubbleHeight': 46,
        'autoAlign': false,
        'studentId': {
          'digits': 7,
          'coords': studentIdCoords,
        },
        'versionCodeZone': {
          'digits': 2,
          'coords': versionCoords,
        },
        'answerKey': {
          'q1': 'B', 'q2': 'A', 'q3': 'A', 'q4': 'A', 'q5': 'B', 'q6': 'A',
          'q7': 'B', 'q8': 'A', 'q9': 'A', 'q10': 'A', 'q11': 'A', 'q12': 'A',
          'q13': 'A', 'q14': 'A', 'q15': 'B', 'q16': 'A',
        },
        'questionScores': {
          'q1': 0.625, 'q2': 0.625, 'q3': 0.625, 'q4': 0.625, 'q5': 0.625, 'q6': 0.625,
          'q7': 0.625, 'q8': 0.625, 'q9': 0.625, 'q10': 0.625, 'q11': 0.625, 'q12': 0.625,
          'q13': 0.625, 'q14': 0.625, 'q15': 0.625, 'q16': 0.625,
        },
        'answers': answers,
        'preProcessors': [
          {'name': 'Levels', 'options': {'inBlack': 15, 'inWhite': 200, 'outBlack': 0, 'outWhite': 255, 'gamma': 1}},
          {'name': 'GaussianBlur', 'options': {'kSize': [3, 3], 'sigmaX': 0}},
          {'name': 'CropPage', 'options': {}},
        ],
      },
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

    // Add the 30-question demo template (hardcoded for testing)
    entries.add(_TemplateMenuEntry(
      label: '30 Câu Demo (bundled)',
      source: _TemplateSource.offlineFallback,
      template: _create30QuestionDemoTemplate(),
    ));

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
        // Header bar with detected SBD and Mã đề
        _buildInfoHeader(),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              if (showBubbleOverlay)
                _buildOverlayTab()
              else
                _buildNoImageOverlay(),
              if (_processingResult != null) ...[
                OMRBubbleDetailsTable(result: _processingResult!),
                OMRProcessingLog(result: _processingResult!),
              ] else ...[
                const Center(child: Text('No processing result')),
                const Center(child: Text('No processing log')),
              ],
            ],
          ),
        ),
      ],
    );
  }

  /// Build the bubble overlay tab using legacy engine data
  Widget _buildOverlayTab() {
    final result = _processingResult!;

    // Use annotated image if available (shows what engine actually processed)
    // Fall back to cropped, then original
    final displayBytes = result.annotatedImageBytes ?? result.croppedImageBytes ?? _displayImageBytes ?? _imageBytes!;
    final displayWidth = result.croppedWidth ?? _displayImageWidth;
    final displayHeight = result.croppedHeight ?? _displayImageHeight;

    debugPrint('OMRTestLab _buildOverlayTab: '
        'displayImage=${displayWidth}x$displayHeight}, '
        'usingAnnotated=${result.annotatedImageBytes != null}, '
        'annotatedLen=${result.annotatedImageBytes?.length ?? 0}, '
        'croppedLen=${result.croppedImageBytes?.length ?? 0}, '
        'template=${result.template.name}');

    return OMRTestLabOverlay(
      imageBytes: displayBytes,
      imageWidth: displayWidth,
      imageHeight: displayHeight,
      template: result.template,
      scanResult: null,
    );
  }

  /// Extract detected student ID from processing result
  String? _getDetectedStudentId() {
    final answers = _processingResult?.response.answers ?? {};
    // Try different field names
    final sbd1 = answers['sbd1'] ?? answers['studentId1'] ?? answers['student_digit_0'] ?? '';
    final sbd2 = answers['sbd2'] ?? answers['studentId2'] ?? answers['student_digit_1'] ?? '';
    final sbd3 = answers['sbd3'] ?? answers['studentId3'] ?? answers['student_digit_2'] ?? '';
    final sbd4 = answers['sbd4'] ?? answers['studentId4'] ?? answers['student_digit_3'] ?? '';
    final sbd5 = answers['sbd5'] ?? answers['studentId5'] ?? answers['student_digit_4'] ?? '';
    final sbd6 = answers['sbd6'] ?? answers['studentId6'] ?? answers['student_digit_5'] ?? '';
    final sbd7 = answers['sbd7'] ?? answers['studentId7'] ?? answers['student_digit_6'] ?? '';
    
    final sbd = '$sbd1$sbd2$sbd3$sbd4$sbd5$sbd6$sbd7'.trim();
    return sbd.isEmpty ? null : sbd;
  }

  /// Extract detected version code from processing result
  String? _getDetectedVersionCode() {
    final answers = _processingResult?.response.answers ?? {};
    // Try different field names
    final md1 = answers['md1'] ?? answers['version1'] ?? answers['version_digit_0'] ?? '';
    final md2 = answers['md2'] ?? answers['version2'] ?? answers['version_digit_1'] ?? '';
    
    final md = '$md1$md2'.trim();
    return md.isEmpty ? null : md;
  }

  Widget _buildInfoHeader() {
    final sbd = _getDetectedStudentId();
    final md = _getDetectedVersionCode();
    
    if (sbd == null && md == null) {
      return const SizedBox.shrink();
    }
    
    return Container(
      width: double.infinity,
      color: const Color(0xFFE8F0FE),
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          if (sbd != null)
            _CodeLabel(label: 'SBD', value: sbd, color: const Color(0xFF3B82F6)),
          if (sbd != null && md != null)
            const SizedBox(width: 24),
          if (md != null)
            _CodeLabel(label: 'Mã đề', value: md, color: const Color(0xFF8B5CF6)),
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
  final Color color;

  const _CodeLabel({
    required this.label,
    required this.value,
    this.color = const Color(0xFF0F172A),
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: color.withValues(alpha: 0.7),
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value.isEmpty ? '--' : value,
          style: TextStyle(
            fontSize: 20,
            color: color,
            fontWeight: FontWeight.bold,
            letterSpacing: 2,
          ),
        ),
      ],
    );
  }
}
