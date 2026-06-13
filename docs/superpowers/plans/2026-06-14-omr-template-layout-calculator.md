# Plan: OMR Template Layout Calculator (fix 15q overlap systemic)

**Date:** 2026-06-14
**Status:** Draft (awaiting user review)
**Scope:** `client/mobile/lib/domain/omr/models/omr_template.dart` + tests
**Related work:** Builds on commits `7b83419`, `c9f3bdc`, `ca8e212` from 15q template work

---

## 1. Problem Statement

### 1.1 What user reported

After commit `c9f3bdc` (which fixed overlap between the 3 answer row blocks of the 15q template), user reported that the **SBD and MĐ zones still have overlapping bubbles**:

> "vẫn còn lỗi tương tự với 2 zone kia, hãy lên plan để tính toán tọa độ sao cho hợp lý với tất cả các template nhé"

### 1.2 Root cause analysis

`OMRTemplate.from15Question()` defines SBD and MĐ blocks with:

```dart
'origin': [177, 413],
'bubblesGap': 12,  // 1mm — between consecutive bubble values within one digit
'labelsGap': 12,   // 1mm — between consecutive digit columns
'fieldType': 'QTYPE_INT_FROM_1',  // direction = vertical (default)
'fieldLabels': ['sbd1', 'sbd2'],  // 2 digit columns
'bubbleValues': ['1','2',...,'9','0']  // 10 values per column
```

`FieldBlock.fromConfig` (line 121 of `field_block.dart`) for vertical direction computes:
- `xBase = originX + fi * labelsGap` → sbd1 at x=177, sbd2 at x=189
- `by = yBase + vi * bubblesGap` → 10 bubbles per column

With `bubbleWidth=30` and `labelsGap=12`, the gap between sbd1.rightEdge and sbd2.leftEdge is `12 - 30 = -18px` — **bubbles overlap by 18px**.

This is a **systemic issue**, not a per-template bug. The same hazard exists for any future template that has multiple `fieldLabels` (digits, question columns) in one block with `labelsGap < bubbleWidth`.

### 1.3 Why the spec did not catch it

The design spec `2026-06-14-omr-15question-template-design.md` section 2.4 lists SBD/MĐ as:

> | SBD | QTYPE_INT_FROM_1 | vertical | ['sbd1','sbd2'] | ... | (177, 413) | 12 (1mm) | 12 (1mm) |

The spec treats `labelsGap=12` as "1mm" — a reasonable physical dimension for a printed sheet — but does **not validate that `labelsGap >= bubbleWidth`** in pixels. At 300 DPI, 1mm = 12px, and bubble is 30px. Physically this is a constraint that needs to be checked.

### 1.4 Future risk

If we keep hard-coding coordinates for each template, every new template is a chance to introduce the same bug. A spec-only fix (add a "no overlap" rule to the table) does not help: nothing enforces the rule in code.

---

## 2. Goal & Non-Goals

### 2.1 Goals

1. Fix the SBD/MĐ overlap in the 15q template **with a layout that is mathematically verified non-overlapping**.
2. Add a small helper API that any future template (30q, custom) can use to compute safe origins, **preventing the same bug class from recurring**.
3. Add regression tests that fail loudly if overlap constraints are violated.
4. Keep `FieldBlock` API unchanged — `FieldBlock.fromConfig` still accepts raw config; the helper sits above it.

### 2.2 Non-Goals

- ❌ Refactor `FieldBlock` to detect/auto-fix overlap in `fromConfig` (Approach C, rejected: hides config errors instead of fixing them).
- ❌ Migrate hard-coded templates to dynamic JSON-driven templates (covered by separate `2026-06-14-omr-pdf-coords` spec).
- ❌ Calibrate 15q coordinates to match a real scanned sheet (still TODO — no reference image available; this plan only ensures the layout is internally consistent and non-overlapping).
- ❌ Build auto-layout generator that reads from the OMR template MongoDB schema (out of scope; the mobile factory pattern stays).

---

## 3. Approach: Layout Calculator Helper

### 3.1 New file

`client/mobile/lib/domain/omr/models/template_layout.dart`

A pure-function module (no Flutter dependency, easy to test) that exposes:

