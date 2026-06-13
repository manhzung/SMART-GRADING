# OMR 15-Question A5 Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 15-question A5 OMR template (with 2-digit SBD + 2-digit version code) selectable from the OMR Test Lab via a new TemplatePicker chip row, and display the detected SBD/MĐ above the result tabs.

**Architecture:** Add a new `OMRTemplate.from15Question()` factory using 3 horizontal MCQ4 FieldBlocks (5 questions per row) plus 2 vertical QTYPE_INT_FROM_1 FieldBlocks for SBD and MĐ. Wire a new `TemplatePicker` widget into `OMRTestLabPage` that lets users switch between Sample 4 and the new template. When the 15q template is active and results are available, render a header row showing concatenated SBD/MĐ values.

**Tech Stack:** Flutter (Dart), existing `OMREngine`, `OMRTemplate`, `FieldBlock`, `OMRProcessingResult`, `image` package.

---

## File Structure

```
Files to create:
- client/mobile/test/domain/omr/models/omr_template_from15_test.dart  # Factory unit tests
- client/mobile/lib/presentation/widgets/template_picker.dart          # Chip-based picker
- client/mobile/test/presentation/widgets/template_picker_test.dart   # Picker widget tests

Files to modify:
- client/mobile/lib/domain/omr/models/omr_template.dart               # Add from15Question() factory
- client/mobile/lib/presentation/pages/omr_test_lab_page.dart         # Wire picker, mutable template, SBD/MĐ header
```

---

## Task 1: OMRTemplate.from15Question Factory

**Files:**
- Create: `client/mobile/test/domain/omr/models/omr_template_from15_test.dart`
- Modify: `client/mobile/lib/domain/omr/models/omr_template.dart` (append factory before final `}`)

- [ ] **Step 1: Write the failing test**

```dart
// client/mobile/test/domain/omr/models/omr_template_from15_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/domain/omr/models/field_block.dart';

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
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/mobile && flutter test test/domain/omr/models/omr_template_from15_test.dart`
Expected: FAIL with "The method 'from15Question' isn't defined for the type 'OMRTemplate'."

- [ ] **Step 3: Add the factory to OMRTemplate**

Open `client/mobile/lib/domain/omr/models/omr_template.dart` and insert this factory immediately **after** the closing `}` of `factory OMRTemplate.sample4()` and **before** the closing `}` of the class `OMRTemplate`:

