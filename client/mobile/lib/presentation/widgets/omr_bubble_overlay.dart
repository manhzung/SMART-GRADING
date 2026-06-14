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

  const OMRBubbleOverlay({
    super.key,
    required this.imageBytes,
    required this.imageWidth,
    required this.imageHeight,
    required this.result,
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
      child: Wrap(
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

  _BubbleOverlayPainter({
    required this.template,
    required this.bubbleIntensities,
    required this.globalThreshold,
    required this.hasMultiMarked,
    required this.imageWidth,
    required this.imageHeight,
    this.alignmentShifts = const [],
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (imageWidth <= 0 || imageHeight <= 0) return;

    // Letterbox-aware scaling: compute the visible image rectangle within the widget.
    // Image is drawn with BoxFit.contain, so we need to find the actual displayed area.
    final imgAspect = imageWidth / imageHeight;
    final widgetAspect = size.width / size.height;

    double displayImgWidth;
    double displayImgHeight;
    double offsetX;
    double offsetY;

    if (widgetAspect > imgAspect) {
      // Widget is wider than image — image has horizontal letterboxing (bars left/right)
      displayImgHeight = size.height;
      displayImgWidth = size.height * imgAspect;
      offsetX = (size.width - displayImgWidth) / 2;
      offsetY = 0;
    } else {
      // Widget is taller than image — image has vertical letterboxing (bars top/bottom)
      displayImgWidth = size.width;
      displayImgHeight = size.width / imgAspect;
      offsetX = 0;
      offsetY = (size.height - displayImgHeight) / 2;
    }

    // Scale from template coords to actual displayed image pixels
    final scaleX = displayImgWidth / imageWidth;
    final scaleY = displayImgHeight / imageHeight;

    // Use uniform scaling so circles stay round (template may be scaled
    // non-uniformly by BoxFit.contain in some aspect cases).
    final scale = (scaleX < scaleY) ? scaleX : scaleY;

    // Iterate through all bubbles from the template
    for (int blockIdx = 0; blockIdx < template.fieldBlocks.length; blockIdx++) {
      final block = template.fieldBlocks[blockIdx];
      final shift = alignmentShifts.isNotEmpty && blockIdx < alignmentShifts.length
          ? alignmentShifts[blockIdx]
          : 0;
      // Bubble radius in display pixels = half the template bubble size
      // scaled to the displayed image. This makes the overlay circle
      // match the real bubble on the sheet across zoom levels.
      final radius = (block.bubbleWidth / 2) * scale;

      for (int rowIdx = 0; rowIdx < block.traverseBubbles.length; rowIdx++) {
        final row = block.traverseBubbles[rowIdx];
        if (row.isEmpty) continue;

        final fieldLabel = row[0].fieldLabel;
        final intensities = bubbleIntensities[fieldLabel];

        for (int colIdx = 0; colIdx < row.length; colIdx++) {
          final bubble = row[colIdx];

          // Map template coords → display coords via the shared
          // helper. `bubble.x + shift` / `bubble.y` are the engine's
          // actual read position (top-left in template space).
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

          // Retrieve intensity for this specific bubble position
          final intensity = (intensities != null && colIdx < intensities.length)
              ? intensities[colIdx]
              : null;
          final isMarked = intensity?.isMarked ?? false;
          final meanIntensity = intensity?.meanIntensity ?? 255.0;

          // Determine color based on bubble state
          final Color bubbleColor;
          if (isMarked) {
            bubbleColor = hasMultiMarked
                ? const Color(0xFFEF4444) // Red for multi-marked
                : const Color(0xFF22C55E); // Green for correctly marked
          } else if (meanIntensity < globalThreshold) {
            bubbleColor = const Color(0xFFFEF3C7); // Yellow for low intensity
          } else {
            bubbleColor = const Color(0xFF94A3B8); // Gray for unmarked
          }

          // Stroke width also scales so it remains visible at any zoom.
          final strokeWidth = (radius * 0.12).clamp(1.0, 3.0);

          // Draw outline circle scaled to match the real bubble size.
          final strokePaint = Paint()
            ..color = bubbleColor
            ..style = PaintingStyle.stroke
            ..strokeWidth = strokeWidth;
          canvas.drawCircle(Offset(bx, by), radius, strokePaint);

          // Draw small filled center dot for marked bubbles only.
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
        bubbleIntensities != oldDelegate.bubbleIntensities ||
        globalThreshold != oldDelegate.globalThreshold ||
        hasMultiMarked != oldDelegate.hasMultiMarked ||
        imageWidth != oldDelegate.imageWidth ||
        imageHeight != oldDelegate.imageHeight;
  }
}
