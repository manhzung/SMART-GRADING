import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/presentation/widgets/omr_processing_log.dart';
import 'package:smart_grading_mobile/domain/omr/models/grading_result.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_response.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/domain/omr/engine/omr_engine.dart';

void main() {
  testWidgets('displays processing steps', (tester) async {
    final result = OMRProcessingResult(
      template: OMRTemplate.simpleMcq(
        numQuestions: 5,
        numOptions: 4,
        bubbleWidth: 35,
        bubbleHeight: 35,
      ),
      gradingResult: OMRGradingResult.empty(),
      response: OMRResponseDebug(
        answers: {},
        bubbleIntensities: {},
        globalThreshold: 120.0,
        localThresholds: {},
      ),
      processingTime: const Duration(milliseconds: 500),
      processingSteps: [
        'Decoding image...',
        'Image decoded: 1240x1754',
        'Resizing image...',
        'Detecting document corners...',
        'No corners detected',
      ],
      wasWarped: false,
    );

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: OMRProcessingLog(result: result),
      ),
    ));

    expect(find.text('Decoding image...'), findsOneWidget);
    expect(find.text('No corners detected'), findsOneWidget);
  });

  testWidgets('displays metadata card', (tester) async {
    final result = OMRProcessingResult(
      template: OMRTemplate.simpleMcq(
        numQuestions: 5,
        numOptions: 4,
        bubbleWidth: 35,
        bubbleHeight: 35,
      ),
      gradingResult: OMRGradingResult.empty(),
      response: OMRResponseDebug(
        answers: {},
        bubbleIntensities: {},
        globalThreshold: 120.0,
        localThresholds: {},
      ),
      processingTime: const Duration(milliseconds: 500),
      processingSteps: ['Step 1'],
      detectedCorners: [
        const Offset(10, 10),
        const Offset(100, 10),
        const Offset(100, 100),
        const Offset(10, 100)
      ],
      skewAngle: 2.5,
      wasWarped: true,
    );

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: OMRProcessingLog(result: result),
      ),
    ));

    expect(find.text('500 ms'), findsOneWidget);
    expect(find.text('Warped'), findsWidgets);
    expect(find.text('2.5 deg'), findsWidgets);
  });
}
