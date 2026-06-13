# OMR PDF — Tọa độ Bubble Chính xác & Khớp giữa Web và Mobile

**Ngày:** 2026-06-14
**Trạng thái:** Draft (đã duyệt qua 5 phần brainstorming)
**Platform:** Web (React + jsPDF) + Backend (Node.js) + Flutter mobile
**Phạm vi:** Đảm bảo khi in phiếu từ web và quét/scán bằng app, tọa độ bubble khớp chính xác cho từng template

---

## 1. Bối cảnh & Vấn đề

### 1.1 Luồng hiện tại

```
GIÁO VIÊN TẠO ĐỀ TRÊN WEB
   ↓
Server lưu OMRTemplate vào MongoDB với "zones" (mm)
   ↓
GIÁO VIÊN IN PHIẾU
   ├── Web (client) gọi GET /omr-templates/:id/full
   │   → client/web/src/features/reports/omrSheetPdf.ts
   │   → jsPDF tự tính bubble bằng zones mm
   │   → Xuất PDF trên trình duyệt
   │
   └── Server gọi GET /omr-templates/:id/pdf
       → server/src/services/omrTemplatePdf.service.js
       → PDFKit tự tính bubble (cùng zones mm) — code ĐỘC LẬP
       → Trả về PDF binary

HỌC SINH ĐIỀN & SCAN
   ↓
App mobile (Flutter)
   → Gọi GET /omr-templates/:id/json
   → server/src/services/omrTemplateJson.service.js
   → Convert zones mm → pixel @ 300 DPI
   → Mobile nhận fieldBlocks (origin, bubblesGap, labelsGap) dạng pixel
   → Dùng OpenCV detect bubble ở các pixel đó
```

### 1.2 Vấn đề cốt lõi: 3 implementation ĐỘC LẬP cùng tính 1 thứ

| Implementation | File | Đơn vị input | Đơn vị output | Ghi chú |
|---|---|---|---|---|
| **jsPDF (web)** | `client/web/src/features/reports/omrSheetPdf.ts` | zones mm | mm (vẽ trực tiếp lên PDF) | Đang được dùng bởi web export |
| **PDFKit (server)** | `server/src/services/omrTemplatePdf.service.js` | zones mm | pt (sau khi nhân `MM = 2.8346456693`) | Đang được dùng bởi server route `/pdf` |
| **JSON converter (server)** | `server/src/services/omrTemplateJson.service.js` | zones mm | px @ 300 DPI | Dùng cho mobile |

**3 file này đều implement logic "tính vị trí bubble từ zones"**, nhưng:
- Không có cơ chế đảm bảo kết quả khớp nhau
- Nếu 1 file fix bug lệch tọa độ, 2 file kia không tự động cập nhật
- Mỗi file có 1 cách rounding/precision khác nhau:
  - jsPDF: làm tròn nội bộ của jsPDF (thường là 2 chữ số thập phân mm)
  - PDFKit: `v * 2.8346456693` (floating point)
  - JSON: `Math.round(mm * 300/25.4)` (rounding integer pixel)

### 1.3 Ví dụ bug đã thấy

Trong `omr_template.dart` (line 192-198) có comment:
```dart
/// TODO(calibration): When a real 15q A5 sheet image is available, open
/// the Test Lab, scan the sheet with this template, and visually compare
/// the overlay circle positions to the actual printed bubbles. Adjust the
/// `origin` / `bubblesGap` / `labelsGap` values below if bubbles are
/// offset. Typical first-pass adjustments: +/- 10-20 px on `originX/Y`.
```

→ Mobile team đã từng phải hardcode estimate origin vì không có tool sinh tọa độ đáng tin cậy. Template `15q` đang ở trạng thái "chưa calibrate".

### 1.4 Yêu cầu chốt (từ user)

1. **Sửa phần tạo PDF ở web (jsPDF)**: tọa độ phải khớp với mobile khi scan
2. **Single source of truth**: không còn 2 implementation độc lập
3. **Web gọi `/omr-templates/:id/json`** rồi render PDF locally (dùng JSON convert sẵn thay vì tự tính)
4. **Auto-align trên mobile**: chọn option tốt nhất (sẽ chọn **configurable** - cho phép bật/tắt theo template)
5. **Unit test** cho việc tính tọa độ

---

