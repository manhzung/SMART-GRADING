# Cấu trúc thư mục Chương 4 - Phân Tích Thiết Kế Hệ Thống

## Tổng quan cấu trúc

```
SOICT_DATN_Application_VIE_Template/
├── Chuong/
│   ├── 4_Bieu_do_Chuong4.md          # File chính chương 4 (đã có)
│   └── mermaid_diagrams.md           # Tổng hợp code Mermaid
│
├── Hinhve/                           # Thư mục chứa hình ảnh
│   ├── Chuong4/                      # Hình minh họa chương 4
│   │   ├── 4.1.2.1_BieuDoTangVaGoi.png
│   │   ├── 4.1.2.4_MienNghiepVu.png
│   │   ├── 4.1.3.1_Routers.png
│   │   ├── 4.1.3.2_Controllers.png
│   │   ├── 4.1.3.3_Services.png
│   │   ├── 4.1.3.4_Models.png
│   │   ├── 4.1.3.5_Pages.png
│   │   ├── 4.1.3.6_Components.png
│   │   ├── 4.1.3.7_Stores.png
│   │   ├── 4.1.3.8_Hooks.png
│   │   ├── 4.1.3.9_Screens.png
│   │   ├── 4.1.3.10_Widgets.png
│   │   ├── 4.1.3.11_Blocs.png
│   │   ├── 4.1.3.12_Repositories.png
│   │   ├── 4.1.3.13_TongHop.png
│   │   ├── 4.2.1.1_CreateExam_Sequence.png
│   │   ├── 4.2.1.2_ScanOMR_Sequence.png
│   │   ├── 4.2.1.3_Appeal_Sequence.png
│   │   ├── 4.2.2.1_ER_TongQuan.png
│   │   ├── 4.2.2.2_USER.png
│   │   ├── 4.2.2.3_EXAM.png
│   │   ├── 4.2.2.4_SUBMISSION.png
│   │   └── 4.2.2.5_APPEAL.png
```

---

## Chi tiết theo mục

### 4.1 Thiết kế kiến trúc

#### 4.1.1 Lựa chọn kiến trúc
- Mô tả kiến trúc phân tầng (Layered Architecture)
- Bảng so sánh 4 tầng: Presentation, Business, Service, Data

#### 4.1.2 Thiết kế tổng quan - Package Diagram
```
4.1.2.1 Biểu đồ tầng và gói tổng quan
4.1.2.2 Bảng tổng hợp các gói theo tầng
4.1.2.3 Chi tiết từng gói
    ├── Gói tầng Presentation (Backend) - Routers
    ├── Gói tầng Business (Backend) - Controllers
    ├── Gói tầng Service (Backend) - Services
    ├── Gói tầng Data (Backend) - Models
    ├── Gói tầng Presentation (Web) - Pages, Components
    ├── Gói tầng Business (Web) - Stores, Hooks
    ├── Gói tầng Service (Web) - ApiService
    ├── Gói tầng Data (Web) - Mock Data, Axios
    ├── Gói tầng Presentation (Mobile) - Screens, Widgets
    ├── Gói tầng Business (Mobile) - BLoCs
    ├── Gói tầng Service (Mobile) - ApiService, OMREngine
    └── Gói tầng Data (Mobile) - Repositories
4.1.2.4 Biểu đồ gói chi tiết theo miền nghiệp vụ
    ├── Miền: Xác thực (Auth)
    ├── Miền: Quản lý thi (Exam)
    ├── Miền: Nộp bài & chấm điểm (Submission)
    ├── Miền: Phúc khảo (Appeal)
    ├── Miền: Báo cáo (Report)
    └── Miền: Thông báo (Notification)
```

