# PHẦN 4.2.2 - THIẾT KẾ LỚP CHI TIẾT

---

# PHẦN 4.2.2.4 - LỚP AppealService (Backend)

## 4.2.2.4 Lớp AppealService

```mermaid
classDiagram
    class AppealService {
        <<service>>
        +appealModel: AppealModel
        +submissionService: SubmissionService
        +notificationService: NotificationService
        +userModel: UserModel

        +create(userId: string, data: CreateAppealDTO): Promise~Appeal~
        +findById(id: string): Promise~Appeal~
        +findByStudent(studentId: string, filters?: object): Promise~Appeal[]~
        +findByExam(examId: string, filters?: object): Promise~Appeal[]~
        +findPending(filters?: object): Promise~Appeal[]~
        +review(id: string, reviewData: ReviewAppealDTO): Promise~Appeal~
        +reject(id: string, reason: string): Promise~Appeal~
        +cancel(id: string, userId: string): Promise~Appeal~
        +getStatistics(examId: string): Promise~AppealStatistics~
        -_validateAppeal(appeal: Appeal): boolean
        -_notifyStudent(appeal: Appeal): Promise~void~
    }

    class AppealModel {
        <<model>>
        +_id: ObjectId
        +submissionId: ObjectId
        +studentId: ObjectId
        +examId: ObjectId
        +questionNumber: number
        +reason: string
        +status: enum
        +reviewedBy: ObjectId?
        +reviewedAt: Date?
        +result: enum
        +originalAnswer: string
        +suggestedAnswer: string
        +adminNote: string?
        +createdAt: Date
    }

    AppealService --> AppealModel : composition
    AppealService --> SubmissionService : dependency
    AppealService --> NotificationService : dependency
```

---

# PHẦN 4.2.2.5 - LỚP NotificationService (Backend)

## 4.2.2.5 Lớp NotificationService

```mermaid
classDiagram
    class NotificationService {
        <<service>>
        +notificationModel: NotificationModel
        +emailService: EmailService
        +pushService: PushService
        +userModel: UserModel

        +send(notification: SendNotificationDTO): Promise~Notification~
        +sendScoreNotification(submission: Submission): Promise~void~
        +sendBulkNotifications(userIds: string[], notification: SendNotificationDTO): Promise~void~
        +sendToRole(role: string, notification: SendNotificationDTO): Promise~void~
        +markAsRead(notificationId: string, userId: string): Promise~Notification~
        +markAllAsRead(userId: string): Promise~void~
        +getUnread(userId: string): Promise~Notification[]~
        +getAll(userId: string, filters?: object): Promise~Notification[]~
        +deleteOld(days: number): Promise~number~
        -_sendEmail(user: User, content: string): Promise~void~
        -_sendPush(user: User, title: string, body: string): Promise~void~
        -_createInApp(userId: string, data: NotificationData): Promise~Notification~
    }

    class NotificationModel {
        <<model>>
        +_id: ObjectId
        +userId: ObjectId
        +title: string
        +message: string
        +type: enum
        +data: object
        +isRead: boolean
        +readAt: Date?
        +channels: string[]
        +createdAt: Date
    }

    class EmailService {
        <<service>>
        +send(to: string, subject: string, html: string): Promise~void~
        +sendWithTemplate(to: string, templateId: string, data: object): Promise~void~
    }

    class PushService {
        <<service>>
        +send(userId: string, title: string, body: string, data?: object): Promise~void~
        +sendToMany(userIds: string[], title: string, body: string): Promise~void~
    }

    NotificationService --> NotificationModel : composition
    NotificationService --> EmailService : dependency
    NotificationService --> PushService : dependency
```

---

# PHẦN 4.2.2.6 - LỚP AuthService (Backend)

## 4.2.2.6 Lớp AuthService

