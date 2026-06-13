import 'dart:typed_data';
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
      final corners = [
        const Offset(100, 200),
        const Offset(0, 0),
        const Offset(0, 200),
        const Offset(100, 0),
      ];
      final ordered = WarpUtils.orderCorners(corners);
      // TL has smallest sum (x+y), BR has largest sum
      expect(ordered[0].dx + ordered[0].dy, lessThan(ordered[1].dx + ordered[1].dy));
      expect(ordered[3].dx + ordered[3].dy, lessThan(ordered[2].dx + ordered[2].dy));
    });

    test('computeHomography correctly maps identity transform', () {
      final src = [
        const Offset(0, 0),
        const Offset(100, 0),
        const Offset(100, 100),
        const Offset(0, 100),
      ];
      final dst = [
        const Offset(0, 0),
        const Offset(100, 0),
        const Offset(100, 100),
        const Offset(0, 100),
      ];
      final M = WarpUtils.computeHomography(src, dst);

      // Apply homography to each source point — should map to destination
      for (int i = 0; i < 4; i++) {
        final mapped = WarpUtils.applyHomography(M, src[i]);
        expect(mapped.dx, closeTo(dst[i].dx, 1.0));
        expect(mapped.dy, closeTo(dst[i].dy, 1.0));
      }
    });
  });
}