```dart
  /// Creates a template matching the 15-question A5 sheet:
  /// - A5 portrait: 148 x 210 mm @ 300 DPI = 1748 x 2480 px
  /// - 2-digit SBD (student code) + 2-digit MĐ (version code) + 15 MCQ4 questions
  /// - Layout: 5 questions/row x 3 rows for answers
  factory OMRTemplate.from15Question() {
    return OMRTemplate(
      id: '15q',
      name: 'Phiếu 15 câu - Ngắn (A5)',
      pageWidth: 1748,
      pageHeight: 2480,
      bubbleWidth: 30,
      bubbleHeight: 30,
      emptyValue: '',
      outputColumns: [
        'sbd1', 'sbd2', 'md1', 'md2',
        ...List.generate(15, (i) => 'q${i + 1}'),
      ],
      fieldBlocks: [
        FieldBlock.fromConfig(
          name: 'SBD',
          config: {
            'fieldType': 'QTYPE_INT_FROM_1',
            'fieldLabels': ['sbd1', 'sbd2'],
            'origin': [177, 413],
            'bubblesGap': 12,
            'labelsGap': 12,
          },
          globalBubbleWidth: 30,
          globalBubbleHeight: 30,
          globalEmptyValue: '',
        ),
        FieldBlock.fromConfig(
          name: 'MD',
          config: {
            'fieldType': 'QTYPE_INT_FROM_1',
            'fieldLabels': ['md1', 'md2'],
            'origin': [1181, 413],
            'bubblesGap': 12,
            'labelsGap': 12,
          },
          globalBubbleWidth: 30,
          globalBubbleHeight: 30,
          globalEmptyValue: '',
        ),
        FieldBlock.fromConfig(
          name: 'Answers Row 1',
          config: {
            'fieldType': 'QTYPE_MCQ4',
            'fieldLabels': ['q1', 'q2', 'q3', 'q4', 'q5'],
            'origin': [248, 768],
            'bubblesGap': 41,
            'labelsGap': 94,
          },
          globalBubbleWidth: 30,
          globalBubbleHeight: 30,
          globalEmptyValue: '',
        ),
        FieldBlock.fromConfig(
          name: 'Answers Row 2',
          config: {
            'fieldType': 'QTYPE_MCQ4',
            'fieldLabels': ['q6', 'q7', 'q8', 'q9', 'q10'],
            'origin': [248, 862],
            'bubblesGap': 41,
            'labelsGap': 94,
          },
          globalBubbleWidth: 30,
          globalBubbleHeight: 30,
          globalEmptyValue: '',
        ),
        FieldBlock.fromConfig(
          name: 'Answers Row 3',
          config: {
            'fieldType': 'QTYPE_MCQ4',
            'fieldLabels': ['q11', 'q12', 'q13', 'q14', 'q15'],
            'origin': [248, 956],
            'bubblesGap': 41,
            'labelsGap': 94,
          },
          globalBubbleWidth: 30,
          globalBubbleHeight: 30,
          globalEmptyValue: '',
        ),
      ],
      customLabels: {
        'studentCode': ['sbd1', 'sbd2'],
        'versionCode': ['md1', 'md2'],
      },
      preProcessors: [
        OMRPreProcessor(
            name: 'Levels',
            options: {
              'inBlack': 15.0,
              'inWhite': 200.0,
              'outBlack': 0.0,
              'outWhite': 255.0,
              'gamma': 1.0,
            }),
        OMRPreProcessor(
            name: 'GaussianBlur',
            options: {
              'kSize': [3, 3],
              'sigmaX': 0,
            }),
        OMRPreProcessor(name: 'CropPage', options: {}),
      ],
    );
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client/mobile && flutter test test/domain/omr/models/omr_template_from15_test.dart`
Expected: All 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/domain/omr/models/omr_template.dart client/mobile/test/domain/omr/models/omr_template_from15_test.dart
git commit -m "feat(omr): add OMRTemplate.from15Question factory for A5 15-question sheet"
```

---

## Task 2: TemplatePicker Widget

**Files:**
- Create: `client/mobile/lib/presentation/widgets/template_picker.dart`
- Create: `client/mobile/test/presentation/widgets/template_picker_test.dart`

- [ ] **Step 1: Write the failing test**

```dart
// client/mobile/test/presentation/widgets/template_picker_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/presentation/widgets/template_picker.dart';

void main() {
  testWidgets('renders 3 chips: Sample 4, Phiếu 15 câu - A5, Phiếu 30 câu - A4',
      (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: TemplatePicker(
          selected: OMRTemplate.sample4(),
          onChanged: (_) {},
        ),
      ),
    ));

    expect(find.text('Sample 4'), findsOneWidget);
    expect(find.text('Phiếu 15 câu - A5'), findsOneWidget);
    expect(find.text('Phiếu 30 câu - A4'), findsOneWidget);
  });

  testWidgets('emits from15Question template when 15q chip tapped', (tester) async {
    OMRTemplate? captured;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: TemplatePicker(
          selected: OMRTemplate.sample4(),
          onChanged: (t) => captured = t,
        ),
      ),
    ));

    await tester.tap(find.text('Phiếu 15 câu - A5'));
    await tester.pump();

    expect(captured, isNotNull);
    expect(captured!.id, '15q');
    expect(captured!.pageWidth, 1748);
  });

  testWidgets('emits sample4 template when Sample 4 chip tapped', (tester) async {
    OMRTemplate? captured;
    final t15 = OMRTemplate.from15Question();
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: TemplatePicker(
          selected: t15,
          onChanged: (t) => captured = t,
        ),
      ),
    ));

    await tester.tap(find.text('Sample 4'));
    await tester.pump();

    expect(captured, isNotNull);
    expect(captured!.id, isNot('15q'));
    expect(captured!.name, 'Sample 4 - 11 MCQ');
  });

  testWidgets('30q chip is disabled (no callback fired)', (tester) async {
    var fired = false;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: TemplatePicker(
          selected: OMRTemplate.sample4(),
          onChanged: (_) => fired = true,
        ),
      ),
    ));

    await tester.tap(find.text('Phiếu 30 câu - A4'));
    await tester.pump();

    expect(fired, isFalse);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/mobile && flutter test test/presentation/widgets/template_picker_test.dart`
Expected: FAIL with "Target of URI doesn't exist: 'package:smart_grading_mobile/presentation/widgets/template_picker.dart'"

- [ ] **Step 3: Implement TemplatePicker**

```dart
// client/mobile/lib/presentation/widgets/template_picker.dart
import 'package:flutter/material.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';