#### 4.1.3 Thiết kế chi tiết gói - Class Diagram
```
4.1.3.1 Gói Routers (Backend)
    ├── AuthRouter
    ├── ExamRouter
    ├── SubmissionRouter
    ├── AppealRouter
    ├── NotificationRouter
    ├── ReportRouter
    ├── ClassRouter
    ├── SchoolRouter
    ├── QuestionRouter
    ├── UserRouter
    └── Middleware (Auth, Role, Validation)

4.1.3.2 Gói Controllers (Backend)
    ├── AuthController
    ├── ExamController
    ├── SubmissionController
    ├── AppealController
    ├── NotificationController
    ├── ReportController
    ├── ClassController
    ├── SchoolController
    ├── QuestionController
    └── UserController

4.1.3.3 Gói Services (Backend)
    ├── AuthService
    ├── ExamService
    ├── SubmissionService
    ├── AppealService
    ├── NotificationService
    ├── ReportService
    ├── ClassService
    ├── SchoolService
    ├── QuestionService
    └── UserService

4.1.3.4 Gói Models (Backend)
    ├── UserModel
    ├── SchoolModel
    ├── ClassModel
    ├── ExamModel
    ├── ExamVersionModel
    ├── QuestionModel
    ├── SubmissionModel
    ├── AppealModel
    ├── NotificationModel
    └── OMRTemplateModel

4.1.3.5 Gói Pages (Frontend Web)
    ├── LoginPage
    ├── RegisterPage
    ├── ForgotPasswordPage
    ├── DashboardPage
    ├── ExamsPage
    ├── ExamDetailPage
    ├── CreateExamPage
    ├── EditExamPage
    ├── SubmissionsPage
    ├── AppealsPage
    ├── MyAppealsPage
    ├── ReportsPage
    ├── ScanPage
    ├── MyScoresPage
    ├── ProfilePage
    ├── SettingsPage
    ├── ClassesPage
    ├── ClassDetailPage
    ├── SchoolsPage
    ├── NotificationsPage
    ├── AnalyticsPage
    └── ApprovalPage

4.1.3.6 Gói Components (Frontend Web)
    ├── Layout
    │   ├── Sidebar
    │   ├── Header
    │   └── Footer
    ├── Common
    │   ├── DataTable
    │   ├── Modal
    │   ├── ConfirmDialog
    │   ├── Form
    │   ├── Button
    │   ├── Input
    │   ├── Select
    │   ├── DatePicker
    │   └── FileUpload
    ├── Exam
    │   ├── ExamCard
    │   ├── ExamList
    │   ├── ExamScoresModal
    │   ├── SubmissionDetailModal
    │   ├── AnswerEditTable
    │   └── ScoreDisplay
    ├── Appeal
    │   ├── OMRUpload
    │   ├── AppealForm
    │   └── AppealList
    └── Shared
        ├── UserAvatar
        ├── RoleBadge
        ├── StatusBadge
        ├── Toast
        ├── NotificationPanel
        ├── Pagination
        ├── SearchBar
        ├── FilterDropdown
        └── ExportButton

4.1.3.7 Gói Stores (Frontend Web)
    ├── authStore
    ├── examStore
    ├── submissionStore
    ├── appealStore
    ├── notificationStore
    ├── classStore
    ├── schoolStore
    └── uiStore

4.1.3.8 Gói Hooks (Frontend Web)
    ├── Auth: useAuth
    ├── Exam: useExam, useExams
    ├── Submission: useSubmission, useSubmissions
    ├── Appeal: useAppeal, useAppeals
    ├── Notification: useNotifications
    ├── Class: useClass, useClasses
    ├── School: useSchool, useSchools
    └── Common: useModal, useToast, usePagination, useDebounce

4.1.3.9 Gói Screens (Mobile)
    ├── LoginScreen
    ├── RegisterScreen
    ├── HomeScreen
    ├── ExamListScreen
    ├── ExamDetailScreen
    ├── ScanScreen
    ├── ScoreScreen
    ├── AppealsScreen
    ├── AppealDetailScreen
    ├── ProfileScreen
    ├── SettingsScreen
    ├── NotificationScreen
    └── HistoryScreen

4.1.3.10 Gói Widgets (Mobile)
    ├── ExamCard
    ├── ScoreDisplay
    ├── ScanOverlay
    ├── OMRPreview
    ├── QuestionCard
    ├── AnswerBubble
    ├── AppealCard
    ├── AppealStatusBadge
    ├── UserAvatar
    ├── RoleChip
    ├── LoadingSpinner
    ├── EmptyState
    ├── ErrorView
    ├── BottomNavBar
    └── AppBar

4.1.3.11 Gói BLoCs (Mobile)
    ├── BLoCs: AuthBloc, ExamBloc, ScanBloc, SubmissionBloc, AppealBloc, NotificationBloc, ProfileBloc, NavigationBloc
    ├── States: AuthState, ExamState, ScanState, SubmissionState, AppealState, NotificationState, ProfileState
    └── Events: AuthEvent, ExamEvent, ScanEvent, SubmissionEvent, AppealEvent

4.1.3.12 Gói ApiService & Repositories (Mobile)
    ├── API
    │   ├── ApiService
    │   ├── AuthApi
    │   ├── ExamApi
    │   ├── SubmissionApi
    │   ├── AppealApi
    │   ├── NotificationApi
    │   └── UserApi
    ├── OMR
    │   ├── OMREngine
    │   ├── ImageProcessor
    │   ├── BubbleDetector
    │   └── AnswerReader
    └── Repositories
        ├── AuthRepository
        ├── ExamRepository
        ├── SubmissionRepository
        ├── AppealRepository
        ├── LocalStorageRepository
        └── CacheRepository

4.1.3.13 Tổng hợp quan hệ giữa các gói
```

