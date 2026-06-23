import 'package:opencv_dart/opencv_dart.dart' as cv;

class BubbleCoords {
  final int x, y, w, h;
  BubbleCoords(this.x, this.y, this.w, this.h);
}

class OmrBubbleDetector {
  static const double darkThreshold = 0.6;

  Future<bool> isBubbleMarked(cv.Mat image, BubbleCoords coords) async {
    final roi = cv.getRectSubPix(
      image,
      (coords.w, coords.h),
      cv.Point2f((coords.x + coords.w / 2).toDouble(), (coords.y + coords.h / 2).toDouble()),
    );

    final mean = cv.mean(roi);
    roi.dispose();

    final normalized = mean.val[0] / 255.0;
    return normalized < darkThreshold;
  }

  Future<String> detectStudentId(
    cv.Mat image,
    List<BubbleCoords> digitCoords,
  ) async {
    final buffer = StringBuffer();
    final sorted = List<BubbleCoords>.from(digitCoords)
      ..sort((a, b) {
        final yDiff = a.y.compareTo(b.y);
        if (yDiff != 0) return yDiff;
        return a.x.compareTo(b.x);
      });

    for (int pos = 0; pos < sorted.length; pos++) {
      final coord = sorted[pos];
      final marked = await isBubbleMarked(image, coord);
      if (marked) {
        buffer.write(pos.toString());
      }
    }
    return buffer.toString();
  }

  Future<String?> detectVersionCode(
    cv.Mat image,
    List<BubbleCoords> digitCoords,
  ) async {
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
        final marked = await isBubbleMarked(image, coords);
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
      final answer = await detectQuestionAnswer(image, options);
      if (answer != null) {
        results[qId] = answer;
      }
    }
    return results;
  }
}
