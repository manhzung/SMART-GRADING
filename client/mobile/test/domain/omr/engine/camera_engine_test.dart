import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'package:smart_grading_mobile/domain/omr/engine/camera_engine.dart';

void main() {
  group('CameraEngine', () {
    late CameraEngine engine;

    setUp(() {
      engine = CameraEngine();
    });

    test('detectCorners returns null for blank white image', () async {
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

    test('detectCorners returns null for black image', () async {
      final image = img.Image(width: 500, height: 500);
      final bytes = Uint8List.fromList(img.encodeJpg(image));
      final corners = await engine.detectCorners(bytes);
      expect(corners, isNull);
    });

    test('perspectiveWarp returns null when corners is null', () async {
      final image = img.Image(width: 200, height: 300);
      final bytes = Uint8List.fromList(img.encodeJpg(image));
      final result = await engine.perspectiveWarp(bytes, null, 2480, 3508);
      expect(result, isNull);
    });

    test('perspectiveWarp produces output at target dimensions', () async {
      final image = img.Image(width: 200, height: 300, numChannels: 3);
      for (int y = 0; y < 300; y++) {
        for (int x = 0; x < 200; x++) {
          image.setPixel(x, y, img.ColorRgb8(x % 256, y % 256, 128));
        }
      }
      final bytes = Uint8List.fromList(img.encodeJpg(image));

      // Identity warp corners = full image bounds
      final corners = [
        const Offset(0, 0),
        const Offset(200, 0),
        const Offset(200, 300),
        const Offset(0, 300),
      ];

      final result = await engine.perspectiveWarp(bytes, corners, 100, 150);
      expect(result, isNotNull);
      final decoded = img.decodeImage(result!);
      expect(decoded, isNotNull);
    });
  });
}