---

### 4.2 Thiết kế chi tiết

#### 4.2.1 Biểu đồ tuần tự (Sequence Diagram)
```
4.2.1.1 Use Case 1: Tạo và xuất bản đề thi (Create and Publish Exam)
    ├── Teacher → CreateExamPage
    ├── CreateExamPage → ExamStore
    ├── ExamStore → ApiService
    ├── ApiService → Backend
    ├── Backend → ExamController
    ├── ExamController → ExamService
    ├── ExamService → MongoDB
    ├── Tạo đề thi với questions
    └── Xuất bản: generateVersions → AMC → PDF

4.2.1.2 Use Case 2: Quét và chấm điểm OMR (Scan and Grade OMR)
    ├── Student → Mobile App
    ├── Mobile App → OMREngine
    ├── OMREngine: Tiền xử lý → Phát hiện bong bóng → Đọc đáp án
    ├── AMC Mode: Chấm local
    ├── Legacy Mode: Gửi Server → Python → OMRChecker
    └── NotificationService → Student

4.2.1.3 Use Case 3: Nộp và xử lý phúc khảo (Submit and Review Appeal)
    ├── Student → MyAppealsPage
    ├── CreateAppeal → AppealService
    ├── Teacher reviews → AppealController
    ├── Override answer → SubmissionService
    └── Notify → Student
```

#### 4.2.2 Thiết kế cơ sở dữ liệu (Database Design)
```
4.2.2.1 Biểu đồ ER tổng quan
    ├── USER ↔ SCHOOL ↔ CLASS
    ├── CLASS ↔ EXAM
    ├── EXAM ↔ EXAM_VERSION ↔ SUBMISSION
    ├── SUBMISSION ↔ APPEAL
    └── USER ↔ NOTIFICATION

4.2.2.2 USER Table
4.2.2.3 SCHOOL Table
4.2.2.4 CLASS Table
4.2.2.5 SUBJECT Table
4.2.2.6 EXAM Table
4.2.2.7 EXAM_VERSION Table
4.2.2.8 QUESTION Table
4.2.2.9 SUBMISSION Table
4.2.2.10 APPEAL Table
4.2.2.11 OMR_TEMPLATE Table
4.2.2.12 NOTIFICATION Table
```

---

## Quy ước đặt tên file hình ảnh

| Mục | Quy ước | Ví dụ |
|-----|---------|-------|
| Package Diagram | `<số>_<tên gói>_Package.png` | `4.1.2.1_TangVaGoi_Package.png` |
| Class Diagram | `<số>_<tên gói>_Class.png` | `4.1.3.4_Models_Class.png` |
| Sequence Diagram | `<số>_<tên use case>_Sequence.png` | `4.2.1.1_CreateExam_Sequence.png` |
| ER Diagram | `<số>_<tên bảng>_ER.png` | `4.2.2.2_USER_ER.png` |

---

## Thứ tự thiết kế đề xuất

1. **Biểu đồ tầng (4.1.2.1)** - Nền tảng hiểu kiến trúc
2. **Biểu đồ miền nghiệp vụ (4.1.2.4)** - Tổ chức theo domain
3. **Biểu đồ lớp Backend (4.1.3.1-4)** - Routers → Controllers → Services → Models
4. **Biểu đồ lớp Web (4.1.3.5-8)** - Pages → Components → Stores → Hooks
5. **Biểu đồ lớp Mobile (4.1.3.9-12)** - Screens → Widgets → BLoCs → Repositories
6. **Biểu đồ tuần tự (4.2.1)** - Luồng nghiệp vụ chính
7. **Biểu đồ ER (4.2.2)** - Thiết kế database
