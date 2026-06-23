# AMC Pipeline — Quick Reference Card

```
╔══════════════════════════════════════════════════════════════════════╗
║                  AMC GRADING PIPELINE — QUICK START                ║
╚══════════════════════════════════════════════════════════════════════╝

  1. START SERVICES
  ────────────────────────────────────────────────────────────────────
  Backend  → cd server && npm run dev        (port 3000)
  Web      → cd client/web && npm run dev    (port 5173)
  Mobile   → cd client/mobile && flutter run

  Verify   → http://localhost:3000/api/v1/health


  2. CREATE EXAM
  ────────────────────────────────────────────────────────────────────
  Web  → Login → Bài Thi → Tạo Bài Thi mới
         Điền: title, 50 câu, 10 điểm, 3 phiên bản đề
         Thêm câu hỏi → Lưu


  3. COMPILE AMC
  ────────────────────────────────────────────────────────────────────
  Web  → Chi Tiết Bài Thi → Compile với AMC
         Đợi: source → compile → PDF → upload

  API  → POST /api/v1/exams/<id>/compile


  4. PRINT & DISTRIBUTE
  ────────────────────────────────────────────────────────────────────
  • Tải PDF từ tab Tài Liệu (3 phiên bản)
  • In A4, phát ngẫu nhiên cho học sinh
  • Yêu cầu điền: Số báo danh (10 chữ số) + Mã đề (3 chữ số)


  5. SCAN (Mobile)
  ────────────────────────────────────────────────────────────────────
  App → Quét OMR → Chọn bài thi → Chụp ảnh
        Tự động: preprocess → detect bubbles → extract answers → score
        Xem kết quả → Xác nhận gửi


  6. REVIEW (Web)
  ────────────────────────────────────────────────────────────────────
  Web  → Bài Thi → Chi Tiết → Bài Nộp
         Xem điểm chi tiết từng câu
         Top/Bottom 10, phân bố điểm


  7. APPEAL (nếu có)
  ────────────────────────────────────────────────────────────────────
  Học sinh → Gửi phúc tra (chọn câu + lý do)
  Giáo viên → Duyệt / Từ chối → Cập nhật điểm


  8. EXPORT
  ────────────────────────────────────────────────────────────────────
  Web  → Chi Tiết Bài Thi → Xuất Báo Cáo → PDF / Excel


╔══════════════════════════════════════════════════════════════════════╗
║  API ENDPOINTS                                                       ║
╠══════════════════════════════════════════════════════════════════════╣
║  POST /api/v1/exams/:id/compile         Compile AMC PDFs            ║
║  GET  /api/v1/exams/:id/template         Get template for mobile    ║
║  GET  /api/v1/exams/:id/submissions      List submissions           ║
║  POST /api/v1/submissions                Create submission          ║
║  POST /api/v1/exports/exam-report-pdf    Export PDF report          ║
║  POST /api/v1/exports/exam-report-excel  Export Excel report        ║
╚══════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════╗
║  TROUBLESHOOTING                                                     ║
╠══════════════════════════════════════════════════════════════════════╣
║  AMC not found       → Install in WSL2: sudo apt install auto-multiple-choice  ║
║  Template empty      → Check /api/v1/exams/:id/template response     ║
║  Scan fails          → Good lighting, flat paper, high resolution     ║
║  All tests pass     → cd server && npm test -- --testPathPattern=amc║
╚══════════════════════════════════════════════════════════════════════╝
```
