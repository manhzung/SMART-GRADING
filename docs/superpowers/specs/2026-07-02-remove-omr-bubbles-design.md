# Remove OMR Bubbles and Corner Markers

## Goal
Replace all bubble-based answer indicators in generated exam/answer PDFs with plain `A B C D` text, and remove the 4 corner fiducial markers from each sheet.

## Approved Layout
- Option **A**: final answer sheet uses only plain `A B C D` text per question.
- No bubble circles, squares, or grouping boxes around options.
- No corner reference markers on any generated sheet.

## Scope
- Backend AMC LaTeX answer-sheet generator.
- Backend PDFKit answer-sheet generator.
- Backend PDFKit OMR template PDF generator.
- Web jsPDF OMR sheet generator.
- Calage/template coordinate helpers that still emit bubble/corner metadata.
- Related unit tests.

## Design

### 1. AMC LaTeX Answer Sheet
- File: `server/src/amc/amcAnswerSheetTexGenerator.js`
- Replace `\AMCcodeGrid{q1}{A,B,C,D}` with a plain text row layout:
  - `q1.  A   B   C   D`
- Keep student ID and version code fields as text-assisted fields if needed, but do not add bubbles for options.

### 2. PDFKit Answer Sheet
- File: `server/src/amc/answerSheetGenerator.js`
- In `_drawAnswerGrid()`:
  - Remove `doc.circle(...)` bubble rendering.
  - Keep question numbering.
  - Render only `A B C D` labels aligned with each question row.

### 3. PDFKit OMR Template PDF
- File: `server/src/services/omrTemplatePdf.service.js`
- Remove bubble/square rendering.
- Keep only text labels `A B C D` where bubbles used to be shown.

### 4. Web jsPDF OMR Sheet
- File: `client/web/src/features/reports/omrSheetPdf.ts`
- Mirror the plain-text layout used on the backend.
- Do not draw bubble shapes.

### 5. Remove Corner Markers
- File: `server/src/amc/amcCoordinateCalculator.js`
  - Remove `calculateCornerMarkers()` and its usages.
- File: `server/src/amc/amcTexLayoutParser.js`
  - Remove corner marker `tracepos` generation.
- File: `server/src/amc/calageToTemplate.js`
  - Stop expecting/describing corner marker entries if present.
- Note: `amcCalageParser.js` already skips labels containing `position`, so parsing remains safe.

### 6. Template / Calage Impact
- `server/src/amc/templateBuilder.js` and `server/src/amc/calageToTemplate.js`
- If answer bubbles are removed from printed sheets, keep bubble coordinate generation only for fields still used by downstream OMR.
- If OMR grading no longer needs option-bubble coordinates, mark answer bubble generation as optional/deprecated rather than deleting it immediately.

## Tests
- Update `server/tests/unit/answerSheetGenerator.test.js` to assert text output instead of bubble shapes.
- Update `server/tests/unit/amcSourceGenerator.test.js` if it asserts on generated TeX structure.
- Add regression tests confirming:
  - No `\AMCcodeGrid` in generated answer-sheet TeX.
  - No bubble-drawing calls in PDFKit generators.
  - No `positionHG/HD/BG/BD` entries in generated calage content.

## Migration Notes
- Existing `OMRTemplate` records may still contain bubble coordinates.
- This change affects newly generated exams only unless a migration/backfill is added later.