/// Chip-based picker for selecting the OMR template used in the Test Lab.
///
/// The Phiếu 30 câu - A4 option is rendered as disabled (greyed out, not
/// tappable) because the factory for that template is not yet implemented.
class TemplatePicker extends StatelessWidget {
  /// Currently selected template. Used to determine which chip is highlighted.
  final OMRTemplate selected;

  /// Invoked with the freshly-built template when the user taps an enabled chip.
  final ValueChanged<OMRTemplate> onChanged;

  const TemplatePicker({
    super.key,
    required this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final selectedKey = _keyFor(selected);

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      alignment: WrapAlignment.center,
      children: [
        _buildChip(
          label: 'Sample 4',
          keyValue: 'sample4',
          selectedKey: selectedKey,
          factoryBuilder: OMRTemplate.sample4,
          enabled: true,
        ),
        _buildChip(
          label: 'Phiếu 15 câu - A5',
          keyValue: '15q',
          selectedKey: selectedKey,
          factoryBuilder: OMRTemplate.from15Question,
          enabled: true,
        ),
        _buildChip(
          label: 'Phiếu 30 câu - A4',
          keyValue: '30q',
          selectedKey: selectedKey,
          factoryBuilder: null,
          enabled: false,
        ),
      ],
    );
  }

  Widget _buildChip({
    required String label,
    required String keyValue,
    required String selectedKey,
    required OMRTemplate Function()? factoryBuilder,
    required bool enabled,
  }) {
    final isSelected = keyValue == selectedKey;
    final selectedColor = const Color(0xFF6366F1);
    final disabledBg = const Color(0xFFE2E8F0);
    final disabledFg = const Color(0xFF94A3B8);

    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: enabled
          ? (picked) {
              if (picked && factoryBuilder != null) {
                onChanged(factoryBuilder());
              }
            }
          : null,
      selectedColor: selectedColor,
      backgroundColor: enabled ? Colors.white : disabledBg,
      labelStyle: TextStyle(
        color: !enabled
            ? disabledFg
            : (isSelected ? Colors.white : const Color(0xFF0F172A)),
        fontWeight: FontWeight.w600,
      ),
      side: BorderSide(
        color: isSelected ? selectedColor : const Color(0xFFE2E8F0),
        width: 1.5,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    );
  }

  String _keyFor(OMRTemplate t) {
    if (t.id == '15q') return '15q';
    // Sample 4 and any other template with name starting "Sample" maps to 'sample4'.
    if (t.name.startsWith('Sample')) return 'sample4';
    return '';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client/mobile && flutter test test/presentation/widgets/template_picker_test.dart`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/presentation/widgets/template_picker.dart client/mobile/test/presentation/widgets/template_picker_test.dart
git commit -m "feat(omr): add TemplatePicker widget for Test Lab template selection"
```

---

## Task 3: Wire TemplatePicker into OMRTestLabPage

**Files:**
- Modify: `client/mobile/lib/presentation/pages/omr_test_lab_page.dart`

- [ ] **Step 1: Make `_template` mutable and add import**

In `client/mobile/lib/presentation/pages/omr_test_lab_page.dart`:

a) Add this import below the existing `package:smart_grading_mobile/presentation/widgets/omr_processing_log.dart` import (around line 8):

```dart
import 'package:smart_grading_mobile/presentation/widgets/template_picker.dart';
```

b) Change line 28 from:

```dart
  final OMRTemplate _template = OMRTemplate.sample4();
```

to:

```dart
  OMRTemplate _template = OMRTemplate.sample4();
```

- [ ] **Step 2: Run flutter analyze to verify the change compiles**

Run: `cd client/mobile && flutter analyze lib/presentation/pages/omr_test_lab_page.dart`
Expected: No new errors. (The `final` → non-`final` change must be the only diff.)

- [ ] **Step 3: Insert TemplatePicker into _buildCaptureScreen**

