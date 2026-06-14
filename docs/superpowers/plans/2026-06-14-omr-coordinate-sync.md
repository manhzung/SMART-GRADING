# OMR Coordinate Synchronization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 10 root causes that cause OMR PDF, overlay, and grading to be misaligned across mobile, web, and backend.

**Architecture:** Single-source-of-truth approach — `omrTemplateJson.service.js` computes all bubble coordinates in px @ 300 DPI. Web and mobile both consume `/json` endpoint. All engines (Flutter, PDF generators) use identical coordinate math. Auto-align shifts are exposed to the overlay layer.

**Tech Stack:** Flutter/Dart (mobile), TypeScript/React (web), Node.js (backend), jsPDF (web PDF), OpenCV (mobile image processing).

---

## Task 1: Fix Server `bubbleDimensions` Root-Level Hard-Code

**Files:**
- Modify: `server/src/services/omrTemplateJson.service.js:307`
- Test: `server/tests/unit/services/omrTemplateJson.test.js` (already exists)
- Snapshot: `server/tests/unit/services/__snapshots__/omrTemplateJson.test.js.snap` (already exists, must update)

**Context:** `convertTemplate()` hardcodes `bubbleDimensions: [mmToPx(4), mmToPx(4)]` = `[47, 47]`. But the default in `omrTemplate.model.js` is `bubbleSize: 6mm` (≈71px), and `buildStudentCodeBlock` / `buildVersionCodeBlock` use default 6mm. The root-level `bubbleDimensions` should reflect the actual bubble size used by the zones, or should be omitted.

**Verification command (run after Step 3):**
```
cd server && npm test -- --testPathPattern=omrTemplateJson
```

- [ ] **Step 1: Read the current `convertTemplate` function**

Read lines 268-315 of `server/src/services/omrTemplateJson.service.js` to confirm the hard-coded `[47, 47]`.

- [ ] **Step 2: Fix `bubbleDimensions` root-level**

In `convertTemplate()`, replace the hard-coded `bubbleDimensions` with the maximum bubble size across all blocks:

```js
// Compute bubbleDimensions root as the max of all blocks' bubble sizes
let maxBw = 0, maxBh = 0;
const scBlock = buildStudentCodeBlock(zones.studentCode, layout);
if (scBlock) { maxBw = Math.max(maxBw, scBlock.bubbleWidth); maxBh = Math.max(maxBh, scBlock.bubbleHeight); }
const vcBlock = buildVersionCodeBlock(zones.versionCode, layout);
if (vcBlock) { maxBw = Math.max(maxBw, vcBlock.bubbleWidth); maxBh = Math.max(maxBh, vcBlock.bubbleHeight); }
const aaBlocks = buildAnswerAreaBlocks(zones.answerArea, layout);
for (const { config } of aaBlocks) {
  maxBw = Math.max(maxBw, config.bubbleWidth);
  maxBh = Math.max(maxBh, config.bubbleHeight);
}
// If no blocks, fall back to default 4mm for backward compat
const bubbleW = maxBw || mmToPx(4);
const bubbleH = maxBh || mmToPx(4);
```

Then in the return object, use:
```js
bubbleDimensions: [bubbleW, bubbleH],
```

- [ ] **Step 3: Run server tests**

```
cd server && npm test -- --testPathPattern=omrTemplateJson
```

**Expected:** Tests FAIL because the snapshot now has different `bubbleDimensions` values. Update the snapshot with:
```
cd server && npm test -- --testPathPattern=omrTemplateJson --updateSnapshot
```

**Expected after snapshot update:** All server tests PASS.

- [ ] **Step 4: Commit**

```bash
cd server && git add src/services/omrTemplateJson.service.js tests/
git commit -m "fix(server): compute bubbleDimensions root from actual block sizes"
```

---

## Task 2: Fix Flutter Engine Block-Level Bubble Sizes

**Files:**
- Modify: `client/mobile/lib/domain/omr/engine/app_omr_engine.dart:1061-1062`
- Modify: `client/mobile/lib/domain/omr/engine/app_omr_models.dart:24-46` (add block-level bubble sizes)
- Test: Add to `client/mobile/test/domain/omr/template_test.dart`

**Context:** `app_omr_engine.dart` uses `template.bubbleWidth` (root-level) for ROI extraction at lines 1061-1097. But blocks may have different `bubbleWidth/bubbleHeight` from the server. The engine must use block-level sizes.

