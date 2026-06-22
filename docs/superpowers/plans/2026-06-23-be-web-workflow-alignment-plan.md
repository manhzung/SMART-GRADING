# SMART GRADING — Implementation Plan: Exam Workflow BE + Web Alignment

> **Phiên bản:** 1.0 | **Ngày:** 2026-06-23
> **Mục tiêu:** So sánh spec trong `system-description.md` với code hiện tại của BE (Node.js) và Web (React), xác định các khoảng trống, và đề xuất plan sửa chữa / bổ sung.

---

## Tổng quan khoảng trống

```
Mức độ nghiêm trọng:
  🔴 CRITICAL  — Không hoạt động / break core flow
  🟠 HIGH       — Thiếu tính năng quan trọng
  🟡 MEDIUM     — Chưa hoàn thiện
  🟢 LOW        — Cần cải thiện UX / perf
```

---

## PHẦN 1: BACKEND — Node.js/Express

---

### BE-01: Tạo `notification.service.js` và trigger notifications tự động

**Trạng thái:** 🔴 CRITICAL — Tồn tại model `Notification` nhưng KHÔNG có service tạo notification, và KHÔNG có trigger nào gọi notification.

**Spec yêu cầu:**

| Sự kiện | Loại notification | Người nhận |
|---------|----------------|-----------|
| Publish đề thi | `exam_published` | Tất cả HS trong `exam.classIds[]` |
| Quét OMR xong | `score_available` | HS của submission |
| Học sinh nộp appeal | `appeal_submitted` | GV của exam |
| GV duyệt appeal | `appeal_resolved` | HS nộp appeal |
| Trước ngày thi 1 ngày | `exam_reminder` | Tất cả HS trong `exam.classIds[]` |
| AI report xong | `ai_report_ready` | HS |
| Publish exam report | `ai_report_ready` | GV |

**Action items:**

```
Task BE-01.1: Tạo server/src/services/notification.service.js
  ├── createForUser(userId, data)      — tạo 1 notification
  ├── createBulk(userIds[], data)      — tạo nhiều notification 1 lần
  ├── markAsRead(notificationId, userId)
  ├── markAllAsRead(userId)
  ├── getUnreadCount(userId)
  └── scheduleReminder(examId, userIds[], examDate) — gọi internal setTimeout

Task BE-01.2: Gắn trigger vào exam.service.js
  ├── publish() → gọi notificationService.createBulk(allStudents, {type: 'exam_published', ...})
  └── publish() → gọi scheduleReminder() cho examDate - 1 day

Task BE-01.3: Gắn trigger vào submission.service.js
  ├── createFromOMR() → notificationService.createForUser(studentId, {type: 'score_available', ...})
  └── updateStudentProgress()

Task BE-01.4: Gắn trigger vào appeal.service.js
  ├── create() → notificationService.createForUser(teacherId, {type: 'appeal_submitted', ...})
  └── review() → notificationService.createForUser(studentId, {type: 'appeal_resolved', ...})

Task BE-01.5: Gắn trigger vào aiReport.service.js
  └── generateStudentReport() → notificationService.createForUser(studentId, {type: 'ai_report_ready', ...})
```

---

### BE-02: `submission.service.js` — OMR Scan pipeline chưa hoàn chỉnh

**Trạng thái:** 🔴 CRITICAL — `scan()` trả về `status: 'pending'` + message "OMR scanning service not yet implemented" (line 48-59). Method `createFromOMR()` tồn tại nhưng KHÔNG được gọi từ đâu.

**Action items:**