```dart
class TemplateLayout {
  /// Small visible safety margin (px) added on top of `bubbleWidth` when
  /// checking that two bubbles don't touch. Kept tiny so the page
  /// layout still uses almost all of the available space; the *real*
  /// constraint is `labelsGap >= bubbleWidth`, which we check
  /// strictly. Templates that need more breathing room (e.g. for
  /// thick pen strokes) can pass a larger `marginPx` to the helpers.
  static const int defaultClearancePx = 1;

  /// DPI assumed for mm↔px conversions.
  static const double pxPerMm = 300.0 / 25.4; // ≈ 11.811

  // ── mm conversion helpers ──────────────────────────────────────
  static int mmToPx(double mm) => (mm * pxPerMm).round();

  // ── Column / row stacking helpers ─────────────────────────────
  /// Returns a list of `originX` (or `originY`) values for stacking
  /// `count` columns (or rows) given the bubble dimension and the
  /// gap between adjacent bubble edges.
  ///
  /// `bubbleDim`: bubble width/height in pixels (from the template)
  /// `gap`: distance between adjacent bubble edges, in pixels
  ///        (already accounts for labelsGap - bubbleDim)
  /// `count`: number of columns/rows to lay out
  /// `firstOrigin`: starting origin coordinate
  /// `marginPx`: optional extra safety margin; defaults to
  ///             `defaultClearancePx`. Set to 0 for tight packing.
  static List<int> stackAlongAxis({
    required int bubbleDim,
    required int gap,
    required int count,
    required int firstOrigin,
    int marginPx = defaultClearancePx,
  });

  // ── Validation helper ──────────────────────────────────────────
  /// Throws `StateError` if a template's field blocks produce
  /// overlapping bubbles or extend outside the page. Intended to be
  /// called from factory constructors in `assert(...)` so it runs in
  /// debug builds only.
  ///
  /// Rule per block: for each axis, the spacing between adjacent
  /// bubble centers must be at least `bubbleDim` (no overlap). The
  /// check is axis-aware:
  ///   horizontal direction → check labelsGap (column spacing)
  ///                          and bubblesGap (option spacing)
  ///   vertical direction   → check labelsGap (row spacing)
  ///                          and bubblesGap (value spacing)
  ///
  /// Rule across blocks: block bboxes must not overlap and must fit
  /// inside `(0,0)..(pageWidth, pageHeight)`.
  static void assertNoOverlap(OMRTemplate template);
}
```

### 3.2 How the 15q template uses it

```dart
factory OMRTemplate.from15Question() {
  // Bubble dimensions
  const bubbleDim = 30;
  const clearance = TemplateLayout.minBubbleClearance;
  const columnGap = bubbleDim + clearance;  // 34 px
  const rowGap    = 94;                     // 8mm, between questions
  const betweenRows = bubbleDim + rowGap;   // 124 px, between row blocks

  // SBD: 2 digit columns, 10 bubbles per column
  // Spec places SBD at 15mm from left edge → x = 15mm ≈ 177 px
  const sbdOriginX = TemplateLayout.mmToPx(15);  // 177
  const sbdOriginY = TemplateLayout.mmToPx(35);  // 413

  // MD: 2 digit columns at 100mm from left edge
  const mdOriginX = TemplateLayout.mmToPx(100);  // 1181
  const mdOriginY = TemplateLayout.mmToPx(35);   // 413

  // Answer rows: 5 questions per row, 4 options per question
  // Block origin = top-left of first question's first option.
  // Spec: x = 15mm + 6mm (qNum width) = 21mm, y = 65mm for first row.
  const answerOriginX = TemplateLayout.mmToPx(21);  // 248
  const firstAnswerY  = TemplateLayout.mmToPx(65);  // 768

  // Stack 3 answer rows so each new block clears the last question
  // of the previous block. With labelsGap=94 between questions and
  // 5 questions per block, block height = 4*94 + 30 = 406 px.
  final answerY = TemplateLayout.stackVertically(
    pageHeight: 2480,
    bubbleHeight: bubbleDim,
    rowGapPx: rowGap,
    fieldsPerBlock: 5,
    blockCount: 3,
    firstOriginY: firstAnswerY,
  );

  return OMRTemplate(
    ...
    fieldBlocks: [
      FieldBlock.fromConfig(
        name: 'SBD',
        config: {
          'fieldType': 'QTYPE_INT_FROM_1',
          'fieldLabels': ['sbd1', 'sbd2'],
          'origin': [sbdOriginX, sbdOriginY],
          'bubblesGap': 12,        // 1mm between bubble values
          'labelsGap': columnGap,  // 34px (was 12) — clears overlap
        },
        ...
      ),
      // MD: same as SBD, just shifted X
      // 3 answer rows with origins from `answerY` list
    ],
  );
}
```

