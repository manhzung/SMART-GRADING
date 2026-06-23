import 'package:opencv_dart/opencv_dart.dart' as cv;

class OmrImageProcessor {
  Future<cv.Mat> binarize(cv.Mat image, {double threshold = 0.5}) async {
    final gray = cv.cvtColor(image, cv.COLOR_BGR2GRAY);
    final binary = cv.adaptiveThreshold(
      gray,
      255.0,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      11,
      2.0,
    );
    gray.dispose();
    return binary;
  }

  Future<cv.Mat> cropRegion(cv.Mat image, int x, int y, int w, int h) async {
    return cv.getRectSubPix(
      image,
      (w, h),
      cv.Point2f((x + w / 2).toDouble(), (y + h / 2).toDouble()),
    );
  }

  Future<cv.Mat> resizeToStandard(cv.Mat image) async {
    return cv.resize(image, (2480, 3508));
  }
}
