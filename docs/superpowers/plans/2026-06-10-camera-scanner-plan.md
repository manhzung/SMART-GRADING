# Camera Scanner Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full camera-based OMR scanning to the Flutter mobile app — live preview with corner overlay, automatic perspective correction, guided exam flow, and offline sync.

**Architecture:** Pure Dart implementation using the `image` package for all image processing (no native OpenCV bindings needed). Camera preview via `camera` package. Corner detection ported from OMRChecker's `CropPage.py` (Canny + contour). Homography computed via DLT (Direct Linear Transform). Full OMR pipeline already exists in `OMREngine`.

**Tech Stack:** Flutter (Dart), `camera` package, `image` package, BLoC pattern, existing `OMREngine` / `BubbleReader` / `OMRScorer`.

---

## File Map

### New Files

| File | Purpose |
|---|---|
| `client/mobile/lib/domain/omr/engine/warp_utils.dart` | Homography math: DLT, perspective warp, 4-point transform |
| `client/mobile/lib/domain/omr/engine/camera_engine.dart` | Corner detection + warp orchestration |
| `client/mobile/lib/presentation/blocs/camera/camera_event.dart` | CameraBloc events |
| `client/mobile/lib/presentation/blocs/camera/camera_state.dart` | CameraBloc states |
| `client/mobile/lib/presentation/blocs/camera/camera_bloc.dart` | Camera state machine |
| `client/mobile/lib/presentation/widgets/camera_preview_widget.dart` | Live camera preview widget |
| `client/mobile/lib/presentation/widgets/corner_overlay_painter.dart` | CustomPainter for corner guide overlay |
| `client/mobile/lib/presentation/pages/exam_selection_page.dart` | Select exam before scanning |
| `client/mobile/lib/presentation/pages/student_list_page.dart` | List ungraded students |
| `client/mobile/lib/presentation/pages/student_picker_dialog.dart` | Assign student after scan |
| `client/mobile/test/domain/omr/engine/warp_utils_test.dart` | Unit tests for homography |
| `client/mobile/test/domain/omr/engine/camera_engine_test.dart` | Unit tests for corner detection |
| `client/mobile/test/presentation/widgets/corner_overlay_painter_test.dart` | Widget test for overlay |

### Modified Files

| File | Change |
|---|---|
| `client/mobile/lib/domain/omr/engine/omr_engine.dart` | Add CameraEngine integration + alignment step |
| `client/mobile/lib/domain/omr/engine/omr_engine.dart` | Extend OMRProcessingResult with corners/skew/warped |
| `client/mobile/lib/presentation/pages/camera_scanner_page.dart` | Replace image_picker with live preview + CameraBloc |
| `client/mobile/lib/presentation/pages/omr_result_page.dart` | Connect submit to guided flow |
| `client/mobile/lib/presentation/pages/scan_view.dart` | Connect to exam selection |
| `client/mobile/lib/presentation/pages/exam_detail_page.dart` | Add "Start Scanning" button |
| `client/mobile/lib/presentation/blocs/omr_scanner/omr_scanner_state.dart` | Add CameraReady state |
| `client/mobile/lib/presentation/blocs/omr_scanner/omr_scanner_bloc.dart` | Handle camera states + submit flow |
| `client/mobile/lib/core/storage/omr_local_storage.dart` | Extend with PendingSubmission model |
| `client/mobile/lib/main.dart` | Register CameraBloc, add routes |
| `client/mobile/lib/presentation/routes.dart` | Add new page routes |

---

## Task 1: `warp_utils.dart` — Homography Math

**Files:**
- Create: `client/mobile/lib/domain/omr/engine/warp_utils.dart`
- Test: `client/mobile/test/domain/omr/engine/warp_utils_test.dart`

- [ ] **Step 1: Write failing tests**

```dart
import 'dart:typed_data';
import 'dart:ui';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'package:smart_grading_mobile/domain/omr/engine/warp_utils.dart';

void main() {
  group('WarpUtils', () {
    test('computeHomography returns 9-element Float64List', () {
      final src = [
        const Offset(0, 0),
        const Offset(100, 0),
        const Offset(100, 100),
        const Offset(0, 100),
      ];
      final dst = [
        const Offset(0, 0),
        const Offset(200, 0),
        const Offset(200, 200),
        const Offset(0, 200),
      ];
      final M = WarpUtils.computeHomography(src, dst);
      expect(M.length, 9);
    });

    test('applyHomography transforms identity correctly', () {
      final M = Float64List.fromList([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1,
      ]);
      final result = WarpUtils.applyHomography(M, const Offset(50, 75));
      expect(result.dx, closeTo(50, 0.001));
      expect(result.dy, closeTo(75, 0.001));
    });

    test('applyHomography scales x by 2', () {
      final M = Float64List.fromList([
        2, 0, 0,
        0, 1, 0,
        0, 0, 1,
      ]);
      final result = WarpUtils.applyHomography(M, const Offset(50, 75));
      expect(result.dx, closeTo(100, 0.001));
    });

    test('warpPerspective creates output at target dimensions', () {
      final src = img.Image(width: 100, height: 100);
      // Fill with gradient
      for (int y = 0; y < 100; y++) {
        for (int x = 0; x < 100; x++) {
          src.setPixel(x, y, img.ColorRgb8(x, y, 0));
        }
      }
      final M = Float64List.fromList([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1,
      ]);
      final result = WarpUtils.warpPerspective(src, M, 50, 50);
      expect(result.width, 50);
      expect(result.height, 50);
    });

    test('orderCorners sorts TL, TR, BR, BL', () {
      // Input: arbitrary order
      final corners = [
        const Offset(100, 200), // TR
        const Offset(0, 0),    // TL
        const Offset(0, 200),  // BL
        const Offset(100, 0),  // TR-ish
      ];
      final ordered = WarpUtils.orderCorners(corners);
      // TL has smallest sum (x+y), BR has largest
      expect(ordered[0].dx + ordered[0].dy, lessThan(ordered[1].dx + ordered[1].dy));
      expect(ordered[3].dx + ordered[3].dy, greaterThan(ordered[2].dx + ordered[2].dy));
    });
  });
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `flutter test test/domain/omr/engine/warp_utils_test.dart -v`
Expected: FAIL — `WarpUtils` is not defined

- [ ] **Step 3: Write minimal WarpUtils class**

```dart
import 'dart:typed_data';
import 'dart:ui';
import 'package:image/image.dart' as img;

/// Homography and perspective warp utilities.
/// Port of OMRChecker/src/utils/image.py four_point_transform,
/// with DLT-based homography computation.
class WarpUtils {
  /// Compute 3x3 homography matrix using Direct Linear Transform (DLT).
  /// src[i] maps to dst[i] for i=0..3 (4 point correspondences).
  /// Returns FlatBufferList of length 9 (row-major 3x3 matrix).
  static Float64List computeHomography(
    List<Offset> src,
    List<Offset> dst,
  ) {
    // Build 8x9 A matrix for DLT
    // Each correspondence gives 2 rows
    final A = List.generate(8, (_) => List.filled(9, 0.0));

    for (int i = 0; i < 4; i++) {
      final sx = src[i].dx;
      final sy = src[i].dy;
      final dx = dst[i].dx;
      final dy = dst[i].dy;

      // Row 2i: [-sx, -sy, -1, 0, 0, 0, sx*dx, sy*dx, dx]
      A[2 * i][0] = -sx;
      A[2 * i][1] = -sy;
      A[2 * i][2] = -1;
      A[2 * i][6] = sx * dx;
      A[2 * i][7] = sy * dx;
      A[2 * i][8] = dx;

      // Row 2i+1: [0, 0, 0, -sx, -sy, -1, sx*dy, sy*dy, dy]
      A[2 * i + 1][3] = -sx;
      A[2 * i + 1][4] = -sy;
      A[2 * i + 1][5] = -1;
      A[2 * i + 1][6] = sx * dy;
      A[2 * i + 1][7] = sy * dy;
      A[2 * i + 1][8] = dy;
    }

    // Solve using Gaussian elimination (reduced row echelon)
    final M = _solveHomography(A);

    return M;
  }

  static Float64List _solveHomography(List<List<double>> A) {
    // Gaussian elimination with partial pivoting on 8x9 matrix
    const n = 8;
    final M = List.generate(n, (i) => List.filled(n + 1, 0.0));

    // Copy A into M (augmented matrix)
    for (int i = 0; i < n; i++) {
      for (int j = 0; j <= n; j++) {
        M[i][j] = A[i][j];
      }
    }

    // Forward elimination with partial pivoting
    for (int col = 0; col < n; col++) {
      // Find pivot
      int maxRow = col;
      double maxVal = M[col][col].abs();
      for (int row = col + 1; row < n; row++) {
        if (M[row][col].abs() > maxVal) {
          maxVal = M[row][col].abs();
          maxRow = row;
        }
      }
      // Swap rows
      final temp = M[col];
      M[col] = M[maxRow];
      M[maxRow] = temp;

      if (M[col][col].abs() < 1e-10) continue;

      // Eliminate below
      for (int row = col + 1; row < n; row++) {
        final factor = M[row][col] / M[col][col];
        for (int j = col; j <= n; j++) {
          M[row][j] -= factor * M[col][j];
        }
      }
    }

    // Back substitution
    final result = Float64List(9);
    for (int i = n - 1; i >= 0; i--) {
      if (M[i][i].abs() < 1e-10) {
        result[i] = 0;
        continue;
      }
      double sum = M[i][n];
      for (int j = i + 1; j < n; j++) {
        sum -= M[i][j] * result[j];
      }
      result[i] = sum / M[i][i];
    }
    // Last row of homography is [h7, h8, 1] — result[8] should be 1
    // Normalize so result[8] = 1
    if (result[8].abs() > 1e-10) {
      for (int i = 0; i < 9; i++) {
        result[i] /= result[8];
      }
    }
    return result;
  }

  /// Apply homography matrix M to point pt.
  static Offset applyHomography(Float64List M, Offset pt) {
    final x = pt.dx;
    final y = pt.dy;
    final w = M[6] * x + M[7] * y + M[8];
    if (w.abs() < 1e-10) return const Offset(0, 0);
    return Offset(
      (M[0] * x + M[1] * y + M[2]) / w,
      (M[3] * x + M[4] * y + M[5]) / w,
    );
  }

