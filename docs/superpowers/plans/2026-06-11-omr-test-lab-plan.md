# OMR Test Lab - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dedicated OMR testing screen accessible from ScanView that captures images via camera/gallery and displays detailed bubble grading diagnostics in 3 tabs.

**Architecture:** A single StatefulWidget page (`OMRTestLabPage`) that orchestrates image capture via `ImagePicker` and `CameraBloc`, processes through existing `OMREngine`, and renders results via 3 dedicated widgets: a `CustomPainter`-based bubble overlay, a per-question intensity table, and a pipeline step log.

**Tech Stack:** Flutter (Dart), existing `OMREngine`, `CameraBloc`, `ImagePicker`, `image` package.

---

## File Structure

```
Files to create:
- client/mobile/lib/presentation/pages/omr_test_lab_page.dart    # Main page + state machine
- client/mobile/lib/presentation/widgets/omr_bubble_overlay.dart # CustomPainter overlay
- client/mobile/lib/presentation/widgets/omr_bubble_details_table.dart # Per-question table
- client/mobile/lib/presentation/widgets/omr_processing_log.dart   # Pipeline log widget

Files to modify:
- client/mobile/lib/presentation/pages/scan_view.dart             # Add nav button
```

---

## Task 1: OMRProcessingLog Widget

**Files:**
- Create: `client/mobile/lib/presentation/widgets/omr_processing_log.dart`

- [ ] **Step 1: Write the failing test**

```dart
// client/mobile/test/presentation/widgets/omr_processing_log_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/presentation/widgets/omr_processing_log.dart';
import 'package:smart_grading_mobile/domain/omr/models/grading_result.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_response.dart';
import 'package:smart_grading_mobile/domain/omr/engine/omr_engine.dart';

void main() {
  testWidgets('displays processing steps', (tester) async {
    final result = OMRProcessingResult(
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
      gradingResult: OMRGradingResult.empty(),
      response: OMRResponseDebug(
        answers: {},
        bubbleIntensities: {},
        globalThreshold: 120.0,
        localThresholds: {},
      ),
      processingTime: const Duration(milliseconds: 500),
      processingSteps: ['Step 1'],
      detectedCorners: [const Offset(10,10), const Offset(100,10), const Offset(100,100), const Offset(10,100)],
      skewAngle: 2.5,
      wasWarped: true,
    );

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: OMRProcessingLog(result: result),
      ),
    ));

    expect(find.text('500 ms'), findsOneWidget);
    expect(find.text('Warped'), findsOneWidget);
    expect(find.text('2.5 deg'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/mobile && flutter test test/presentation/widgets/omr_processing_log_test.dart`
Expected: FAIL — file does not exist

- [ ] **Step 3: Write implementation**

Write `client/mobile/lib/presentation/widgets/omr_processing_log.dart` with:
- `_OMRProcessingLogState` that builds a ListView
- Top metadata card showing: processing time (ms), warp status (Warped/No Warp), skew angle (deg), corner count
- Step list: each step with green checkmark (success) or red X (error) icon + text
- Uses existing design system colors: `Color(0xFFE6F4EA)` green, `Color(0xFFFCE8E6)` red, `Color(0xFFFEF3C7)` yellow

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client/mobile && flutter test test/presentation/widgets/omr_processing_log_test.dart`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/presentation/widgets/omr_processing_log.dart client/mobile/test/presentation/widgets/omr_processing_log_test.dart
git commit -m "feat(flutter): add OMRProcessingLog widget for pipeline step display"
```

---

## Task 2: OMRBubbleDetailsTable Widget

**Files:**
- Create: `client/mobile/lib/presentation/widgets/omr_bubble_details_table.dart`
- Create: `client/mobile/test/presentation/widgets/omr_bubble_details_table_test.dart`

- [ ] **Step 1: Write the failing test**

```dart
// client/mobile/test/presentation/widgets/omr_bubble_details_table_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/omr/models/grading_result.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_response.dart';
import 'package:smart_grading_mobile/domain/omr/engine/omr_engine.dart';
import 'package:smart_grading_mobile/presentation/widgets/omr_bubble_details_table.dart';

void main() {
  testWidgets('displays bubble details table', (tester) async {
    final result = OMRProcessingResult(
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/mobile && flutter test test/presentation/widgets/omr_bubble_details_table_test.dart`
Expected: FAIL — file does not exist

- [ ] **Step 3: Write implementation**

