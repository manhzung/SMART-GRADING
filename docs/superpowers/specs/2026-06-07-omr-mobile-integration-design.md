# Spec: Tích hợp OMR Grading vào Flutter Mobile App

**Date:** 2026-06-07
**Status:** Draft
**Platform:** Flutter Mobile App
**Depends On:** OMRChecker (Python), Exam Detail Page, Submission Service

---

## 1. Tổng quan

Tích hợp logic chấm OMR từ project mẫu OMRChecker vào Flutter mobile app để xử lý ảnh bài thi trực tiếp trên điện thoại. Người dùng chụp/gallery ảnh phiếu trả lời, app đọc bubbles, đối chiếu đáp án, hiển thị kết quả chấm điểm ngay lập tức.

---

## 2. Phân tích OMRChecker - Các thành phần cần port

### 2.1 Pipeline xử lý ảnh (Image Processing Pipeline)

OMRChecker xử lý ảnh qua nhiều bước theo thứ tự:

```
Input Image
    │
    ├─► 1. Resize về kích thước chuẩn template
    │
    ├─► 2. Pre-processors (tùy template):
    │       ├─► CropOnMarkers: Tìm 4 góc marker → perspective transform
    │       ├─► CropPage: Phát hiện cạnh giấy → cắt tự động
    │       └─► FeatureBasedAlignment: ORB feature matching
    │
    ├─► 3. CLAHE (Contrast Limited Adaptive Histogram Equalization)
    │       cv2.createCLAHE(clipLimit=5.0, tileGridSize=(8,8))
    │
    ├─► 4. Gamma Correction
    │       image = LUT(image, gamma_lookup_table)
    │       GAMMA_LOW = 0.4 (cho ảnh mobile)
    │
    ├─► 5. Thresholding
    │       _, image = cv2.threshold(image, 220, 220, cv2.THRESH_TRUNC)
    │       image = normalize(image, 0, 255)
    │
    ├─► 6. Morphological Open (vertical kernel)
    │       kernel = (2, 10)
    │       morph = cv2.morphologyEx(image, cv2.MORPH_OPEN, kernel, iterations=3)
    │
    └─► 7. Alignment shift (auto-align)
```

### 2.2 Thuật toán tìm Marker & Crop (CropOnMarkers)

```
1. Erode subtract: image_norm - cv2.erode(image, kernel=(5,5), iterations=5)
2. Chia ảnh thành 4 quadrant (2x3 division)
3. Rescale marker trong khoảng [35%, 100%] để tìm best match
4. cv2.matchTemplate với TM_CCOEFF_NORMED
5. Kiểm tra threshold cho từng quadrant
6. Tính 4 centre points → four_point_transform
```

### 2.3 Thuật toán tìm Alignment Shift

OMRChecker dùng **column-mean comparison** để tìm shift cho mỗi field block:

```
Với mỗi field_block:
  - Tạo binary mask từ vertical morphological open
  - Binary threshold (threshold=60, cho mobile: 40)
  - Erode mask: kernel=(5,5), iterations=2
  
  - Trong vùng field_block.origin → field_block.origin+dimensions:
    - Cắt 2 cột: left_col = mean(mask[y, x-shift-thk : x-shift]), right_col tương tự
    - Nếu left_col > 100 và right_col <= 100 → shift += stride
    - Nếu right_col > 100 và left_col <= 100 → shift -= stride
    - Lặp max 20 bước (max_steps)
```

### 2.4 Thuật toán đọc Bubble - Threshold (Core Algorithm)

Đây là **thuật toán cốt lõi** của OMRChecker:

```
Bước 1: Đọc mean intensity của từng bubble
  - Với mỗi bubble rectangle: rect = [y, y+box_h, x+shift, x+shift+box_w]
  - value = cv2.mean(image[rect])[0]

Bước 2: Tính Global Threshold (trên tất cả bubbles)
  - Sắp xếp tất cả values
  - Tìm "FIRST LARGE GAP" (khoảng nhảy lớn nhất đầu tiên)
  - global_thr = min_value_of_large_gap + gap/2
  - MIN_JUMP = 20 (cho Xerox copy), 30 (cho ảnh mobile)
  - PAGE_TYPE_FOR_THRESHOLD = "white" → GLOBAL_PAGE_THRESHOLD = 200
  - PAGE_TYPE_FOR_THRESHOLD = "black" → GLOBAL_PAGE_THRESHOLD = 100

Bước 3: Tính Global Std Threshold (trên mỗi Q-strip)
  - std_vals = [std(bubble_values_of_strip_1), std(strip_2), ...]
  - Tìm gap trong std_vals → global_std_thresh

Bước 4: Tính Local Threshold cho mỗi Q-strip
  - Sắp xếp bubble values của strip
  - Tìm "LARGEST GAP" trong sorted values
  - local_thr = value_at_gap_start + gap/2
  - Nếu max_gap < (MIN_JUMP + CONFIDENT_SURPLUS=10):
      - Nếu std < global_std_thresh → dùng global_thr
      - Nếu không → dùng local_thr
  - Fallback: nếu chỉ có 1-2 bubbles → dùng global_thr

Bước 5: Xác định bubble đã tô
  - Nếu bubble_mean < local_thr → bubble_is_marked = True
  - Nếu multi-bubbles cùng marked → multi_marked = True
```

### 2.5 Scoring / Evaluation

```
1. AnswerMatcher cho mỗi câu hỏi:
   - standard: so sánh trực tiếp với đáp án
   - multiple-correct: đáp án là array ['A', 'B', 'C']
   - multiple-correct-weighted: [['A', 1], ['B', 2], ['AB', 3]]

2. SectionMarkingScheme:
   - correct: +4 (mặc định)
   - incorrect: 0 (mặc định)
   - unmarked: 0 (mặc định)
   - Support BONUS section (điểm thưởng)

3. EvaluationConfig:
   - questions_in_order: thứ tự câu hỏi
   - answers_in_order: đáp án tương ứng
   - should_explain_scoring: sinh bảng chi tiết

4. Final score = sum(delta) cho mỗi câu hỏi
```

### 2.6 Data Models từ OMRChecker

**Template.json:**
```json
{
  "pageDimensions": [2480, 3508],
  "bubbleDimensions": [35, 35],
  "emptyValue": "",
  "preProcessors": [
    { "name": "CropOnMarkers", "options": { "relativePath": "omr_marker.jpg" } }
  ],
  "fieldBlocks": {
    "roll1": {
      "fieldType": "QTYPE_INT",
      "fieldLabels": ["roll1"],
      "origin": [170, 280],
      "labelsGap": 0
    },
    "mcq1": {
      "fieldType": "QTYPE_MCQ4",
      "fieldLabels": ["q1", "q2", "q3"],
      "origin": [400, 280],
      "labelsGap": 40
    }
  },
  "customLabels": {
    "rollNumber": ["roll1d1", "roll1d2", "roll1d3", "roll1d4"]
  }
}
```

**Field Types có sẵn:**
- `QTYPE_INT`: digits 0-9, vertical (cho số điểm danh)
- `QTYPE_INT_FROM_1`: digits 1-9,0, vertical
- `QTYPE_MCQ4`: options A,B,C,D, horizontal
- `QTYPE_MCQ5`: options A,B,C,D,E, horizontal
- `QTYPE_MCQ4_RTL`: D,C,B,A order (RTL language)

**Evaluation.json:**
```json
{
  "source_type": "csv",
  "options": {
    "answer_key_csv_path": "answer_key.csv",
    "questions_in_order": ["q1","q2","q3"],
    "should_explain_scoring": true
  },
  "marking_schemes": {
    "default": { "correct": 4, "incorrect": 0, "unmarked": 0 }
  }
}
```

---

## 3. Kiến trúc đề xuất cho Flutter App

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  OMRScannerScreen │  │  OMRResultScreen │  │ CameraWidget │ │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────────┘ │
│           │                    │                              │
│  ┌────────▼────────────────────▼──────────┐                   │
│  │          OMR Scanner BLoC              │                   │
│  └────────────────────┬───────────────────┘                   │
└───────────────────────┼─────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│                    DOMAIN LAYER                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ OMRTemplate  │ │ OMRResponse  │ │ OMRScoreResult│            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                  │
│  ┌──────────────────────────────────────────┐                   │
│  │         OMR Processing Engine (Pure Dart) │                  │
│  │  - ImageProcessor                         │                  │
│  │  - BubbleReader                           │                  │
│  │  - ThresholdCalculator                    │                  │
│  │  - AlignmentShifter                       │                  │
│  │  - OMRScorer                             │                  │
│  └──────────────────────────────────────────┘                   │
└──────────────────────────────────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────────┐
│                    SERVICE LAYER                                   │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐   │
│  │ CameraService    │ │ TemplateService  │ │ SubmissionService │   │
│  │ (camera package) │ │ (load/parse)    │ │ (send to server) │   │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Module OMR Processing Engine