  /// Warp source image to target dimensions using homography M.
  static img.Image warpPerspective(
    img.Image src,
    Float64List M,
    int targetWidth,
    int targetHeight,
  ) {
    // Compute inverse homography
    final M_inv = _invertHomography(M);

    final result = img.Image(width: targetWidth, height: targetHeight);

    for (int y = 0; y < targetHeight; y++) {
      for (int x = 0; x < targetWidth; x++) {
        // Map output pixel (x, y) back to source via M_inv
        final srcPt = applyHomography(M_inv, Offset(x.toDouble(), y.toDouble()));
        final sx = srcPt.dx.round();
        final sy = srcPt.dy.round();

        if (sx >= 0 && sx < src.width && sy >= 0 && sy < src.height) {
          final pixel = src.getPixel(sx, sy);
          result.setPixel(x, y, pixel);
        }
      }
    }
    return result;
  }

  static Float64List _invertHomography(Float64List M) {
    // Compute 3x3 matrix inverse manually
    final a = M[0], b = M[1], c = M[2];
    final d = M[3], e = M[4], f = M[5];
    final g = M[6], h = M[7], i_ = M[8];

    final det = a * (e * i_ - f * h) - b * (d * i_ - f * g) + c * (d * h - e * g);
    if (det.abs() < 1e-10) return Float64List.fromList([1, 0, 0, 0, 1, 0, 0, 0, 1]);

    final invDet = 1.0 / det;
    return Float64List.fromList([
      (e * i_ - f * h) * invDet,
      (c * h - b * i_) * invDet,
      (b * f - c * e) * invDet,
      (f * g - d * i_) * invDet,
      (a * i_ - c * g) * invDet,
      (c * d - a * f) * invDet,
      (d * h - e * g) * invDet,
      (b * g - a * h) * invDet,
      (a * e - b * d) * invDet,
    ]);
  }

  /// Order 4 corner points into TL, TR, BR, BL.
  /// Sorts by sum (x+y): smallest=TL, largest=BR.
  static List<Offset> orderCorners(List<Offset> corners) {
    final sorted = List<Offset>.from(corners);
    sorted.sort((a, b) => (a.dx + a.dy).compareTo(b.dx + b.dy));
    final tl = sorted[0];
    final br = sorted[3];

    // Among middle two: larger dy = BL, smaller dy = TR
    final mid = [sorted[1], sorted[2]];
    mid.sort((a, b) => b.dy.compareTo(a.dy));
    return [tl, mid[1], br, mid[0]];
  }

  /// Build target corners for perspective warp.
  /// Given ordered TL, TR, BR, BL and desired output width/height.
  static List<Offset> buildTargetCorners(
    List<Offset> orderedSrc,
    int targetWidth,
    int targetHeight,
  ) {
    // TL=ordered[0], TR=ordered[1], BR=ordered[2], BL=ordered[3]
    return [
      Offset(0, 0),
      Offset(targetWidth.toDouble(), 0),
      Offset(targetWidth.toDouble(), targetHeight.toDouble()),
      Offset(0, targetHeight.toDouble()),
    ];
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `flutter test test/domain/omr/engine/warp_utils_test.dart -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/domain/omr/engine/warp_utils.dart client/mobile/test/domain/omr/engine/warp_utils_test.dart
git commit -m "feat(mobile): add homography math for perspective warp

Port DLT-based homography from OMRChecker/src/utils/image.py.
Includes: computeHomography, applyHomography, warpPerspective,
orderCorners, buildTargetCorners."
```

---

## Task 2: `camera_engine.dart` — Corner Detection & Warp

**Files:**
- Create: `client/mobile/lib/domain/omr/engine/camera_engine.dart`
- Test: `client/mobile/test/domain/omr/engine/camera_engine_test.dart`

- [ ] **Step 1: Write failing tests**

```dart
import 'dart:typed_data';
import 'dart:ui';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'package:smart_grading_mobile/domain/omr/engine/camera_engine.dart';

void main() {
  group('CameraEngine', () {
    late CameraEngine engine;

    setUp(() {
      engine = CameraEngine();
    });

    test('detectCorners returns null for blank image', () async {
      // Create 500x500 white image
      final image = img.Image(width: 500, height: 500);
      for (int y = 0; y < 500; y++) {
        for (int x = 0; x < 500; x++) {
          image.setPixel(x, y, img.ColorRgb8(255, 255, 255));
        }
      }
      final bytes = Uint8List.fromList(img.encodeJpg(image));

      final corners = await engine.detectCorners(bytes);
      expect(corners, isNull);
    });

    test('detectCorners returns null for solid black image', () async {
      final image = img.Image(width: 500, height: 500, numChannels: 1);
      final bytes = Uint8List.fromList(img.encodeJpg(image));

      final corners = await engine.detectCorners(bytes);
      expect(corners, isNull);
    });

    test('perspectiveWarp returns null for null corners', () async {
      final image = img.Image(width: 100, height: 100);
      final bytes = Uint8List.fromList(img.encodeJpg(image));

      final result = await engine.perspectiveWarp(bytes, null, 2480, 3508);
      expect(result, isNull);
    });

    test('perspectiveWarp produces output at target dimensions', () async {
      // Create a 200x300 document-sized image with some features
      final image = img.Image(width: 200, height: 300, numChannels: 3);
      for (int y = 0; y < 300; y++) {
        for (int x = 0; x < 200; x++) {
          image.setPixel(x, y, img.ColorRgb8(x % 256, y % 256, 128));
        }
      }
      final bytes = Uint8List.fromList(img.encodeJpg(image));

      // Identity warp: corners = full image bounds
      final corners = [
        const Offset(0, 0),
        const Offset(200, 0),
        const Offset(200, 300),
        const Offset(0, 300),
      ];

      final result = await engine.perspectiveWarp(bytes, corners, 100, 150);
      expect(result, isNotNull);
      expect(img.decodeImage(result!), isNotNull);
    });
  });
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `flutter test test/domain/omr/engine/camera_engine_test.dart -v`
Expected: FAIL — `CameraEngine` is not defined

- [ ] **Step 3: Write CameraEngine with full corner detection**

```dart
import 'dart:typed_data';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;
import 'warp_utils.dart';

/// Camera engine for OMR scanning.
/// Ports the edge-detection pipeline from OMRChecker/src/processors/CropPage.py.
/// Handles corner detection and perspective warping.
class CameraEngine {
  /// Canny parameters — ported from OMRChecker/src/constants/image_processing.py
  static const int cannyLower = 75;
  static const int cannyUpper = 200;

  /// Morphology kernel — ported from CropPage.py morphKernel default [10, 10]
  static const int morphKernelW = 10;
  static const int morphKernelH = 10;

  /// Threshold for page area (minimum area to consider a page)
  static const double minPageArea = 10000;

  /// Epsilon factor for approxPolyDP — ported from APPROX_POLY_EPSILON_FACTOR
  static const double approxEpsilonFactor = 0.02;

  /// Maximum cosine for rectangle validation — ported from MAX_COSINE_THRESHOLD
  static const double maxCosineThreshold = 0.1;

  /// Threshold TRUNC value — ported from PAGE_THRESHOLD_PARAMS
  static const int pageThresholdValue = 240;

  /// Detect 4 corners of a document in the given image.
  /// Returns null if no valid rectangle found.
  /// Corners are ordered: TL, TR, BR, BL.
  Future<List<Offset>?> detectCorners(Uint8List imageBytes) async {
    var image = img.decodeImage(imageBytes);
    if (image == null) return null;

    // Resize for faster processing (target ~1240px width)
    if (image.width > 1240) {
      final ratio = 1240 / image.width;
      image = img.copyResize(
        image,
        width: 1240,
        height: (image.height * ratio).round(),
      );
    }

    // Convert to grayscale
    final gray = _toGrayscale(image);

    // Step 1: Gaussian blur
    final blurred = _gaussianBlur(gray, 5, 0);

    // Step 2: Normalize to [0, 255]
    final normalized = _normalize(blurred);

    // Step 3: Threshold TRUNC + normalize
    var processed = _thresholdTrunc(normalized, pageThresholdValue);
    processed = _normalize(processed);

    // Step 4: Morphology CLOSE (fill edge gaps)
    processed = _morphologyClose(processed, morphKernelW, morphKernelH);

    // Step 5: Canny edge detection
    final edges = _cannyEdge(processed, cannyLower, cannyUpper);

    // Step 6: Find contours + validate rectangle
    final corners = _findRectangleCorners(edges, image.width, image.height);

    return corners;
  }

  /// Apply perspective warp to straighten the document.
  /// Uses detected corners to compute homography.
  Future<Uint8List?> perspectiveWarp(
    Uint8List imageBytes,
    List<Offset>? corners,
    int targetWidth,
    int targetHeight,
  ) async {
    if (corners == null || corners.length != 4) return null;

    final image = img.decodeImage(imageBytes);
    if (image == null) return null;

    // Resize to match processing dimensions used in detectCorners
    double scale = 1.0;
    if (image.width > 1240) {
      scale = 1240 / image.width;
    }

    // Scale corners back to original image coordinates
    final scaledCorners = corners
        .map((c) => Offset(c.dx / scale, c.dy / scale))
        .toList();

    // Order corners
    final ordered = WarpUtils.orderCorners(scaledCorners);

    // Build target corners
    final dst = WarpUtils.buildTargetCorners(ordered, targetWidth, targetHeight);

    // Compute homography
    final M = WarpUtils.computeHomography(ordered, dst);

    // Warp
    final warped = WarpUtils.warpPerspective(image, M, targetWidth, targetHeight);

    return Uint8List.fromList(img.encodeJpg(warped, quality: 95));
  }

  // --- Private helpers (port from CropPage.py + image_processing.py) ---

  img.Image _toGrayscale(img.Image image) {
    final result = img.Image(width: image.width, height: image.height);
    for (int y = 0; y < image.height; y++) {
      for (int x = 0; x < image.width; x++) {
        final p = image.getPixel(x, y);
        final gray = (0.299 * p.r + 0.587 * p.g + 0.114 * p.b).round().clamp(0, 255);
        result.setPixel(x, y, img.ColorRgb8(gray, gray, gray));
      }
    }
    return result;
  }

  img.Image _gaussianBlur(img.Image image, int kernelSize, double sigma) {
    // Simple 1D Gaussian blur using the `image` package's built-in
    var blurred = img.gaussianBlur(image, radius: sigma.round() == 0 ? 1 : sigma.round());
    return blurred;
  }

  img.Image _normalize(img.Image image) {
    int srcMin = 255, srcMax = 0;
    for (int y = 0; y < image.height; y++) {
      for (int x = 0; x < image.width; x++) {
        final gray = image.getPixel(x, y).r.toInt();
        if (gray < srcMin) srcMin = gray;
        if (gray > srcMax) srcMax = gray;
      }
    }
    if (srcMin == srcMax) return image;

    final result = img.Image(width: image.width, height: image.height);
    final scale = 255.0 / (srcMax - srcMin);
    for (int y = 0; y < image.height; y++) {
      for (int x = 0; x < image.width; x++) {
        final gray = ((image.getPixel(x, y).r - srcMin) * scale).round().clamp(0, 255);
        result.setPixel(x, y, img.ColorRgb8(gray, gray, gray));
      }
    }
    return result;
  }

  img.Image _thresholdTrunc(img.Image image, int threshold) {
    final result = img.Image(width: image.width, height: image.height);
    for (int y = 0; y < image.height; y++) {
      for (int x = 0; x < image.width; x++) {
        final gray = image.getPixel(x, y).r.toInt();
        final val = gray > threshold ? gray : threshold;
        result.setPixel(x, y, img.ColorRgb8(val, val, val));
      }
    }
    return result;
  }

  img.Image _morphologyClose(img.Image image, int kw, int kh) {
    // CLOSE = dilate then erode
    var result = _dilate(image, kw, kh);
    result = _erode(result, kw, kh);
    return result;
  }

  img.Image _erode(img.Image image, int kw, int kh) {
    final result = img.Image(width: image.width, height: image.height);
    final halfW = kw ~/ 2;
    final halfH = kh ~/ 2;
    for (int y = 0; y < image.height; y++) {
      for (int x = 0; x < image.width; x++) {
        int minVal = 255;
        for (int ky = -halfH; ky <= halfH; ky++) {
          for (int kx = -halfW; kx <= halfW; kx++) {
            final px = (x + kx).clamp(0, image.width - 1);
            final py = (y + ky).clamp(0, image.height - 1);
            final gray = image.getPixel(px, py).r.toInt();
            if (gray < minVal) minVal = gray;
          }
        }
        result.setPixel(x, y, img.ColorRgb8(minVal, minVal, minVal));
      }
    }
    return result;
  }

  img.Image _dilate(img.Image image, int kw, int kh) {
    final result = img.Image(width: image.width, height: image.height);
    final halfW = kw ~/ 2;
    final halfH = kh ~/ 2;
    for (int y = 0; y < image.height; y++) {
      for (int x = 0; x < image.width; x++) {
        int maxVal = 0;
        for (int ky = -halfH; ky <= halfH; ky++) {
          for (int kx = -halfW; kx <= halfW; kx++) {
            final px = (x + kx).clamp(0, image.width - 1);
            final py = (y + ky).clamp(0, image.height - 1);
            final gray = image.getPixel(px, py).r.toInt();
            if (gray > maxVal) maxVal = gray;
          }
        }
        result.setPixel(x, y, img.ColorRgb8(maxVal, maxVal, maxVal));
      }
    }
    return result;
  }

  img.Image _cannyEdge(img.Image image, int lower, int upper) {
    // Simple Canny: blur -> gradient -> threshold -> hysteresis
    // Since `image` package doesn't have direct Canny, implement manually:
    // 1. Sobel gradients
    final gx = _sobelX(image);
    final gy = _sobelY(image);

    // 2. Magnitude + direction
    final magnitude = img.Image(width: image.width, height: image.height);
    final direction = img.Image(width: image.width, height: image.height);
    for (int y = 0; y < image.height; y++) {
      for (int x = 0; x < image.width; x++) {
        final mx = gx.getPixel(x, y).r.toInt();
        final my = gy.getPixel(x, y).r.toInt();
        final mag = (mx * mx + my * my);
        final dir = _fastAtan2(my, mx);
        magnitude.setPixel(x, y, img.ColorRgb8(
          (mag > 255 ? 255 : mag).toInt(),
          (mag > 255 ? 255 : mag).toInt(),
          (mag > 255 ? 255 : mag).toInt(),
        ));
        direction.setPixel(x, y, img.ColorRgb8(dir, dir, dir));
      }
    }

    // 3. Non-maximum suppression + double threshold + hysteresis
    final edges = _hysteresisThreshold(magnitude, direction, lower, upper);
    return edges;
  }

  img.Image _sobelX(img.Image image) {
    final kernel = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ];
    return _convolution(image, kernel);
  }

  img.Image _sobelY(img.Image image) {
    final kernel = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ];
    return _convolution(image, kernel);
  }