```mermaid
classDiagram
    class AuthService {
        <<service>>
        +userModel: UserModel
        +schoolModel: SchoolModel
        +emailService: EmailService
        +jwtService: JwtService
        +bcrypt: BcryptService

        +register(data: RegisterDTO): Promise~User~
        +login(email: string, password: string): Promise~AuthResult~
        +logout(userId: string, token: string): Promise~void~
        +refreshToken(refreshToken: string): Promise~AuthResult~
        +verifyEmail(token: string): Promise~User~
        +forgotPassword(email: string): Promise~void~
        +resetPassword(token: string, newPassword: string): Promise~User~
        +changePassword(userId: string, oldPassword: string, newPassword: string): Promise~User~
        +updateProfile(userId: string, data: UpdateProfileDTO): Promise~User~
        +getProfile(userId: string): Promise~User~
        +validateToken(token: string): Promise~TokenPayload~
        -_hashPassword(password: string): Promise~string~
        -_comparePassword(password: string, hash: string): Promise~boolean~
        -_generateTokens(user: User): Promise~AuthTokens~
    }

    class UserModel {
        <<model>>
        +_id: ObjectId
        +email: string
        +password: string
        +name: string
        +role: enum
        +schoolId: ObjectId
        +isEmailVerified: boolean
        +studentCode: string?
        +classIds: ObjectId[]
    }

    class JwtService {
        <<service>>
        +generateAccessToken(user: User): string
        +generateRefreshToken(user: User): string
        +verifyAccessToken(token: string): TokenPayload
        +verifyRefreshToken(token: string): TokenPayload
    }

    class BcryptService {
        <<service>>
        +hash(password: string, rounds: number): Promise~string~
        +compare(password: string, hash: string): Promise~boolean~
    }

    AuthService --> UserModel : composition
    AuthService --> JwtService : dependency
    AuthService --> BcryptService : dependency
    AuthService --> EmailService : dependency
```

---

# PHẦN 4.2.2.7 - LỚP ClassService (Backend)

## 4.2.2.7 Lớp ClassService

```mermaid
classDiagram
    class ClassService {
        <<service>>
        +classModel: ClassModel
        +userModel: UserModel
        +subjectModel: SubjectModel

        +create(userId: string, data: CreateClassDTO): Promise~Class~
        +findById(id: string): Promise~Class~
        +findBySchool(schoolId: string, filters?: object): Promise~Class[]~
        +findByTeacher(teacherId: string): Promise~Class[]~
        +findByStudent(studentId: string): Promise~Class[]~
        +update(id: string, data: UpdateClassDTO): Promise~Class~
        +delete(id: string): Promise~void~
        +addStudents(classId: string, studentIds: string[]): Promise~Class~
        +removeStudents(classId: string, studentIds: string[]): Promise~Class~
        +setHomeroomTeacher(classId: string, teacherId: string): Promise~Class~
        +assignSubjectTeachers(classId: string, assignments: SubjectAssignment[]): Promise~Class~
        +getStudents(classId: string): Promise~User[]~
        +getTeachers(classId: string): Promise~User[]~
        -_validateClassData(data: CreateClassDTO): void
    }

    class ClassModel {
        <<model>>
        +_id: ObjectId
        +name: string
        +grade: number
        +schoolYear: string
        +schoolId: ObjectId
        +homeroomTeacherId: ObjectId
        +subjectTeacherIds: ObjectId[]
        +studentIds: ObjectId[]
        +subjectIds: ObjectId[]
        +createdBy: ObjectId
        +createdAt: Date
    }

    ClassService --> ClassModel : composition
    ClassService --> UserModel : dependency
    ClassService --> SubjectModel : dependency
```

---

# PHẦN 4.2.2.8 - LỚP AuthStore (Frontend)

## 4.2.2.8 Lớp AuthStore

