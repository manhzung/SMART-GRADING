# Batch Scanning (Luồng Quét Liên Tục OMR)

> **Status:** Draft
> **Platform:** Mobile (Flutter)
> **Created:** 2026-06-27

---

## 1. Overview

### 1.1 Mục Tiêu
Cho phép người dùng quét nhiều phiếu trả lời OMR liên tục mà không cần quay về màn hình chọn bài thi sau mỗi lần quét.

### 1.2 User Flow

```
┌──────────────────────┐
│ Chọn Bài thi + Lớp   │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ Camera Scanner       │◄──────────────┐
│ (Batch Mode)        │               │
│                      │               │
│  Đã quét: 5 phiếu   │               │
│  [📷 Chụp]          │               │
│  [Xong]              │               │
└──────────┬───────────┘               │
           │                           │
           │ Chụp ảnh                 │
           ▼                           │
┌──────────────────────┐               │
│ Xử lý OMR           │               │
│ (Nhận diện SBD,     │               │
│  Mã đề, Chấm điểm)  │               │
└──────────┬───────────┘               │
           │                           │
     ┌─────┴─────┐                    │
     ▼           ▼                    │
┌─────────┐ ┌──────────────────────┐  │
│ Thành   │ │ Full Screen Popup    │  │
│ công    │ │ Xác nhận kết quả     │  │
└────┬────┘ └──────────┬───────────┘  │
     │                 │              │
     │      ┌──────────┴──────────┐   │
     │      ▼                     ▼   │
     │ ┌───────────┐    ┌─────────────┐│
     │ │🔄 Chụp   │    │✓ Xác nhận  ││
     │ │lại       │    │& Gửi       ││
     │ └─────┬─────┘    └──────┬──────┘│
     │       │                 │       │
     └───────┼─────────────────┼───────┘
             │                 │
             └─────▼──────────┘
                   │
                   ▼
          ┌────────────────┐
          │ Quay về Camera │
          │ (Counter +1)   │
          └────────────────┘
```

---

## 2. UI Specifications

### 2.1 Camera Scanner Screen (Batch Mode)

**Layout:**
```
┌──────────────────────────────┐
│ ← Quay lại        [Xong]   │  AppBar
├──────────────────────────────┤
│                              │
│   ┌────────────────────┐    │
│   │                    │    │
│   │                    │    │
│   │   Camera Preview   │    │  Full-screen camera
│   │                    │    │
│   │   (với alignment   │    │
│   │    markers)        │    │
│   │                    │    │
│   └────────────────────┘    │
│                              │
│   ┌─────────────────────┐   │
│   │  ✓ Đã quét: 5     │   │  Counter Badge (top-right)
│   └─────────────────────┘   │
│                              │
│       ┌──────────────┐      │
│       │              │      │
│       │     📷       │      │  Capture FAB
│       │              │      │
│       └──────────────┘      │
│                              │
│   (Ảnh preview nhỏ của     │
│    phiếu vừa quét gần đây) │
│                              │
└──────────────────────────────┘
```

**Components:**
- `CameraPreview` - Camera view với alignment markers
- `BatchCounterBadge` - Badge hiển thị số đã quét
- `CaptureButton` - FAB để chụp
- `RecentScansStrip` - Horizontal strip hiển thị thumbnails

### 2.2 Confirmation Popup (Full Screen Modal)

**Layout:**
```
┌──────────────────────────────┐
│                              │
│  ┌──────────────────────┐   │
│  │                      │   │
│  │   Ảnh đã quét       │   │  Scanned image with
│  │   (bubble overlay    │   │  green/red markers
│  │    đánh dấu)        │   │
│  │                      │   │
│  └──────────────────────┘   │
│                              │
│  ┌──────────────────────┐   │
│  │  Điểm: 8 / 10      │   │
│  │  ████████████░░ 80% │   │
│  └──────────────────────┘   │
│                              │
│  ┌──────────────────────┐   │
│  │  SBD: 12345    🔒   │   │  Readonly
│  └──────────────────────┘   │
│                              │
│  ┌──────────────────────┐   │
│  │  Mã đề: A      🔒   │   │  Readonly
│  └──────────────────────┘   │
│                              │
│  ┌──────────┐ ┌──────────┐  │
│  │  🔄     │ │  ✓       │  │
│  │ Chụp    │ │ Xác nhận │  │  Action Buttons
│  │ lại     │ │ & Gửi   │  │
│  └──────────┘ └──────────┘  │
│                              │
└──────────────────────────────┘
```

