# Camera Scanner Integration — Mobile OMR Processing

**Date:** 2026-06-10
**Author:** Smart Grading Team
**Status:** Draft — awaiting user review
**Platform:** Flutter Mobile (Android only)
**Stack:** Pure Dart (`image` package), `camera` package, BLoC

---

## 1. Overview

This spec covers adding a full camera-based OMR scanning feature to the Flutter mobile app. The phone processes every image locally, then sends only the results to the server.

**Key goals:**
- Live camera preview with corner detection overlay (4-point guide)
- Automatic perspective correction (port from OMRChecker's `CropPage` and `CropOnMarkers`)
- Full OMR processing pipeline on-device (already implemented in `OMREngine`)
- Guided exam → class → scan → grade → submit workflow
- Online-preferred with offline queue

**Comparison with OMRChecker (Python):**

| OMRChecker | Flutter App | Status |
|---|---|---|
| `CropPage` (Canny + contour) | Port in `CameraEngine` | New |
| `CropOnMarkers` (template matching) | Not needed — free-form edge detection | Simplified |
| `FeatureBasedAlignment` (ORB) | Not needed — `CropPage` enough for camera | Omit |
| `CLAHE` → `Gamma` → `Threshold` → `BubbleReader` | Already in `OMRImageProcessor` + `BubbleReader` | OK |
| `OMRScorer` | Already in `OMRScorer` | OK |
| Batch CLI | Guided single-shot with exam/student flow | Replaced |
| CSV output | API POST + local queue | Replaced |

---

## 2. Architecture

```
PRESENTATION LAYER
├── ScanView                    (Grading tab — exam selection + scan list)
├── ExamDetailPage              (Start Scanning button)
├── CameraScannerPage           (Live preview + capture + process)
│   ├── CameraPreviewWidget     (live stream from camera package)
│   ├── CornerOverlayPainter    (CustomPainter — 4-point guide overlay)
│   ├── CaptureButton           (animated, enabled only when stable)
│   └── AngleIndicator          (tilt warning if > 5°)
├── StudentPickerDialog        (assign student after scan)
└── OMRResultPage              (score card + answer breakdown)

DOMAIN LAYER
├── OMREngine                  (extended: add alignment step)
├── CameraEngine               (new: detectCorners + perspectiveWarp)
├── AlignmentShifter           (existing: per-block vertical shift)
├── BubbleReader               (existing)
├── OMRImageProcessor          (existing)
└── OMRScorer                  (existing)

INFRASTRUCTURE LAYER
├── camera package              (live preview + capture)
├── image package               (pure Dart image processing)
├── OMRTemplateService          (existing: fetch template/evaluation)
├── OMRSubmissionSyncService    (existing: submit results)
├── OMRLocalStorage             (extended: studentId + sync status)
└── connectivity_plus           (existing: network check)
```

---

## 3. CameraEngine — Corner Detection & Warp

### 3.1 Algorithm

Port of `OMRChecker/src/processors/CropPage.py`:

```
1. Decode image to grayscale
2. Gaussian blur (kernel 5x5, sigma=0)
3. Normalize (min-max to [0, 255])
4. Threshold TRUNC (value=240) → Normalize
5. Morphology CLOSE (kernel 10x10) — fills small edge gaps
6. Canny edge detection (lower=75, upper=200)
7. findContours (RETR_LIST) → convexHull each → sort by area (desc, top 5)
8. For each contour:
   a. arcLength (closed) → approxPolyDP (epsilon = 0.02 * peri)
   b. validate_rect: 4 vertices + max_cosine < 0.1
   c. If valid → reshape to [[x,y]×4] → sort by sum (TL=min, BR=max)
9. Return ordered 4 corners: [TL, TR, BR, BL]
```

**Fallback:** If no 4-point contour found after all attempts, return null and let `OMREngine` process the original image without warp.

### 3.2 Perspective Transform

Port of `OMRChecker/src/utils/image.py` → `four_point_transform`:

```
1. Input: 4 ordered corners [TL, TR, BR, BL], target width/height from template
2. Compute perspective transformation matrix M (3x3) using homography
3. For each pixel in target image, compute source coordinate via M⁻¹
4. Bilinear interpolation for smooth output
```

### 3.3 Interface

```dart
class CameraEngine {
  /// Detect 4 corners of the paper in the image.
  /// Returns null if no valid rectangle found.
  Future<List<Offset>?> detectCorners(Uint8List imageBytes);

  /// Apply perspective warp to straighten the paper.
  /// Uses the detected corners to compute homography.
  Future<Uint8List?> perspectiveWarp(
    Uint8List imageBytes,
    List<Offset> corners,
    int targetWidth,
    int targetHeight,
  );

  /// Draw corner overlay on top of camera preview.
  Widget buildCornerOverlay(
    List<Offset> corners,
    Size previewSize,
    Size originalImageSize,
  );
}
```

### 3.4 Math — Homography (Pure Dart)

Since `image` package doesn't expose OpenCV's `getPerspectiveTransform`, implement manually:

```dart
/// Compute 3x3 homography matrix from 4 point correspondences.
/// Uses DLT (Direct Linear Transform) algorithm.
Float64List computeHomography(
  List<Offset> src,
  List<Offset> dst,
);

/// Apply homography to a single point.
Offset applyHomography(Float64List M, Offset pt);

/// Warp entire image using homography (output at targetWidth x targetHeight).
img.Image warpPerspective(
  img.Image src,
  Float64List M,
  int targetWidth,
  int targetHeight,
);
```

---

## 4. OMREngine — Pipeline Extension

### 4.1 Extended Pipeline

```
processImage(imageBytes, template, evalConfig):

  1. Decode → resize 1240px width
  2. detectCorners() via CameraEngine
     ├─ Success → perspectiveWarp() → straightened image
     └─ Fail → use original image (graceful fallback)
  3. Grayscale
  4. Normalize
  5. CLAHE (clipLimit=40, tileSize=8)
  6. Gamma (0.4)
  7. Threshold TRUNC (220)
  8. Normalize
  9. readBubbles() via BubbleReader
  10. grade() via OMRScorer
  11. Return OMRProcessingResult
```

### 4.2 Extended Return Type

```dart
class OMRProcessingResult {
  final OMRGradingResult gradingResult;
  final OMRResponseDebug response;
  final String? errorMessage;
  final Duration processingTime;
  final List<String> processingSteps;
  final List<Offset>? detectedCorners;   // NEW
  final double? skewAngle;               // NEW: degrees
  final bool wasWarped;                   // NEW
}
```

---

## 5. CameraScannerPage — Live Preview

### 5.1 State Machine

```
InitializingCamera
    │ (camera controller ready)
    ↓
CameraReady ────── (corners detected, unstable <500ms) ────→ CornerDetected
    │                                                           │
    │                                                   (stable > 500ms)
    └────────────────→ StableCorner ←────────────────────────────┘
                            │
                            │ (user taps capture)
                            ↓
                       Capturing
                            │
                            ↓
                    ImageCaptured ──→ PreviewState (retake / confirm)
                            │
                            │ (user confirms)
                            ↓
                       Processing → Success → ResultPage
```

### 5.2 UI Components

**CameraPreviewWidget:**
- Uses `camera` package's `CameraPreview`
- Passes each frame to `CameraEngine.detectCorners()` via BLoC
- Throttled: max 2 detections per second (avoid CPU overload)

**CornerOverlayPainter:**
- `CustomPainter` overlaid on camera preview
- Draws: 4 corner circles (filled cyan), connecting lines (dashed cyan), center crosshair
- Color coding:
  - Green: aligned and stable
  - Yellow: detected but unstable
  - Red: tilted > 5°

**Status Bar:**
- Shows: "Aligned ✓", "Tilted! Move closer", "No paper detected"
- Brightness indicator (mean pixel value of center region)

**CaptureButton:**
- Circular button, disabled when corners not stable
- Pulse animation when ready
- Flash effect on capture

### 5.3 CameraBloc Events & States

**Events:**
- `CameraInitialize`
- `CameraFrameAvailable` (contains raw image bytes)
- `CameraCapture`
- `CameraRetake`
- `CameraConfirmCapture`

**States:**
- `CameraInitializing`
- `CameraReady(Offset? lastCorners, double? brightness)`
- `CameraCornerDetected(List<Offset> corners, bool isStable)`
- `CameraStable(List<Offset> corners)`
- `CameraCapturing`
- `CameraImageReady(Uint8List imageBytes, List<Offset>? corners)`

---

## 6. Guided Scanning Flow

### 6.1 User Journey

```
Grading Tab (ScanView)
  └─ [Live Scan] button
       │
       └─ ExamSelectionScreen
            │
            └─ (user selects exam)
                 │
                 └─ StudentListScreen (ungraded students)
                      │
                      └─ CameraScannerPage (with examId + evaluationConfig)
                           │
                           ├─ (scan succeeds)
                           │    └─ StudentPickerDialog (confirm/change student)
                           │         └─ OMRResultPage
                           │              ├─ [Submit] → POST /submissions
                           │              └─ [Retake] → CameraScannerPage
                           │
                           └─ (scan fails)
                                └─ CameraScannerPage (retry with error message)
```

### 6.2 StudentPickerDialog

- Shows matched student photo + name if studentId encoded in bubble sheet
- Allows manual selection from remaining ungraded students
- "Scan Another" option (skip student assignment, queue for later)

---

## 7. Offline Queue & Sync

### 7.1 PendingSubmission Model

```dart
class PendingSubmission {
  final String id;
  final String examId;
  final String? studentId;       // null = unassigned, user picks later
  final Uint8List imageBytes;
  final Map<String, String> answers;
  final double score;
  final double maxScore;
  final DateTime timestamp;
  final SyncStatus status;       // pending | syncing | failed
  final int retryCount;
}
```

### 7.2 Sync Logic

```
App startup:
  └─ Check connectivity
       ├─ Online → syncPendingSubmissions()
       └─ Offline → done

syncPendingSubmissions():
  1. Load all pending from OMRLocalStorage (status=pending | failed)
  2. For each:
     a. status = syncing
     b. POST /submissions (multipart with image + answers + score)
     c. Success → delete from local storage
     d. Failure → status = failed, retryCount++
  3. Retry logic: max 3 attempts, exponential backoff (2s, 4s, 8s)
```

### 7.3 Submit Flow

```
User taps Submit on OMRResultPage:
  1. Check connectivity
  2. Online:
     a. POST result to server (with studentId if assigned)
     b. Success → show confirmation → navigate back
     c. Failure → offer "Save Offline" button
  3. Offline:
     a. Save to local queue
     b. Show "Saved offline. Will sync when online."
```

---

## 8. Error Handling

| Error | User Feedback | Recovery |
|---|---|---|
| Camera permission denied | Dialog explaining need for camera | Open app settings |
| Camera initialization failed | "Camera error" + retry button | Retry init |
| No corners detected | "No paper detected. Try better lighting." | Retake |
| Processing failed (bad image) | "Image unclear. Please retake." | Retake |
| Server submit failed | "Submit failed. Saved offline." | Auto-retry on reconnect |
| Template not found | "Exam template not loaded." | Load from server/cache |

---

## 9. File Map

### New Files

| File | Purpose |
|---|---|
| `lib/domain/omr/engine/camera_engine.dart` | Corner detection + perspective warp |
| `lib/domain/omr/engine/warp_utils.dart` | Homography math (DLT algorithm) |
| `lib/presentation/blocs/camera/camera_bloc.dart` | Camera state machine |
| `lib/presentation/blocs/camera/camera_event.dart` | Camera events |
| `lib/presentation/blocs/camera/camera_state.dart` | Camera states |
| `lib/presentation/widgets/camera_preview_widget.dart` | Live preview widget |
| `lib/presentation/widgets/corner_overlay_painter.dart` | CustomPainter for corner overlay |
| `lib/presentation/pages/exam_selection_page.dart` | Select exam before scanning |
| `lib/presentation/pages/student_list_page.dart` | List ungraded students |
| `lib/presentation/pages/student_picker_dialog.dart` | Assign student after scan |

### Modified Files

| File | Change |
|---|---|
| `lib/domain/omr/engine/omr_engine.dart` | Add corner detection + warp step |
| `lib/presentation/pages/camera_scanner_page.dart` | Replace single-shot with live preview |
| `lib/presentation/pages/scan_view.dart` | Connect to exam selection flow |
| `lib/presentation/pages/exam_detail_page.dart` | Add "Start Scanning" button |
| `lib/presentation/pages/omr_result_page.dart` | Connect submit to guided flow |
| `lib/presentation/blocs/omr_scanner/omr_scanner_bloc.dart` | Handle new camera states |
| `lib/presentation/blocs/omr_scanner/omr_scanner_state.dart` | Add camera-related states |
| `lib/core/storage/omr_local_storage.dart` | Add PendingSubmission model + CRUD |
| `lib/main.dart` | Register CameraBloc, add routes |

---

## 10. Dependencies

All dependencies already present in `pubspec.yaml`:

```yaml
camera: ^0.11.1       # Live camera preview
image: ^4.3.0         # Pure Dart image processing
connectivity_plus: ^6.1.4  # Network check
```

No new packages needed.

---

## 11. Testing Strategy

1. **Unit tests:**
   - `CameraEngine.detectCorners()` — test with synthetic images (blank, edge, rotated)
   - `warp_utils` — homography matrix correctness, point transform accuracy
   - `OMREngine.processImage()` — integration test with known OMR sheet image

2. **Widget tests:**
   - `CornerOverlayPainter` — verify overlay renders with known corners
   - `CameraScannerPage` — verify state transitions

3. **Integration tests:**
   - Full scan flow: exam → camera → process → result → submit

---

## 12. Open Questions

| # | Question | Decision |
|---|---|---|
| 1 | Store marker image for reference alignment? | Not needed — edge detection is sufficient for camera |
| 2 | Support multiple sheets in one session? | Phase 1: no — one exam, one scan per session |
| 3 | Auto-detect student ID from bubble sheet? | Phase 2 — needs template with student ID field block |
| 4 | Resolution for warping? | Match template pageDimensions (e.g., 2480×3508) |

---

## 13. Implementation Phases

### Phase 1: Camera Engine (bottom-up)
- `warp_utils.dart` — homography math
- `camera_engine.dart` — corner detection + warp
- `OMREngine` integration

### Phase 2: Live Preview UI
- `CameraBloc` state machine
- `CameraPreviewWidget` + `CornerOverlayPainter`
- `CameraScannerPage` with live preview

### Phase 3: Guided Flow
- `ExamSelectionPage`, `StudentListPage`
- Connect `ScanView` → exam → camera → result

### Phase 4: Offline Sync
- Extend `OMRLocalStorage`
- `StudentPickerDialog`
- Submit + queue logic
