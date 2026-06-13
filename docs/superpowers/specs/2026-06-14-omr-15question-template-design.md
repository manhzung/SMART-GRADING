# OMR Template 15 Câu - Design Specification

## Overview

Bổ sung một `OMRTemplate` factory mới (`OMRTemplate.from15Question()`) cho phép OMR Test Lab scan phiếu thi A5 15 câu, có mã SBD (số báo danh) và mã đề (MĐ). Template được thêm vào `OMRTestLabPage` dưới dạng chip chọn cạnh template `Sample 4` hiện tại.

**Platform:** Flutter mobile (client/mobile)
**Access point:** OMRTestLabPage (đã có từ design 2026-06-11)
**Định dạng phiếu in:** A5 portrait (148×210 mm), in nét đen trên giấy trắng

---

## 1. Mục tiêu & Phạm vi

### Mục tiêu
- Cho phép OMR Test Lab scan phiếu A5 thực tế (mã SBD 2 chữ số + mã đề 2 chữ số + 15 câu trắc nghiệm 4 đáp án)
- Không phá flow hiện tại (template `Sample 4` 11 câu vẫn hoạt động)
- Mở rộng pattern: dễ thêm template khác trong tương lai (phiếu 30 câu A4, phiếu A5 khác, v.v.)

### Ngoài phạm vi (YAGNI)
- ❌ Thêm chức năng edit template trên UI
- ❌ Thêm API fetch template (chỉ hard-coded factory)
- ❌ Refactor `FieldBlock` thành `GridFieldBlock` (dùng 3 field blocks riêng)
- ❌ DPI selector (cố định 300 DPI theo yêu cầu)
- ❌ Template 30 câu A4 (chỉ khởi tạo cấu trúc, để dành task sau)
- ❌ Hiển thị/điền SBD, MĐ trong exam flow chính (chỉ phục vụ OMR Test Lab)

---

## 2. Cấu trúc dữ liệu & Tọa độ

### 2.1 Hằng số DPI

```
DPI = 300 (theo yêu cầu cố định)
1 mm = 300 / 25.4 = 11.811 px (làm tròn 11.81)
```

### 2.2 Kích thước A5

```
A5 portrait:
  width  = 148 mm = 1748 px (1748.03)
  height = 210 mm = 2480 px (2480.31)
```

### 2.3 Layout tổng thể

```
┌─ A5: 1748 × 2480 px ─────────────────────────────────────┐
│  margin top=10mm  →  y: 0..118                           │
│                                                            │
│  ┌─ Header zone (logo, tiêu đề) ──────────────┐          │
│  │   y: 118 → 472 (354 px ≈ 30mm)              │          │
│  └────────────────────────────────────────────┘          │
│                                                            │
│  ┌─ Code row: SBD + MĐ ────────────────────────┐         │
│  │   y: 413 → 1181 px (h≈35mm)                 │         │
│  │   SBD: x=177 (15mm), 2 digits × 10 options   │         │
│  │   MĐ:  x=1181 (100mm), 2 digits × 10 options │         │
│  └──────────────────────────────────────────────┘         │
│                                                            │
│  ┌─ Answer grid (15 câu) ──────────────────────┐         │
│  │   start: (177, 768) →  15mm, 65mm            │         │
│  │   5 câu/row × 3 rows                          │         │
│  │   bubble: 3×3 mm = 35.4×35.4 px (≈30×30)     │         │
│  │   betweenOpts: 0.5mm = 5.9 px (≈6 px)        │         │
│  │   betweenQuestions: 2mm = 23.6 px (≈24 px)    │         │
│  │   betweenRows: 8mm = 94.5 px (≈94 px)        │         │
│  │   qNumConfig: left, width 6mm (offset 71 px)  │         │
│  └──────────────────────────────────────────────┘         │
│                                                            │
│  ┌─ Footer (disabled, không scan) ─────────────┐          │
│  └──────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────┘
```

### 2.4 Cấu trúc field blocks

Template gồm **5 field blocks**:

| # | Name | Type | Direction | fieldLabels | bubbleValues | origin (x, y) | bubblesGap | labelsGap |
|---|------|------|-----------|-------------|--------------|----------------|------------|-----------|
| 1 | SBD | QTYPE_INT_FROM_1 | vertical | ['sbd1', 'sbd2'] | ['1','2',...,'9','0'] | (177, 413) | 12 (1mm) | 12 (1mm) |
| 2 | MD | QTYPE_INT_FROM_1 | vertical | ['md1', 'md2'] | ['1','2',...,'9','0'] | (1181, 413) | 12 (1mm) | 12 (1mm) |
| 3 | Answers Row 1 | QTYPE_MCQ4 | horizontal | ['q1','q2','q3','q4','q5'] | ['A','B','C','D'] | (248, 768) | 41 (3mm+0.5mm) | 94 (8mm) |
| 4 | Answers Row 2 | QTYPE_MCQ4 | horizontal | ['q6','q7','q8','q9','q10'] | ['A','B','C','D'] | (248, 862) | 41 | 94 |
| 5 | Answers Row 3 | QTYPE_MCQ4 | horizontal | ['q11','q12','q13','q14','q15'] | ['A','B','C','D'] | (248, 956) | 41 | 94 |

**Lý do dùng 3 blocks riêng thay vì 1 grid block:**
- `FieldBlock` hiện tại chỉ hỗ trợ layout linear (1 chiều). Để có grid 5×3, cần custom field block.
- Approach: 3 blocks MCQ4 ngang, mỗi block = 1 hàng câu hỏi. Pattern đơn giản, tận dụng `QTYPE_MCQ4` horizontal mặc định.
- YAGNI: không cần mở rộng `FieldBlock` thành grid.

### 2.5 Tính toán tọa độ origin cho Answer rows

Origin của bubble A (q1.A) trong Row 1:
```
x = 15mm (left margin) + 6mm (qNum width) + 2mm (gap) + 1.5mm (bubble/2)
  = 177 + 71 + 23.6 + 17.7
  = 289.3 px  →  làm tròn 248 (dùng công thức đơn giản hóa: 177 + 71 = 248)
```
> Ghi chú: origin được offset cho qNum là phần ký hiệu câu hỏi (label) bên trái. Tọa độ chính xác sẽ được tinh chỉnh khi chạy thực tế với sample image. Giá trị khởi đầu dùng x ≈ 248 (177 + 71).

Y của 3 rows:
```
Row 1: y = 65mm = 768 px
Row 2: y = 73mm = 862 px  (768 + 94)
Row 3: y = 81mm = 956 px  (768 + 188)
```

---

## 3. UI Test Lab Flow

### 3.1 Template Picker widget (MỚI)

**File mới:** `client/mobile/lib/presentation/widgets/template_picker.dart`

```
┌─ Template Picker ──────────────────────────────────┐
│  [Sample 4]  [● Phiếu 15 câu - A5]  [Phiếu 30 câu] │
└────────────────────────────────────────────────────┘
```

**Component:** StatefulWidget `TemplatePicker`
- State: `String? selectedKey` (mặc định 'sample4')
- 3 `ChoiceChip` ngang trong `Wrap`:
  - `Sample 4` (key='sample4') — wrap factory `OMRTemplate.sample4()`
  - `Phiếu 15 câu - A5` (key='15q') — wrap factory `OMRTemplate.from15Question()`
  - `Phiếu 30 câu - A4` (key='30q') — DISABLED (chưa implement, tô mờ)
- `onSelected` callback trả về `OMRTemplate` tương ứng cho parent

### 3.2 Tích hợp vào OMRTestLabPage

**File sửa:** `client/mobile/lib/presentation/pages/omr_test_lab_page.dart`

Hiện tại (line 28): `final OMRTemplate _template = OMRTemplate.sample4();` — template mặc định là `sample4`.

Thay đổi:
- Đổi `_template` từ `final` thành mutable: `OMRTemplate _template = OMRTemplate.sample4();` (giữ default)
- Thêm widget `TemplatePicker` ở đầu `_buildCaptureScreen()` (phía trên icon `Icons.science_outlined` hoặc dưới mô tả, tùy layout)
- Khi `onSelected` callback từ TemplatePicker → cập nhật `_template`, gọi `_reset()` để clear preview + result cũ
- Trong `_processImage()`: dùng `_template` (đã có sẵn) — không cần đổi
- Cập nhật text "11 Questions | 4 Options" thành dynamic: `'$_numQuestions Questions | $_numOptions Options'`

### 3.3 Hiển thị kết quả khi scan `Phiếu 15 câu`

**File sửa:** `client/mobile/lib/presentation/pages/omr_test_lab_page.dart`