**Features:**
- Full-screen modal overlay
- Image với bubble overlay (xanh = đúng, đỏ = sai)
- Score hiển thị rõ ràng
- SBD và Mã đề là readonly (không cho sửa)
- Hai action buttons: "Chụp lại" và "Xác nhận & Gửi"

### 2.3 Summary Screen

**Layout:**
```
┌──────────────────────────────┐
│  Kết quả quét          [X] │  AppBar
├──────────────────────────────┤
│                              │
│  ┌──────────────────────┐   │
│  │     📊 Tổng kết      │   │
│  │     Đã quét: 15      │   │
│  │     Thành công: 14   │   │
│  │     Lỗi: 1          │   │
│  └──────────────────────┘   │
│                              │
│  ┌──────────────────────┐   │
│  │  Điểm trung bình: 7.5│   │
│  │  Cao nhất: 10        │   │
│  │  Thấp nhất: 4       │   │
│  └──────────────────────┘   │
│                              │
│  ┌──────────────────────┐   │
│  │  Phân bố điểm      │   │
│  │  ████ 10 (3)        │   │
│  │  ████ 8-9 (5)       │   │
│  │  ███  6-7 (4)       │   │
│  │  ██   4-5 (2)        │   │
│  │  █    <4 (1)        │   │
│  └──────────────────────┘   │
│                              │
│  ┌──────────────────────┐   │
│  │  📋 Xem chi tiết    │   │  Navigate to list
│  └──────────────────────┘   │
│                              │
│  ┌──────────────────────┐   │
│  │  📷 Quay lại quét    │   │  Continue scanning
│  └──────────────────────┘   │
│                              │
└──────────────────────────────┘
```

---

## 3. State Management

### 3.1 BLoC Events

```dart
// Events
abstract class BatchScanEvent {}

class InitializeBatchScan extends BatchScanEvent {
  final String examId;
  final String examName;
  final String classId;
  final String className;
}

class CaptureForBatch extends BatchScanEvent {
  final Uint8List imageBytes;
}

class ConfirmBatchScan extends BatchScanEvent {}

class RetakeBatchScan extends BatchScanEvent {}

class DiscardBatchScan extends BatchScanEvent {}

class FinishBatchScan extends BatchScanEvent {}
```

### 3.2 BLoC States

```dart
// States
abstract class BatchScanState {}

class BatchScanInitial extends BatchScanState {}

class BatchScanReady extends BatchScanState {
  final String examId;
  final String examName;
  final String classId;
  final String className;
  final int scannedCount;
  final List<BatchScanItem> recentScans; // Last 3 thumbnails
}

class BatchScanProcessing extends BatchScanState {
  final String examId;
  final int scannedCount;
}

class BatchScanResultReady extends BatchScanState {
  final String examId;
  final Uint8List imageBytes;
  final ScanResult scanResult; // sbd, versionCode, score, answers
  final int scannedCount;
}

class BatchScanConfirming extends BatchScanState {
  final String examId;
  final Uint8List imageBytes;
  final ScanResult scanResult;
  final int scannedCount;
}

class BatchScanSubmitting extends BatchScanState {
  final String examId;
  final ScanResult scanResult;
}

class BatchScanSummary extends BatchScanState {
  final String examId;
  final String classId;
  final List<ScanResult> results;
  final int totalScanned;
  final int successCount;
  final int errorCount;
  final double averageScore;
  final double highestScore;
  final double lowestScore;
}

class BatchScanError extends BatchScanState {
  final String message;
  final String? imagePath;
}
```

### 3.3 Supporting Models

```dart
class BatchScanItem {
  final String id;
  final Uint8List thumbnail;
  final ScanResult result;
  final DateTime scannedAt;
}

class ScanResult {
  final String? studentId;      // SBD
  final String? versionCode;     // Mã đề
  final Map<String, String> answers;
  final double score;
  final double maxScore;
  final bool isValid;            // true nếu SBD và Mã đề hợp lệ
  final String? errorMessage;
}
```

