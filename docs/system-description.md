# SMART GRADING — System Description Document

> **Phiên bản:** 1.0 | **Ngày:** 2026-06-22
> **Mô tả:** Tài liệu mô tả kiến trúc, thành phần, và workflow chi tiết của hệ thống SMART GRADING — hệ thống chấm thi trắc nghiệm tự động sử dụng OMR (Optical Mark Recognition).

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Kiến trúc tổng thể](#2-kiến-trúc-tổng-thể)
3. [Thành phần Backend — Node.js/Express](#3-thành-phần-backend--nodejsexpress)
4. [Thành phần Mobile — Flutter](#4-thành-phần-mobile--flutter)
5. [Thành phần Web — React](#5-thành-phần-web--react)
6. [Thành phần OMR Core — Python/OMRChecker](#6-thành-phần-omr-core--pythonomrchecker)
7. [Cơ sở dữ liệu — MongoDB](#7-cơ-sở-dữ-liệu--mongodb)
8. [Các Use Case chính và Workflow chi tiết](#8-các-use-case-chính-và-workflow-chi-tiết)
9. [Bảo mật và Phân quyền](#9-bảo-mật-và-phân-quyền)
10. [Tích hợp bên thứ ba](#10-tích-hợp-bên-thứ-ba)
11. [Mô hình dữ liệu tổng hợp](#11-mô-hình-dữ-liệu-tổng-hợp)
12. [Luồng dữ liệu End-to-End](#12-luồng-dữ-liệu-end-to-end)

---

## 1. Tổng quan hệ thống

### 1.1 Mục tiêu

SMART GRADING là hệ thống quản lý thi trắc nghiệm tự động, cho phép:

- **Giáo viên** tạo đề thi, quản lý lớp học, quét phiếu trả lời OMR bằng camera/máy scan
- **Học sinh** xem điểm, nộp khiếu nại (appeal) điểm thi, trò chuyện với AI tutor
- **Admin** quản lý trường học, người dùng, xuất báo cáo

### 1.2 Người dùng và vai trò

| Vai trò | Mô tả |
|---------|--------|
| `admin` | Quản trị hệ thống toàn cục — quản lý trường, người dùng, xem báo cáo |
| `school-admin` | Quản trị cấp trường — quản lý người dùng, lớp trong trường mình |
| `teacher` | Giáo viên — tạo đề thi, quét OMR, chấm điểm, xem/xuất báo cáo |
| `student` | Học sinh — xem điểm, nộp appeal, trò chuyện AI tutor |
| `parent` | Phụ huynh — xem điểm con (future) |

### 1.3 Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Mobile App | Flutter (Dart), BLoC pattern |
| Web App | React 19 (TypeScript), Zustand, TanStack Query |
| Backend | Node.js, Express, MongoDB, Mongoose |
| OMR Engine | Python 3, OpenCV, NumPy |
| AI | Google Gemini (primary), OpenAI, Claude (fallback) |
| Image Storage | Cloudinary |
| Auth | JWT (Passport.js) |
| PDF Generation | PDFKit, jsPDF |
| Excel Export | ExcelJS, xlsx |
| Container | Docker, PM2 |

---

## 2. Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│  ┌──────────────────────┐        ┌──────────────────────┐         │
│  │   SMART GRADING       │        │   SMART GRADING       │         │
│  │   MOBILE APP          │        │   WEB APP             │         │
│  │   (Flutter + BLoC)    │        │   (React + Zustand)   │         │
│  └──────────┬───────────┘        └──────────┬───────────┘         │
│             │                                  │                     │
│             │  HTTP/REST (JWT Bearer)          │                     │
└─────────────┼──────────────────────────────────┼─────────────────────┘
              │                                  │
              └──────────┬───────────────────────┘
                         │
              ┌──────────▼───────────────────────┐
              │      API GATEWAY LAYER           │
              │      (Node.js / Express)         │
              │  ┌──────────────────────────┐   │
              │  │  Middleware Stack:       │   │
              │  │  Rate Limiter → Helmet → │   │
              │  │  CORS → Passport(JWT) →  │   │
              │  │  Auth(RBAC) → Validate    │   │
              │  └──────────────────────────┘   │
              │  ┌──────────────────────────┐   │
              │  │  Controllers → Services │   │
              │  └──────────────────────────┘   │
              └──────────┬───────────────────────┘
                         │
     ┌───────────────────┼───────────────────────────┐
     │                   │                           │
┌────▼────┐    ┌────────▼───────┐    ┌────────────▼─────┐
│ MongoDB  │    │  Cloudinary     │    │  External APIs   │
│(Primary  │    │  (Image Upload) │    │  Gemini / OpenAI  │
│ Storage) │    │                 │    │  / Claude         │
└──────────┘    └─────────────────┘    └───────────────────┘
                                             │
                                    ┌────────▼─────────┐
                                    │  Python Bridge   │
                                    │  (omr_process.py)│
                                    └────────┬─────────┘
                                             │
                                    ┌────────▼─────────┐
                                    │  OMRChecker      │
                                    │  (Python/OpenCV) │
                                    └──────────────────┘
```

---

## 3. Thành phần Backend — Node.js/Express

### 3.1 Cấu trúc thư mục

```
server/src/
├── index.js                    # Entry: kết nối MongoDB, khởi động server
├── app.js                      # Express app: middleware stack, routes, error handling
├── config/
│   ├── config.js              # Env vars (JWT, SMTP, Cloudinary, AI config)
│   ├── logger.js              # Winston logger
│   ├── morgan.js              # HTTP request logging
│   ├── passport.js            # JWT strategy
│   ├── roles.js               # RBAC role definitions
│   └── tokens.js              # Token type constants
├── controllers/                # 16 controllers, mỗi file xử lý 1 domain
├── models/                     # 17 Mongoose models
│   ├── plugins/
│   │   ├── toJSON.plugin.js  # Biến _id→id, strip __v, createdAt, updatedAt
│   │   └── paginate.plugin.js # Phân trang
├── routes/v1/                  # 14 route files dưới prefix /api/v1
├── services/                  # 20 services (business logic)
├── middlewares/
│   ├── auth.js                # Passport JWT + role rights check
│   ├── error.js               # Error converter + global handler
│   ├── rateLimiter.js         # 20 req/15min trên auth endpoints
│   └── validate.js            # Joi schema validation
├── utils/
│   ├── ApiError.js           # Custom error class
│   ├── pdfGenerator.js       # Exam paper PDF builder
│   └── parsePagination.js    # Parse page/limit từ query
└── validations/               # Joi schemas cho từng domain
```

### 3.2 Middleware Stack

Mỗi request HTTP đi qua chuỗi middleware theo thứ tự:

```
Request
  │
  ▼
Rate Limiter (auth endpoints only)
  │ 20 failed requests / 15 phút → 429 Too Many Requests
  ▼
Helmet (security headers)
  │ XSS, MIME sniffing, clickjacking protection
  ▼
CORS
  │ Allow credentials, exposed headers
  ▼
express.json / express.urlencoded
  │ Body parsing
  ▼
Passport.authenticate('jwt')
  │ Verify JWT Bearer token → req.user
  ▼
auth(requiredRights)
  │ Kiểm tra role + quyền (RBAC)
  ▼
validate(joiSchema)
  │ Joi validation on request body/params/query
  ▼
Controller
  │ catchAsync wrapper — tất cả handlers async tự động .catch(next)
  ▼
Service
  │ Business logic, gọi Mongoose models
  ▼
Model (Mongoose)
  │ MongoDB operations
  ▼
Response
```

### 3.3 Tất cả API Endpoints

#### Authentication — `/api/v1/auth`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| POST | `/register` | - | Đăng ký tài khoản mới |
| POST | `/login` | - | Đăng nhập, trả về JWT |
| POST | `/logout` | - | Đăng xuất (blacklist token) |
| POST | `/refresh-tokens` | - | Làm mới access token |
| POST | `/forgot-password` | - | Gửi email đặt lại mật khẩu |
| POST | `/reset-password` | - | Đặt lại mật khẩu bằng token |
| POST | `/send-verification-email` | JWT | Gửi email xác thực |
| GET | `/verify-email` | - | Xác thực email bằng token |
| POST | `/resend-verification-email` | - | Gửi lại email xác thực |
| GET | `/check-verification` | - | Kiểm tra trạng thái xác thực |
| GET | `/me` | JWT | Lấy thông tin user hiện tại |

#### Users — `/api/v1/users`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| POST | `/` | admin | Tạo user |
| GET | `/` | admin | Liệt kê users (phân trang) |
| GET | `/:userId` | admin | Chi tiết user |
| PATCH | `/:userId` | admin | Cập nhật user |
| DELETE | `/:userId` | admin | Xóa user (soft delete) |
| POST | `/:userId/change-password` | JWT | Đổi mật khẩu |

#### Schools — `/api/v1/schools`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| POST | `/` | admin | Tạo trường học |
| GET | `/` | - | Liệt kê trường (public) |
| GET | `/:id` | JWT | Chi tiết trường |
| PATCH | `/:id` | admin | Cập nhật trường |
| DELETE | `/:id` | admin | Xóa trường |
| POST | `/:id/grade-distribution` | JWT | Tính phân bố điểm |
| GET | `/:schoolId/available-teachers` | teacher/admin | Danh sách giáo viên |

#### Classes — `/api/v1/classes`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| POST | `/` | admin/teacher | Tạo lớp |
| GET | `/` | JWT | Liệt kê lớp |
| GET | `/school/:schoolId` | JWT | Lớp theo trường |
| GET | `/:id` | JWT | Chi tiết lớp |
| PATCH | `/:id` | admin/teacher | Cập nhật lớp |
| DELETE | `/:id` | admin | Xóa lớp (soft delete) |
| POST | `/:id/students` | admin | Thêm học sinh |
| DELETE | `/:id/students` | admin | Xóa học sinh khỏi lớp |
| POST | `/:id/students/import` | admin | Import hàng loạt từ CSV |
| PATCH | `/:id/subject-teachers` | admin | Phân công giáo viên bộ môn |
| PATCH | `/:id/transfer-ownership` | JWT | Chuyển chủ nhiệm |
| GET | `/:id/exams` | JWT | Lấy đề thi của lớp |
| POST | `/:id/exams` | admin | Gán đề thi cho lớp |
| DELETE | `/:id/exams/:examId` | admin | Gỡ đề thi khỏi lớp |
| GET | `/:id/statistics` | JWT | Thống kê lớp |
| GET | `/:id/available-students` | admin | Học sinh chưa thuộc lớp nào |

#### Subjects — `/api/v1/subjects`

CRUD tiêu chuẩn: POST, GET, PATCH, DELETE. Mỗi subject gắn với 1 school.

#### OMR Templates — `/api/v1/omr-templates`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| POST | `/` | admin | Tạo OMR template |
| GET | `/` | JWT | Liệt kê templates |
| GET | `/default` | JWT | Lấy template mặc định |
| GET | `/:id` | JWT | Chi tiết template |
| GET | `/:id/full` | JWT | Full template với zones |
| GET | `/:id/json` | JWT | JSON cho Flutter (px @ 300 DPI) |
| PATCH | `/:id` | admin | Cập nhật template |
| DELETE | `/:id` | admin | Xóa template |
| POST | `/:id/duplicate` | admin | Nhân bản template |
| GET | `/:id/pdf` | JWT | Generate OMR sheet PDF |
| POST | `/:id/pdf/versions` | admin | Generate version PDFs (zip) |
| GET | `/exam/:examId` | JWT | Lấy template cho 1 exam |

Template định nghĩa cấu trúc tờ phiếu trả lời: kích thước trang, vị trí bubble, loại field (MCQ4/MCQ5/INT).

#### Questions — `/api/v1/questions`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| GET | `/tags` | JWT | Lấy danh sách tags |
| POST | `/` | teacher/admin | Tạo câu hỏi |
| GET | `/` | JWT | Liệt kê câu hỏi (phân trang, filter) |
| POST | `/generate` | teacher/admin | **AI tạo câu hỏi tự động** |
| GET | `/stats` | JWT | Thống kê ngân hàng câu hỏi |
| GET | `/:id` | JWT | Chi tiết câu hỏi |
| PATCH | `/:id` | teacher/admin | Cập nhật câu hỏi |
| DELETE | `/:id` | teacher/admin | Xóa câu hỏi |
| POST | `/:id/approve` | teacher/admin | Phê duyệt câu hỏi |

#### Exams — `/api/v1/exams`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| POST | `/` | manageExams | Tạo đề thi |
| GET | `/` | JWT | Liệt kê đề thi (filter: classId, subjectId, status, search, pagination) |
| GET | `/upcoming` | JWT | Đề thi sắp tới |
| GET | `/:id` | JWT | Chi tiết đề thi |
| PATCH | `/:id` | manageExams | Cập nhật đề thi (questionIds, subjectId, classIds, metadata) |
| DELETE | `/:id` | manageExams | Xóa đề thi (archive) |
| POST | `/:id/publish` | manageExams | **Publish đề thi** → gửi notification |
| POST | `/:id/complete` | manageExams | **Hoàn thành đề thi** |
| POST | `/:id/classes` | manageExams | Gán lớp vào đề thi |
| DELETE | `/:id/classes` | manageExams | Gỡ lớp khỏi đề thi |
| GET | `/:id/versions` | JWT | Lấy các phiên bản đề thi |
| POST | `/:id/versions` | manageExams | **Tạo phiên bản đề** (xáo trộn câu hỏi + đáp án) |
| GET | `/:id/versions/full` | JWT | Phiên bản đề + questions đầy đủ |
| GET | `/:id/export` | JWT | Xuất đề thi ra PDF |
| GET | `/:id/versions/:versionCode/pdf` | JWT | Xuất phiên bản ra PDF (đề thi + OMR sheet) |
| GET | `/:id/versions/export` | JWT | Xuất tất cả phiên bản đề ra 1 file ZIP |
| GET | `/:id/results/export` | JWT | **Xuất kết quả** (PDF/Excel) |
| GET | `/:id/submissions` | JWT | Lấy danh sách bài thi |
| GET | `/:id/submissions/statistics` | JWT | Thống kê bài thi |

#### Submissions — `/api/v1/submissions`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| POST | `/scan` | admin/teacher | **Quét OMR** — gửi ảnh → Python bridge → chấm điểm |
| GET | `/me` | JWT | Lấy bài thi của tôi (student) |
| GET | `/` | JWT | Lấy tất cả bài thi (teacher) |
| GET | `/:id` | JWT | Chi tiết bài thi |
| DELETE | `/:id` | admin | Xóa bài thi |
| POST | `/:id/override` | admin | Chấm điểm thủ công (override OMR) |
| GET | `/exam/:examId` | JWT | Bài thi theo exam |
| GET | `/exam/:examId/statistics` | JWT | Thống kê exam |
| GET | `/student/:studentId` | JWT | Bài thi theo student |
| POST | `/:id/attach-image` | admin | Đính kèm ảnh (Cloudinary) |
| DELETE | `/:id/image/:type` | admin | Xóa ảnh |

#### Appeals — `/api/v1/appeals`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| GET | `/me` | JWT | Lấy appeals của tôi (student) |
| POST | `/` | student | **Tạo khiếu nại** điểm thi |
| GET | `/` | JWT | Tất cả appeals (teacher/admin) |
| GET | `/:id` | JWT | Chi tiết appeal |
| POST | `/:id/review` | teacher/admin | **Phản hồi khiếu nại** — duyệt/từ chối |
| GET | `/student/:studentId` | JWT | Appeals theo student |
| GET | `/exam/:examId` | JWT | Appeals theo exam |
| GET | `/exam/:examId/pending-count` | JWT | Số appeals đang chờ |

#### Reports — `/api/v1/reports`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| POST | `/exam/:examId/generate` | admin | **Tạo báo cáo exam** |
| GET | `/exam/:examId` | JWT | Lấy báo cáo exam |
| GET | `/exam/:examId/export` | JWT | **Xuất báo cáo** (PDF/Excel) |
| GET | `/student/:studentId/progress` | JWT | Tiến độ học tập |
| GET | `/student/:studentId/history` | JWT | Lịch sử điểm |
| GET | `/class/:classId/leaderboard` | JWT | Bảng xếp hạng lớp |

#### AI Chat — `/api/v1/ai-chat`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| POST | `/send` | JWT | **Gửi tin nhắn AI tutor** |
| GET | `/conversations` | JWT | Danh sách cuộc hội thoại |
| POST | `/conversations` | JWT | Tạo cuộc hội thoại mới |
| GET | `/history/:conversationId` | JWT | Lịch sử tin nhắn |
| GET | `/reports` | JWT | AI reports của user |

#### AI Reports — `/api/v1/ai-reports`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| POST | `/submission/:submissionId` | JWT | **Tạo AI report** cho 1 bài thi |
| POST | `/exam/:examId` | JWT | **Tạo AI report** cho cả lớp |
| GET | `/exam/:examId/difficulty` | JWT | Phân tích độ khó câu hỏi |
| GET | `/student/:studentId` | JWT | Reports theo student |

#### Notifications — `/api/v1/notifications`

CRUD: GET (list, unread-count), POST (read-all, read), DELETE. Auto-cleanup qua TTL index trên `expiresAt`.

#### Analytics — `/api/v1/analytics`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| GET | `/dashboard-stats` | JWT | Số liệu tổng quan dashboard |
| GET | `/analytics` | JWT | Analytics theo khoảng thời gian |

#### Upload — `/api/v1/upload`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| GET | `/signature` | admin/teacher | Lấy Cloudinary upload signature |

---

## 4. Thành phần Mobile — Flutter

### 4.1 Cấu trúc thư mục

```
client/mobile/lib/
├── main.dart                   # Entry point, dependency injection (get_it)
├── core/
│   ├── constants/
│   │   └── app_constants.dart  # API_BASE_URL, STORAGE_KEYS
│   ├── errors/
│   │   └── app_exceptions.dart # NetworkException, ApiException, AuthException
│   └── network/
│       ├── api_client.dart      # Dio wrapper với interceptors
│       ├── auth_service.dart
│       ├── user_service.dart
│       ├── school_service.dart
│       ├── class_service.dart
│       ├── exam_service.dart
│       ├── submission_service.dart
│       ├── appeal_service.dart
│       ├── ai_service.dart
│       ├── analytics_service.dart
│       ├── notification_service.dart
│       ├── question_service.dart
│       ├── subject_service.dart
│       ├── omr_template_service.dart
│       └── omr_submission_sync_service.dart
├── domain/
│   ├── entities/               # Data models (User, Exam, Submission, Appeal...)
│   └── omr/
│       ├── models/             # OMRTemplate, EvaluationConfig, OMRGradingResult
│       └── engine/
│           ├── omr_engine.dart     # OMR processing orchestrator
│           └── camera_engine.dart  # Corner detection
└── presentation/
    ├── blocs/                  # 8 BLoCs
    │   ├── auth/              # AuthBloc
    │   ├── admin/             # AdminBloc (schools/users CRUD)
    │   ├── exam/              # ExamBloc (paginated list, CRUD)
    │   ├── submission/        # SubmissionBloc
    │   ├── school/            # SchoolBloc
    │   ├── class/            # ClassBloc
    │   ├── omr_scanner/      # OMRScannerBloc (template→image→grade→submit)
    │   ├── camera/           # CameraBloc (init, corner detection, capture)
    │   └── ai_chat/          # AIChatBloc
    ├── pages/                # 30+ pages
    │   ├── splash_page.dart
    │   ├── login_page.dart
    │   ├── register_page.dart
    │   ├── home_page.dart    # Role-based bottom navigation shell
    │   ├── dashboard_view.dart
    │   ├── my_scores_page.dart
    │   ├── my_appeals_page.dart
    │   ├── ai_tutor_page.dart
    │   ├── camera_scanner_page.dart
    │   ├── submission_detail_page.dart
    │   └── admin/
    │       ├── admin_dashboard_page.dart
    │       ├── schools_management_page.dart
    │       └── users_management_page.dart
    └── widgets/               # Reusable widgets
        ├── ai_chat_bubble.dart
        ├── omr_bubble_overlay.dart
        └── corner_overlay_painter.dart
```

### 4.2 Navigation theo Role

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HomePage (Bottom Navigation)                  │
├──────────────┬──────────────────────────────────────────────────────┤
│   Role       │   Tabs                                                   │
├──────────────┼──────────────────────────────────────────────────────┤
│   Admin      │   Dashboard │ Users │ Schools │ Analytics │ Profile     │
│   Teacher    │   Dashboard │ Exams │ Scan   │ Classes   │ Profile     │
│   Student    │   Dashboard │ My Scores │ My Appeals │ Profile        │
└──────────────┴──────────────────────────────────────────────────────┘
```

### 4.3 State Management — BLoC Pattern

**ApiClient** (Dio wrapper):
- Auto-attaches `Authorization: Bearer <token>` vào mọi request
- Tự động refresh token khi nhận 401
- Map Dio errors → `AppException` subtypes

**BLoC Dependencies:**

```
AuthBloc
  ├── Triggered by: SplashPage, LoginPage, RegisterPage
  └── Manages: token storage, login/register, profile update

AdminBloc
  ├── Triggered by: SchoolsManagementPage, UsersManagementPage
  └── Manages: CRUD schools/users

ExamBloc
  ├── Triggered by: ExamsPage, CreateExamPage
  └── Manages: paginated exam list, create, update

SubmissionBloc
  ├── Triggered by: SubmissionsPage, SubmissionDetailPage
  └── Manages: load submissions, scan trigger

OMRScannerBloc ── Pipeline State Machine ──
  Initial → TemplateReady → ImageReady → Processing → Success → Submitting → Submitted
  (or Error at any step)

CameraBloc
  ├── Triggered by: CameraScannerPage
  └── Manages: camera init, real-time corner detection (500ms stability), capture

AIChatBloc
  ├── Triggered by: AITutorPage
  └── Manages: send messages, load history, load conversations
```

---

## 5. Thành phần Web — React

### 5.1 Cấu trúc thư mục

```
client/web/src/
├── main.tsx                    # Entry: QueryProvider, ErrorBoundary, AppRoutes
├── App.tsx                    # Root component
├── config/
│   └── env.ts                 # VITE_API_URL config
├── core/
│   ├── api/index.ts           # Axios wrapper với interceptors
│   ├── errors/index.ts        # Exception types
│   └── constants/index.ts
├── domain/entities/index.ts   # User, School, Subject, Class
├── features/
│   ├── ai-tutor/
│   │   ├── AITutorPage.tsx
│   │   └── AITutorChat.tsx
│   └── reports/
│       ├── ReportExportModal.tsx  # Export PDF/Excel modal
│       ├── useReportExport.ts
│       └── omrSheetPdf.ts     # OMR sheet PDF generation (client-side)
├── hooks/
│   ├── useAuthInit.ts         # Auth initialization
│   ├── useCloudinaryUpload.ts # Cloudinary upload hook
│   └── useQuestionPermissions.ts
├── pages/                     # All page components
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── ExamsPage.tsx
│   ├── ClassesPage.tsx
│   ├── AppealsPage.tsx
│   ├── QuestionBankPage.tsx
│   ├── admin/
│   │   ├── AdminDashboard.tsx
│   │   ├── SchoolsPage.tsx
│   │   └── UsersPage.tsx
│   └── ...
├── presentation/
│   ├── components/
│   │   ├── Layout.tsx         # Sidebar + Header layout
│   │   ├── AuthLayout.tsx
│   │   └── ErrorBoundary.tsx
│   ├── routes/
│   │   └── AppRoutes.tsx     # Protected/Public/Admin routes
│   └── store/                # Zustand stores
│       ├── authStore.ts
│       ├── examStore.ts
│       ├── submissionStore.ts
│       ├── questionStore.ts
│       ├── classStore.ts
│       ├── appealStore.ts
│       ├── adminStore.ts
│       ├── dashboardStore.ts
│       ├── studentStore.ts
│       └── omrTemplateStore.ts
└── services/
    ├── omr.service.ts
    ├── report.service.ts
    ├── analytics.service.ts
    └── ai-chat.service.ts
```

### 5.2 Route Guards

```
AppRoutes
  │
  ├── PublicOnlyRoute ──→ LoginPage, RegisterPage, ForgotPassword
  │   (redirects if already authenticated)
  │
  ├── ProtectedRoute ──→ All authenticated pages
  │   (checks authStore.isAuthenticated)
  │
  └── AdminRoute ──→ /admin/*
      (checks user.role ∈ {admin, school-admin})
```

---

## 6. Thành phần OMR Core — Python/OMRChecker

### 6.1 Tổng quan

OMRChecker là engine xử lý ảnh OMR — đọc phiếu trả lời trắc nghiệm, phát hiện bubble được tô, và tính điểm tự động.

### 6.2 Thuật toán phát hiện Bubble

**Bước 1 — Tiền xử lý ảnh (Preprocessors):**

| Processor | Mục đích |
|-----------|---------|
| `CropOnMarkers` | Align trang bằng marker góc (default) |
| `CropPage` | Phát hiện cạnh trang bằng Canny |
| `FeatureBasedAlignment` | ORB feature matching |
| `Levels` | Gamma/contrast adjustment |
| `MedianBlur` | Giảm nhiễu |
| `GaussianBlur` | Làm mịn |

**Bước 2 — Đọc cường độ Bubble:**

Với mỗi bubble, tính mean intensity (grayscale 0-255) trong vùng pixel của bubble:
- Bubble được tô đậm → cường độ thấp (gần 0)
- Bubble trắng → cường độ cao (gần 255)

**Bước 3 — Threshold (Ngưỡng):**

```
Global Threshold: Tìm khoảng trống lớn nhất trong danh sách
                  cường độ bubble đã sắp xếp.
                  Bubbles bên dưới ngưỡng → "marked" (tô)

Local Threshold:  Ngưỡng riêng cho mỗi câu hỏi (strip).
                  Tìm khoảng trống lớn nhất trong strip đó.
                  Cho phép xử lý tốt khi ảnh không đều.
```

**Bước 4 — Đọc đáp án:**

- So sánh cường độ mỗi bubble với local threshold
- Nếu `intensity < threshold` → bubble được tô
- MCQ: bubble tô nào → đáp án đó (A/B/C/D)
- INT: ghép các chữ số (0-9) → mã sinh viên
- Phát hiện multi-marked (nhiều bubble được tô trong 1 câu)

**Bước 5 — Scoring (nếu có evaluation.json):**

```python
AnswerMatcher.get_verdict_marking(marked_answer)
  ├── "standard": single correct → correct (+1) / incorrect (0) / unmarked (0)
  ├── "multiple-correct": 1+ đúng → đúng / sai / chưa tô
  └── "multiple-correct-weighted": điểm theo từng đáp án
```

### 6.3 Cấu hình Template (template.json)

```json
{
  "fieldBlocks": {
    "student_code": {
      "type": "QTYPE_INT",
      "origin": [x_mm, y_mm],
      "numDigits": 5
    },
    "version_code": {
      "type": "QTYPE_INT",
      "digits": 2
    },
    "q1_to_q10": {
      "type": "QTYPE_MCQ4",
      "questionsPerRow": 5
    }
  },
  "bubbleDimensions": { "width": 6, "height": 6 },
  "pageDimensions": { "width": 210, "height": 297 }
}
```

### 6.4 Node.js Bridge (`server/scripts/omr_process.py`)

Backend giao tiếp với Python qua stdin/stdout:

```
Input (stdin): JSON
  {
    "image": "base64_encoded_image",
    "template": { ... },
    "evaluation": { ... },
    "options": { ... }
  }

Output (stdout): JSON
  {
    "success": true,
    "answers": { "q1": "A", "q2": "B", "roll": "12345" },
    "score": 85.5,
    "warnings": ["Multiple bubbles in q3"],
    "annotated_image": "base64_encoded_annotated_image",
    "processing_time_ms": 245
  }
```

---

## 7. Cơ sở dữ liệu — MongoDB

### 7.1 Tất cả Collections

```
┌──────────────────┬──────────────────────────────────────────────────┐
│ Collection        │ Mô tả                                             │
├──────────────────┼──────────────────────────────────────────────────┤
│ users             │ Tài khoản: admin, teacher, student, parent         │
│ schools           │ Trường học: tên, code, logo, grading scale, ...   │
│ classes           │ Lớp học: gồm studentIds[], subjectTeachers[]      │
│ subjects          │ Môn học: gắn với schoolId                         │
│ questions         │ Ngân hàng câu hỏi: content, options, difficulty   │
│ exams             │ Đề thi: title, classIds[], questionIds[], status   │
│ examVersions      │ Phiên bản đề: versionCode, shuffled questions      │
│ submissions       │ Bài thi: answers[], score, status, images[]       │
│ appeals           │ Khiếu nại: submissionId, questionId, status         │
│ aiChat            │ Hội thoại AI: studentId, messages[], context        │
│ aiReport          │ AI report: studentId, mistakes[], suggestions      │
│ omrTemplates      │ OMR template: zones, scannerConfig, validation     │
│ notifications     │ Thông báo: userId, type, priority, TTL index       │
│ tokens            │ Refresh tokens: blacklisting support               │
│ studentProgress   │ Tiến độ học sinh: scoreHistory[], rankings[]       │
│ examReport        │ Báo cáo exam: statistics, gradeDistribution[]      │
│ uploadAuditLog    │ Log upload ảnh: Cloudinary audit trail             │
└──────────────────┴──────────────────────────────────────────────────┘
```

### 7.2 Mối quan hệ giữa Collections

```
School (1) ──→ (N) Class
School (1) ──→ (N) Subject
School (1) ──→ (N) User (school-admin, teacher, student)
School (1) ──→ (N) Question
School (1) ──→ (N) OMRTemplate

Class (1) ──→ (N) User (student)  ── via studentIds[]
Class (1) ──→ (N) SubjectTeacher
Class (1) ──→ (1) User (homeroomTeacher)

Exam (N) ──→ (N) Class  ── via classIds[]
Exam (1) ──→ (1) OMRTemplate
Exam (1) ──→ (N) ExamVersion
Exam (1) ──→ (N) Submission
Exam (1) ──→ (N) Appeal
Exam (1) ──→ (1) ExamReport

ExamVersion (1) ──→ (N) Submission

Submission (1) ──→ (1) Exam
Submission (1) ──→ (1) ExamVersion
Submission (1) ──→ (1) User (student)
Submission (1) ──→ (N) Appeal
Submission (1) ──→ (1) AIReport

Question (1) ──→ (1) User (createdBy)
Question (1) ──→ (1) Subject
Question (1) ──→ (N) Appeal (questionId)

User (1) ──→ (N) Notification
User (1) ──→ (1) StudentProgress
User (1) ──→ (N) Token
User (1) ──→ (N) AIChat
```

---

## 8. Các Use Case chính và Workflow chi tiết

### UC-01: Quy trình thi trắc nghiệm toàn phần

```
┌─────────────────────────────────────────────────────────────────────┐
│  UC-01: QUY TRÌNH THI TRẮC NGHIỆM TOÀN PHẦN                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [GIAO VIÊN]                                                        │
│                                                                      │
│  1. Tạo đề thi                                                      │
│     ┌──────────────┐                                                │
│     │ Tạo Exam      │                                                │
│     │  (title, desc,│                                                │
│     │   classIds,   │                                                │
│     │   totalScore) │                                                │
│     └──────┬───────┘                                                │
│            │ POST /api/v1/exams                                      │
│            ▼                                                        │
│     ┌──────────────┐                                                │
│     │ Exam tạo thành│                                               │
│     │  (status=draft)│                                               │
│     └──────┬───────┘                                                │
│            │                                                        │
│  2. Tạo phiên bản đề                                                 │
│     ┌──────────────┐                                                │
│     │ Tạo Versions  │                                                │
│     │  (xáo trộn Q +│                                               │
│     │   đáp án)     │                                                │
│     └──────┬───────┘                                                │
│            │ POST /api/v1/exams/:id/versions                        │
│            ▼                                                        │
│     ┌──────────────┐                                                │
│     │ ExamVersion   │                                               │
│     │  (versionCode, │                                               │
│     │   answerKey)   │                                               │
│     └──────┬───────┘                                                │
│            │                                                        │
│  3. In phiếu trả lời                                                │
│     ┌──────────────┐                                                │
│     │ Xuất OMR PDF  │                                                │
│     │  (mỗi phiên   │                                                │
│     │   bản 1 file) │                                                │
│     └──────┬───────┘                                                │
│            │ GET /api/v1/omr-templates/:id/pdf                      │
│            │ GET /api/v1/exams/:id/versions/:code/pdf               │
│            ▼                                                        │
│     ┌──────────────┐                                                │
│     │ OMR Sheet PDF │                                               │
│     │  (header,     │                                                │
│     │   mã SV,      │                                                │
│     │   mã đề,      │                                                │
│     │   câu hỏi)    │                                                │
│     └──────┬───────┘                                                │
│            │                                                        │
│  4. Publish đề thi                                                  │
│     ┌──────────────┐                                                │
│     │ Publish Exam │                                                │
│     │  → Notification│                                              │
│     │  → status=publi│                                              │
│     └──────┬───────┘                                                │
│            │ POST /api/v1/exams/:id/publish                         │
│            ▼                                                        │
│                                                                      │
│  [HỌC SINH]                                                         │
│                                                                      │
│  5. Làm bài thi (trên giấy)                                         │
│     ┌──────────────┐                                                │
│     │ Nhận OMR     │                                                │
│     │  Điền: Mã SV,│                                                │
│     │  Mã đề,      │                                                │
│     │  Đáp án A-D  │                                                │
│     └──────────────┘                                                │
│            │                                                        │
│  [GIAO VIÊN]                                                        │
│            │                                                        │
│  6. Quét OMR                                                        │
│     ┌──────────────┐                                                │
│     │ Quét OMR Sheet│                                                │
│     │  (camera/    │                                                │
│     │   upload ảnh)│                                                │
│     └──────┬───────┘                                                │
│            │ POST /api/v1/submissions/scan                          │
│            │ Base64 image + examId                                  │
│            ▼                                                        │
│     ┌──────────────────────────────────────────┐                    │
│     │ BACKEND PROCESSING PIPELINE               │                   │
│     │                                            │                   │
│     │  ① Upload ảnh lên Cloudinary               │                   │
│     │  ② Gọi Python Bridge                       │                   │
│     │     pythonBridgeService.processImage()    │                   │
│     │  ③ Python: crop markers → thresholding     │                   │
│     │     → detect bubbles → grade               │                   │
│     │  ④ Return: answers + score + annotated    │                   │
│     │  ⑤ Backend: lưu Submission (status=scanned)│                  │
│     │  ⑥ Trigger AI Report generation            │                   │
│     │  ⑦ Tạo notification cho student            │                   │
│     └──────────────────────┬─────────────────────┘                    │
│                            │                                         │
│  7. Xem kết quả                                                          │
│     ┌──────────────┐                                                │
│     │ Submission    │                                               │
│     │  (answers[], │                                                │
│     │   score,     │                                                │
│     │   status)    │                                                │
│     └──────────────┘                                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

### UC-01-B: Sơ đồ các Phase và luồng chính/phụ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    QUY TRÌNH THI TRẮC NGHIỆM — TỔNG QUAN                 │
│                    (Main Flow & Sub-Flows)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  PHASE 1: CHUẨN BỊ (PRE-EXAM) — Giáo viên thực hiện                 │ │
│  │  ┌──────────────────────────────────────────────────────────────┐     │ │
│  │  │  [1.1] Quản lý lớp học                                      │     │ │
│  │  │       Sub-flow: Thêm HS / Import CSV / Gán giáo viên bộ môn │     │ │
│  │  └──────────────────────────────────────────────────────────────┘     │ │
│  │  [1.2] Tạo đề thi (title, mô tả, chọn lớp, chọn template OMR)     │ │
│  │  [1.3] Thêm câu hỏi vào đề (chọn từ ngân hàng hoặc tạo mới)      │ │
│  │       Sub-flow: Tạo câu hỏi thủ công                              │ │
│  │       Sub-flow: AI tạo câu hỏi tự động                            │ │
│  │  [1.4] Tạo phiên bản đề (xáo trộn câu hỏi + đáp án)             │ │
│  │  [1.5] Xuất phiếu trả lời OMR (PDF)                             │ │
│  │  [1.6] Publish đề thi (thông báo cho học sinh)                   │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  PHASE 2: THI (EXAM) — Học sinh thực hiện ngoài hệ thống          │ │
│  │                                                                       │ │
│  │  [2.1] Nhận phiếu trả lời OMR từ giáo viên                         │ │
│  │  [2.2] Điền thông tin: Mã sinh viên, Mã đề                        │ │
│  │  [2.3] Làm bài trắc nghiệm: tô bong A / B / C / D                 │ │
│  │  [2.4] Nộp phiếu cho giáo viên                                      │ │
│  │                                                                       │ │
│  │  ⚠️  LUỒNG NÀY DIỄN RA HOÀN TOÀN NGOÀI HỆ THỐNG                    │ │
│  │      (trên giấy, không có tương tác với phần mềm)                  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  PHASE 3: QUÉT & CHẤM ĐIỂM (SCAN & GRADE)                          │ │
│  │  ┌──────────────────────────────────────────────────────────────┐     │ │
│  │  │  [3.1] Quét OMR (Mobile Camera)                             │     │ │
│  │  │       Sub-flow: Quét từ Web (upload ảnh)                   │     │ │
│  │  │       Sub-flow: Quét offline → đồng bộ khi online          │     │ │
│  │  └──────────────────────────────────────────────────────────────┘     │ │
│  │  [3.2] Xử lý ảnh OMR (crop, perspective transform, threshold)      │ │
│  │  [3.3] Đọc bubble → ghép đáp án → tính điểm                       │ │
│  │  [3.4] Lưu kết quả (Submission)                                  │ │
│  │  [3.5] Thông báo cho học sinh                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  PHASE 4: SAU THI (POST-EXAM)                                       │ │
│  │  [4.1] Học sinh xem điểm                                           │ │
│  │  [4.2] Học sinh nộp khiếu nại (Appeal)                             │ │
│  │  [4.3] Giáo viên xử lý khiếu nại                                   │ │
│  │  [4.4] Xuất kết quả thi (PDF/Excel)                                │ │
│  │  [4.5] Tạo báo cáo exam (AI Report)                               │ │
│  │  [4.6] Hoàn thành đề thi                                            │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### UC-01-C: Chi tiết Phase 1 — Chuẩn bị thi

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: CHUẨN BỊ THI (PRE-EXAM) — Chi tiết từng bước                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BƯỚC 1.1 — QUẢN LÝ LỚP HỌC                                              │
│  ────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  [1.1.1] Tạo lớp mới                                                      │
│      POST /api/v1/classes                                                  │
│      Body: { name, code, gradeLevel, academicYear, homeroomTeacherId }      │
│      exam.service.js: classService.create()                                 │
│                                                                             │
│  [1.1.2] Thêm học sinh vào lớp (3 cách)                                  │
│      ┌─────────────────────────────────────────────────────────────┐       │
│      │ Sub-flow A: Thêm từng học sinh                              │       │
│      │   POST /api/v1/classes/:id/students                        │       │
│      │   Body: { studentIds: ["userId1", "userId2"] }             │       │
│      │   Backend: $addToSet → không trùng lặp                    │       │
│      ├─────────────────────────────────────────────────────────────┤       │
│      │ Sub-flow B: Import hàng loạt từ CSV                        │       │
│      │   POST /api/v1/classes/:id/students/import                │       │
│      │   Body: { students: [{ name, email, studentCode, ... }] } │       │
│      │   Backend: Tạo user (role=student) + add vào classIds[]  │       │
│      ├─────────────────────────────────────────────────────────────┤       │
│      │ Sub-flow C: Học sinh tự đăng ký bằng mã lớp              │       │
│      │   (future feature — enrollmentCode)                       │       │
│      └─────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  [1.1.3] Gán giáo viên bộ môn                                             │
│      PATCH /api/v1/classes/:id/subject-teachers                            │
│      Body: { subjectTeachers: [{ subjectId, teacherId }] }                  │
│                                                                             │
│  [1.1.4] Xem danh sách lớp                                                │
│      GET /api/v1/classes                                                  │
│      Filter: schoolId, academicYear, gradeLevel                            │
│      → Trả về: danh sách lớp, số học sinh, giáo viên CN                 │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BƯỚC 1.2 — TẠO ĐỀ THI                                                    │
│  ────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  [1.2.1] Chọn OMR Template                                                │
│      GET /api/v1/omr-templates/exam/:examId                                │
│      Hoặc: GET /api/v1/omr-templates/default                               │
│      → Template định nghĩa: số câu hỏi, kích thước bubble, layout       │
│                                                                             │
│  [1.2.2] Tạo đề thi (draft)                                               │
│      POST /api/v1/exams                                                   │
│      Body: {                                                               │
│        title: "Kiểm tra HK1 - Toán 10",                                   │
│        description: "Đề kiểm tra 15 phút",                                │
│        subjectId: "subjectId",  // ObjectId môn học                       │
│        classIds: ["classId1", "classId2"],                                 │
│        omrTemplateId: "templateId",                                        │
│        totalScore: 10,                                                     │
│        passingScore: 5,                                                   │
│        duration: 15,          // phút                                      │
│        examDate: "2026-06-25",                                            │
│        numberOfVersions: 4,    // số mã đề                                │
│        questionIds: [],          // chưa có câu hỏi → bổ sung sau          │
│      }                                                                     │
│                                                                             │
│      Backend exam.service.js:                                              │
│        1. Validate OMR template tồn tại                                    │
│        2. Set primaryClassId = classIds[0] nếu chưa có                    │
│        3. Tạo Exam (status = "draft")                                     │
│        4. Save → MongoDB                                                   │
│                                                                             │
│  [1.2.3] Cập nhật đề thi (thêm câu hỏi, sửa thông tin)                   │
│      PATCH /api/v1/exams/:id                                               │
│      Body: { questionIds: ["q1", "q2", ...], title: "..." }               │
│      exam.service.js: Exam.findByIdAndUpdate()                             │
│      Validation: exam.status phải là "draft" hoặc "published"              │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BƯỚC 1.3 — THÊM CÂU HỎI VÀO ĐỀ                                          │
│  ────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Sub-flow A: Chọn câu hỏi từ ngân hàng có sẵn                     │   │
│  │                                                                      │   │
│  │  [1.3.1] Tìm kiếm câu hỏi                                           │   │
│  │      GET /api/v1/questions                                           │   │
│  │      Query: ?search=kinh&difficulty=medium&isApproved=true            │   │
│  │      → Trả về: paginated list, mỗi câu có: content, options,        │   │
│  │        difficulty, isApproved, usageCount, correctRate                │   │
│  │                                                                      │   │
│  │  [1.3.2] Phê duyệt câu hỏi (nếu chưa duyệt)                       │   │
│  │      POST /api/v1/questions/:id/approve                             │   │
│  │      → isApproved = true, approvedBy = teacherId, approvedAt = now   │   │
│  │                                                                      │   │
│  │  [1.3.3] Gán câu hỏi vào đề                                         │   │
│  │      PATCH /api/v1/exams/:id                                        │   │
│  │      Body: { questionIds: ["q1", "q2", "q3"] }                     │   │
│  │      → exam.questionIds = ["q1", "q2", "q3"]                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Sub-flow B: Tạo câu hỏi mới bằng AI                               │   │
│  │                                                                      │   │
│  │  [1.3.4] Gửi yêu cầu AI tạo câu hỏi                                │   │
│  │      POST /api/v1/questions/generate                                 │   │
│  │      Body: {                                                         │   │
│  │        topic: "Hàm số bậc 2",                                       │   │
│  │        count: 5,                                                      │   │
│  │        difficulty: "medium",                                         │   │
│  │        questionType: "single_choice",                               │   │
│  │      }                                                               │   │
│  │                                                                      │   │
│  │  Backend question.service.js:                                        │   │
│  │    1. Gọi questionGenService.generate()                             │   │
│  │    2. → geminiService → Gemini API: "Tạo 5 câu hỏi trắc nghiệm..." │   │
│  │    3. Parse JSON response → Question objects                       │   │
│  │    4. Normalize options: đảm bảo có đúng 1 đáp án đúng            │   │
│  │    5. Lưu vào Question model (source = "ai")                        │   │
│  │    6. Trả về danh sách questionIds                                  │   │
│  │                                                                      │   │
│  │  [1.3.5] Giáo viên duyệt và chỉnh sửa câu hỏi AI                  │   │
│  │      PATCH /api/v1/questions/:id                                    │   │
│  │      → Sửa nội dung, đáp án, độ khó                                │   │
│  │  [1.3.6] Approve câu hỏi AI                                         │   │
│  │      POST /api/v1/questions/:id/approve                             │   │
│  │  [1.3.7] Gán vào đề thi                                             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BƯỚC 1.4 — TẠO PHIÊN BẢN ĐỀ (XÁO TRỘN)                                 │
│  ────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  [1.4.1] Yêu cầu tạo phiên bản đề                                         │
│      POST /api/v1/exams/:id/versions                                      │
│      Body: { count: 4 }  // tạo 4 mã đề                                │
│                                                                             │
│  [1.4.2] Backend xử lý (exam.service.js: generateVersions)                 │
│                                                                             │
│      For each version (i = 0 → count-1):                                  │
│                                                                             │
│      ┌─────────────────────────────────────────────────────────────┐       │
│      │  VERSION GENERATION PIPELINE                                │       │
│      ├─────────────────────────────────────────────────────────────┤       │
│      │                                                              │       │
│      │  Step A: Xáo trộn câu hỏi                                   │       │
│      │    shuffledQuestions = shuffleArray([...questions])         │       │
│      │    → Mỗi mã đề có thứ tự câu hỏi khác nhau                │       │
│      │                                                              │       │
│      │  Step B: Xáo trộn đáp án trong mỗi câu hỏi                  │       │
│      │    questionsWithShuffledOptions = shuffledQuestions.map(q => │       │
│      │      ({ position: idx+1,                                    │       │
│      │         questionId: q._id,                                  │       │
│      │         originalPosition: originalIdx+1,                     │       │
│      │         shuffledOptions: shuffleOptions(q.options) }))       │       │
│      │                                                              │       │
│      │  Step C: Tạo đáp án ánh (answerKey)                        │       │
│      │    answerKey = new Map()                                     │       │
│      │    questionsWithShuffledOptions.forEach((q, idx) => {       │       │
│      │      correctOpt = q.shuffledOptions.find(o => o.isCorrect)  │       │
│      │      answerKey.set((idx+1).toString(), correctOpt.id)       │       │
│      │    })                                                        │       │
│      │    → Key = vị trí câu hỏi (1, 2, 3...)                    │       │
│      │    → Value = optionId của đáp án đúng (trong phiên bản đó) │       │
│      │                                                              │       │
│      │  Step D: Lưu ExamVersion                                     │       │
│      │    versionCode = (101 + i).toString()  // "101", "102"...  │       │
│      │    new ExamVersion({                                         │       │
│      │      examId, versionCode,                                    │       │
│      │      numberOfQuestions: questions.length,                     │       │
│      │      questions: questionsWithShuffledOptions,                │       │
│      │      answerKey  // Map<position, correctOptionId>           │       │
│      │    })                                                        │       │
│      │    → Save MongoDB                                            │       │
│      │                                                              │       │
│      │  Step E: Gắn ExamVersion vào Exam                           │       │
│      │    exam.versions.push(examVersion._id)                       │       │
│      │    exam.numberOfVersions = count                              │       │
│      │    exam.save()                                               │       │
│      │                                                              │       │
│      │  Step F: Tăng usage count của template                      │       │
│      │    omrTemplateService.incrementUsageCount(omrTemplateId)    │       │
│      └─────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  [1.4.3] Kết quả                                                          │
│      Response: {                                                          │
│        examId,                                                             │
│        versions: ["101", "102", "103", "104"],                            │
│        examVersions: [ObjectId, ...]                                       │
│      }                                                                     │
│                                                                             │
│  ⚠️  VÍ DỤ THỰC TẾ:                                                      │
│      Đề gốc: Câu 1:A 2:B 3:C 4:D                                          │
│      Mã đề 101: Câu 1:D 2:A 3:B 4:C  (xáo trộn câu)                      │
│      Mã đề 102: Câu 1:C 2:D 3:A 4:B  (xáo trộn câu)                      │
│      → Mỗi mã đề có answerKey riêng                                       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BƯỚC 1.5 — XUẤT PHIẾU TRẢ LỜI OMR (PDF)                                 │
│  ────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  [1.5.1] Lấy thông tin đề thi để xuất                                     │
│      GET /api/v1/exams/:id/versions/:versionCode/pdf                       │
│      exam.service.js: exportVersionPDF() → lấy questions + version        │
│                                                                             │
│  [1.5.2] Lấy cấu hình OMR template                                        │
│      OMRTemplate zones (mm) → chuyển đổi sang px @ 300 DPI               │
│      → Xác định vị trí: header, mã SV, mã đề, vùng trả lời             │
│                                                                             │
│  [1.5.3] Generate PDF bằng PDFKit                                         │
│      pdfGenerator.js (server/src/utils/pdfGenerator.js)                    │
│                                                                             │
│      ┌─────────────────────────────────────────────────────────────┐       │
│      │  PDF STRUCTURE                                             │       │
│      │                                                              │       │
│      │  Page 1: ĐỀ THI                                             │       │
│      │  ┌─────────────────────────────────────────────────────┐    │       │
│      │  │ Header: Tên trường (từ school), Môn học, Lớp        │    │       │
│      │  │ Thông tin: Thời gian, Ngày thi, Tổng điểm           │    │       │
│      │  │─────────────────────────────────────────────────────│    │       │
│      │  │ Câu 1. [Nội dung câu hỏi]                          │    │       │
│      │  │   □ A. [đáp án A]  □ B. [đáp án B]                │    │       │
│      │  │   □ C. [đáp án C]  □ D. [đáp án D]                │    │       │
│      │  │─────────────────────────────────────────────────────│    │       │
│      │  │ Câu 2. [Nội dung câu hỏi]                          │    │       │
│      │  │   ...                                                │    │       │
│      │  └─────────────────────────────────────────────────────┘    │       │
│      │                                                              │       │
│      │  Page 2: PHIẾU TRẢ LỜI (OMR)                               │       │
│      │  ┌─────────────────────────────────────────────────────┐    │       │
│      │  │ Mã đề: [■][■][■][■]          Mã SV: [■][■][■][■][■]│    │       │
│      │  │─────────────────────────────────────────────────────│    │       │
│      │  │ Q│ 1  2  3  4  5 │  row 1                         │    │       │
│      │  │ A│ □  □  □  □  □ │                                 │    │       │
│      │  │ B│ □  □  □  □  □ │  ← 5 câu mỗi hàng             │    │       │
│      │  │ C│ □  □  □  □  □ │                                 │    │       │
│      │  │ D│ □  □  □  □  □ │                                 │    │       │
│      │  │─────────────────────────────────────────────────────│    │       │
│      │  │ Q│ 6  7  8  9  10│  row 2                         │    │       │
│      │  │ A│ □  □  □  □  □ │                                 │    │       │
│      │  │ B│ □  □  □  □  □ │                                 │    │       │
│      │  │ C│ □  □  □  □  □ │                                 │    │       │
│      │  │ D│ □  □  □  □  □ │                                 │    │       │
│      │  └─────────────────────────────────────────────────────┘    │       │
│      └─────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  [1.5.4] Tải về / In                                                        │
│      Response: application/pdf stream                                      │
│      Filename: "{examTitle}_made_{versionCode}.pdf"                       │
│                                                                             │
│  [1.5.5] Xuất nhiều phiên bản (zip)                                      │
│      GET /api/v1/exams/:id/versions/export                             │
│      → Tạo PDF cho tất cả mã đề (đề thi + OMR sheet), nén thành zip│
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BƯỚC 1.6 — PUBLISH ĐỀ THI                                                 │
│  ────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  [1.6.1] Yêu cầu publish                                                   │
│      POST /api/v1/exams/:id/publish                                       │
│                                                                             │
│  [1.6.2] Backend xử lý                                                    │
│      exam.service.js: publish()                                            │
│        1. Validate: exam.status phải là "draft"                           │
│        2. exam.status = "published"                                       │
│        3. exam.publishedAt = new Date()                                   │
│        4. exam.save()                                                      │
│                                                                             │
│  [1.6.3] Gửi thông báo cho học sinh (notification)                        │
│      Với mỗi classId trong exam.classIds[]:                               │
│        → Lấy danh sách studentIds từ Class.studentIds[]                   │
│        → Tạo notification cho từng student:                               │
│          { type: "exam_published",                                         │
│            title: "Đề thi mới",                                           │
│            body: "Đề ${exam.title} đã được công bố",                     │
│            data: { examId, classId } }                                    │
│                                                                             │
│  [1.6.4] Lên lịch nhắc nhở (examDate - 1 day)                           │
│      Hệ thống sẽ gửi notification reminder trước ngày thi 1 ngày          │
│      (notification với type = "exam_reminder")                             │
│                                                                             │
│  [1.6.5] Trạng thái đề thi:                                               │
│      draft → published → in_progress → completed → archived                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### UC-01-D: Chi tiết Phase 2 & 3 — Thi và Quét OMR

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: THI (EXAM) — Học sinh làm bài trên giấy                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ⚠️  LUỒNG HOÀN TOÀN NGOÀI HỆ THỐNG PHẦN MỀM                            │
│                                                                             │
│  [2.1] Giáo viên phát phiếu trả lời OMR (đã in từ Phase 1)               │
│  [2.2] Học sinh điền thông tin cá nhân:                                   │
│       • Họ tên, lớp (viết tay)                                           │
│       • Mã sinh viên: tô bong từng chữ số (ví dụ: 1-2-3-4-5)             │
│       • Mã đề: tô bong 2 chữ số (ví dụ: 1-0-1)                          │
│  [2.3] Học sinh làm bài:                                                  │
│       • Đọc câu hỏi trên đề (trang 1)                                     │
│       • Tô bong đáp án trên phiếu OMR (trang 2)                          │
│       • VD: Câu 1 đáp án B → tô bong hàng B, cột 1                       │
│  [2.4] Nộp phiếu OMR cho giáo viên                                        │
│                                                                             │
│  📝  Khi học sinh làm bài, hệ thống không ghi nhận gì.                   │
│      Toàn bộ quá trình thi diễn ra trên giấy.                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: QUÉT OMR — Chi tiết 3 sub-flows                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  SUB-FLOW A: QUÉT TỪ MOBILE APP (Camera)                           │   │
│  │                                                                      │   │
│  │  [3A.1] Giáo viên chọn đề thi để quét                              │   │
│  │      Mobile: ExamSelectionPage → chọn exam                          │   │
│  │      GET /api/v1/omr-templates/exam/:examId                        │   │
│  │      → Lấy template JSON cho mobile (mm → px @ 300 DPI)             │   │
│  │                                                                      │   │
│  │  [3A.2] Khởi động camera                                           │   │
│  │      CameraBloc: CameraInitializing → CameraReady                   │   │
│  │      Camera stream: 30fps frames                                    │   │
│  │                                                                      │   │
│  │  [3A.3] Phát hiện góc tờ phiếu (real-time)                        │   │
│  │      AppOMREngine (OpenCV Dart) xử lý từng frame:                  │   │
│  │      1. Convert frame → grayscale                                   │   │
│  │      2. Gaussian blur → Canny edge detection                       │   │
│  │      3. Tìm contours → approxPolyDP → 4 điểm góc                   │   │
│  │      4. Vẽ CornerOverlayPainter lên preview                       │   │
│  │      CameraBloc: CameraCornerDetected → CameraStable (500ms)        │   │
│  │                                                                      │   │
│  │  [3A.4] Chụp ảnh                                                    │   │
│  │      User tap capture button                                        │   │
│  │      CameraBloc: CameraCapturing → CameraImageReady                 │   │
│  │      → Lưu image buffer                                            │   │
│  │                                                                      │   │
│  │  [3A.5] Xử lý OMR trên mobile                                      │   │
│  │      OMRScannerBloc: ImageReady → Processing                        │   │
│  │      OMREngine.processImage():                                     │   │
│  │      1. Perspective crop (4-point transform)                       │   │
│  │      2. Adaptive threshold                                         │   │
│  │      3. Bubble intensity reading                                   │   │
│  │         → Tính mean pixel value trong vùng mỗi bubble              │   │
│  │         → Tô đậm → intensity thấp; Trắng → intensity cao         │   │
│  │      4. Global threshold: tìm khoảng trống lớn nhất               │   │
│  │      5. Local threshold: ngưỡng riêng mỗi câu hỏi                 │   │
│  │      6. Ghép mã SV (5 chữ số INT)                                 │   │
│  │      7. Ghép mã đề (2 chữ số INT)                                 │   │
│  │      8. Đọc đáp án từng câu (MCQ4: A/B/C/D)                      │   │
│  │      9. Trả về: { studentCode, versionCode, answers{} }           │   │
│  │      OMRScannerBloc: Processing → Success(gradingResult)           │   │
│  │                                                                      │   │
│  │  [3A.6] Hiển thị kết quả + chọn học sinh                          │   │
│  │      OMRSuccessPage: hiển thị đáp án đã đọc                       │   │
│  │      StudentPickerDialog: chọn student từ danh sách lớp            │   │
│  │      (Hoặc xác nhận studentCode đọc được)                         │   │
│  │                                                                      │   │
│  │  [3A.7] Gửi kết quả lên server                                     │   │
│  │      Online path:                                                   │   │
│  │        POST /api/v1/submissions/scan                                │   │
│  │        Body: { examId, studentCode, versionCode, answers{} }        │   │
│  │        → Backend chấm điểm → trả Submission                        │   │
│  │                                                                      │   │
│  │      Offline path:                                                  │   │
│  │        → Lưu SharedPreferences["pending_submissions"]               │   │
│  │        → Khi app online: syncPendingSubmissions()                   │   │
│  │                                                                      │   │
│  │  [3A.8] Hiển thị kết quả chấm                                      │   │
│  │      OMRSuccessPage: score, correct/incorrect count, bubble overlay  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  SUB-FLOW B: QUÉT TỪ WEB APP (Upload ảnh)                         │   │
│  │                                                                      │   │
│  │  [3B.1] Giáo viên upload ảnh OMR                                   │   │
│  │      Web: ScanPage.tsx                                              │   │
│  │      → Image picker / drag & drop                                   │   │
│  │      → GET /api/v1/upload/signature                                 │   │
│  │         → Nhận Cloudinary signature                                │   │
│  │      → Upload trực tiếp lên Cloudinary                             │   │
│  │         → Nhận: { public_id, secure_url }                         │   │
│  │                                                                      │   │
│  │  [3B.2] Gửi scan request                                            │   │
│  │      POST /api/v1/submissions/scan                                  │   │
│  │      Body: { examId, classId, originalUrl, originalPublicId }       │   │
│  │                                                                      │   │
│  │  [3B.3] Backend xử lý (submission.service.js: scan)                 │   │
│  │      1. Validate exam tồn tại                                       │   │
│  │      2. Validate Cloudinary URL hợp lệ                             │   │
│  │      3. Gọi pythonBridge.processImage()                            │   │
│  │         → Spawn Python process                                     │   │
│  │         → stdin: JSON { imageUrl, template: {} }                   │   │
│  │         → stdout: JSON { answers, score, annotated_image }        │   │
│  │      4. Backend nhận kết quả từ Python                             │   │
│  │      5. (Tại đây, code hiện tại trả về pythonResult nhưng         │   │
│  │          chưa tự động tạo Submission — cần implement)             │   │
│  │                                                                      │   │
│  │  [3B.4] Trả kết quả về frontend                                     │   │
│  │      Response: { status: 'scanning', pythonResult: {...} }         │   │
│  │      Web hiển thị: kết quả đọc được, annotated image             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  SUB-FLOW C: QUÉT OFFLINE → ĐỒNG BỘ (Mobile)                       │   │
│  │                                                                      │   │
│  │  [3C.1] Khi quét offline                                           │   │
│  │      OMRSubmissionSyncService.submit() thất bại (network error)    │   │
│  │      → Lưu vào SharedPreferences["pending_submissions"]            │   │
│  │      Structure:                                                    │   │
│  │      [                                                               │   │
│  │        {                                                            │   │
│  │          id: "uuid-v4",                                           │   │
│  │          examId: "...",                                            │   │
│  │          studentId: "...",                                          │   │
│  │          studentCode: "12345",                                     │   │
│  │          versionCode: "101",                                       │   │
│  │          answers: { "1": "A", "2": "B", ... },                   │   │
│  │          timestamp: "2026-06-25T10:30:00Z",                       │   │
│  │          retryCount: 0                                            │   │
│  │        }                                                            │   │
│  │      ]                                                              │   │
│  │                                                                      │   │
│  │  [3C.2] Khi app khởi động / kết nối lại                           │   │
│  │      HomePage.initState() → syncPendingSubmissions()                │   │
│  │      1. Đọc SharedPreferences["pending_submissions"]              │   │
│  │      2. Với mỗi pending submission:                              │   │
│  │         → POST /api/v1/submissions/scan                           │   │
│  │         → Thành công: xóa khỏi pending list                      │   │
│  │         → Thất bại: retryCount++                                 │   │
│  │      3. Ghi lại SharedPreferences["pending_submissions"]          │   │
│  │                                                                      │   │
│  │  [3C.3] Retry limit                                                │   │
│  │      Nếu retryCount > 5: giữ lại trong danh sách nhưng           │   │
│  │      không tự động retry nữa → user phải submit thủ công        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### UC-01-E: Chi tiết Phase 3 — Backend OMR Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: BACKEND OMR PROCESSING PIPELINE                                  │
│  (Server-side — khi quét từ Web hoặc sync từ Mobile)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  ENTRY: POST /api/v1/submissions/scan                                 │ │
│  │  submission.controller.js: scan() → ACCEPTED (202)                   │ │
│  └──────────────────────────────┬───────────────────────────────────────┘ │
│                                 │                                          │
│                                 ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  STEP 1: VALIDATE REQUEST                                             │ │
│  │  submission.service.js: scan(data)                                    │ │
│  │                                                                       │ │
│  │  1.1. Tìm exam by examId                                             │ │
│  │      Exam.findById(examId)                                          │ │
│  │      → Không tìm thấy → 404 "Exam not found"                        │ │
│  │                                                                       │ │
│  │  1.2. Validate upload mode                                           │ │
│  │      if upload.mode === 'cloudinary':                                │ │
│  │        assertIsCloudinaryUrl(originalUrl, cloud_name)                │ │
│  │        → Không hợp lệ → 400 "originalUrl is required"               │ │
│  └──────────────────────────────┬───────────────────────────────────────┘ │
│                                 │                                          │
│                                 ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  STEP 2: CALL PYTHON BRIDGE                                          │ │
│  │  pythonBridgeService.processImage({ imageUrl, template: {} })        │ │
│  │                                                                       │ │
│  │  ┌─────────────────────────────────────────────────────────────┐      │ │
│  │  │  Python Bridge Internals (omr_process.py)                  │      │ │
│  │  │                                                              │      │ │
│  │  │  2A. Nhận imageUrl (Cloudinary)                            │      │ │
│  │  │      → Download ảnh → base64 → numpy array                │      │ │
│  │  │                                                              │      │ │
│  │  │  2B. Apply preprocessors                                    │      │ │
│  │  │      → CropOnMarkers: tìm marker góc → perspective crop   │      │ │
│  │  │      → Levels: gamma adjustment                              │      │ │
│  │  │      → MedianBlur: giảm nhiễu                               │      │ │
│  │  │                                                              │      │ │
│  │  │  2C. Read OMR response                                       │      │ │
│  │  │      → Với mỗi bubble region: tính mean pixel intensity    │      │ │
│  │  │      → Global threshold: largest gap algorithm              │      │ │
│  │  │      → Local threshold: per-question strip                   │      │ │
│  │  │      → Detect: marked bubbles (intensity < threshold)        │      │ │
│  │  │                                                              │      │ │
│  │  │  2D. Parse answers                                           │      │ │
│  │  │      → student_code: ghép 5 chữ số INT (0-9)              │      │ │
│  │  │      → version_code: ghép 2 chữ số INT                     │      │ │
│  │  │      → answers{}: map câu hỏi → đáp án (A/B/C/D)          │      │ │
│  │  │      → warnings[]: multi-marked fields, low confidence      │      │ │
│  │  │                                                              │      │ │
│  │  │  2E. Score (nếu có evaluation.json)                         │      │ │
│  │  │      → So sánh marked answer với answerKey                  │      │ │
│  │  │      → Áp dụng marking scheme (correct/incorrect/unmarked) │      │ │
│  │  │      → totalScore = sum of correct scores                   │      │ │
│  │  │                                                              │      │ │
│  │  │  2F. Generate annotated image                                 │      │ │
│  │  │      → Vẽ rectangle quanh mỗi bubble đã đọc               │      │ │
│  │  │      → Mã màu: xanh=đúng, đỏ=sai, vàng=unmarked           │      │ │
│  │  │      → Encode → base64                                      │      │ │
│  │  │                                                              │      │ │
│  │  │  2G. Return stdout JSON                                      │      │ │
│  │  │      { success: true, answers: {...}, score: 8.5,           │      │ │
│  │  │        warnings: [...], annotated_image: "base64...",       │      │ │
│  │  │        processing_time_ms: 245 }                            │      │ │
│  │  └─────────────────────────────────────────────────────────────┘      │ │
│  └──────────────────────────────┬───────────────────────────────────────┘ │
│                                 │                                          │
│                    ┌────────────┴────────────┐                            │
│                    │  Python thành công?     │                           │
│                    └────────────┬────────────┘                            │
│                         YES     │     NO                                  │
│                    ┌────────────┴─────────────────────┐                   │
│                    ▼                                ▼                   │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐     │
│  │  STEP 3A: RETURN SCAN RESULT  │  │  STEP 3B: FALLBACK           │     │
│  │  Response 202:               │  │  submission.service.js:      │     │
│  │  {                            │  │  Return status: 'pending'    │     │
│  │    status: 'scanning',       │  │  (OMR scanning not           │     │
│  │    pythonResult: {           │  │   implemented yet)           │     │
│  │      answers, score,         │  │                              │     │
│  │      annotated_image,        │  │  → Đợi implement:            │     │
│  │      warnings                │  │    createFromOMR()          │     │
│  │    }                         │  │    để lưu Submission         │     │
│  │  }                           │  │    sau khi scan thành công   │     │
│  └───────────────────────────────┘  └───────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### UC-01-F: Chi tiết Phase 4 — Sau thi

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: SAU THI (POST-EXAM) — Chi tiết từng bước                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BƯỚC 4.1 — HỌC SINH XEM ĐIỂM                                             │
│  ────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  [4.1.1] Xem danh sách bài thi của tôi                                     │
│      GET /api/v1/submissions/me                                            │
│      submission.service.js: getByStudent(userId)                           │
│      → Paginated list: exam title, date, score, status                    │
│                                                                             │
│  [4.1.2] Xem chi tiết bài thi                                              │
│      GET /api/v1/submissions/:id                                            │
│      submission.service.js: getById(id)                                    │
│      Populate: examId, versionId, studentId, answers.questionId            │
│      → Trả về: answers[] với từng câu hỏi, đáp án đã chọn,               │
│        đáp án đúng, điểm mỗi câu, tổng điểm                             │
│                                                                             │
│  [4.1.3] Xem thống kê điểm thi (dashboard)                                 │
│      GET /api/v1/analytics/dashboard-stats                                 │
│      → avgScore, submissionCount, upcomingExams                             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BƯỚC 4.2 — HỌC SINH NỘP KHIẾU NẠI (APPEAL)                              │
│  ────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  [4.2.1] Phát hiện sai sót → Chuẩn bị khiếu nại                          │
│      → Học sinh đối chiếu đáp án OMR đã đọc với đáp án thực tế          │
│      → Xác định câu bị sai: ví dụ "Câu 5: tô B nhưng đáp án là C"       │
│      → Chuẩn bị lý do: "Em tô bong B nhưng hệ thống nhận là A"          │
│                                                                             │
│  [4.2.2] Nộp khiếu nại                                                     │
│      POST /api/v1/appeals                                                  │
│      Body: {                                                               │
│        submissionId: "...",   // bài thi bị khiếu nại                      │
│        questionId: "...",     // câu bị sai                               │
│        reason: "Em tô bong đáp án B nhưng hệ thống nhận là A"          │
│        evidenceImageUrl: "..."  // ảnh chứng minh (optional)             │
│      }                                                                     │
│                                                                             │
│      Backend appeal.service.js: create()                                  │
│        1. Validate submission tồn tại                                      │
│        2. Validate question thuộc exam                                     │
│        3. Unique check: (submissionId, questionId) — mỗi câu 1 lần       │
│        4. Create Appeal { status: "pending" }                             │
│        5. Save to MongoDB                                                  │
│        6. Gửi notification cho giáo viên                                   │
│                                                                             │
│  [4.2.3] Xem danh sách khiếu nại của tôi                                  │
│      GET /api/v1/appeals/me                                                │
│      → status: pending | under_review | approved | rejected              │
│      → teacherResponse: decision, note, scoreAdjustment                   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BƯỚC 4.3 — GIÁO VIÊN XỬ LÝ KHIẾU NẠI                                     │
│  ────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  [4.3.1] Xem danh sách khiếu nại                                           │
│      GET /api/v1/appeals/                                                  │
│      Filter: ?examId=...&status=pending                                   │
│      GET /api/v1/appeals/exam/:examId                                     │
│      GET /api/v1/appeals/exam/:examId/pending-count                       │
│                                                                             │
│  [4.3.2] Xem chi tiết khiếu nại                                           │
│      GET /api/v1/appeals/:id                                               │
│      → Xem: submission gốc, câu hỏi, đáp án đã chọn,                     │
│        đáp án đúng, ảnh chứng minh (nếu có), lý do học sinh            │
│                                                                             │
│  [4.3.3] Phản hồi khiếu nại                                               │
│      POST /api/v1/appeals/:id/review                                      │
│      Body: {                                                               │
│        decision: "approved" | "rejected",                                  │
│        note: "Đã kiểm tra lại ảnh OMR, bubble B đọc rõ ràng"           │
│        scoreAdjustment: 0.5   // điểm cộng thêm                          │
│      }                                                                     │
│                                                                             │
│      Backend appeal.service.js: review()                                   │
│        1. Validate appeal tồn tại và status = pending                     │
│        2. Load Submission liên quan                                       │
│        3. Load ExamVersion để có answerKey                                │
│        4. Cập nhật Appeal:                                               │
│           appeal.status = decision                                        │
│           appeal.teacherResponse = { reviewedBy, reviewedAt, decision,   │
│                                     note, scoreAdjustment }             │
│        5. Nếu approved:                                                   │
│           → Tìm answer trong Submission.answers[] theo questionId        │
│           → submission.finalScore += scoreAdjustment                      │
│           → submission.status = "appealed"                               │
│           → submission.save()                                            │
│        6. Gửi notification cho học sinh: "Khiếu nại đã được xử lý"     │
│                                                                             │
│  [4.3.4] Ghi đè điểm thủ công (Override)                                 │
│      POST /api/v1/submissions/:id/override                               │
│      Body: { position: 5, correctedAnswer: "C", reason: "..." }          │
│      → Thay đổi đáp án tại vị trí câu hỏi, tính lại điểm              │
│      → Ghi vào manualOverrides[] (audit trail)                           │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BƯỚC 4.4 — XUẤT KẾT QUẢ THI                                               │
│  ────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  [4.4.1] Xem thống kê bài thi                                             │
│      GET /api/v1/submissions/exam/:examId/statistics                       │
│      submission.service.js: getStatistics(examId)                        │
│      → Aggregation pipeline MongoDB:                                     │
│        • totalSubmissions, averageScore, highestScore, lowestScore       │
│        • submissionRate = submissions / totalStudents * 100               │
│        • gradeDistribution (Kém/Yếu/TB/Khá/Giỏi)                        │
│        • passRate (>= passingScore)                                      │
│        • scoreHistogram (0-2, 2-4, 4-6, 6-8, 8-10)                     │
│                                                                             │
│  [4.4.2] Xuất kết quả thi (PDF)                                            │
│      GET /api/v1/exams/:id/results/export?format=pdf                      │
│      exam.service.js: exportResults(examId, 'pdf')                       │
│      → Fetch all Submission for exam (status = completed)               │
│      → Generate PDF bằng PDFKit:                                         │
│        Header: "BÁO CÁO KẾT QUẢ BÀI THI", tên đề                        │
│        Summary: tổng nộp, đã chấm, điểm TB                              │
│        Table: STT | Họ tên | SBD | Điểm | Trạng thái                   │
│        Footer: Smart Grading System, ngày tạo                            │
│      → Buffer → Response stream (Content-Type: application/pdf)          │
│                                                                             │
│  [4.4.3] Xuất kết quả thi (Excel)                                         │
│      GET /api/v1/exams/:id/results/export?format=excel                    │
│      → ExcelJS: formatted table, formulas, charts                        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BƯỚC 4.5 — TẠO BÁO CÁO AI (AI REPORT)                                   │
│  ────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  [4.5.1] Tạo AI report cho học sinh (sau khi có điểm)                    │
│      POST /api/v1/ai-reports/submission/:submissionId                     │
│      aiReport.service.js: generateStudentReport()                        │
│      → Load Submission + Exam + Questions                                  │
│      → Build prompt: student mistakes, weak topics, recommendations      │
│      → Gemini API: phân tích → JSON { mistakes[], suggestions[] }        │
│      → Lưu AIReport model                                               │
│                                                                             │
│  [4.5.2] Tạo AI report cho lớp (exam-level)                              │
│      POST /api/v1/ai-reports/exam/:examId                               │
│      → Tổng hợp tất cả Submission của exam                              │
│      → Gemini: phân tích phân bố điểm, câu khó, câu dễ                  │
│      → Lưu ExamReport model                                             │
│                                                                             │
│  [4.5.3] Xem AI Report (từ AI Tutor page)                                 │
│      GET /api/v1/ai-chat/reports                                        │
│      → Hiển thị: summary, strengths, weaknesses, recommendations          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BƯỚC 4.6 — HOÀN THÀNH ĐỀ THI                                              │
│  ────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  [4.6.1] Giáo viên hoàn thành đề thi                                      │
│      POST /api/v1/exams/:id/complete                                     │
│      exam.service.js: complete()                                         │
│        1. exam.status = "completed"                                      │
│        2. exam.completedAt = new Date()                                  │
│        3. exam.save()                                                   │
│                                                                             │
│  [4.6.2] Sau khi hoàn thành:                                             │
│        → Không thể thêm/sửa đề thi                                       │
│        → Không thể thêm/sửa submission                                   │
│        → Vẫn có thể xử lý appeal                                        │
│        → Có thể export kết quả                                           │
│                                                                             │
│  [4.6.3] Trạng thái đề thi lifecycle:                                     │
│                                                                             │
│      ┌──────────┐   publish   ┌────────────┐   scan   ┌───────────────┐   │
│      │  DRAFT   │ ─────────→ │ PUBLISHED  │ ───────→ │ IN_PROGRESS  │   │
│      │          │            │            │           │ (auto after  │   │
│      │          │            │            │           │  first scan) │   │
│      └──────────┘            └────────────┘           └───────┬───────┘   │
│                                                             │           │
│                                                             ▼           │
│                                                    ┌───────────────┐   │
│                                                    │  COMPLETED    │   │
│                                                    │ (manual when  │   │
│                                                    │  done)        │   │
│                                                    └───────┬───────┘   │
│                                                            │           │
│                                          archive ──────────┘           │
│                                                    ┌───────────────┐   │
│                                                    │   ARCHIVED    │   │
│                                                    └───────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### UC-01-G: Ma trận tác nhân — hành động theo từng Phase

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MA TRẬN TAC NHÂN — HÀNH ĐỘNG THEO TỪNG PHASE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│              │ Phase 1  │ Phase 2  │ Phase 3  │ Phase 4                    │
│              │ Chuẩn bị │ Thi      │ Quét     │ Sau thi                    │
│              │ (GV)     │ (HS)     │ (GV)     │ (GV/HS)                   │
│  ────────────┼──────────┼──────────┼──────────┼────────────────────────────  │
│  Admin       │ Quản lý  │    —     │    —     │ Xuất báo cáo toàn trường  │
│  (super)     │ trường   │          │          │                            │
│  ────────────┼──────────┼──────────┼──────────┼────────────────────────────  │
│  School-     │ Quản lý  │    —     │    —     │ Xuất báo cáo cấp trường   │
│  admin       │ lớp, HS  │          │          │                            │
│  ────────────┼──────────┼──────────┼──────────┼────────────────────────────  │
│  Giáo viên   │ Tạo đề   │ Phát đề  │ Quét OMR │ Xử lý appeal             │
│  (teacher)   │ Thêm câu  │ OMR cho  │ Xem kết  │ Xuất kết quả             │
│              │ hỏi      │ HS       │ quả      │ Hoàn thành đề            │
│              │ Tạo mã   │          │ Override │ Tạo AI report            │
│              │ đề       │          │ điểm    │                            │
│  ────────────┼──────────┼──────────┼──────────┼────────────────────────────  │
│  Học sinh    │    —     │ Làm bài  │    —     │ Xem điểm                 │
│  (student)   │          │ trên     │          │ Nộp khiếu nại            │
│              │          │ giấy     │          │ Xem kết quả khiếu nại    │
│              │          │          │          │ Chat AI tutor             │
│  ────────────┼──────────┼──────────┼──────────┼────────────────────────────  │
│  Hệ thống    │ Auto     │    —     │ Auto     │ Auto thông báo           │
│  (auto)      │ notify   │          │ chấm     │ Auto cập nhật tiến độ    │
│              │ khi HS   │          │ điểm    │ Auto schedule reminder    │
│              │          │          │ sau scan │ Auto AI report           │
│                                                                             │
│  Chú thích: "—" = không có hành động trong phase này                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### UC-01-H: Timing — Thứ tự thời gian của toàn bộ quy trình

```
THỜI GIAN
│
T-7d   [Admin] Tạo tài khoản GV, HS, tạo lớp học
│
T-7d   [Giáo viên] Thêm HS vào lớp (thủ công hoặc import CSV)
│
T-5d   [Giáo viên] Tạo đề thi (draft)
│
T-5d   [Giáo viên] Thêm câu hỏi từ ngân hàng
│        → Hoặc: Dùng AI tạo câu hỏi tự động
│
T-5d   [Giáo viên] Tạo 4 phiên bản đề (xáo trộn)
│
T-5d   [Giáo viên] Xuất PDF: đề thi + phiếu OMR (4 mã đề)
│
T-5d   [Giáo viên] Publish đề thi
│        → Thông báo notification gửi tất cả HS trong lớp
│        → Lên lịch reminder: T-1d
│
T-4d   [Hệ thống] Gửi reminder notification: "Ngày mai có kiểm tra"
│
T-3d   ═══════════════ NGÀY THI ═══════════════
│
T-3d   [Học sinh] Nhận phiếu OMR, điền mã SV, mã đề, tô đáp án
│
T-3d   [Học sinh] Nộp phiếu OMR cho giáo viên
│         ─── LUỒNG NGOÀI HỆ THỐNG ───
│
T+0    [Giáo viên] Quét OMR bằng camera mobile
│         → Hoặc: Upload ảnh từ Web
│         → Hệ thống đọc bubble → chấm điểm
│         → Học sinh nhận notification "Điểm: 8.5/10"
│
T+0    [Học sinh] Xem điểm → phát hiện câu sai
│
T+1    [Học sinh] Nộp khiếu nại câu 5: "Em tô B nhưng nhận là A"
│
T+1    [Giáo viên] Xem danh sách khiếu nại
│
T+2    [Giáo viên] Duyệt khiếu nại → approved +0.5đ
│         → Học sinh nhận notification "Khiếu nại được duyệt: +0.5"
│
T+3    [Giáo viên] Xuất kết quả PDF/Excel
│
T+3    [Giáo viên] Tạo AI report cho lớp
│
T+3    [Giáo viên] Hoàn thành đề thi (status = completed)
│
T+3    [Admin] Xuất báo cáo tổng hợp toàn trường
│
```

### UC-02: Quy trình khiếu nại điểm thi (Appeal)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  UC-02: QUY TRÌNH KHIẾU NẠI ĐIỂM THI                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [HỌC SINH]                                                                │
│                                                                             │
│  1. Xem điểm                                                                │
│     GET /api/v1/submissions/me                                              │
│     GET /api/v1/submissions/:id  → Chi tiết bài thi                          │
│                                                                             │
│  2. Phát hiện sai sót                                                       │
│     → Câu hỏi bị sai đáp án so với đáp án đúng thực tế                     │
│     → Lý do: Bubble không được nhận diện đúng                              │
│                                                                             │
│  3. Nộp khiếu nại                                                           │
│     POST /api/v1/appeals/                                                   │
│     Body: { submissionId, questionId, reason, evidenceImageUrl? }           │
│     Status: pending                                                         │
│                                                                             │
│     Backend:                                                                │
│     appealService.create() → Appeal model                                   │
│     → Notification gửi teacher                                              │
│     → Unique constraint: (submissionId, questionId) — mỗi câu 1 lần         │
│                                                                             │
│  [Giáo viên]                                                                │
│                                                                             │
│  4. Xem danh sách khiếu nại                                                 │
│     GET /api/v1/appeals/                                                    │
│     GET /api/v1/appeals/exam/:examId  → Appeals theo đề thi                 │
│                                                                             │
│  5. Phản hồi khiếu nại                                                      │
│     POST /api/v1/appeals/:id/review                                         │
│     Body: { decision: "approved"|"rejected",                               │
│             note: "...", scoreAdjustment: 0.5 }                              │
│                                                                             │
│     Backend:                                                                │
│     appealService.review()                                                  │
│       → Nếu approved: cập nhật Submission.finalScore += adjustment           │
│       → Nếu rejected: giữ nguyên                                            │
│       → Notification gửi student                                            │
│                                                                             │
│  [HỌC SINH]                                                                │
│                                                                             │
│  6. Xem kết quả khiếu nại                                                   │
│     GET /api/v1/appeals/me                                                  │
│     → status: pending / under_review / approved / rejected                  │
│     → teacherResponse: decision, note, scoreAdjustment                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────┐
│  UC-02: QUY TRÌNH KHIẾU NẠI ĐIỂM THI                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [HỌC SINH]                                                         │
│                                                                      │
│  1. Xem điểm                                                        │
│     GET /api/v1/submissions/me                                       │
│     GET /api/v1/submissions/:id  → Chi tiết bài thi                 │
│                                                                      │
│  2. Phát hiện sai sót                                               │
│     → Câu hỏi bị sai đáp án so với đáp án đúng thực tế              │
│     → Lý do: Bubble không được nhận diện đúng                       │
│                                                                      │
│  3. Nộp khiếu nại                                                   │
│     POST /api/v1/appeals/                                           │
│     Body: { submissionId, questionId, reason, evidenceImageUrl? }   │
│     Status: pending                                                  │
│                                                                      │
│     Backend:                                                         │
│     appealService.create() → Appeal model                            │
│     → Notification gửi teacher                                      │
│     → Unique constraint: (submissionId, questionId) — mỗi câu 1 lần  │
│                                                                      │
│  [GIAO VIÊN]                                                        │
│                                                                      │
│  4. Xem danh sách khiếu nại                                         │
│     GET /api/v1/appeals/                                             │
│     GET /api/v1/appeals/exam/:examId  → Appeals theo đề thi         │
│                                                                      │
│  5. Phản hồi khiếu nại                                              │
│     POST /api/v1/appeals/:id/review                                 │
│     Body: { decision: "approved"|"rejected",                        │
│             note: "...", scoreAdjustment: 0.5 }                     │
│                                                                      │
│     Backend:                                                         │
│     appealService.review()                                          │
│       → Nếu approved: cập nhật Submission.finalScore += adjustment  │
│       → Nếu rejected: giữ nguyên                                     │
│       → Notification gửi student                                    │
│                                                                      │
│  [HỌC SINH]                                                         │
│                                                                      │
│  6. Xem kết quả khiếu nại                                           │
│     GET /api/v1/appeals/me                                           │
│     → status: pending / under_review / approved / rejected          │
│     → teacherResponse: decision, note, scoreAdjustment               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### UC-03: AI Tutor — Hỗ trợ học tập

```
┌─────────────────────────────────────────────────────────────────────┐
│  UC-03: AI TUTOR — TRÒ CHUYỆN HỖ TRỢ HỌC TẬP                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [HỌC SINH]                                                         │
│                                                                      │
│  1. Mở AI Tutor                                                     │
│     Mobile: AITutorPage.dart                                        │
│     Web: AITutorPage.tsx                                            │
│                                                                      │
│  2. Chọn cuộc hội thoại hoặc tạo mới                                │
│     GET /api/v1/ai-chat/conversations                               │
│     POST /api/v1/ai-chat/conversations                              │
│                                                                      │
│  3. Gửi tin nhắn                                                    │
│     POST /api/v1/ai-chat/send                                       │
│     Body: { message, conversationId?, context }                     │
│                                                                      │
│     Backend:                                                         │
│     ┌─────────────────────────────────────────┐                    │
│     │ ① Load conversation history              │                   │
│     │ ② Build prompt: system (Vietnamese tutor)│                  │
│     │    + chat history + student context      │                   │
│     │ ③ Call Gemini API                         │                   │
│     │    (fallback: OpenAI → Claude)            │                   │
│     │ ④ Save messages to AIChat model           │                   │
│     │ ⑤ Return AI response                     │                   │
│     └─────────────────────────────────────────┘                    │
│                                                                      │
│  4. Xem AI Report (sau khi có điểm thi)                             │
│     POST /api/v1/ai-reports/submission/:submissionId               │
│     Backend: Gemini phân tích mistakes → suggestions → lưu AIReport │
│     GET /api/v1/ai-chat/reports                                     │
│                                                                      │
│  [CẢ HAI NỀN TẢNG]                                                  │
│                                                                      │
│  ┌──────────────┐  ┌──────────────────────┐  ┌──────────────────┐ │
│  │ Mobile App   │  │ AI Tutor Chat UI     │  │ Web App          │ │
│  │ (Flutter)    │  │  Dark theme bubbles  │  │ (React)          │ │
│  │              │  │  AI + Student msgs   │  │                  │ │
│  └──────────────┘  └──────────────────────┘  └──────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### UC-04: Quản lý người dùng & trường học (Admin)

```
┌─────────────────────────────────────────────────────────────────────┐
│  UC-04: QUẢN LÝ NGƯỜI DÙNG VÀ TRƯỜNG HỌC                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [SUPER ADMIN]                                                      │
│                                                                      │
│  1. Quản lý Trường học                                               │
│     POST   /api/v1/schools/     → Tạo trường                       │
│     GET    /api/v1/schools/     → Liệt kê                          │
│     PATCH  /api/v1/schools/:id  → Cập nhật                         │
│     DELETE /api/v1/schools/:id  → Xóa trường                       │
│                                                                      │
│     School settings:                                                 │
│     - gradingScale: { A: 90-100, B: 80-89, ... }                    │
│     - gradingLevels: ["excellent","good","average","poor"]           │
│     - maxScore, passingScore                                        │
│     - academicYears[]                                                │
│     - omrConfig                                                      │
│                                                                      │
│  2. Quản lý Users                                                    │
│     POST   /api/v1/users/      → Tạo user (admin/school-admin/       │
│                                  teacher/student)                   │
│     GET    /api/v1/users/      → Phân trang, filter theo school     │
│     PATCH  /api/v1/users/:id   → Cập nhật                           │
│     DELETE /api/v1/users/:id   → Soft delete (isActive=false)       │
│     POST   /api/v1/users/:id/change-password → Đổi mật khẩu          │
│                                                                      │
│  3. Quản lý Lớp học (School-Admin có thể)                           │
│     POST   /api/v1/classes/                                         │
│     PATCH  /api/v1/classes/:id                                      │
│     DELETE /api/v1/classes/:id                                      │
│     POST   /api/v1/classes/:id/students/import  → Import CSV       │
│     PATCH  /api/v1/classes/:id/subject-teachers → Gán giáo viên     │
│                                                                      │
│  4. Dashboard Admin                                                 │
│     GET /api/v1/analytics/dashboard-stats                           │
│     → Total schools, users, classes, submissions                    │
│     → Pending appeals, avg score, pass rate                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### UC-05: Tạo đề thi & Ngân hàng câu hỏi

```
┌─────────────────────────────────────────────────────────────────────┐
│  UC-05: TẠO ĐỀ THI VÀ NGÂN HÀNG CÂU HỎI                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [GIAO VIÊN]                                                         │
│                                                                      │
│  1. Quản lý Ngân hàng câu hỏi                                       │
│     POST /api/v1/questions/              → Tạo câu hỏi thủ công     │
│     POST /api/v1/questions/generate     → **AI tạo câu hỏi**       │
│     PATCH /api/v1/questions/:id/approve → Phê duyệt câu hỏi        │
│     GET   /api/v1/questions/            → Filter: difficulty,      │
│                                           source, tags, isApproved  │
│                                                                      │
│     AI Question Generation:                                          │
│     questionGenService.generate()                                   │
│       → Call Gemini API với prompt chủ đề, số lượng, độ khó        │
│       → Parse JSON response                                         │
│       → Normalize options (ensure 1 correct)                        │
│       → Save to Question model (source="ai")                        │
│                                                                      │
│  2. Tạo đề thi                                                       │
│     POST /api/v1/exams/                                             │
│     Body: { title, description, classIds[], totalScore,              │
│              passingScore, duration, omrTemplateId,                  │
│              questionIds[], numberOfVersions }                      │
│                                                                      │
│  3. Gán đề thi cho lớp                                               │
│     POST /api/v1/classes/:id/exams                                  │
│     POST /api/v1/exams/:id/classes                                  │
│                                                                      │
│  4. Tạo phiên bản đề (xáo trộn)                                     │
│     POST /api/v1/exams/:id/versions                                 │
│     Body: { count: 2 }  → tạo 2 phiên bản                          │
│                                                                      │
│     Backend examService.generateVersions():                         │
│       → Xáo trộn questionIds[]                                      │
│       → Xáo trộn options trong mỗi câu hỏi                          │
│       → Tạo ExamVersion với answerKey (map position → correct)      │
│       → Lưu evaluation.json để chấm điểm                           │
│                                                                      │
│  5. Xuất đề thi & phiếu trả lời                                     │
│     GET /api/v1/exams/:id/export              → Đề thi PDF          │
│     GET /api/v1/exams/:id/versions/:code/pdf  → Phiếu trả lời PDF   │
│     (Sử dụng PDFKit + Vietnamese font Arial trên Windows)            │
│                                                                      │
│  6. Publish đề thi                                                   │
│     POST /api/v1/exams/:id/publish                                  │
│     → status = published                                             │
│     → Gửi notification cho tất cả students trong classIds[]          │
│     → Gửi notification reminder (examDate - 1 day)                   │
│                                                                      │
│  7. Hoàn thành đề thi                                                │
│     POST /api/v1/exams/:id/complete                                 │
│     → status = completed                                             │
│     → Tổng hợp thống kê, cập nhật totalSubmissions                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### UC-06: Báo cáo & Xuất dữ liệu

```
┌─────────────────────────────────────────────────────────────────────┐
│  UC-06: BÁO CÁO VÀ XUẤT DỮ LIỆU                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [GIAO VIÊN / ADMIN]                                                 │
│                                                                      │
│  1. Thống kê bài thi                                                 │
│     GET /api/v1/submissions/exam/:examId/statistics                  │
│     → submissionRate, avgScore, highest, lowest, gradeDistribution  │
│                                                                      │
│  2. Tạo AI Report (exam-level)                                      │
│     POST /api/v1/ai-reports/exam/:examId                            │
│     → Gemini phân tích: phân bố điểm, câu khó, câu dễ, gợi ý        │
│     → Lưu ExamReport model                                          │
│                                                                      │
│  3. Tạo Exam Report (structured)                                    │
│     POST /api/v1/reports/exam/:examId/generate                      │
│     → Tính median, stdDev, hardest/easiest questions               │
│     → Top/bottom students, class comparison                          │
│     → Insights & recommendations                                     │
│                                                                      │
│  4. Xuất báo cáo                                                     │
│     GET /api/v1/reports/exam/:examId/export                         │
│     Backend:                                                         │
│     exportService.generateReport()                                  │
│       → PDF: jsPDF + jspdf-autotable, Vietnamese font               │
│       → Excel: ExcelJS + xlsx, formatted tables                      │
│       → Upload lên Cloudinary → trả URL                             │
│                                                                      │
│  5. Xuất kết quả thi                                                 │
│     GET /api/v1/exams/:id/results/export                            │
│     → PDF: Danh sách điểm theo lớp, biểu đồ phân bố                │
│     → Excel: raw data với formulas                                   │
│                                                                      │
│  6. Tiến độ học sinh                                                │
│     GET /api/v1/reports/student/:studentId/progress                 │
│     GET /api/v1/reports/student/:studentId/history                 │
│     GET /api/v1/reports/class/:classId/leaderboard                 │
│                                                                      │
│  [MOBILE APP]                                                        │
│     ReportExportModal.tsx                                           │
│       → Client-side OMR Sheet PDF generation                        │
│       → Export: exam results, class results, student results        │
│       → Options: include stats, grade distribution, answer key       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### UC-07: OMR Scanning — Chi tiết pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│  UC-07: OMR SCANNING PIPELINE                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [GIAO VIÊN — MOBILE APP]                                           │
│                                                                      │
│  1. Chọn đề thi → CameraScannerPage                                  │
│     GET /api/v1/omr-templates/exam/:examId                           │
│     → Lấy OMR template JSON cho Flutter                              │
│     → Chuyển đổi mm → px @ 300 DPI                                  │
│                                                                      │
│  2. Camera khởi tạo                                                  │
│     CameraBloc: CameraInitializing → CameraReady                     │
│     Camera stream: 30fps frames                                      │
│                                                                      │
│  3. Corner detection (real-time)                                    │
│     AppOMREngine (OpenCV Dart) trên mobile:                         │
│       → Edge detection → Contour approximation                       │
│       → Tìm 4 góc tờ phiếu                                         │
│       → Vẽ corner overlay (CornerOverlayPainter)                    │
│     CameraBloc: CameraCornerDetected → CameraStable (500ms)         │
│                                                                      │
│  4. Capture & Process                                               │
│     User tap capture                                                 │
│     CameraBloc: CameraCapturing → CameraImageReady                  │
│                                                                      │
│     OMRScannerBloc: ImageReady → Processing                          │
│     OMREngine.processImage():                                       │
│       → Perspective crop (4-point transform)                        │
│       → Adaptive threshold                                          │
│       → Bubble intensity reading                                    │
│       → Student code parsing (INT digits)                            │
│       → Answer reading (MCQ4/MCQ5)                                  │
│     OMRScannerBloc: Processing → Success(gradingResult)              │
│                                                                      │
│  5. Chọn học sinh + Submit                                          │
│     StudentPickerDialog: chọn student từ danh sách lớp              │
│     OMRScannerBloc: Success → Submitting                             │
│                                                                      │
│     Online: OMRSubmissionSyncService.submit() → POST /submissions   │
│     Offline: Lưu SharedPreferences → pending_submissions             │
│                                                                      │
│  [GIAO VIÊN — WEB APP]                                              │
│                                                                      │
│     ScanPage: Upload ảnh OMR                                         │
│     → POST /api/v1/submissions/scan                                 │
│     → Backend: Cloudinary upload → Python Bridge → Grading         │
│     → Trả kết quả về frontend                                       │
│                                                                      │
│  [BACKEND — SUBMISSION SCAN]                                        │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  submissionService.scan()                                │        │
│  │                                                          │        │
│  │  ① Xác thực exam tồn tại và đang active                 │        │
│  │  ② Upload ảnh lên Cloudinary                            │        │
│  │  ③ Gọi pythonBridgeService.processImage()               │        │
│  │     → Spawn `python scripts/omr_process.py`             │        │
│  │     → Write JSON input to stdin                        │        │
│  │     → Read JSON output from stdout                     │        │
│  │  ④ Parse kết quả: answers[], score, annotated_image     │        │
│  │  ⑤ Match với ExamVersion (theo versionCode)           │        │
│  │  ⑥ Grade: so sánh answers với answerKey               │        │
│  │  ⑦ Lưu Submission: answers[], totalScore, status      │        │
│  │  ⑧ Tạo notification cho student                        │        │
│  │  ⑨ (Optional) Trigger AI Report generation            │        │
│  │  ⑩ Return: submission + annotated_image_url          │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### UC-08: Xác thực & Quản lý phiên

```
┌─────────────────────────────────────────────────────────────────────┐
│  UC-08: XÁC THỰC VÀ QUẢN LÝ PHIÊN                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Đăng ký                                                          │
│     POST /api/v1/auth/register                                        │
│     Body: { email, password, name, schoolId, role }                  │
│     Backend:                                                         │
│       → Hash password (bcryptjs)                                      │
│       → Tạo User model                                                │
│       → Tạo JWT (access + refresh tokens)                           │
│       → Lưu refresh token vào Token collection                      │
│       → Gửi email xác thực (Nodemailer/SMTP)                        │
│     Response: { user, accessToken, refreshToken }                   │
│                                                                      │
│  2. Đăng nhập                                                        │
│     POST /api/v1/auth/login                                          │
│     Backend:                                                         │
│       → Tìm user by email                                            │
│       → Kiểm tra email verified (bypass in dev)                     │
│       → So sánh password (bcryptjs.compare)                          │
│       → Rate limit check                                             │
│       → Tạo access token (30 phút) + refresh token (30 ngày)       │
│       → Cập nhật lastLoginAt                                        │
│     Response: { user, accessToken, refreshToken }                   │
│                                                                      │
│  3. Sử dụng access token                                            │
│     Client gửi: Authorization: Bearer <accessToken>                 │
│     Backend Passport.js:                                             │
│       → Verify JWT signature                                         │
│       → Check token type = ACCESS                                    │
│       → Load user từ DB                                              │
│       → Attach to req.user                                          │
│                                                                      │
│  4. Refresh token (khi access hết hạn)                               │
│     POST /api/v1/auth/refresh-tokens                                 │
│     Body: { refreshToken }                                           │
│     Backend:                                                         │
│       → Verify refresh token                                         │
│       → Kiểm tra not blacklisted                                    │
│       → Tạo access token mới + refresh token mới                    │
│       → Blacklist refresh token cũ                                  │
│                                                                      │
│  5. Đăng xuất                                                        │
│     POST /api/v1/auth/logout                                         │
│     Backend:                                                         │
│       → Blacklist access token                                       │
│       → Xóa refresh token khỏi DB                                   │
│                                                                      │
│  6. Quên mật khẩu                                                    │
│     POST /api/v1/auth/forgot-password                                │
│     → Gửi email với reset token (10 phút)                          │
│     POST /api/v1/auth/reset-password                                 │
│     → Verify token → Hash password mới → Lưu                       │
│                                                                      │
│  7. Xác thực email                                                   │
│     GET /api/v1/auth/verify-email?token=...                         │
│     → Verify token → user.isEmailVerified = true                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. Bảo mật và Phân quyền

### 9.1 JWT Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    JWT AUTHENTICATION FLOW                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  LOGIN:                                                              │
│  ┌────────┐     POST /auth/login     ┌─────────────────────────┐   │
│  │ Client │ ────────────────────────→│ Server                  │   │
│  └────────┘                          │  ① Validate email/pass  │   │
│       ↑                              │  ② Create JWT          │   │
│       │  { accessToken,              │    - sub: userId       │   │
│       │    refreshToken }            │    - role: user.role   │   │
│       │  ←────────────────────────── │    - type: ACCESS      │   │
│       └───────────────────────────── │    - exp: 30min        │   │
│                                       │  ③ Store refresh in DB│  │
│                                       └─────────────────────────┘   │
│                                                                      │
│  API CALLS:                                                          │
│  ┌────────┐  Authorization: Bearer ...  ┌─────────────────────────┐ │
│  │ Client │ ──────────────────────────→│ Passport JWT Strategy   │ │
│  └────────┘                              │  ① Extract Bearer token │ │
│       ↑                                  │  ② Verify signature    │ │
│       │  Response                        │  ③ Check type=ACCESS    │ │
│       │  ←──────────────────────────────│  ④ Load user from DB    │ │
│       └─────────────────────────────────│  ⑤ req.user = user      │ │
│                                             └──────────┬──────────┘ │
│                                                        │              │
│                                                        ▼              │
│                                              ┌──────────────────┐    │
│                                              │ auth(rights)     │    │
│                                              │  Check roleRights │    │
│                                              └──────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 Role-Based Access Control (RBAC)

```
Role Rights Matrix:

admin:
  getUsers, manageUsers, manageSchools, manageSubjects,
  manageClasses, manageQuestions, manageExams,
  manageOMRTemplates, exportOMRTemplates, viewReports, manageAI

school-admin:
  manageUsers (school-scoped), manageClasses (school-scoped),
  manageQuestions (school-scoped), manageExams,
  exportOMRTemplates, viewReports, manageAI

teacher:
  manageClasses, manageQuestions, manageExams,
  exportOMRTemplates, scanSubmissions, reviewAppeals, viewReports

student:
  viewExams, submitAppeals, viewScores, viewAIReports, chatWithAI
```

### 9.3 Bảo mật khác

| Biện pháp | Mô tả |
|-----------|--------|
| Helmet | Security headers (XSS, MIME, clickjacking) |
| Rate Limiter | 20 failed auth attempts / 15 phút |
| bcryptjs | Password hashing (cost factor 10) |
| Soft delete | Không hard delete user/school/class |
| Cloudinary audit log | Log mọi thao tác upload ảnh |
| Token blacklist | Revoke token ngay lập tức khi logout |
| JWT expiration | Access: 30 phút, Refresh: 30 ngày |

---

## 10. Tích hợp bên thứ ba

| Dịch vụ | Mục đích | Fallback |
|---------|---------|---------|
| Google Gemini | AI Tutor, Question Generation, AI Reports | OpenAI → Claude |
| Cloudinary | Upload/host ảnh (OMR scans, avatars, report PDFs) | Local storage |
| MongoDB Atlas | Database | Local MongoDB |
| SMTP Server | Email: verify, reset password, notifications | - |
| OpenCV | OMR image processing (mobile) | - |

### 10.1 AI Provider Fallback Chain

```
AI Request
    │
    ▼
┌──────────────┐
│ Gemini API    │──fail──→ ┌──────────────┐──fail──→ ┌──────────────┐
│ (gemini-2.0-  │         │ OpenAI API   │         │ Claude API   │
│  flash)       │         │              │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
     primary                    fallback                  last resort
```

### 10.2 Cloudinary Upload Flow

```
Image File
    │
    ├── Mobile: StudentPickerDialog → capture → OMRSubmissionSyncService
    ├── Web: ScanPage → drag & drop / click
    └── Web: ReportExportModal → generate PDF → upload
    │
    ▼
GET /api/v1/upload/signature
  → Backend: cloudinaryService.generateSignature()
  → Return: { signature, timestamp, api_key, cloud_name, folder }
    │
    ▼
Client POST directly to Cloudinary
  → Binary upload with signature
  → Return: { public_id, secure_url }
    │
    ▼
Save URL to MongoDB (Submission.images, User.avatarUrl, etc.)
```

---

## 11. Mô hình dữ liệu tổng hợp

### 11.1 User Model

```javascript
User {
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (bcrypt hashed),
  role: "admin" | "school-admin" | "teacher" | "student" | "parent",
  isEmailVerified: Boolean,
  avatarUrl: String,
  phone: String,
  dateOfBirth: Date,
  gender: "male" | "female" | "other",
  address: String,
  schoolId: ObjectId (ref: School),
  classIds: [ObjectId] (ref: Class),
  isActive: Boolean,
  lastLoginAt: Date,
  // student-only
  studentCode: String,
  parentEmail: String,
  parentPhone: String,
  // teacher-only
  subjectIds: [ObjectId],
  // timestamps
  createdAt: Date,
  updatedAt: Date
}
```

### 11.2 Exam Model

```javascript
Exam {
  _id: ObjectId,
  title: String,
  description: String,
  classIds: [ObjectId],          // Nhiều lớp cùng 1 đề
  primaryClassId: ObjectId,
  subjectId: ObjectId (ref: Subject),  // Liên kết môn học
  subjectName: String,
  createdBy: ObjectId (ref: User),
  omrTemplateId: ObjectId (ref: OMRTemplate),
  omrOverrides: Object,
  examDate: Date,
  startTime: String,
  duration: Number (minutes),
  totalScore: Number,
  passingScore: Number,
  numberOfQuestions: Number,
  status: "draft" | "published" | "in_progress" | "completed" | "archived",
  numberOfVersions: Number,
  questionIds: [ObjectId],       // Question refs
  versions: [ObjectId],          // ExamVersion refs
  shuffleConfig: Object,
  totalStudents: Number,
  totalSubmissions: Number,
  publishedAt: Date,
  completedAt: Date,
  changeHistory: [{ action, changedBy, changedAt, details }]
}
```

### 11.3 Submission Model

```javascript
Submission {
  _id: ObjectId,
  examId: ObjectId (ref: Exam),
  versionId: ObjectId (ref: ExamVersion),
  omrTemplateId: ObjectId (ref: OMRTemplate),
  studentId: ObjectId (ref: User),
  studentCode: String,
  classId: ObjectId (ref: Class),
  answers: [{
    position: Number,             // Câu số 1, 2, 3...
    questionId: ObjectId,
    selectedAnswer: String,       // "A" | "B" | "C" | "D"
    correctAnswer: String,
    isCorrect: Boolean,
    score: Number,
    omrData: Object              // raw OMR detection data
  }],
  totalScore: Number,
  maxScore: Number,
  finalScore: Number,            // Sau khi appeal
  images: {
    original: String (Cloudinary URL),
    preprocessed: String,
    annotated: String
  },
  scanMetadata: Object,
  status: "pending" | "scanning" | "scanned" | "manual_review" |
          "completed" | "appealed",
  omrSummary: Object,
  manualOverrides: [{
    field: String,
    oldValue: Mixed,
    newValue: Mixed,
    reason: String,
    overriddenBy: ObjectId,
    overriddenAt: Date
  }],
  scannedBy: ObjectId,
  scannedAt: Date,
  reviewedBy: ObjectId,
  reviewedAt: Date
}
```

### 11.4 Appeal Model

```javascript
Appeal {
  _id: ObjectId,
  submissionId: ObjectId (ref: Submission),
  examId: ObjectId (ref: Exam),
  studentId: ObjectId (ref: User),
  questionId: ObjectId (ref: Question),
  questionPosition: Number,       // Câu số trong đề
  reason: String,                  // Lý do khiếu nại
  evidenceImageUrl: String,        // Ảnh chứng minh (optional)
  status: "pending" | "under_review" | "approved" | "rejected",
  teacherResponse: {
    reviewedBy: ObjectId,
    reviewedAt: Date,
    decision: "approved" | "rejected",
    note: String,
    scoreAdjustment: Number       // Điểm điều chỉnh (+0.5, +1, ...)
  },
  studentNotified: Boolean,
  studentNotifiedAt: Date
}
```

### 11.5 OMRTemplate Model

```javascript
OMRTemplate {
  _id: ObjectId,
  name: String,
  code: String (unique),
  description: String,
  pageConfig: {
    paperSize: "A4" | "A5" | "custom",
    customSize: { width: Number, height: Number },
    margins: { top, bottom, left, right }
  },
  zones: {
    header: Object,
    versionCode: { origin: [x, y], digits: Number },
    studentCode: { origin: [x, y], digits: Number },
    answerArea: Object,           // Grid layout
    footer: Object
  },
  scannerConfig: {
    orientation: "portrait" | "landscape",
    autoAlign: Boolean,
    preprocessing: [String],     // ["CropOnMarkers", "Levels"]
    detection: Object
  },
  validationRules: Object,
  level: "system" | "school" | "custom",
  schoolId: ObjectId (ref: School),
  isActive: Boolean,
  isDefault: Boolean,
  usageCount: Number,
  tags: [String]
}
```

---

## 12. Luồng dữ liệu End-to-End

### 12.1 Từ tạo đề thi đến xuất kết quả

```
[Giao viên tạo đề]
  createExam() → POST /exams
    → examService.create() → Exam (status=draft)
    → Mongoose save

[Gán câu hỏi]
  addQuestions() → PATCH /exams/:id
    → examService.update() → Exam.questionIds = [...]

[Tạo phiên bản đề]
  generateVersions() → POST /exams/:id/versions
    → examService.generateVersions()
      → Shuffle questionIds + options
      → Create ExamVersion per version
      → Save answerKey (Map<position, correctAnswer>)
      → Mongoose save ExamVersion

[Xuất phiếu trả lời]
  exportOMRSheet() → GET /exams/:id/versions/:code/pdf
    → omrTemplatePdfService.generateSheetPdf()
      → PDFKit: draw header, student code grid, version code grid
        answer area grid (A/B/C/D per question), footer
      → Buffer → Return PDF stream

[Publish đề thi]
  publishExam() → POST /exams/:id/publish
    → examService.publish()
      → Exam.status = published
      → Exam.publishedAt = now
      → Loop classIds → Notification (exam_published)
      → Schedule reminder notification (examDate - 1 day)

[Học sinh làm bài]
  (trên giấy OMR — không qua hệ thống)

[Giao viên quét OMR]
  scanOMR() → POST /submissions/scan
    → submissionService.scan()
      → Cloudinary upload → imageUrl
      → pythonBridge.processImage(imageUrl)
        → Spawn python process
        → stdin: { image, template, evaluation }
        → stdout: { answers, score, annotated }
      → Load ExamVersion by versionCode
      → Grade: loop answers → match answerKey → verdict
      → Save Submission
      → Trigger AI Report generation (async)
      → Notification (score_available)

[Xuất kết quả]
  exportResults() → GET /exams/:id/results/export
    → exportService.generateResultsExport()
      → Fetch all Submission for exam
      → Build PDF (jsPDF) or Excel (ExcelJS)
      → Upload to Cloudinary
      → Return downloadUrl
```

### 12.2 Offline Sync Flow (Mobile)

```
[Quét OMR khi offline]
  OMRScannerBloc: Submitting
    → OMRSubmissionSyncService.submit()
      → Try POST /submissions/scan
      → Catch NetworkException
        → Save to SharedPreferences["pending_submissions"]
          [
            {
              id: uuid,
              examId, studentId, answers[], timestamp, retryCount
            }
          ]

[App khởi động lại]
  HomePage.initState()
    → OMRSubmissionSyncService.syncPendingSubmissions()
      → Read SharedPreferences["pending_submissions"]
      → For each pending:
        → Try POST /submissions/scan
        → If success: remove from pending list
        → If fail: increment retryCount, keep in list
      → Write updated list to SharedPreferences
```

---

## Phụ lục: Key Files Reference

| File | Lines | Mô tả |
|------|-------|-------|
| `server/src/core.py` (OMR) | 729 | OMR reading algorithm |
| `server/src/evaluation.py` | 547 | Scoring engine |
| `server/src/controllers/exam.controller.js` | ~400 | Exam CRUD + versions |
| `server/src/services/submission.service.js` | ~350 | OMR scan pipeline |
| `server/src/services/export.service.js` | ~300 | PDF/Excel generation |
| `server/src/services/gemini.service.js` | ~250 | Multi-provider AI |
| `server/scripts/omr_process.py` | 322 | Node.js ↔ Python bridge |
| `client/mobile/lib/domain/omr/engine/omr_engine.dart` | ~300 | Mobile OMR processing |
| `client/web/src/presentation/store/examStore.ts` | ~200 | Zustand exam state |
| `client/web/src/pages/AppealsPage.tsx` | ~300 | Appeal management UI |

---

*Tài liệu này được tạo tự động bằng cách phân tích codebase SMART GRADING. Mọi thay đổi trong code nên được phản ánh vào tài liệu này.*
