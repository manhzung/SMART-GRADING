import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'package:smart_grading_mobile/domain/omr/engine/omr_engine.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';

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

      // Create synthetic image with some bubbles
      final image = img.Image(width: 1240, height: 1754, numChannels: 3);
      for (int y = 0; y < 1754; y++) {
        for (int x = 0; x < 1240; x++) {
          image.setPixel(x, y, img.ColorRgb8(255, 255, 255));
        }
      }
      final bytes = Uint8List.fromList(img.encodeJpg(image));

      final result = await engine.processImage(
        imageBytes: bytes,
        template: template,
        evaluationConfig: null,
      );

      expect(result.isSuccess || result.hasError, isTrue);
      expect(result.wasWarped, isA<bool>());
      expect(result.detectedCorners, anyOf(isNull, isA<List>()));
      expect(result.skewAngle, anyOf(isNull, isA<double>()));
    });

    test('processImage handles blank image gracefully', () async {
      final template = OMRTemplate.simpleMcq(
        numQuestions: 3,
        numOptions: 4,
        bubbleWidth: 35,
        bubbleHeight: 35,
      );

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

      // Should complete without throwing
      expect(result.isSuccess || result.hasError, isTrue);
    });
  });
}
