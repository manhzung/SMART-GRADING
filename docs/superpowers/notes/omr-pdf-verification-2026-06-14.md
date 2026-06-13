# OMR PDF Coordinate Consistency - Manual E2E Verification

**Date:** 2026-06-14
**Status:** Code changes complete, awaiting manual E2E verification on real device
**Branch:** master

---

## What was implemented

This change makes web-rendered OMR PDF and mobile-scanned bubbles use the **SAME** coordinate source, eliminating the 3-way drift between:

| Before | After |
|---|---|
| web/jsPDF (zones mm) | web/jsPDF (consumes /json pixel coords, converts to mm) |
| server/PDFKit (zones mm → pt) | server/PDFKit (unchanged, still used for /pdf endpoint) |
| server/JSON service (zones mm → px @ 300 DPI) | server/JSON service (SINGLE source of truth) |

The web client now calls `GET /omr-templates/:id/json` instead of `/full`, and the JSON's pixel coordinates are converted to mm (÷ 11.811) for jsPDF rendering. This guarantees that a bubble drawn at (200px, 400px) on the web is at exactly the same logical position as one detected at (200px, 400px) on the mobile scan.

A new `autoAlign` flag in the OMR template lets teachers disable automatic X-shift compensation on mobile for templates that have been visually calibrated against a real scanned sheet.

---

## Steps to verify

### Prerequisites
- Node.js, npm
- A test browser (Chrome/Firefox)
- Flutter mobile app on a physical device or emulator with a working camera

### Step 1: Start backend

```bash
cd server
npm install
npm run dev
# Server runs on http://localhost:3000
```

### Step 2: Start web dev server

```bash
cd client/web
npm install
npm run dev
# Vite dev server runs on http://localhost:5173 (or similar)
```

### Step 3: Create / select an OMR template

1. Open web UI at the dev server URL.
2. Navigate to OMR Templates → create a new one (or use existing default).
3. Note the template ID (e.g., from the URL after creation: `/omr-templates/64...`).

### Step 4: Verify /json output

```bash
TOKEN="<your auth token>"

# Get full template
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/omr-templates/<id>/full | jq

# Get JSON (what mobile AND web now use)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/omr-templates/<id>/json | jq
```

**Expected:**
- `/json` returns `pageDimensions`, `bubbleDimensions`, `fieldBlocks` with `origin`/`bubblesGap`/`labelsGap` in pixels @ 300 DPI.
- New `autoAlign: true` field is present in the response.
- `fieldBlocks.student_code` and `fieldBlocks.version_code` exist if the template has those zones.
- `fieldBlocks.answer_area_col_0` through `fieldBlocks.answer_area_col_N` exist for the answer area.

### Step 5: Generate PDF from web

1. In web UI, navigate to an exam that uses the template above.
2. Click "Export OMR Sheet" → a PDF downloads.
3. Open the PDF and verify:
   - Bubbles are present at the right positions.
   - Header text reads the school name and exam title.
   - Student ID and Exam Code sections are visible.
   - Answer area shows rows of A/B/C/D bubbles.

### Step 6: Print and scan with mobile

1. Print the PDF on A4 paper (use "Actual size", not "Fit").
2. Open mobile app, log in, navigate to the same exam.
3. Tap the camera/scan icon, point at the printed sheet.
4. Verify that the **overlay circles** (drawn by the app) line up with the **printed bubbles**.
   - Look especially at the FIRST and LAST columns, and the FIRST and LAST rows.
   - With `autoAlign=true` (default), the app may apply a small X-shift to compensate for scan misalignment. This is expected.
   - If the overlay is way off (> 5mm) even with auto-align, the template likely needs calibration.

### Step 7: Test autoAlign = false (optional)

1. In the database, set `scannerConfig.autoAlign = false` on the template:
   ```js
   db.omrTemplates.updateOne({_id: ObjectId("...")}, {$set: {"scannerConfig.autoAlign": false}})
   ```
