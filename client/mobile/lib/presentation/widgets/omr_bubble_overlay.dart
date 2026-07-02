import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:smart_grading_mobile/domain/omr/engine/omr_engine.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_response.dart';

/// Pure helper: given a bubble's template coordinates, the template
/// block it belongs to, and the scale + letterbox offset used by the
/// painter, return the on-screen (x, y) where the bubble's CENTER
/// should be drawn.
///
/// `bubble.x` / `bubble.y` are the TOP-LEFT corner of the bubble's
/// bounding box (see FieldBlock.fromConfig). `Canvas.drawCircle`
/// expects the CENTER, so we add half the bubble size on each axis
/// before scaling. Without this, every overlay circle is drawn at
/// the top-left corner of its bubble, shifting the visible
/// overlay up-and-left by `bubbleW/2, bubbleH/2` template pixels.
///
/// Exposed as a top-level function (not a class method) so the
/// coordinate math can be unit-tested without spinning up a
/// `CustomPainter`.
Offset bubbleDisplayCenter({
  required int bubbleTemplateX,
  required int bubbleTemplateY,
  required num blockBubbleWidth,
  required num blockBubbleHeight,
  required double scaleX,
  required double scaleY,
  required double offsetX,
  required double offsetY,
}) {
  final centerX =
      (bubbleTemplateX + blockBubbleWidth / 2) * scaleX + offsetX;
  final centerY =
      (bubbleTemplateY + blockBubbleHeight / 2) * scaleY + offsetY;
  return Offset(centerX, centerY);
}

/// Widget that displays a cropped OMR image with colored bubble overlays.
///
/// The overlay is drawn AFTER the image has been cropped and warped to template
/// dimensions, so bubble positions align correctly with the displayed image.
class OMRBubbleOverlay extends StatelessWidget {
  /// The cropped/processed image bytes (after warp, at template dimensions).
  final Uint8List imageBytes;

  /// The actual width of the displayed image.
  final int imageWidth;

  /// The actual height of the displayed image.
  final int imageHeight;

  /// The OMR processing result containing bubble intensity data and template.
  final OMRProcessingResult result;

  /// Detected student ID (for display).
  final String? detectedStudentId;

  /// Detected version code (for display).
  final String? detectedVersionCode;

  const OMRBubbleOverlay({
    super.key,
    required this.imageBytes,
    required this.imageWidth,
    required this.imageHeight,
    required this.result,
    this.detectedStudentId,
    this.detectedVersionCode,
  });

  @override
  Widget build(BuildContext context) {
    return InteractiveViewer(
      minScale: 0.5,
      maxScale: 4.0,
      child: Column(
        children: [
          Expanded(
            child: Stack(
              children: [
                Positioned.fill(
                  child: Image.memory(
                    imageBytes,
                    fit: BoxFit.contain,
                  ),
                ),
                Positioned.fill(
                  child: CustomPaint(
                    painter: _BubbleOverlayPainter(
                      template: result.template,
                      bubbleIntensities: result.response.bubbleIntensities,
                      globalThreshold: result.response.globalThreshold,
                      hasMultiMarked: result.response.multiMarked,
                      imageWidth: imageWidth,
                      imageHeight: imageHeight,
                      alignmentShifts: result.alignmentShifts,
                      detectedStudentId: detectedStudentId,
                      detectedVersionCode: detectedVersionCode,
                    ),
                  ),
                ),
              ],
            ),
          ),
          _buildLegend(),
        ],
      ),
    );
  }

