import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'package:smart_grading_mobile/domain/omr/models/grading_result.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_response.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/domain/omr/engine/omr_engine.dart';
import 'package:smart_grading_mobile/presentation/widgets/omr_bubble_overlay.dart';

void main() {
  OMRProcessingResult makeResult({
    Map<String, List<BubbleIntensity>>? bubbleIntensities,
    double globalThreshold = 120.0,
  }) {
    return OMRProcessingResult(
      template: OMRTemplate.simpleMcq(
        numQuestions: 5,
        numOptions: 4,
        bubbleWidth: 35,
        bubbleHeight: 35,
      ),
      gradingResult: OMRGradingResult.empty(),
      response: OMRResponseDebug(
        answers: {'q1': 'A'},
        bubbleIntensities: bubbleIntensities ?? {},
        globalThreshold: globalThreshold,
        localThresholds: {'q1': 115.0},
      ),
      processingTime: const Duration(milliseconds: 500),
      processingSteps: [],
      wasWarped: true,
    );
  }

  testWidgets('renders without crashing', (tester) async {
    final img.Image testImage = img.Image(width: 100, height: 100);
    final bytes = Uint8List.fromList(img.encodePng(testImage));

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: OMRBubbleOverlay(
          imageBytes: bytes,
          imageWidth: 100,
          imageHeight: 100,
          result: makeResult(),
        ),
      ),
    ));

    expect(find.byType(OMRBubbleOverlay), findsOneWidget);
    expect(find.byType(InteractiveViewer), findsOneWidget);
  });

  testWidgets('displays legend', (tester) async {
    final img.Image testImage = img.Image(width: 100, height: 100);
    final bytes = Uint8List.fromList(img.encodePng(testImage));

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: OMRBubbleOverlay(
          imageBytes: bytes,
          imageWidth: 100,
          imageHeight: 100,
          result: makeResult(),
        ),
      ),
    ));

    expect(find.text('MARKED'), findsOneWidget);
    expect(find.text('UNMARKED'), findsOneWidget);
  });

  testWidgets('displays global threshold in legend', (tester) async {
    final img.Image testImage = img.Image(width: 100, height: 100);
    final bytes = Uint8List.fromList(img.encodePng(testImage));

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: OMRBubbleOverlay(
          imageBytes: bytes,
          imageWidth: 100,
          imageHeight: 100,
          result: makeResult(globalThreshold: 120.0),
        ),
      ),
    ));

    expect(find.textContaining('120'), findsOneWidget);
  });

  testWidgets('renders bubble indicators from bubbleIntensities data', (tester) async {
    final img.Image testImage = img.Image(width: 200, height: 200);
    final bytes = Uint8List.fromList(img.encodePng(testImage));

    final result = OMRProcessingResult(
      template: OMRTemplate.simpleMcq(
        numQuestions: 5,
        numOptions: 4,
        bubbleWidth: 35,
        bubbleHeight: 35,
      ),
      gradingResult: OMRGradingResult.empty(),
      response: OMRResponseDebug(
        answers: {'q1': 'A', 'q2': 'B'},
        bubbleIntensities: {
          'q1': [
            BubbleIntensity(bubbleValue: 'A', meanIntensity: 50.0, isMarked: true),
            BubbleIntensity(bubbleValue: 'B', meanIntensity: 200.0, isMarked: false),
            BubbleIntensity(bubbleValue: 'C', meanIntensity: 180.0, isMarked: false),
            BubbleIntensity(bubbleValue: 'D', meanIntensity: 190.0, isMarked: false),
          ],
          'q2': [
            BubbleIntensity(bubbleValue: 'A', meanIntensity: 190.0, isMarked: false),
            BubbleIntensity(bubbleValue: 'B', meanIntensity: 60.0, isMarked: true),
            BubbleIntensity(bubbleValue: 'C', meanIntensity: 195.0, isMarked: false),
            BubbleIntensity(bubbleValue: 'D', meanIntensity: 185.0, isMarked: false),
          ],
        },
        globalThreshold: 120.0,
        localThresholds: {'q1': 115.0, 'q2': 110.0},
      ),
      processingTime: const Duration(milliseconds: 500),
      processingSteps: [],
    );

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: OMRBubbleOverlay(
          imageBytes: bytes,
          imageWidth: 200,
          imageHeight: 200,
          result: result,
        ),
      ),
    ));

    expect(find.byType(CustomPaint), findsWidgets);
  });
}