```mermaid
classDiagram
    class AuthStore {
        <<store>>
        -user: User | null
        -token: string | null
        -refreshToken: string | null
        -isAuthenticated: boolean
        -isLoading: boolean
        -error: string | null

        +login(email: string, password: string): Promise~void~
        +register(data: RegisterDTO): Promise~void~
        +logout(): void
        +refreshToken(): Promise~void~
        +updateProfile(data: UpdateProfileDTO): Promise~void~
        +changePassword(oldPassword: string, newPassword: string): Promise~void~
        +forgotPassword(email: string): Promise~void~
        +resetPassword(token: string, newPassword: string): Promise~void~
        +verifyEmail(token: string): Promise~void~
        +clearError(): void
        +initialize(): Promise~void~
        -_setAuth(user: User, token: string, refreshToken: string): void
        -_clearAuth(): void
        -_restoreFromStorage(): void
    }

    class User {
        <<model>>
        +_id: string
        +email: string
        +name: string
        +role: string
        +schoolId: string
        +studentCode: string?
        +classIds: string[]
        +isEmailVerified: boolean
    }

    AuthStore ..> User : uses
    AuthStore ..> ApiService : uses
```

---

# PHẦN 4.2.2.9 - LỚP SubmissionStore (Frontend)

## 4.2.2.9 Lớp SubmissionStore

```mermaid
classDiagram
    class SubmissionStore {
        <<store>>
        -submissions: Submission[]
        -currentSubmission: Submission | null
        -examScores: Map~string, ExamScoreData~
        -isLoading: boolean
        -error: string | null
        -filters: SubmissionFilters

        +fetchSubmissions(filters?: SubmissionFilters): Promise~void~
        +fetchSubmissionById(id: string): Promise~void~
        +fetchMySubmissions(): Promise~void~
        +fetchExamScores(examId: string): Promise~ExamScoreData~
        +getStatistics(examId: string): Promise~ExamStatistics~
        +updateScore(submissionId: string, score: number): Promise~Submission~
        +clearFilters(): void
        +setFilter(key: string, value: any): void
    }

    class Submission {
        <<model>>
        +_id: string
        +examId: string
        +studentId: string
        +studentCode: string
        +answers: Answer[]
        +totalScore: number
        +maxScore: number
        +status: string
        +submittedAt: Date
    }

    class ExamScoreData {
        <<model>>
        +examId: string
        +submissions: Submission[]
        +statistics: {
            average: number
            highest: number
            lowest: number
            passRate: number
            total: number
        }
        +scoreDistribution: number[]
    }

    SubmissionStore ..> Submission : uses
    SubmissionStore ..> ExamScoreData : uses
```

---

# PHẦN 4.2.2.10 - LỚP ImageProcessor (Mobile)

## 4.2.2.10 Lớp ImageProcessor

```mermaid
classDiagram
    class ImageProcessor {
        <<processor>>
        -imageLib: ImageProcessingLib

        +preprocess(raw: Uint8List): ProcessedImage
        +enhanceContrast(image: Uint8List, factor: double): Uint8List
        +applyThreshold(image: Uint8List, method: ThresholdMethod): Uint8List
        +rotate(image: Uint8List, angle: double): Uint8List
        +resize(image: Uint8List, width: int, height: int): Uint8List
        +crop(image: Uint8List, rect: Rect): Uint8List
        +deskew(image: Uint8List): Uint8List
        +convertToGrayscale(image: Uint8List): Uint8List
        +removeNoise(image: Uint8List): Uint8List
        +detectSkewAngle(image: Uint8List): double
    }

    class ProcessedImage {
        <<model>>
        +data: Uint8List
        +width: int
        +height: int
        +format: ImageFormat
        +processingSteps: string[]
    }

    class ThresholdMethod {
        <<enum>>
        +SIMPLE
        +OTSU
        +ADAPTIVE_MEAN
        +ADAPTIVE_GAUSSIAN
    }

    ImageProcessor ..> ProcessedImage : produces
    ImageProcessor ..> ThresholdMethod : uses
```

---

# PHẦN 4.2.2.11 - LỚP BubbleDetector (Mobile)

## 4.2.2.11 Lớp BubbleDetector