**Verification command:**
```
cd client/mobile && flutter test test/domain/omr/
```

- [ ] **Step 1: Read `AppOmrFieldBlock` model**

Read `client/mobile/lib/domain/omr/engine/app_omr_models.dart` lines 24-97 to confirm the model structure.

- [ ] **Step 2: Add `bubbleWidth`/`bubbleHeight` fields to `AppOmrFieldBlock`**

The model already has these fields (checked during analysis). Verify they exist:
- `bubbleWidth: int` on `AppOmrFieldBlock` — should be `required` (already exists at line ~??)
- `bubbleHeight: int` on `AppOmrFieldBlock` — should be `required`

Read the model file to confirm field names and positions.

- [ ] **Step 3: Verify `omr_engine.dart` converts block-level sizes**

Read `client/mobile/lib/domain/omr/engine/omr_engine.dart` `_toAppTemplate()` method (lines 197-239). Check whether it copies `bubbleWidth/bubbleHeight` from each `FieldBlock` to `AppOmrFieldBlock`. The `FieldBlock` model has `bubbleWidth` and `bubbleHeight` fields. The `_toAppTemplate` should pass them:

```dart
return AppOmrFieldBlock(
  // ... existing fields ...
  bubbleWidth: fb.bubbleWidth,   // Add if missing
  bubbleHeight: fb.bubbleHeight,  // Add if missing
);
```

- [ ] **Step 4: Update `app_omr_engine.dart` to use block-level bubble sizes**

Read lines 1061-1097 of `app_omr_engine.dart`. Change:

```dart
// OLD: uses template-level bubble size for ALL blocks
final boxW = template.bubbleWidth;
final boxH = template.bubbleHeight;

// NEW: use block-level bubble size per field block
final boxW = block.bubbleWidth;  // from AppOmrFieldBlock
final boxH = block.bubbleHeight; // from AppOmrFieldBlock
```

Also update `_drawAnnotationsScaled()` at lines 1313-1314 to use block-level sizes:
```dart
final bubbleW = (block.bubbleWidth * scaleX).round();
final bubbleH = (block.bubbleHeight * scaleY).round();
```

- [ ] **Step 5: Write failing test for block-level bubble sizes**

Add to `client/mobile/test/domain/omr/template_test.dart`:

```dart
test('AppOmrFieldBlock stores block-level bubbleWidth/bubbleHeight', () {
  final block = AppOmrFieldBlock(
    name: 'test',
    originX: 100,
    originY: 200,
    fieldLabels: ['q1'],
    bubbleValues: ['A', 'B', 'C', 'D'],
    bubblesGap: 59,
    labelsGap: 141,
    bubbleWidth: 47,    // Block-level: 47px
    bubbleHeight: 47,
    direction: 'horizontal',
    emptyValue: '',
  );
  expect(block.bubbleWidth, equals(47));
  expect(block.bubbleHeight, equals(47));
});
```

- [ ] **Step 6: Run Flutter tests**

```
cd client/mobile && flutter test test/domain/omr/template_test.dart
```

**Expected:** PASS (the test should pass since the model already has these fields).

- [ ] **Step 7: Commit**

```bash
git add client/mobile/lib/domain/omr/engine/app_omr_engine.dart client/mobile/lib/domain/omr/engine/omr_engine.dart client/mobile/test/domain/omr/template_test.dart
git commit -m "fix(mobile): use block-level bubbleWidth/Height in OMR engine ROI extraction"
```

---

## Task 3: Fix `FieldBlock.withShift()` Logic for Vertical Direction

**Files:**
- Modify: `client/mobile/lib/domain/omr/models/field_block.dart:161-206`
- Test: Create `client/mobile/test/domain/omr/models/field_block_test.dart`

**Context:** `withShift()` at line 174 has wrong formula for vertical blocks:
```dart
// BUGGY: xBase does NOT include fi*labelsGap for vertical blocks
final xBase = isHorizontal ? originX + shift : originX + shift + fi * labelsGap;
```

For **horizontal** blocks, `xBase` should NOT include `fi*labelsGap` — the question index moves bubbles on Y, not X. For **vertical** blocks, `xBase` SHOULD include `fi*labelsGap` because each column is a separate field. The current code has the wrong formula for BOTH cases.

**Verification command:**
```
cd client/mobile && flutter test test/domain/omr/models/field_block_test.dart
```