Cốt lõi xử lý OMR hoàn toàn bằng Dart thuần (không cần native bridge), sử dụng package `image` (pure Dart image processing).

#### 3.2.1 Image Processor (`image_processor.dart`)

Port từ `OMRChecker/src/utils/image.py` + `core.py` preprocessing:

```dart
class OMRImageProcessor {
  // 1. Resize về kích thước template
  Image resizeToTemplate(Image img, int width, int height);
  
  // 2. Convert to grayscale (nếu chưa)
  Image toGrayscale(Image img);
  
  // 3. CLAHE - Contrast Limited Adaptive Histogram Equalization
  //    Port từ cv2.createCLAHE(clipLimit=5.0, tileGridSize=(8,8))
  Image applyCLAHE(Image img, {int clipLimit = 40, int tileSize = 8});
  
  // 4. Gamma Correction
  //    Port từ adjust_gamma với gamma = 0.4 (mobile)
  Image applyGammaCorrection(Image img, double gamma);
  
  // 5. Normalize (min-max stretching)
  //    Port từ cv2.normalize với NORM_MINMAX
  Image normalize(Image img, {int minVal = 0, int maxVal = 255});
  
  // 6. Threshold (THRESH_TRUNC)
  Image applyThreshold(Image img, int threshold);
  
  // 7. Morphological Open (vertical kernel)
  Image morphologicalOpen(Image img, int kernelW, int kernelH, int iterations);
  
  // 8. Get mean pixel value của rectangle
  double getRectMean(Image img, int x, int y, int w, int h);
}
```

**Thuật toán CLAHE chi tiết:**
```
1. Chia ảnh thành tiles (tileSize x tileSize)
2. Với mỗi tile:
   a. Tính histogram H[0..255]
   b. Clip histogram tại clipLimit (số lần avg pixels được phép vượt)
   c. Tính CDF (cumulative distribution function) từ histogram đã clip
   d. Map mỗi pixel: new_val = CDF[old_val] * (maxVal/totalPixels)
3. Bilinear interpolate giữa các tiles
```

#### 3.2.2 Threshold Calculator (`threshold_calculator.dart`)

Port thuật toán "First Large Gap" từ `core.py`:

```dart
class ThresholdCalculator {
  /// Tính global threshold trên tất cả bubble values
  /// Sử dụng thuật toán "First Large Gap"
  /// 
  /// Input: List<double> allBubbleMeans - tất cả mean intensity của bubbles
  ///        int minJump - ngưỡng nhảy tối thiểu (default: 20 cho mobile)
  ///        double globalDefault - default threshold nếu không tìm được gap
  /// 
  /// Output: double globalThreshold
  double calculateGlobalThreshold(
    List<double> allBubbleMeans, {
    int minJump = 20,
    double globalDefault = 200,
  });

  /// Tính local threshold cho mỗi Q-strip (1 hàng bubbles)
  /// 
  /// Input: List<double> stripValues - mean intensity của bubbles trong 1 strip
  ///        double globalThreshold - từ calculateGlobalThreshold
  ///        bool noOutliers - std < global_std_thresh
  /// 
  /// Output: double localThreshold
  double calculateLocalThreshold(
    List<double> stripValues,
    double globalThreshold, {
    required bool noOutliers,
    int minJump = 20,
    int confidentSurplus = 10,
  });

  /// Tính global std threshold (trên mỗi strip)
  double calculateGlobalStdThreshold(List<double> stdValues, {int minJump = 10});
}
```

**Thuật toán "First Large Gap":**
```
1. Sắp xếp values tăng dần
2. Duyệt i từ (looseness) đến (len-looseness):
   gap = sorted_values[i+looseness] - sorted_values[i-looseness]
   Nếu gap > max1:
     max1 = gap
     threshold = sorted_values[i-looseness] + gap/2
3. Tìm secondary gap (thr2) nhưng phải cách thr1 ít nhất JUMP_DELTA=20
4. Return min(thr1, thr2)
```

#### 3.2.3 Marker Detector (`marker_detector.dart`)

Port từ `CropOnMarkers.py`:

```dart
class MarkerDetector {
  /// Tìm 4 góc marker và crop về bird's eye view
  /// 
  /// Input: Image img (grayscale)
  ///        Image markerTemplate (template marker ảnh)
  ///        int minMatchingThreshold (default: 0.3)
  /// 
  /// Output: Image? cropped (null nếu không tìm được marker)
  /// 
  /// Thuật toán:
  /// 1. Erode subtract để isolate markers
  /// 2. Tạo 4 quadrants
  /// 3. Rescale marker và matchTemplate ở mỗi quadrant
  /// 4. Lấy 4 centre points
  /// 5. Four-point perspective transform
  Image? detectAndCrop(Image img, Image markerTemplate, {
    double minMatchingThreshold = 0.3,
    List<int>? scaleRange, // default [35, 100]
  });
}
```

#### 3.2.4 Alignment Shifter (`alignment_shifter.dart`)

Port từ logic alignment trong `core.py` (dòng 136-193):

```dart
class AlignmentShifter {
  /// Tính shift cho mỗi field block
  /// 
  /// Input: Image morph (sau morphological open + threshold)
  ///        List<FieldBlock> fieldBlocks
  ///        int matchCol (default: 3)
  ///        int stride (default: 3)
  ///        int maxSteps (default: 20)
  ///        int thickness (default: 3)
  /// 
  /// Output: Map<String, int> fieldBlockShifts
  /// 
  /// Thuật toán:
  /// Với mỗi field_block:
  ///   1. Binary threshold morph image (threshold=60 cho mobile)
  ///   2. Erode để loại noise
  ///   3. Tính mean của 2 cột biên trong vùng field_block
  ///   4. Nếu left_mean > 100 và right_mean <= 100 → shift += stride
  ///   5. Nếu right_mean > 100 và left_mean <= 100 → shift -= stride
  ///   6. Lặp đến khi hội tụ hoặc max_steps
  Map<String, int> calculateShifts(
    Image morph,
    List<FieldBlock> fieldBlocks, {
    int matchCol = 3,
    int stride = 3,
    int maxSteps = 20,
    int thickness = 3,
  });
}
```

#### 3.2.5 Bubble Reader (`bubble_reader.dart`)

Kết hợp tất cả để đọc bubbles:

```dart
class BubbleReader {
  /// Đọc tất cả bubbles và trả về OMR response
  /// 
  /// Input: Image img (đã preprocess)
  ///        OMRTemplate template
  ///        OMRConfig config
  /// 
  /// Output: OMRResponse {
  ///           answers: Map<String, String>,  // field_label → marked_value
  ///           multiMarked: bool,
  ///           markedImage: Image?,           // ảnh đánh dấu bubbles
  ///         }
  OMRResponse readBubbles(
    Image img,
    OMRTemplate template,
    OMRConfig config,
  );
}
```

**Thuật toán chi tiết:**
```
1. Tính global_thr từ tất cả bubble means
2. Tính global_std_thresh từ std của mỗi strip
3. Với mỗi field_block:
   a. Với mỗi strip (field_block_bubbles):
      - Tính local_thr bằng "largest gap" algorithm
      - Với mỗi bubble:
        * mean = getRectMean(img, rect)
        * Nếu mean < local_thr → bubble_marked = True
        * Lưu vào detected_bubbles
      - Xử lý multi-mark: nếu >1 bubble marked → multi_marked=true
      - Gán answer theo field_label
4. Trả về response + ảnh đánh dấu
```

#### 3.2.6 OMR Scorer (`omr_scorer.dart`)

Port từ `evaluation.py`:

```dart
class OMRScorer {
  /// Chấm điểm OMR response
  /// 
  /// Input: OMRResponse omrResponse
  ///        OMRTemplate template
  ///        EvaluationConfig evalConfig
  /// 
  /// Output: OMRGradingResult {
  ///           score: double,
  ///           maxScore: double,
  ///           verdicts: List<QuestionVerdict>,
  ///           hasMultiMarked: bool,
  ///         }
  OMRGradingResult grade(
    OMRResponse omrResponse,
    OMRTemplate template,
    EvaluationConfig evalConfig,
  );
}

class AnswerMatcher {
  enum AnswerType { standard, multipleCorrect, multipleCorrectWeighted }
  
  // standard: "A" vs "A"
  // multipleCorrect: ['A','B'] contains marked
  // multipleCorrectWeighted: [['A',1], ['B',2]] với custom scores
  String matchAnswer(String markedAnswer, dynamic correctAnswer);
}
```

