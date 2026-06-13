import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/omr/models/grading_result.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_response.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/domain/omr/engine/omr_engine.dart';
import 'package:smart_grading_mobile/presentation/widgets/omr_bubble_details_table.dart';

void main() {
  testWidgets('displays bubble details table', (tester) async {
    final result = OMRProcessingResult(
      template: OMRTemplate.simpleMcq(
        numQuestions: 5,
        numOptions: 4,
        bubbleWidth: 35,
        bubbleHeight: 35,
      ),
      gradingResult: OMRGradingResult.empty(),
      response: OMRResponseDebug(
        answers: {'q1': 'A', 'q2': '', 'q3': 'B'},
        bubbleIntensities: {
          'q1': [
            BubbleIntensity(bubbleValue: 'A', meanIntensity: 87.3, isMarked: true),
            BubbleIntensity(bubbleValue: 'B', meanIntensity: 198.2, isMarked: false),
          ],
          'q3': [
            BubbleIntensity(bubbleValue: 'A', meanIntensity: 190.0, isMarked: false),
            BubbleIntensity(bubbleValue: 'B', meanIntensity: 45.1, isMarked: true),
          ],
        },
        globalThreshold: 120.0,
        localThresholds: {'q1': 115.0, 'q3': 118.0},
      ),
      processingTime: const Duration(milliseconds: 500),
      processingSteps: [],
    );

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: OMRBubbleDetailsTable(result: result),
      ),
    ));

    expect(find.text('q1'), findsOneWidget);
    expect(find.text('MARKED'), findsWidgets);
  });

  testWidgets('shows multi-marked badge', (tester) async {
    final result = OMRProcessingResult(
      template: OMRTemplate.simpleMcq(
        numQuestions: 5,
        numOptions: 4,
        bubbleWidth: 35,
        bubbleHeight: 35,
      ),
      gradingResult: OMRGradingResult(
        score: 0, maxScore: 0, verdicts: [],
        hasMultiMarked: true, hasUnmarked: true,
      ),
      response: OMRResponseDebug(
        answers: {'q1': 'AB'},
        bubbleIntensities: {},
        globalThreshold: 120.0,
        localThresholds: {},
        multiMarked: true,
        hasUnmarked: true,
      ),
      processingTime: const Duration(milliseconds: 500),
      processingSteps: [],
    );

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: OMRBubbleDetailsTable(result: result),
      ),
    ));

    expect(find.text('MULTI'), findsWidgets);
    expect(find.text('UNMARKED'), findsWidgets);
  });
}