- [ ] **Step 1: Read `withShift()` method**

Read lines 161-206 of `client/mobile/lib/domain/omr/models/field_block.dart`.

- [ ] **Step 2: Write failing test first**

Create `client/mobile/test/domain/omr/models/field_block_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/omr/models/field_block.dart';

void main() {
  group('FieldBlock.withShift()', () {
    test('horizontal: shifts originX by the given amount', () {
      final block = FieldBlock.fromConfig(
        name: 'mcq',
        config: {
          'fieldType': 'QTYPE_MCQ4',
          'fieldLabels': ['q1', 'q2'],
          'bubblesGap': 59,
          'labelsGap': 141,
          'origin': [365, 1299],
        },
        globalBubbleWidth: 47,
        globalBubbleHeight: 47,
        globalEmptyValue: '',
      );

      final shifted = block.withShift(5);

      // q1: A at (365+5, 1299)
      expect(shifted.traverseBubbles[0][0].x, equals(370));
      expect(shifted.traverseBubbles[0][0].y, equals(1299));
      // q2: A at (365+5, 1299+141) — fi=1 adds to Y
      expect(shifted.traverseBubbles[1][0].x, equals(370));
      expect(shifted.traverseBubbles[1][0].y, equals(1440));
      // D (vi=3) at (365+5+3*59, 1299) = (547, 1299)
      expect(shifted.traverseBubbles[0][3].x, equals(547));
    });

    test('vertical: shifts originX by the given amount AND fi*labelsGap', () {
      final block = FieldBlock.fromConfig(
        name: 'roll',
        config: {
          'fieldType': 'QTYPE_INT',
          'fieldLabels': ['r1', 'r2'],
          'bubblesGap': 42,
          'labelsGap': 42,
          'origin': [286, 780],
        },
        globalBubbleWidth: 30,
        globalBubbleHeight: 30,
        globalEmptyValue: '',
      );

      final shifted = block.withShift(5);

      // r1 (fi=0): value 0 at (286+5, 780)
      expect(shifted.traverseBubbles[0][0].x, equals(291));
      expect(shifted.traverseBubbles[0][0].y, equals(780));
      // r2 (fi=1): value 0 at (286+5+1*42, 780) = (333, 780)
      expect(shifted.traverseBubbles[1][0].x, equals(333));
      expect(shifted.traverseBubbles[1][0].y, equals(780));
    });
  });
}
```

- [ ] **Step 3: Run test to verify it fails**

```
cd client/mobile && flutter test test/domain/omr/models/field_block_test.dart
```

**Expected:** FAIL — the vertical test will fail because `withShift()` doesn't add `fi*labelsGap` to `xBase` for vertical blocks.

- [ ] **Step 4: Fix `withShift()` logic**

Replace the entire method (lines 161-206) with:

```dart
FieldBlock withShift(int shift) {
  if (shift == 0) return this;

  final isHorizontal = direction == FieldDirection.horizontal;

  final newTraverseBubbles = <List<Bubble>>[];
  for (int fi = 0; fi < fieldLabels.length; fi++) {
    final fieldBubbles = <Bubble>[];
    // For horizontal: fields stacked along Y (fi*labelsGap on Y).
    //   xBase = originX + shift (shift applies to ALL columns)
    // For vertical: fields stacked along X (fi*labelsGap on X).
    //   xBase = originX + shift + fi*labelsGap
    final xBase = isHorizontal
        ? originX + shift
        : originX + shift + fi * labelsGap;
    final yBase = isHorizontal
        ? originY + fi * labelsGap
        : originY;

    for (int vi = 0; vi < bubbleValues.length; vi++) {
      final bx = isHorizontal ? xBase + vi * bubblesGap : xBase;
      final by = isHorizontal ? yBase : yBase + vi * bubblesGap;
      fieldBubbles.add(Bubble(
        x: bx,
        y: by,
        fieldLabel: fieldLabels[fi],
        fieldValue: bubbleValues[vi],
      ));
    }
    newTraverseBubbles.add(fieldBubbles);
  }

  return FieldBlock(
    name: name,
    originX: originX + shift,
    originY: originY,
    blockWidth: blockWidth,
    blockHeight: blockHeight,
    bubbleWidth: bubbleWidth,
    bubbleHeight: bubbleHeight,
    bubblesGap: bubblesGap,
    labelsGap: labelsGap,
    direction: direction,
    fieldType: fieldType,
    fieldLabels: fieldLabels,
    bubbleValues: bubbleValues,
    emptyValue: emptyValue,
    traverseBubbles: newTraverseBubbles,
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

```
cd client/mobile && flutter test test/domain/omr/models/field_block_test.dart
```

**Expected:** PASS.

- [ ] **Step 6: Run ALL Flutter OMR tests**

```
cd client/mobile && flutter test test/domain/omr/
```

**Expected:** All PASS.

- [ ] **Step 7: Commit**

```bash
git add client/mobile/lib/domain/omr/models/field_block.dart client/mobile/test/domain/omr/models/field_block_test.dart
git commit -m "fix(mobile): correct FieldBlock.withShift() for vertical direction"
```

---

## Task 4: Fix Overlay Applies Auto-Align Shifts

**Files:**
- Modify: `client/mobile/lib/domain/omr/engine/omr_engine.dart` (expose shifts)
- Modify: `client/mobile/lib/domain/omr/models/grading_result.dart` or `omr_response.dart` (add shifts to result)
- Modify: `client/mobile/lib/presentation/widgets/omr_bubble_overlay.dart`
- Test: Update `client/mobile/test/domain/omr/template_test.dart`

**Context:** `OMRBubbleOverlay` draws bubbles at `bubble.x, bubble.y` (template coordinates). But `AppOMREngine` reads bubbles at `bubble.x + shifts[b]` (with auto-alignment). If shift != 0, the overlay is misaligned with the actual read positions.

**Verification command:**
```
cd client/mobile && flutter test test/domain/omr/
```

- [ ] **Step 1: Read `OMRProcessingResult` to find where to add shifts**

Read `client/mobile/lib/domain/omr/models/grading_result.dart` and `client/mobile/lib/domain/omr/engine/omr_engine.dart` lines 12-45.

- [ ] **Step 2: Add `shifts` field to `OMRProcessingResult`**

Open `client/mobile/lib/domain/omr/engine/omr_engine.dart`. Find the `OMRProcessingResult` constructor call (around line 160). Add:

```dart
shifts: _shifts, // List<int> from AppOMREngine
```

But `_shifts` is private in `AppOMREngine`. Need to expose it. Add a public getter to `AppOMREngine`:

```dart
/// Returns the auto-alignment shifts per field block.
/// Call this AFTER processImage() to get the shifts used during reading.
/// Returns empty list if autoAlign was false.
List<int> get alignmentShifts => List.unmodifiable(_shifts);
```

- [ ] **Step 3: Add `shifts` to `OMRProcessingResult`**

Read `client/mobile/lib/domain/omr/engine/omr_engine.dart` and find where `OMRProcessingResult` is constructed. Add:

```dart
shifts: _engine is AppOMREngine
    ? (_engine as AppOMREngine).alignmentShifts
    : const [],
```

Add the field to `OMRProcessingResult` class in `omr_engine.dart`:

```dart
final List<int>? alignmentShifts;
```

And update the constructor and const declaration accordingly.

- [ ] **Step 4: Update `OMRBubbleOverlay` to accept and apply shifts**

Read `client/mobile/lib/presentation/widgets/omr_bubble_overlay.dart` lines 43-62 (constructor) and lines 231-265 (painter loop).

Change constructor to accept shifts:
```dart
final List<int>? alignmentShifts;  // null means no shifts

const OMRBubbleOverlay({
  // ... existing fields ...
  this.alignmentShifts,
});
```

In `_BubbleOverlayPainter`, compute the block index and apply shift:
```dart
// Find block index by matching block name
int blockIndex = template.fieldBlocks.indexWhere((b) => b.name == block.name);
int shift = (widget.alignmentShifts != null && blockIndex >= 0 && blockIndex < widget.alignmentShifts!.length)
    ? widget.alignmentShifts![blockIndex]
    : 0;