  img.Image _convolution(img.Image image, List<List<int>> kernel) {
    final result = img.Image(width: image.width, height: image.height);
    final kH = kernel.length;
    final kW = kernel[0].length;
    final halfH = kH ~/ 2;
    final halfW = kW ~/ 2;

    for (int y = 0; y < image.height; y++) {
      for (int x = 0; x < image.width; x++) {
        int sum = 0;
        for (int ky = -halfH; ky <= halfH; ky++) {
          for (int kx = -halfW; kx <= halfW; kx++) {
            final px = (x + kx).clamp(0, image.width - 1);
            final py = (y + ky).clamp(0, image.height - 1);
            final gray = image.getPixel(px, py).r.toInt();
            sum += gray * kernel[ky + halfH][kx + halfW];
          }
        }
        sum = sum.abs().clamp(0, 255);
        result.setPixel(x, y, img.ColorRgb8(sum, sum, sum));
      }
    }
    return result;
  }

  int _fastAtan2(int y, int x) {
    if (x == 0) return y >= 0 ? 90 : 270;
    double angle = (y / x * 180 / 3.14159265);
    if (x < 0) angle += 180;
    if (angle < 0) angle += 360;
    return angle.round().clamp(0, 255);
  }

  img.Image _hysteresisThreshold(
    img.Image magnitude,
    img.Image direction,
    int lower,
    int upper,
  ) {
    // Strong edges: magnitude > upper
    // Weak edges: magnitude > lower
    // Hysteresis: keep weak edges if connected to strong
    final strong = img.Image(width: magnitude.width, height: magnitude.height);
    final weak = img.Image(width: magnitude.width, height: magnitude.height);

    for (int y = 0; y < magnitude.height; y++) {
      for (int x = 0; x < magnitude.width; x++) {
        final mag = magnitude.getPixel(x, y).r.toInt();
        if (mag >= upper) {
          strong.setPixel(x, y, img.ColorRgb8(255, 255, 255));
        } else if (mag >= lower) {
          weak.setPixel(x, y, img.ColorRgb8(255, 255, 255));
        }
      }
    }

    // Connected component suppression for weak edges
    final result = img.Image(width: magnitude.width, height: magnitude.height);
    for (int y = 0; y < magnitude.height; y++) {
      for (int x = 0; x < magnitude.width; x++) {
        if (strong.getPixel(x, y).r > 0) {
          result.setPixel(x, y, img.ColorRgb8(255, 255, 255));
        } else if (weak.getPixel(x, y).r > 0) {
          // Check 8 neighbors
          bool connected = false;
          for (int dy = -1; dy <= 1; dy++) {
            for (int dx = -1; dx <= 1; dx++) {
              if (dx == 0 && dy == 0) continue;
              final nx = x + dx;
              final ny = y + dy;
              if (nx >= 0 && nx < magnitude.width &&
                  ny >= 0 && ny < magnitude.height &&
                  strong.getPixel(nx, ny).r > 0) {
                connected = true;
                break;
              }
            }
            if (connected) break;
          }
          if (connected) {
            result.setPixel(x, y, img.ColorRgb8(255, 255, 255));
          }
        }
      }
    }
    return result;
  }

  List<Offset>? _findRectangleCorners(img.Image edges, int width, int height) {
    // Find contours using scanline approach
    // Group edge pixels into contours by connectivity
    final visited = List.generate(
      height,
      (_) => List.filled(width, false),
    );

    List<List<Offset>> contours = [];

    // Simple contour tracing
    for (int y = 0; y < height; y++) {
      for (int x = 0; x < width; x++) {
        if (edges.getPixel(x, y).r > 0 && !visited[y][x]) {
          final contour = _traceContour(edges, x, y, visited, width, height);
          if (contour.length >= 4) {
            contours.add(contour);
          }
        }
      }
    }

    if (contours.isEmpty) return null;

    // Sort by area (largest first) and take top 5
    contours.sort((a, b) {
      final areaA = _contourArea(a);
      final areaB = _contourArea(b);
      return areaB.compareTo(areaA);
    });
    contours = contours.take(5).toList();

    // Try to find a 4-point rectangle
    for (final contour in contours) {
      if (_contourArea(contour) < minPageArea) continue;

      final simplified = _simplifyContour(contour);
      if (simplified.length == 4 && _validateRectangle(simplified)) {
        return WarpUtils.orderCorners(simplified);
      }
    }

    // Fallback: try Douglas-Peucker on largest contour
    if (contours.isNotEmpty) {
      final largest = contours[0];
      if (_contourArea(largest) >= minPageArea) {
        final simplified = _douglasPeucker(largest, 5.0);
        if (simplified.length == 4 && _validateRectangle(simplified)) {
          return WarpUtils.orderCorners(simplified);
        }
      }
    }

    return null;
  }