```
Task BE-02.1: Hoàn thiện scan() flow
  ├── Khi pythonBridge trả kết quả thành công → tự động gọi createFromOMR()
  ├── Parse pythonResult.answers[] → build Submission.answers[]
  ├── Match versionId từ pythonResult.versionCode → ExamVersion.findOne({examId, versionCode})
  ├── Grade: với mỗi answer → so sánh với answerKey → isCorrect, score
  ├── Save Submission với status = 'scanned'
  └── Gọi notificationService.notifyScoreAvailable(studentId, submissionId)

Task BE-02.2: Fix createFromOMR()
  ├── Lấy maxScore từ Exam.totalScore (hiện hardcoded = 10)
  ├── Gán điểm mỗi câu: answer.score = (isCorrect ? exam.totalScore / n : 0)
  └── Gọi updateStudentProgress(studentId, scanResult)

Task BE-02.3: Xử lý async callback từ Python
  ├── Hiện tại: scan() trả 202 ACCEPTED nhưng không có background job
  ├── Option A: Dùng Bull queue (Redis) → job xử lý sau khi Python trả kết quả
  └── Option B: Sync (đợi Python xong ngay) → phù hợp với hiện tại vì Python bridge đã sync

Task BE-02.4: Fix manualOverride userId
  └── Line 155: thay 'current-user' string bằng req.user.id thật
```

---

### BE-03: `exam.service.js` — publish() và complete() thiếu side effects

**Trạng thái:** 🟠 HIGH

**Action items:**

```
Task BE-03.1: publish() → validate đã có câu hỏi chưa
  └── Nếu questionIds rỗng → throw 400 "Đề thi chưa có câu hỏi"

Task BE-03.2: publish() → gọi notificationService
  └── Đã note ở BE-01

Task BE-03.3: complete() → trigger exam report generation
  ├── Option A: Auto-tạo ExamReport ngay trong complete()
  └── Option B: Gửi job vào queue để generate async

Task BE-03.4: complete() → aggregate final statistics
  └── Cập nhật Exam.totalSubmissions từ Submission count
```

---

### BE-04: `report.service.js` — Exam Report arrays không được populate

**Trạng thái:** 🟠 HIGH — `ExamReport` model có đầy đủ schema nhưng service không populate các field quan trọng.

**Action items:**

```
Task BE-04.1: generateExamReport() → populate questionAnalysis
  ├── Với mỗi question trong Exam.questionIds:
  │   → Tính correctRate = (correct submissions / total submissions) * 100
  │   → Điền vào questionAnalysis[]
  └── Xác định hardestQuestions (correctRate thấp nhất) và easiestQuestions

Task BE-04.2: generateExamReport() → populate classSummary
  └── Với mỗi classId trong exam.classIds[]:
        → Tính avgScore, submissionCount, passRate của lớp đó

Task BE-04.3: Fix type mismatch
  └── Line 61: thay schoolService.getById(exam.classIds?.[0])
      bằng cách lấy schoolId từ Exam.createdBy.schoolId
```

---

### BE-05: Submission unique index dùng `studentCode` thay vì `studentId`

**Trạng thái:** 🔴 CRITICAL — Index `{ examId: 1, studentCode: 1 }` (unique) trong `submission.model.js`. Hai học sinh cùng `studentCode` sẽ overwrite nhau.

**Action items:**

```
Task BE-05.1: Thêm compound unique index mới
  └── Index: { examId: 1, studentId: 1 } (unique) — thay thế cho studentCode

Task BE-05.2: Migration cho existing data
  ├── Lấy tất cả submissions trùng (examId, studentCode)
  ├── Với mỗi nhóm: giữ bản mới nhất, xóa bản cũ
  └── Chạy script migration một lần

Task BE-05.3: Update code đọc studentCode → dùng studentId
  └── submission.service.js: các query tìm theo studentId
```

---

### BE-06: Analytics Controller — thiếu schoolId filtering

**Trạng thái:** 🟠 HIGH

**Action items:**

```
Task BE-06.1: dashboard-stats → filter theo schoolId
  ├── Lấy schoolId từ req.user
  ├── Thêm $match: { schoolId } vào aggregation pipelines
  └── currentExams, pendingAppeals, avgScore → chỉ tính trong phạm vi school

Task BE-06.2: analytics endpoint → filter theo schoolId
  └── Tương tự cho subjectPerformance, studentRankings, recentSubmissions
```