---

## 4. API Integration

### 4.1 Submit Single Scan

```dart
// Gọi khi user xác nhận kết quả
Future<void> submitScan({
  required String examId,
  required String studentId,
  required String versionCode,
  required Map<String, String> answers,
  required double score,
  required double maxScore,
  Uint8List? imageBytes,
}) async {
  // 1. Upload image (optional)
  // 2. Submit result
  // 3. Return submission ID
}
```

### 4.2 Offline Queue

```dart
// Lưu local nếu offline
class PendingScan {
  final String examId;
  final String studentId;
  final String versionCode;
  final Map<String, String> answers;
  final double score;
  final double maxScore;
  final Uint8List? imageBytes;
  final DateTime createdAt;
  final ScanStatus status;
}

enum ScanStatus { pending, submitting, failed }

// Sync khi có mạng
class OfflineQueueService {
  Future<void> addToQueue(PendingScan scan);
  Future<void> syncQueue();
  Stream<int> get pendingCountStream;
}
```

---

## 5. Key Features

| Feature | Description | Priority |
|---------|-------------|----------|
| Batch counter | Hiển thị số phiếu đã quét | HIGH |
| Confirmation popup | Full screen hiển thị kết quả trước khi gửi | HIGH |
| Readonly fields | SBD và Mã đề không cho sửa tay | HIGH |
| Auto-grade | Chấm điểm tự động theo đáp án | HIGH |
| Offline queue | Lưu local nếu offline, sync sau | HIGH |
| Recent scans | Preview thumbnails của phiếu vừa quét | MEDIUM |
| Summary stats | Thống kê khi kết thúc | MEDIUM |
| Error handling | Thông báo lỗi rõ ràng | HIGH |

---

## 6. Error Scenarios

| Error | Handling |
|-------|----------|
| Không nhận diện được SBD | Hiển thị popup lỗi, cho phép chụp lại |
| Không nhận diện được Mã đề | Hiển thị popup lỗi, cho phép chụp lại |
| Ảnh mờ/không đọc được | Hiển thị "Ảnh không rõ", cho phép chụp lại |
| Offline khi submit | Tự động lưu vào queue, thông báo "Đã lưu offline" |
| Server error khi sync | Đánh dấu failed, retry tự động |

---

## 7. File Structure

```
lib/
├── presentation/
│   ├── blocs/
│   │   └── batch_scan/
│   │       ├── batch_scan_bloc.dart
│   │       ├── batch_scan_event.dart
│   │       └── batch_scan_state.dart
│   ├── pages/
│   │   └── batch_scan_page.dart      [NEW]
│   └── widgets/
│       ├── batch_counter_badge.dart   [NEW]
│       ├── confirmation_popup.dart     [NEW]
│       ├── recent_scans_strip.dart    [NEW]
│       └── batch_summary_page.dart     [NEW]
└── core/
    └── services/
        └── offline_queue_service.dart  [NEW]
```

---

## 8. Implementation Tasks

### Phase 1: Core Flow
- [ ] Tạo `BatchScanBloc` với states và events
- [ ] Tạo `BatchScanPage` (camera scanner UI)
- [ ] Tạo `BatchCounterBadge` widget
- [ ] Tích hợp OMR engine vào flow

### Phase 2: Confirmation
- [ ] Tạo `ConfirmationPopup` widget
- [ ] Hiển thị image với bubble overlay
- [ ] Hiển thị score và thông tin SBD/Mã đề
- [ ] Xử lý confirm/retake actions

### Phase 3: Data & Sync
- [ ] Tạo `OfflineQueueService`
- [ ] Lưu scan results local
- [ ] Sync khi online
- [ ] Tạo `BatchSummaryPage`

### Phase 4: Polish
- [ ] Recent scans strip
- [ ] Error handling UI
- [ ] Loading states
- [ ] Animations/transitions

---

## 9. Testing Strategy

### Unit Tests
- BatchScanBloc state transitions
- OfflineQueueService operations
- ScanResult parsing

### Widget Tests
- ConfirmationPopup renders correctly
- BatchCounterBadge updates
- RecentScansStrip shows correct items

### Integration Tests
- Full scan → confirm → submit flow
- Offline → online sync flow
