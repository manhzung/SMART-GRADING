import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/domain/omr/models/field_block.dart';

/// Overlay widget for OMR Test Lab that reads directly from templateJson.
/// 
/// Reads from the raw templateJson structure:
/// - studentId.coords: [{x, y, w, h, digit, value}, ...]
/// - versionCodeZone.coords: [{x, y, w, h, digit, value}, ...]  
/// - answers: {"q1": {"A": {x,y,w,h}, ...}, ...}
class OMRTestLabOverlay extends StatelessWidget {
  final Uint8List imageBytes;
  final int imageWidth;
  final int imageHeight;
  final OMRTemplate template;
  final Object? scanResult;

  const OMRTestLabOverlay({
    super.key,
    required this.imageBytes,
    required this.imageWidth,
    required this.imageHeight,
    required this.template,
    this.scanResult,
  });

  @override
  Widget build(BuildContext context) {
    return InteractiveViewer(
      minScale: 0.5,
      maxScale: 4.0,
      child: Column(
        children: [
          Expanded(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return Stack(
                  children: [
                    Center(
                      child: Image.memory(
                        imageBytes,
                        fit: BoxFit.contain,
                        filterQuality: FilterQuality.high,
                      ),
                    ),
                    Center(
                      child: CustomPaint(
                        size: _calculateDisplaySize(
                          constraints.maxWidth,
                          constraints.maxHeight,
                          imageWidth.toDouble(),
                          imageHeight.toDouble(),
                        ),
                        painter: _OMRTemplateJsonPainter(
                          template: template,
                          imageWidth: imageWidth,
                          imageHeight: imageHeight,
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
          _buildInfoBar(),
        ],
      ),
    );
  }

  Size _calculateDisplaySize(
    double containerWidth,
    double containerHeight,
    double imageWidth,
    double imageHeight,
  ) {
    final containerAspect = containerWidth / containerHeight;
    final imageAspect = imageWidth / imageHeight;

    if (imageAspect > containerAspect) {
      return Size(containerWidth, containerWidth / imageAspect);
    } else {
      return Size(containerHeight * imageAspect, containerHeight);
    }
  }

  Widget _buildInfoBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 4,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: const Wrap(
        alignment: WrapAlignment.center,
        spacing: 16,
        runSpacing: 4,
        children: [
          _LegendItem(Color(0xFF22C55E), 'MARKED'),
          _LegendItem(Color(0xFFEF4444), 'MULTI'),
          _LegendItem(Color(0xFF94A3B8), 'UNMARKED'),
        ],
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendItem(this.color, this.label);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.black.withValues(alpha: 0.2), width: 0.5),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF475569)),
        ),
      ],
    );
  }
}

/// CustomPainter that reads directly from templateJson for accurate bubble positions.
class _OMRTemplateJsonPainter extends CustomPainter {
  final OMRTemplate template;
  final int imageWidth;
  final int imageHeight;