---

### BE-07: `submission.service.js` — `getStatistics()` dùng `status: 'graded'|'completed'` nhưng submission status có thể là `'scanned'|'completed'`

**Trạng thái:** 🟡 MEDIUM

**Action items:**

```
Task BE-07.1: Kiểm tra và fix status filter trong getStatistics()
  └── Đổi $match: { status: { $in: ['graded', 'completed'] } }
      thành { status: { $in: ['scanned', 'completed', 'graded', 'manual_review'] } }
```

---

### BE-08: `class.service.js` — `attendanceRate` hardcoded 95

**Trạng thái:** 🟡 MEDIUM

**Action items:**

```
Task BE-08.1: Tính attendanceRate thực tế
  └── Lấy từ Submission vs Exam.totalStudents trong khoảng examDate range
```

---

## PHẦN 2: WEB — React

---

### WEB-01: `ScanPage.tsx` — OMR Service gọi sai endpoint

**Trạng thái:** 🔴 CRITICAL

**Phân tích:**

`omr.service.ts` gọi:
- `POST /omr/upload` (line 93)
- `POST /omr/match-exam` (line 103)
- `POST /omr/submit` (line 116)
- `GET /omr/templates` (line 129)
- `GET /omr/status/:id` (line 138)

**Nhưng backend:**
- Backend route `/omr/` KHÔNG tồn tại
- Backend chỉ có `/submissions/scan` (POST)
- Backend OMR template route là `/omr-templates/`

**Action items:**

```
Task WEB-01.1: Sửa omr.service.ts
  ├── uploadAndProcess() → gọi POST /submissions/scan
  │   (truyền image base64 + examId + templateId)
  ├── matchSheetToExam() → bỏ hoặc gọi API phù hợp nếu có
  ├── submitSheet() → gọi PATCH /submissions/:id hoặc tạo mới
  │   (với answers đã chỉnh sửa)
  ├── getTemplates() → gọi GET /omr-templates/
  └── getProcessingStatus() → polling GET /submissions/:id

Task WEB-01.2: Cập nhật ScanPage.tsx logic
  ├── Flow hiện tại: upload → process → match → submit
  ├── Flow mới: chọn exam trước → upload & scan → chỉnh sửa →
  │   submit với examId + studentCode + answers
  └── Review lại ScannedSheet model cho phù hợp backend response
```

---

### WEB-02: `ExamDetailPage` — Chưa xem chi tiết hoặc thiếu

**Trạng thái:** 🟠 HIGH — Spec yêu cầu trang chi tiết exam cho phép xem phiên bản, thống kê, xuất PDF.

**Action items:**

```
Task WEB-02.1: Kiểm tra xem ExamDetailPage đã tồn tại chưa
  └── Nếu chưa → tạo mới

Task WEB-02.2: ExamDetailPage — các tab/chức năng:
  ├── Tab 1: Thông tin đề thi (readonly)
  ├── Tab 2: Phiên bản đề (versions list) — gọi GET /exams/:id/versions
  │   └── Button xuất PDF mỗi version
  ├── Tab 3: Bài thi đã nộp (submissions list) — gọi GET /exams/:id/submissions
  │   └── Xem chi tiết từng submission
  ├── Tab 4: Thống kê — gọi GET /submissions/exam/:id/statistics
  ├── Button: Publish (nếu draft)
  ├── Button: Generate versions (nếu chưa có versions)
  ├── Button: Complete exam (nếu published)
  └── Button: Export results (PDF/Excel)
```

---

### WEB-03: Question Bank Page — thiếu AI Generate

**Trạng thái:** 🟠 HIGH — Spec UC-01-C yêu cầu `POST /questions/generate` (AI tạo câu hỏi).

**Action items:**

