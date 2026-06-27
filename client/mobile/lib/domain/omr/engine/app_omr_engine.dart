import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:opencv_dart/opencv_dart.dart' as cv;
import 'app_omr_models.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS - identical to omr_engine_v2.dart
// ═══════════════════════════════════════════════════════════════════════════════

const double _minPageAreaThreshold = 50000;
const int _cannyLower = 50;
const int _cannyUpper = 150;
const double _houghThreshold = 80;
const double _minLineLength = 150;
const double _maxLineGap = 20;
const double _approxEpsilonFactor = 0.02;
const double _minAspectRatio = 0.5;
const double _maxAspectRatio = 2.0;

const int _alignMorphThresh = 60;
const double _minJump = 8.0;
const double _globalThrWhite = 200.0;
const int _looseness = 4;
const int _rectInnerMarginNum = 12;
const int _rectOuterMarginNum = 10;

double _computeGlobalThreshold(List<double> vals) {
  if (vals.isEmpty) return 128;
  final sorted = List<double>.from(vals)..sort();
  final ls = (_looseness + 1) ~/ 2;
  final l = sorted.length - ls;

  double maxJump = _minJump;
  double thr = _globalThrWhite;

  for (int i = ls; i < l; i++) {
    final i1 = (i + ls).clamp(0, sorted.length - 1);
    final i2 = (i - ls).clamp(0, sorted.length - 1);
    final jump = sorted[i1] - sorted[i2];
    if (jump > maxJump) {
      maxJump = jump;
      thr = sorted[i2] + jump / 2;
    }
  }
  return thr;
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP OMR ENGINE - ports omr_engine_v2.dart logic exactly
// ═══════════════════════════════════════════════════════════════════════════════

/// Full OpenCV-based OMR engine. Ports omr_engine_v2.dart logic exactly.
/// Processes images through: Levels/GaussianBlur → CropPage → warp → normalize → auto-align → bubble reading.
class AppOMREngine {
  final AppOmrTemplate template;
  final Uint8List? _markerBytes;
  final List<int> _shifts = [];
  int _actualCropHeight = 0;
  int _actualCropWidth = 0;

  AppOMREngine(this.template, {Uint8List? markerBytes})
      : _markerBytes = markerBytes;

  /// Returns the auto-alignment shifts per field block.
  /// Call this AFTER processImage() to get the shifts used during reading.
  /// Returns empty list if autoAlign was false or if processImage() hasn't run.
  List<int> get alignmentShifts => List.unmodifiable(_shifts);

  /// Process image bytes and return OmrResult with annotated image bytes.
  (AppOmrResult, Uint8List?) processImage(Uint8List imageBytes) {
    cv.Mat img;
    Uint8List? annotatedBytes;

    try {
      img = cv.imdecode(imageBytes, cv.IMREAD_GRAYSCALE);
      if (img.rows == 0 || img.cols == 0) {
        return (_failResult('Cannot decode image'), null);
      }

      debugPrint('AppOMREngine: Original image size: ${img.cols}x${img.rows}');

      final pw = template.pageWidth;
      final ph = template.pageHeight;

      final origWidth = img.cols;
      final origHeight = img.rows;

      // Detect corners on ORIGINAL image size (or a proportional preview size)
      // to get accurate corner coordinates before any resizing distorts them.
      cv.Mat preview;
      double scaleToOrigX = 1.0;
      double scaleToOrigY = 1.0;
      if (origWidth > 1600 || origHeight > 1200) {
        final previewW = origWidth > origHeight ? 1600 : 1200;
        final previewH = origWidth > origHeight
            ? (origHeight * 1600 / origWidth).round()
            : (origHeight * 1200 / origWidth).round();
        preview = _resize(img, previewW, previewH);
        scaleToOrigX = origWidth / previewW;
        scaleToOrigY = origHeight / previewH;
        debugPrint('AppOMREngine: Preview size for corner detection: ${preview.cols}x${preview.rows}, '
            'scale back to orig: (${scaleToOrigX.toStringAsFixed(2)}, ${scaleToOrigY.toStringAsFixed(2)})');
      } else {
        preview = img.clone();
        scaleToOrigX = 1.0;
        scaleToOrigY = 1.0;
      }

      String preprocessor = 'None';
      bool warpOk = false;

      debugPrint('AppOMREngine: Template has ${template.preprocessors.length} preprocessors');

      for (final pp in template.preprocessors) {
        switch (pp.name) {
          case 'Levels':
            img = _applyLevels(img, pp.options);
            preprocessor = 'Levels';
            break;

          case 'GaussianBlur':
            final kSize = pp.options['kSize'] as List?;
            final k = (kSize?[0] as int?) ?? 3;
            img = cv.gaussianBlur(img, (k, k), 0);
            preprocessor = 'GaussianBlur';
            break;

          case 'CropPage':
            try {
              debugPrint('AppOMREngine: Starting CropPage detection on preview...');
              final corners = _findPageCornersSimple(preview);
              debugPrint(
                  'AppOMREngine: CropPage corners result: ${corners != null ? "found ${corners.length} corners" : "null"}');
              if (corners != null && corners.length == 4) {
                // Scale corners from preview coords back to original image coords
                final scaledCorners =
                    corners.map((c) => [c[0] * scaleToOrigX, c[1] * scaleToOrigY]).toList();
                debugPrint('AppOMREngine: Scaled corners to orig: '
                    '${scaledCorners.map((c) => '(${c[0].round()},${c[1].round()})').toList()}');
                // Warp original image to template dimensions
                final cropped = _fourPointTransform(img, scaledCorners);
                if (cropped != null && cropped.cols > 0 && cropped.rows > 0) {
                  debugPrint('AppOMREngine: CropPage raw crop: ${cropped.cols}x${cropped.rows}');
                  final resizedImg = _resize(cropped, pw, ph);
                  cropped.dispose();
                  img.dispose();
                  img = resizedImg;
                  preprocessor = 'CropPage';
                  warpOk = true;
                  debugPrint(
                      'AppOMREngine: CropPage succeeded, resized to: ${img.cols}x${img.rows} (template=$pw x $ph)');
                } else {
                  if (cropped != null) cropped.dispose();
                  debugPrint('AppOMREngine: CropPage - fourPointTransform failed or returned empty');
                }
              } else {
                debugPrint('AppOMREngine: CropPage - corners not found or wrong count');
              }
            } catch (e, st) {
              debugPrint('AppOMREngine: CropPage exception: $e\n$st');
            }
            break;

          case 'CropOnMarkers':
            try {
              final mb = _markerBytes;
              if (mb != null) {
                final marker = cv.imdecode(mb, cv.IMREAD_GRAYSCALE);
                if (marker.rows > 0) {
                  final markerCorners = _findMarkerCorners(preview, marker);
                  marker.dispose();
                  if (markerCorners != null && markerCorners.length == 4) {
                    final scaledMarkerCorners =
                        markerCorners.map((c) => [c[0] * scaleToOrigX, c[1] * scaleToOrigY]).toList();
                    final warped = _fourPointTransform(img, scaledMarkerCorners);
                    if (warped != null) {
                      img.dispose();
                      img = _resize(warped, pw, ph);
                      warped.dispose();
                      preprocessor = 'CropOnMarkers';
                      warpOk = true;
                      debugPrint('AppOMREngine: CropOnMarkers succeeded');
                    }
                  } else {
                    debugPrint('AppOMREngine: CropOnMarkers - corners not found');
                  }
                }
              }
            } catch (e, st) {
              debugPrint('AppOMREngine: CropOnMarkers exception: $e\n$st');
            }
            break;
        }
      }

      preview.dispose();

      if (!warpOk) {
        debugPrint(
            'AppOMREngine: No cropping succeeded, resizing to template size: $pw x $ph');

        final resizedImg = _resize(img, pw, ph);

        // Normalize even when warp fails — same logic as warp-ok branch
        cv.Mat normalized;
        final minMax = cv.minMaxLoc(resizedImg);
        if (minMax.$2 > minMax.$1) {
          normalized = _normalize(resizedImg);
        } else {
          normalized = resizedImg;
        }

        // Track actual cropped image dimensions for coordinate conversion
        _actualCropHeight = normalized.rows;
        _actualCropWidth = normalized.cols;

        // Compute alignment shifts even when warp fails
        if (template.autoAlign) {
          _computeShifts(normalized);
        } else {
          _shifts.clear();
        }

        final (responses, details, confidence, _) = _readResponses(normalized);
        normalized.dispose();

        if (origWidth > 0 && origHeight > 0) {
          final displayImg = cv.cvtColor(img, cv.COLOR_GRAY2BGR);
          _drawAnnotationsScaled(displayImg, origWidth / pw, origHeight / ph, details);
          annotatedBytes = _encodePng(displayImg);
          displayImg.dispose();
        }
        img.dispose();

        return (
          AppOmrResult(
            responses: responses,
            confidence: confidence,
            warpSucceeded: false,
            preprocessorUsed: 'ResizeOnly',
            details: details,
            annotatedImageBytes: annotatedBytes,
            annotatedWidth: origWidth,
            annotatedHeight: origHeight,
            croppedImageBytes: annotatedBytes,
            croppedWidth: origWidth,
            croppedHeight: origHeight,
            alignmentShifts: List.from(_shifts),
          ),
          annotatedBytes,
        );
      }

      // CropPage succeeded, continue processing
      final minMax = cv.minMaxLoc(img);
      cv.Mat normalized;
      if (minMax.$2 > minMax.$1) {
        normalized = _normalize(img);
        img.dispose();
      } else {
        normalized = img;
      }

      // Track actual cropped image dimensions for coordinate conversion
      _actualCropHeight = normalized.rows;
      _actualCropWidth = normalized.cols;

      if (template.autoAlign) {
        _computeShifts(normalized);
      } else {
        // Ensure no stale shifts from a previous run affect this scan
        _shifts.clear();
        debugPrint('AppOMREngine: autoAlign disabled, using template coordinates exactly');
      }

      final (responses, details, confidence, finalMarked) =
          _readResponses(normalized);

      // Encode the cropped (normalized) image for overlay display
      Uint8List? croppedBytes;
      if (normalized.cols > 0 && normalized.rows > 0) {
        croppedBytes = _encodePng(normalized);
      }

      annotatedBytes = finalMarked;
      normalized.dispose();

      return (
        AppOmrResult(
          responses: responses,
          confidence: confidence,
          warpSucceeded: warpOk,
          preprocessorUsed: preprocessor,
          details: details,
          annotatedImageBytes: annotatedBytes,
          annotatedWidth: pw,
          annotatedHeight: ph,
          croppedImageBytes: croppedBytes,
          croppedWidth: pw,
          croppedHeight: ph,
          alignmentShifts: List.from(_shifts),
        ),
        annotatedBytes,
      );
    } catch (e) {
      debugPrint('AppOMREngine Error: $e');
      return (_failResult('Error: $e'), null);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // IMAGE PREPROCESSING
  // ═══════════════════════════════════════════════════════════════════════

  cv.Mat _normalize(cv.Mat image) {
      final minMax = cv.minMaxLoc(image);
    if (minMax.$2 <= minMax.$1) {
      return cv.Mat.zeros(image.rows, image.cols, cv.MatType.CV_8UC1);
    }
    final lut = _buildNormalizeLUT(minMax.$1, minMax.$2);
    final lutMat = cv.Mat.fromList(256, 1, cv.MatType.CV_8UC1, lut);
    final result = cv.LUT(image, lutMat);
    lutMat.dispose();
    return result;
  }

  Uint8List _buildNormalizeLUT(double minVal, double maxVal) {
    final lut = Uint8List(256);
    for (int i = 0; i < 256; i++) {
      lut[i] = ((i - minVal) * 255.0 / (maxVal - minVal))
          .round()
          .clamp(0, 255);
    }
    return lut;
  }

  cv.Mat _applyLevels(cv.Mat img, Map<String, dynamic> options) {
    final inBlack = (options['inBlack'] as num?)?.toDouble() ?? 0.0;
    final inWhite = (options['inWhite'] as num?)?.toDouble() ?? 255.0;
    final outBlack = (options['outBlack'] as num?)?.toDouble() ?? 0.0;
    final outWhite = (options['outWhite'] as num?)?.toDouble() ?? 255.0;
    final gamma = (options['gamma'] as num?)?.toDouble() ?? 1.0;

    final lut = Uint8List(256);
    for (int i = 0; i < 256; i++) {
      final x = i.toDouble();
      final g = math.pow(x / 255.0, 1.0 / gamma) * 255.0;
      double y;
      if (inWhite == inBlack) {
        y = g;
      } else {
        y = (g - inBlack) / (inWhite - inBlack) * (outWhite - outBlack) + outBlack;
      }
      lut[i] = y.clamp(0.0, 255.0).round();
    }

    final lutMat = cv.Mat.fromList(256, 1, cv.MatType.CV_8UC1, lut);
    final result = cv.LUT(img, lutMat);
    lutMat.dispose();
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CORNER DETECTION
  // ═══════════════════════════════════════════════════════════════════════

  /// Find page corners - tries contour detection first, then Hough
  List<List<double>>? _findPageCornersSimple(cv.Mat image) {
    final contourCorners = _findPageCornersContour(image);
    if (contourCorners != null && contourCorners.length == 4) {
      debugPrint('AppOMREngine: Found corners via contour detection');
      return contourCorners;
    }
    debugPrint('AppOMREngine: Falling back to Hough detection');
    return _findPageCornersHough(image);
  }

  /// Find page corners using contour detection (same as OMRChecker)
  List<List<double>>? _findPageCornersContour(cv.Mat image) {
    try {
      debugPrint(
          'AppOMREngine _findPageCornersContour: starting with img size ${image.cols}x${image.rows}');

      final blurred = cv.gaussianBlur(image, (5, 5), 0);

      // Apply binary threshold
      final binary = cv.threshold(blurred, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
      final binaryImg = binary.$2;
      blurred.dispose();

      // Find contours
      final contourResult = cv.findContours(binaryImg, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
      final contours = contourResult.$1;
      binaryImg.dispose();

      if (contours.isEmpty) {
        debugPrint('AppOMREngine _findPageCornersContour: No contours found');
        return null;
      }

      debugPrint('AppOMREngine _findPageCornersContour: Found ${contours.length} contours');

      // Sort contours by area (largest first)
      final sortedIndices = List.generate(contours.length, (i) => i);
      sortedIndices.sort((a, b) {
        final areaA = cv.contourArea(contours[a]);
        final areaB = cv.contourArea(contours[b]);
        return areaB.compareTo(areaA);
      });

      // Find the largest quadrilateral
      for (int idx in sortedIndices.take(50)) {
        final contour = contours[idx];
        final area = cv.contourArea(contour);
        if (area < _minPageAreaThreshold) break;

        final peri = cv.arcLength(contour, true);
        final approx = cv.approxPolyDP(
            contour, _approxEpsilonFactor * peri, true);

        final pts = <List<double>>[];
        for (int i = 0; i < approx.length; i++) {
          final pt = approx[i];
          pts.add([pt.x.toDouble(), pt.y.toDouble()]);
        }
        approx.dispose();

        debugPrint(
            'AppOMREngine _findPageCornersContour: Checking contour, approx points: ${pts.length}, area: ${area.round()}');

        if (pts.length == 4) {
          final ordered = _orderCornersSimple(pts);
          final width = _distance(ordered[0], ordered[1]);
          final height = _distance(ordered[0], ordered[3]);
          final aspectRatio = width / (height + 1e-10);

          debugPrint(
              'AppOMREngine _findPageCornersContour: Rectangle w=${width.round()}, h=${height.round()}, ratio=${aspectRatio.toStringAsFixed(2)}');

          if (aspectRatio > _minAspectRatio &&
              aspectRatio < _maxAspectRatio) {
            contours.dispose();
            return ordered;
          }
        }
      }

      contours.dispose();
      debugPrint(
          'AppOMREngine _findPageCornersContour: No valid rectangle found');
      return null;
    } catch (e, st) {
      debugPrint('AppOMREngine _findPageCornersContour EXCEPTION: $e\n$st');
      return null;
    }
  }

  /// Find page corners using Hough Transform (fallback)
  List<List<double>>? _findPageCornersHough(cv.Mat image) {
    try {
      debugPrint('AppOMREngine _findPageCornersHough: starting with img size ${image.cols}x${image.rows}');

      final blurred = cv.gaussianBlur(image, (5, 5), 0);

      final binary = cv.adaptiveThreshold(
        blurred,
        255.0,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY_INV,
        11,
        2,
      );
      blurred.dispose();

      final edges = cv.canny(binary, _cannyLower.toDouble(), _cannyUpper.toDouble());

      final kernel = cv.getStructuringElement(cv.MORPH_RECT, (3, 3));
      final dilated = cv.dilate(edges, kernel, iterations: 2);
      edges.dispose();
      binary.dispose();
      kernel.dispose();

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
        debugPrint('AppOMREngine _findPageCornersHough: Not enough lines found (${lines.rows})');
        lines.dispose();
        return null;
      }

      debugPrint('AppOMREngine _findPageCornersHough: Found ${lines.rows} lines');

      final horizontal = <_Line>[];
      final vertical = <_Line>[];

      for (int i = 0; i < lines.rows; i++) {
        final x1 = lines.at<int>(i, 0);
        final y1 = lines.at<int>(i, 1);
        final x2 = lines.at<int>(i, 2);
        final y2 = lines.at<int>(i, 3);

        final angle = _calcAngle(x1, y1, x2, y2);
        final length = _calcLength(x1, y1, x2, y2);

        if (length < _minLineLength) continue;

        if (angle < 25 || angle > 155) {
          horizontal.add(_Line(
              x1: x1,
              y1: y1,
              x2: x2,
              y2: y2,
              angle: angle,
              length: length));
        } else if ((angle - 90).abs() < 25) {
          vertical.add(_Line(
              x1: x1,
              y1: y1,
              x2: x2,
              y2: y2,
              angle: angle,
              length: length));
        }
      }
      lines.dispose();

      debugPrint('AppOMREngine _findPageCornersHough: Horizontal lines: ${horizontal.length}, Vertical lines: ${vertical.length}');

      if (horizontal.length < 2 || vertical.length < 2) {
        debugPrint('AppOMREngine _findPageCornersHough: Not enough horizontal/vertical lines');
        return null;
      }

      horizontal.sort((a, b) => b.length.compareTo(a.length));
      vertical.sort((a, b) => b.length.compareTo(a.length));

      final topH = horizontal.take(3).toList();
      final topV = vertical.take(3).toList();

      final intersections = <List<double>>[];
      for (final hLine in topH) {
        for (final vLine in topV) {
          final pt = _lineIntersection(hLine, vLine);
          if (pt != null) {
            if (pt[0] > 10 &&
                pt[0] < image.cols - 10 &&
                pt[1] > 10 &&
                pt[1] < image.rows - 10) {
              intersections.add(pt);
            }
          }
        }
      }

      debugPrint('AppOMREngine _findPageCornersHough: Found ${intersections.length} intersection points');

      if (intersections.length < 4) {
        debugPrint('AppOMREngine _findPageCornersHough: Not enough intersections');
        return null;
      }

      final selected = _selectBestCorners(intersections, image.cols, image.rows);
      if (selected.length >= 4) {
        final ordered = _orderCornersSimple(selected.take(4).toList());
        debugPrint('AppOMREngine _findPageCornersHough: Found via Hough');
        return ordered;
      }

      return null;
    } catch (e, st) {
      debugPrint('AppOMREngine _findPageCornersHough EXCEPTION: $e\n$st');
      return null;
    }
  }

  double _calcAngle(int x1, y1, x2, y2) {
    var angle =
        math.atan2((y2 - y1).toDouble(), (x2 - x1).toDouble()) *
            180 /
            math.pi;
    if (angle < 0) angle += 180;
    return angle;
  }

  double _calcLength(int x1, y1, x2, y2) {
    final dx = x2 - x1;
    final dy = y2 - y1;
    return math.sqrt(dx * dx + dy * dy);
  }

  List<double>? _lineIntersection(_Line l1, _Line l2) {
    final x1 = l1.x1.toDouble(),
        y1 = l1.y1.toDouble(),
        x2 = l1.x2.toDouble(),
        y2 = l1.y2.toDouble(),
        x3 = l2.x1.toDouble(),
        y3 = l2.y1.toDouble(),
        x4 = l2.x2.toDouble(),
        y4 = l2.y2.toDouble();

    final denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom.abs() < 1e-10) return null;

    final t =
        ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    final u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
    }
    return null;
  }

  List<List<double>> _selectBestCorners(
      List<List<double>> corners, int imgW, int imgH) {
    if (corners.length < 4) {
      debugPrint(
          'AppOMREngine _selectBestCorners: only ${corners.length} corners, returning as-is');
      return corners;
    }

    final unique = <List<double>>[];
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

    debugPrint(
        'AppOMREngine _selectBestCorners: ${corners.length} corners -> ${unique.length} unique (dedup dist=50)');

    if (unique.length < 4) {
      debugPrint(
          'AppOMREngine _selectBestCorners: only ${unique.length} unique corners, using first 4');
      return corners.take(4).toList();
    }

    List<double>? tl, tr, bl, br;
    double minSum = double.infinity,
        maxSum = -double.infinity,
        minDiff = double.infinity,
        maxDiff = -double.infinity;

    for (final c in unique) {
      final sum = c[0] + c[1];
      final diff = c[0] - c[1];
      if (sum < minSum) {
        minSum = sum;
        tl = c;
      }
      if (sum > maxSum) {
        maxSum = sum;
        br = c;
      }
      if (diff < minDiff) {
        minDiff = diff;
        tr = c;
      }
      if (diff > maxDiff) {
        maxDiff = diff;
        bl = c;
      }
    }

    debugPrint(
        'AppOMREngine _selectBestCorners: sum/diff classification: '
        'tl=(${tl![0].round()},${tl[1].round()}), '
        'tr=(${tr![0].round()},${tr[1].round()}), '
        'bl=(${bl![0].round()},${bl[1].round()}), '
        'br=(${br![0].round()},${br[1].round()})');

    if (_distance(tl, tr) > 100 &&
        _distance(bl, br) > 100 &&
        _distance(tl, bl) > 100 &&
        _distance(tr, br) > 100) {
      debugPrint(
          'AppOMREngine _selectBestCorners: VALID 4 corners selected via sum/diff');
      return [tl, tr, br, bl];
    }
    debugPrint(
        'AppOMREngine _selectBestCorners: sum/diff failed distance checks, trying quadrant');

    return _selectByQuadrant(unique, imgW, imgH);
  }

  List<List<double>> _selectByQuadrant(
      List<List<double>> corners, int imgW, int imgH) {
    debugPrint(
        'AppOMREngine _selectByQuadrant: input=${corners.length} corners, imgW=$imgW imgH=$imgH');
    final centers = [
      [imgW * 0.25, imgH * 0.25],
      [imgW * 0.75, imgH * 0.25],
      [imgW * 0.75, imgH * 0.75],
      [imgW * 0.25, imgH * 0.75],
    ];

    final selected = <List<double>>[];
    final used = <int>[];

    for (final center in centers) {
      double minDist = double.infinity;
      int bestIdx = -1;
      for (int i = 0; i < corners.length; i++) {
        if (used.contains(i)) continue;
        final d = _distance2D(corners[i], center);
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

    debugPrint(
        'AppOMREngine _selectByQuadrant: selected=${selected.length} corners');
    if (selected.length == 4) {
      debugPrint(
          'AppOMREngine _selectByQuadrant: selected corners: '
          '${selected.map((p) => '(${p[0].round()},${p[1].round()})').toList()}');
    }
    return selected;
  }

  List<List<double>> _orderCornersSimple(List<List<double>> pts) {
    if (pts.length != 4) {
      debugPrint(
          'AppOMREngine _orderCornersSimple: WARNING pts.length=${pts.length} != 4');
      return pts;
    }

    debugPrint(
        'AppOMREngine _orderCornersSimple: input pts=${pts.map((p) => '(${p[0].round()},${p[1].round()})').toList()}');

    double sumY = 0;
    for (final p in pts) {
      sumY += p[1];
    }
    final cy = sumY / 4;

    final top = <List<double>>[], bottom = <List<double>>[];
    for (final p in pts) {
      if (p[1] < cy) {
        top.add(p);
      } else {
        bottom.add(p);
      }
    }

    top.sort((a, b) => a[0].compareTo(b[0]));
    bottom.sort((a, b) => a[0].compareTo(b[0]));

    if (top.length >= 2 && bottom.length >= 2) {
      return [top[0], top[1], bottom[1], bottom[0]];
    }

    // Fallback by sum/diff
    List<double> t = pts[0], br = pts[0], trP = pts[0], bl = pts[0];
    double minSum = double.infinity,
        maxSum = -double.infinity,
        minDiff = double.infinity,
        maxDiff = -double.infinity;

    for (final c in pts) {
      final sum = c[0] + c[1];
      final diff = c[0] - c[1];
      if (sum < minSum) {
        minSum = sum;
        t = c;
      }
      if (sum > maxSum) {
        maxSum = sum;
        br = c;
      }
      if (diff < minDiff) {
        minDiff = diff;
        trP = c;
      }
      if (diff > maxDiff) {
        maxDiff = diff;
        bl = c;
      }
    }
    return [t, trP, br, bl];
  }

  double _distance(List<double> p1, List<double> p2) {
    final dx = p1[0] - p2[0];
    final dy = p1[1] - p2[1];
    return math.sqrt(dx * dx + dy * dy);
  }

  double _distance2D(List<double> p, List<double> center) {
    final dx = p[0] - center[0];
    final dy = p[1] - center[1];
    return math.sqrt(dx * dx + dy * dy);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FOUR POINT TRANSFORM
  // ═══════════════════════════════════════════════════════════════════════

  cv.Mat? _fourPointTransform(cv.Mat image, List<List<double>> pts) {
    if (pts.length != 4) return null;

    // Clamp coordinates to image bounds to prevent crash on degenerate transforms
    final w = image.cols.toDouble();
    final h = image.rows.toDouble();
    final tl = [pts[0][0].clamp(0.0, w - 1), pts[0][1].clamp(0.0, h - 1)];
    final tr = [pts[1][0].clamp(0.0, w - 1), pts[1][1].clamp(0.0, h - 1)];
    final br = [pts[2][0].clamp(0.0, w - 1), pts[2][1].clamp(0.0, h - 1)];
    final bl = [pts[3][0].clamp(0.0, w - 1), pts[3][1].clamp(0.0, h - 1)];

    final wBottom = math.sqrt(
        math.pow(br[0] - bl[0], 2) + math.pow(br[1] - bl[1], 2));
    final wTop = math.sqrt(
        math.pow(tr[0] - tl[0], 2) + math.pow(tr[1] - tl[1], 2));
    final maxWidth = math.max(wBottom, wTop).round();

    final hRight = math.sqrt(
        math.pow(tr[0] - br[0], 2) + math.pow(tr[1] - br[1], 2));
    final hLeft = math.sqrt(
        math.pow(tl[0] - bl[0], 2) + math.pow(tl[1] - bl[1], 2));
    final maxHeight = math.max(hRight, hLeft).round();

    final srcPoints = [
      cv.Point(tl[0].round(), tl[1].round()),
      cv.Point(tr[0].round(), tr[1].round()),
      cv.Point(br[0].round(), br[1].round()),
      cv.Point(bl[0].round(), bl[1].round()),
    ];

    final dstPoints = [
      cv.Point(0, 0),
      cv.Point(maxWidth - 1, 0),
      cv.Point(maxWidth - 1, maxHeight - 1),
      cv.Point(0, maxHeight - 1),
    ];

    final srcVec = cv.VecPoint.fromList(srcPoints);
    final dstVec = cv.VecPoint.fromList(dstPoints);
    final matrix = cv.getPerspectiveTransform(srcVec, dstVec);
    srcVec.dispose();
    dstVec.dispose();

    // Guard against degenerate output dimensions that can crash warpPerspective
    if (maxWidth <= 0 || maxHeight <= 0) {
      debugPrint('AppOMREngine _fourPointTransform: degenerate output dims $maxWidth x $maxHeight');
      return null;
    }

    final warped = cv.warpPerspective(image, matrix, (maxWidth, maxHeight));
    matrix.dispose();

    debugPrint('AppOMREngine _fourPointTransform: input=${image.cols}x${image.rows}, output=${warped.cols}x${warped.rows}');

    return warped;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CROP ON MARKERS
  // ═══════════════════════════════════════════════════════════════════════

  List<List<double>>? _findMarkerCorners(cv.Mat img, cv.Mat marker) {
    final h = img.rows;
    final w = img.cols;

    final erodeKernel = cv.getStructuringElement(cv.MORPH_RECT, (5, 5));
    final eroded = cv.erode(img, erodeKernel, iterations: 5);
    final erodedSub = cv.subtract(img, eroded);
    eroded.dispose();

    final (bestScale, allMaxT) = _getBestMarkerScale(erodedSub, marker);
    if (bestScale == null || allMaxT < 0.3) {
      erodedSub.dispose();
      return null;
    }

    final markerH = marker.rows;
    final scaledMarker = _resizeHeight(marker, (markerH * bestScale).round());

    final midH = h ~/ 3;
    final midW = w ~/ 2;

    final centres = <List<double>>[];
    for (int k = 0; k < 4; k++) {
      final x1 = k == 0 || k == 2 ? 0 : midW;
      final x2 = k == 0 || k == 2 ? midW : w;
      final y1 = k < 2 ? 0 : midH;
      final y2 = k < 2 ? midH : h;

      final quad =
          cv.Mat.fromRange(img, y1, y2, colStart: x1, colEnd: x2);
      final res = cv.matchTemplate(quad, scaledMarker, cv.TM_CCOEFF_NORMED);
      final minMax = cv.minMaxLoc(res);
      final maxVal = minMax.$2;
      final maxLoc = minMax.$4;

      res.dispose();
      quad.dispose();

      if (maxVal < 0.3) {
        erodedSub.dispose();
        return null;
      }

      final x = maxLoc.x + (k == 0 || k == 2 ? 0.0 : midW.toDouble()) + scaledMarker.cols / 2;
      final y = maxLoc.y + (k < 2 ? 0.0 : midH.toDouble()) + scaledMarker.rows / 2;
      centres.add([x, y]);
    }

    scaledMarker.dispose();
    erodedSub.dispose();

    return centres.length == 4 ? centres : null;
  }

  (double?, double) _getBestMarkerScale(cv.Mat img, cv.Mat marker) {
    double? bestScale;
    double bestMatch = 0;
    final markerH = marker.rows;

    for (int r = 100; r >= 35; r -= 7) {
      final scale = r / 100.0;
      if (scale == 0) continue;

      final scaled = _resizeHeight(marker, (markerH * scale).round());
      final res = cv.matchTemplate(img, scaled, cv.TM_CCOEFF_NORMED);
      final minMax = cv.minMaxLoc(res);
      final maxVal = minMax.$2;

      res.dispose();
      scaled.dispose();

      if (maxVal > bestMatch) {
        bestMatch = maxVal;
        bestScale = scale;
      }
    }

    return (bestScale, bestMatch);
  }

  cv.Mat _resizeHeight(cv.Mat img, int height) {
    final ratio = height / img.rows;
    final width = (img.cols * ratio).round();
    return cv.resize(img, (width, height));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // AUTO-ALIGNMENT
  // ═══════════════════════════════════════════════════════════════════════

  void _computeShifts(cv.Mat img) {
    _shifts.clear();

    final clahe = cv.createCLAHE(clipLimit: 2.0, tileGridSize: (8, 8));
    final claheImg = clahe.apply(img);

    final gammaImg = _adjustGamma(claheImg, 0.5);
    claheImg.dispose();

    final (thrVal, thrImg) = cv.threshold(gammaImg, 220, 255, cv.THRESH_TRUNC);
    gammaImg.dispose();

    final norm = _normalize(thrImg);
    thrImg.dispose();

    final vKernel = cv.getStructuringElement(cv.MORPH_RECT, (2, 10));
    final morphV = cv.morphologyEx(norm, cv.MORPH_OPEN, vKernel);
    norm.dispose();

    final (thrVVal, thrVImg) = cv.threshold(morphV, 200, 255, cv.THRESH_TRUNC);
    morphV.dispose();

    final whiteMat =
        cv.Mat.zeros(thrVImg.rows, thrVImg.cols, cv.MatType.CV_8UC1);
    final invV = cv.subtract(whiteMat, thrVImg);
    whiteMat.dispose();
    thrVImg.dispose();

    final normalizedV = _normalize(invV);
    invV.dispose();

    final (binVal, binaryImg) =
        cv.threshold(normalizedV, _alignMorphThresh.toDouble(), 255, cv.THRESH_BINARY);
    normalizedV.dispose();

    final kernelOnes = cv.Mat.ones(5, 5, cv.MatType.CV_8UC1);
    final eroded = cv.erode(binaryImg, kernelOnes, iterations: 2);
    binaryImg.dispose();
    kernelOnes.dispose();

    for (int i = 0; i < template.fieldBlocks.length; i++) {
      final block = template.fieldBlocks[i];
      // originY is TOP-LEFT of first bubble - no offset needed
      final cvOriginY = _actualCropHeight - block.originY;
      final shift = _findShift(eroded, block.originX, cvOriginY, 200, 150);
      _shifts.add(shift);
    }

    eroded.dispose();
  }

  int _findShift(cv.Mat morphV, int sx, int sy, int width, int height) {
    if (sx < 0 ||
        sy < 0 ||
        sx + width > morphV.cols ||
        sy + height > morphV.rows) {
      return 0;
    }

    int shift = 0;
    int steps = 0;
    const maxSteps = 20;
    const stride = 1;
    const matchCol = 4;
    const thickness = 3;

    while (steps < maxSteps) {
      final leftX1 = (sx + shift - thickness).clamp(0, morphV.cols);
      final leftX2 =
          (sx + shift - thickness + matchCol).clamp(0, morphV.cols);
      final rightX1 =
          (sx + shift + width - matchCol).clamp(0, morphV.cols);
      final rightX2 =
          (sx + shift + width + thickness).clamp(0, morphV.cols);

      final leftRoi = cv.Mat.fromRange(morphV, sy, sy + height,
          colStart: leftX1, colEnd: leftX2);
      final rightRoi = cv.Mat.fromRange(morphV, sy, sy + height,
          colStart: rightX1, colEnd: rightX2);

      final leftMean = cv.mean(leftRoi).val1;
      final rightMean = cv.mean(rightRoi).val1;
      leftRoi.dispose();
      rightRoi.dispose();

      final leftDark = leftMean > 100;
      final rightDark = rightMean > 100;

      if (leftDark) {
        if (rightDark) break;
        shift -= stride;
      } else {
        if (rightDark) {
          shift += stride;
        } else {
          break;
        }
      }
      steps++;
    }
    return shift;
  }

  cv.Mat _adjustGamma(cv.Mat img, double gamma) {
    if (gamma <= 0) gamma = 0.01;
    final invGamma = 1 / gamma;
    final table =
        Uint8List.fromList(List.generate(256, (i) {
      final v = math.pow(i / 255.0, invGamma) * 255;
      return v.round().clamp(0, 255);
    }));
    final lut = cv.Mat.fromList(256, 1, cv.MatType.CV_8UC1, table);
    final result = cv.LUT(img, lut);
    lut.dispose();
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // READ OMR RESPONSES
  // ═══════════════════════════════════════════════════════════════════════

  /// Reads bubble responses from the image and returns results with annotated image.
  /// 
  /// Coordinate priority:
  /// 1. If block.exactCoords is available, use those exact coordinates
  /// 2. Otherwise, compute from originX/Y + gaps (direction-based formula)
  (Map<String, String>, List<AppBubbleResult>, double, Uint8List?) _readResponses(
      cv.Mat img) {
    final responses = <String, String>{};
    final details = <AppBubbleResult>[];

    final displayImg = cv.cvtColor(img, cv.COLOR_GRAY2BGR);
    final transpLayer = displayImg.clone();
    final finalMarked = displayImg.clone();

    // Two-pass approach: first collect all intensities, compute threshold, then detect marked bubbles
    final allIntensities = <_FieldIntensity>{};

    for (int b = 0; b < template.fieldBlocks.length; b++) {
      final block = template.fieldBlocks[b];
      final shift = _shifts.length > b ? _shifts[b] : 0;
      final isHorizontal = block.direction == 'horizontal';
      final hasExactCoords = block.exactCoords != null && block.exactCoords!.isNotEmpty;

      // Get coords lookup map if exact coords are available
      final Map<String, Map<String, AppBubbleCoord>> coordsLookup =
          hasExactCoords ? block.coordsByLabelAndValue : {};

      // Use block-level bubble sizes
      final blockBoxW = block.bubbleWidth;
      final blockBoxH = block.bubbleHeight;

      // Convert template originY to OpenCV top-left corner for ROI
      // originY from template is TOP-LEFT of first bubble (not CENTER), so:
      // cvOriginY = cropHeight - pdfTopLeftY
      final cvOriginY = _actualCropHeight - block.originY;

      debugPrint('=== AppOMREngine _readResponses ===');
      debugPrint('Block: ${block.name}, origin=(${block.originX},${block.originY}), isHorizontal=$isHorizontal, hasExactCoords=$hasExactCoords');
      debugPrint('cropH=$_actualCropHeight (template.pageHeight=$template.pageHeight), box=${blockBoxW}x${blockBoxH}');
      debugPrint('fieldLabels=${block.fieldLabels.toList()}, bubbleValues=${block.bubbleValues.toList()}');

      for (int fi = 0; fi < block.fieldLabels.length; fi++) {
        final fieldLabel = block.fieldLabels[fi];

        // Compute base coordinates (used if no exact coords)
        final xBase = isHorizontal
            ? block.originX + shift
            : block.originX + fi * block.labelsGap.round();
        final yBase = isHorizontal
            ? cvOriginY + fi * block.labelsGap.round()
            : cvOriginY;

        debugPrint('FIELD[fi=$fi]: label=$fieldLabel, xBase=$xBase, yBase=$yBase');

        final fieldVals = <double>[];

        // Process each bubble option (A, B, C, D or 0-9 for student ID)
        for (int vi = 0; vi < block.bubbleValues.length; vi++) {
          final bubbleValue = block.bubbleValues[vi];
          int bx, by, bw, bh;

          if (hasExactCoords && coordsLookup.containsKey(fieldLabel) &&
              coordsLookup[fieldLabel]!.containsKey(bubbleValue)) {
            // Use exact coordinates from templateJson
            // exact.y is TOP in PDF coords, OpenCV also uses TOP as y=0
            final exact = coordsLookup[fieldLabel]![bubbleValue]!;
            bx = exact.x;
            by = _actualCropHeight - exact.y;
            bw = exact.w;
            bh = exact.h;
            debugPrint('  EXACT: $bubbleValue at ($bx, $by) size=${bw}x${bh}');
          } else {
            // Compute from origin + gaps
            if (isHorizontal) {
              bx = xBase + vi * block.bubblesGap.round();
              by = yBase;
            } else {
              bx = xBase;
              by = yBase + vi * block.bubblesGap.round();
            }
            bw = blockBoxW;
            bh = blockBoxH;
          }

          final bx1 = bx.clamp(0, img.cols - 1);
          final bx2 = (bx + bw).clamp(0, img.cols);
          final by1 = by.clamp(0, img.rows - 1);
          final by2 = (by + bh).clamp(0, img.rows);

          // Read ROI from CENTER of bubble (matching overlay which draws circle at center)
          // Overlay draws circle with radius = w/2 at center (x + w/2, y + h/2)
          // We read the same center area for consistent detection
          final centerX = bx + bw ~/ 2;
          final centerY = by + bh ~/ 2;
          final readRadius = (bw < bh ? bw : bh) ~/ 2; // Read circular area
          final readBx1 = (centerX - readRadius).clamp(0, img.cols - 1);
          final readBx2 = (centerX + readRadius).clamp(0, img.cols);
          final readBy1 = (centerY - readRadius).clamp(0, img.rows - 1);
          final readBy2 = (centerY + readRadius).clamp(0, img.rows);

          // Log detailed ROI info for first field, first bubble
          if (fi == 0 && vi == 0) {
            final pdfY = _actualCropHeight - by1;
            debugPrint('ROI DEBUG: block=${block.name}, field=$fieldLabel, opt=$bubbleValue');
            debugPrint('  fullROI=[$bx1,$by1,$bx2,$by2], size=${bx2-bx1}x${by2-by1}');
            debugPrint('  centerROI=[$readBx1,$readBy1,$readBx2,$readBy2], radius=$readRadius');
            debugPrint('  pdfY_top=$pdfY, pdfY_center=${pdfY + bh ~/ 2}');
          }

          final roi = cv.Mat.fromRange(img, readBy1, readBy2, colStart: readBx1, colEnd: readBx2);
          final mean = cv.mean(roi).val1;
          roi.dispose();

          allIntensities.add(_FieldIntensity(
            fieldIdx: fi,
            bubbleIdx: vi,
            mean: mean,
          ));
          fieldVals.add(mean);
        }

        // Detect marked bubbles for this question using per-field local threshold
        // Use hardcoded threshold=180 for now (was detecting BLANK for dark filled bubbles)
        final fieldThr = 180.0;
        final detectedBubbles = <int>[];
        for (int vi = 0; vi < fieldVals.length; vi++) {
          if (fieldVals[vi] < fieldThr) {
            detectedBubbles.add(vi);
          }
        }
        debugPrint('FIELD: $fieldLabel = ${fieldVals.map((v) => v.round()).toList()}, thr=$fieldThr, result=${detectedBubbles.isEmpty ? "BLANK" : block.bubbleValues[detectedBubbles.first]}');
        
        String marked = '';
        bool multiMarked = false;
        double markedIntensity = 255;

        if (detectedBubbles.isNotEmpty) {
          if (detectedBubbles.length == 1) {
            marked = block.bubbleValues[detectedBubbles.first];
            markedIntensity = fieldVals[detectedBubbles.first];
          } else {
            multiMarked = true;
            // For multi-marked, keep the darkest (lowest mean) bubble
            int darkestIdx = detectedBubbles.first;
            double darkestVal = fieldVals[darkestIdx];
            for (int i = 1; i < detectedBubbles.length; i++) {
              if (fieldVals[detectedBubbles[i]] < darkestVal) {
                darkestVal = fieldVals[detectedBubbles[i]];
                darkestIdx = detectedBubbles[i];
              }
            }
            marked = block.bubbleValues[darkestIdx];
            markedIntensity = darkestVal;
          }
        }

        // Draw bubble annotations on the annotated image
        // Calculate all bubble positions first (for annotation)
        final List<(int, int, int, int)> bubbleRects = [];
        for (int vi = 0; vi < block.bubbleValues.length; vi++) {
          final bubbleValue = block.bubbleValues[vi];
          int bx, by, bw, bh;

          if (hasExactCoords && coordsLookup.containsKey(fieldLabel) &&
              coordsLookup[fieldLabel]!.containsKey(bubbleValue)) {
            final exact = coordsLookup[fieldLabel]![bubbleValue]!;
            bx = exact.x;
            by = _actualCropHeight - exact.y;
            bw = exact.w;
            bh = exact.h;
          } else {
            if (isHorizontal) {
              bx = xBase + vi * block.bubblesGap.round();
              by = yBase;
            } else {
              bx = xBase;
              by = yBase + vi * block.bubblesGap.round();
            }
            bw = blockBoxW;
            bh = blockBoxH;
          }
          bubbleRects.add((bx, by, bw, bh));
        }

        // Draw each bubble
        for (int vi = 0; vi < bubbleRects.length; vi++) {
          final (bx, by, bw, bh) = bubbleRects[vi];

          if (detectedBubbles.contains(vi)) {
            final innerMargin = bw ~/ _rectInnerMarginNum;
            cv.rectangle(
              finalMarked,
              cv.Rect(bx + innerMargin, by + innerMargin, bw - innerMargin * 2, bh - innerMargin * 2),
              cv.Scalar(50, 50, 50),
              thickness: 3,
            );
            _putText(finalMarked, block.bubbleValues[vi],
                (bx, by + bh ~/ 3),
                fontScale: 0.4,
                color: cv.Scalar(10, 10, 20),
                thickness: 1);
          } else {
            final outerMargin = bw ~/ _rectOuterMarginNum;
            cv.rectangle(
              finalMarked,
              cv.Rect(bx + outerMargin, by + outerMargin, bw - outerMargin * 2, bh - outerMargin * 2),
              cv.Scalar(128, 128, 128),
              thickness: -1,
            );
          }
        }

        if (detectedBubbles.isEmpty) {
          marked = block.emptyValue;
          markedIntensity = 255;
        }

        // fieldLabel already declared above
        if (multiMarked) {
          final combined = StringBuffer();
          for (final idx in detectedBubbles) {
            combined.write(block.bubbleValues[idx]);
          }
          responses[fieldLabel] = combined.toString();
        } else {
          responses[fieldLabel] = marked;
        }

        details.add(AppBubbleResult(
          label: fieldLabel,
          markedValue: marked,
          isMultiMarked: multiMarked,
          intensity: markedIntensity,
          allIntensities: fieldVals,
        ));
      }
    }

    final blended = cv.addWeighted(finalMarked, 0.65, transpLayer, 0.35, 0);

    Uint8List? annotatedBytes;
    if (blended.cols > 0 && blended.rows > 0) {
      annotatedBytes = _encodePng(blended);
    }

    displayImg.dispose();
    transpLayer.dispose();
    finalMarked.dispose();
    blended.dispose();

    final confidence = _computeConfidence(details);
    return (responses, details, confidence, annotatedBytes);
  }

  void _putText(
    cv.Mat img,
    String text,
    (int, int) org, {
    double fontScale = 1.0,
    cv.Scalar? color,
    int thickness = 1,
  }) {
    final baseline = (fontScale * 10).round();
    final textWidth = (text.length * fontScale * 8).round();
    final textHeight = baseline;

    if (org.$2 - textHeight - 2 >= 0 && org.$1 - 2 >= 0) {
      final bgRect = cv.Rect(
          org.$1 - 2, org.$2 - textHeight - 2, textWidth + 4, textHeight + 4);
      cv.rectangle(img, bgRect, cv.Scalar(255, 255, 255),
          thickness: -1);
    }

    cv.putText(
      img,
      text,
      cv.Point(org.$1, org.$2),
      cv.FONT_HERSHEY_SIMPLEX,
      fontScale,
      color ?? cv.Scalar(0, 0, 0),
      thickness: thickness,
    );
  }

  double _computeConfidence(List<AppBubbleResult> details) {
    if (details.isEmpty) return 0;
    int correctCount = 0;
    for (final d in details) {
      if (!d.isMultiMarked && d.markedValue.isNotEmpty) {
        correctCount++;
      }
    }
    return correctCount / details.length;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════

  cv.Mat _resize(cv.Mat img, int width, int height) {
    return cv.resize(img, (width, height));
  }

  Uint8List? _encodePng(cv.Mat img) {
    try {
      final (ok, bytes) = cv.imencode(
          '.png', img,
          params: cv.VecI32.fromList([]));
      return ok ? bytes : null;
    } catch (e) {
      debugPrint('Encode error: $e');
      return null;
    }
  }

  void _drawAnnotationsScaled(
      cv.Mat img, double scaleX, double scaleY, List<AppBubbleResult> details) {
    for (int b = 0; b < template.fieldBlocks.length; b++) {
      final block = template.fieldBlocks[b];
      final shift = _shifts.length > b ? _shifts[b] : 0;

      // originY is TOP-LEFT of first bubble
      final cvOriginY = _actualCropHeight - block.originY;

      for (int row = 0; row < block.fieldLabels.length; row++) {
        final label = block.fieldLabels[row];
        final by = ((cvOriginY + row * block.labelsGap.round()) * scaleY).round();

        final labelDetail = details.firstWhere(
          (d) => d.label == label,
          orElse: () => const AppBubbleResult(
            label: '',
            markedValue: '',
            isMultiMarked: false,
            intensity: 255,
          ),
        );

        for (int col = 0; col < block.bubbleValues.length; col++) {
          final bx =
              ((block.originX + shift + col * block.bubblesGap.round()) * scaleX)
                  .round();
          final bubbleW = (block.bubbleWidth * scaleX).round();
          final bubbleH = (block.bubbleHeight * scaleY).round();
          final bubbleCenterX = bx + bubbleW ~/ 2;
          final bubbleCenterY = by + bubbleH ~/ 2;

          final isThisBubbleMarked =
              labelDetail.markedValue == block.bubbleValues[col];
          final isMultiMarked = labelDetail.isMultiMarked;
          final rect = cv.Rect(bx, by, bubbleW, bubbleH);

          if (isMultiMarked) {
            cv.rectangle(img, rect, cv.Scalar(0, 0, 255), thickness: 2);
            cv.circle(img, cv.Point(bubbleCenterX, bubbleCenterY),
                bubbleW ~/ 4, cv.Scalar(0, 0, 255),
                thickness: -1);
          } else if (isThisBubbleMarked &&
              labelDetail.markedValue.isNotEmpty) {
            cv.rectangle(img, rect, cv.Scalar(0, 255, 0), thickness: 2);
            cv.circle(img, cv.Point(bubbleCenterX, bubbleCenterY),
                bubbleW ~/ 4, cv.Scalar(0, 255, 0),
                thickness: -1);
          } else {
            cv.rectangle(img, rect, cv.Scalar(255, 0, 0), thickness: 1);
          }
        }
      }
    }
  }

  AppOmrResult _failResult(String msg) => const AppOmrResult(
        responses: {},
        confidence: 0,
        warpSucceeded: false,
        preprocessorUsed: 'Error',
        details: [],
      );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

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

class _FieldIntensity {
  final int fieldIdx;
  final int bubbleIdx;
  final double mean;

  const _FieldIntensity({
    required this.fieldIdx,
    required this.bubbleIdx,
    required this.mean,
  });

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is _FieldIntensity &&
        other.fieldIdx == fieldIdx &&
        other.bubbleIdx == bubbleIdx &&
        other.mean == mean;
  }

  @override
  int get hashCode => Object.hash(fieldIdx, bubbleIdx, mean);
}

/// Per-field threshold used to detect marked bubbles within a single
/// question row. Currently delegates to the same jump-based heuristic as
/// the global threshold; exposed under this name to match the call sites
/// in [_readResponses].
double _computeThreshold(List<double> vals) => _computeGlobalThreshold(vals);
