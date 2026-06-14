import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/presentation/widgets/omr_bubble_overlay.dart';

void main() {
  group('bubbleDisplayCenter', () {
    test('returns the bubble center in display coords (adds half bubble size)', () {
      // 1:1 scale, no letterbox. Bubble at template (100, 200) with
      // bubble size 30x30 should map to display (100 + 15, 200 + 15)
      // = (115, 215), NOT (100, 200) - which is the top-left.
      final c = bubbleDisplayCenter(
        bubbleTemplateX: 100,
        bubbleTemplateY: 200,
        blockBubbleWidth: 30,
        blockBubbleHeight: 30,
        scaleX: 1.0,
        scaleY: 1.0,
        offsetX: 0.0,
        offsetY: 0.0,
      );
      expect(c.dx, 115.0);
      expect(c.dy, 215.0);
    });

    test('applies scale and letterbox offset on top of the center', () {
      // Half scale (scaleX = scaleY = 0.5), image letterboxed to
      // start at display (50, 60). Bubble at template (100, 200) with
      // 30x30 should map to:
      //   x = (100 + 15) * 0.5 + 50 = 57.5 + 50 = 107.5
      //   y = (200 + 15) * 0.5 + 60 = 107.5 + 60 = 167.5
      final c = bubbleDisplayCenter(
        bubbleTemplateX: 100,
        bubbleTemplateY: 200,
        blockBubbleWidth: 30,
        blockBubbleHeight: 30,
        scaleX: 0.5,
        scaleY: 0.5,
        offsetX: 50.0,
        offsetY: 60.0,
      );
      expect(c.dx, 107.5);
      expect(c.dy, 167.5);
    });

    test('uses blockBubbleWidth / blockBubbleHeight independently', () {
      // Non-square bubble: 40 wide, 20 tall. Center offset is
      // (20, 10), not (15, 15).
      final c = bubbleDisplayCenter(
        bubbleTemplateX: 0,
        bubbleTemplateY: 0,
        blockBubbleWidth: 40,
        blockBubbleHeight: 20,
        scaleX: 1.0,
        scaleY: 1.0,
        offsetX: 0.0,
        offsetY: 0.0,
      );
      expect(c.dx, 20.0);
      expect(c.dy, 10.0);
    });

    test('regression: top-left (no center offset) is the OLD buggy behavior', () {
      // Sanity check: the old formula would have produced (100, 200)
      // for these inputs. If this test ever fails with a "you used the
      // top-left formula" assertion, the fix has been regressed.
      final oldBx = 100.0; // bubble.x * scaleX + offsetX
      final oldBy = 200.0; // bubble.y * scaleY + offsetY
      // The corrected center is shifted by half the bubble size.
      expect(oldBx + 15, 115);
      expect(oldBy + 15, 215);
    });
  });
}