```
Task WEB-03.1: Thêm button "Tạo bằng AI" vào QuestionBankPage
  └── Mở modal: nhập topic, số lượng, độ khó → gọi POST /questions/generate

Task WEB-03.2: Xử lý response từ AI
  └── Sau khi generate → hiển thị preview → teacher approve từng câu
      hoặc approve all → lưu vào question bank

Task WEB-03.3: Cập nhật questionStore
  └── Thêm method generateQuestions(payload): Promise<Question[]>
```

---

### WEB-04: `ExamDetailPage` / `CreateExamPage` — thiếu tạo versions sau khi tạo exam

**Trạng thái:** 🟠 HIGH — Spec UC-01-C yêu cầu sau khi tạo exam, GV phải gọi `POST /exams/:id/versions` để tạo mã đề.

**Action items:**

```
Task WEB-04.1: CreateExamPage → sau khi tạo exam thành công
  ├── Nếu numberOfVersions > 0 → tự động gọi POST /exams/:id/versions
  └── Hiển thị thông báo "Đã tạo X phiên bản đề"

Task WEB-04.2: examStore → đảm bảo generateExamVersions:
  ├── Gọi POST /exams/:id/versions với { count }
  ├── Sau khi xong → gọi fetchExamVersions để lấy danh sách
  └── Cập nhật state examVersions

Task WEB-04.3: ExamDetailPage → hiển thị versions
  ├── Nút "Tạo thêm phiên bản" → POST /exams/:id/versions
  ├── Nút xuất PDF từng version → GET /exams/:id/versions/:code/pdf
  └── Nút xuất tất cả versions → POST /omr-templates/:id/pdf/versions
```

---

### WEB-05: `CreateExamPage` — thiếu OMR Sheet PDF generation

**Trạng thái:** 🟠 HIGH — Spec UC-01-C Bước 1.5 yêu cầu sau khi tạo versions → xuất OMR sheet PDF.

**Action items:**

```
Task WEB-05.1: Sau khi tạo versions thành công trong CreateExamPage
  ├── Hiển thị danh sách versions đã tạo
  └── Button "Xuất phiếu trả lời" cho từng version
      → GET /exams/:id/versions/:code/pdf → download

Task WEB-05.2: ExamDetailPage → section "Phiếu trả lời"
  └── Hiển thị danh sách phiên bản + nút xuất PDF + nút xuất zip tất cả
```

---

### WEB-06: `AppealsPage` — modal chưa hiển thị đầy đủ thông tin

**Trạng thái:** 🟡 MEDIUM

**Phân tích code hiện tại:**
- Modal hiển thị: studentName, examTitle, questionContent, reason, resolutionNote
- **Thiếu:** `currentAnswer` (đáp án đã chọn), `expectedAnswer` (đáp án đúng từ answerKey)
- Backend trả `submission.answers` đã populate với question nhưng FE không hiển thị

**Action items:**

```
Task WEB-06.1: Lấy chi tiết submission khi mở appeal modal
  └── GET /submissions/:id → lấy answers[questionPosition] → hiển thị
      đáp án đã chọn + đáp án đúng

Task WEB-06.2: Cải thiện modal
  ├── Hiển thị ảnh OMR annotated (submission.images.annotated)
  ├── Hiển thị đáp án gốc (submission.answers[position].selectedAnswer)
  ├── Hiển thị đáp án đúng (submission.answers[position].correctAnswer)
  └── Input điều chỉnh điểm (scoreAdjustment)
```

---

### WEB-07: Xuất Excel format

**Trạng thái:** 🟡 MEDIUM

**Action items:**

```
Task WEB-07.1: examStore.exportResults() → hỗ trợ format=excel
  └── Gọi GET /exams/:id/results/export?format=excel
      → Backend trả Blob → save as .xlsx

Task WEB-07.2: ReportExportModal → thêm tùy chọn Excel
  └── Option: PDF / Excel radio buttons
```

---

### WEB-08: `EditExamPage` — cần kiểm tra và hoàn thiện

**Trạng thái:** 🟡 MEDIUM

**Action items:**