2. Re-fetch `/json` and confirm `autoAlign: false`.
3. Re-scan a printed sheet. The app should use template coordinates exactly with no auto-shift. Useful for templates you've already verified visually.

### Step 8: Tolerance check

- Expected error: ≤ 0.5mm (≈ 1.4 pixels @ 300 DPI).
- If error is 1-2mm: probably a rendering rounding issue, check if the printer is at 100% scale.
- If error is > 5mm: there is likely a unit-conversion bug, investigate immediately.

---

## Automated tests that PASS

| Suite | Result |
|---|---|
| `server/tests/unit/services/omrTemplateJson.test.js` | 10/10 PASS (incl. 2 snapshots) |
| `client/web/src/features/reports/omrSheetPdf.test.ts` | 6/6 PASS |
| `client/web` (all vitest) | 64/64 PASS |
| `npx tsc -b --noEmit` | clean |

## Tests that were NOT run

| Suite | Reason |
|---|---|
| `client/mobile/test/domain/omr/template_test.dart` | flutter test cannot build `dartcv4` native code in this environment (missing Visual Studio C++ compiler). The new test cases (3) and the field are validated by code review only. |

The Dart code was verified to be syntactically valid via `dart analyze` (no errors, only 1 pre-existing unused-element warning unrelated to this change).

---

## Bug found during testing

While writing the behavior tests, I discovered a documentation mismatch: my test "50 questions, 5/row → 10 columns" was wrong — the actual code generates **5 column blocks** (one per column, each holding all questions for that column). This is correct behavior (one FieldBlock per column, matching the OMR engine's expectations); my test was updated to reflect this.

The snapshot test caught the intended change of adding `autoAlign: true` to the output; that was the only snapshot diff (`+ 1 line per snapshot`).

---

## Files changed

```
docs/superpowers/plans/2026-06-14-omr-pdf-coords.md                  (plan, 1507 lines)
server/src/services/omrTemplateJson.service.js                        (refactor + autoAlign)
server/src/models/omrTemplate.model.js                                (+ autoAlign field)
server/tests/unit/services/omrTemplateJson.test.js                   (NEW: 10 tests + 2 snapshots)
server/tests/unit/services/__snapshots__/omrTemplateJson.test.js.snap (NEW)
client/web/src/features/reports/omrSheetPdf.ts                        (rewritten: JSON input)
client/web/src/features/reports/omrSheetPdf.test.ts                   (NEW: 6 tests)
client/web/src/features/reports/examReportExport.ts                   (fetch /json)
client/mobile/lib/domain/omr/models/omr_template.dart                 (+ autoAlign field)
client/mobile/lib/domain/omr/engine/app_omr_models.dart              (default autoAlign: true)
client/mobile/lib/domain/omr/engine/omr_engine.dart                  (pass autoAlign through)
client/mobile/lib/domain/omr/engine/app_omr_engine.dart               (clear _shifts when off)
client/mobile/test/domain/omr/template_test.dart                      (+ 3 autoAlign tests)
docs/superpowers/notes/omr-pdf-verification-2026-06-14.md            (this file)
```

---

## Commits

```
09fb5a9 feat(mobile): thread autoAlign from OMRTemplate to AppOMREngine
e29ac2c feat(mobile): parse autoAlign flag from OMR template JSON
7bd0c27 refactor(web): rewrite omrSheetPdf to consume /json endpoint output
328faff feat(omr): add autoAlign flag to scannerConfig
7836e13 refactor(omr): split convertTemplate into testable helpers, add autoAlign
78bc0e4 test(omr): add behavior tests for layout computation
2a548f2 test(omr): add snapshot tests for omrTemplateJson.service
bc7bd9a docs(omr): add implementation plan for OMR PDF coordinate consistency
dc289cd docs(omr): add design doc for OMR PDF coordinate consistency
```
