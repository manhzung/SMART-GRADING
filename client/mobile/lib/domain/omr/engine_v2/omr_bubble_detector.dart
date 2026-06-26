import 'package:flutter/foundation.dart';
import 'package:opencv_dart/opencv_dart.dart' as cv;

class BubbleCoords {
  final int x, y, w, h;
  BubbleCoords(this.x, this.y, this.w, this.h);

  /// PDF coordinates are relative to template, not absolute
  /// x, y are from top-left of the actual cropped image
  int get cvCenterX => x + w ~/ 2;
  int get cvCenterY => y + h ~/ 2;
}

class OmrBubbleDetector {
  static const double darkThreshold = 0.6;

  OmrBubbleDetector();

  Future<bool> isBubbleMarked(cv.Mat image, BubbleCoords coords, {String? label}) async {
    // Use actual image dimensions for coordinate conversion
    // Formula matches overlay: cvY = actualHeight - pdfY - h/2
    final actualHeight = image.rows;
    final actualWidth = image.cols;
    final cvX = coords.x + coords.w ~/ 2;
    final cvY = actualHeight - coords.y - coords.h ~/ 2;

    debugPrint('ENGINEv2 isBubbleMarked: label=$label, image=${actualWidth}x${actualHeight}, pdfCoords=(${coords.x},${coords.y}), cvCoords=($cvX,$cvY), size=${coords.w}x${coords.h}');

    final roi = cv.getRectSubPix(
      image,
      (coords.w, coords.h),
      cv.Point2f(cvX.toDouble(), cvY.toDouble()),
    );

    final mean = cv.mean(roi);
    roi.dispose();

    final normalized = mean.val[0] / 255.0;
    debugPrint('ENGINEv2 isBubbleMarked: label=$label, mean=${mean.val[0]}, normalized=$normalized, marked=${normalized < darkThreshold}');
    return normalized < darkThreshold;
  }

  Future<String> detectStudentId(
    cv.Mat image,
    List<BubbleCoords> digitCoords,
  ) async {
    debugPrint('ENGINEv2 detectStudentId: ${digitCoords.length} digit positions');
    final buffer = StringBuffer();
    final sorted = List<BubbleCoords>.from(digitCoords)
      ..sort((a, b) {
        final yDiff = a.y.compareTo(b.y);
        if (yDiff != 0) return yDiff;
        return a.x.compareTo(b.x);
      });

    for (int pos = 0; pos < sorted.length; pos++) {
      final coord = sorted[pos];
      final marked = await isBubbleMarked(image, coord, label: 'studentId_$pos');
      if (marked) {
        buffer.write(pos.toString());
      }
    }
    debugPrint('ENGINEv2 detectStudentId result: ${buffer.toString()}');
    return buffer.toString();
  }

  Future<String?> detectVersionCode(
    cv.Mat image,
    List<BubbleCoords> digitCoords,
  ) async {
    debugPrint('ENGINEv2 detectVersionCode: ${digitCoords.length} digit positions');
    return detectStudentId(image, digitCoords);
  }

  Future<String?> detectQuestionAnswer(
    cv.Mat image,
    Map<String, BubbleCoords> optionCoords,
  ) async {
    final options = ['A', 'B', 'C', 'D'];
    for (final option in options) {
      final coords = optionCoords[option];
      if (coords != null) {
        final marked = await isBubbleMarked(image, coords, label: 'option_$option');
        if (marked) {
          return option;
        }
      }
    }
    return null;
  }

  Future<Map<String, String>> detectAllAnswers(
    cv.Mat image,
    Map<String, Map<String, BubbleCoords>> answersTemplate,
  ) async {
    final results = <String, String>{};
    final qIds = answersTemplate.keys.toList()..sort();
    for (final qId in qIds) {
      final options = answersTemplate[qId]!;
      debugPrint('ENGINEv2 detectAllAnswers: processing q=$qId');
      final answer = await detectQuestionAnswer(image, options);
      if (answer != null) {
        results[qId] = answer;
        debugPrint('ENGINEv2 detectAllAnswers: q=$qId, answer=$answer');
      }
    }
    debugPrint('ENGINEv2 detectAllAnswers result: $results');
    return results;
  }
}