Trong `_buildResultScreen()`, sau khi có `OMRProcessingResult`:
- Nếu `_template.id == '15q'` (template 15 câu): thêm 1 row "Header codes" phía trên TabBarView
- Header codes gồm 2 `Text` widget trong `Container` màu nền nhạt:
  - `Text('SBD: ${response.answers['sbd1'] ?? ''}${response.answers['sbd2'] ?? ''}')` — ghép 2 chữ số thành chuỗi 2-ký-tự
  - `Text('MĐ: ${response.answers['md1'] ?? ''}${response.answers['md2'] ?? ''}')`
- Style: `TextStyle(fontSize: 18, fontWeight: bold)`, căn giữa, padding 8px

Lưu ý: so sánh qua `id` thay vì `name` để tránh magic string dễ vỡ.

---

## 4. Thay đổi code

### 4.1 Factory code mới (file `omr_template.dart`)

```dart
/// Creates a template matching the 15-question A5 sheet:
/// - A5 portrait: 148 × 210 mm @ 300 DPI = 1748 × 2480 px
/// - 2-digit SBD (student code) + 2-digit MĐ (version code) + 15 MCQ4 questions
/// - Layout: 5 questions/row × 3 rows for answers
factory OMRTemplate.from15Question() {
  return OMRTemplate(
    id: '15q',  // stable identifier, dùng để check trong UI
    name: 'Phiếu 15 câu - Ngắn (A5)',
    pageWidth: 1748,     // 148mm @ 300dpi
    pageHeight: 2480,    // 210mm @ 300dpi
    bubbleWidth: 30,     // rounded từ 35.4px (3mm)
    bubbleHeight: 30,
    emptyValue: '',
    outputColumns: [
      'sbd1', 'sbd2', 'md1', 'md2',
      ...List.generate(15, (i) => 'q${i + 1}'),
    ],
    fieldBlocks: [
      // 1. SBD: 2 digits × 10 options, vertical
      FieldBlock.fromConfig(
        name: 'SBD',
        config: {
          'fieldType': 'QTYPE_INT_FROM_1',
          'fieldLabels': ['sbd1', 'sbd2'],
          'origin': [177, 413],   // 15mm, 35mm
          'bubblesGap': 12,       // 1mm
          'labelsGap': 12,        // 1mm
        },
        globalBubbleWidth: 30, globalBubbleHeight: 30, globalEmptyValue: '',
      ),
      // 2. MĐ: 2 digits × 10 options, vertical
      FieldBlock.fromConfig(
        name: 'MD',
        config: {
          'fieldType': 'QTYPE_INT_FROM_1',
          'fieldLabels': ['md1', 'md2'],
          'origin': [1181, 413],  // 100mm, 35mm
          'bubblesGap': 12,
          'labelsGap': 12,
        },
        globalBubbleWidth: 30, globalBubbleHeight: 30, globalEmptyValue: '',
      ),
      // 3. Answer row 1: q1-q5, MCQ4 horizontal
      FieldBlock.fromConfig(
        name: 'Answers Row 1',
        config: {
          'fieldType': 'QTYPE_MCQ4',
          'fieldLabels': ['q1', 'q2', 'q3', 'q4', 'q5'],
          'origin': [248, 768],   // 15mm+71px offset, 65mm
          'bubblesGap': 41,       // 3mm + 0.5mm gap
          'labelsGap': 94,        // 8mm between questions
        },
        globalBubbleWidth: 30, globalBubbleHeight: 30, globalEmptyValue: '',
      ),
      // 4. Answer row 2: q6-q10
      FieldBlock.fromConfig(
        name: 'Answers Row 2',
        config: {
          'fieldType': 'QTYPE_MCQ4',
          'fieldLabels': ['q6', 'q7', 'q8', 'q9', 'q10'],
          'origin': [248, 862],
          'bubblesGap': 41,
          'labelsGap': 94,
        },
        globalBubbleWidth: 30, globalBubbleHeight: 30, globalEmptyValue: '',
      ),
      // 5. Answer row 3: q11-q15
      FieldBlock.fromConfig(
        name: 'Answers Row 3',
        config: {
          'fieldType': 'QTYPE_MCQ4',
          'fieldLabels': ['q11', 'q12', 'q13', 'q14', 'q15'],
          'origin': [248, 956],
          'bubblesGap': 41,
          'labelsGap': 94,
        },
        globalBubbleWidth: 30, globalBubbleHeight: 30, globalEmptyValue: '',
      ),
    ],
    customLabels: {
      'studentCode': ['sbd1', 'sbd2'],
      'versionCode': ['md1', 'md2'],
    },
    preProcessors: [
      OMRPreProcessor(name: 'Levels', options: {'inBlack': 15.0, 'inWhite': 200.0, 'outBlack': 0.0, 'outWhite': 255.0, 'gamma': 1.0}),
      OMRPreProcessor(name: 'GaussianBlur', options: {'kSize': [3, 3], 'sigmaX': 0}),
      OMRPreProcessor(name: 'CropPage', options: {}),
    ],
  );
}
```