### 3.3 Data Models

```dart
// lib/domain/omr/models/omr_template.dart

class OMRTemplate {
  final String id;
  final String name;
  final int pageWidth;
  final int pageHeight;
  final int bubbleWidth;
  final int bubbleHeight;
  final String emptyValue;
  final List<OMRPreProcessor> preProcessors;
  final List<FieldBlock> fieldBlocks;
  final Map<String, List<String>> customLabels;
  final List<String> outputColumns;
}

// lib/domain/omr/models/field_block.dart

class FieldBlock {
  final String name;
  final List<String> fieldLabels;
  final int originX;
  final int originY;
  final int blockWidth;
  final int blockHeight;
  final int bubbleWidth;
  final int bubbleHeight;
  final int bubbleGap;
  final int labelsGap;
  final String direction; // 'vertical' | 'horizontal'
  final List<List<Bubble>> traverseBubbles; // 2D grid: [field_label_idx][bubble_value_idx]
}

// lib/domain/omr/models/bubble.dart

class Bubble {
  final int x;
  final int y;
  final String fieldLabel;
  final String fieldValue;
}

// lib/domain/omr/models/omr_config.dart

class OMRConfig {
  final bool autoAlign;
  final int minJump;          // default: 20 cho mobile, 30 cho scan
  final int globalThreshold;  // default: 200
  final int pageType;         // 0=white, 1=black
  final double gamma;         // default: 0.4 cho mobile
  // ... các threshold params khác
}

// lib/domain/omr/models/omr_response.dart

class OMRResponse {
  final Map<String, String> answers; // fieldLabel → marked value
  final bool multiMarked;
  final Image? markedImage;
}

// lib/domain/omr/models/evaluation_config.dart

class EvaluationConfig {
  final List<String> questionsInOrder;
  final List<dynamic> answersInOrder; // String, List<String>, hoặc List<List>
  final MarkingScheme defaultScheme;
  final Map<String, SectionMarkingScheme> sectionSchemes;
}

class MarkingScheme {
  final double correct;
  final double incorrect;
  final double unmarked;
}

// lib/domain/omr/models/grading_result.dart

class OMRGradingResult {
  final double score;
  final double maxScore;
  final List<QuestionVerdict> verdicts;
  final bool hasMultiMarked;
}

class QuestionVerdict {
  final String question;
  final String markedAnswer;
  final String correctAnswer;
  final String verdict; // 'correct' | 'incorrect' | 'unmarked'
  final double delta;
  final double cumulativeScore;
}
```

### 3.4 Camera & Scanner Screen

```dart
// lib/presentation/pages/omr_scanner_page.dart

class OMRScannerPage extends StatelessWidget {
  // Props: examId, templateId (từ Exam.omrTemplateId)
  
  // States:
  // 1. CameraPreview - hiển thị live camera
  // 2. ImageCapture - chụp ảnh
  // 3. Processing - đang xử lý OMR (loading indicator)
  // 4. Result - hiển thị kết quả chấm điểm
  
  // Flow:
  // 1. User mở camera → live preview
  // 2. User chụp ảnh → capture frame
  // 3. App resize/crop tối ưu → gửi sang OMR engine
  // 4. OMR engine đọc bubbles → đối chiếu đáp án → tính điểm
  // 5. Hiển thị kết quả với ảnh đánh dấu
  // 6. User có thể: Lưu, Sửa thủ công, Chụp lại
}
```

**UI Components:**
- Camera preview với overlay guide (khung hình chữ nhật mờ)
- Capture button (FAB)
- Flash toggle
- Gallery picker button
- Processing overlay với step indicators:
  - "Preprocessing image..."
  - "Detecting markers..."
  - "Reading answers..."
  - "Calculating score..."

### 3.5 OMR Result Screen

```dart
class OMRResultScreen extends StatelessWidget {
  // Props: OMRGradingResult, Image markedImage, OMRTemplate
  
  // Hiển thị:
  // 1. Score card: điểm / điểm tối đa, %
  // 2. Question breakdown:
  //    - Correct → green check
  //    - Incorrect → red X (với đáp án đúng được hiển thị)
  //    - Unmarked → gray dash
  // 3. Marked image với zoom/pan
  // 4. Multi-marked warning (nếu có)
  // 5. Actions: Save & Next, Edit Answers, Retake
}
```