  Widget _buildLegend() {
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
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (detectedStudentId != null || detectedVersionCode != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (detectedStudentId != null)
                    _infoChip('SBD: $detectedStudentId', const Color(0xFF3B82F6)),
                  if (detectedStudentId != null && detectedVersionCode != null)
                    const SizedBox(width: 12),
                  if (detectedVersionCode != null)
                    _infoChip('Version Code: $detectedVersionCode', const Color(0xFF8B5CF6)),
                ],
              ),
            ),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 16,
            runSpacing: 4,
            children: [
              _legendItem(const Color(0xFF22C55E), 'MARKED'),
              if (result.response.multiMarked)
                _legendItem(const Color(0xFFEF4444), 'MULTI'),
              _legendItem(const Color(0xFFFEF3C7), 'LOW'),
              _legendItem(const Color(0xFF94A3B8), 'UNMARKED'),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'GLOBAL ${result.response.globalThreshold.toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF475569),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _infoChip(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  Widget _legendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(
              color: Colors.black.withValues(alpha: 0.2),
              width: 0.5,
            ),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: Color(0xFF475569),
          ),
        ),
      ],
    );
  }
}

/// CustomPainter that draws bubble indicators at real template positions,
/// scaled to the display size. Uses outline-only circles so the underlying
/// image content is not obscured.
class _BubbleOverlayPainter extends CustomPainter {
  final OMRTemplate template;
  final Map<String, List<BubbleIntensity>> bubbleIntensities;
  final double globalThreshold;
  final bool hasMultiMarked;
  final int imageWidth;
  final int imageHeight;
  final List<int> alignmentShifts;
  final String? detectedStudentId;
  final String? detectedVersionCode;