### 3.3 Constants & math (transparent, test-verified)

```
bubbleDim = 30
minClearance = 4
columnGap (digits) = 30 + 4 = 34 px
rowGap (questions) = 94 px ≈ 8mm
betweenRows (row blocks) = 30 + 94 = 124 px between Row N's last question
                                    and Row N+1's first question

SBD block height = (2 digits - 1) * 34 + 30 = 30 + 64 = 64 px
  bottom edge = 413 + 64 = 477 px

MD block height = same 64 px, bottom = 477

Answer Row 1 starts at y = 768. 5 questions, gap 94.
  q1 y = 768, q5 y = 768 + 4*94 = 1144
  Row 1 bottom (q5 edge) = 1144 + 30 = 1174

Answer Row 2 must start at y > 1174.
  Using stackVertically: y = 768 + 5*94 = 1238  → 1238 > 1174 ✓
  q6 y = 1238, q10 y = 1238 + 4*94 = 1614
  Row 2 bottom = 1614 + 30 = 1644

Answer Row 3 must start at y > 1644.
  y = 1238 + 5*94 = 1708  →  1708 > 1644 ✓
  q11 y = 1708, q15 y = 1708 + 4*94 = 2084
  Row 3 bottom = 2084 + 30 = 2114
  Page height = 2480  →  2114 < 2480 ✓
```

All values above are reproducible by the calculator and enforced by tests.

---

## 4. Implementation Tasks

### Task 1: Add `TemplateLayout` helper

- **File (new):** `client/mobile/lib/domain/omr/models/template_layout.dart`
- **File (new):** `client/mobile/test/domain/omr/models/template_layout_test.dart`

Exports:
- `static const int defaultClearancePx = 1;` (1px safety on top of `bubbleDim`)
- `static const double pxPerMm = 300.0 / 25.4;`
- `static int mmToPx(double mm)`
- `static List<int> stackAlongAxis({...})` — returns list of origin coordinates along one axis
- `static void assertNoOverlap(OMRTemplate template)` — validates a full template (axis-aware, cross-block)

TDD: write tests first.

Test cases:
- `mmToPx(15) == 177`, `mmToPx(35) == 413`, `mmToPx(65) == 768`, `mmToPx(100) == 1181`, `mmToPx(148) == 1748`, `mmToPx(210) == 2480`
- `stackAlongAxis(bubbleDim: 30, gap: 94, count: 3, firstOrigin: 768)` returns `[768, 1238, 1708]`
- `stackAlongAxis` with `gap < bubbleDim` throws `StateError`
- `assertNoOverlap(sample4())` does not throw
- `assertNoOverlap(from15Question())` does not throw **after fix**
- `assertNoOverlap` on a synthetic template with `labelsGap=12, bubbleWidth=30` (the bug) throws

### Task 2: Fix `OMRTemplate.from15Question()`

- **File (modify):** `client/mobile/lib/domain/omr/models/omr_template.dart`
- Change SBD and MD `labelsGap` from `12` to `bubbleWidth + 1` (i.e., `31`).
- Change 3 answer row `originY` to use `TemplateLayout.stackAlongAxis(...)` so they are derived, not hard-coded.
- Replace the existing top-of-factory docstring with a short reference to the calculator and a `TODO(calibration)` for absolute mm positions (already there).

Verify with `dart analyze` and the existing test file.

### Task 3: Add `assertNoOverlap` regression tests

- **File (modify):** `client/mobile/test/domain/omr/models/omr_template_from15_test.dart`

Add tests:
- `from15Question SBD block has no internal column overlap` — assert `sbd.labelsGap >= sbd.bubbleWidth + TemplateLayout.defaultClearancePx`
- `from15Question MD block has no internal column overlap` — same for MD
- `from15Question answer rows stack without overlap` — already covered by commit `c9f3bdc`; tighten to use the calculator's output as expected values
- `from15Question all blocks fit within A5 page` — assert the union of block bboxes is contained in `(0,0)..(1748,2480)`

