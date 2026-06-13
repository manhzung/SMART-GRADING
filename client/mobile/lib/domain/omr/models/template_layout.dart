/// Layout math helpers for OMR templates.
///
/// OMR templates declare a page, a bubble size, and a list of field
/// blocks. Each block has a `(originX, originY)` and per-axis gaps.
/// Getting those numbers right is hard: a typo in `labelsGap` can
/// make two digit columns sit on top of each other, and a misplaced
/// row origin can overlap the previous row's last question.
///
/// This module centralises the layout math so any template can
/// derive safe origins from a small set of physical constants
/// (page size in mm, bubble size in px) instead of hand-tuning
/// every coordinate.
///
/// The helpers are pure functions and depend on `OMRTemplate` /
/// `FieldBlock` only for the validator. Tests run with no Flutter
/// dependency.
library;

import 'field_block.dart';
import 'omr_template.dart';

class TemplateLayout {
  /// Small safety margin (px) added on top of `bubbleDim` when
  /// checking that two bubbles do not touch. Kept tiny so the page
  /// layout uses almost all of the available space. The *real*
  /// constraint is `labelsGap >= bubbleDim`, which the validator
  /// checks strictly. Templates that want more breathing room can
  /// pass a larger `marginPx` to the stacking helpers.
  static const int defaultClearancePx = 1;

  /// DPI assumed for mm -> px conversions. Matches the rest of the
  /// OMR pipeline (engine, PDF generators, pre-processors).
  static const double pxPerMm = 300.0 / 25.4; // ~11.811

  /// Convert millimetres to pixels at 300 DPI, rounded to the
  /// nearest integer.
  static int mmToPx(double mm) => (mm * pxPerMm).round();

  /// Return evenly-spaced origin coordinates for `count` columns
  /// (or rows) starting at `firstOrigin`, where each pair of
  /// adjacent bubble edges is separated by `gap` pixels.
  ///
  /// - `bubbleDim` is the bubble width/height in pixels, taken from
  ///   the template's own constants.
  /// - `gap` is the distance between adjacent bubble **edges**
  ///   (already accounts for `labelsGap - bubbleDim`). It must be
  ///   `>= 0`; if it is negative, bubbles would overlap and this
  ///   function throws.
  /// - `count` is the number of columns/rows to lay out. Must be
  ///   positive.
  /// - `firstOrigin` is the coordinate of the first bubble's
  ///   top-left corner.
  /// - `marginPx` is an additional safety margin added on top of
  ///   `bubbleDim` when checking that `gap` is non-negative.
  ///   Defaults to [defaultClearancePx].
  static List<int> stackAlongAxis({
    required int bubbleDim,
    required int gap,
    required int count,
    required int firstOrigin,
    int marginPx = defaultClearancePx,
  }) {
    if (count <= 0) {
      throw ArgumentError('count must be positive, got $count');
    }
    if (bubbleDim <= 0) {
      throw ArgumentError('bubbleDim must be positive, got $bubbleDim');
    }
    if (gap < bubbleDim + marginPx) {
      throw StateError(
        'gap ($gap px) is smaller than bubbleDim + marginPx '
        '(${bubbleDim + marginPx} px); adjacent bubbles would overlap. '
        'Increase labelsGap or decrease bubbleDim in the template.',
      );
    }
    // Per-axis spacing between adjacent bubble **centers** = gap (the
    // declared edge-to-edge spacing). First origin is the corner, so
    // the next corner is origin + (gap) - (bubbleDim) ... but
    // `labelsGap` in OMRChecker semantics is the center-to-center
    // distance, so the next origin is simply origin + gap. Match the
    // semantics used by FieldBlock.fromConfig to keep results
    // consistent.
    final stride = gap;
    return [
      for (var i = 0; i < count; i++) firstOrigin + i * stride,
    ];
  }