  _BubbleOverlayPainter({
    required this.template,
    required this.bubbleIntensities,
    required this.globalThreshold,
    required this.hasMultiMarked,
    required this.imageWidth,
    required this.imageHeight,
    this.alignmentShifts = const [],
    this.detectedStudentId,
    this.detectedVersionCode,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (imageWidth <= 0 || imageHeight <= 0) return;

    // Letterbox-aware scaling: compute the visible image rectangle within the widget.
    final imgAspect = imageWidth / imageHeight;
    final widgetAspect = size.width / size.height;

    double displayImgWidth;
    double displayImgHeight;
    double offsetX;
    double offsetY;

    if (widgetAspect > imgAspect) {
      displayImgHeight = size.height;
      displayImgWidth = size.height * imgAspect;
      offsetX = (size.width - displayImgWidth) / 2;
      offsetY = 0;
    } else {
      displayImgWidth = size.width;
      displayImgHeight = size.width / imgAspect;
      offsetX = 0;
      offsetY = (size.height - displayImgHeight) / 2;
    }

    final scaleX = displayImgWidth / imageWidth;
    final scaleY = displayImgHeight / imageHeight;

    // Draw fiducial markers (4 corners)
    _drawFiducialMarkers(canvas, offsetX, offsetY, scaleX, scaleY);

    // Draw Student ID bubbles
    _drawStudentIdBubbles(canvas, offsetX, offsetY, scaleX, scaleY);

    // Draw Version Code bubbles
    _drawVersionCodeBubbles(canvas, offsetX, offsetY, scaleX, scaleY);

    // Draw answer bubbles
    _drawAnswerBubbles(canvas, offsetX, offsetY, scaleX, scaleY);
  }

  void _drawFiducialMarkers(Canvas canvas, double offsetX, double offsetY,
      double scaleX, double scaleY) {
    final markers = template.fiducialMarkers;
    if (markers == null || markers.isEmpty) return;

    for (final marker in markers) {
      final centerX = marker.x * scaleX + offsetX;
      final centerY = marker.y * scaleY + offsetY;
      final radius = marker.radius * ((scaleX + scaleY) / 2);

      // Draw crosshair pattern for fiducial marker
      final paint = Paint()
        ..color = const Color(0xFFFF6B00).withValues(alpha: 0.7)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.0;

      // Draw outer circle
      canvas.drawCircle(Offset(centerX, centerY), radius, paint);

      // Draw inner dot
      final innerPaint = Paint()
        ..color = const Color(0xFFFF6B00)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(Offset(centerX, centerY), radius * 0.3, innerPaint);

      // Draw crosshair lines
      canvas.drawLine(
        Offset(centerX - radius, centerY),
        Offset(centerX + radius, centerY),
        paint,
      );
      canvas.drawLine(
        Offset(centerX, centerY - radius),
        Offset(centerX, centerY + radius),
        paint,
      );
    }
  }

  void _drawStudentIdBubbles(Canvas canvas, double offsetX, double offsetY,
      double scaleX, double scaleY) {
    final studentId = template.studentId;
    if (studentId == null || studentId.coords.isEmpty) return;

    // Group coords by digit position
    final byDigit = <int, List<IdBubbleCoord>>{};
    for (final coord in studentId.coords) {
      byDigit.putIfAbsent(coord.digit, () => []).add(coord);
    }

    for (final entry in byDigit.entries) {
      final digit = entry.key;
      final coords = entry.value;

      for (final coord in coords) {
        final centerX = coord.x * scaleX + offsetX;
        final centerY = coord.y * scaleY + offsetY;
        final radius = (coord.w / 2) * scaleX;

        // Determine color based on whether this digit was detected
        final isMarked = detectedStudentId != null &&
            detectedStudentId!.length > digit &&
            detectedStudentId![digit] == coord.value.toString();
        final color = isMarked
            ? const Color(0xFF3B82F6)  // Blue for detected
            : const Color(0xFF94A3B8).withValues(alpha: 0.5);  // Gray for others

        final paint = Paint()
          ..color = color
          ..style = isMarked ? PaintingStyle.fill : PaintingStyle.stroke
          ..strokeWidth = 1.5;

        canvas.drawCircle(Offset(centerX, centerY), radius, paint);

        // Label for digit position
        if (coord.value == 0 || coord.value == 1) {
          final textPainter = TextPainter(
            text: TextSpan(
              text: 'D$digit',
              style: TextStyle(
                color: const Color(0xFF3B82F6).withValues(alpha: 0.6),
                fontSize: 10,
                fontWeight: FontWeight.w500,
              ),
            ),
            textDirection: TextDirection.ltr,
          );
          textPainter.layout();
          textPainter.paint(
            canvas,
            Offset(centerX - textPainter.width / 2, centerY - radius - 12),
          );
        }
      }
    }
  }

  void _drawVersionCodeBubbles(Canvas canvas, double offsetX, double offsetY,
      double scaleX, double scaleY) {
    final versionZone = template.versionCodeZone;
    if (versionZone == null || versionZone.coords.isEmpty) return;

    // Group coords by digit position
    final byDigit = <int, List<IdBubbleCoord>>{};
    for (final coord in versionZone.coords) {
      byDigit.putIfAbsent(coord.digit, () => []).add(coord);
    }

    for (final entry in byDigit.entries) {
      final digit = entry.key;
      final coords = entry.value;

      for (final coord in coords) {
        final centerX = coord.x * scaleX + offsetX;
        final centerY = coord.y * scaleY + offsetY;
        final radius = (coord.w / 2) * scaleX;

        // Determine color based on detected version
        final isMarked = detectedVersionCode != null &&
            detectedVersionCode!.length > digit &&
            detectedVersionCode![digit] == coord.value.toString();
        final color = isMarked
            ? const Color(0xFF8B5CF6)  // Purple for detected
            : const Color(0xFF94A3B8).withValues(alpha: 0.5);

        final paint = Paint()
          ..color = color
          ..style = isMarked ? PaintingStyle.fill : PaintingStyle.stroke
          ..strokeWidth = 1.5;

        canvas.drawCircle(Offset(centerX, centerY), radius, paint);

        // Show version number
        if (coord.value == 1) {
          final textPainter = TextPainter(
            text: TextSpan(
              text: 'V$digit',
              style: TextStyle(
                color: const Color(0xFF8B5CF6).withValues(alpha: 0.6),
                fontSize: 10,
                fontWeight: FontWeight.w500,
              ),
            ),
            textDirection: TextDirection.ltr,
          );
          textPainter.layout();
          textPainter.paint(
            canvas,
            Offset(centerX - textPainter.width / 2, centerY - radius - 12),
          );
        }
      }
    }
  }

  void _drawAnswerBubbles(Canvas canvas, double offsetX, double offsetY,
      double scaleX, double scaleY) {
    final scale = (scaleX < scaleY) ? scaleX : scaleY;

    // Iterate through all bubbles from the template field blocks
    for (int blockIdx = 0; blockIdx < template.fieldBlocks.length; blockIdx++) {
      final block = template.fieldBlocks[blockIdx];
      final shift = alignmentShifts.isNotEmpty && blockIdx < alignmentShifts.length
          ? alignmentShifts[blockIdx]
          : 0;
      final radius = (block.bubbleWidth / 2) * scale;

      for (int rowIdx = 0; rowIdx < block.traverseBubbles.length; rowIdx++) {
        final row = block.traverseBubbles[rowIdx];
        if (row.isEmpty) continue;

        final fieldLabel = row[0].fieldLabel;
        final intensities = bubbleIntensities[fieldLabel];

        for (int colIdx = 0; colIdx < row.length; colIdx++) {
          final bubble = row[colIdx];

          final center = bubbleDisplayCenter(
            bubbleTemplateX: bubble.x + shift,
            bubbleTemplateY: bubble.y,
            blockBubbleWidth: block.bubbleWidth,
            blockBubbleHeight: block.bubbleHeight,
            scaleX: scaleX,
            scaleY: scaleY,
            offsetX: offsetX,
            offsetY: offsetY,
          );
          final bx = center.dx;
          final by = center.dy;

          final intensity = (intensities != null && colIdx < intensities.length)
              ? intensities[colIdx]
              : null;
          final isMarked = intensity?.isMarked ?? false;
          final meanIntensity = intensity?.meanIntensity ?? 255.0;

          final Color bubbleColor;
          if (isMarked) {
            bubbleColor = hasMultiMarked
                ? const Color(0xFFEF4444)
                : const Color(0xFF22C55E);
          } else if (meanIntensity < globalThreshold) {
            bubbleColor = const Color(0xFFFEF3C7);
          } else {
            bubbleColor = const Color(0xFF94A3B8);
          }

          final strokeWidth = (radius * 0.12).clamp(1.0, 3.0);

          final strokePaint = Paint()
            ..color = bubbleColor
            ..style = PaintingStyle.stroke
            ..strokeWidth = strokeWidth;
          canvas.drawCircle(Offset(bx, by), radius, strokePaint);

          final dotRadius = (radius * 0.3).clamp(1.5, 6.0);
          if (isMarked) {
            final fillPaint = Paint()
              ..color = bubbleColor.withValues(alpha: 0.9)
              ..style = PaintingStyle.fill;
            canvas.drawCircle(Offset(bx, by), dotRadius, fillPaint);
          }
        }
      }
    }
  }

  @override
  bool shouldRepaint(_BubbleOverlayPainter oldDelegate) {
    return template != oldDelegate.template ||
        globalThreshold != oldDelegate.globalThreshold ||
        hasMultiMarked != oldDelegate.hasMultiMarked ||
        imageWidth != oldDelegate.imageWidth ||
        imageHeight != oldDelegate.imageHeight ||
        detectedStudentId != oldDelegate.detectedStudentId ||
        detectedVersionCode != oldDelegate.detectedVersionCode ||
        !_listEquals(alignmentShifts, oldDelegate.alignmentShifts) ||
        !_mapEquals(bubbleIntensities, oldDelegate.bubbleIntensities);
  }

  bool _listEquals(List<int> a, List<int> b) {
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  bool _mapEquals(
      Map<String, List<BubbleIntensity>> a,
      Map<String, List<BubbleIntensity>> b) {
    if (a.length != b.length) return false;
    for (final key in a.keys) {
      final aList = a[key];
      final bList = b[key];
      if (aList == null || bList == null || aList.length != bList.length) {
        return false;
      }
      for (int i = 0; i < aList.length; i++) {
        if (aList[i].meanIntensity != bList[i].meanIntensity ||
            aList[i].isMarked != bList[i].isMarked) {
          return false;
        }
      }
    }
    return true;
  }
}