Write `client/mobile/lib/presentation/widgets/omr_bubble_details_table.dart` with:
- Fixed header row: `#`, `Field`, `Ans`, `Intensity` (right-aligned), `Threshold` (right-aligned), `Status`
- ListView rows for each field in `bubbleIntensities.keys`
- Columns: row number, field label (e.g., "q1"), detected answer, average intensity, local threshold, status badge
- Row background color: green for MARKED, yellow for UNMARKED, red for MULTI
- Status badges: MARKED (green), UNMARKED (yellow), MULTI (red)
- If `bubbleIntensities` is empty, show "No bubble data available"

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client/mobile && flutter test test/presentation/widgets/omr_bubble_details_table_test.dart`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/presentation/widgets/omr_bubble_details_table.dart client/mobile/test/presentation/widgets/omr_bubble_details_table_test.dart
git commit -m "feat(flutter): add OMRBubbleDetailsTable widget for per-question breakdown"
```

---

## Task 3: OMRBubbleOverlay Widget

**Files:**
- Create: `client/mobile/lib/presentation/widgets/omr_bubble_overlay.dart`
- Create: `client/mobile/test/presentation/widgets/omr_bubble_overlay_test.dart`

- [ ] **Step 1: Write the failing test**

```dart
// client/mobile/test/presentation/widgets/omr_bubble_overlay_test.dart
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'package:smart_grading_mobile/domain/omr/models/grading_result.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_response.dart';
import 'package:smart_grading_mobile/domain/omr/engine/omr_engine.dart';
import 'package:smart_grading_mobile/presentation/widgets/omr_bubble_overlay.dart';

void main() {
  testWidgets('renders without crashing', (tester) async {
    final img.Image testImage = img.Image(width: 100, height: 100);
    final bytes = Uint8List.fromList(img.encodePng(testImage));

    final result = OMRProcessingResult(
      gradingResult: OMRGradingResult.empty(),
      response: OMRResponseDebug(
        answers: {'q1': 'A'},
        bubbleIntensities: {
          'q1': [
            BubbleIntensity(bubbleValue: 'A', meanIntensity: 50.0, isMarked: true),
            BubbleIntensity(bubbleValue: 'B', meanIntensity: 200.0, isMarked: false),
          ],
        },
        globalThreshold: 120.0,
        localThresholds: {'q1': 115.0},
      ),
      processingTime: const Duration(milliseconds: 500),
      processingSteps: [],
      wasWarped: true,
    );

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: OMRBubbleOverlay(
          imageBytes: bytes,
          result: result,
        ),
      ),
    ));

    expect(find.byType(OMRBubbleOverlay), findsOneWidget);
    expect(find.byType(InteractiveViewer), findsOneWidget);
  });

  testWidgets('displays legend', (tester) async {
    final img.Image testImage = img.Image(width: 100, height: 100);
    final bytes = Uint8List.fromList(img.encodePng(testImage));

    final result = OMRProcessingResult(
      gradingResult: OMRGradingResult.empty(),
      response: OMRResponseDebug(
        answers: {},
        bubbleIntensities: {},
        globalThreshold: 120.0,
        localThresholds: {},
      ),
      processingTime: const Duration(milliseconds: 500),
      processingSteps: [],
    );

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: OMRBubbleOverlay(
          imageBytes: bytes,
          result: result,
        ),
      ),
    ));

    expect(find.text('MARKED'), findsOneWidget);
    expect(find.text('UNMARKED'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/mobile && flutter test test/presentation/widgets/omr_bubble_overlay_test.dart`
Expected: FAIL — file does not exist

- [ ] **Step 3: Write implementation**

Write `client/mobile/lib/presentation/widgets/omr_bubble_overlay.dart` with:
- `OMRBubbleOverlay` widget accepting `Uint8List imageBytes` and `OMRProcessingResult result`
- `InteractiveViewer` wrapping the canvas for zoom/pan
- `_BubbleOverlayPainter` CustomPainter that:
  - Draws the image scaled to fit displaySize using `img.decodeImage` + raw pixel rendering or Image widget
  - Draws bubbles as colored circles at positions derived from `bubbleIntensities`
  - Colors: green for marked, gray for unmarked, yellow for low-intensity unmarked
  - Shows bubble value letter inside each circle
- Bottom legend bar: MARKED (green dot), UNMARKED (gray dot), global threshold value
- Uses `ui.Image` from raw RGBA bytes for efficient image rendering in CustomPainter

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client/mobile && flutter test test/presentation/widgets/omr_bubble_overlay_test.dart`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/presentation/widgets/omr_bubble_overlay.dart client/mobile/test/presentation/widgets/omr_bubble_overlay_test.dart
git commit -m "feat(flutter): add OMRBubbleOverlay widget with CustomPainter visualization"
```

---

## Task 4: OMRTestLabPage (Main Page)

