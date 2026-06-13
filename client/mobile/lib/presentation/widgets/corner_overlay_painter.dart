import 'package:flutter/material.dart';

class CornerOverlayPainter extends CustomPainter {
  final List<Offset>? corners;
  final bool isStable;
  final double skewAngle;

  static const double _dashLength = 8.0;
  static const double _gapLength = 4.0;
  static const double _cornerCircleRadius = 12.0;
  static const double _strokeWidth = 3.0;
  static const double _skewWarningThreshold = 5.0;

  CornerOverlayPainter({
    this.corners,
    this.isStable = false,
    this.skewAngle = 0,
  });

  @override
  bool shouldRepaint(CornerOverlayPainter oldDelegate) {
    if (corners == null && oldDelegate.corners == null) {
      return isStable != oldDelegate.isStable || skewAngle != oldDelegate.skewAngle;
    }
    if (corners == null || oldDelegate.corners == null) {
      return true;
    }
    if (corners!.length != oldDelegate.corners!.length) {
      return true;
    }
    for (int i = 0; i < corners!.length; i++) {
      if (corners![i] != oldDelegate.corners![i]) {
        return true;
      }
    }
    return isStable != oldDelegate.isStable || skewAngle != oldDelegate.skewAngle;
  }

  @override
  void paint(Canvas canvas, Size size) {
    if (corners == null || corners!.isEmpty) {
      _drawCenterGuide(canvas, size);
    } else {
      _drawCornersOverlay(canvas, size);
    }
  }

  void _drawCenterGuide(Canvas canvas, Size size) {
    final centerX = size.width / 2;
    final centerY = size.height / 2;
    final guideWidth = size.width * 0.6;
    final guideHeight = size.height * 0.4;

    final paint = Paint()
      ..color = const Color(0xFF475569).withValues(alpha: 0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    final left = centerX - guideWidth / 2;
    final top = centerY - guideHeight / 2;
    final right = centerX + guideWidth / 2;
    final bottom = centerY + guideHeight / 2;

    _drawDashedRect(canvas, Rect.fromLTRB(left, top, right, bottom), paint);

    _drawCrosshair(canvas, Offset(centerX, centerY), paint);
  }

  void _drawDashedRect(Canvas canvas, Rect rect, Paint paint) {
    final top = Offset(rect.left, rect.top);
    final right = Offset(rect.right, rect.top);
    final bottom = Offset(rect.right, rect.bottom);
    final left = Offset(rect.left, rect.bottom);

    _drawDashedLine(canvas, top, right, paint);
    _drawDashedLine(canvas, right, bottom, paint);
    _drawDashedLine(canvas, bottom, left, paint);
    _drawDashedLine(canvas, left, top, paint);
  }

  void _drawDashedLine(Canvas canvas, Offset start, Offset end, Paint paint) {
    final dx = end.dx - start.dx;
    final dy = end.dy - start.dy;
    final length = (dx * dx + dy * dy);
    if (length == 0) return;

    final totalLength = length > 0 ? (dx * dx + dy * dy) : -(dx * dx + dy * dy);
    final normalizedLength = totalLength > 0
        ? (dx * dx + dy * dy)
        : -(dx * dx + dy * dy);
    final sqrtLength = normalizedLength > 0
        ? _sqrt(normalizedLength)
        : _sqrt(-normalizedLength);

    final ux = dx / sqrtLength;
    final uy = dy / sqrtLength;

    double t = 0;
    final lineLength = sqrtLength;
    while (t < lineLength) {
      final dashEnd = (t + _dashLength).clamp(0.0, lineLength);
      canvas.drawLine(
        Offset(start.dx + ux * t, start.dy + uy * t),
        Offset(start.dx + ux * dashEnd, start.dy + uy * dashEnd),
        paint,
      );
      t += _dashLength + _gapLength;
    }
  }

  double _sqrt(double value) {
    if (value <= 0) return 0;
    double x = value;
    double y = 1;
    const e = 0.000001;
    while (x - y > e) {
      x = (x + y) / 2;
      y = value / x;
    }
    return x;
  }

  void _drawCrosshair(Canvas canvas, Offset center, Paint paint) {
    const crosshairSize = 20.0;
    const gap = 5.0;

    canvas.drawLine(
      Offset(center.dx - crosshairSize, center.dy),
      Offset(center.dx - gap, center.dy),
      paint,
    );
    canvas.drawLine(
      Offset(center.dx + gap, center.dy),
      Offset(center.dx + crosshairSize, center.dy),
      paint,
    );
    canvas.drawLine(
      Offset(center.dx, center.dy - crosshairSize),
      Offset(center.dx, center.dy - gap),
      paint,
    );
    canvas.drawLine(
      Offset(center.dx, center.dy + gap),
      Offset(center.dx, center.dy + crosshairSize),
      paint,
    );
  }

  void _drawCornersOverlay(Canvas canvas, Size size) {
    final fillColor = isStable
        ? const Color(0xFF22C55E).withValues(alpha: 0.3)
        : const Color(0xFFF59E0B).withValues(alpha: 0.3);
    final strokeColor = isStable
        ? const Color(0xFF22C55E).withValues(alpha: 0.8)
        : const Color(0xFFF59E0B).withValues(alpha: 0.8);

    final fillPaint = Paint()
      ..color = fillColor
      ..style = PaintingStyle.fill;

    final strokePaint = Paint()
      ..color = strokeColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = _strokeWidth;

    final path = Path();
    if (corners!.isNotEmpty) {
      path.moveTo(corners![0].dx, corners![0].dy);
      for (int i = 1; i < corners!.length; i++) {
        path.lineTo(corners![i].dx, corners![i].dy);
      }
      path.close();
    }

    canvas.drawPath(path, fillPaint);
    canvas.drawPath(path, strokePaint);

    final circlePaint = Paint()
      ..color = strokeColor
      ..style = PaintingStyle.fill;

    for (final corner in corners!) {
      canvas.drawCircle(corner, _cornerCircleRadius, circlePaint);
    }

    for (int i = 0; i < corners!.length; i++) {
      final start = corners![i];
      final end = corners![(i + 1) % corners!.length];
      _drawDashedLine(canvas, start, end, strokePaint);
    }

    if (skewAngle.abs() > _skewWarningThreshold) {
      _drawSkewWarning(canvas, size);
    }
  }

  void _drawSkewWarning(Canvas canvas, Size size) {
    final textPainter = TextPainter(
      text: TextSpan(
        text: 'Tilt: ${skewAngle.toStringAsFixed(1)}°',
        style: const TextStyle(
          color: Color(0xFFEF4444),
          fontSize: 16,
          fontWeight: FontWeight.bold,
        ),
      ),
      textDirection: TextDirection.ltr,
    );
    textPainter.layout();

    final bgPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.7)
      ..style = PaintingStyle.fill;

    final padding = 8.0;
    final bgRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(
        (size.width - textPainter.width - padding * 2) / 2,
        size.height * 0.1,
        textPainter.width + padding * 2,
        textPainter.height + padding,
      ),
      const Radius.circular(4),
    );
    canvas.drawRRect(bgRect, bgPaint);

    textPainter.paint(
      canvas,
      Offset(
        (size.width - textPainter.width) / 2,
        size.height * 0.1 + padding / 2,
      ),
    );
  }
}