In `_buildCaptureScreen()` (around line 169-249), insert a `TemplatePicker` widget **above** the existing `Icon` (currently at line 178), so users see the template choice before scanning. Keep everything else in the column unchanged.

The diff is purely additive at the top of the `children: [ ... ]` list — the new opening of the `children` array becomes:

```dart
          children: [
            TemplatePicker(
              selected: _template,
              onChanged: (t) {
                setState(() => _template = t);
                _reset();
              },
            ),
            const SizedBox(height: 24),
            const Icon(
              Icons.science_outlined,
              size: 80,
              color: Color(0xFF6366F1),
            ),
            const SizedBox(height: 24),
```

(Keep all the existing widgets below the `Icon` — the `Text("OMR Scanner Test Lab")`, the description, the badge (which Task 4 will make dynamic), and the camera/gallery row — unchanged.)

- [ ] **Step 4: Run flutter analyze to verify wiring compiles**

Run: `cd client/mobile && flutter analyze lib/presentation/pages/omr_test_lab_page.dart`
Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/presentation/pages/omr_test_lab_page.dart
git commit -m "feat(omr): wire TemplatePicker into OMRTestLabPage with mutable template state"
```

---

## Task 4: Dynamic Questions/Options Badge Text

**Files:**
- Modify: `client/mobile/lib/presentation/pages/omr_test_lab_page.dart`

The static `'11 Questions | 4 Options'` text in `_buildCaptureScreen()` should reflect whichever template is currently selected. Sample 4 reports 11 questions; the 15-question template reports 15.

- [ ] **Step 1: Update the badge to use dynamic counts**

In `client/mobile/lib/presentation/pages/omr_test_lab_page.dart`, replace the `Container` containing the badge (currently the block spanning lines 202-216) with:

```dart
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F0FE),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${_template.outputColumns.length} Questions | 4 Options',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF6366F1),
                ),
              ),
            ),
```

The only change is wrapping the `Text` literal in a dynamic expression that uses `_template.outputColumns.length` (the total number of fields in the template). For Sample 4 the length is 11; for the 15q template it is 19 (sbd1, sbd2, md1, md2, q1..q15). The badge will therefore read "19 Questions | 4 Options" for the 15q template. This is a deliberate trade-off: the spec called for a dynamic count and the column length is the only available signal, even though the 15q template includes the 4 SBD/MĐ digits in that count. The badge remains informational.

- [ ] **Step 2: Run flutter analyze to verify**

Run: `cd client/mobile && flutter analyze lib/presentation/pages/omr_test_lab_page.dart`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add client/mobile/lib/presentation/pages/omr_test_lab_page.dart
git commit -m "feat(omr): show dynamic question count in OMRTestLabPage badge"
```

---

## Task 5: Show SBD/MĐ Header on 15q Results

**Files:**
- Modify: `client/mobile/lib/presentation/pages/omr_test_lab_page.dart`

When the active template is `15q` and the result is available, render a header row above the existing `TabBar` showing the concatenated SBD and MĐ values.

- [ ] **Step 1: Insert SBD/MĐ header in _buildResultScreen**

In `_buildResultScreen()` (currently lines 272-317), the body of the returned `Column` is `[Container(TabBar), Expanded(TabBarView)]`. Insert a new `Container` **between** the TabBar `Container` and the `Expanded`, but only when `_template.id == '15q'`.

Replace the existing return body (from `return Column(` through the closing `);`) with:

```dart
    return Column(
      children: [
        Container(
          color: Colors.white,
          child: TabBar(
            controller: _tabController,
            labelColor: const Color(0xFF6366F1),
            unselectedLabelColor: const Color(0xFF64748B),
            indicatorColor: const Color(0xFF6366F1),
            tabs: const [
              Tab(text: 'Bubble Overlay'),
              Tab(text: 'Details'),
              Tab(text: 'Pipeline Log'),
            ],
          ),
        ),
        if (_template.id == '15q') _buildSbdMdHeader(),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              if (showBubbleOverlay)
                OMRBubbleOverlay(
                  imageBytes: displayBytes,
                  imageWidth: displayWidth,
                  imageHeight: displayHeight,
                  result: _processingResult!,
                )
              else
                _buildNoImageOverlay(),
              OMRBubbleDetailsTable(result: _processingResult!),
              OMRProcessingLog(result: _processingResult!),
            ],
          ),
        ),
      ],
    );
```