**Files:**
- Create: `client/mobile/lib/presentation/pages/omr_test_lab_page.dart`
- Create: `client/mobile/test/presentation/pages/omr_test_lab_page_test.dart`

- [ ] **Step 1: Write the failing test**

```dart
// client/mobile/test/presentation/pages/omr_test_lab_page_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/presentation/pages/omr_test_lab_page.dart';

void main() {
  testWidgets('shows capture buttons initially', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: OMRTestLabPage()));

    expect(find.text('OMR Test Lab'), findsOneWidget);
    expect(find.text('Camera'), findsOneWidget);
    expect(find.text('Gallery'), findsOneWidget);
  });

  testWidgets('shows template info', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: OMRTestLabPage()));

    expect(find.text('20 Questions | 4 Options'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/mobile && flutter test test/presentation/pages/omr_test_lab_page_test.dart`
Expected: FAIL — file does not exist

- [ ] **Step 3: Write implementation**

Write `client/mobile/lib/presentation/pages/omr_test_lab_page.dart` with:
- `_OMRTestLabPageState` with enum `_CaptureState { idle, capturing, processing, done, error }`
- `_processImage()` calls `OMREngine().processImage(bytes, template)` where template is `OMRTemplate.simpleMcq(20, 4)`
- State machine:
  - `idle` → shows `_buildCaptureScreen()` with Camera + Gallery buttons
  - `capturing` → uses `_imagePicker` for camera/gallery, then calls `_processImage()`
  - `processing` → shows centered loading spinner + "Processing OMR..."
  - `done` → shows TabBarView with 3 tabs (OMRBubbleOverlay, OMRBubbleDetailsTable, OMRProcessingLog)
  - `error` → shows error icon + message + "Try Again" button
- `_reset()` method to return to idle state
- `TabController` with 3 tabs: "Bubble Overlay", "Details", "Pipeline Log"
- Import `OMRTestLabPage` (self), `OMREngine`, `OMRTemplate`, `OMRBubbleOverlay`, `OMRBubbleDetailsTable`, `OMRProcessingLog`, `CameraBloc`, `ImagePicker`

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client/mobile && flutter test test/presentation/pages/omr_test_lab_page_test.dart`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/presentation/pages/omr_test_lab_page.dart client/mobile/test/presentation/pages/omr_test_lab_page_test.dart
git commit -m "feat(flutter): add OMRTestLabPage - main test lab screen"
```

---

## Task 5: Add Navigation Button to ScanView

**Files:**
- Modify: `client/mobile/lib/presentation/pages/scan_view.dart`

- [ ] **Step 1: Check current state of navigation buttons**

Read `scan_view.dart` around line 160-250 to confirm the row of action buttons. The Live Scan / Review / Analytics buttons are in a Row at lines 161-239.

- [ ] **Step 2: Add navigation button**

Add import at top of scan_view.dart:
```dart
import 'package:smart_grading_mobile/presentation/pages/omr_test_lab_page.dart';
```

Add a new icon button in the Row (after the Analytics button, before the closing bracket):
```dart
const SizedBox(width: 12),
GestureDetector(
  onTap: () {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const OMRTestLabPage(),
      ),
    );
  },
  child: Container(
    width: 48,
    height: 48,
    decoration: BoxDecoration(
      color: const Color(0xFF6366F1),
      borderRadius: BorderRadius.circular(8),
    ),
    child: const Center(
      child: Icon(Icons.science_outlined, color: Colors.white, size: 22),
    ),
  ),
),
```

- [ ] **Step 3: Verify**

Run: `cd client/mobile && flutter analyze lib/presentation/pages/scan_view.dart`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add client/mobile/lib/presentation/pages/scan_view.dart
git commit -m "feat(flutter): add OMR Test Lab button to ScanView navigation"
```

---

## Task 6: Final Verification

- [ ] **Step 1: Run all Flutter tests**

Run: `cd client/mobile && flutter test`
Expected: All tests pass

- [ ] **Step 2: Run Flutter analyze**

Run: `cd client/mobile && flutter analyze`
Expected: No errors or warnings

---

## Summary

| Task | Component | Test | Time |
|------|-----------|------|------|
| 1 | OMRProcessingLog | omr_processing_log_test.dart | 5 min |
| 2 | OMRBubbleDetailsTable | omr_bubble_details_table_test.dart | 5 min |
| 3 | OMRBubbleOverlay | omr_bubble_overlay_test.dart | 5 min |
| 4 | OMRTestLabPage | omr_test_lab_page_test.dart | 5 min |
| 5 | ScanView nav | (manual verify) | 3 min |
| 6 | Final verification | flutter test + analyze | 3 min |

**Total: ~26 minutes, 6 tasks, 6 commits**