---

## 4. Package Dependencies cần thêm vào Flutter

```yaml
# pubspec.yaml

dependencies:
  flutter:
    sdk: flutter
  
  # Image processing (pure Dart - không cần native)
  image: ^4.1.0
  
  # Camera
  camera: ^0.10.5+9
  
  # Image picker (gallery)
  image_picker: ^1.0.7
  
  # State management
  flutter_bloc: ^8.1.3
  equatable: ^2.0.5
  
  # Dependency injection
  get_it: ^7.6.4
  
  # Image utils
  path_provider: ^2.1.2
  
  # Permissions
  permission_handler: ^11.3.0
  
  # Zoom/pan for marked image preview
  photo_view: ^0.14.0
  
  # Loading overlay
  flutter_spinkit: ^5.2.1
  
  # Overlay entry cho guide
  camera_avfoundation: ^0.9.15+1
```

---

## 5. Processing Config cho Mobile

OMRChecker có nhiều config params cần điều chỉnh cho mobile:

```dart
// lib/domain/omr/config/omr_mobile_config.dart

class OMRMobileConfig {
  // Mobile images thường:
  // - Độ phân giải cao (4K)
  // - Ánh sáng không đồng đều
  // - Không sắc nét như scan
  
  static const int PROCESSING_WIDTH = 1240;    // Resize trước khi xử lý
  static const int PROCESSING_HEIGHT = 1754;
  
  // Threshold params - điều chỉnh cho mobile
  static const int MIN_JUMP = 20;              // OMRChecker dùng 30 cho scan
  static const int MIN_JUMP_STD = 10;
  static const int CONFIDENT_SURPLUS = 10;
  static const int JUMP_DELTA = 20;
  static const String PAGE_TYPE = "white";
  static const int GLOBAL_THRESHOLD_WHITE = 200;
  static const int GLOBAL_THRESHOLD_BLACK = 100;
  
  // Alignment params
  static const bool AUTO_ALIGN = true;
  static const int MATCH_COL = 3;
  static const int ALIGN_STRIDE = 3;
  static const int MAX_STEPS = 20;
  static const int THICKNESS = 3;
  
  // Marker detection
  static const double MIN_MATCHING_THRESHOLD = 0.3;  // Giảm cho mobile
  static const int MORPH_THRESHOLD_MOBILE = 40;       // Thay vì 60 cho scan
}
```

---

## 6. API Contract - Template & Evaluation từ Server

### 6.1 Template Endpoint (cần tạo mới ở server)

```
GET /api/v1/omr/templates/:id

Response:
{
  "id": "template123",
  "name": "MCQ Template A4",
  "pageDimensions": [2480, 3508],
  "bubbleDimensions": [35, 35],
  "emptyValue": "",
  "preProcessors": [
    { "name": "CropOnMarkers", "options": { "relativePath": "marker.jpg" } }
  ],
  "fieldBlocks": { ... },
  "customLabels": { ... },
  "markerImageUrl": "/uploads/markers/marker.jpg"
}
```

### 6.2 Evaluation Endpoint

Exam đã có `questions` array với `correctAnswer`. Server sẽ:

```
POST /api/v1/omr/grade

Request:
{
  "examId": "exam123",
  "templateId": "template123",
  "answers": { "q1": "A", "q2": "B", "roll1": "12345" }
}

Response:
{
  "score": 85,
  "maxScore": 100,
  "verdicts": [
    { "question": "q1", "marked": "A", "correct": "A", "verdict": "correct", "delta": 5 },
    ...
  ],
  "hasMultiMarked": false
}
```

---

## 7. Offline-first Strategy

Mobile cần xử lý offline:

1. **Template caching:** Khi exam được load, template + marker image được cache local (SharedPreferences path hoặc file storage)
2. **Hybrid processing:**
   - Nếu có internet: gửi ảnh lên server → server xử lý (giống flow hiện tại)
   - Nếu offline: xử lý local bằng OMR engine
3. **Sync:** Kết quả local được queue và sync lên server khi online

---

## 8. Error Handling

