# AMC Full Grading Pipeline — Hướng Dẫn Vận Hành

> Hướng dẫn từng bước để chạy toàn bộ pipeline AMC: tạo đề → compile AMC → scan mobile → chấm điểm → sync kết quả.

**Thời gian ước tính:** 30–45 phút cho luồng hoàn chỉnh (không tính thời gian thi)

---

## Mục Lục

1. [Kiểm Tra Môi Trường](#1-kiểm-tra-môi-trường)
2. [Tạo Bài Thi với AMC](#2-tạo-bài-thi-với-amc)
3. [Compile AMC (Tạo PDF OMR)](#3-compile-amc-tạo-pdf-omr)
4. [In Ấn & Phát Đề](#4-in-ấn--phát-đề)
5. [Scan Phiếu Trả Lời (Mobile)](#5-scan-phiếu-trả-lời-mobile)
6. [Xem Kết Quả (Web)](#6-xem-kết-quả-web)
7. [Xử Lý Phúc Tra (Appeal)](#7-xử-lý-phúc-tra-appeal)
8. [Export Báo Cáo](#8-export-báo-cáo)

---

## 1. Kiểm Tra Môi Trường

### 1.1 Backend Server

```bash
cd server
npm install
npm run dev
```

Kiểm tra server chạy tại `http://localhost:3000`.

### 1.2 AMC Tools (WSL2)

Backend cần AMC trong WSL2. Kiểm tra:

```bash
# Trên Windows (PowerShell hoặc cmd)
wsl -e bash -c "which amc && which texlive && which gs"
```

Nếu thiếu tool, cài đặt theo hướng dẫn tại `server/docs/AMC-SETUP.md`.

### 1.3 Mobile App

```bash
cd client/mobile
flutter pub get
flutter run
```

### 1.4 Web App

```bash
cd client/web
npm install
npm run dev
```

Kiểm tra tại `http://localhost:5173`.

### 1.5 Database

Đảm bảo MongoDB đang chạy và `.env` file có:

```
MONGODB_URI=mongodb://localhost:27017/smart_grading
JWT_SECRET=<your_secret>
```

---

## 2. Tạo Bài Thi với AMC

### 2.1 Qua Web

1. Đăng nhập tại `http://localhost:5173`
2. Vào **Bài Thi** → **Tạo Bài Thi mới**
3. Điền thông tin:
   - Tên bài thi: `Kiem tra Giua Ky`
   - Số câu hỏi: `50`
   - Tổng điểm: `10`
   - Số phiên bản (đề): `3` (sinh 3 đề khác nhau để chống gian lận)
   - Xáo trộn câu hỏi: **Có**
   - Xáo trộn đáp án: **Có**
4. Thêm câu hỏi từ ngân hàng hoặc tạo mới
5. Chọn lớp học
6. Nhấn **Tạo Bài Thi**

> **Quan trọng:** Bài thi được tạo trên MongoDB. AMC compile sẽ chạy riêng sau.

### 2.2 Qua Mobile

1. Mở app → **Tạo Bài Thi**
2. Điền thông tin tương tự
3. **Lưu ý:** AMC compile chỉ chạy được từ backend. Mobile tạo exam rồi cần trigger compile thủ công qua web.

---

## 3. Compile AMC (Tạo PDF OMR)

Sau khi tạo bài thi, cần compile để sinh phiếu trả lời OMR.

### 3.1 Qua Web

1. Vào **Chi Tiết Bài Thi** (`/exams/:id`)
2. Nhấn **Compile với AMC**
3. Đợi backend:
   - Sinh AMC source (.amc file)
   - Chạy `amc-compile` trong WSL2
   - Tạo PDF cho từng phiên bản (đề)
   - Upload lên Cloudinary
4. Kiểm tra:
   - 3 file PDF được sinh (mỗi đề 1 phiên bản)
   - File `template.json` được lưu vào ExamVersion

### 3.2 Qua API

```bash
# Trigger compile
curl -X POST http://localhost:3000/api/v1/exams/<examId>/compile \
  -H "Authorization: Bearer <token>"

# Kiểm tra trạng thái
curl http://localhost:3000/api/v1/exams/<examId> \
  -H "Authorization: Bearer <token>"
```

### 3.3 Verify Template JSON

Sau khi compile, kiểm tra template đã được tạo:

```bash
curl http://localhost:3000/api/v1/exams/<examId>/template \
  -H "Authorization: Bearer <token>"
```

Response mẫu:

```json
{
  "examId": "6867e2b...",
  "versionCode": "101",
  "answerKey": {
    "q1": "B",
    "q2": "A",
    "q3": "C"
  },
  "questionScores": {
    "q1": 1,
    "q2": 1,
    "q3": 1
  },
  "totalScore": 10,
  "numberOfQuestions": 3,
  "studentId": {
    "digits": 10,
    "coords": []
  },
  "answers": {}
}
```

> **Lưu ý:** `coords` hiện đang trống (placeholder). Cần AMC CSV thực tế để fill coordinates. Xem [Phase tiếp theo](#phase-2AMC-CSV-coordinates).

---

## 4. In Ấn & Phát Đề

### 4.1 Tải PDF

1. Vào **Chi Tiết Bài Thi**
2. Tab **Tài Liệu** → tải từng phiên bản đề
3. Mỗi đề có:
   - Mã phiên bản (101, 102, 103...)
   - Student ID (10 ô vuông để điền số báo danh)
   - 50 câu hỏi trắc nghiệm (4 đáp án A/B/C/D)

### 4.2 In Phiếu Trả Lời

- In 1-2 mặt, khổ A4
- **Quan trọng:** In đúng phiên bản PDF tương ứng với đề thi thực tế
- Mỗi phiên bản có mã khác nhau (ghi ở góc trên)

### 4.3 Phát Đề

1. Phát đề ngẫu nhiên cho học sinh
2. Yêu cầu học sinh điền:
   - **Số báo danh** (10 chữ số): tô đủ 10 ô, ví dụ `1234567890`
   - **Mã đề** (3 chữ số): tô 1 ô, ví dụ `101`

---

## 5. Scan Phiếu Trả Lời (Mobile)

### 5.1 Mở App

1. Mở app trên điện thoại
2. Đăng nhập tài khoản giáo viên
3. Vào **Quét OMR** hoặc **Scan**

### 5.2 Chọn Bài Thi

1. Chọn bài thi đã tạo
2. App sẽ tự động fetch `template.json` từ backend

### 5.3 Chụp Ảnh

1. Đặt phiếu trả lời trên mặt phẳng sáng
2. Căn chỉnh cho đầy khung hình
3. Chụp ảnh (ánh sáng tốt, không bóng)

### 5.4 Xử Lý Tự Động

App sẽ:

1. **Preprocess** — chuyển ảnh sang đen trắng (opencv_dart)
2. **Detect bubbles** — tìm vùng tô đậm
3. **Extract Student ID** — đọc 10 chữ số số báo danh
4. **Extract Version Code** — đọc mã đề
5. **Detect Answers** — đọc đáp án A/B/C/D cho từng câu
6. **Scoring** — chấm điểm theo answer key có trọng số

### 5.5 Xem Kết Quả

Sau khi scan:

```
Điểm: 8.5 / 10 (85.0%) — Grade: B+
Đúng: 42 | Sai: 6 | Bỏ trống: 2
```

Danh sách chi tiết từng câu:
- Câu 1: **B** vs **B** ✓ +1.0/1.0
- Câu 2: **A** vs **C** ✗ +0.0/1.0
- Câu 3: *(bỏ trống)* vs **A** ? +0.0/1.0

### 5.6 Xác Nhận & Gửi

1. Xem lại kết quả
2. Nhấn **Xác nhận** để gửi lên server
3. Kết quả được lưu vào MongoDB

---

## 6. Xem Kết Quả (Web)

### 6.1 Danh Sách Bài Nộp

1. Vào **Chi Tiết Bài Thi** → tab **Bài Nộp**
2. Xem danh sách tất cả phiếu đã scan
3. Trạng thái: `Đã quét` / `Hoàn thành` / `Phúc tra`

### 6.2 Chi Tiết Từng Bài

Nhấn vào một bài nộp để xem:

- Thông tin: MSSV, mã đề, thời gian scan
- Điểm tổng: `8.5 / 10`
- **Bảng điểm chi tiết từng câu:**
  | Câu | Đáp án SV | Đáp án đúng | Kết quả | Điểm |
  |-----|-----------|-------------|---------|------|
  | 1   | B         | B           | ✓       | +1.0/1.0 |
  | 2   | A         | C           | ✗       | +0.0/1.0 |
  | 3   | —         | A           | Bỏ trống | +0.0/1.0 |

### 6.3 Thống Kê Bài Thi

Tab **Báo Cáo** trong Chi Tiết Bài Thi:
- Tổng học sinh / số bài nộp
- Điểm trung bình, cao nhất, thấp nhất
- Phân bố điểm (biểu đồ)
- Xếp loại (Xuất sắc / Giỏi / Khá / Yếu)
- Top 10 / Bottom 10

---

## 7. Xử Lý Phúc Tra (Appeal)

Khi học sinh khiếu nại kết quả.

### 7.1 Học Sinh Gửi Appeal

1. Vào trang kết quả bài thi
2. Chọn câu muốn phúc tra
3. Gửi yêu cầu kèm lý do

### 7.2 Giáo Viên Duyệt (Web)

1. Vào **Phúc Tra** → danh sách appeals
2. Xem chi tiết: câu nào, đáp án học sinh, lý do
3. **Duyệt:** cập nhật điểm cho câu đó
4. **Từ chối:** giữ nguyên điểm
5. Gửi thông báo cho học sinh

---

## 8. Export Báo Cáo

### 8.1 PDF Báo Cáo

1. Vào **Chi Tiết Bài Thi** → **Xuất Báo Cáo**
2. Chọn định dạng: **PDF**
3. Nội dung:
   - Thống kê tổng quan (điểm TB, phân bố)
   - Biểu đồ phân bố điểm
   - Top 10 / Bottom 10 học sinh
   - Phân tích AI (nếu bật)
   - Khuyến nghị cải thiện

### 8.2 Excel Điểm

1. **Xuất Báo Cáo** → **Excel**
2. Sheet 1: Tổng quan thống kê
3. Sheet 2: Điểm chi tiết từng học sinh
4. Sheet 3: Phân bố điểm
5. Sheet 4: AI Insights

### 8.3 Qua API

```bash
curl -X POST http://localhost:3000/api/v1/exports/exam-report-pdf \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"examId": "<examId>"}' \
  --output report.pdf

curl -X POST http://localhost:3000/api/v1/exports/exam-report-excel \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"examId": "<examId>"}' \
  --output report.xlsx
```

---

## Phase Tiếp Theo: AMC CSV Coordinates

> Hiện tại bubble coordinates trong template đang là placeholder. Khi có AMC thực tế:

### Bước 1: Export CSV từ AMC

Trong AMC (Auto Multiple Choice):
1. Mở bài thi đã tạo
2. **Learning / Students' sheets** → chọn scan
3. **Learning / Data** → Export → CSV
4. File CSV có format:

```csv
type,name,page,x1,y1,x2,y2
zone,student_id,1,72,200,90,218
zone,student_id,1,90,200,108,218
zone,student_id,1,108,200,126,218
...
answer,q01_a,1,120,300,135,315
answer,q01_b,1,140,300,155,315
answer,q01_c,1,160,300,175,315
answer,q01_d,1,180,300,195,315
```

### Bước 2: Integrate vào Pipeline

```bash
# Parse CSV → update templateJson
cd server
node -e "
const parser = require('./src/amc/amcCsvParser');
const bridge = require('./src/amc/amcTemplateBridge');
const fs = require('fs');

const csv = fs.readFileSync('path/to/coordinates.csv', 'utf8');
const csvData = parser.parse(csv);

// Update ExamVersion với coords
// ... (xem amcTemplateBridge.generate())
"
```

### Bước 3: Sync lên Mobile

Template mới với coords sẽ được fetch tự động khi scan.

---

## Troubleshooting

### Lỗi AMC không tìm thấy

```
AMC not available on this server
```

**Giải pháp:**
```bash
# Trong WSL2
sudo apt install auto-multiple-choice texlive ghostscript
amc-check
```

### Lỗi scan không đọc được bubble

- Kiểm tra ảnh chụp: đủ sáng, không mờ
- Đảm bảo phiếu phẳng, không gấp
- Kiểm tra DPI: nên chụp ở độ phân giải cao

### Template trống sau compile

- Kiểm tra AMC compile có chạy thành công không
- Verify log trong terminal backend
- Chạy thủ công: `POST /api/v1/exams/:id/compile`

### Mobile không fetch được template

- Kiểm tra backend đang chạy
- Kiểm tra đúng examId
- Verify network trong app

---

## File Reference

### Backend
| File | Mục đích |
|------|---------|
| `server/src/amc/amcCsvParser.js` | Parse AMC CSV → coords |
| `server/src/amc/amcTemplateBridge.js` | Generate template.json |
| `server/src/controllers/exam.controller.js` | API handlers |
| `server/src/routes/v1/exam.route.js` | Routes |
| `server/src/models/examVersion.model.js` | templateJson field |
| `server/src/services/export.service.js` | PDF/Excel export |

### Mobile
| File | Mục đích |
|------|---------|
| `lib/domain/omr/engine_v2/omr_scanner.dart` | Main scanner |
| `lib/domain/omr/engine_v2/omr_bubble_detector.dart` | Bubble detection |
| `lib/domain/omr/engine_v2/scoring_engine.dart` | Weighted scoring |
| `lib/core/network/exam_template_service.dart` | Fetch template |
| `lib/presentation/pages/camera_scanner_page.dart` | Camera UI |

### Web
| File | Mục đích |
|------|---------|
| `pages/SubmissionsPage.tsx` | Danh sách bài nộp |
| `pages/ExamDetailPage.tsx` | Chi tiết bài thi |
| `store/submissionStore.ts` | Submission state |