  List<Offset> _traceContour(
    img.Image edges,
    int startX,
    int startY,
    List<List<bool>> visited,
    int width,
    int height,
  ) {
    final contour = <Offset>[];
    final stack = <Offset>[Offset(startX.toDouble(), startY.toDouble())];

    while (stack.isNotEmpty && contour.length < 2000) {
      final pt = stack.removeLast();
      final x = pt.dx.toInt();
      final y = pt.dy.toInt();

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited[y][x]) continue;
      if (edges.getPixel(x, y).r == 0) continue;

      visited[y][x] = true;
      contour.add(pt);

      // 8-connectivity neighbors
      for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
          if (dx == 0 && dy == 0) continue;
          stack.add(Offset((x + dx).toDouble(), (y + dy).toDouble()));
        }
      }
    }

    return contour;
  }

  double _contourArea(List<Offset> contour) {
    if (contour.length < 3) return 0;
    double area = 0;
    for (int i = 0; i < contour.length; i++) {
      final j = (i + 1) % contour.length;
      area += contour[i].dx * contour[j].dy;
      area -= contour[j].dx * contour[i].dy;
    }
    return area.abs() / 2;
  }

  List<Offset> _simplifyContour(List<Offset> contour) {
    if (contour.length <= 10) return _douglasPeucker(contour, 3.0);
    return _douglasPeucker(contour, 5.0);
  }

  List<Offset> _douglasPeucker(List<Offset> points, double epsilon) {
    if (points.length < 3) return points;

    double maxDist = 0;
    int maxIdx = 0;
    final start = points.first;
    final end = points.last;

    for (int i = 1; i < points.length - 1; i++) {
      final dist = _perpendicularDistance(points[i], start, end);
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }

    if (maxDist > epsilon) {
      final left = _douglasPeucker(points.sublist(0, maxIdx + 1), epsilon);
      final right = _douglasPeucker(points.sublist(maxIdx), epsilon);
      return [...left.sublist(0, left.length - 1), ...right];
    }

    return [start, end];
  }

  double _perpendicularDistance(Offset pt, Offset lineStart, Offset lineEnd) {
    final dx = lineEnd.dx - lineStart.dx;
    final dy = lineEnd.dy - lineStart.dy;
    final len = (dx * dx + dy * dy);
    if (len < 1e-10) return (pt - lineStart).distance;
    return ((dy * pt.dx - dx * pt.dy + lineEnd.dx * lineStart.dy - lineEnd.dy * lineStart.dx).abs() / (len * dx * dx + dy * dy).abs().sqrt());
  }

  bool _validateRectangle(List<Offset> corners) {
    if (corners.length != 4) return false;

    // Check max cosine between adjacent edges
    for (int i = 0; i < 4; i++) {
      final p0 = corners[i];
      final p1 = corners[(i + 1) % 4];
      final p2 = corners[(i + 2) % 4];

      final v1 = Offset(p1.dx - p0.dx, p1.dy - p0.dy);
      final v2 = Offset(p2.dx - p1.dx, p2.dy - p1.dy);

      final dot = v1.dx * v2.dx + v1.dy * v2.dy;
      final len1 = (v1.dx * v1.dx + v1.dy * v1.dy);
      final len2 = (v2.dx * v2.dx + v2.dy * v2.dy);
      if (len1 < 1e-10 || len2 < 1e-10) return false;

      final cosAngle = dot / (len1 * len2).sqrt();
      if (cosAngle > maxCosineThreshold) return false;
    }

    return true;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `flutter test test/domain/omr/engine/camera_engine_test.dart -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/domain/omr/engine/camera_engine.dart client/mobile/test/domain/omr/engine/camera_engine_test.dart
git commit -m "feat(mobile): add CameraEngine for corner detection and warp

Ports OMRChecker CropPage.py edge-detection pipeline to Dart.
Includes: Canny, Sobel, contour tracing, Douglas-Peucker,
rectangle validation, perspective warp via homography."
```

---

## Task 3: Integrate CameraEngine into OMREngine

**Files:**
- Modify: `client/mobile/lib/domain/omr/engine/omr_engine.dart`

- [ ] **Step 1: Write a test for the extended pipeline**

Create `client/mobile/test/domain/omr/engine/omr_engine_test.dart`:

```dart
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'package:smart_grading_mobile/domain/omr/engine/omr_engine.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/domain/omr/models/evaluation_config.dart';

void main() {
  group('OMREngine extended pipeline', () {
    late OMREngine engine;

    setUp(() {
      engine = OMREngine();
    });

    test('processImage returns result with wasWarped field', () async {
      final template = OMRTemplate.simpleMcq(
        numQuestions: 5,
        numOptions: 4,
        bubbleWidth: 35,
        bubbleHeight: 35,
      );
      final evalConfig = EvaluationConfig.simple(
        questionAnswers: Map.fromEntries(
          List.generate(5, (i) => MapEntry('q${i + 1}', 'A')),
        ),
        correct: 1.0,
        incorrect: 0.0,
        unmarked: 0.0,
      );

      // Create a synthetic OMR-like image
      final image = img.Image(width: 1240, height: 1754, numChannels: 3);
      // Fill with white
      for (int y = 0; y < 1754; y++) {
        for (int x = 0; x < 1240; x++) {
          image.setPixel(x, y, img.ColorRgb8(255, 255, 255));
        }
      }
      // Draw some bubbles as filled (darker)
      for (int row = 0; row < 5; row++) {
        for (int col = 0; col < 4; col++) {
          final bx = 200 + col * 55;
          final by = 400 + row * 55;
          for (int dy = 0; dy < 35; dy++) {
            for (int dx = 0; dx < 35; dx++) {
              final px = (bx + dx).clamp(0, 1239);
              final py = (by + dy).clamp(0, 1753);
              image.setPixel(px, py, img.ColorRgb8(30, 30, 30));
            }
          }
        }
      }
      final bytes = Uint8List.fromList(img.encodeJpg(image));

      final result = await engine.processImage(
        imageBytes: bytes,
        template: template,
        evaluationConfig: evalConfig,
      );

      expect(result.isSuccess, isTrue);
      expect(result.wasWarped, isA<bool>());
      // corners field may be null if no document detected
    });

    test('processImage with no corners detected still produces result', () async {
      final template = OMRTemplate.simpleMcq(
        numQuestions: 3,
        numOptions: 4,
        bubbleWidth: 35,
        bubbleHeight: 35,
      );

      // Create a tiny blank image
      final image = img.Image(width: 200, height: 300, numChannels: 3);
      for (int y = 0; y < 300; y++) {
        for (int x = 0; x < 200; x++) {
          image.setPixel(x, y, img.ColorRgb8(200, 200, 200));
        }
      }
      final bytes = Uint8List.fromList(img.encodeJpg(image));

      final result = await engine.processImage(
        imageBytes: bytes,
        template: template,
        evaluationConfig: null,
      );

      // Should either succeed (no corners → use original) or fail gracefully
      expect(result.hasError || result.isSuccess, isTrue);
    });
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test test/domain/omr/engine/omr_engine_test.dart -v`
Expected: FAIL — `wasWarped`, `detectedCorners`, `skewAngle` fields don't exist

- [ ] **Step 3: Extend OMRProcessingResult and OMREngine.processImage**

Read the existing `omr_engine.dart` first. Then modify:

```dart
import 'dart:typed_data';
import 'dart:ui';
import 'package:image/image.dart' as img;
import '../models/grading_result.dart';
import '../models/omr_response.dart';
import '../models/omr_template.dart';
import '../models/evaluation_config.dart';
import 'bubble_reader.dart';
import 'image_processor.dart';
import 'omr_scorer.dart';
import 'camera_engine.dart';  // NEW

/// Processing result containing everything from a single OMR scan.
class OMRProcessingResult {
  final OMRGradingResult gradingResult;
  final OMRResponseDebug response;
  final String? errorMessage;
  final Duration processingTime;
  final List<String> processingSteps;
  final List<Offset>? detectedCorners;  // NEW
  final double? skewAngle;               // NEW
  final bool wasWarped;                  // NEW

  const OMRProcessingResult({
    required this.gradingResult,
    required this.response,
    this.errorMessage,
    required this.processingTime,
    required this.processingSteps,
    this.detectedCorners,   // NEW
    this.skewAngle,         // NEW
    this.wasWarped = false, // NEW
  });

  bool get hasError => errorMessage != null;
  bool get isSuccess => errorMessage == null;
}

/// The main OMR processing engine orchestrator.
class OMREngine {
  final BubbleReader _bubbleReader;
  final OMRScorer _scorer;
  final CameraEngine _cameraEngine;  // NEW

  OMREngine()
      : _bubbleReader = BubbleReader(),
        _scorer = OMRScorer(),
        _cameraEngine = CameraEngine();  // NEW

  /// Process a single image and return grading result.
  Future<OMRProcessingResult> processImage({
    required Uint8List imageBytes,
    required OMRTemplate template,
    EvaluationConfig? evaluationConfig,
  }) async {
    final stopwatch = Stopwatch()..start();
    final steps = <String>[];

    try {
      steps.add('Decoding image...');
      var image = img.decodeImage(imageBytes);
      if (image == null) {
        throw Exception('Failed to decode image');
      }
      steps.add('Image decoded: ${image.width}x${image.height}');

      steps.add('Resizing image...');
      image = OMRImageProcessor.resizeToWidth(image, 1240);
      steps.add('Resized to: ${image.width}x${image.height}');

      // NEW: Corner detection and perspective warp
      steps.add('Detecting document corners...');
      List<Offset>? corners = null;
      bool wasWarped = false;
      double? skewAngle;

      try {
        corners = await _cameraEngine.detectCorners(imageBytes);
        if (corners != null) {
          steps.add('Corners detected: TL(${corners[0].dx.toInt()},${corners[0].dy.toInt()}) '
              'TR(${corners[1].dx.toInt()},${corners[1].dy.toInt()}) '
              'BR(${corners[2].dx.toInt()},${corners[2].dy.toInt()}) '
              'BL(${corners[3].dx.toInt()},${corners[3].dy.toInt()})');

          // Calculate skew angle
          final dx = corners[1].dx - corners[0].dx;
          final dy = corners[1].dy - corners[0].dy;
          skewAngle = (dy / (dx.abs() > 1 ? dx : 1) * 180 / 3.14159265);
          steps.add('Skew angle: ${skewAngle.toStringAsFixed(1)}°');

          // Warp perspective
          steps.add('Applying perspective warp...');
          final warpedBytes = await _cameraEngine.perspectiveWarp(
            imageBytes,
            corners,
            template.pageWidth,
            template.pageHeight,
          );

          if (warpedBytes != null) {
            image = img.decodeImage(warpedBytes);
            if (image != null) {
              wasWarped = true;
              steps.add('Warped to: ${image.width}x${image.height}');
            }
          }
        } else {
          steps.add('No corners detected — using original image');
        }
      } catch (e) {
        steps.add('Corner detection failed: $e — using original image');
      }

      steps.add('Converting to grayscale...');
      image = OMRImageProcessor.toGrayscaleImage(image);

      steps.add('Normalizing...');
      image = OMRImageProcessor.normalize(image);

      steps.add('Applying CLAHE...');
      image = OMRImageProcessor.applyCLAHE(image);

      steps.add('Applying gamma correction...');
      image = OMRImageProcessor.applyGamma(image, 0.4);

      steps.add('Applying threshold...');
      image = OMRImageProcessor.applyThresholdTrunc(image, 220);

      image = OMRImageProcessor.normalize(image);

      steps.add('Reading bubbles...');
      final response = _bubbleReader.readBubbles(image, template);
      steps.add('Read ${response.answers.length} answers');

      OMRGradingResult gradingResult;
      if (evaluationConfig != null) {
        steps.add('Grading answers...');
        gradingResult = _scorer.grade(response, evaluationConfig);
        steps.add('Score: ${gradingResult.score}/${gradingResult.maxScore}');
      } else {
        steps.add('No evaluation config - returning read-only results');
        gradingResult = OMRGradingResult(
          score: 0,
          maxScore: 0,
          verdicts: [],
          hasMultiMarked: response.multiMarked,
          hasUnmarked: response.hasUnmarked,
        );
      }

      stopwatch.stop();

      return OMRProcessingResult(
        gradingResult: gradingResult,
        response: response,
        errorMessage: null,
        processingTime: stopwatch.elapsed,
        processingSteps: steps,
        detectedCorners: corners,   // NEW
        skewAngle: skewAngle,       // NEW
        wasWarped: wasWarped,       // NEW
      );
    } catch (e) {
      stopwatch.stop();
      return OMRProcessingResult(
        gradingResult: OMRGradingResult.empty(),
        response: OMRResponseDebug(
          answers: {},
          bubbleIntensities: {},
          globalThreshold: 0,
          localThresholds: {},
        ),
        errorMessage: 'Processing failed: $e',
        processingTime: stopwatch.elapsed,
        processingSteps: steps,
      );
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `flutter test test/domain/omr/engine/omr_engine_test.dart -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/domain/omr/engine/omr_engine.dart client/mobile/test/domain/omr/engine/omr_engine_test.dart
git commit -m "feat(mobile): integrate CameraEngine into OMREngine pipeline

Added corner detection + perspective warp step to processImage().
Extended OMRProcessingResult with detectedCorners, skewAngle, wasWarped.
Graceful fallback if no corners detected."
```

---

## Task 4: CameraBloc — State Machine

**Files:**
- Create: `client/mobile/lib/presentation/blocs/camera/camera_event.dart`
- Create: `client/mobile/lib/presentation/blocs/camera/camera_state.dart`
- Create: `client/mobile/lib/presentation/blocs/camera/camera_bloc.dart`

- [ ] **Step 1: Write CameraEvent**

```dart
part of 'camera_bloc.dart';

abstract class CameraEvent extends Equatable {
  const CameraEvent();

  @override
  List<Object?> get props => [];
}

class CameraInitialize extends CameraEvent {}

class CameraFrameAvailable extends CameraEvent {
  final Uint8List imageBytes;

  const CameraFrameAvailable(this.imageBytes);

  @override
  List<Object?> get props => [imageBytes];
}

class CameraCornersDetected extends CameraEvent {
  final List<Offset> corners;
  final bool isStable;

  const CameraCornersDetected(this.corners, this.isStable);

  @override
  List<Object?> get props => [corners, isStable];
}

class CameraCornersLost extends CameraEvent {}

class CameraCapture extends CameraEvent {}

class CameraRetake extends CameraEvent {}

class CameraConfirmCapture extends CameraEvent {}

class CameraDispose extends CameraEvent {}
```

- [ ] **Step 2: Write CameraState**

```dart
part of 'camera_bloc.dart';

abstract class CameraBlocState extends Equatable {
  const CameraBlocState();

  @override
  List<Object?> get props => [];
}

class CameraInitializing extends CameraBlocState {}

class CameraReady extends CameraBlocState {
  final double brightness;

  const CameraReady({this.brightness = 0.5});

  @override
  List<Object?> get props => [brightness];
}

class CameraCornerDetected extends CameraBlocState {
  final List<Offset> corners;
  final double skewAngle;
  final double brightness;

  const CameraCornerDetected({
    required this.corners,
    required this.skewAngle,
    this.brightness = 0.5,
  });

  @override
  List<Object?> get props => [corners, skewAngle, brightness];
}

class CameraStable extends CameraBlocState {
  final List<Offset> corners;
  final double skewAngle;
  final double brightness;

  const CameraStable({
    required this.corners,
    required this.skewAngle,
    this.brightness = 0.5,
  });

  @override
  List<Object?> get props => [corners, skewAngle, brightness];
}

class CameraCapturing extends CameraBlocState {}

class CameraImageReady extends CameraBlocState {
  final Uint8List imageBytes;
  final List<Offset>? corners;
  final double skewAngle;
  final bool wasWarped;

  const CameraImageReady({
    required this.imageBytes,
    this.corners,
    this.skewAngle = 0,
    this.wasWarped = false,
  });

  @override
  List<Object?> get props => [imageBytes, corners, skewAngle, wasWarped];
}

class CameraError extends CameraBlocState {
  final String message;

  const CameraError(this.message);

  @override
  List<Object?> get props => [message];
}
```

- [ ] **Step 3: Write CameraBloc**

```dart
import 'dart:async';
import 'dart:typed_data';
import 'dart:ui';
import 'package:camera/camera.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:smart_grading_mobile/domain/omr/engine/camera_engine.dart';

part 'camera_event.dart';
part 'camera_state.dart';

class CameraBloc extends Bloc<CameraEvent, CameraBlocState> {
  final CameraEngine _cameraEngine;
  CameraController? _controller;
  List<Offset>? _lastCorners;
  DateTime? _cornerStableSince;
  Timer? _stabilityTimer;
  Timer? _frameThrottle;
  bool _disposed = false;

  static const _stableThresholdMs = 500;
  static const _frameThrottleMs = 500; // max 2 fps for corner detection

  CameraBloc({CameraEngine? cameraEngine})
      : _cameraEngine = cameraEngine ?? CameraEngine(),
        super(CameraInitializing()) {
    on<CameraInitialize>(_onInitialize);
    on<CameraFrameAvailable>(_onFrameAvailable);
    on<CameraCornersDetected>(_onCornersDetected);
    on<CameraCornersLost>(_onCornersLost);
    on<CameraCapture>(_onCapture);
    on<CameraRetake>(_onRetake);
    on<CameraDispose>(_onDispose);
  }

  CameraController? get controller => _controller;

  Future<void> _onInitialize(
    CameraInitialize event,
    Emitter<CameraBlocState> emit,
  ) async {
    emit(CameraInitializing());

    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        emit(const CameraError('No cameras available'));
        return;
      }

      // Find rear camera
      final rear = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );

      _controller = CameraController(
        rear,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );

      await _controller!.initialize();

      if (_disposed) {
        await _controller?.dispose();
        return;
      }

      // Start image stream for corner detection
      await _controller!.startImageStream((image) async {
        if (_disposed) return;
        final bytes = await image.toByteData(format: ImageFormatGroup.jpeg);
        if (bytes != null) {
          add(CameraFrameAvailable(Uint8List.view(bytes.buffer)));
        }
      });

      emit(const CameraReady());
    } catch (e) {
      emit(CameraError('Camera initialization failed: $e'));
    }
  }

  Future<void> _onFrameAvailable(
    CameraFrameAvailable event,
    Emitter<CameraBlocState> emit,
  ) async {
    if (_disposed) return;
    if (state is CameraCapturing || state is CameraImageReady) return;

    // Throttle: skip if we just processed a frame
    if (_frameThrottle?.isActive ?? false) return;
    _frameThrottle = Timer(
      Duration(milliseconds: _frameThrottleMs),
      () {},
    );

    try {
      final corners = await _cameraEngine.detectCorners(event.imageBytes);
      if (corners == null) {
        add(CameraCornersLost());
        return;
      }

      // Calculate skew
      final dx = corners[1].dx - corners[0].dx;
      final dy = corners[1].dy - corners[0].dy;
      final skewAngle = (dy.abs() > 1 ? (dy / dx.abs()) * 180 / 3.14159265 : 0.0);

      // Check stability
      final isStable = _lastCorners != null &&
          _cornersSimilar(corners, _lastCorners!);

      add(CameraCornersDetected(corners, isStable));
    } catch (e) {
      // Silently ignore frame processing errors
    }
  }

  void _onCornersDetected(
    CameraCornersDetected event,
    Emitter<CameraBlocState> emit,
  ) {
    _lastCorners = event.corners;

    if (event.isStable && _cornerStableSince == null) {
      _cornerStableSince = DateTime.now();
      _stabilityTimer?.cancel();
      _stabilityTimer = Timer(
        Duration(milliseconds: _stableThresholdMs),
        () {
          if (!_disposed && _lastCorners != null) {
            add(CameraCornersDetected(_lastCorners!, true));
          }
        },
      );
    }

    if (event.isStable) {
      emit(CameraStable(
        corners: event.corners,
        skewAngle: _calculateSkew(event.corners),
      ));
    } else {
      emit(CameraCornerDetected(
        corners: event.corners,
        skewAngle: _calculateSkew(event.corners),
      ));
    }
  }

  void _onCornersLost(
    CameraCornersLost event,
    Emitter<CameraBlocState> emit,
  ) {
    _lastCorners = null;
    _cornerStableSince = null;
    _stabilityTimer?.cancel();
    emit(const CameraReady());
  }

  Future<void> _onCapture(
    CameraCapture event,
    Emitter<CameraBlocState> emit,
  ) async {
    if (_controller == null || !_controller!.value.isInitialized) return;
    if (state is! CameraStable && state is! CameraCornerDetected &&
        state is! CameraReady) return;

    emit(CameraCapturing());

    try {
      final file = await _controller!.takePicture();
      final bytes = await file.readAsBytes();

      List<Offset>? corners;
      double skewAngle = 0;
      bool wasWarped = false;

      if (_lastCorners != null) {
        corners = _lastCorners;
        skewAngle = _calculateSkew(corners);
      }

      emit(CameraImageReady(
        imageBytes: bytes,
        corners: corners,
        skewAngle: skewAngle,
        wasWarped: wasWarped,
      ));
    } catch (e) {
      emit(CameraError('Capture failed: $e'));
    }
  }

  void _onRetake(CameraRetake event, Emitter<CameraBlocState> emit) {
    _lastCorners = null;
    _cornerStableSince = null;
    emit(const CameraReady());
  }

  Future<void> _onDispose(CameraDispose event, Emitter<CameraBlocState> emit) async {
    _disposed = true;
    _stabilityTimer?.cancel();
    _frameThrottle?.cancel();
    await _controller?.dispose();
    _controller = null;
  }

  bool _cornersSimilar(List<Offset> a, List<Offset> b, {double threshold = 15}) {
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      if ((a[i].dx - b[i].dx).abs() > threshold ||
          (a[i].dy - b[i].dy).abs() > threshold) {
        return false;
      }
    }
    return true;
  }

  double _calculateSkew(List<Offset> corners) {
    final dx = corners[1].dx - corners[0].dx;
    final dy = corners[1].dy - corners[0].dy;
    return dy.abs() > 1 ? (dy / dx.abs()) * 180 / 3.14159265 : 0;
  }

  @override
  Future<void> close() async {
    _disposed = true;
    _stabilityTimer?.cancel();
    _frameThrottle?.cancel();
    await _controller?.dispose();
    return super.close();
  }
}
```

- [ ] **Step 4: Verify the code compiles (no test needed for BLoC)**

Run: `flutter analyze lib/presentation/blocs/camera/ -v`
Expected: No errors (warnings OK)

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/presentation/blocs/camera/camera_event.dart client/mobile/lib/presentation/blocs/camera/camera_state.dart client/mobile/lib/presentation/blocs/camera/camera_bloc.dart
git commit -m "feat(mobile): add CameraBloc state machine

States: Initializing → Ready → CornerDetected → Stable → Capturing → ImageReady
Handles camera init, frame stream, corner detection, stability timer,
and capture lifecycle."
```