```
Task WEB-08.1: Kiểm tra EditExamPage đã đầy đủ chưa
  ├── Load exam by ID (examStore.fetchExamById)
  ├── Populate form với dữ liệu hiện tại
  ├── Cho phép sửa: title, description, classIds, questionIds
  ├── KHÔNG cho sửa: status, examDate (sau khi publish)
  └── PATCH /exams/:id
```

---

### WEB-09: `SubmissionsPage` — xem chi tiết submission

**Trạng thái:** 🟡 MEDIUM

**Action items:**

```
Task WEB-09.1: SubmissionDetailPage
  ├── Hiển thị tất cả answers với: position, selectedAnswer, correctAnswer, isCorrect, score
  ├── Highlight màu: xanh = đúng, đỏ = sai
  ├── Nút "Override" (manual scoring) → PATCH /submissions/:id/override
  └── Nút "Đính kèm ảnh" → POST /submissions/:id/attach-image
```

---

### WEB-10: Notification Panel — chưa implement

**Trạng thái:** 🟠 HIGH — Model notification có đầy đủ nhưng web chưa có notification UI.

**Action items:**

```
Task WEB-10.1: NotificationDropdown trong Header (Layout.tsx)
  ├── Bell icon với badge unread count
  ├── Click → dropdown với danh sách notifications
  ├── GET /notifications/ → list
  ├── GET /notifications/unread-count → badge
  ├── POST /notifications/:id/read → mark read
  ├── POST /notifications/read-all → mark all read
  └── Toast khi có notification mới (polling hoặc WebSocket)
```

---

### WEB-11: DashboardPage — stats chưa đầy đủ

**Trạng thái:** 🟡 MEDIUM

**Action items:**

```
Task WEB-11.1: DashboardPage → gọi GET /analytics/dashboard-stats
  └── Hiển thị: totalExams, totalStudents, pendingAppeals, avgScore, passRate

Task WEB-11.2: DashboardPage → recent activity
  └── GET /analytics/analytics?period=week → recent submissions, upcoming exams
```

---

### WEB-12: Student Scores Page (student role)

**Trạng thái:** 🟡 MEDIUM — Spec UC-01-F yêu cầu student xem điểm.

**Action items:**

```
Task WEB-12.1: MyScoresPage cho student
  ├── GET /submissions/me → danh sách bài thi đã nộp
  ├── Hiển thị: examTitle, date, score, maxScore, percentage
  └── Click → SubmissionDetailPage (xem chi tiết answers)

Task WEB-12.2: MyAppealsPage cho student
  ├── GET /appeals/me → danh sách appeals đã nộp
  ├── Trạng thái: pending / under_review / approved / rejected
  └── Nút "Tạo appeal" → form: chọn submission, câu hỏi, reason
```

---

## PHẦN 3: THỨ TỰ ƯU TIÊN THỰC HIỆN

---

### Phase 1 — Core Flow Killers (thực hiện trước)

```
1. BE-01  🔴 Tạo notification.service.js + trigger tất cả notifications
2. BE-02  🔴 Fix OMR scan pipeline (scan + createFromOMR)
3. BE-05  🔴 Fix submission unique index (studentCode → studentId)
4. WEB-01 🔴 Fix omr.service.ts gọi sai endpoint
```

### Phase 2 — Complete Exam Workflow

```
5. BE-03  🟠 publish() + complete() side effects
6. WEB-02 🟠 ExamDetailPage (versions, submissions, stats)
7. WEB-04 🟠 Tạo versions sau khi tạo exam
8. WEB-05 🟠 Xuất OMR Sheet PDF
```

### Phase 3 — Full Feature Completeness

```
9.  BE-04  🟠 Exam Report arrays population
10. BE-06  🟠 Analytics schoolId filtering
11. WEB-03 🟠 AI question generation UI
12. WEB-10 🟠 Notification panel UI
```

### Phase 4 — Polish & Edge Cases

