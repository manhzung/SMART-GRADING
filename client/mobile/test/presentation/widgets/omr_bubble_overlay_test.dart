import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/omr/engine/omr_engine.dart';
import 'package:smart_grading_mobile/domain/omr/models/grading_result.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_response.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
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
    // Create a minimal valid PNG (1x1 transparent pixel)
    final bytes = Uint8List.fromList([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, // bit depth, color type, etc.
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, // compressed data
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND chunk
      0x42, 0x60, 0x82,
    ]);

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: OMRBubbleOverlay(
          imageBytes: bytes,
          imageWidth: 1,
          imageHeight: 1,
          result: makeResult(),
        ),
      ),
    ));

    expect(find.byType(OMRBubbleOverlay), findsOneWidget);
    expect(find.byType(InteractiveViewer), findsOneWidget);
  });

  testWidgets('displays legend', (tester) async {
    final bytes = Uint8List.fromList([0x89, 0x50, 0x4E, 0x47]);

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: OMRBubbleOverlay(
          imageBytes: bytes,
          imageWidth: 1,
          imageHeight: 1,
          result: makeResult(),
        ),
      ),
    ));

    expect(find.text('MARKED'), findsOneWidget);
    expect(find.text('UNMARKED'), findsOneWidget);
  });

  testWidgets('displays global threshold in legend', (tester) async {
    final bytes = Uint8List.fromList([0x89, 0x50, 0x4E, 0x47]);

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: OMRBubbleOverlay(
          imageBytes: bytes,
          imageWidth: 1,
          imageHeight: 1,
          result: makeResult(globalThreshold: 120.0),
        ),
      ),
    ));

    expect(find.textContaining('120'), findsOneWidget);
  });

  testWidgets('renders bubble indicators from bubbleIntensities data', (tester) async {
    final bytes = Uint8List.fromList([0x89, 0x50, 0x4E, 0x47]);

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
          imageWidth: 1,
          imageHeight: 1,
          result: result,
        ),
      ),
    ));

    expect(find.byType(CustomPaint), findsWidgets);
  });
}