## 2. Nguyên nhân gốc (Root cause)

### 2.1 Sao cần 1 single source of truth?

- **DRY**: 3 file đang duplicate logic "tính bubble position từ zones"
- **Single source of truth** đảm bảo web in ra ở đâu, mobile detect ở đó
- **Test một chỗ, yên tâm cả hệ thống**

### 2.2 Tại sao `/json` là nguồn chính xác nhất?

- API `/json` đã được sinh ra ĐỂ cung cấp cho mobile → đã chạy đúng
- Web hiện đang gọi `/full` rồi tự tính → **logic web khác logic server** → dễ lệch
- Nếu web dùng `/json` (giống mobile), cả hai sẽ thống nhất 1 cách tính tọa độ

### 2.3 Auto-align nên configurable vì sao?

- Auto-align hiện tại (`_computeShifts`) hoạt động khi scan bị lệch nhẹ
- Nhưng nếu web in đúng, mobile đọc đúng → **auto-align là nguồn bug khó debug**
- Giải pháp: cho phép teacher tắt auto-align khi tạo template "đã calibrate"
- Mặc định **BẬT** auto-align để backward compatible; teacher tắt khi muốn kiểm soát tuyệt đối

---

## 3. Thiết kế giải pháp

### 3.1 Kiến trúc tổng thể (sau khi sửa)

```
GIÁO VIÊN TẠO/CHỈNH TEMPLATE
   ↓
Server lưu zones (mm) trong MongoDB — không thay đổi
   ↓
GIÁO VIÊN IN PHIẾU
   ├── Web gọi GET /omr-templates/:id/json
   │   → Nhận về JSON convert sẵn (fieldBlocks với origin/bubblesGap/labelsGap tính bằng pixel @ 300 DPI)
   │   → Render PDF bằng jsPDF dùng ĐÚNG pixel coordinate này (chia cho 300*25.4 để về mm)
   │   → Đảm bảo: web render bubble tại (Xmm, Ymm) ↔ mobile detect bubble tại (Xpx, Ypx) với Xpx = Xmm * 300/25.4
   │
   └── Server gọi GET /omr-templates/:id/pdf
       → VẪN dùng PDFKit (backward compat) nhưng dùng CHUNG logic layout
       → Hoặc: chuyển sang gọi lại logic từ `omrTemplateJson.service.js` (chấp nhận được)
       → Khuyến nghị: giữ `/pdf` cho backward compat, nhưng redirect web UI sang dùng `/json` + jsPDF

HỌC SINH ĐIỀN & SCAN
   ↓
App mobile
   → Gọi GET /omr-templates/:id/json (giống web)
   → Nhận fieldBlocks pixel
   → auto-align = true (mặc định) hoặc false (nếu template flag `disableAutoAlign`)
   → OpenCV detect bubble tại pixel coords
```

### 3.2 Thay đổi trên Backend (Node.js)

#### 3.2.1 `omrTemplateJson.service.js` — Refactor để dùng làm nguồn chính

**File:** `server/src/services/omrTemplateJson.service.js`

- **KHÔNG thay đổi output format** — mobile đang dùng format này
- **Tách nhỏ các hàm** để có thể gọi riêng từng phần (tính header, code blocks, answer area, footer):
  ```js
  function computeLayout(template) { /* returns layout constants */ }
  function buildStudentCodeBlock(zones, layout) { /* returns {origin, bubblesGap, labelsGap, ...} */ }
  function buildVersionCodeBlock(zones, layout) { /* same */ }
  function buildAnswerAreaBlocks(zones, layout) { /* returns array of {origin, bubblesGap, labelsGap, ...} */ }
  ```
- **Thêm unit test** cho mỗi hàm — đây là điểm quan trọng nhất

#### 3.2.2 Thêm API endpoint mới: `GET /omr-templates/:id/layout` (optional, nâng cao)

- Trả về layout ĐÃ tính sẵn cho cả web và mobile
- Format:
  ```json
  {
    "pageDimensions": [2480, 3508],
    "pageDimensionsMm": [210, 297],
    "dpi": 300,
    "header": { "y": 15, "height": 40, "endY": 55 },
    "codeBlocks": { "y": 60, "height": 28, "endY": 88 },
    "answerArea": {
      "x": 20, "y": 94,
      "cellWidth": 30, "cellHeight": 12,
      "bubblesPerRow": 5, "rows": 6
    },
    "fieldBlocks": { /* same as /json */ }
  }
  ```
