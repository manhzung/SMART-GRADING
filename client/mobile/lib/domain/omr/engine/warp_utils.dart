import 'dart:typed_data';
import 'dart:ui';
import 'package:image/image.dart' as img;

/// Homography and perspective warp utilities for camera scanning.
/// Provides math for perspective transformation needed by OMR scanning.
class WarpUtils {
  /// Compute 3x3 homography matrix using Direct Linear Transform (DLT).
  /// src[i] maps to dst[i] for i=0..3 (4 point correspondences).
  /// Returns Float64List of length 9 (row-major 3x3 matrix).
  static Float64List computeHomography(List<Offset> src, List<Offset> dst) {
    if (src.length != 4 || dst.length != 4) {
      throw ArgumentError('src and dst must have exactly 4 points');
    }

    // Build 8x8 A matrix for DLT with constraint h8 = 1
    // Original DLT: a[i][j] * h[j] = 0 for i=0..7, j=0..8
    // With h8 = 1, we rearrange to: a[i][j] * h[j] = -a[i][8] for j=0..7
    final a = List.generate(8, (_) => List.filled(8, 0.0));
    final b = List<double>.filled(8, 0.0);

    for (int i = 0; i < 4; i++) {
      final sx = src[i].dx;
      final sy = src[i].dy;
      final dx = dst[i].dx;
      final dy = dst[i].dy;

      // Row 2i: sx*h0 + sy*h1 + 1*h2 + 0 + 0 + 0 + (-sx*dx)*h6 + (-sy*dx)*h7 = dx
      a[i * 2][0] = sx;
      a[i * 2][1] = sy;
      a[i * 2][2] = 1.0;
      a[i * 2][6] = -sx * dx;
      a[i * 2][7] = -sy * dx;
      b[i * 2] = dx;

      // Row 2i+1: 0 + 0 + 0 + sx*h3 + sy*h4 + 1*h5 + (-sx*dy)*h6 + (-sy*dy)*h7 = dy
      a[i * 2 + 1][3] = sx;
      a[i * 2 + 1][4] = sy;
      a[i * 2 + 1][5] = 1.0;
      a[i * 2 + 1][6] = -sx * dy;
      a[i * 2 + 1][7] = -sy * dy;
      b[i * 2 + 1] = dy;
    }

    // Solve 8x8 system using Gaussian elimination with partial pivoting
    _solveLinearSystem(a, b);

    // Extract solution
    final h = Float64List(9);
    h[0] = b[0];
    h[1] = b[1];
    h[2] = b[2];
    h[3] = b[3];
    h[4] = b[4];
    h[5] = b[5];
    h[6] = b[6];
    h[7] = b[7];
    h[8] = 1.0;

    return h;
  }

  /// Solve Ax = b using Gaussian elimination with partial pivoting.
  static void _solveLinearSystem(List<List<double>> a, List<double> b) {
    const n = 8;

    // Forward elimination with partial pivoting
    for (int col = 0; col < n; col++) {
      // Find pivot
      int maxRow = col;
      for (int row = col + 1; row < n; row++) {
        if (a[row][col].abs() > a[maxRow][col].abs()) {
          maxRow = row;
        }
      }

      // Swap rows in A and b
      final tempRow = a[col];
      a[col] = a[maxRow];
      a[maxRow] = tempRow;
      final tempB = b[col];
      b[col] = b[maxRow];
      b[maxRow] = tempB;

      // Eliminate column
      for (int row = col + 1; row < n; row++) {
        if (a[col][col].abs() < 1e-12) continue;
        final factor = a[row][col] / a[col][col];
        for (int j = col; j < n; j++) {
          a[row][j] -= factor * a[col][j];
        }
        b[row] -= factor * b[col];
      }
    }

    // Back substitution
    for (int row = n - 1; row >= 0; row--) {
      if (a[row][row].abs() < 1e-12) continue;
      for (int j = row + 1; j < n; j++) {
        b[row] -= a[row][j] * b[j];
      }
      b[row] /= a[row][row];
    }
  }

  /// Apply homography matrix M to point pt.
  static Offset applyHomography(Float64List M, Offset pt) {
    final x = pt.dx;
    final y = pt.dy;
    var w = M[6] * x + M[7] * y + M[8];
    if (w == 0) w = 1e-10;
    return Offset(
      (M[0] * x + M[1] * y + M[2]) / w,
      (M[3] * x + M[4] * y + M[5]) / w,
    );
  }

  /// Warp source image to target dimensions using homography M.
  /// Computes inverse matrix and uses nearest-neighbor sampling.
  static img.Image warpPerspective(
      img.Image src, Float64List M, int targetWidth, int targetHeight) {
    // Compute inverse of M
    final mInverse = _invertHomography(M);

    final dst = img.Image(width: targetWidth, height: targetHeight);

    for (int y = 0; y < targetHeight; y++) {
      for (int x = 0; x < targetWidth; x++) {
        // Map output pixel back to source
        final srcPt = applyHomography(mInverse, Offset(x.toDouble(), y.toDouble()));

        final srcX = srcPt.dx.round();
        final srcY = srcPt.dy.round();

        // Nearest-neighbor sampling
        if (srcX >= 0 && srcX < src.width && srcY >= 0 && srcY < src.height) {
          dst.setPixel(x, y, src.getPixel(srcX, srcY));
        }
      }
    }

    return dst;
  }

  static Float64List _invertHomography(Float64List M) {
    // Compute 3x3 matrix inverse using cofactor method
    final a = M[0], b = M[1], c = M[2];
    final d = M[3], e = M[4], f = M[5];
    final g = M[6], h = M[7], i = M[8];

    // Determinant
    final det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    if (det.abs() < 1e-10) {
      return Float64List.fromList([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    }

    final invDet = 1.0 / det;

    return Float64List.fromList([
      (e * i - f * h) * invDet,
      (c * h - b * i) * invDet,
      (b * f - c * e) * invDet,
      (f * g - d * i) * invDet,
      (a * i - c * g) * invDet,
      (c * d - a * f) * invDet,
      (d * h - e * g) * invDet,
      (b * g - a * h) * invDet,
      (a * e - b * d) * invDet,
    ]);
  }

  /// Order 4 corner points into TL, TR, BR, BL.
  /// Sorts by sum (x+y): smallest=TL, largest=BR.
  /// Among middle two, the one with smaller x is BL.
  static List<Offset> orderCorners(List<Offset> corners) {
    if (corners.length != 4) {
      throw ArgumentError('corners must have exactly 4 points');
    }

    // Sort by x+y sum
    final sorted = List<Offset>.from(corners);
    sorted.sort((a, b) => (a.dx + a.dy).compareTo(b.dx + b.dy));

    // TL is smallest sum, BR is largest sum
    final tl = sorted[0];
    final br = sorted[3];

    // Middle two: smaller x is BL (left), larger x is TR (right)
    final m1 = sorted[1];
    final m2 = sorted[2];

    final Offset bl, tr;
    if (m1.dx <= m2.dx) {
      bl = m1;
      tr = m2;
    } else {
      bl = m2;
      tr = m1;
    }

    return [tl, tr, br, bl];
  }

  /// Build target corners for perspective warp.
  /// Given ordered TL, TR, BR, BL and desired output width/height.
  static List<Offset> buildTargetCorners(
      List<Offset> orderedSrc, int targetWidth, int targetHeight) {
    return [
      const Offset(0, 0),
      Offset(targetWidth.toDouble(), 0),
      Offset(targetWidth.toDouble(), targetHeight.toDouble()),
      Offset(0, targetHeight.toDouble()),
    ];
  }
}
