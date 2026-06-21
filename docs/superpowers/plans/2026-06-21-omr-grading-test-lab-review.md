# OMR Grading & Test Lab — Review & Test Plan

> **Generated:** 2026-06-21
> **Goal:** Review and test the OMR grading pipeline and Test Lab for correctness, then fix any issues found.

---

## System Overview

```
Template (mm) → omrTemplateJson.service.js → OMRTemplateJson (px @ 300 DPI)
                                           ↓
                     Mobile FieldBlock.fromConfig → bubble grid
                     Mobile AppOMREngine → reads bubbles
                     Mobile OMRBubbleOverlay → displays overlay
                     Test Lab → same pipeline with no grading
```

---

## Known Issues to Investigate

### Issue 1: `shouldRepaint` misses `alignmentShifts`

**File:** `client/mobile/lib/presentation/widgets/omr_bubble_overlay.dart`, line 313

```dart
// CURRENT (missing alignmentShifts):
bool shouldRepaint(_BubbleOverlayPainter oldDelegate) {
  return template != oldDelegate.template ||
      bubbleIntensities != oldDelegate.bubbleIntensities ||  // Reference comparison always true!
      globalThreshold != oldDelegate.globalThreshold ||
      hasMultiMarked != oldDelegate.hasMultiMarked ||
      imageWidth != oldDelegate.imageWidth ||
      imageHeight != oldDelegate.imageHeight;
  // alignmentShifts is MISSING
}
```

**Impact:** If alignment shifts change between scans with the same template, the overlay won't repaint. The `bubbleIntensities` comparison is also by reference, which always returns `true` (never matches).

**Verification:** Check if `alignmentShifts` ever changes without `template` changing.

---

### Issue 2: `FieldBlock.withShift` — vertical direction bug

**File:** `client/mobile/lib/domain/omr/models/field_block.dart`, line 174

```dart
// BUG: For vertical, fi*labelsGap is added TWICE
final xBase = isHorizontal
    ? originX + shift
    : originX + shift + fi * labelsGap; // ← shift applied twice

// FIX should be:
final xBase = isHorizontal
    ? originX + shift
    : originX + fi * labelsGap + shift;
```

**Impact:** When auto-alignment applies a shift to a `vertical` field block (like student code), the X shift is doubled.

**Verification:** Test with a student code field (vertical direction) to see if shifting is correct.

---

### Issue 3: Preprocessors array is empty in JSON

**File:** `server/src/services/omrTemplateJson.service.js`

The `convertTemplate` function outputs `"preProcessors": []`. The engine runs without preprocessing if the array is empty.

**Impact:** The scan processing skips Levels, GaussianBlur, etc. May affect image quality on dark/poor scans.

**Verification:** Check if the `omrTemplateJson.service.js` should populate preprocessors from the template's `scannerConfig`.

---

### Issue 4: Test Lab uses bundled `sample4()` with unverified origins

**File:** `client/mobile/lib/domain/omr/models/omr_template.dart`

The `OMRTemplate.sample4()` factory has hardcoded origin values noted as "estimated from spec, not verified."

**Impact:** Test Lab overlay may be misaligned when using the offline fallback.

**Verification:** Compare `sample4()` origin values against a real sheet generated from the server.

---

### Issue 5: Warp-fail annotation path

**File:** `client/mobile/lib/domain/omr/engine/app_omr_engine.dart`, lines 195-245

When the warp fails, the engine:
1. Resizes original image to template dimensions
2. Computes shifts and reads responses at template coordinates
3. Draws annotations scaled to ORIGINAL dimensions (`origWidth / pw`)

**Impact:** Need to verify the overlay receives the correct `croppedWidth`/`croppedHeight` in the warp-fail case.

**Verification:** Check `OMRProcessingResult` fields in warp-fail mode.

---

## Files to Review

| Layer | File | Key Functions |
|-------|------|--------------|
| Server | `server/src/services/omrTemplateJson.service.js` | `convertTemplate`, `buildAnswerAreaBlocks` |
| Flutter | `client/mobile/lib/domain/omr/models/omr_template.dart` | `sample4()` factory, `fromJson` |
| Flutter | `client/mobile/lib/domain/omr/models/field_block.dart` | `fromConfig`, `withShift` |
| Flutter | `client/mobile/lib/domain/omr/engine/app_omr_engine.dart` | `_readResponses`, `processImage`, `_computeShifts` |
| Flutter | `client/mobile/lib/domain/omr/engine/omr_engine.dart` | `toAppTemplate`, `processImage` |
| Flutter | `client/mobile/lib/presentation/widgets/omr_bubble_overlay.dart` | `_BubbleOverlayPainter.shouldRepaint` |
| Flutter | `client/mobile/lib/presentation/pages/omr_test_lab_page.dart` | `_processImage`, `_loadServerTemplates` |

---

## Testing Steps

### Step 1: Verify server JSON fix is in production

- [ ] Call `GET /api/v1/omr-templates/:id/json` on a real template
- [ ] Check `answer_area_col_0.origin[1]` — should be 47px higher than before the fix
- [ ] Compare with the `student_code` origin (which was already centered)

### Step 2: Verify Flutter FieldBlock formulas match engine

- [ ] Trace `origin` → `FieldBlock.fromConfig` → `traverseBubbles`
- [ ] Compare `FieldBlock.fromConfig` grid with `_readResponses` coordinate formulas
- [ ] Confirm: horizontal — `bx = originX + vi*gap`, `by = originY + fi*gap`
- [ ] Confirm: vertical — `bx = originX + fi*gap`, `by = originY + vi*gap`

### Step 3: Fix `withShift` vertical bug

- [ ] Write unit test for `FieldBlock.withShift` with vertical direction
- [ ] Verify shift is NOT doubled for vertical blocks
- [ ] Fix the formula if needed

### Step 4: Fix `shouldRepaint` missing alignmentShifts

- [ ] Add `alignmentShifts` to the repaint check
- [ ] Fix `bubbleIntensities` reference comparison (use deep equality or compare lengths)

### Step 5: Manual Test Lab verification

- [ ] Generate PDF from server `/omr-templates/:id/pdf`
- [ ] Print the PDF
- [ ] Scan with Test Lab
- [ ] Overlay should appear **exactly on top** of printed bubbles
- [ ] No vertical offset should be visible

### Step 6: Preprocessor check

- [ ] Determine if `scannerConfig` in the template should populate the `preProcessors` array
- [ ] If yes, update `convertTemplate` to include preprocessors

---

## Commit Structure

1. **Fix `withShift` vertical bug** — server test + Flutter test
2. **Fix `shouldRepaint` missing alignmentShifts** — Flutter fix
3. **Add preprocessor output to convertTemplate** — server + Flutter (if needed)
4. **Verify sample4() origins** — Flutter (if needed)

---

## Self-Review Checklist

- [ ] `withShift` formula verified against engine `_readResponses`
- [ ] `shouldRepaint` includes all state that affects painting
- [ ] Preprocessor array decision documented
- [ ] Test Lab can successfully verify overlay alignment visually
- [ ] No regressions to existing passing tests