| Error | Handling |
|-------|----------|
| Không tìm được marker | Hiển thị "Không tìm thấy góc phiếu. Vui lòng chụp lại với đủ 4 góc đen." |
| Multi-marked bubble | Warning: "Câu X có nhiều đáp án được tô. Cần kiểm tra thủ công." |
| Hoàn toàn trắng / không đọc được | "Không đọc được phiếu. Vui lòng cải thiện ánh sáng và chụp lại." |
| Alignment thất bại | Fallback về shift=0 (không align) |
| Score quá thấp bất thường | Warning: "Điểm thấp bất thường. Có thể template không khớp." |

---

## 9. Performance Considerations

- **Resize trước:** Mobile ảnh 4K cần resize về ~1240px width TRƯỚC khi xử lý để giảm thời gian
- **CLAHE tile size:** Giảm tile grid (4x4) thay vì (8x8) cho mobile để nhanh hơn
- **Parallel bubble reading:** Các field blocks độc lập có thể xử lý song song (Isolate)
- **Target:** < 3 giây cho toàn bộ pipeline trên mid-range Android

---

## 10. Implementation Phases

### Phase 1: Core Engine (Pure Dart)
- OMR models (Template, FieldBlock, Bubble, etc.)
- Image processor (CLAHE, gamma, normalize, threshold, morphology)
- Threshold calculator ("First Large Gap" algorithm)
- Bubble reader
- Alignment shifter
- Basic scorer
- Unit tests

### Phase 2: Camera Integration
- Camera preview với overlay
- Image capture
- Gallery picker
- Image preprocessing pipeline

### Phase 3: Scanner UI
- OMRScannerPage với full flow
- Processing step indicators
- Error handling UI

### Phase 4: Result & Scoring UI
- OMRResultScreen
- Marked image display
- Score breakdown
- Manual edit capability

### Phase 5: Backend Integration
- Template download & caching
- Grade submission
- Offline sync

---

## 11. File Structure

```
lib/
├── domain/
│   └── omr/
│       ├── models/
│       │   ├── omr_template.dart
│       │   ├── field_block.dart
│       │   ├── bubble.dart
│       │   ├── omr_config.dart
│       │   ├── omr_response.dart
│       │   ├── evaluation_config.dart
│       │   ├── marking_scheme.dart
│       │   └── grading_result.dart
│       ├── engine/
│       │   ├── omr_engine.dart              # Main orchestrator
│       │   ├── image_processor.dart         # Image preprocessing
│       │   ├── marker_detector.dart         # CropOnMarkers port
│       │   ├── alignment_shifter.dart       # Auto-align
│       │   ├── bubble_reader.dart           # Core bubble reading
│       │   ├── threshold_calculator.dart   # "First Large Gap"
│       │   └── omr_scorer.dart              # Evaluation port
│       ├── config/
│       │   └── omr_mobile_config.dart       # Tuned params for mobile
│       └── services/
│           └── omr_template_service.dart    # Load/caching templates
├── presentation/
│   ├── blocs/
│   │   └── omr_scanner/
│   │       ├── omr_scanner_bloc.dart
│   │       ├── omr_scanner_event.dart
│   │       └── omr_scanner_state.dart
│   └── pages/
│       ├── omr_scanner_page.dart
│       └── omr_result_page.dart
└── core/
    └── di/
        └── injection.dart                   # GetIt registrations
```

---

## 12. Decisions Made

| # | Question | Decision | Reason |
|---|----------|----------|--------|
| 1 | Process on device vs server? | **Hybrid**: device khi offline, server khi online | Đảm bảo UX tốt nhất |
| 2 | Native OpenCV vs Pure Dart? | **Pure Dart (image package)** | Không cần native bridge, cross-platform dễ hơn |
| 3 | Template storage | **Cache local + server fetch** | Offline-first approach |
| 4 | Camera control | **camera package + overlay** | Native performance |
| 5 | State management | **flutter_bloc** | Pattern đã có sẵn trong app |
| 6 | Multi-version exams | **Version detection từ template** | Mỗi version = separate template |

---

## 13. Open Questions

| # | Question | Options |
|---|----------|---------|
| 1 | Có cần port FeatureBasedAlignment (ORB features) không? | Có / Không (CropOnMarkers đủ cho hầu hết) |
| 2 | Xử lý multi-page (nhiều tờ)? | Từng tờ / Batch |
| 3 | Có hỗ trợ chỉnh sửa thủ công đáp án sau khi scan không? | Bắt buộc / Tùy chọn |
| 4 | Marker image được embed trong template JSON hay fetch riêng? | Embedded base64 / Separate URL |