```
13. BE-07  🟡 Fix submission status filter in getStatistics
14. BE-08  🟡 Real attendanceRate
15. WEB-06  🟡 Appeal modal: hiển thị đáp án đúng/sai
16. WEB-07  🟡 Excel export
17. WEB-08  🟡 EditExamPage
18. WEB-09  🟡 SubmissionDetailPage
19. WEB-11  🟡 DashboardPage full stats
20. WEB-12  🟡 Student MyScores + MyAppeals pages
```

---

## PHỤ LỤC: Mapping giữa Web Pages và Backend APIs

```
┌─────────────────────────────────┬──────────────────────────────────────────────┐
│ Web Page                        │ Backend API                               │
├─────────────────────────────────┼──────────────────────────────────────────────┤
│ ExamsPage                       │ GET /exams/                               │
│ CreateExamPage                  │ POST /exams/                              │
│                                 │ POST /exams/:id/versions                 │
│                                 │ GET /omr-templates/                      │
│                                 │ GET /questions/                           │
│ ExamDetailPage                  │ GET /exams/:id                            │
│                                 │ GET /exams/:id/versions                  │
│                                 │ GET /exams/:id/versions/:code/pdf        │
│                                 │ POST /exams/:id/publish                  │
│                                 │ POST /exams/:id/complete                  │
│                                 │ GET /exams/:id/submissions               │
│                                 │ GET /submissions/exam/:id/statistics     │
│                                 │ GET /exams/:id/results/export?format=pdf  │
│ EditExamPage                    │ GET /exams/:id                            │
│                                 │ PATCH /exams/:id                         │
│ ScanPage                       │ POST /submissions/scan  ← SAI → phải fix │
│                                 │ GET /omr-templates/exam/:id             │
│ SubmissionsPage                 │ GET /submissions/exam/:id                 │
│ SubmissionDetailPage            │ GET /submissions/:id                      │
│                                 │ PATCH /submissions/:id/override          │
│                                 │ POST /submissions/:id/attach-image        │
│ AppealsPage                    │ GET /appeals/                             │
│                                 │ GET /appeals/:id                         │
│                                 │ POST /appeals/:id/review                  │
│ QuestionBankPage               │ GET /questions/                           │
│                                 │ POST /questions/generate  ← CHƯA CÓ UI  │
│                                 │ POST /questions/:id/approve               │
│ ClassesPage                    │ GET /classes/                             │
│                                 │ POST /classes/                           │
│                                 │ PATCH /classes/:id                       │
│ ClassDetailPage                │ GET /classes/:id                         │
│                                 │ POST /classes/:id/students/import         │
│                                 │ PATCH /classes/:id/subject-teachers      │
│                                 │ GET /classes/:id/statistics               │
│ Notifications                  │ GET /notifications/  ← CHƯA CÓ UI         │
│                                 │ GET /notifications/unread-count            │
│                                 │ POST /notifications/:id/read               │
│ DashboardPage                  │ GET /analytics/dashboard-stats            │
│                                 │ GET /analytics/analytics                 │
│ Student: My Scores            │ GET /submissions/me  ← CHƯA CÓ PAGE     │
│ Student: My Appeals           │ GET /appeals/me  ← CHƯA CÓ PAGE         │
└─────────────────────────────────┴──────────────────────────────────────────────┘
```

---

## BẢNG TÓM TẮT TRẠNG THÁI

```
Tổng số tasks: 21
  🔴 CRITICAL : 4 tasks (BE-01, BE-02, BE-05, WEB-01)
  🟠 HIGH     : 7 tasks (BE-03, BE-04, BE-06, WEB-02, WEB-04, WEB-05, WEB-10)
  🟡 MEDIUM   : 10 tasks (BE-07, BE-08, WEB-03, WEB-06, WEB-07, WEB-08, WEB-09, WEB-11, WEB-12)
```

---

*Tài liệu này dựa trên phân tích code thực tế tại thời điểm 2026-06-23. Cần cập nhật sau khi implementation.*