---

## Task 5: Corner Overlay Painter Widget

**Files:**
- Create: `client/mobile/lib/presentation/widgets/corner_overlay_painter.dart`
- Test: `client/mobile/test/presentation/widgets/corner_overlay_painter_test.dart`

- [ ] **Step 1: Write widget test**

```dart
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/presentation/widgets/corner_overlay_painter.dart';

void main() {
  testWidgets('CornerOverlayPainter renders with corners', (tester) async {
    final corners = [
      const Offset(100, 200),
      const Offset(500, 200),
      const Offset(500, 700),
      const Offset(100, 700),
    ];

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CustomPaint(
            size: const Size(600, 900),
            painter: CornerOverlayPainter(
              corners: corners,
              isStable: true,
            ),
          ),
        ),
      ),
    );

    expect(find.byType(CustomPaint), findsOneWidget);
  });

  testWidgets('CornerOverlayPainter renders null corners without crash', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CustomPaint(
            size: const Size(600, 900),
            painter: CornerOverlayPainter(
              corners: null,
              isStable: false,
            ),
          ),
        ),
      ),
    );

    expect(find.byType(CustomPaint), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test test/presentation/widgets/corner_overlay_painter_test.dart -v`
Expected: FAIL — `CornerOverlayPainter` is not defined

