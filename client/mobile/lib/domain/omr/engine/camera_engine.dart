import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:opencv_dart/opencv_dart.dart' as cv;

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS - tuned for real-world document photos
// ═══════════════════════════════════════════════════════════════════════════

const double _minPageAreaThreshold = 5000;
const int _cannyLower = 50;
const int _cannyUpper = 150;
const double _houghThreshold = 50;
const double _minLineLength = 80;
const double _maxLineGap = 30;
const int _morphKernelSize = 5;
const double _approxEpsilonFactor = 0.02;
const double _minAspectRatio = 0.5;
const double _maxAspectRatio = 2.0;

// ═══════════════════════════════════════════════════════════════════════════
// CAMERA ENGINE - OpenCV-based corner detection and perspective warp
// Ports omr_engine_v2.dart _findPageCorners* and _fourPointTransform
// ═══════════════════════════════════════════════════════════════════════════

/// Camera engine for document scanning with corner detection and perspective warp.
/// Uses OpenCV (via opencv_dart) - same library and logic as the working APP version.
class CameraEngine {
  /// Detect 4 corners of a document in the given image.
  /// Returns null if no valid rectangle found.
  /// Corners are ordered: TL, TR, BR, BL.
  Future<List<Offset>?> detectCorners(Uint8List imageBytes) async {
    try {
      final gray = cv.imdecode(imageBytes, cv.IMREAD_GRAYSCALE);
      if (gray.rows == 0 || gray.cols == 0) return null;

      debugPrint('CameraEngine: image size ${gray.cols}x${gray.rows}');

      // Try contour-based detection first (like OMRChecker)
      final contourCorners = _findPageCornersContour(gray);
      if (contourCorners != null && contourCorners.length == 4) {
        debugPrint('CameraEngine: Found corners via contour detection');
        gray.dispose();
        return contourCorners;
      }

      // Fall back to Hough-based detection
      debugPrint('CameraEngine: Falling back to Hough detection');
      final houghCorners = _findPageCornersHough(gray);
      gray.dispose();

      if (houghCorners != null && houghCorners.length == 4) {
        debugPrint('CameraEngine: Found corners via Hough');
        return houghCorners;
      }

      debugPrint('CameraEngine: No corners detected');
      return null;
    } catch (e, st) {
      debugPrint('CameraEngine EXCEPTION: $e\n$st');
      return null;
    }
  }

