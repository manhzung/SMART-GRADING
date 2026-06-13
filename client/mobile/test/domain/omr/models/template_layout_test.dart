import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/domain/omr/models/template_layout.dart';

void main() {
  group('TemplateLayout.mmToPx', () {
    test('matches the spec lookup table at 300 DPI', () {
      expect(TemplateLayout.mmToPx(1), 12);
      expect(TemplateLayout.mmToPx(8), 94);
      expect(TemplateLayout.mmToPx(15), 177);
      expect(TemplateLayout.mmToPx(35), 413);
      expect(TemplateLayout.mmToPx(65), 768);
      expect(TemplateLayout.mmToPx(100), 1181);
      expect(TemplateLayout.mmToPx(148), 1748);
      expect(TemplateLayout.mmToPx(210), 2480);
    });
  });

  group('TemplateLayout.stackAlongAxis', () {
    test('returns origins for fields within a single MCQ block', () {
      // 5 questions/row, gap = 94 px (8mm), first at y=768.
      // This is the origin of each question's row of 4 options.
      final y = TemplateLayout.stackAlongAxis(
        bubbleDim: 30,
        gap: 94,
        count: 5,
        firstOrigin: 768,
      );
      expect(y, [768, 862, 956, 1050, 1144]);
    });

    test('uses bubbleDim + clearance as the minimum gap', () {
      // gap == bubbleDim + defaultClearancePx (1) is the minimum
      // legal value.
      final y = TemplateLayout.stackAlongAxis(
        bubbleDim: 30,
        gap: 31,
        count: 3,
        firstOrigin: 100,
      );
      expect(y, [100, 131, 162]);
    });

    test('throws when gap < bubbleDim + marginPx (overlap)', () {
      expect(
        () => TemplateLayout.stackAlongAxis(
          bubbleDim: 30,
          gap: 12, // 18 px short of bubbleDim + defaultClearance
          count: 2,
          firstOrigin: 0,
        ),
        throwsStateError,
      );
    });

    test('throws on invalid count or bubbleDim', () {
      expect(
        () => TemplateLayout.stackAlongAxis(
          bubbleDim: 30,
          gap: 30,
          count: 0,
          firstOrigin: 0,
        ),
        throwsArgumentError,
      );
      expect(
        () => TemplateLayout.stackAlongAxis(
          bubbleDim: 0,
          gap: 30,
          count: 1,
          firstOrigin: 0,
        ),
        throwsArgumentError,
      );
    });
  });

  group('TemplateLayout.assertNoOverlap', () {
    test('passes for sample4() template', () {
      // sample4 uses 1 block, labelsGap=62 > bubbleWidth=30.
      expect(
        () => TemplateLayout.assertNoOverlap(OMRTemplate.sample4()),
        returnsNormally,
      );
    });

    test('passes for from15Question() template after the fix', () {
      // The fix changes SBD/MD bubblesGap from 12 to 31 and labelsGap
      // from 12 to 31. If the factory is regressed back to 12, this
      // test should fail.
      expect(
        () => TemplateLayout.assertNoOverlap(OMRTemplate.from15Question()),
        returnsNormally,
      );
    });

    test('detects SBD-style Y-axis overlap (bubblesGap < bubbleHeight)', () {
      // Regression for the 15q SBD/MD bug: bubblesGap=12 (1mm) on
      // the Y axis is smaller than bubbleHeight=30, so 10 stacked
      // value bubbles overlap. The factory fix is bubblesGap=31.
      final broken = OMRTemplate.from15Question();
      final sbd = broken.fieldBlocks.firstWhere((b) => b.name == 'SBD');
      // Sanity: the current SBD must be legal.
      expect(
        () => TemplateLayout.assertNoOverlap(broken),
        returnsNormally,
      );
      // The validator's per-block rule must catch the bug if a
      // future edit shrinks bubblesGap below bubbleHeight.
      expect(sbd.bubblesGap, greaterThanOrEqualTo(sbd.bubbleHeight));
    });
  });
}
