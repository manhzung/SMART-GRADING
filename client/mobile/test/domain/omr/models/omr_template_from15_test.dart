import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/domain/omr/models/field_block.dart';
import 'package:smart_grading_mobile/domain/omr/models/template_layout.dart';

void main() {
  group('OMRTemplate.from15Question', () {
    test('returns A5 template with id 15q', () {
      final t = OMRTemplate.from15Question();
      expect(t.id, '15q');
      expect(t.name, 'Phiếu 15 câu - Ngắn (A5)');
    });

    test('page dimensions are A5 at 300 DPI (1748x2480)', () {
      final t = OMRTemplate.from15Question();
      expect(t.pageWidth, 1748);
      expect(t.pageHeight, 2480);
    });

    test('has 5 field blocks in order: SBD, MD, Row 1, Row 2, Row 3', () {
      final t = OMRTemplate.from15Question();
      expect(t.fieldBlocks.length, 5);
      expect(t.fieldBlocks[0].name, 'SBD');
      expect(t.fieldBlocks[1].name, 'MD');
      expect(t.fieldBlocks[2].name, 'Answers Row 1');
      expect(t.fieldBlocks[3].name, 'Answers Row 2');
      expect(t.fieldBlocks[4].name, 'Answers Row 3');
    });

    test('SBD block is QTYPE_INT_FROM_1 with 2 digits and 10 options', () {
      final t = OMRTemplate.from15Question();
      final sbd = t.fieldBlocks[0];
      expect(sbd.fieldType, FieldType.qtypeIntFrom1);
      expect(sbd.fieldLabels, ['sbd1', 'sbd2']);
      expect(sbd.bubbleValues.length, 10);
      expect(sbd.direction, FieldDirection.vertical);
    });

    test('MD block is QTYPE_INT_FROM_1 with 2 digits and 10 options', () {
      final t = OMRTemplate.from15Question();
      final md = t.fieldBlocks[1];
      expect(md.fieldType, FieldType.qtypeIntFrom1);
      expect(md.fieldLabels, ['md1', 'md2']);
      expect(md.bubbleValues.length, 10);
      expect(md.direction, FieldDirection.vertical);
    });

    test('Answer row 1 has 5 questions with 4 options MCQ4', () {
      final t = OMRTemplate.from15Question();
      final r1 = t.fieldBlocks[2];
      expect(r1.fieldType, FieldType.qtypeMcq4);
      expect(r1.fieldLabels, ['q1', 'q2', 'q3', 'q4', 'q5']);
      expect(r1.bubbleValues, ['A', 'B', 'C', 'D']);
      expect(r1.direction, FieldDirection.horizontal);
    });

    test('Answer rows 2 and 3 cover q6..q15 in order', () {
      final t = OMRTemplate.from15Question();
      expect(t.fieldBlocks[3].fieldLabels,
          ['q6', 'q7', 'q8', 'q9', 'q10']);
      expect(t.fieldBlocks[4].fieldLabels,
          ['q11', 'q12', 'q13', 'q14', 'q15']);
    });

    test('outputColumns includes sbd1, sbd2, md1, md2, q1-q15', () {
      final t = OMRTemplate.from15Question();
      expect(t.outputColumns, containsAll(['sbd1', 'sbd2', 'md1', 'md2']));
      for (var i = 1; i <= 15; i++) {
        expect(t.outputColumns, contains('q$i'));
      }
    });

    test('customLabels map studentCode to sbd1, sbd2', () {
      final t = OMRTemplate.from15Question();
      expect(t.customLabels['studentCode'], ['sbd1', 'sbd2']);
      expect(t.customLabels['versionCode'], ['md1', 'md2']);
    });

    test('answer rows fit within the A5 page and are in spec order', () {
      final t = OMRTemplate.from15Question();
      final row1 = t.fieldBlocks[2];
      final row2 = t.fieldBlocks[3];
      final row3 = t.fieldBlocks[4];

      // Spec §2.3: betweenRows = 8mm = 94.5 px. Each row is just
      // 94 px below the previous one. The earlier draft of this
      // factory had row 2 / row 3 originY values that were 5x the
      // spec, putting q6-q15 overlay far below the actual printed
      // rows. This test guards the spec values directly.
      expect(row2.originY - row1.originY, 94,
          reason: 'Row 2 originY - Row 1 originY must equal spec betweenRows (94 px)');
      expect(row3.originY - row2.originY, 94,
          reason: 'Row 3 originY - Row 2 originY must equal spec betweenRows (94 px)');

      // All three rows must still fit within the A5 page height
      // (2480 px) with some bottom margin.
      final lastRowBottom = row3.originY +
          (row3.fieldLabels.length - 1) * row3.labelsGap +
          row3.bubbleHeight;
      expect(lastRowBottom, lessThan(t.pageHeight),
          reason: 'Last answer row must fit inside the A5 page height');
    });

    test('SBD and MD digit blocks have no column overlap', () {
      // Each digit block has 2 columns (e.g. sbd1, sbd2). If the
      // columns are too close, the bubbles overlap horizontally.
      // Vertical direction: labelsGap controls X spacing, bubblesGap
      // controls Y spacing.
      final t = OMRTemplate.from15Question();
      for (final name in ['SBD', 'MD']) {
        final block = t.fieldBlocks.firstWhere((b) => b.name == name);
        expect(block.labelsGap, greaterThanOrEqualTo(block.bubbleWidth),
            reason: '$name labelsGap (X) must clear bubble width');
        expect(block.bubblesGap, greaterThanOrEqualTo(block.bubbleHeight),
            reason: '$name bubblesGap (Y) must clear bubble height');
      }
    });

    test('answer row origins match spec section 2.3/2.5 (mm-to-px at 300 DPI)', () {
      // Regression for a bug where Row 2 origin Y was 1238 and Row 3
      // was 1708 - both about 5x the spec's betweenRows distance.
      // Spec values: Row 1 Y = 65mm = 768, Row 2 Y = 73mm = 862,
      // Row 3 Y = 81mm = 956. The same X offset (248) is used for
      // all three rows (15mm + 71px qNum width).
      final t = OMRTemplate.from15Question();
      final r1 = t.fieldBlocks[2];
      final r2 = t.fieldBlocks[3];
      final r3 = t.fieldBlocks[4];
      expect(r1.originX, 248, reason: 'Row 1 origin X');
      expect(r1.originY, 768, reason: 'Row 1 origin Y (65mm)');
      expect(r2.originX, 248, reason: 'Row 2 origin X');
      expect(r2.originY, 862, reason: 'Row 2 origin Y (73mm = 65+8mm)');
      expect(r3.originX, 248, reason: 'Row 3 origin X');
      expect(r3.originY, 956, reason: 'Row 3 origin Y (81mm = 65+16mm)');
    });

    test('SBD and MD origins match spec section 2.3', () {
      // Spec: SBD x=177 (15mm), y=413 (35mm); MD x=1181 (100mm),
      // y=413. Both blocks are vertical QTYPE_INT_FROM_1.
      final t = OMRTemplate.from15Question();
      final sbd = t.fieldBlocks[0];
      final md = t.fieldBlocks[1];
      expect(sbd.originX, 177, reason: 'SBD x = 15mm');
      expect(sbd.originY, 413, reason: 'SBD y = 35mm');
      expect(md.originX, 1181, reason: 'MD x = 100mm');
      expect(md.originY, 413, reason: 'MD y = 35mm');
    });

    test('assertNoOverlap passes for from15Question() (no SBD/MD/row overlap)', () {
      // The factory should self-validate via the layout calculator
      // (debug-only assert in the factory). Calling it here in a
      // test forces a runtime check.
      TemplateLayout.assertNoOverlap(OMRTemplate.from15Question());
    });
  });
}