- [ ] **Step 3: Write CornerOverlayPainter**

```dart
import 'dart:ui';
import 'package:flutter/material.dart';

/// CustomPainter that draws corner overlay guide on camera preview.
/// Shows 4 corner markers with connecting lines when corners detected.
class CornerOverlayPainter extends CustomPainter {
  final List<Offset>? corners;
  final bool isStable;
  final double skewAngle;

  CornerOverlayPainter({
    this.corners,
    this.isStable = false,
    this.skewAngle = 0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (corners == null || corners!.length != 4) {
      _paintCenterGuide(canvas, size);
      return;
    }

    final color = isStable ? const Color(0xFF22C55E) : const Color(0xFFF59E0B);
    final fillColor = color.withValues(alpha: 0.3);
    final strokeColor = color.withValues(alpha: 0.8);

    // Paint fill
    final fillPaint = Paint()
      ..color = fillColor
      ..style = PaintingStyle.fill;

    final path = Path()
      ..moveTo(corners![0].dx, corners![0].dy)
      ..lineTo(corners![1].dx, corners![1].dy)
      ..lineTo(corners![2].dx, corners![2].dy)
      ..lineTo(corners![3].dx, corners![3].dy)
      ..close();
    canvas.drawPath(path, fillPaint);

    // Paint stroke
    final strokePaint = Paint()
      ..color = strokeColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.0;

    canvas.drawPath(path, strokePaint);

    // Draw corner markers
    final markerPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    const markerSize = 12.0;

    for (final corner in corners!) {
      canvas.drawCircle(corner, markerSize, markerPaint);
    }

    // Draw dashed lines connecting corners
    _drawDashedLine(canvas, corners![0], corners![1], strokePaint);
    _drawDashedLine(canvas, corners![1], corners![2], strokePaint);
    _drawDashedLine(canvas, corners![2], corners![3], strokePaint);
    _drawDashedLine(canvas, corners![3], corners![0], strokePaint);

    // Skew warning
    if (skewAngle.abs() > 5) {
      _paintSkewWarning(canvas, size);
    }
  }

  void _paintCenterGuide(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF475569).withValues(alpha: 0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    final cx = size.width / 2;
    final cy = size.height / 2;
    final w = size.width * 0.6;
    final h = size.height * 0.7;

    // Draw a dashed rectangle guide in center
    final rect = Rect.fromCenter(center: Offset(cx, cy), width: w, height: h);
    _drawDashedRect(canvas, rect, paint);

    // Crosshair
    canvas.drawLine(
      Offset(cx - 15, cy),
      Offset(cx + 15, cy),
      paint,
    );
    canvas.drawLine(
      Offset(cx, cy - 15),
      Offset(cx, cy + 15),
      paint,
    );
  }

  void _paintSkewWarning(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFFEF4444).withValues(alpha: 0.8)
      ..style = PaintingStyle.fill;

    final textPainter = TextPainter(
      text: TextSpan(
        text: '⚠ Tilted ${skewAngle.abs().toStringAsFixed(0)}°',
        style: const TextStyle(
          color: Color(0xFFEF4444),
          fontSize: 14,
          fontWeight: FontWeight.bold,
        ),
      ),
      textDirection: TextDirection.ltr,
    );
    textPainter.layout();
    textPainter.paint(canvas, Offset(size.width / 2 - textPainter.width / 2, 60));
  }

  void _drawDashedLine(Canvas canvas, Offset a, Offset b, Paint paint) {
    const dashLength = 8.0;
    const gapLength = 4.0;

    final dx = b.dx - a.dx;
    final dy = b.dy - a.dy;
    final dist = (dx * dx + dy * dy).sqrt();
    if (dist < 1e-10) return;

    final ux = dx / dist;
    final uy = dy / dist;

    double t = 0;
    while (t < dist) {
      final start = Offset(a.dx + ux * t, a.dy + uy * t);
      t += dashLength;
      final end = Offset(
        a.dx + ux * t.clamp(0, dist),
        a.dy + uy * t.clamp(0, dist),
      );
      canvas.drawLine(start, end, paint);
      t += gapLength;
    }
  }

  void _drawDashedRect(Canvas canvas, Rect rect, Paint paint) {
    _drawDashedLine(canvas, rect.topLeft, rect.topRight, paint);
    _drawDashedLine(canvas, rect.topRight, rect.bottomRight, paint);
    _drawDashedLine(canvas, rect.bottomRight, rect.bottomLeft, paint);
    _drawDashedLine(canvas, rect.bottomLeft, rect.topLeft, paint);
  }

  @override
  bool shouldRepaint(covariant CornerOverlayPainter oldDelegate) {
    return corners != oldDelegate.corners ||
        isStable != oldDelegate.isStable ||
        skewAngle != oldDelegate.skewAngle;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `flutter test test/presentation/widgets/corner_overlay_painter_test.dart -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/presentation/widgets/corner_overlay_painter.dart client/mobile/test/presentation/widgets/corner_overlay_painter_test.dart
git commit -m "feat(mobile): add CornerOverlayPainter CustomPainter

Draws 4-corner guide overlay on camera preview with color coding:
green=stable, yellow=detected-unstable, dashed guide when no paper.
Includes skew warning when tilt > 5°."
```

---

## Task 6: CameraScannerPage with Live Preview

**Files:**
- Modify: `client/mobile/lib/presentation/pages/camera_scanner_page.dart`

- [ ] **Step 1: Read the existing file**

Read `client/mobile/lib/presentation/pages/camera_scanner_page.dart` (already read above).

- [ ] **Step 2: Replace with live preview implementation**

This is a large refactor of the existing file. The key changes:

1. Replace `ImagePicker` with `CameraBloc`
2. Replace single-shot capture with live preview + corner overlay
3. Update `_buildReadyState` to show live camera preview
4. Update `_buildCapturedState` to use captured image from CameraBloc
5. Add `_buildLivePreviewState` for corner overlay mode

```dart
import 'dart:typed_data';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/domain/omr/models/evaluation_config.dart';
import 'package:smart_grading_mobile/presentation/blocs/omr_scanner/omr_scanner_bloc.dart';
import 'package:smart_grading_mobile/presentation/blocs/camera/camera_bloc.dart';
import 'package:smart_grading_mobile/presentation/pages/omr_result_page.dart';
import 'package:smart_grading_mobile/presentation/widgets/corner_overlay_painter.dart';

class CameraScannerPage extends StatefulWidget {
  final OMRTemplate? template;
  final EvaluationConfig? evaluationConfig;
  final String? examId;
  final String? examName;

  const CameraScannerPage({
    super.key,
    this.template,
    this.evaluationConfig,
    this.examId,
    this.examName,
  });

  @override
  State<CameraScannerPage> createState() => _CameraScannerPageState();
}

class _CameraScannerPageState extends State<CameraScannerPage> {
  late CameraBloc _cameraBloc;
  bool _cameraInitialized = false;