### Files to create
1. `client/mobile/lib/presentation/widgets/template_picker.dart` — Widget chọn template
2. `client/mobile/test/presentation/widgets/template_picker_test.dart` — Test cho picker
3. `client/mobile/test/domain/omr/models/omr_template_from15_test.dart` — Test cho factory

### Files to modify
1. `client/mobile/lib/domain/omr/models/omr_template.dart` — Thêm `factory OMRTemplate.from15Question()`
2. `client/mobile/lib/presentation/pages/omr_test_lab_page.dart` — Tích hợp TemplatePicker + hiển thị SBD/MĐ header

### Files KHÔNG động
- `FieldBlock` (đã hỗ trợ `direction` & `fieldLabels` đa dạng)
- `Bubble` model
- `OMREngine` (đã xử lý multi-block generic)
- `MarkerDetector`, `AlignmentShifter`, `BubbleReader` (template-agnostic)

---

## 5. Công thức chuyển đổi mm → pixel

Hằng số:
```
double _PX_PER_MM = 300.0 / 25.4; // ≈ 11.811
int mmToPx(double mm) => (mm * _PX_PER_MM).round();
```

Tra cứu nhanh:

| mm | px (round) |
|----|------------|
| 1 | 12 |
| 2 | 24 |
| 3 | 35 |
| 4 | 47 |
| 5 | 59 |
| 6 | 71 |
| 8 | 94 |
| 10 | 118 |
| 15 | 177 |
| 35 | 413 |
| 65 | 768 |
| 100 | 1181 |
| 148 | 1748 |
| 210 | 2480 |

Sẽ embed inline trong factory (hard-code các giá trị) thay vì tính runtime — đơn giản, dễ đọc, dễ verify bằng mắt.

---

## 6. Testing Strategy

### 6.1 Unit tests

```dart
// test/domain/omr/models/omr_template_from15_test.dart

test('OMRTemplate.from15Question returns A5 template (1748x2480)', () {
  final t = OMRTemplate.from15Question();
  expect(t.pageWidth, 1748);
  expect(t.pageHeight, 2480);
  expect(t.name, 'Phiếu 15 câu - Ngắn (A5)');
});

test('from15Question has 5 field blocks (SBD, MD, 3 answer rows)', () {
  final t = OMRTemplate.from15Question();
  expect(t.fieldBlocks.length, 5);
  expect(t.fieldBlocks[0].name, 'SBD');
  expect(t.fieldBlocks[1].name, 'MD');
  expect(t.fieldBlocks[2].name, 'Answers Row 1');
  expect(t.fieldBlocks[3].name, 'Answers Row 2');
  expect(t.fieldBlocks[4].name, 'Answers Row 3');
});

test('SBD block is QTYPE_INT_FROM_1 with 2 digits × 10 options', () {
  final t = OMRTemplate.from15Question();
  final sbd = t.fieldBlocks[0];
  expect(sbd.fieldType, FieldType.qtypeIntFrom1);
  expect(sbd.fieldLabels, ['sbd1', 'sbd2']);
  expect(sbd.bubbleValues.length, 10);
  expect(sbd.direction, FieldDirection.vertical);
});

test('MD block is QTYPE_INT_FROM_1 with 2 digits × 10 options', () {
  final t = OMRTemplate.from15Question();
  final md = t.fieldBlocks[1];
  expect(md.fieldType, FieldType.qtypeIntFrom1);
  expect(md.fieldLabels, ['md1', 'md2']);
  expect(md.bubbleValues.length, 10);
  expect(md.direction, FieldDirection.vertical);
});

test('Answer row 1 has 5 questions × 4 options MCQ4', () {
  final t = OMRTemplate.from15Question();
  final r1 = t.fieldBlocks[2];
  expect(r1.fieldType, FieldType.qtypeMcq4);
  expect(r1.fieldLabels, ['q1', 'q2', 'q3', 'q4', 'q5']);
  expect(r1.bubbleValues, ['A', 'B', 'C', 'D']);
  expect(r1.direction, FieldDirection.horizontal);
});

test('outputColumns includes SBD, MD, q1-q15', () {
  final t = OMRTemplate.from15Question();
  expect(t.outputColumns, containsAll(['sbd1','sbd2','md1','md2']));
  for (var i = 1; i <= 15; i++) {
    expect(t.outputColumns, contains('q$i'));
  }
});
```

