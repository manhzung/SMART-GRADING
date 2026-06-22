# OMR Bubble Alignment Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the mobile bubble overlay misalignment by making the JSON service origin = cell CENTER (matching server PDFKit rendering). Then migrate web client to use the server PDF API for single source of truth.

**Architecture:** The root cause is a coordinate mismatch: the JSON service produces `origin = cell TOP` (no centering offset), while server PDFKit renders bubbles centered in cells (`cy + (cellH - bubbleH)/2`). The fix adds the missing `lGap/2` centering offset to JSON origin so both paths align. Web PDF download is migrated from client-side jsPDF to server `/omr-templates/:id/pdf` API.

**Tech Stack:** Node.js (server), Jest (tests), React/Vitest (web tests)

---

## Root Cause

In `omrTemplateJson.service.js`, answer area origin Y is:
```javascript
const oy = mmToPx(gridY + cellHOffset); // cellHOffset = 0 — MISSING!
```

But server PDF (`omrTemplatePdf.service.js`) draws bubbles at:
```javascript
const byB = cy + (cellH - bubbleH) / 2; // ← centering offset
```

The missing `cellHOffset = lGap / 2` causes all answer bubbles to appear ~24px (A5) or ~47px (A4) **below** where the overlay places them. The engine reads from the same JSON, so bubble detection is also off by this offset.

**Correct formula:** `oy = gridY + (bh + lGap - bh) / 2 = gridY + lGap / 2`

---

## Files Map

| Layer | File | Action |
|---|---|---|
| Server | `server/src/services/omrTemplateJson.service.js` | Modify — add centering offset to answer area origin Y |
| Server | `server/tests/unit/services/omrTemplateJson.test.js` | Modify — update expected origin Y values in existing tests |
| Server | `server/tests/unit/services/__snapshots__/omrTemplateJson.test.js.snap` | Update — regenerate snapshot |
| Web | `client/web/src/features/reports/examReportExport.ts` | Modify — replace `generateOmrSheetPdf()` calls with server PDF API fetch |
| Web | `client/web/src/features/reports/omrSheetPdf.ts` | Deprecate — keep for tests, mark `generateOmrSheetPdf` internal only |
| Web | `client/web/src/features/reports/omrSheetPdf.test.ts` | Modify — keep as verify test for PDF rendering (uses corrected JSON) |

---

## Task 1: Fix JSON Service Origin Y (Root Cause Fix)

**Files:**
- Modify: `server/src/services/omrTemplateJson.service.js:219-231`
- Modify: `server/tests/unit/services/omrTemplateJson.test.js:42-73`
- Update snapshot: `server/tests/unit/services/__snapshots__/omrTemplateJson.test.js.snap`

**Key calculation** (`buildAnswerAreaBlocks`, line ~230):
```javascript
// BEFORE (line 230-231):
const cellHOffset = Math.round(((bc.height || 4) + (bc.spacing?.betweenRows || 8) - (bc.height || 4)) / 2);
// = Math.round(0) = 0  ← BUG
const oy = mmToPx(gridY + cellHOffset);

// AFTER:
const cellHOffset = Math.round(((bc.height || 4) + (bc.spacing?.betweenRows || 8) - (bc.height || 4)) / 2);
// = Math.round((bh + lGap - bh) / 2) = Math.round(lGap / 2)
// bh=4, lGap=8 → cellHOffset = 4mm = 47px
// bh=3, lGap=4 → cellHOffset = 2mm = 24px
const oy = mmToPx(gridY + cellHOffset);
```

The variable name `cellHOffset` is already there but computes to 0 due to the confusing formula. The correct simplified formula is `lGap / 2`.

**Steps:**

- [ ] **Step 1: Update `buildAnswerAreaBlocks` in JSON service**

Read `server/src/services/omrTemplateJson.service.js` lines 219-231. Replace with:

```javascript
  // Center bubble vertically in its cell: offset from cell top to bubble center
  // = (cellH - bubbleH) / 2 = ((bh + lGap) - bh) / 2 = lGap / 2
  const bh = bc.height || 4;
  const lGap = bc.spacing?.betweenRows || 8;
  const cellHOffset = Math.round((bh + lGap - bh) / 2); // = Math.round(lGap / 2)
  // Verification:
  //   A5 bh=3mm, lGap=4mm → cellHOffset = round(2mm) = 24px
  //   A4 bh=4mm, lGap=8mm → cellHOffset = round(4mm) = 47px
  const oy = mmToPx(gridY + cellHOffset);
```

- [ ] **Step 2: Run existing unit tests to see which assertions fail**

Run: `cd server && npm test -- tests/unit/services/omrTemplateJson.test.js --no-coverage`

Expected failures:
- `header occupies top of page` test — `answer_area_col_0.origin[1]` changes from 768 → 815 (768 + 47)
- Snapshot tests — origin[1] changes for all answer area blocks

- [ ] **Step 3: Update the explicit Y-flow test assertion**

In `server/tests/unit/services/omrTemplateJson.test.js` line 57, update the expected origin:

```javascript
// BEFORE:
expect(result.fieldBlocks.answer_area_col_0.origin[1]).toBe(768);

// AFTER:
// gridY = 61mm; cellHOffset = lGap/2 = 4mm = 47px
// oy = round(65 * 11.811) = round(767.7) + 47 = 768 + 47 = 815
expect(result.fieldBlocks.answer_area_col_0.origin[1]).toBe(815);
```

- [ ] **Step 4: Update the `code blocks push answer area down` assertion**

In `server/tests/unit/services/omrTemplateJson.test.js` line 72, update:

```javascript
// BEFORE:
expect(result.fieldBlocks.answer_area_col_0.origin[1]).toBeGreaterThan(1100);

// AFTER:
// The original test only checks that code blocks push Y past a threshold.
// Add 47px to the threshold (the offset added to every answer area block):
// original threshold 1100 + 47 = 1147
expect(result.fieldBlocks.answer_area_col_0.origin[1]).toBeGreaterThan(1147);
```

- [ ] **Step 5: Regenerate snapshots**

Run: `cd server && npm test -- tests/unit/services/omrTemplateJson.test.js --no-coverage --updateSnapshot`

Or with Jest flag: `npm test -- tests/unit/services/omrTemplateJson.test.js --no-coverage -u`

This updates the snapshot file with new origin[1] values for all answer area blocks:
- A4: answer_area_col_0 origin[1] 1299 → 1346 (+47)
- A5: answer_area_col_0 origin[1] 803 → 827 (+24)

- [ ] **Step 6: Run tests to verify all pass**

Run: `cd server && npm test -- tests/unit/services/omrTemplateJson.test.js --no-coverage`

Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
cd server
git add src/services/omrTemplateJson.service.js tests/unit/services/omrTemplateJson.test.js tests/unit/services/__snapshots__/omrTemplateJson.test.js.snap
git commit -m "fix(omr): add cell centering offset to answer area origin Y

The JSON service produced origin = cell TOP (cellHOffset=0), while server
PDFKit renders bubbles centered in cells (byB = cy + (cellH-bubbleH)/2).
This caused all answer bubbles to appear ~24px (A5) or ~47px (A4) BELOW
their actual printed position in the mobile overlay.

Fix: cellHOffset = lGap/2, so oy = mmToPx(gridY + lGap/2).
Now JSON origin = cell CENTER, matching server PDFKit rendering.
Both paths (mobile overlay, engine reading) now use correct coordinates.
"
```

---

## Task 2: Migrate Web Client to Server PDF API

**Files:**
- Modify: `client/web/src/features/reports/examReportExport.ts:475-549`

The two functions to replace are `exportOmrTemplatePdf` and `exportOmrTemplateVersionSheetsPdf`. Both currently fetch the JSON template, pass it to `generateOmrSheetPdf()` (client-side jsPDF), and download. Replace with server API calls.

**Existing server endpoint:** `GET /api/v1/omr-templates/:id/pdf?examTitle=...&schoolName=...`
**Existing server endpoint:** `POST /api/v1/omr-templates/:id/pdf/versions` (for multiple versions, returns ZIP)

**Steps:**

- [ ] **Step 1: Write failing test for new server-based export**

Read `client/web/src/features/reports/examReportExport.ts` lines 475-549 and `client/web/src/presentation/store/examStore.ts` lines 407-465 for reference patterns.

Create a new test file or add to existing test:

```typescript
// client/web/src/features/reports/examReportExport.server-pdf.test.ts
import { describe, it, vi, beforeEach } from 'vitest';
import { exportOmrTemplatePdf, exportOmrTemplateVersionSheetsPdf } from './examReportExport';

// Mock the fetchOmrJson call — we no longer need it
// But we need to mock the server PDF endpoint
global.fetch = vi.fn();