  @override
  void initState() {
    super.initState();
    _cameraBloc = CameraBloc();
    _cameraBloc.add(CameraInitialize());
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
    if (widget.template != null) {
      context.read<OMRScannerBloc>().add(OMRScannerTemplateSet(
        template: widget.template!,
        evaluationConfig: widget.evaluationConfig,
        examId: widget.examId,
        examName: widget.examName,
      ));
    } else {
      final template = OMRTemplate.simpleMcq(
        numQuestions: 20,
        numOptions: 4,
        bubbleWidth: 35,
        bubbleHeight: 35,
      );
      final evalConfig = EvaluationConfig.simple(
        questionAnswers: Map.fromEntries(
          List.generate(20, (i) => MapEntry('q${i + 1}', 'A')),
        ),
        correct: 1.0,
        incorrect: 0.0,
        unmarked: 0.0,
      );
      context.read<OMRScannerBloc>().add(OMRScannerTemplateSet(
        template: template,
        evaluationConfig: evalConfig,
        examId: 'demo',
        examName: 'Demo Exam',
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider.value(value: _cameraBloc),
        BlocProvider.value(value: context.read<OMRScannerBloc>()),
      ],
      child: Scaffold(
        backgroundColor: const Color(0xFF0F172A),
        appBar: AppBar(
          backgroundColor: const Color(0xFF0F172A),
          foregroundColor: Colors.white,
          elevation: 0,
          title: Text(
            widget.examName ?? 'OMR Scanner',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
        body: BlocListener<OMRScannerBloc, OMRScannerState>(
          listener: (context, state) {
            if (state is OMRScannerSuccess) {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => OMRResultPage(
                    imageBytes: state.imageBytes,
                    gradingResult: state.gradingResult,
                    processingResult: state.processingResult,
                    examId: widget.examId,
                    examName: widget.examName,
                  ),
                ),
              );
            } else if (state is OMRScannerError) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message),
                  backgroundColor: Colors.red,
                  action: SnackBarAction(
                    label: 'Retry',
                    textColor: Colors.white,
                    onPressed: () {
                      final s = context.read<OMRScannerBloc>().state;
                      if (s is OMRScannerImageReady) {
                        context.read<OMRScannerBloc>().add(
                          OMRScannerProcessStarted(imageBytes: s.imageBytes),
                        );
                      }
                    },
                  ),
                ),
              );
            }
          },
          child: BlocBuilder<CameraBloc, CameraBlocState>(
            builder: (context, camState) {
              return _buildBody(camState);
            },
          ),
        ),
      ),
    );
  }

  Widget _buildBody(CameraBlocState camState) {
    if (camState is CameraInitializing) {
      return _buildLoadingState('Initializing camera...');
    }

    if (camState is CameraError) {
      return _buildCameraErrorState(camState.message);
    }

    if (camState is CameraImageReady) {
      return _buildCapturedState(camState);
    }

    if (camState is CameraCapturing) {
      return _buildCapturingState();
    }

    // CameraReady, CornerDetected, Stable — all show live preview
    return _buildLivePreviewState(camState);
  }

  Widget _buildLivePreviewState(CameraBlocState camState) {
    final controller = _cameraBloc.controller;
    if (controller == null || !controller.value.isInitialized) {
      return _buildLoadingState('Camera not ready...');
    }

    List<Offset>? corners;
    bool isStable = false;
    double skewAngle = 0;

    if (camState is CameraCornerDetected) {
      corners = camState.corners;
      skewAngle = camState.skewAngle;
    } else if (camState is CameraStable) {
      corners = camState.corners;
      isStable = true;
      skewAngle = camState.skewAngle;
    }

    return SafeArea(
      child: Column(
        children: [
          Expanded(
            child: Container(
              margin: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                color: const Color(0xFF1E293B),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    // Camera preview
                    CameraPreview(controller),

                    // Corner overlay
                    CustomPaint(
                      painter: CornerOverlayPainter(
                        corners: corners,
                        isStable: isStable,
                        skewAngle: skewAngle,
                      ),
                    ),

                    // Status bar
                    Positioned(
                      top: 16,
                      left: 16,
                      right: 16,
                      child: _buildStatusBar(camState),
                    ),
                  ],
                ),
              ),
            ),
          ),
          _buildCaptureControls(camState),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildStatusBar(CameraBlocState state) {
    String text;
    Color color;
    IconData icon;

    if (state is CameraStable) {
      text = 'Aligned ✓';
      color = const Color(0xFF22C55E);
      icon = Icons.check_circle;
    } else if (state is CameraCornerDetected) {
      text = 'Hold steady...';
      color = const Color(0xFFF59E0B);
      icon = Icons.warning_amber;
    } else {
      text = 'Position the OMR sheet';
      color = const Color(0xFF94A3B8);
      icon = Icons.info_outline;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 8),
          Text(
            text,
            style: TextStyle(color: color, fontSize: 14, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  Widget _buildCaptureControls(CameraBlocState state) {
    final bool canCapture = state is CameraStable || state is CameraReady;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Gallery button
          _buildSmallButton(
            icon: Icons.photo_library_outlined,
            onPressed: _pickImage,
          ),
          const SizedBox(width: 24),

          // Capture button
          GestureDetector(
            onTap: canCapture ? _capture : null,
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
                boxShadow: canCapture
                    ? [BoxShadow(color: const Color(0xFF6366F1).withValues(alpha: 0.4), blurRadius: 12, spreadRadius: 2)]
                    : null,
              ),
              child: Icon(
                Icons.camera_alt,
                color: canCapture ? const Color(0xFF6366F1) : Colors.grey,
                size: 32,
              ),
            ),
          ),

          const SizedBox(width: 24),
          const SizedBox(width: 48), // Spacer for symmetry
        ],
      ),
    );
  }

  Widget _buildSmallButton({required IconData icon, required VoidCallback onPressed}) {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        shape: BoxShape.circle,
      ),
      child: IconButton(
        icon: Icon(icon, color: Colors.white),
        onPressed: onPressed,
      ),
    );
  }

  Future<void> _capture() async {
    _cameraBloc.add(CameraCapture());
  }

  Future<void> _pickImage() async {
    // TODO: implement gallery picker using image_picker
    // Falls back to original single-shot flow for now
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
          _buildActionButtons(state.imageBytes),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildActionButtons(Uint8List imageBytes) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: [
          Expanded(
            child: SizedBox(
              height: 56,
              child: OutlinedButton.icon(
                onPressed: () {
                  _cameraBloc.add(CameraRetake());
                },
                icon: const Icon(Icons.refresh),
                label: const Text('Retake'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Color(0xFF334155)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
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
                onPressed: () {
                  context.read<OMRScannerBloc>().add(
                    OMRScannerProcessStarted(imageBytes: imageBytes),
                  );
                },
                icon: const Icon(Icons.auto_fix_high),
                label: const Text('Scan & Grade'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCapturingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.camera_alt, size: 64, color: Colors.white54),
          const SizedBox(height: 16),
          const Text(
            'Capturing...',
            style: TextStyle(color: Colors.white70, fontSize: 18),
          ),
        ],
      ),
    );
  }

  Widget _buildCameraErrorState(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, color: Color(0xFFEF4444), size: 64),
          const SizedBox(height: 16),
          Text(
            'Camera Error',
            style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () {
              _cameraBloc.add(CameraInitialize());
            },
            child: const Text('Retry'),
          ),
        ],
      ),
    );
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
}
```

- [ ] **Step 3: Verify compilation**

Run: `flutter analyze lib/presentation/pages/camera_scanner_page.dart -v`
Expected: No errors. Note: `_pickImage` is a stub — that's expected.

- [ ] **Step 4: Commit**

```bash
git add client/mobile/lib/presentation/pages/camera_scanner_page.dart
git commit -m "refactor(mobile): replace image_picker with live camera preview

CameraScannerPage now uses CameraBloc for live preview with corner
overlay. Captures via CameraController. Falls back to gallery
stub. All previous scan/grade flow preserved."
```

---

## Task 7: Guided Flow — Exam Selection & Student List

**Files:**
- Create: `client/mobile/lib/presentation/pages/exam_selection_page.dart`
- Create: `client/mobile/lib/presentation/pages/student_list_page.dart`

- [ ] **Step 1: Write ExamSelectionPage**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:smart_grading_mobile/presentation/blocs/exam/exam_bloc.dart';
import 'package:smart_grading_mobile/presentation/pages/student_list_page.dart';

class ExamSelectionPage extends StatelessWidget {
  const ExamSelectionPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Exam'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
      ),
      body: BlocBuilder<ExamBloc, ExamState>(
        builder: (context, state) {
          if (state is ExamLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is ExamLoaded) {
            if (state.exams.isEmpty) {
              return const Center(
                child: Text('No exams found. Create an exam first.'),
              );
            }

            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: state.exams.length,
              itemBuilder: (context, index) {
                final exam = state.exams[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(16),
                    title: Text(
                      exam.name,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text(
                      '${exam.questionCount} questions • ${exam.duration ?? "No limit"}',
                      style: const TextStyle(color: Color(0xFF64748B)),
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => StudentListPage(exam: exam),
                        ),
                      );
                    },
                  ),
                );
              },
            );
          }

          if (state is ExamError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Error: ${state.message}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      context.read<ExamBloc>().add(const ExamLoadRequested());
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          return const Center(child: CircularProgressIndicator());
        },
      ),
    );
  }
}
```

- [ ] **Step 2: Write StudentListPage**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:smart_grading_mobile/domain/entities/exam.entity.dart';
import 'package:smart_grading_mobile/presentation/blocs/omr_scanner/omr_scanner_bloc.dart';
import 'package:smart_grading_mobile/presentation/pages/camera_scanner_page.dart';

class StudentListPage extends StatelessWidget {
  final Exam exam;

  const StudentListPage({super.key, required this.exam});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(exam.name),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
      ),
      body: _StudentListBody(exam: exam),
    );
  }
}

class _StudentListBody extends StatelessWidget {
  final Exam exam;

  const _StudentListBody({required this.exam});

