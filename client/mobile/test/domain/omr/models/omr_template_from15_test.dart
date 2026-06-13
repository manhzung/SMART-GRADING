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

    test('answer row blocks do not overlap each other on Y axis', () {
      final t = OMRTemplate.from15Question();
      // Each answer row is a separate FieldBlock; guard against a regression
      // where their originY values were too close (previously Row 1.q2 and
      // Row 2.q1 shared the same Y, causing visible bubble overlap).
      final row1 = t.fieldBlocks[2];
      final row2 = t.fieldBlocks[3];
      final row3 = t.fieldBlocks[4];

      final row1BottomY = row1.originY + (row1.fieldLabels.length - 1) * row1.labelsGap;
      final row2BottomY = row2.originY + (row2.fieldLabels.length - 1) * row2.labelsGap;
      final row3BottomY = row3.originY + (row3.fieldLabels.length - 1) * row3.labelsGap;

      // Row 2 originY must be strictly below Row 1's last question
      expect(row2.originY, greaterThan(row1BottomY),
          reason: 'Row 2 origin Y must clear Row 1 last question to avoid overlap');
      // Row 3 originY must be strictly below Row 2's last question
      expect(row3.originY, greaterThan(row2BottomY),
          reason: 'Row 3 origin Y must clear Row 2 last question to avoid overlap');
      // Row 3 must still fit within the A5 page
      expect(row3BottomY + row3.bubbleHeight, lessThanOrEqualTo(t.pageHeight),
          reason: 'Last question in Row 3 must fit within A5 page height');
    });

    test('SBD and MD digit blocks have no column overlap', () {
      // Each digit block has 2 columns (e.g. sbd1, sbd2). If the
      // columns are too close, the bubbles overlap horizontally.
      final t = OMRTemplate.from15Question();
      for (final name in ['SBD', 'MD']) {
        final block = t.fieldBlocks.firstWhere((b) => b.name == name);
        expect(block.labelsGap, greaterThanOrEqualTo(block.bubbleWidth),
            reason: '$name labelsGap must clear bubble width to avoid column overlap');
      }
    });

    test('assertNoOverlap passes for from15Question() (no SBD/MD/row overlap)', () {
      // The factory should self-validate via the layout calculator
      // (debug-only assert in the factory). Calling it here in a
      // test forces a runtime check.
      TemplateLayout.assertNoOverlap(OMRTemplate.from15Question());
    });
  });
}