- Web sẽ dùng `layout` này thay vì tự tính

### 3.3 Thay đổi trên Web (React + jsPDF)

#### 3.3.1 `omrSheetPdf.ts` — Viết lại hoàn toàn

**File:** `client/web/src/features/reports/omrSheetPdf.ts`

**Cách tiếp cận mới:**
1. Input: nhận `OMRJson` (giống format `/json` endpoint trả về) thay vì `OMRTemplateData`
2. Vẽ PDF từ JSON:
   - Page size lấy từ `pageDimensions` (pixel) → convert sang mm (chia cho `300/25.4`)
   - Vẽ header, code blocks, answer area, footer dùng `fieldBlocks` đã có origin/gaps
3. **BỎ toàn bộ logic tính layout** — lấy từ JSON
4. **Giữ nguyên logic vẽ bubble** (circle/square, label bên trong)

**Lý do giữ JSON làm input thay vì tính lại ở client:**
- JSON đã được server tính đúng → mobile đang dùng và chạy OK
- Web chỉ cần "render" → đơn giản, ít bug
- Nếu sau này muốn tinh chỉnh layout, sửa 1 chỗ (server `omrTemplateJson.service.js`) → cả web + mobile đều cập nhật

#### 3.3.2 `examReportExport.ts` — Cập nhật fetch

**File:** `client/web/src/features/reports/examReportExport.ts`

- `fetchFullTemplate` → đổi thành `fetchOmrJson` gọi `/omr-templates/:id/json`
- `exportOmrTemplatePdf` và `exportOmrTemplateVersionSheetsPdf` dùng JSON thay vì full template
- Có thể giữ `/full` cho các trường hợp cần xem zones mm (debug, advanced)

### 3.4 Thay đổi trên Mobile (Flutter)

#### 3.4.1 `AppOmrTemplate` — Thêm flag `autoAlign`

**File:** `client/mobile/lib/domain/omr/engine/app_omr_models.dart`

```dart
class AppOmrTemplate {
  // ... existing fields
  final bool autoAlign;

  const AppOmrTemplate({
    // ... existing params
    this.autoAlign = true, // mặc định bật để backward compat
  });
}
```

#### 3.4.2 `OMRTemplate` — Parse `autoAlign` từ JSON

**File:** `client/mobile/lib/domain/omr/models/omr_template.dart`

- Parse `autoAlign` từ JSON (default `true`)
- Convert sang `AppOmrTemplate` với flag tương ứng

#### 3.4.3 `app_omr_engine.dart` — Tôn trọng flag

- Khi `template.autoAlign = false`: bỏ qua `_computeShifts()`, dùng đúng tọa độ từ template
- Khi `template.autoAlign = true`: giữ nguyên logic hiện tại

### 3.5 Thay đổi trên Backend (server JSON service)

#### 3.5.1 `omrTemplateJson.service.js` — Thêm field `autoAlign` vào output

- Lấy từ `template.scannerConfig.autoAlign` (mặc định `true`)
- Server admin có thể set false cho template "đã calibrate"

#### 3.5.2 `omrTemplate.model.js` — Thêm field `autoAlign` (optional)

- `scannerConfig.autoAlign: Boolean` (default `true`)
- Backward compat: nếu không có → `true`

### 3.6 Lý do KHÔNG xóa PDFKit (server-side PDF)

- Server PDF `/pdf` endpoint đang được dùng cho backward compat
- Có thể có tích hợp bên thứ 3 đang dùng
- **YAGNI**: không cần refactor phần không liên quan đến bug

---

## 4. API Contract (thay đổi)

### 4.1 `GET /omr-templates/:id/json` (MỚI field, không breaking)

**Response thêm:**
```json
{
  "name": "OMR Template",
  "pageDimensions": [2480, 3508],
  "bubbleDimensions": [71, 71],
  "emptyValue": "",
  "fieldBlocks": { /* unchanged */ },
  "customLabels": {},
  "preProcessors": [],
  "outputColumns": ["q1", "q2"],
  "autoAlign": true  // MỚI - optional, default true
}
```

### 4.2 `GET /omr-templates/:id/layout` (MỚI, optional nâng cao)