```mermaid
classDiagram
    class BubbleDetector {
        <<detector>>
        -minBubbleArea: double
        -maxBubbleArea: double
        -fillThreshold: double

        +detect(image: Uint8List): List~Bubble~
        +findContours(image: Uint8List): List~Contour~
        +filterByArea(contours: List~Contour~, minArea: double, maxArea: double): List~Contour~
        +groupByRow(contours: List~Contour~): List~List~Contour~~
        +sortByPosition(bubbles: List~Bubble~): List~Bubble~
        +calculateFillRatio(contour: Contour, image: Uint8List): double
        +isFilled(contour: Contour, image: Uint8List, threshold: double): boolean
    }

    class Bubble {
        <<model>>
        +x: double
        +y: double
        +width: double
        +height: double
        +centerX: double
        +centerY: double
        +row: int
        +col: int
        +isFilled: boolean
        +fillRatio: double
        +boundingRect: Rect
    }

    class Contour {
        <<model>>
        +points: List~Point~
        +area: double
        +perimeter: double
        +boundingRect: Rect
        +center: Point
    }

    BubbleDetector ..> Bubble : creates
    BubbleDetector ..> Contour : uses
```

---

# PHẦN 4.2.2.12 - LỚP AnswerReader (Mobile)

## 4.2.2.12 Lớp AnswerReader

```mermaid
classDiagram
    class AnswerReader {
        <<reader>>
        -template: OMRTemplate

        +readStudentCode(bubbles: List~Bubble~): String
        +readVersionCode(bubbles: List~Bubble~): String
        +readAnswers(bubbles: List~Bubble~, numQuestions: int): Map~int, String~
        +mapBubbleToQuestion(bubble: Bubble): int
        +mapBubbleToOption(bubble: Bubble): String
        -_groupBubblesByRow(bubbles: List~Bubble~): List~List~Bubble~~
        -_decodeFilledBubbles(rowBubbles: List~Bubble~): String
        -_parseStudentCode(codeString: String): String
    }

    class OMRTemplate {
        <<model>>
        +_id: String
        +name: String
        +rows: int
        +cols: int
        +totalQuestions: int
        +optionsPerQuestion: int
        +studentCodeLength: int
        +versionCodeLength: int
        +codeStartRow: int
        +answerStartRow: int
    }

    class Bubble {
        <<model>>
        +x: double
        +y: double
        +row: int
        +col: int
        +isFilled: boolean
        +fillRatio: double
    }

    AnswerReader --> OMRTemplate : uses
    AnswerReader ..> Bubble : uses
```

---

# TỔNG HỢP CÁC LỚP

## Bảng tóm tắt tất cả các lớp

| # | Lớp | Nền tảng | Gói | Phương thức | Use Case |
|---|-----|----------|-----|-------------|----------|
| 1 | **AppealService** | Backend | services | 9 | UC-08 (Phúc khảo) |
| 2 | **NotificationService** | Backend | services | 9 | UC-07 (Thông báo) |
| 3 | **AuthService** | Backend | services | 13 | UC-00 (Đăng nhập) |
| 4 | **ClassService** | Backend | services | 12 | UC-03 (Quản lý lớp) |
| 5 | **AuthStore** | Frontend | stores | 12 | UC-00 (Xác thực) |
| 6 | **SubmissionStore** | Frontend | stores | 7 | UC-07 (Xem kết quả) |
| 7 | **ImageProcessor** | Mobile | engine | 10 | UC-02 (Xử lý ảnh) |
| 8 | **BubbleDetector** | Mobile | engine | 7 | UC-02 (Phát hiện bong bóng) |
| 9 | **AnswerReader** | Mobile | engine | 7 | UC-02 (Đọc đáp án) |

## Các lớp trình bày trong file chính

| # | Lớp | Mục | Ghi chú |
|---|-----|-----|---------|
| 1 | SubmissionService | 4.2.2.1 | Lớp cốt lõi |
| 2 | ExamService | 4.2.2.2 | Lớp quan trọng |
| 3 | OMREngine | 4.2.2.3 | Lõi OMR |
