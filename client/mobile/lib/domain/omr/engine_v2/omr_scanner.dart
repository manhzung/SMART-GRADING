import 'dart:typed_data';
import 'package:opencv_dart/opencv_dart.dart' as cv;
import 'omr_image_processor.dart';
import 'omr_bubble_detector.dart';
import 'omr_template.dart';
import 'omr_models.dart';

class OmrScanner {
  final OmrImageProcessor _processor = OmrImageProcessor();
  final OmrBubbleDetector _detector = OmrBubbleDetector();

  Future<OmrScanResult> scan({
    required List<int> imageBytes,
    required OmrTemplate template,
  }) async {
    final sw = Stopwatch()..start();
    final steps = <String>[];

    steps.add('decode');
    final bytes = Uint8List.fromList(imageBytes);
    final input = cv.imdecode(bytes, cv.IMREAD_COLOR);
    if (input.rows == 0) {
      throw Exception('Failed to decode image');
    }

    steps.add('preprocess');
    final gray = cv.cvtColor(input, cv.COLOR_BGR2GRAY);
    input.dispose();
    final binary = await _processor.binarize(gray);
    gray.dispose();

    steps.add('detect_student_id');
    final studentId = await _detector.detectStudentId(
      binary,
      template.studentIdCoords
          .map((c) => BubbleCoords(c.x, c.y, c.w, c.h))
          .toList(),
    );

    steps.add('detect_version');
    final versionCode = await _detector.detectVersionCode(
      binary,
      template.versionCodeCoords
          .map((c) => BubbleCoords(c.x, c.y, c.w, c.h))
          .toList(),
    );

    steps.add('detect_answers');
    final answersTemplate = template.answers.map(
      (qId, opts) => MapEntry(
        qId,
        opts.map((k, v) => MapEntry(k, BubbleCoords(v.x, v.y, v.w, v.h))),
      ),
    );
    final answers = await _detector.detectAllAnswers(binary, answersTemplate);

    binary.dispose();
    sw.stop();

    return OmrScanResult(
      studentId: studentId,
      versionCode: versionCode ?? '',
      answers: answers,
      processingTime: sw.elapsed,
      processingSteps: steps,
    );
  }
}