**Response:**
```json
{
  "pageDimensionsMm": [210, 297],
  "pageDimensionsPx": [2480, 3508],
  "dpi": 300,
  "mmToPx": 11.811,
  "header": { "yMm": 15, "heightMm": 40, "endYMm": 55, "yPx": 177, "heightPx": 472, "endYPx": 649 },
  "codeBlocks": { "yMm": 60, "heightMm": 28, "endYMm": 88, "yPx": 709, "heightPx": 331, "endYPx": 1040 },
  "answerArea": {
    "xMm": 20, "yMm": 94, "endYMm": 250,
    "cellWidthMm": 30, "cellHeightMm": 12,
    "questionsPerRow": 5, "rows": 6,
    "fieldBlocks": { /* same as /json */ }
  }
}
```

---

## 5. Error Handling

### 5.1 Web
- Nếu `/json` fail (network, 404, 500) → fallback về `/full` và dùng logic cũ + log warning
- Nếu JSON thiếu `fieldBlocks` → throw error "Template không hợp lệ"
- Nếu `pageDimensions` = 0 → throw error

### 5.2 Server
- Validate `zones` đầy đủ (header, codeBlocks, answerArea) trước khi convert
- Nếu thiếu → trả về 400 với message rõ ràng

### 5.3 Mobile
- Khi `autoAlign = false` mà tọa độ sai → hiển thị warning trên UI "Vui lòng căn chỉnh phiếu cho đúng"
- Không fallback về auto-align khi user đã tắt (giữ đúng intent)

---

## 6. Testing Strategy

### 6.1 Server (Node.js) - Unit test cho `omrTemplateJson.service.js`

**File MỚI:** `server/tests/unit/services/omrTemplateJson.test.js`

Tests cho mỗi hàm:
1. `computeLayout`:
   - A4 portrait, header 40mm → `header.endYMm = 55`
   - Không có header → `header.endYMm = mTop = 15`
   - Có cả studentCode + versionCode → `codeBlocks.endYMm = max(scH, vcH) + 5 + mTop`
2. `buildStudentCodeBlock`:
   - 3 digits, bubble 2.5mm, gap 1mm → `originY = 6mm offset + cbY`
   - `bubblesGap` (vertical step) = `bh + bGapV`
   - `labelsGap` (horizontal step) = `bw + bGapH`
3. `buildVersionCodeBlock`: tương tự, đặt ở `vx = mLeft + cW/2 + 2`
4. `buildAnswerAreaBlocks`:
   - 50 questions, 5/row → 10 columns
   - `colStartX = ox + col * cellW + qNumW + questionGap`
   - `bubblesGap` (horizontal) = `bw + bGap`
   - `labelsGap` (vertical) = `bh + lGap`
5. End-to-end: zones → JSON → so sánh với expected snapshot

**Snapshot test**: cố định 1 template mẫu, assert toàn bộ JSON output khớp. Nếu thay đổi → phải review kỹ (có thể làm lệch mobile).

### 6.2 Web (React + Vitest) - Unit test cho `omrSheetPdf.ts`

**File MỚI:** `client/web/src/features/reports/omrSheetPdf.test.ts`

Tests:
1. `jsonToPdfCoordinates`:
   - `pageDimensions = [2480, 3508]`, `dpi = 300` → `paperMm = [210, 297]`
   - `fieldBlock.origin = [177, 413]` → `bubble at (177/11.811, 413/11.811) = (15.0, 34.97) mm`
2. `drawBubbleFromJson`:
   - Vẽ 1 bubble tại đúng tọa độ
3. End-to-end: JSON mẫu → jsPDF instance → so sánh commands đã gọi (dùng mock)

### 6.3 Mobile (Flutter) - Test cho OMRTemplate

**File CẬP NHẬT:** `client/mobile/test/domain/omr/template_test.dart`

Tests thêm:
1. `OMRTemplate.fromJson` parse `autoAlign` đúng
2. `AppOmrTemplate` có field `autoAlign`
3. `OMRTemplate.fromJson` không có `autoAlign` → default `true`

### 6.4 Integration test (optional, nâng cao)

**File MỚI:** `tests/integration/omr-pdf-coord-consistency.test.js`

