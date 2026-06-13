# OMR Test Lab - Design Specification

## Overview

A dedicated testing screen for validating the OMR scanning pipeline on the Flutter mobile app. Accessed from the Grading Center (ScanView), it allows users to capture OMR images and view detailed diagnostic information about how each bubble is graded.

**Platform:** Flutter mobile (client/mobile)
**Access point:** ScanView (Grading Center) in HomePage tabs

---

## Navigation Flow

```
ScanView
  └── [New button: "OMR Test Lab"] --> OMRTestLabPage
                                              ├── Capture screen (camera + gallery)
                                              └── Result detail screen (3 tabs)
```

**Navigation:** `Navigator.push(MaterialPageRoute(...))` following existing patterns in ScanView.

---

## Screen: OMRTestLabPage

### Capture Screen (initial state)

- **Two action buttons:**
  - Camera icon → Live camera capture
  - Gallery icon → Pick image from device
- **Template:** Hardcoded `OMRTemplate.simpleMcq(numQuestions: 20, numOptions: 4)` — no exam selection needed
- **No evaluation config** (debug mode only, no grading)

### Result Detail Screen (after capture)

Three tabs:

| Tab | Widget | Purpose |
|-----|--------|---------|
| Bubble Overlay | `OMRBubbleOverlay` | Visual overlay on warped image |
| Bubble Details | `OMRBubbleDetailsTable` | Per-question intensity + threshold table |
| Processing Log | `OMRProcessingLog` | Sequential pipeline step list |

---

## Components

### 1. `OMRTestLabPage` (main page)

**State:**
- `captureState`: enum `{ idle, capturing, processing, done, error }`
- `imageBytes`: captured image
- `processingResult`: `OMRProcessingResult?`

**Flow:**
1. User taps Camera/Gallery → captures image
2. State → `processing`
3. Call `OMREngine().processImage(bytes, template)`
4. State → `done` with result, or `error`
5. Show result screen

**Reuse existing:**
- `CameraBloc` for camera initialization/preview
- `ImagePicker` for gallery
- `OMREngine` for processing
- `CornerOverlayPainter` for corner visualization

### 2. `OMRBubbleOverlay` (widget)

**Purpose:** Render warped image with colored bubbles overlaid.

**Input:**
- `img.Image` warpedImage (from OMREngine output)
- `OMRTemplate` template
- `OMRResponseDebug` response

**Overlay colors:**
- Green (`Color(0xFF22C55E)`): bubble is marked (`isMarked == true`)
- Red (`Color(0xFFEF4444)`): bubble has low intensity but not marked (for visual contrast)
- Transparent: unmarked bubble
- Blue dashed border: detected corner points

**Implementation:**
- Use `CustomPainter` to draw circles over the warped image
- Scale bubble positions based on template coordinates mapped to warped image dimensions
- Legend at bottom: colored indicators with labels

### 3. `OMRBubbleDetailsTable` (widget)

**Purpose:** Show per-question breakdown table.

**Columns:**

| # | Field | Answer | Intensity | Threshold | Status |
|---|-------|--------|-----------|-----------|--------|
| 1 | q1 | A | 87.3 | 120.0 | MARKED |
| 2 | q2 | (empty) | 198.2 | 120.0 | UNMARKED |
| 3 | q3 | B | 45.1 | 120.0 | MARKED |
| ... | | | | | |

**Status badge colors:**
- MARKED: Green background
- UNMARKED: Yellow background
- MULTI-MARKED: Red background (if `multiMarked == true`)

**Implementation:**
- `ListView` or `Table` widget
- Color-coded rows based on status
- Tap on row → highlight corresponding bubble on the image

### 4. `OMRProcessingLog` (widget)

**Purpose:** Show sequential pipeline steps.

**Content:**
- `processingSteps` list from `OMRProcessingResult`
- Each step: icon (check for success, X for failure) + description text
- Metadata row: processing time, warp status, skew angle, corner count

**Implementation:**
- `ListView.builder` with step items
- Metadata at top in a summary card

---

## Data Sources

All data comes from existing `OMRProcessingResult`:

| Field | Type | Usage |
|-------|------|-------|
| `processingSteps` | `List<String>` | ProcessingLog |
| `detectedCorners` | `List<Offset>?` | BubbleOverlay corners |
| `skewAngle` | `double?` | Metadata display |
| `wasWarped` | `bool` | Metadata display |
| `processingTime` | `Duration` | Metadata display |
| `response.globalThreshold` | `double` | DetailsTable |
| `response.localThresholds` | `Map<String, double>` | DetailsTable |
| `response.bubbleIntensities` | `Map<String, List<BubbleIntensity>>` | DetailsTable + Overlay |
| `response.answers` | `Map<String, String>` | DetailsTable |
| `response.multiMarked` | `bool` | DetailsTable badge |
| `response.hasUnmarked` | `bool` | DetailsTable badge |

---

## Implementation Plan

### Files to create:
1. `client/mobile/lib/presentation/pages/omr_test_lab_page.dart`
2. `client/mobile/lib/presentation/widgets/omr_bubble_overlay.dart`
3. `client/mobile/lib/presentation/widgets/omr_bubble_details_table.dart`
4. `client/mobile/lib/presentation/widgets/omr_processing_log.dart`

### Files to modify:
1. `client/mobile/lib/presentation/pages/scan_view.dart` — add navigation button

---

## Testing Strategy

- Unit test for bubble intensity display logic
- Integration test with synthetic OMR image (existing engine test can be reused)
- Manual test on physical device with real OMR sheet

---

## Open Questions (resolved)

- [x] Image source: Camera capture (confirmed)
- [x] Template: Default 20 Q / 4 options (confirmed)
- [x] Display approach: Bubble Overlay + Details Table + Processing Log (3 tabs)
- [x] No external sample images needed