  _OMRTemplateJsonPainter({
    required this.template,
    required this.imageWidth,
    required this.imageHeight,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (imageWidth <= 0 || imageHeight <= 0) return;

    // Use UNIFORM scale to prevent stretching - fit the larger dimension
    final scaleX = size.width / imageWidth;
    final scaleY = size.height / imageHeight;
    final scale = scaleX < scaleY ? scaleX : scaleY; // uniform scale

    final tj = template.templateJson;

    // 3. Draw Answer bubbles (from templateJson.answers OR from fieldBlocks)
    if (tj != null && tj['answers'] != null) {
      _drawAnswers(canvas, tj, scale);
    } else if (template.fieldBlocks.isNotEmpty) {
      _drawFieldBlocksAnswers(canvas, scale);
    }

    // 1. Draw Student ID bubbles from templateJson.studentId.coords
    if (tj != null) {
      _drawStudentId(canvas, tj, scale);
    } else if (template.studentId != null) {
      _drawFieldBlocksStudentId(canvas, scale);
    }

    // 2. Draw Version Code bubbles from templateJson.versionCodeZone.coords
    if (tj != null) {
      _drawVersionCode(canvas, tj, scale);
    } else if (template.versionCodeZone != null) {
      _drawFieldBlocksVersionCode(canvas, scale);
    }
  }

  /// Draw Answer bubbles from fieldBlocks (when templateJson.answers is not available)
  void _drawFieldBlocksAnswers(Canvas canvas, double scale) {
    for (final block in template.fieldBlocks) {
      // Only draw MCQ blocks (qtypeMcq4, qtypeMcq5)
      final isMcq = block.fieldType == FieldType.qtypeMcq4 ||
                    block.fieldType == FieldType.qtypeMcq5 ||
                    block.fieldType == FieldType.qtypeMcq4Rtl ||
                    block.fieldType == FieldType.qtypeMcq5Rtl;

      if (!isMcq) continue;

      final bubbleW = block.bubbleWidth;
      final bubbleH = block.bubbleHeight;

      // Use traverseBubbles to get all bubble coordinates
      for (final fieldBubbles in block.traverseBubbles) {
        for (final bubble in fieldBubbles) {
          final cx = (bubble.x + bubbleW / 2) * scale;
          final cy = _toFlutterCenterY(bubble.y.toDouble(), bubbleH.toDouble(), scale);
          final radius = (bubbleW / 2) * scale;

          debugPrint('OVERLAY FieldBlock Answer: ${bubble.fieldLabel} ${bubble.fieldValue}, x=${bubble.x}, y=${bubble.y}');

          final paint = Paint()
            ..color = const Color(0xFF10B981).withValues(alpha: 0.6)
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2.0;

          canvas.drawCircle(Offset(cx, cy), radius, paint);
        }
      }
    }
  }

  /// Draw Student ID bubbles from fieldBlocks (when templateJson.studentId is not available)
  void _drawFieldBlocksStudentId(Canvas canvas, double scale) {
    for (final block in template.fieldBlocks) {
      // Check if this block is for student ID (sbd1, sbd2, etc.)
      final isStudentId = block.fieldLabels.any((l) =>
          l.startsWith('sbd') || l.startsWith('student') || l == 'sbd');

      if (!isStudentId) continue;

      final bubbleW = block.bubbleWidth;
      final bubbleH = block.bubbleHeight;

      for (final fieldBubbles in block.traverseBubbles) {
        for (final bubble in fieldBubbles) {
          final cx = (bubble.x + bubbleW / 2) * scale;
          final cy = _toFlutterCenterY(bubble.y.toDouble(), bubbleH.toDouble(), scale);
          final radius = (bubbleW / 2) * scale;

          final paint = Paint()
            ..color = const Color(0xFF3B82F6).withValues(alpha: 0.6)
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2.0;

          canvas.drawCircle(Offset(cx, cy), radius, paint);
        }
      }
    }
  }

  /// Draw Version Code bubbles from fieldBlocks (when templateJson.versionCodeZone is not available)
  void _drawFieldBlocksVersionCode(Canvas canvas, double scale) {
    for (final block in template.fieldBlocks) {
      // Check if this block is for version code (md1, md2, etc.)
      final isVersionCode = block.fieldLabels.any((l) =>
          l.startsWith('md') || l.startsWith('version'));

      if (!isVersionCode) continue;

      final bubbleW = block.bubbleWidth;
      final bubbleH = block.bubbleHeight;

      for (final fieldBubbles in block.traverseBubbles) {
        for (final bubble in fieldBubbles) {
          final cx = (bubble.x + bubbleW / 2) * scale;
          final cy = _toFlutterCenterY(bubble.y.toDouble(), bubbleH.toDouble(), scale);
          final radius = (bubbleW / 2) * scale;

          final paint = Paint()
            ..color = const Color(0xFF8B5CF6).withValues(alpha: 0.6)
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2.0;

          canvas.drawCircle(Offset(cx, cy), radius, paint);
        }
      }
    }
  }

  /// Convert PDF coordinates to Flutter canvas coordinates
  /// (PDF uses bottom-left origin, Flutter uses top-left origin)
  double _toFlutterY(double pdfY, double scale) {
    debugPrint('OVERLAY _toFlutterY: pdfY=$pdfY, imageHeight=$imageHeight, result=${imageHeight - pdfY}');
    return (imageHeight - pdfY) * scale;
  }

  /// Convert top-left corner to center, then flip Y for Flutter canvas
  double _toFlutterCenterY(double y, double h, double scale) {
    final result = _toFlutterY(y - h / 2, scale);
    debugPrint('OVERLAY _toFlutterCenterY: y=$y, h=$h, centerPdfY=${y - h/2}, flutterY=$result');
    return result;
  }

  /// Draw Student ID bubbles from templateJson.studentId.coords
  void _drawStudentId(Canvas canvas, Map<String, dynamic> tj, double scale) {
    final studentId = tj['studentId'] as Map<String, dynamic>?;
    if (studentId == null) return;

    final coords = studentId['coords'] as List<dynamic>?;
    if (coords == null || coords.isEmpty) return;

    // Group coords by digit position
    final byDigit = <int, List<Map<String, dynamic>>>{};
    for (final c in coords) {
      if (c is! Map) continue;
      final coord = Map<String, dynamic>.from(c);
      final digit = (coord['digit'] as num?)?.toInt() ?? 0;
      byDigit.putIfAbsent(digit, () => []).add(coord);
    }

    // Draw bubbles for each digit
    for (final entry in byDigit.entries) {
      final digitCoords = entry.value;

      // Sort by value
      digitCoords.sort((a, b) => ((a['value'] as num?)?.toInt() ?? 0)
          .compareTo((b['value'] as num?)?.toInt() ?? 0));

      for (final c in digitCoords) {
        final x = (c['x'] as num?)?.toDouble() ?? 0;
        final y = (c['y'] as num?)?.toDouble() ?? 0;
        final w = (c['w'] as num?)?.toDouble() ?? 46;
        final h = (c['h'] as num?)?.toDouble() ?? w;

        // Coordinates (x, y) are TOP-LEFT corner
        // Add offset first, then flip Y for Flutter canvas
        final cx = (x + w / 2) * scale;
        final cy = _toFlutterCenterY(y, h, scale);
        final radius = (w / 2) * scale;

        debugPrint('OVERLAY StudentId bubble: x=$x, y=$y, w=$w, h=$h, flutterCenter=($cx, $cy)');

        final paint = Paint()
          ..color = const Color(0xFF3B82F6).withValues(alpha: 0.6)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.0;

        canvas.drawCircle(Offset(cx, cy), radius, paint);
      }
    }
  }

  /// Draw Version Code bubbles from templateJson.versionCodeZone.coords
  void _drawVersionCode(Canvas canvas, Map<String, dynamic> tj, double scale) {
    final versionZone = tj['versionCodeZone'] as Map<String, dynamic>?;
    if (versionZone == null) return;

    final coords = versionZone['coords'] as List<dynamic>?;
    if (coords == null || coords.isEmpty) return;

    // Group coords by digit position
    final byDigit = <int, List<Map<String, dynamic>>>{};
    for (final c in coords) {
      if (c is! Map) continue;
      final coord = Map<String, dynamic>.from(c);
      final digit = (coord['digit'] as num?)?.toInt() ?? 0;
      byDigit.putIfAbsent(digit, () => []).add(coord);
    }

    // Draw bubbles for each digit
    for (final entry in byDigit.entries) {
      final digitCoords = entry.value;

      // Sort by value
      digitCoords.sort((a, b) => ((a['value'] as num?)?.toInt() ?? 0)
          .compareTo((b['value'] as num?)?.toInt() ?? 0));

      for (final c in digitCoords) {
        final x = (c['x'] as num?)?.toDouble() ?? 0;
        final y = (c['y'] as num?)?.toDouble() ?? 0;
        final w = (c['w'] as num?)?.toDouble() ?? 46;
        final h = (c['h'] as num?)?.toDouble() ?? w;

        // Coordinates (x, y) are TOP-LEFT corner
        // Add offset first, then flip Y for Flutter canvas
        final cx = (x + w / 2) * scale;
        final cy = _toFlutterCenterY(y, h, scale);
        final radius = (w / 2) * scale;

        final paint = Paint()
          ..color = const Color(0xFF8B5CF6).withValues(alpha: 0.6)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.0;

        canvas.drawCircle(Offset(cx, cy), radius, paint);
      }
    }
  }

  /// Draw Answer bubbles from templateJson.answers
  void _drawAnswers(Canvas canvas, Map<String, dynamic> tj, double scale) {
    final answers = tj['answers'] as Map<String, dynamic>?;
    if (answers == null || answers.isEmpty) return;

    // Sort questions by key (q1, q2, ...)
    final qKeys = answers.keys.toList()
      ..sort((a, b) {
        final numA = int.tryParse(a.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0;
        final numB = int.tryParse(b.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0;
        return numA.compareTo(numB);
      });

    final optionKeys = ['A', 'B', 'C', 'D'];

    for (final qKey in qKeys) {
      final opts = answers[qKey] as Map<String, dynamic>?;
      if (opts == null) continue;

      // Draw each option bubble
      for (final optKey in optionKeys) {
        final opt = opts[optKey] as Map<String, dynamic>?;
        if (opt == null) continue;

        final x = (opt['x'] as num?)?.toDouble() ?? 0;
        final y = (opt['y'] as num?)?.toDouble() ?? 0;
        final w = (opt['w'] as num?)?.toDouble() ?? 46;
        final h = (opt['h'] as num?)?.toDouble() ?? w;

        // Coordinates (x, y) are TOP-LEFT corner
        // Add offset first, then flip Y for Flutter canvas
        final cx = (x + w / 2) * scale;
        final cy = _toFlutterCenterY(y, h, scale);
        final radius = (w / 2) * scale;

        debugPrint('OVERLAY Answer bubble: q=$qKey, opt=$optKey, x=$x, y=$y, w=$w, h=$h, flutterCenter=($cx, $cy)');

        final paint = Paint()
          ..color = const Color(0xFF10B981).withValues(alpha: 0.6)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.0;

        canvas.drawCircle(Offset(cx, cy), radius, paint);
      }
    }
  }

  @override
  bool shouldRepaint(_OMRTemplateJsonPainter oldDelegate) {
    return template != oldDelegate.template ||
        imageWidth != oldDelegate.imageWidth ||
        imageHeight != oldDelegate.imageHeight;
  }
}