```dart
// test/presentation/widgets/template_picker_test.dart

testWidgets('renders 3 chips with sample4 selected by default', (tester) async {
  await tester.pumpWidget(MaterialApp(
    home: Scaffold(body: TemplatePicker(
      onChanged: (_) {},
    )),
  ));
  expect(find.text('Sample 4'), findsOneWidget);
  expect(find.text('Phiếu 15 câu - A5'), findsOneWidget);
  expect(find.text('Phiếu 30 câu - A4'), findsOneWidget);
});

testWidgets('emits from15Question template when 15q chip selected', (tester) async {
  OMRTemplate? captured;
  await tester.pumpWidget(MaterialApp(
    home: Scaffold(body: TemplatePicker(
      onChanged: (t) => captured = t,
    )),
  ));
  await tester.tap(find.text('Phiếu 15 câu - A5'));
  await tester.pump();
  expect(captured?.name, 'Phiếu 15 câu - Ngắn (A5)');
  expect(captured?.pageWidth, 1748);
});
```

### 6.2 Integration test (manual)

1. In 1 sample image A5 (1748×2480 px) theo template
2. Điền: SBD=12, MĐ=03, q1=B, q2=A, q3=D, q4=C, q5=A
3. Mở OMR Test Lab → chọn chip "Phiếu 15 câu - A5"
4. Chụp/gallery ảnh
5. Verify kết quả: SBD=12, MĐ=03, q1=B, q2=A, q3=D, q4=C, q5=A

### 6.3 Backward compatibility test

1. Mở OMR Test Lab (mặc định chip "Sample 4")
2. Scan ảnh sample4
3. Verify kết quả giống như trước khi sửa (không có SBD/MĐ, chỉ q1..q11)

---

## 7. Error Handling

| Lỗi | Cách xử lý |
|---|---|
| User chưa chọn ảnh | Disable `Process` button, hiển thị hint "Chọn ảnh trước" |
| Ảnh tỷ lệ không khớp A5 (1748:2480) | Vẫn chạy engine, cảnh báo "Tỷ lệ ảnh không chuẩn A5 — kết quả có thể không chính xác" |
| Không detect được bubble nào | Hiển thị "Không phát hiện bubble — kiểm tra ảnh đầu vào" |
| Template parse lỗi (nếu sau này load từ JSON) | Try-catch trong factory, throw message rõ ràng |
| Chip "Phiếu 30 câu - A4" bị tap | Ignore (đã disabled), hoặc show SnackBar "Sắp ra mắt" |

---

## 8. Verification (theo verification-before-completion)

Trước khi claim done:

1. **Chạy tất cả tests:**
   ```
   cd client/mobile && flutter test
   ```
   Expected: all pass

2. **Static analysis:**
   ```
   cd client/mobile && flutter analyze
   ```
   Expected: No errors

3. **Build debug APK:**
   ```
   cd client/mobile && flutter build apk --debug
   ```
   Expected: Build thành công

4. **Manual test trên emulator/device:**
   - OMR Test Lab → mặc định Sample 4 (đảm bảo không phá flow cũ)
   - Switch sang Phiếu 15 câu → chip highlight
   - Scan ảnh A5 test → verify SBD/MĐ/15 câu hiện đúng
   - Cả 2 template scan OK trên cùng thiết bị

---

## 9. Open Questions (đã giải quyết)

- [x] Template dimensions? → A5 (1748×2480) @ 300 DPI
- [x] SBD/MĐ cấu trúc? → 2 chữ số mỗi loại, vertical, dùng QTYPE_INT_FROM_1
- [x] Answer grid layout? → 5 câu/row × 3 rows, MCQ4 horizontal, mỗi row = 1 field block
- [x] Backward compatibility? → Template mặc định vẫn là Sample 4, không sửa logic cũ
- [x] Hiển thị SBD/MĐ? → 2 dòng header phía trên bảng câu trả lời, ghép 2 chữ số
- [x] Template 30 câu A4? → Để dành task sau, hiển thị chip disabled