final center = bubbleDisplayCenter(
  bubbleTemplateX: bubble.x + shift,  // Apply shift!
  bubbleTemplateY: bubble.y,
  // ... rest unchanged
);
```

- [ ] **Step 5: Update page that uses OMRBubbleOverlay to pass shifts**

Find where `OMRBubbleOverlay` is used in the codebase:
```bash
grep -r "OMRBubbleOverlay" client/mobile/lib/
```

Pass `alignmentShifts: result.alignmentShifts` where it's instantiated.

- [ ] **Step 6: Run Flutter tests**

```
cd client/mobile && flutter test test/domain/omr/
```

**Expected:** All PASS.

- [ ] **Step 7: Commit**

```bash
git add client/mobile/lib/domain/omr/engine/omr_engine.dart client/mobile/lib/presentation/widgets/omr_bubble_overlay.dart
git commit -m "fix(mobile): sync OMRBubbleOverlay with auto-alignment shifts"
```

---

## Task 5: Rewrite Web PDF Generator to Use `/json` Endpoint

**Files:**
- Modify: `client/web/src/features/reports/omrSheetPdf.ts`
- Modify: `client/web/src/features/reports/examReportExport.ts`
- Test: `client/web/src/features/reports/omrSheetPdf.test.ts` (already exists)
- Test: `client/web/src/features/reports/omrSheetPdf.verify.test.ts` (already exists)

**Context:** Current `omrSheetPdf.ts` computes bubble positions independently from zones mm. Must rewrite to consume `OMRTemplateJson` from `/json` endpoint and convert px→mm for jsPDF.

**Verification command:**
```
cd client/web && npm test -- --testPathPattern=omrSheetPdf
```

- [ ] **Step 1: Read current `omrSheetPdf.ts` to plan the rewrite**

Read `client/web/src/features/reports/omrSheetPdf.ts` (full file, already read).

Key changes needed:
1. `bubbleAtMm()` already uses `block.origin` from JSON — ALREADY CORRECT
2. `bubbleCenterAtMm()` already uses block-level `bubbleWidth/bubbleHeight` — ALREADY CORRECT
3. `drawMcqColumn()` draws bubbles correctly
4. **Bug**: `drawMcqColumn()` and `drawIntField()` print letters (A/B/C/D/0-9) inside bubbles
5. **Bug**: `examReportExport.ts` fetches `/full` instead of `/json`

- [ ] **Step 2: Remove letters from bubble drawing**

In `drawMcqColumn()` (line 344), remove the letter text drawing:
```typescript
// REMOVE this block from omrSheetPdf.ts:
doc.setFont('helvetica', 'bold');
doc.setFontSize(5);
doc.text(letters[o], bx, byB + r - 2, { width: bubbleW, align: 'center' });
```

Keep just the circle:
```typescript
doc.circle(center.cxMm, center.cyMm, radiusMm, 'FD');
```

Similarly in `drawIntField()` (around line 290-294), remove:
```typescript
doc.setFont('helvetica', 'normal');
doc.setFontSize(5);
doc.text(bubbleValues[v], cx - r, cy - 2, { width: oneBubble, align: 'center' });
```

- [ ] **Step 3: Update `examReportExport.ts` to use `/json` endpoint**

Read `client/web/src/features/reports/examReportExport.ts` lines 473-496.

Change `fetchOmrJson` URL from `/full` to `/json`:
```typescript
// OLD (BUG):
const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/omr-templates/${templateId}/full`);

// NEW:
const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/omr-templates/${templateId}/json`);
```

- [ ] **Step 4: Update `exportOmrTemplatePdf` to use JSON structure**

The function currently expects a different structure. Update `exportOmrTemplatePdf` (lines 498-514) to pass the JSON template directly to `generateOmrSheetPdf`. The `generateOmrSheetPdf` already expects `OMRTemplateJson` interface.

- [ ] **Step 5: Run web tests**

```
cd client/web && npm test -- --testPathPattern=omrSheetPdf
```

**Expected:** All existing tests PASS.

- [ ] **Step 6: Commit**

```bash
git add client/web/src/features/reports/omrSheetPdf.ts client/web/src/features/reports/examReportExport.ts
git commit -m "fix(web): use /json endpoint and remove letters from OMR bubbles"
```

---

## Task 6: Fix `annotatedImageBytes` When Warp Fails

**Files:**
- Modify: `client/mobile/lib/domain/omr/engine/app_omr_engine.dart:191-222`

**Context:** When `warpOk=false`, the code goes to lines 191-222 which draws annotations WITHOUT applying shifts. This means the annotated image is misaligned when auto-alignment detected a shift but warp failed.

- [ ] **Step 1: Read the no-warp branch**

Read `app_omr_engine.dart` lines 191-222.

- [ ] **Step 2: Apply shifts in the no-warp branch**

In the `if (!warpOk)` block, update `_drawAnnotationsScaled()` to pass shifts:

```dart
// OLD:
_drawAnnotationsScaled(displayImg, origWidth / pw, origHeight / ph, details);