  /// Validate that a template's field blocks do not produce
  /// overlapping bubbles, and that all blocks fit inside the page.
  ///
  /// Per-block rule (axis-aware):
  /// - horizontal direction: `labelsGap >= bubbleWidth` (no column
  ///   overlap) and `bubblesGap >= bubbleHeight` (no option overlap).
  /// - vertical direction:   `labelsGap >= bubbleHeight` (no row
  ///   overlap) and `bubblesGap >= bubbleWidth` (no value overlap).
  ///
  /// Cross-block rule: block bounding boxes (computed from origin,
  /// field count, label/option counts, and gaps) must not overlap
  /// each other and must lie entirely within `(0, 0) .. (pageWidth,
  /// pageHeight)`.
  ///
  /// Intended to be called inside `assert(...)` at the end of a
  /// template factory so it runs in debug builds only.
  static void assertNoOverlap(OMRTemplate template) {
    // Per-block axis-aware checks.
    for (final block in template.fieldBlocks) {
      final isHorizontal = block.direction == FieldDirection.horizontal;
      final crossDim = isHorizontal ? block.bubbleWidth : block.bubbleHeight;
      final alongDim = isHorizontal ? block.bubbleHeight : block.bubbleWidth;
      // labelsGap is the spacing between adjacent fields along the
      // cross axis (perpendicular to the option/value row). It must
      // be at least the bubble size on that axis.
      if (block.labelsGap < crossDim) {
        throw StateError(
          'Block "${block.name}": labelsGap (${block.labelsGap}) is smaller '
          'than bubble ${isHorizontal ? "width" : "height"} ($crossDim). '
          'Adjacent fields overlap.',
        );
      }
      // bubblesGap is the spacing between adjacent values within one
      // field, along the option/value row. It must be at least the
      // bubble size on that axis.
      if (block.bubblesGap < alongDim) {
        throw StateError(
          'Block "${block.name}": bubblesGap (${block.bubblesGap}) is '
          'smaller than bubble ${isHorizontal ? "height" : "width"} '
          '($alongDim). Adjacent values overlap.',
        );
      }
    }

    // Cross-block checks: bounding boxes must not overlap and must
    // fit in the page.
    final boxes = <List<int>>[];
    for (final block in template.fieldBlocks) {
      final w = _bboxWidth(block);
      final h = _bboxHeight(block);
      boxes.add([
        block.originX,
        block.originY,
        block.originX + w,
        block.originY + h,
      ]);
    }
    for (var i = 0; i < boxes.length; i++) {
      final a = boxes[i];
        if (a[0] < 0 || a[1] < 0 || a[2] > template.pageWidth ||
            a[3] > template.pageHeight) {
          throw StateError(
            'Block $i bbox ($a) extends outside page '
            '(0,0)..(${template.pageWidth}, ${template.pageHeight}).',
          );
        }
      for (var j = i + 1; j < boxes.length; j++) {
        final b = boxes[j];
        final overlaps = a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
        if (overlaps) {
          throw StateError(
            'Blocks $i ($a) and $j ($b) have overlapping bounding boxes.',
          );
        }
      }
    }
  }

  /// Width (X span) of a field block's bubble bbox, in pixels.
  static int _bboxWidth(FieldBlock block) {
    final isHorizontal = block.direction == FieldDirection.horizontal;
    final valuesCount = block.bubbleValues.length;
    final fieldsCount = block.fieldLabels.length;
    if (isHorizontal) {
      // bubbles are spread along X within a field; fields stacked
      // along Y. Width = value span of one field.
      return (valuesCount - 1) * block.bubblesGap + block.bubbleWidth;
    } else {
      // bubbles are spread along Y within a field; fields stacked
      // along X. Width = field span.
      return (fieldsCount - 1) * block.labelsGap + block.bubbleWidth;
    }
  }

  /// Height (Y span) of a field block's bubble bbox, in pixels.
  static int _bboxHeight(FieldBlock block) {
    final isHorizontal = block.direction == FieldDirection.horizontal;
    final valuesCount = block.bubbleValues.length;
    final fieldsCount = block.fieldLabels.length;
    if (isHorizontal) {
      // Height = field span.
      return (fieldsCount - 1) * block.labelsGap + block.bubbleHeight;
    } else {
      // Height = value span.
      return (valuesCount - 1) * block.bubblesGap + block.bubbleHeight;
    }
  }
}