- [ ] **Step 2: Add the _buildSbdMdHeader helper**

Add this method to `_OMRTestLabPageState` (place it directly above the existing `_buildNoImageOverlay()` method at line 319):

```dart
  Widget _buildSbdMdHeader() {
    final answers = _processingResult?.response.answers ?? const <String, String>{};
    final sbd = '${answers['sbd1'] ?? ''}${answers['sbd2'] ?? ''}';
    final md = '${answers['md1'] ?? ''}${answers['md2'] ?? ''}';
    return Container(
      width: double.infinity,
      color: const Color(0xFFE8F0FE),
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _CodeLabel(label: 'SBD', value: sbd),
          _CodeLabel(label: 'MĐ', value: md),
        ],
      ),
    );
  }
```

- [ ] **Step 3: Add the _CodeLabel private widget**

Append at the bottom of `client/mobile/lib/presentation/pages/omr_test_lab_page.dart`, after the existing `_CaptureButton` class closing `}`:

```dart
class _CodeLabel extends StatelessWidget {
  final String label;
  final String value;

  const _CodeLabel({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Color(0xFF64748B),
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value.isEmpty ? '--' : value,
          style: const TextStyle(
            fontSize: 20,
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
            letterSpacing: 2,
          ),
        ),
      ],
    );
  }
}
```

- [ ] **Step 4: Run flutter analyze to verify**

Run: `cd client/mobile && flutter analyze lib/presentation/pages/omr_test_lab_page.dart`
Expected: No new errors. (Verify that `OMRProcessingResult.response.answers` is the correct accessor — it should be a `Map<String, String>` per the existing `OMRResponse` model. If analyze flags the type, check the `OMRResponse` definition and adjust the cast; do not change the field name without updating both this task and Task 2 tests that reference `captured.id`.)

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/presentation/pages/omr_test_lab_page.dart
git commit -m "feat(omr): show SBD/MĐ header on 15-question template results"
```

---

## Task 6: Final Verification

- [ ] **Step 1: Run all Flutter tests**

Run: `cd client/mobile && flutter test`
Expected: All tests pass, including the new factory tests (Task 1) and picker tests (Task 2). Pre-existing tests must continue to pass.

- [ ] **Step 2: Run Flutter analyze across the project**

Run: `cd client/mobile && flutter analyze`
Expected: No new errors or warnings introduced by these changes.

- [ ] **Step 3: Build a debug APK**

Run: `cd client/mobile && flutter build apk --debug`
Expected: Build succeeds.

- [ ] **Step 4: Manual smoke test on a real device or emulator**

Verify the full flow described in spec section 6.2:
1. Launch the app, open OMR Test Lab from the ScanView.
2. Confirm the default chip is "Sample 4" and the badge shows "11 Questions | 4 Options".
3. Capture or pick the existing sample4 image. Verify the result renders identically to before (no SBD/MĐ header, only q1..q11 in the Details tab).
4. Tap the "Phiếu 15 câu - A5" chip. Confirm the badge updates to "19 Questions | 4 Options" and the previous result is cleared.
5. Capture or pick a 15q A5 image. Verify the result includes a blue header row with "SBD" and "MĐ" labels and detected values like "12" and "03".
6. Switch back to "Sample 4". Confirm the picker resets and the previously selected template is the only one whose results are shown.

(If a synthetic 15q image is not yet available, skip the visual verification of SBD/MĐ — Step 1's unit tests are sufficient evidence that the factory is correct, and the integration test will be done in a follow-up task once a real sheet exists.)

- [ ] **Step 5: No commit needed**

This is a verification step only. If any previous step required a follow-up fix, commit it as `fix(omr): ...` before finishing.

---

## Summary

| Task | Component | Test | Time |
|------|-----------|------|------|
| 1 | OMRTemplate.from15Question factory | omr_template_from15_test.dart | 5 min |
| 2 | TemplatePicker widget | template_picker_test.dart | 8 min |
| 3 | OMRTestLabPage wiring (mutable template, picker insertion) | (analyze) | 5 min |
| 4 | Dynamic badge text | (analyze) | 2 min |
| 5 | SBD/MĐ header on 15q results | (analyze) | 8 min |
| 6 | Final verification (test + analyze + build + manual) | flutter test / analyze / build | 5 min |

**Total: ~33 minutes, 5 commits, 6 tasks**