Test thực tế:
- Tạo template mẫu
- Gọi `/json` lấy pixel coordinates
- Convert pixel → mm (chia cho 11.811)
- Vẽ PDF ở web (dùng jsPDF)
- Mở PDF, dùng pdf.js lấy tọa độ bubble
- So sánh với pixel coordinates từ `/json` (sau khi scale ngược)
- Tolerance: ±0.5mm (1.4px @ 300 DPI)

---

## 7. Files thay đổi

### Backend (Node.js)
| File | Loại | Mô tả |
|---|---|---|
| `server/src/services/omrTemplateJson.service.js` | SỬA | Refactor thành các hàm nhỏ, thêm `autoAlign` field |
| `server/src/models/omrTemplate.model.js` | SỬA | Thêm `scannerConfig.autoAlign` (optional, default true) |
| `server/src/controllers/omrTemplate.controller.js` | SỬA | Truyền `autoAlign` vào `/json` response |
| `server/tests/unit/services/omrTemplateJson.test.js` | MỚI | Unit tests cho layout computation |

### Web (React)
| File | Loại | Mô tả |
|---|---|---|
| `client/web/src/features/reports/omrSheetPdf.ts` | SỬA LỚN | Viết lại: input là JSON, render từ pixel coordinates (convert sang mm) |
| `client/web/src/features/reports/examReportExport.ts` | SỬA | `fetchOmrJson` thay cho `fetchFullTemplate` |
| `client/web/src/features/reports/omrSheetPdf.test.ts` | MỚI | Unit test coordinate conversion |

### Mobile (Flutter)
| File | Loại | Mô tả |
|---|---|---|
| `client/mobile/lib/domain/omr/models/omr_template.dart` | SỬA | Parse `autoAlign` từ JSON |
| `client/mobile/lib/domain/omr/engine/app_omr_models.dart` | SỬA | Thêm field `autoAlign` vào `AppOmrTemplate` |
| `client/mobile/lib/domain/omr/engine/app_omr_engine.dart` | SỬA | Tôn trọng `autoAlign` flag |
| `client/mobile/test/domain/omr/template_test.dart` | CẬP NHẬT | Test `autoAlign` parsing |

### Spec
| File | Mô tả |
|---|---|
| `docs/superpowers/specs/2026-06-14-omr-pdf-coords-design.md` | File này |

---

## 8. YAGNI & Out of scope

**Không làm trong feature này:**
- Không xóa PDFKit server-side (backward compat)
- Không thêm calibration tool scan tự động (quá phức tạp, làm sau)
- Không thay đổi UI in phiếu trên web (chỉ đổi data source từ `/full` → `/json`)
- Không thêm field DPI configurable (giữ 300 DPI cố định)
- Không refactor `omrTemplatePdf.service.js` (PDFKit vẫn dùng layout riêng, nhưng không dùng cho web UI nữa)
- Không thêm `/layout` endpoint (optional nâng cao, có thể làm sau)

---

## 9. Rủi ro & Giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Refactor `omrTemplateJson.service.js` gây lệch mobile hiện tại | Unit test snapshot trước/sau; nếu thay đổi output phải update mobile cùng lúc |
| Web dùng `/json` thay `/full` mà template cũ chưa có `autoAlign` | Default `true` → backward compat |
| Auto-align tắt gây sai tọa độ nếu scan bị lệch | Hiển thị warning trên UI; document rõ cho teacher |
| PDF vẽ bằng jsPDF có thể render khác PDFKit (font, kerning) | Snapshot test cho tọa độ bubble (text/fill không ảnh hưởng detect) |
| Tolerance 0.5mm có thể không đủ | Calibration test với ảnh scan thực tế sau khi implement |

---

## 10. Checklist triển khai (preview)

Sẽ được chi tiết trong `writing-plans` skill output. Tổng quan:

1. **Server**: Refactor `omrTemplateJson.service.js` + thêm `autoAlign` + Unit tests
2. **Web**: Viết lại `omrSheetPdf.ts` dùng JSON + Unit tests
3. **Web**: Cập nhật `examReportExport.ts` fetch `/json` thay `/full`
4. **Mobile**: Parse `autoAlign` + truyền xuống engine + tôn trọng flag + Tests
5. **Manual test**: in PDF từ web → scan bằng app → verify bubble detect đúng
6. **Snapshot test**: cố định output `omrTemplateJson.service.js` để mobile không bị lệch