  /// Apply perspective warp to straighten the document.
  Future<Uint8List?> perspectiveWarp(
    Uint8List imageBytes,
    List<Offset>? corners,
    int targetWidth,
    int targetHeight,
  ) async {
    if (corners == null || corners.length != 4) return null;

    try {
      final src = corners.map((c) => [c.dx, c.dy]).toList();
      final warped = _fourPointTransform(imageBytes, src, targetWidth, targetHeight);
      return warped;
    } catch (e, st) {
      debugPrint('CameraEngine warp EXCEPTION: $e\n$st');
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CONTOUR-BASED CORNER DETECTION
  // ═══════════════════════════════════════════════════════════════════════

  /// Find page corners using contour detection + approxPolyDP.
  List<Offset>? _findPageCornersContour(cv.Mat gray) {
    try {
      debugPrint('CameraEngine _findPageCornersContour: starting');

      // Apply Gaussian blur to reduce noise
      final blurred = cv.gaussianBlur(gray, (_morphKernelSize, _morphKernelSize), 0);

      // Apply OTSU binary threshold
      final (_, binary) = cv.threshold(blurred, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
      blurred.dispose();

      // Find contours
      final (contours, _) = cv.findContours(binary, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
      binary.dispose();

      if (contours.isEmpty) {
        debugPrint('CameraEngine _findPageCornersContour: No contours found');
        return null;
      }

      debugPrint('CameraEngine _findPageCornersContour: ${contours.length} contours');

      // Sort by area descending
      final sortedIndices = List.generate(contours.length, (i) => i);
      sortedIndices.sort((a, b) {
        final areaA = cv.contourArea(contours[a]);
        final areaB = cv.contourArea(contours[b]);
        return areaB.compareTo(areaA);
      });

      // Check top contours for valid rectangles
      for (int idx in sortedIndices.take(50)) {
        final contour = contours[idx];
        final area = cv.contourArea(contour);

        if (area < _minPageAreaThreshold) break;

        final peri = cv.arcLength(contour, true);
        final approx = cv.approxPolyDP(contour, _approxEpsilonFactor * peri, true);

        if (approx.length != 4) continue;

        // Convert approxPoly points to our format
        final pts = <Offset>[];
        for (int i = 0; i < approx.length; i++) {
          final pt = approx[i];
          pts.add(Offset(pt.x.toDouble(), pt.y.toDouble()));
        }
        approx.dispose();

        // Order corners and check aspect ratio
        final ordered = _orderCornersSimple(pts);
        final width = _distance(ordered[0], ordered[1]);
        final height = _distance(ordered[0], ordered[3]);
        final aspectRatio = width / (height + 1e-10);

        debugPrint('CameraEngine _findPageCornersContour: rect w=$width h=$height ratio=$aspectRatio');

        if (aspectRatio > _minAspectRatio && aspectRatio < _maxAspectRatio) {
          debugPrint('CameraEngine _findPageCornersContour: VALID rectangle found');
          return ordered;
        }
      }

      contours.dispose();
      debugPrint('CameraEngine _findPageCornersContour: No valid rectangle found');
      return null;
    } catch (e, st) {
      debugPrint('CameraEngine _findPageCornersContour EXCEPTION: $e\n$st');
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // HOUGH LINE TRANSFORM CORNER DETECTION (fallback)
  // ═══════════════════════════════════════════════════════════════════════

  /// Find page corners using Hough Line Transform + intersections.
  List<Offset>? _findPageCornersHough(cv.Mat gray) {
    try {
      debugPrint('CameraEngine _findPageCornersHough: starting');

      // Gaussian blur
      final blurred = cv.gaussianBlur(gray, (_morphKernelSize, _morphKernelSize), 0);

      // Adaptive threshold for better edge detection on varied images
      final binary = cv.adaptiveThreshold(
        blurred,
        255.0,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY_INV,
        11,
        2,
      );
      blurred.dispose();

      // Canny edge detection
      final edges = cv.canny(binary, _cannyLower.toDouble(), _cannyUpper.toDouble());

      // Dilate to connect broken edges
      final kernel = cv.getStructuringElement(cv.MORPH_RECT, (3, 3));
      final dilated = cv.dilate(edges, kernel, iterations: 2);
      edges.dispose();
      binary.dispose();
      kernel.dispose();

      // Hough Line Transform
      final lines = cv.HoughLinesP(
        dilated,
        1.0,
        math.pi / 180.0,
        _houghThreshold.toInt(),
        minLineLength: _minLineLength,
        maxLineGap: _maxLineGap,
      );
      dilated.dispose();

      if (lines.rows < 4) {
        debugPrint('CameraEngine _findPageCornersHough: Not enough lines (${lines.rows})');
        lines.dispose();
        return null;
      }

      debugPrint('CameraEngine _findPageCornersHough: ${lines.rows} lines found');

      // Classify into horizontal and vertical lines
      final horizontal = <_Line>[];
      final vertical = <_Line>[];

      for (int i = 0; i < lines.rows; i++) {
        // Mat is 4xN where each column is [x1, y1, x2, y2]
        final x1 = lines.atI32(i * 4 + 0);
        final y1 = lines.atI32(i * 4 + 1);
        final x2 = lines.atI32(i * 4 + 2);
        final y2 = lines.atI32(i * 4 + 3);

        final angle = _calcAngle(x1, y1, x2, y2);
        final length = _calcLength(x1, y1, x2, y2);

        if (length < _minLineLength) continue;

        // Horizontal: angle close to 0 or 180 (within 25 deg)
        if (angle < 25 || angle > 155) {
          horizontal.add(_Line(x1: x1, y1: y1, x2: x2, y2: y2, angle: angle, length: length));
        }
        // Vertical: angle close to 90 (within 25 deg)
        else if ((angle - 90).abs() < 25) {
          vertical.add(_Line(x1: x1, y1: y1, x2: x2, y2: y2, angle: angle, length: length));
        }
      }

      lines.dispose();

      debugPrint('CameraEngine _findPageCornersHough: H=$horizontal V=$vertical');

      if (horizontal.length < 2 || vertical.length < 2) {
        debugPrint('CameraEngine _findPageCornersHough: Not enough H/V lines');
        return null;
      }

      // Sort by length, take top 5
      horizontal.sort((a, b) => b.length.compareTo(a.length));
      vertical.sort((a, b) => b.length.compareTo(a.length));

      final topH = horizontal.take(5).toList();
      final topV = vertical.take(5).toList();

      // Find all intersections
      final intersections = <Offset>[];
      for (final hLine in topH) {
        for (final vLine in topV) {
          final pt = _lineIntersection(hLine, vLine);
          if (pt != null) {
            if (pt.dx > 10 && pt.dx < gray.cols - 10 &&
                pt.dy > 10 && pt.dy < gray.rows - 10) {
              intersections.add(pt);
            }
          }
        }
      }

      debugPrint('CameraEngine _findPageCornersHough: ${intersections.length} intersections');

      if (intersections.length < 4) {
        debugPrint('CameraEngine _findPageCornersHough: Not enough intersections');
        return null;
      }

      // Select best 4 corners
      final selected = _selectBestCorners(intersections, gray.cols, gray.rows);
      if (selected.length >= 4) {
        final ordered = _orderCornersSimple(selected.take(4).toList());
        debugPrint('CameraEngine _findPageCornersHough: FOUND via Hough');
        return ordered;
      }

      return null;
    } catch (e, st) {
      debugPrint('CameraEngine _findPageCornersHough EXCEPTION: $e\n$st');
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // GEOMETRY HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  double _calcAngle(int x1, int y1, int x2, int y2) {
    var angle = math.atan2((y2 - y1).toDouble(), (x2 - x1).toDouble()) * 180 / math.pi;
    if (angle < 0) angle += 180;
    return angle;
  }

  double _calcLength(int x1, int y1, int x2, int y2) {
    final dx = x2 - x1;
    final dy = y2 - y1;
    return math.sqrt(dx * dx + dy * dy);
  }

  /// Intersection of two line segments.
  Offset? _lineIntersection(_Line l1, _Line l2) {
    final x1 = l1.x1.toDouble(), y1 = l1.y1.toDouble();
    final x2 = l1.x2.toDouble(), y2 = l1.y2.toDouble();
    final x3 = l2.x1.toDouble(), y3 = l2.y1.toDouble();
    final x4 = l2.x2.toDouble(), y4 = l2.y2.toDouble();

    final denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom.abs() < 1e-10) return null;

    final t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    final u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return Offset(x1 + t * (x2 - x1), y1 + t * (y2 - y1));
    }
    return null;
  }

  /// Select 4 best corners from intersection points.
  List<Offset> _selectBestCorners(List<Offset> corners, int imgW, int imgH) {
    if (corners.length < 4) return corners;

    // Remove near-duplicates
    final unique = <Offset>[];
    for (final c in corners) {
      bool isDup = false;
      for (final e in unique) {
        if (_distance(c, e) < 50) {
          isDup = true;
          break;
        }
      }
      if (!isDup) unique.add(c);
    }

    if (unique.length < 4) return corners.take(4).toList();

    // Find TL, TR, BR, BL by min/max sum/diff
    Offset? tl, tr, bl, br;
    double minSum = double.infinity;
    double maxSum = -double.infinity;
    double minDiff = double.infinity;
    double maxDiff = -double.infinity;

    for (final c in unique) {
      final sum = c.dx + c.dy;
      final diff = c.dx - c.dy;
      if (sum < minSum) { minSum = sum; tl = c; }
      if (sum > maxSum) { maxSum = sum; br = c; }
      if (diff < minDiff) { minDiff = diff; tr = c; }
      if (diff > maxDiff) { maxDiff = diff; bl = c; }
    }

    if (tl == null || tr == null || bl == null || br == null) {
      return _selectByQuadrant(unique, imgW, imgH);
    }

    // Verify valid rectangle
    final w1 = _distance(tl, tr);
    final w2 = _distance(bl, br);
    final h1 = _distance(tl, bl);
    final h2 = _distance(tr, br);
    if (w1 > 100 && w2 > 100 && h1 > 100 && h2 > 100) {
      return [tl, tr, br, bl];
    }

    return _selectByQuadrant(unique, imgW, imgH);
  }

  /// Fallback: select corners by quadrant proximity.
  List<Offset> _selectByQuadrant(List<Offset> corners, int imgW, int imgH) {
    final centers = [
      Offset(imgW * 0.25, imgH * 0.25),
      Offset(imgW * 0.75, imgH * 0.25),
      Offset(imgW * 0.75, imgH * 0.75),
      Offset(imgW * 0.25, imgH * 0.75),
    ];

    final selected = <Offset>[];
    final used = <int>[];

    for (final center in centers) {
      double minDist = double.infinity;
      int bestIdx = -1;
      for (int i = 0; i < corners.length; i++) {
        if (used.contains(i)) continue;
        final d = _distance(corners[i], center);
        if (d < minDist) {
          minDist = d;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        selected.add(corners[bestIdx]);
        used.add(bestIdx);
      }
    }

    return selected;
  }

  /// Order 4 corners as TL, TR, BR, BL using centroid method.
  List<Offset> _orderCornersSimple(List<Offset> pts) {
    if (pts.length != 4) return pts;

    double cy = 0;
    for (final p in pts) { cy += p.dy; }
    cy /= 4;

    final top = <Offset>[], bottom = <Offset>[];
    for (final p in pts) {
      if (p.dy < cy) { top.add(p); } else { bottom.add(p); }
    }

    top.sort((a, b) => a.dx.compareTo(b.dx));
    bottom.sort((a, b) => a.dx.compareTo(b.dx));

    if (top.length >= 2 && bottom.length >= 2) {
      return [top[0], top[1], bottom[1], bottom[0]];
    }

    // Edge case: fallback by sum/diff
    Offset t = pts[0], br = pts[0], trP = pts[0], bl = pts[0];
    double minSum = double.infinity, maxSum = -double.infinity;
    double minDiff = double.infinity, maxDiff = -double.infinity;

    for (final c in pts) {
      final sum = c.dx + c.dy;
      final diff = c.dx - c.dy;
      if (sum < minSum) { minSum = sum; t = c; }
      if (sum > maxSum) { maxSum = sum; br = c; }
      if (diff < minDiff) { minDiff = diff; trP = c; }
      if (diff > maxDiff) { maxDiff = diff; bl = c; }
    }
    return [t, trP, br, bl];
  }

  double _distance(Offset p1, Offset p2) {
    final dx = p1.dx - p2.dx;
    final dy = p1.dy - p2.dy;
    return math.sqrt(dx * dx + dy * dy);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FOUR POINT TRANSFORM (OpenCV)
  // ═══════════════════════════════════════════════════════════════════════

  /// Apply 4-point perspective transform using OpenCV.
  Uint8List? _fourPointTransform(
    Uint8List imageBytes,
    List<List<double>> pts,
    int targetWidth,
    int targetHeight,
  ) {
    if (pts.length != 4) return null;

    final tl = pts[0], tr = pts[1], br = pts[2], bl = pts[3];

    // Compute max width/height from source corners
    final wBottom = math.sqrt(math.pow(br[0] - bl[0], 2) + math.pow(br[1] - bl[1], 2));
    final wTop = math.sqrt(math.pow(tr[0] - tl[0], 2) + math.pow(tr[1] - tl[1], 2));
    final maxWidth = math.max(wBottom, wTop).round();

    final hRight = math.sqrt(math.pow(tr[0] - br[0], 2) + math.pow(tr[1] - br[1], 2));
    final hLeft = math.sqrt(math.pow(tl[0] - bl[0], 2) + math.pow(tl[1] - bl[1], 2));
    final maxHeight = math.max(hRight, hLeft).round();

    // Source points (as cv.Point)
    final srcPoints = <cv.Point>[
      cv.Point(tl[0].round(), tl[1].round()),
      cv.Point(tr[0].round(), tr[1].round()),
      cv.Point(br[0].round(), br[1].round()),
      cv.Point(bl[0].round(), bl[1].round()),
    ];

    // Destination points
    final dstPoints = <cv.Point>[
      cv.Point(0, 0),
      cv.Point(maxWidth - 1, 0),
      cv.Point(maxWidth - 1, maxHeight - 1),
      cv.Point(0, maxHeight - 1),
    ];

    // Compute perspective transform
    final srcVec = cv.VecPoint.fromList(srcPoints);
    final dstVec = cv.VecPoint.fromList(dstPoints);
    final matrix = cv.getPerspectiveTransform(srcVec, dstVec);
    srcVec.dispose();
    dstVec.dispose();

    // Read image
    final img = cv.imdecode(imageBytes, cv.IMREAD_UNCHANGED);
    if (img.rows == 0) {
      matrix.dispose();
      return null;
    }

    // Apply warp
    final warped = cv.warpPerspective(img, matrix, (maxWidth, maxHeight));
    matrix.dispose();
    img.dispose();

    // Resize to target dimensions
    final resized = cv.resize(warped, (targetWidth, targetHeight));
    warped.dispose();

    // Encode as JPEG (imencode params needs VecI32)
    final encResult = cv.imencode('.jpg', resized, params: cv.VecI32.fromList([cv.IMWRITE_JPEG_QUALITY, 95]));
    resized.dispose();
    if (!encResult.$1) return null;
    return encResult.$2;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER CLASS
// ═══════════════════════════════════════════════════════════════════════════

class _Line {
  final int x1, y1, x2, y2;
  final double angle;
  final double length;

  _Line({
    required this.x1,
    required this.y1,
    required this.x2,
    required this.y2,
    required this.angle,
    required this.length,
  });
}