describe('exportOmrTemplatePdf - server API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches PDF from server API instead of generating client-side', async () => {
    const mockPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"
    const mockResponse = new Response(mockPdfBytes, {
      status: 200,
      headers: { 'content-type': 'application/pdf', 'content-length': '4' },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

    const originalDownload = { href: '', click: vi.fn(), remove: vi.fn() };
    const mockAnchor = {
      ...originalDownload,
      click: vi.fn(),
      remove: vi.fn(),
    };
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: () => 'blob:test',
      revokeObjectURL: vi.fn(),
    });

    // Spy on document.createElement
    const createSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLAnchorElement);

    await exportOmrTemplatePdf('template123', 'Test Exam', 'Test School');

    // Should call server PDF endpoint, NOT fetchOmrJson + generateOmrSheetPdf
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatch(/\/omr-templates\/template123\/pdf/);
    expect(mockAnchor.download).toMatch(/PhieuTraLoi_/);
    expect(mockAnchor.click).toHaveBeenCalled();

    createSpy.mockRestore();
  });
});
```

Run: `cd client/web && npm test -- src/features/reports/examReportExport.server-pdf.test.ts --run`

Expected: FAIL (functions not yet updated)

- [ ] **Step 2: Replace `exportOmrTemplatePdf` with server API call**

In `client/web/src/features/reports/examReportExport.ts`, find and replace the `exportOmrTemplatePdf` function (lines 498-514):

```typescript
export async function exportOmrTemplatePdf(
  templateId: string,
  examTitle: string,
  schoolName?: string
): Promise<void> {
  // Call the server PDF endpoint — server uses PDFKit, same as /json coordinates
  const params = new URLSearchParams({ examTitle, schoolName: schoolName || '' });
  const response = await fetch(
    `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/omr-templates/${templateId}/pdf?${params}`,
    { headers: apiService.getHeaders() }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Export failed' }));
    throw new Error(err.message || `Lỗi ${response.status}: Xuất phiếu trả lời thất bại`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/pdf')) {
    const text = await response.text().catch(() => '');
    throw new Error(`Server trả về không phải PDF: ${contentType} — ${text.slice(0, 100)}`);
  }

  const blob = await response.blob();
  if (blob.size === 0) throw new Error('File PDF rỗng (0 bytes)');

  const safe = examTitle?.replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, '_') || 'OMR';
  downloadBlob(blob, `PhieuTraLoi_${safe}_${Date.now()}.pdf`);
}
```

- [ ] **Step 3: Replace `exportOmrTemplateVersionSheetsPdf` with server API call**

In `client/web/src/features/reports/examReportExport.ts`, find and replace `exportOmrTemplateVersionSheetsPdf` (lines 516-549):

```typescript
export async function exportOmrTemplateVersionSheetsPdf(
  templateId: string,
  versionCodes: string[],
  examTitle: string,
  schoolName?: string
): Promise<void> {
  if (versionCodes.length === 1) {
    // Single version — same endpoint as regular PDF
    await exportOmrTemplatePdf(templateId, examTitle, schoolName);
    return;
  }

  // Multiple versions — call the versions endpoint (returns ZIP)
  const response = await fetch(
    `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/omr-templates/${templateId}/pdf/versions`,
    {
      method: 'POST',
      headers: { ...apiService.getHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ versions: versionCodes, examTitle, schoolName }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Export failed' }));
    throw new Error(err.message || `Lỗi ${response.status}: Xuất phiếu trả lời nhiều đề thất bại`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('zip') && !contentType.includes('pdf')) {
    const text = await response.text().catch(() => '');
    throw new Error(`Server trả về không phải ZIP: ${contentType} — ${text.slice(0, 100)}`);
  }

  const blob = await response.blob();
  if (blob.size === 0) throw new Error('File ZIP rỗng (0 bytes)');

  const safe = examTitle?.replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, '_') || 'OMR';
  downloadBlob(blob, `PhieuTraLoi_${safe}_all_versions_${Date.now()}.zip`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd client/web && npm test -- src/features/reports/examReportExport.server-pdf.test.ts --run`

Expected: PASS

- [ ] **Step 5: Verify the verify test still works**

The existing `omrSheetPdf.verify.test.ts` uses `generateOmrSheetPdf` which still exists. It tests PDF rendering with the (now-fixed) JSON coordinates. Run:

```bash
cd client/web && npm test -- src/features/reports/omrSheetPdf.verify.test.ts --run
```

Expected: PASS (PDF should render with corrected origin Y)

- [ ] **Step 6: Run all web tests**

Run: `cd client/web && npm test -- --run`

Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
cd client/web
git add src/features/reports/examReportExport.ts
git add src/features/reports/examReportExport.server-pdf.test.ts
git commit -m "refactor(web): migrate OMR PDF export from client-side jsPDF to server API

Web PDF generation (jsPDF) was a second independent coordinate path.
This caused misalignment when server PDF (PDFKit) and web PDF (jsPDF)
diverged. Now web client fetches pre-rendered PDF from server
/omr-templates/:id/pdf endpoint, ensuring perfect coordinate alignment
with the mobile overlay (both consume the same server-generated PDF).
"
```

---

## Verification

After both tasks are complete:

1. **Server JSON fix:** Run `cd server && npm test -- tests/unit/services/omrTemplateJson.test.js --no-coverage` — all green
2. **Web API migration:** Run `cd client/web && npm test -- --run` — all green
3. **Visual test (manual):**
   - Generate a PDF using the web client
   - Scan the printed PDF with the mobile app's Test Lab
   - Overlay bubbles should appear **exactly on top of** the printed bubbles on the sheet
   - No vertical offset should be visible

---

## Self-Review Checklist

- [ ] Spec coverage: Root cause (JSON origin not centered) → fixed with centering offset
- [ ] Web PDF path → migrated to server API (single source of truth)
- [ ] No placeholders: all code shown in steps, no TODO/TBD
- [ ] Type consistency: `fetchOmrJson` removed from export functions, replaced with server fetch
- [ ] Test assertions updated with correct expected values (815 instead of 768, +47px threshold)
- [ ] Snapshot updated (origin[1] shifts applied correctly per template)
- [ ] `omrSheetPdf.verify.test.ts` still tests PDF rendering quality with corrected coordinates