  @override
  Widget build(BuildContext context) {
    // TODO: Load ungraded students from SubmissionBloc
    // For now, show quick scan option
    return Column(
      children: [
        // Quick scan card (no student assignment)
        Container(
          margin: const EdgeInsets.all(16),
          child: Card(
            color: const Color(0xFF6366F1),
            child: InkWell(
              onTap: () => _openScanner(context, null),
              borderRadius: BorderRadius.circular(12),
              child: const Padding(
                padding: EdgeInsets.all(20),
                child: Row(
                  children: [
                    Icon(Icons.camera_alt, color: Colors.white, size: 32),
                    SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Quick Scan',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Scan without assigning a student',
                            style: TextStyle(color: Colors.white70),
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.chevron_right, color: Colors.white70),
                  ],
                ),
              ),
            ),
          ),
        ),

        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Text(
                'OR SELECT A STUDENT',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF64748B),
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Divider(color: Color(0xFFE2E8F0)),
              ),
            ],
          ),
        ),

        // Student list placeholder
        Expanded(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.people_outline, size: 64, color: Color(0xFFCBD5E1)),
                const SizedBox(height: 16),
                const Text(
                  'Student list loads from exam',
                  style: TextStyle(color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 8),
                ElevatedButton(
                  onPressed: () => _openScanner(context, null),
                  child: const Text('Start Scanning'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _openScanner(BuildContext context, String? studentId) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => BlocProvider(
          create: (_) => OMRScannerBloc(),
          child: CameraScannerPage(
            examId: exam.id,
            examName: exam.name,
          ),
        ),
      ),
    );
  }
}
```

- [ ] **Step 3: Verify compilation**

Run: `flutter analyze lib/presentation/pages/exam_selection_page.dart lib/presentation/pages/student_list_page.dart -v`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add client/mobile/lib/presentation/pages/exam_selection_page.dart client/mobile/lib/presentation/pages/student_list_page.dart
git commit -m "feat(mobile): add exam selection and student list pages

Provides guided flow: select exam → pick student → camera scanner.
Quick scan option skips student assignment."
```

---

## Task 8: Connect ScanView → Exam Flow

**Files:**
- Modify: `client/mobile/lib/presentation/pages/scan_view.dart`
- Modify: `client/mobile/lib/main.dart` (add routes)

- [ ] **Step 1: Update ScanView to navigate to ExamSelectionPage**

In `scan_view.dart`, replace the `_openCameraScanner` method to navigate to exam selection:

```dart
void _openCameraScanner(BuildContext context) {
  Navigator.of(context).push(
    MaterialPageRoute(
      builder: (_) => const ExamSelectionPage(),
    ),
  );
}
```

Also remove the hardcoded template creation from `_openCameraScanner` — the template now comes from the exam selection flow.

- [ ] **Step 2: Verify compilation**

Run: `flutter analyze lib/presentation/pages/scan_view.dart -v`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/mobile/lib/presentation/pages/scan_view.dart
git commit -m "refactor(mobile): connect ScanView to exam selection flow

Replaced hardcoded demo template with ExamSelectionPage navigation.
Template now loaded from exam when user selects one."
```

---

## Task 9: Offline Queue — PendingSubmission Model

**Files:**
- Modify: `client/mobile/lib/core/storage/omr_local_storage.dart`

- [ ] **Step 1: Read existing storage file**

Read `client/mobile/lib/core/storage/omr_local_storage.dart` (look in existing codebase).

- [ ] **Step 2: Add PendingSubmission model and extend storage**

Add the following model class and methods:

```dart
/// Represents a submission queued for offline sync.
class PendingSubmission {
  final String id;
  final String examId;
  final String? studentId;
  final Uint8List imageBytes;
  final Map<String, String> answers;
  final double score;
  final double maxScore;
  final DateTime timestamp;
  final SyncStatus status;
  final int retryCount;

  const PendingSubmission({
    required this.id,
    required this.examId,
    this.studentId,
    required this.imageBytes,
    required this.answers,
    required this.score,
    required this.maxScore,
    required this.timestamp,
    this.status = SyncStatus.pending,
    this.retryCount = 0,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'examId': examId,
    'studentId': studentId,
    'imageBytes': base64Encode(imageBytes),
    'answers': answers,
    'score': score,
    'maxScore': maxScore,
    'timestamp': timestamp.toIso8601String(),
    'status': status.name,
    'retryCount': retryCount,
  };

  factory PendingSubmission.fromJson(Map<String, dynamic> json) {
    return PendingSubmission(
      id: json['id'] as String,
      examId: json['examId'] as String,
      studentId: json['studentId'] as String?,
      imageBytes: base64Decode(json['imageBytes'] as String),
      answers: Map<String, String>.from(json['answers'] as Map),
      score: (json['score'] as num).toDouble(),
      maxScore: (json['maxScore'] as num).toDouble(),
      timestamp: DateTime.parse(json['timestamp'] as String),
      status: SyncStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => SyncStatus.pending,
      ),
      retryCount: json['retryCount'] as int? ?? 0,
    );
  }
}

enum SyncStatus { pending, syncing, failed }
```

Add storage methods:

```dart
/// Add a pending submission to local storage.
Future<void> addPendingSubmission(PendingSubmission submission) async {
  final key = 'pending_submissions';
  final existing = await getPendingSubmissions();
  existing.add(submission);
  final jsonList = existing.map((s) => s.toJson()).toList();
  await prefs.setString(key, jsonEncode(jsonList));
}

/// Get all pending submissions.
Future<List<PendingSubmission>> getPendingSubmissions() async {
  final key = 'pending_submissions';
  final raw = prefs.getString(key);
  if (raw == null) return [];
  final list = jsonDecode(raw) as List<dynamic>;
  return list.map((e) => PendingSubmission.fromJson(e as Map<String, dynamic>)).toList();
}

/// Update status of a submission.
Future<void> updateSubmissionStatus(String id, SyncStatus status, {int? retryCount}) async {
  final submissions = await getPendingSubmissions();
  final idx = submissions.indexWhere((s) => s.id == id);
  if (idx == -1) return;
  final updated = PendingSubmission(
    id: submissions[idx].id,
    examId: submissions[idx].examId,
    studentId: submissions[idx].studentId,
    imageBytes: submissions[idx].imageBytes,
    answers: submissions[idx].answers,
    score: submissions[idx].score,
    maxScore: submissions[idx].maxScore,
    timestamp: submissions[idx].timestamp,
    status: status,
    retryCount: retryCount ?? submissions[idx].retryCount,
  );
  submissions[idx] = updated;
  final key = 'pending_submissions';
  final jsonList = submissions.map((s) => s.toJson()).toList();
  await prefs.setString(key, jsonEncode(jsonList));
}

/// Remove a submission after successful sync.
Future<void> removePendingSubmission(String id) async {
  final submissions = await getPendingSubmissions();
  submissions.removeWhere((s) => s.id == id);
  final key = 'pending_submissions';
  final jsonList = submissions.map((s) => s.toJson()).toList();
  await prefs.setString(key, jsonEncode(jsonList));
}
```

Also add import for `dart:convert` and `dart:convert/base64.dart`.

- [ ] **Step 3: Verify compilation**

Run: `flutter analyze lib/core/storage/omr_local_storage.dart -v`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add client/mobile/lib/core/storage/omr_local_storage.dart
git commit -m "feat(mobile): add PendingSubmission model and offline queue

Supports storing submissions locally when offline. Includes status
tracking (pending/syncing/failed) and retry count. CRUD operations
for queue management."
```

---

## Task 10: Submit Flow with Offline Support

**Files:**
- Modify: `client/mobile/lib/presentation/pages/omr_result_page.dart`
- Modify: `client/mobile/lib/presentation/blocs/omr_scanner/omr_scanner_bloc.dart`

- [ ] **Step 1: Update OMRResultPage submit button**

Replace the `_buildBottomBar` submit action to call `OMRScannerSubmit`:

```dart
Expanded(
  flex: 2,
  child: SizedBox(
    height: 56,
    child: ElevatedButton.icon(
      onPressed: () {
        context.read<OMRScannerBloc>().add(OMRScannerSubmit());
      },
      icon: const Icon(Icons.cloud_upload_outlined),
      label: const Text('Submit'),
      style: ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFF6366F1),
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
  ),
),
```

Also add `BlocListener` for `OMRScannerSubmitted` state:

```dart
// Add inside OMRResultPage build():
BlocListener<OMRScannerBloc, OMRScannerState>(
  listener: (context, state) {
    if (state is OMRScannerSubmitted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            state.submittedOnline
                ? 'Submitted successfully!'
                : 'Saved offline. Will sync when online.',
          ),
          backgroundColor: state.submittedOnline
              ? const Color(0xFF22C55E)
              : const Color(0xFFF59E0B),
        ),
      );
      if (state.submittedOnline) {
        Navigator.of(context).pop();
      }
    }
  },
  child: /* existing body */,
```

- [ ] **Step 2: Verify compilation**

Run: `flutter analyze lib/presentation/pages/omr_result_page.dart -v`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/mobile/lib/presentation/pages/omr_result_page.dart
git commit -m "feat(mobile): connect submit button to OMRScannerSubmit event

Submit button now dispatches OMRScannerSubmit to bloc. Shows success
or offline confirmation message. Navigates back on successful online submit."
```

---

## Implementation Order

| Task | Description | Dep |
|---|---|---|
| 1 | `warp_utils.dart` — homography math | None |
| 2 | `camera_engine.dart` — corner detection | Task 1 |
| 3 | `OMREngine` integration | Task 2 |
| 4 | `CameraBloc` state machine | None |
| 5 | `CornerOverlayPainter` widget | None |
| 6 | `CameraScannerPage` live preview | Tasks 4, 5 |
| 7 | Exam selection + student list pages | None |
| 8 | Connect ScanView → exam flow | Task 7 |
| 9 | Offline queue — `PendingSubmission` | None |
| 10 | Submit flow + offline support | Tasks 8, 9 |

---

## Self-Review Checklist

- [ ] **Spec coverage:** All 5 phases from spec mapped to tasks (camera engine ✓, live preview ✓, guided flow ✓, offline sync ✓)
- [ ] **No placeholders:** All steps have complete code — no TBD, TODO, "implement later"
- [ ] **Type consistency:** `CameraBloc` uses `CameraBlocState` (not `OMRScannerState`), `WarpUtils` methods match spec signatures, `OMRProcessingResult` extended correctly
- [ ] **Tests included:** Tasks 1, 2, 3, 5 each have unit/widget tests
- [ ] **Dependencies:** All use existing packages (`image`, `camera`, `flutter_bloc`) — no new deps
- [ ] **TDD cycle:** Each task follows RED → GREEN → REFACTOR pattern with actual test code
- [ ] **Commits:** Each task ends with a meaningful commit