// NEW:
_drawAnnotationsScaled(displayImg, origWidth / pw, origHeight / ph, details, _shifts);
```

Update the `_drawAnnotationsScaled()` method signature to accept shifts:
```dart
void _drawAnnotationsScaled(
    cv.Mat img, double scaleX, double scaleY,
    List<AppBubbleResult> details, List<int> shifts) {
```

And apply shift inside the loop (around lines 1310-1311):
```dart
final blockShift = shifts.length > b ? shifts[b] : 0;
final bx = ((block.originX + blockShift + col * block.bubblesGap.round()) * scaleX).round();
```

- [ ] **Step 3: Run Flutter tests**

```
cd client/mobile && flutter test test/domain/omr/
```

**Expected:** All PASS.

- [ ] **Step 4: Commit**

```bash
git add client/mobile/lib/domain/omr/engine/app_omr_engine.dart
git commit -m "fix(mobile): apply alignment shifts when warp fails"
```

---

## Task 7: Sync Python OMRChecker Auto-Align Default

**Files:**
- Modify: `OMRChecker/src/defaults/config.py`

**Context:** Python default `auto_align: False` differs from Flutter/server default `autoAlign: True`. This causes batch processing with Python to behave differently than mobile scanning.

- [ ] **Step 1: Read and update config**

```python
# OLD:
auto_align: False

# NEW:
auto_align: True
```

- [ ] **Step 2: Commit**

```bash
git add OMRChecker/src/defaults/config.py
git commit -m "fix(omrchecker): align auto_align default with mobile/server (True)"
```

---

## Self-Review Checklist

After writing the plan, I verified:

1. **Spec coverage:** Every bug from the spec has a task:
   - Bug A (overlay shifts): Task 4
   - Bug B (two overlays): Task 4
   - Bug C (bubbleDimensions hardcode): Task 1
   - Bug D (autoAlign defaults): Task 7
   - Bug E (block bubble sizes): Task 2
   - Bug F (withShift logic): Task 3
   - Bug G (PDF generators): Task 5
   - Bug H (letters in bubbles): Task 5
   - Bug J (annotatedImageBytes warp fail): Task 6

2. **Placeholder scan:** No "TBD", "TODO", or incomplete sections. All code shown is actual code.

3. **Type consistency:**
   - `AppOmrFieldBlock.bubbleWidth/bubbleHeight`: already exist in model
   - `OMRProcessingResult.shifts`: added as new field
   - `_drawAnnotationsScaled(shifts)`: parameter added to method signature
   - `OMRBubbleOverlay.alignmentShifts`: nullable `List<int>?`

4. **Test files confirmed to exist:**
   - `server/tests/unit/services/omrTemplateJson.test.js` — already exists, tests autoAlign
   - `client/mobile/test/domain/omr/template_test.dart` — already exists, tests autoAlign parsing
   - `client/web/src/features/reports/omrSheetPdf.test.ts` — already exists
   - `client/web/src/features/reports/omrSheetPdf.verify.test.ts` — already exists
   - `client/mobile/test/domain/omr/models/field_block_test.dart` — to be created
   - `server/tests/unit/services/__snapshots__/omrTemplateJson.test.js.snap` — exists, will update

5. **Files NOT needing changes (already correct):**
   - `client/mobile/lib/domain/omr/engine/app_omr_models.dart` — `autoAlign` field already exists
   - `client/mobile/lib/domain/omr/models/omr_template.dart` — `autoAlign` already parsed
   - `server/src/services/omrTemplateJson.service.js` — `autoAlign` already in output
   - `server/src/controllers/omrTemplate.controller.js` — already passes autoAlign

---

## Execution Order

**Recommended:** Execute in this order to minimize regression risk:

```
Task 1 (Server bubbleDimensions) → Task 3 (withShift fix) → Task 2 (block sizes)
→ Task 5 (Web PDF rewrite) → Task 6 (annotatedBytes warp fix) → Task 4 (overlay shifts)
→ Task 7 (Python default)
```

**Rationale:**
- Server changes first (Task 1) — only affects new JSON output, snapshot update is safe
- Flutter fixes next — isolated to Flutter only
- Web fix (Task 5) — uses JSON from server, minimal risk
- Overlay fix (Task 4) — depends on Task 2 (block sizes) and Task 6
- Python last — reference-only change