### Task 4: Add `assertNoOverlap` to both factories

- **File (modify):** `client/mobile/lib/domain/omr/models/omr_template.dart`
- Add a call at the bottom of both factories (`sample4()`, `from15Question()`): `TemplateLayout.assertNoOverlap(this);` wrapped in `assert(...)` so it runs in debug builds only. Catches future regressions when the factory code is edited.

---

## 5. Files Changed

| Action | File | Description |
|---|---|---|
| **create** | `client/mobile/lib/domain/omr/models/template_layout.dart` | Pure layout math helpers |
| **create** | `client/mobile/test/domain/omr/models/template_layout_test.dart` | Unit tests for the calculator |
| **modify** | `client/mobile/lib/domain/omr/models/omr_template.dart` | Use calculator in 15q factory; add `assertNoOverlap` debug assert |
| **modify** | `client/mobile/test/domain/omr/models/omr_template_from15_test.dart` | Add regression tests for SBD/MD overlap + full-page fit |

No changes to: `field_block.dart`, `omr_bubble_overlay.dart`, `omr_test_lab_page.dart`, `template_picker.dart`, server code, web code.

---

## 6. Out-of-Scope / Future Work

1. **Calibration to real sheet.** Once a real 15q A5 sheet image is available, the `mm` constants in the calculator calls (15, 35, 65, 100) need to be measured against the printed bubbles. The calculator makes the *structure* safe; the *absolute positions* still need calibration.
2. **30q template.** When the next template is added, the calculator should be used from day 1. The `assertNoOverlap` debug assert in the factory will catch configuration mistakes.
3. **Auto-layout generator.** A long-term idea is to compute all origins from a top-level "zone spec" rather than hard-coding them in each factory. Out of scope for this plan; tracked in the `2026-06-14-omr-pdf-coords` spec.

---

## 7. Verification (per `verification-before-completion`)

Before claiming done:

1. `cd client/mobile && dart analyze lib/domain/omr/models/`
   → Expect: No issues.
2. `cd client/mobile && dart analyze test/domain/omr/`
   → Expect: No issues.
3. `cd client/mobile && flutter test test/domain/omr/`
   → Expect: All pass.
   (Note: this environment's `flutter test` is blocked by a pre-existing
   `dartcv4` native-asset build failure unrelated to this work. The
   `TemplateLayout` module is pure Dart with no Flutter dependency, so
   `dart analyze` on it and a unit test with no widget tree give strong
   confidence. CI on Linux/macOS should run the full suite.)
4. Manual visual check (user): open Test Lab, scan the 15q sheet, verify
   no overlap between sbd1/sbd2, md1/md2, and across the 3 answer rows.

---

## 8. Risks & Open Questions

1. **Risk:** Changing SBD/MD `labelsGap` from 12 to 34 changes the visual
   spacing of digits on the printed template (which is generated by the
   web's `omrSheetPdf.ts`, not by the mobile factory). The 15q spec
   hand-tuned digits to be tightly packed. The fix here is a **scanning**
   layout — the printing layout is a separate concern tracked in the
   `omr-pdf-coords` spec. Until that is unified, the 15q template
   *visually* shows digits close together but the scanner knows to look
   34px apart. **Mitigation:** Document this in the factory docstring
   ("scanning gap, not printing gap"). When `omr-pdf-coords` lands,
   the printing side will use the same calculator.

2. **Question (resolved):** Should `defaultClearancePx` be 1, 4, or
   higher? **Decision:** the calculator's job is to *prevent overlap*,
   not to enforce a large visual gap. Each template already declares
   its own `bubbleWidth`/`labelsGap` — the calculator reads these and
   asserts `labelsGap >= bubbleWidth`. `defaultClearancePx = 1` adds
   a tiny safety margin (1px) on top so a slightly off-center scan
   doesn't bleed into the neighbor. Templates that need more
   breathing room (e.g. for thick pen strokes) can pass a larger
   value to the helpers. If the printed sheet visually feels too
   tight, increase `labelsGap` in the factory — the calculator will
   not complain.

3. **Question:** Should `assertNoOverlap` be runtime or debug-only?
   Runtime catches production bugs but slows the factory. Debug-only
   keeps performance. **Default if no answer:** debug-only via
   `assert(...)` to avoid performance cost in production; unit tests
   still exercise it.
