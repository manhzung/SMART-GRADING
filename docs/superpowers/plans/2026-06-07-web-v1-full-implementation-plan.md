# SMART GRADING Web - Hoàn thiện Web 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện tất cả các pages, features, và integrations còn thiếu trong web project để tạo thành một ứng dụng hoàn chỉnh cho teacher/admin.

**Architecture:**
- Xây dựng thêm 4 pages mới: Analytics, Settings, Help, Appeals
- Mở rộng 5 pages placeholder: Submissions, Scan, Dashboard, Profile, Notifications
- Thêm ErrorBoundary và LoadingSpinner components
- Sử dụng CSS Modules (giữ nguyên như hiện tại)
- Tích hợp mock data layer cho dev offline
- Install Recharts cho charts/visualization
- Sử dụng jsPDF + xlsx cho export reports
- Xây dựng mock data services cho toàn bộ features

**Tech Stack:** React 19, TypeScript, Zustand, React Router v7, Recharts, jsPDF, xlsx, CSS Modules

---

## PHASE 1: Foundation Setup (Ngày 1)

### Task 1.1: Install dependencies & Create directory structure

**Files:**
- Modify: `client/web/package.json`

**Steps:**

- [ ] **Step 1: Install chart and report dependencies**

```bash
cd c:\TAILIEU\DATN\SMART GRADING\client\web
npm install recharts jspdf jspdf-autotable xlsx
npm install -D @types/jspdf-autotable
```

- [ ] **Step 2: Create missing directory structure**

```bash
mkdir -p src/presentation/components
mkdir -p src/features/scan
mkdir -p src/features/reports
mkdir -p src/features/student-progress
mkdir -p src/features/ai-tutor
mkdir -p src/features/appeals
mkdir -p src/services
mkdir -p src/types
```

---

### Task 1.2: Setup React Query & Error Boundary

**Files:**
- Create: `client/web/src/presentation/components/ErrorBoundary.tsx`
- Create: `client/web/src/presentation/components/ErrorBoundary.module.css`
- Create: `client/web/src/presentation/components/LoadingSpinner.tsx`
- Create: `client/web/src/presentation/components/LoadingSpinner.module.css`
- Create: `client/web/src/presentation/components/QueryProvider.tsx`
- Modify: `client/web/src/main.tsx`

**Steps:**

- [ ] **Step 1: Create ErrorBoundary component**

```tsx
// client/web/src/presentation/components/ErrorBoundary.tsx
import { Component, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className={styles.container}>
          <div className={styles.card}>
            <h2 className={styles.title}>Đã xảy ra lỗi</h2>
            <p className={styles.message}>
              {this.state.error?.message || 'Một lỗi không mong muốn đã xảy ra.'}
            </p>
            <button className={styles.btn} onClick={this.handleReset}>
              Thử lại
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

```css
/* client/web/src/presentation/components/ErrorBoundary.module.css */
.container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
}
.card {
  max-width: 480px;
  width: 100%;
  background: #fff;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}
.title {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px;
}
.message {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 24px;
  line-height: 1.6;
}
.btn {
  padding: 10px 24px;
  background: #0b2240;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.btn:hover { background: #1a3a5c; }
```

- [ ] **Step 2: Create LoadingSpinner component**

```tsx
// client/web/src/presentation/components/LoadingSpinner.tsx
import styles from './LoadingSpinner.module.css';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ size = 'md', label, fullScreen = false }: Props) {
  const spinnerClass = `${styles.spinner} ${styles[size]}`;
  const content = (
    <div className={styles.wrapper}>
      <div className={spinnerClass} />
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
  return fullScreen ? (
    <div className={styles.fullScreen}>{content}</div>
  ) : content;
}
```

```css
/* client/web/src/presentation/components/LoadingSpinner.module.css */
.fullScreen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 64px);
  padding: 40px;
}
.wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.spinner {
  border-radius: 50%;
  border: 3px solid #e2e8f0;
  border-top-color: #0b2240;
  animation: spin 0.7s linear infinite;
}
.sm { width: 20px; height: 20px; }
.md { width: 36px; height: 36px; }
.lg { width: 52px; height: 52px; }
@keyframes spin { to { transform: rotate(360deg); } }
.label {
  font-size: 13px;
  color: #64748b;
}
```

- [ ] **Step 3: Create QueryProvider**

```tsx
// client/web/src/presentation/components/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export default function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

- [ ] **Step 4: Update main.tsx to wrap with ErrorBoundary and QueryProvider**

```tsx
// client/web/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRoutes from './presentation/routes/AppRoutes'
import ErrorBoundary from './presentation/components/ErrorBoundary'
import QueryProvider from './presentation/components/QueryProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryProvider>
        <AppRoutes />
      </QueryProvider>
    </ErrorBoundary>
  </StrictMode>,
)
```

- [ ] **Step 5: Commit**

```bash
git add client/web/package.json client/web/src/presentation/components/ErrorBoundary.tsx client/web/src/presentation/components/ErrorBoundary.module.css client/web/src/presentation/components/LoadingSpinner.tsx client/web/src/presentation/components/LoadingSpinner.module.css client/web/src/presentation/components/QueryProvider.tsx client/web/src/main.tsx
git commit -m "chore(web): setup ErrorBoundary, LoadingSpinner, React Query provider"
```

---

### Task 1.3: Create centralized types

**Files:**
- Create: `client/web/src/types/index.ts`

**Steps:**

- [ ] **Step 1: Create centralized types file**

```ts
// client/web/src/types/index.ts

// ─── Core Entities ──────────────────────────────────────────────────────────

export interface User {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'parent';
  avatarUrl?: string;
  isEmailVerified: boolean;
  schoolId?: string;
  phone?: string;
  dateOfBirth?: string;
  classIds?: string[];
  subjectIds?: string[];
  studentCode?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface School {
  _id: string;
  name: string;
  code: string;
  address?: {
    street?: string;
    ward?: string;
    district?: string;
    city?: string;
  };
  logoUrl?: string;
  phone?: string;
  email?: string;
  website?: string;
  isActive: boolean;
}

export interface Class {
  _id: string;
  name: string;
  code: string;
  gradeLevel: number;
  academicYear: string;
  schoolId?: string;
  homeroomTeacherId?: User | string;
  subjectTeachers?: SubjectTeacher[];
  studentIds?: string[];
  isActive: boolean;
  enrollmentCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubjectTeacher {
  subjectId?: Subject | string;
  teacherId?: User | string;
  addedAt?: string;
}

export interface Subject {
  _id: string;
  name: string;
  code: string;
  description?: string;
  gradeLevel?: number[];
  iconUrl?: string;
  color: string;
  topics?: Topic[];
  isActive: boolean;
}

export interface Topic {
  _id: string;
  name: string;
  code?: string;
  parentTopicId?: string;
}

// ─── Exam & Questions ────────────────────────────────────────────────────────

export interface Question {
  _id: string;
  id: string;
  content: string;
  type: 'single_choice' | 'multiple_choice';
  options: QuestionOption[];
  correctAnswer?: 'A' | 'B' | 'C' | 'D';
  correctAnswers?: ('A' | 'B' | 'C' | 'D')[];
  score: number;
  difficulty: 'easy' | 'medium' | 'hard';
  topicId?: string;
  topicName?: string;
  createdBy?: User | string;
  source: 'ai' | 'manual' | 'imported';
  aiPrompt?: string;
  explanation?: string;
  imageUrl?: string;
  tags: string[];
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  usageCount: number;
  correctRate?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionOption {
  id: 'A' | 'B' | 'C' | 'D';
  content: string;
  isCorrect?: boolean;
  order?: number;
}

export interface Exam {
  _id: string;
  title: string;
  description?: string;
  classIds?: ClassRef[];
  primaryClassId?: ClassRef | string;
  subjectId?: Subject | string;
  examDate: string;
  startTime?: string;
  duration: number;
  totalScore: number;
  passingScore?: number;
  numberOfQuestions: number;
  status: 'draft' | 'published' | 'in_progress' | 'completed' | 'archived';
  createdBy?: User | string;
  publishedAt?: string;
  completedAt?: string;
  totalSubmissions?: number;
  totalStudents?: number;
  omrTemplateId?: OMRTemplate | string;
  printConfig?: PrintConfig;
  shuffleConfig?: ShuffleConfig;
  numberOfVersions?: number;
  questionIds?: (string | Question)[];
  versions?: ExamVersion[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassRef {
  _id: string;
  name: string;
  code?: string;
  studentCount?: number;
}

export interface ExamVersion {
  _id: string;
  examId: string;
  versionCode: string;
  numberOfQuestions: number;
  questions?: ExamVersionQuestion[];
  distribution?: Record<string, number>;
  submissionCount: number;
  pdfUrl?: string;
  answerSheetPdfUrl?: string;
  createdAt: string;
}

export interface ExamVersionQuestion {
  position: number;
  questionId: string;
  originalPosition: number;
  shuffledOptions: QuestionOption[];
}

export interface PrintConfig {
  paperSize?: 'A4' | 'A5';
  questionsPerPage?: number;
  includeAnswerSheet?: boolean;
  schoolHeader?: boolean;
}

export interface ShuffleConfig {
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
}

// ─── Submissions ────────────────────────────────────────────────────────────

export interface Submission {
  _id: string;
  examId: string | Exam;
  versionId?: string;
  studentId?: User | string;
  studentCode: string;
  totalScore: number;
  maxScore: number;
  finalScore: number;
  status: 'pending' | 'scanning' | 'scanned' | 'manual_review' | 'completed' | 'appealed';
  createdAt: string;
  updatedAt: string;
  scannedAt?: string;
  scannedBy?: User | string;
  reviewedAt?: string;
  reviewedBy?: User | string;
  omrSummary?: OMRSummary;
  images?: SubmissionImages;
}

export interface SubmissionImages {
  original?: { url: string; width: number; height: number; dpi: number; };
  preprocessed?: { url: string; width: number; height: number; };
  annotated?: { url: string; markers?: Marker[]; };
}

export interface Marker {
  type: 'correct' | 'incorrect' | 'double_fill' | 'empty';
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface OMRSummary {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  emptyCount: number;
  doubleFillCount: number;
  accuracy: number;
  ocrConfidence: number;
  warnings?: OMRWarning[];
}

export interface OMRWarning {
  type: string;
  positions: number[];
  message: string;
}

// ─── Appeals ────────────────────────────────────────────────────────────────

export interface Appeal {
  _id: string;
  submissionId: string | Submission;
  examId: string | Exam;
  studentId: User | string;
  questionId: string | Question;
  questionPosition: number;
  reason: string;
  evidenceImageUrl?: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  teacherResponse?: TeacherResponse;
  studentNotified: boolean;
  studentNotifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherResponse {
  reviewedBy: User | string;
  reviewedAt: string;
  decision: 'approved' | 'rejected';
  note?: string;
  scoreAdjustment?: {
    oldScore: number;
    newScore: number;
  };
}

// ─── Reports & Analytics ───────────────────────────────────────────────────

export interface ExamReport {
  _id: string;
  examId: string | Exam;
  statistics: ExamStatistics;
  scoreDistribution: ScoreDistributionItem[];
  gradeDistribution: GradeDistribution;
  questionAnalysis: QuestionAnalysis[];
  hardestQuestions: HardQuestion[];
  topStudents: RankedStudent[];
  bottomStudents: RankedStudent[];
  insights?: {
    overallAnalysis?: string;
    recommendations?: string[];
  };
  status: 'generating' | 'completed' | 'failed';
  pdfUrl?: string;
  excelUrl?: string;
  createdAt: string;
}

export interface ExamStatistics {
  totalStudents: number;
  submittedCount: number;
  averageScore: number;
  averagePercentage: number;
  highestScore: number;
  lowestScore: number;
  standardDeviation: number;
}

export interface ScoreDistributionItem {
  range: string;
  count: number;
  percentage: number;
}

export interface GradeDistribution {
  excellent: { count: number; percentage: number };
  good: { count: number; percentage: number };
  average: { count: number; percentage: number };
  poor: { count: number; percentage: number };
}

export interface QuestionAnalysis {
  questionId: string | Question;
  position: number;
  accuracy: number;
  correctCount: number;
  incorrectCount: number;
}

export interface HardQuestion {
  questionId: string | Question;
  accuracy: number;
}

export interface RankedStudent {
  studentId: User | string;
  score: number;
  rank: number;
}

// ─── Student Progress ──────────────────────────────────────────────────────

export interface StudentProgress {
  _id: string;
  studentId: User | string;
  schoolId: string | School;
  scoreHistory: ScoreHistoryItem[];
  overallAverageScore: number;
  totalExams: number;
  totalCorrect: number;
  totalQuestions: number;
  subjectPerformance: SubjectPerformance[];
  topicPerformance: TopicPerformance[];
  rankings: Ranking[];
}

export interface ScoreHistoryItem {
  examId: string | Exam;
  score: number;
  maxScore: number;
  percentage: number;
  grade: string;
  correctCount: number;
  examDate: string;
  subjectId?: string | Subject;
}

export interface SubjectPerformance {
  subjectId: string | Subject;
  averageScore: number;
  examCount: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TopicPerformance {
  topicId: string;
  correctCount: number;
  totalCount: number;
  accuracy: number;
}

export interface Ranking {
  examId: string | Exam;
  rank: number;
  totalStudents: number;
  percentile: number;
}

// ─── Notifications ─────────────────────────────────────────────────────────

export interface Notification {
  _id: string;
  userId: string | User;
  type: 'exam_published' | 'exam_reminder' | 'score_available' | 'appeal_submitted' | 'appeal_resolved' | 'ai_report_ready' | 'system';
  title: string;
  body?: string;
  data?: {
    examId?: string;
    submissionId?: string;
    appealId?: string;
  };
  isRead: boolean;
  readAt?: string;
  channels?: ('in_app' | 'email' | 'push')[];
  createdAt: string;
}

// ─── OMR Templates ─────────────────────────────────────────────────────────

export interface OMRTemplate {
  _id: string;
  name: string;
  code: string;
  description?: string;
  numberOfQuestions: number;
  bubblesPerRow?: number;
  hasNameField?: boolean;
  hasStudentCodeField?: boolean;
  hasSubjectField?: boolean;
  hasDateField?: boolean;
  createdAt?: string;
}

// ─── Pagination ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ─── API Response Types ─────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/web/src/types/index.ts
git commit -m "feat(web): add centralized TypeScript types"
```

---

### Task 1.4: Create mock data service

**Files:**
- Create: `client/web/src/services/mockData.ts`

**Steps:**

- [ ] **Step 1: Create mock data service**

```ts
// client/web/src/services/mockData.ts
import type {
  Exam, Submission, Appeal, ExamReport, StudentProgress,
  Notification, Question, Class, Subject, OMRTemplate, User
} from '../types';

// ─── Mock Users ─────────────────────────────────────────────────────────────

export const mockCurrentUser: User = {
  _id: 'user-001',
  id: 'user-001',
  name: 'Nguyễn Văn A',
  email: 'nguyenvana@smartgrading.com',
  role: 'teacher',
  avatarUrl: undefined,
  isEmailVerified: true,
  schoolId: 'school-001',
  phone: '0912345678',
  isActive: true,
  createdAt: '2024-09-01T00:00:00Z',
  updatedAt: '2024-09-01T00:00:00Z',
};

// ─── Mock Subjects ──────────────────────────────────────────────────────────

export const mockSubjects: Subject[] = [
  { _id: 'subj-001', name: 'Toán', code: 'MATH', color: '#4F46E5', isActive: true },
  { _id: 'subj-002', name: 'Ngữ văn', code: 'LIT', color: '#059669', isActive: true },
  { _id: 'subj-003', name: 'Tiếng Anh', code: 'ENG', color: '#D97706', isActive: true },
  { _id: 'subj-004', name: 'Vật lý', code: 'PHY', color: '#7C3AED', isActive: true },
  { _id: 'subj-005', name: 'Hóa học', code: 'CHEM', color: '#0891B2', isActive: true },
  { _id: 'subj-006', name: 'Sinh học', code: 'BIO', color: '#16A34A', isActive: true },
];

// ─── Mock Classes ──────────────────────────────────────────────────────────

export const mockClasses: Class[] = [
  { _id: 'cls-001', name: 'Lớp 12A1', code: '12A1', gradeLevel: 12, academicYear: '2025-2026', studentIds: Array.from({length:42}, (_,i)=>`stu-${i+1}`), isActive: true },
  { _id: 'cls-002', name: 'Lớp 12A2', code: '12A2', gradeLevel: 12, academicYear: '2025-2026', studentIds: Array.from({length:40}, (_,i)=>`stu-${i+100}`), isActive: true },
  { _id: 'cls-003', name: 'Lớp 11B3', code: '11B3', gradeLevel: 11, academicYear: '2025-2026', studentIds: Array.from({length:38}, (_,i)=>`stu-${i+200}`), isActive: true },
  { _id: 'cls-004', name: 'Lớp 10C1', code: '10C1', gradeLevel: 10, academicYear: '2025-2026', studentIds: Array.from({length:35}, (_,i)=>`stu-${i+300}`), isActive: true },
];

// ─── Mock Questions ─────────────────────────────────────────────────────────

export const mockQuestions: Question[] = Array.from({ length: 30 }, (_, i) => ({
  _id: `q-${i+1}`,
  id: `q-${i+1}`,
  content: i % 3 === 0
    ? `Cho hàm số $f(x)$ liên tục trên đoạn $[0, 1]$ thỏa mãn $f(1) = 0$. Tích phân $\\int_0^1 f(x)dx$ bằng?`
    : i % 3 === 1
    ? `Tìm tập nghiệm $S$ của bất phương trình $\\log_2(x-1) < 3$.`
    : `Hàm số bậc hai $y = ax^2 + bx + c$ có đồ thị là một parabol. Đỉnh của parabol có tọa độ là?`,
  type: 'single_choice',
  options: [
    { id: 'A', content: '1/2', isCorrect: i % 4 === 0 },
    { id: 'B', content: '1/3', isCorrect: i % 4 === 1 },
    { id: 'C', content: '0', isCorrect: i % 4 === 2 },
    { id: 'D', content: '1', isCorrect: i % 4 === 3 },
  ],
  correctAnswer: ['A', 'B', 'C', 'D'][i % 4] as 'A' | 'B' | 'C' | 'D',
  score: 1,
  difficulty: (['easy', 'medium', 'hard'] as const)[i % 3],
  source: i % 5 === 0 ? 'ai' : 'manual',
  tags: [mockSubjects[i % mockSubjects.length].name],
  isApproved: i % 3 !== 0,
  usageCount: Math.floor(Math.random() * 20),
  correctRate: Math.floor(Math.random() * 60) + 40,
  isActive: true,
  createdAt: '2024-10-01T00:00:00Z',
  updatedAt: '2024-10-01T00:00:00Z',
}));

// ─── Mock Exams ─────────────────────────────────────────────────────────────

export const mockExams: Exam[] = [
  {
    _id: 'exam-001',
    title: 'Kiểm tra Giữa kỳ I - Toán 12',
    description: 'Bài kiểm tra đánh giá kiến thức chương 1 và chương 2 môn Toán lớp 12.',
    classIds: [{ _id: 'cls-001', name: 'Lớp 12A1' }, { _id: 'cls-002', name: 'Lớp 12A2' }],
    primaryClassId: { _id: 'cls-001', name: 'Lớp 12A1' },
    subjectId: mockSubjects[0],
    examDate: '2026-01-15T08:00:00Z',
    startTime: '08:00',
    duration: 90,
    totalScore: 10,
    passingScore: 5,
    numberOfQuestions: 50,
    status: 'published',
    createdBy: mockCurrentUser,
    totalSubmissions: 85,
    totalStudents: 120,
    numberOfVersions: 4,
    createdAt: '2024-10-01T00:00:00Z',
    updatedAt: '2024-11-15T00:00:00Z',
  },
  {
    _id: 'exam-002',
    title: 'Kiểm tra 15 phút - Vật lý 12',
    description: 'Bài kiểm tra ngắn chương Dao động cơ.',
    classIds: [{ _id: 'cls-001', name: 'Lớp 12A1' }],
    subjectId: mockSubjects[3],
    examDate: '2026-06-10T14:00:00Z',
    startTime: '14:00',
    duration: 15,
    totalScore: 10,
    passingScore: 5,
    numberOfQuestions: 10,
    status: 'draft',
    createdBy: mockCurrentUser,
    totalSubmissions: 0,
    totalStudents: 42,
    numberOfVersions: 2,
    createdAt: '2024-11-01T00:00:00Z',
    updatedAt: '2024-11-01T00:00:00Z',
  },
  {
    _id: 'exam-003',
    title: 'Thi HK1 - Tiếng Anh 10',
    description: 'Đề thi học kỳ 1 môn Tiếng Anh lớp 10.',
    classIds: [{ _id: 'cls-004', name: 'Lớp 10C1' }],
    subjectId: mockSubjects[2],
    examDate: '2025-12-20T07:30:00Z',
    startTime: '07:30',
    duration: 60,
    totalScore: 10,
    passingScore: 4,
    numberOfQuestions: 40,
    status: 'completed',
    createdBy: mockCurrentUser,
    totalSubmissions: 35,
    totalStudents: 35,
    numberOfVersions: 3,
    createdAt: '2024-09-01T00:00:00Z',
    updatedAt: '2025-12-20T00:00:00Z',
  },
];

// ─── Mock Submissions ──────────────────────────────────────────────────────

const studentNames = ['Trần Minh Tuấn', 'Lê Hoàng Nam', 'Phạm Thị Hương', 'Ngô Đức Minh', 'Vũ Thị Lan', 'Đặng Quang Khải', 'Bùi Thị Mai', 'Hoàng Văn Hùng'];
export const mockSubmissions: Submission[] = Array.from({ length: 20 }, (_, i) => {
  const score = Math.floor(Math.random() * 10 * 10) / 10;
  const maxScore = 10;
  return {
    _id: `sub-${i+1}`,
    examId: mockExams[0]._id,
    studentCode: String(i + 1).padStart(3, '0'),
    totalScore: score,
    maxScore,
    finalScore: score,
    status: (['pending', 'scanned', 'completed', 'manual_review'] as const)[i % 4],
    createdAt: new Date(Date.now() - i * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - i * 3600000).toISOString(),
    omrSummary: {
      totalQuestions: 50,
      correctCount: Math.floor(score * 5),
      incorrectCount: Math.floor((10 - score) * 5) - (i % 3),
      emptyCount: i % 3,
      doubleFillCount: i % 5 === 0 ? 1 : 0,
      accuracy: score * 10,
      ocrConfidence: 95 + Math.random() * 5,
    },
  };
});

// ─── Mock Appeals ──────────────────────────────────────────────────────────

export const mockAppeals: Appeal[] = [
  {
    _id: 'appeal-001',
    submissionId: mockSubmissions[0]._id,
    examId: mockExams[0]._id,
    studentId: { _id: 'stu-001', name: 'Trần Minh Tuấn', email: 'truongminhtuan@school.edu', role: 'student' },
    questionId: mockQuestions[0]._id,
    questionPosition: 5,
    reason: 'Tôi đã tô đáp án B nhưng hệ thống chấm là A. Xin xem xét lại.',
    status: 'pending',
    studentNotified: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    _id: 'appeal-002',
    submissionId: mockSubmissions[1]._id,
    examId: mockExams[0]._id,
    studentId: { _id: 'stu-002', name: 'Lê Hoàng Nam', email: 'lehongnam@school.edu', role: 'student' },
    questionId: mockQuestions[3]._id,
    questionPosition: 12,
    reason: 'Đáp án bị nhòe do giấy ướt, xin phúc khảo.',
    status: 'under_review',
    teacherResponse: {
      reviewedBy: mockCurrentUser,
      reviewedAt: new Date(Date.now() - 43200000).toISOString(),
      decision: 'under_review',
      note: 'Đang xem xét bằng chứng.',
    },
    studentNotified: true,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
  },
];

// ─── Mock Exam Report ──────────────────────────────────────────────────────

export const mockExamReport: ExamReport = {
  _id: 'report-001',
  examId: mockExams[0]._id,
  statistics: {
    totalStudents: 120,
    submittedCount: 85,
    averageScore: 7.3,
    averagePercentage: 73,
    highestScore: 9.5,
    lowestScore: 3.0,
    standardDeviation: 1.8,
  },
  scoreDistribution: [
    { range: '0-2', count: 3, percentage: 2.5 },
    { range: '2-4', count: 8, percentage: 6.7 },
    { range: '4-6', count: 22, percentage: 18.3 },
    { range: '6-8', count: 35, percentage: 29.2 },
    { range: '8-10', count: 17, percentage: 14.2 },
  ],
  gradeDistribution: {
    excellent: { count: 17, percentage: 14.2 },
    good: { count: 35, percentage: 29.2 },
    average: { count: 22, percentage: 18.3 },
    poor: { count: 11, percentage: 9.2 },
  },
  questionAnalysis: mockQuestions.slice(0, 10).map((q, i) => ({
    questionId: q._id,
    position: i + 1,
    accuracy: Math.floor(Math.random() * 50) + 50,
    correctCount: Math.floor(Math.random() * 80) + 10,
    incorrectCount: Math.floor(Math.random() * 40),
  })),
  hardestQuestions: mockQuestions.slice(0, 3).map(q => ({
    questionId: q._id,
    accuracy: Math.floor(Math.random() * 30) + 20,
  })),
  topStudents: [
    { studentId: { _id: 'stu-001', name: 'Trần Minh Tuấn', email: '', role: 'student' }, score: 9.5, rank: 1 },
    { studentId: { _id: 'stu-002', name: 'Lê Hoàng Nam', email: '', role: 'student' }, score: 9.2, rank: 2 },
    { studentId: { _id: 'stu-003', name: 'Phạm Thị Hương', email: '', role: 'student' }, score: 9.0, rank: 3 },
  ],
  bottomStudents: [
    { studentId: { _id: 'stu-010', name: 'Đặng Văn Tùng', email: '', role: 'student' }, score: 3.0, rank: 85 },
    { studentId: { _id: 'stu-011', name: 'Nguyễn Thị Thanh', email: '', role: 'student' }, score: 3.5, rank: 84 },
    { studentId: { _id: 'stu-012', name: 'Trịnh Đình Phong', email: '', role: 'student' }, score: 4.0, rank: 83 },
  ],
  insights: {
    overallAnalysis: 'Kết quả thi tương đối tốt, đa số học sinh đạt điểm trung bình trở lên.',
    recommendations: ['Cần ôn lại chủ đề Hàm số', 'Tăng cường bài tập về Giới hạn', 'Cải thiện kỹ năng tính toán nhanh'],
  },
  status: 'completed',
  createdAt: new Date().toISOString(),
};

// ─── Mock Student Progress ──────────────────────────────────────────────────

export const mockStudentProgress: StudentProgress = {
  _id: 'progress-001',
  studentId: { _id: 'stu-001', name: 'Trần Minh Tuấn', email: 'truongminhtuan@school.edu', role: 'student' },
  schoolId: 'school-001',
  scoreHistory: mockExams.map((e, i) => ({
    examId: e._id,
    score: [9.5, 8.2, 7.8][i] ?? 8.0,
    maxScore: 10,
    percentage: [95, 82, 78][i] ?? 80,
    grade: ['A', 'B+', 'B'][i] ?? 'B',
    correctCount: Math.floor(([9.5, 8.2, 7.8][i] ?? 8) * 5),
    examDate: e.examDate,
    subjectId: e.subjectId?._id,
  })),
  overallAverageScore: 8.5,
  totalExams: 3,
  totalCorrect: 120,
  totalQuestions: 150,
  subjectPerformance: mockSubjects.slice(0, 3).map((s, i) => ({
    subjectId: s._id,
    averageScore: [9.5, 8.5, 7.5][i] ?? 8.0,
    examCount: 1,
    trend: (['up', 'stable', 'down'] as const)[i % 3],
  })),
  topicPerformance: [],
  rankings: mockExams.map((e, i) => ({
    examId: e._id,
    rank: [1, 3, 5][i] ?? 10,
    totalStudents: [42, 42, 35][i] ?? 40,
    percentile: [97, 93, 86][i] ?? 75,
  })),
};

// ─── Mock Notifications ────────────────────────────────────────────────────

export const mockNotifications: Notification[] = [
  { _id: 'notif-001', userId: 'user-001', type: 'exam_published', title: 'Bài thi mới được phát hành', body: 'Kiểm tra Giữa kỳ I - Toán 12 đã được phát hành cho các lớp 12A1, 12A2.', isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { _id: 'notif-002', userId: 'user-001', type: 'appeal_submitted', title: 'Yêu cầu phúc khảo mới', body: 'Trần Minh Tuấn đã gửi yêu cầu phúc khảo cho câu hỏi #5.', isRead: false, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { _id: 'notif-003', userId: 'user-001', type: 'score_available', title: 'Có điểm thi mới', body: '120 bài thi đã được chấm xong.', isRead: true, readAt: new Date(Date.now() - 172800000).toISOString(), createdAt: new Date(Date.now() - 259200000).toISOString() },
  { _id: 'notif-004', userId: 'user-001', type: 'system', title: 'Cập nhật hệ thống', body: 'Hệ thống Smart Grading đã được cập nhật lên phiên bản 2.0.', isRead: true, readAt: new Date(Date.now() - 604800000).toISOString(), createdAt: new Date(Date.now() - 691200000).toISOString() },
];

// ─── Mock OMR Templates ────────────────────────────────────────────────────

export const mockOMRTemplates: OMRTemplate[] = [
  { _id: 'omr-001', name: 'Phiếu 50 câu - Tiêu chuẩn', code: 'OMR_50_STD', numberOfQuestions: 50, bubblesPerRow: 5, hasStudentCodeField: true, hasDateField: true, createdAt: '2024-01-01T00:00:00Z' },
  { _id: 'omr-002', name: 'Phiếu 30 câu - Giữa kỳ', code: 'OMR_30_MID', numberOfQuestions: 30, bubblesPerRow: 5, hasStudentCodeField: true, createdAt: '2024-01-01T00:00:00Z' },
  { _id: 'omr-003', name: 'Phiếu 15 câu - 15 phút', code: 'OMR_15_SHORT', numberOfQuestions: 15, bubblesPerRow: 5, hasStudentCodeField: true, createdAt: '2024-01-01T00:00:00Z' },
];

// ─── Dashboard Mock Stats ──────────────────────────────────────────────────

export const mockDashboardStats = {
  stats: {
    totalClasses: 4,
    totalStudents: 155,
    activeExams: 2,
    scoredPapers: 120,
  },
  recentExams: mockExams.slice(0, 3),
  upcomingExams: mockExams.filter(e => e.status === 'draft' || e.status === 'published'),
  activities: [
    { id: 1, title: 'Class 12A1 paper graded', description: 'Mathematics Mid-term results have been uploaded.', time: '10 mins ago', dotColor: '#0b2240' },
    { id: 2, title: "New exam 'Mid-term Math' generated", description: 'Automatic question generation completed for 12A1/12A2.', time: '45 mins ago', dotColor: '#0b2240' },
    { id: 3, title: "Student 'Nguyen Van A' requested review", description: 'Review request for Question #14 regarding logic validation.', time: '2 hours ago', dotColor: '#b45309' },
    { id: 4, title: 'Question Bank Update', description: '32 new Calculus problems added to the shared repository.', time: 'Yesterday', dotColor: '#0b2240' },
  ],
};

// ─── Analytics Mock Data ──────────────────────────────────────────────────

export const mockAnalyticsData = {
  overviewStats: {
    totalExams: 24,
    totalStudents: 155,
    averageScore: 7.4,
    examsThisMonth: 5,
    submissionsThisWeek: 85,
  },
  scoreTrendData: Array.from({ length: 12 }, (_, i) => ({
    month: ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'][i],
    avgScore: 6.5 + Math.random() * 2.5,
    examCount: Math.floor(Math.random() * 5) + 1,
  })),
  subjectPerformance: mockSubjects.slice(0, 4).map(s => ({
    subject: s.name,
    avgScore: 6 + Math.random() * 3,
    examCount: Math.floor(Math.random() * 8) + 2,
    color: s.color,
  })),
  gradeDistribution: [
    { grade: 'Giỏi (8-10)', count: 32, percentage: 26, color: '#16A34A' },
    { grade: 'Khá (6.5-8)', count: 45, percentage: 37, color: '#2563EB' },
    { grade: 'Trung bình (5-6.5)', count: 30, percentage: 25, color: '#D97706' },
    { grade: 'Yếu (<5)', count: 13, percentage: 11, color: '#DC2626' },
  ],
  topStudents: Array.from({ length: 10 }, (_, i) => ({
    name: ['Trần Minh Tuấn', 'Lê Hoàng Nam', 'Phạm Thị Hương', 'Ngô Đức Minh', 'Vũ Thị Lan', 'Đặng Quang Khải', 'Bùi Thị Mai', 'Hoàng Văn Hùng', 'Trịnh Thanh Hà', 'Lý Minh Đức'][i],
    class: ['12A1', '12A1', '12A2', '12A1', '11B3', '12A2', '10C1', '12A1', '11B3', '10C1'][i],
    avgScore: (9.5 - i * 0.3).toFixed(1),
    trend: (['up', 'up', 'stable', 'down', 'up', 'stable', 'up', 'down', 'up', 'stable'] as const)[i],
  })),
  recentSubmissions: mockSubmissions.slice(0, 8),
  examCompletionRate: [
    { month: 'T1', rate: 92 },
    { month: 'T2', rate: 88 },
    { month: 'T3', rate: 95 },
    { month: 'T4', rate: 91 },
    { month: 'T5', rate: 97 },
    { month: 'T6', rate: 94 },
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add client/web/src/services/mockData.ts
git commit -m "feat(web): add comprehensive mock data service for offline development"
```

---

## PHASE 2: Complete Missing & Placeholder Pages (Ngày 2-3)

### Task 2.1: Complete SubmissionsPage

**Files:**
- Modify: `client/web/src/pages/SubmissionsPage.tsx` (rewrite completely)
- Modify: `client/web/src/pages/SubmissionsPage.module.css` (read first, then rewrite)

**Steps:**

- [ ] **Step 1: Read existing CSS file**

```bash
cat client/web/src/pages/SubmissionsPage.module.css
```

- [ ] **Step 2: Rewrite SubmissionsPage with full functionality**

```tsx
// client/web/src/pages/SubmissionsPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Eye, Trash2, Download, CheckCircle, Clock, AlertCircle, ChevronLeft, ChevronRight, RefreshCw, BarChart3 } from 'lucide-react';
import { useSubmissionStore } from '../presentation/store/submissionStore';
import { useExamStore } from '../presentation/store/examStore';
import { mockSubmissions, mockExams, mockAnalyticsData } from '../services/mockData';
import type { Submission } from '../types';
import styles from './SubmissionsPage.module.css';

const STATUS_CONFIG = {
  pending: { label: 'Chờ xử lý', color: '#D97706', bg: '#FEF3C7', icon: Clock },
  scanning: { label: 'Đang quét', color: '#2563EB', bg: '#DBEAFE', icon: RefreshCw },
  scanned: { label: 'Đã quét', color: '#7C3AED', bg: '#EDE9FE', icon: CheckCircle },
  manual_review: { label: 'Xem xét thủ công', color: '#DC2626', bg: '#FEE2E2', icon: AlertCircle },
  completed: { label: 'Hoàn thành', color: '#16A34A', bg: '#DCFCE7', icon: CheckCircle },
  appealed: { label: 'Có khiếu nại', color: '#EC4899', bg: '#FCE7F3', icon: AlertCircle },
};

const GRADE_THRESHOLDS = [
  { min: 9, label: 'A', color: '#16A34A', bg: '#DCFCE7' },
  { min: 8, label: 'B+', color: '#059669', bg: '#D1FAE5' },
  { min: 7, label: 'B', color: '#2563EB', bg: '#DBEAFE' },
  { min: 6, label: 'C+', color: '#D97706', bg: '#FEF3C7' },
  { min: 5, label: 'C', color: '#EA580C', bg: '#FFEDD5' },
  { min: 0, label: 'F', color: '#DC2626', bg: '#FEE2E2' },
];

function getGrade(score: number, maxScore: number): { label: string; color: string; bg: string } {
  const pct = (score / maxScore) * 10;
  return GRADE_THRESHOLDS.find(g => pct >= g.min) || GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1];
}

export default function SubmissionsPage() {
  const { submissions, statistics, isLoading, fetchByExam, fetchStatistics, deleteSubmission } = useSubmissionStore();
  const { exams, fetchExams } = useExamStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [examFilter, setExamFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const itemsPerPage = 10;

  // Use mock data when API not available
  const dataSource = submissions.length > 0 ? submissions : mockSubmissions;
  const examsSource = exams.length > 0 ? exams : mockExams;

  useEffect(() => {
    if (exams.length === 0) fetchExams();
  }, [fetchExams, exams.length]);

  // Stats from mock analytics if not available
  const statsSource = statistics || mockAnalyticsData.recentSubmissions.length > 0
    ? {
        totalSubmissions: dataSource.length,
        submittedCount: dataSource.filter(s => s.status === 'completed').length,
        averageScore: dataSource.reduce((sum, s) => sum + (s.totalScore / s.maxScore) * 10, 0) / dataSource.length,
        pendingCount: dataSource.filter(s => s.status === 'pending').length,
        scannedCount: dataSource.filter(s => s.status === 'scanned').length,
      }
    : null;

  const filteredData = useMemo(() => {
    return dataSource.filter(s => {
      const matchesSearch = !searchQuery ||
        s.studentCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || s.status === statusFilter;
      const matchesExam = !examFilter || (typeof s.examId === 'string' ? s.examId === examFilter : (s.examId as any)?._id === examFilter);
      return matchesSearch && matchesStatus && matchesExam;
    });
  }, [dataSource, searchQuery, statusFilter, examFilter]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bài nộp này?')) {
      try { await deleteSubmission(id); } catch { /* continue with mock */ }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Quản lý bài nộp</h1>
          <p>Giám sát và chấm điểm các bài thi đã nộp</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.exportBtn} onClick={() => alert('Đang xuất Excel...')}>
            <Download size={16} />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {statsSource && (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{statsSource.totalSubmissions}</span>
            <span className={styles.statLabel}>Tổng bài nộp</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{statsSource.submittedCount}</span>
            <span className={styles.statLabel}>Đã chấm xong</span>
          </div>
          <div className={styles.statCard}>
            <span className={`${styles.statValue} ${styles.statAccent}`}>
              {(statsSource.averageScore || 0).toFixed(1)}
            </span>
            <span className={styles.statLabel}>Điểm TB</span>
          </div>
          <div className={styles.statCard}>
            <span className={`${styles.statValue} ${styles.statWarning}`}>{statsSource.pendingCount}</span>
            <span className={styles.statLabel}>Chờ xử lý</span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm theo mã sinh viên, tên..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={examFilter}
          onChange={(e) => { setExamFilter(e.target.value); setCurrentPage(1); }}
        >
          <option value="">Tất cả bài thi</option>
          {examsSource.map(e => (
            <option key={e._id} value={e._id}>{e.title}</option>
          ))}
        </select>

        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        {isLoading && dataSource.length === 0 ? (
          <div className={styles.loadingState}>Đang tải dữ liệu...</div>
        ) : filteredData.length === 0 ? (
          <div className={styles.emptyState}>
            <BarChart3 size={48} style={{ color: '#9CA3AF', marginBottom: 12 }} />
            <h3>Không có bài nộp nào</h3>
            <p>Tải ảnh phiếu trả lời từ trang Quét OMR để bắt đầu.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mã SBD</th>
                <th>Bài thi</th>
                <th>Điểm</th>
                <th>Xếp loại</th>
                <th>Trạng thái</th>
                <th>Thời gian nộp</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map(sub => {
                const cfg = STATUS_CONFIG[sub.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                const grade = getGrade(sub.totalScore, sub.maxScore);
                const examTitle = typeof sub.examId === 'string'
                  ? examsSource.find(e => e._id === sub.examId)?.title || sub.examId
                  : (sub.examId as any)?.title || 'N/A';

                return (
                  <tr key={sub._id}>
                    <td><span className={styles.studentCode}>{sub.studentCode}</span></td>
                    <td className={styles.examTitleCell}>{examTitle}</td>
                    <td>
                      <span className={styles.scoreValue}>
                        {sub.totalScore.toFixed(1)}/{sub.maxScore}
                      </span>
                    </td>
                    <td>
                      <span className={styles.gradeBadge} style={{ color: grade.color, background: grade.bg }}>
                        {grade.label}
                      </span>
                    </td>
                    <td>
                      <span className={styles.statusBadge} style={{ color: cfg.color, background: cfg.bg }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className={styles.timeCell}>
                      {new Date(sub.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td>
                      <div className={styles.actionBtns}>
                        <button className={styles.actionBtn} onClick={() => setSelectedSubmission(sub)} title="Xem chi tiết">
                          <Eye size={15} />
                        </button>
                        <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={() => handleDelete(sub._id)} title="Xóa">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            Hiển thị {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredData.length)} / {filteredData.length}
          </span>
          <div className={styles.paginationBtns}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={styles.pageBtn}>
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) => p === '...' ? (
                <span key={`ellipsis-${idx}`} className={styles.ellipsis}>...</span>
              ) : (
                <button
                  key={p}
                  className={`${styles.pageBtn} ${currentPage === p ? styles.pageBtnActive : ''}`}
                  onClick={() => setCurrentPage(p as number)}
                >
                  {p}
                </button>
              ))
            }
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className={styles.pageBtn}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSubmission && (
        <div className={styles.modalOverlay} onClick={() => setSelectedSubmission(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Chi tiết bài nộp</h2>
              <button onClick={() => setSelectedSubmission(null)} className={styles.closeBtn}>&times;</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Mã SBD</span>
                  <span className={styles.detailValue}>{selectedSubmission.studentCode}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Điểm</span>
                  <span className={styles.detailValue}>
                    {selectedSubmission.totalScore.toFixed(1)}/{selectedSubmission.maxScore}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Xếp loại</span>
                  <span className={styles.detailValue}>{getGrade(selectedSubmission.totalScore, selectedSubmission.maxScore).label}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Trạng thái</span>
                  <span className={styles.detailValue}>
                    {STATUS_CONFIG[selectedSubmission.status as keyof typeof STATUS_CONFIG]?.label || selectedSubmission.status}
                  </span>
                </div>
              </div>
              {selectedSubmission.omrSummary && (
                <div className={styles.omrSummary}>
                  <h3>Thống kê OMR</h3>
                  <div className={styles.omrGrid}>
                    <div className={styles.omrItem}>
                      <span className={styles.omrValue} style={{ color: '#16A34A' }}>{selectedSubmission.omrSummary.correctCount}</span>
                      <span className={styles.omrLabel}>Đúng</span>
                    </div>
                    <div className={styles.omrItem}>
                      <span className={styles.omrValue} style={{ color: '#DC2626' }}>{selectedSubmission.omrSummary.incorrectCount}</span>
                      <span className={styles.omrLabel}>Sai</span>
                    </div>
                    <div className={styles.omrItem}>
                      <span className={styles.omrValue} style={{ color: '#9CA3AF' }}>{selectedSubmission.omrSummary.emptyCount}</span>
                      <span className={styles.omrLabel}>Bỏ trống</span>
                    </div>
                    <div className={styles.omrItem}>
                      <span className={styles.omrValue} style={{ color: '#D97706' }}>{selectedSubmission.omrSummary.accuracy.toFixed(1)}%</span>
                      <span className={styles.omrLabel}>Độ chính xác OCR</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Read existing CSS, then write new CSS**

```bash
cat client/web/src/pages/SubmissionsPage.module.css
```

```css
/* client/web/src/pages/SubmissionsPage.module.css */
.container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}
.header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px;
}
.header p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}
.headerActions {
  display: flex;
  gap: 12px;
}
.exportBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #0b2240;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.exportBtn:hover { background: #1a3a5c; }

.statsRow {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.statCard {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.statValue {
  font-size: 28px;
  font-weight: 700;
  color: #0b2240;
}
.statAccent { color: #2563EB; }
.statWarning { color: #D97706; }
.statLabel {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.searchBox {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0 12px;
  flex: 1;
  min-width: 200px;
}
.searchBox svg { color: #9ca3af; flex-shrink: 0; }
.searchBox input {
  border: none;
  outline: none;
  padding: 10px 0;
  font-size: 14px;
  width: 100%;
  background: transparent;
}
.filterSelect {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  cursor: pointer;
  min-width: 160px;
}
.filterSelect:focus { outline: none; border-color: #0b2240; }

.tableWrapper {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  overflow: hidden;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.table th {
  background: #f8fafc;
  padding: 12px 16px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e2e8f0;
}
.table td {
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #1e293b;
  vertical-align: middle;
}
.table tbody tr:hover { background: #f8fafc; }
.table tbody tr:last-child td { border-bottom: none; }

.studentCode {
  font-family: 'SF Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 4px;
  color: #0b2240;
}
.examTitleCell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.scoreValue {
  font-weight: 600;
  font-size: 13px;
}
.gradeBadge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
}
.statusBadge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}
.timeCell {
  font-size: 12px;
  color: #64748b;
}
.actionBtns {
  display: flex;
  gap: 4px;
}
.actionBtn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #f1f5f9;
  border-radius: 6px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.15s;
}
.actionBtn:hover { background: #e2e8f0; color: #0b2240; }
.actionBtnDanger:hover { background: #fee2e2; color: #dc2626; }

.loadingState, .emptyState {
  padding: 60px 20px;
  text-align: center;
  color: #9ca3af;
}
.emptyState h3 {
  font-size: 16px;
  font-weight: 600;
  color: #475569;
  margin: 0 0 8px;
}
.emptyState p { font-size: 13px; margin: 0; }

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding: 0 4px;
}
.paginationInfo { font-size: 13px; color: #64748b; }
.paginationBtns { display: flex; align-items: center; gap: 4px; }
.pageBtn {
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  color: #475569;
  transition: all 0.15s;
}
.pageBtn:hover:not(:disabled) { background: #f1f5f9; }
.pageBtn:disabled { opacity: 0.4; cursor: not-allowed; }
.pageBtnActive {
  background: #0b2240;
  color: #fff;
  border-color: #0b2240;
}
.ellipsis {
  padding: 0 4px;
  color: #9ca3af;
  font-size: 13px;
}

/* Modal */
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.modal {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}
.modalHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}
.modalHeader h2 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}
.closeBtn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
}
.closeBtn:hover { background: #e2e8f0; }
.modalBody { padding: 24px; }
.detailGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}
.detailItem { display: flex; flex-direction: column; gap: 4px; }
.detailLabel {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.detailValue { font-size: 15px; font-weight: 600; color: #1e293b; }

.omrSummary { border-top: 1px solid #e2e8f0; padding-top: 20px; }
.omrSummary h3 {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px;
}
.omrGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.omrItem {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px 8px;
}
.omrValue { font-size: 24px; font-weight: 700; }
.omrLabel { font-size: 11px; color: #64748b; font-weight: 500; }

@media (max-width: 768px) {
  .statsRow { grid-template-columns: repeat(2, 1fr); }
  .detailGrid { grid-template-columns: 1fr; }
  .omrGrid { grid-template-columns: repeat(2, 1fr); }
}
```

- [ ] **Step 4: Commit**

```bash
git add client/web/src/pages/SubmissionsPage.tsx client/web/src/pages/SubmissionsPage.module.css
git commit -m "feat(web): complete SubmissionsPage with full table, filters, pagination, detail modal"
```

---

### Task 2.2: Create AnalyticsPage

**Files:**
- Create: `client/web/src/pages/AnalyticsPage.tsx`
- Create: `client/web/src/pages/AnalyticsPage.module.css`

**Steps:**

- [ ] **Step 1: Create AnalyticsPage component**

```tsx
// client/web/src/pages/AnalyticsPage.tsx
import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Download, RefreshCw, TrendingUp, TrendingDown, Minus, Filter, BarChart3, Users, Award, BookOpen } from 'lucide-react';
import { mockAnalyticsData, mockExams } from '../services/mockData';
import styles from './AnalyticsPage.module.css';

const CHART_COLORS = ['#0b2240', '#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626'];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30days');
  const data = mockAnalyticsData;

  const trendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp size={14} style={{ color: '#16A34A' }} />;
    if (trend === 'down') return <TrendingDown size={14} style={{ color: '#DC2626' }} />;
    return <Minus size={14} style={{ color: '#9CA3AF' }} />;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Phân tích & Thống kê</h1>
          <p>Tổng quan kết quả học tập và hiệu suất thi của các lớp</p>
        </div>
        <div className={styles.headerActions}>
          <select className={styles.rangeSelect} value={dateRange} onChange={e => setDateRange(e.target.value)}>
            <option value="7days">7 ngày qua</option>
            <option value="30days">30 ngày qua</option>
            <option value="3months">3 tháng qua</option>
            <option value="6months">6 tháng qua</option>
            <option value="year">Năm nay</option>
          </select>
          <button className={styles.exportBtn}>
            <Download size={16} />
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className={styles.overviewGrid}>
        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon} style={{ background: '#DBEAFE', color: '#2563EB' }}>
            <BookOpen size={20} />
          </div>
          <div className={styles.overviewContent}>
            <span className={styles.overviewValue}>{data.overviewStats.totalExams}</span>
            <span className={styles.overviewLabel}>Tổng bài thi</span>
          </div>
        </div>
        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon} style={{ background: '#DCFCE7', color: '#16A34A' }}>
            <Users size={20} />
          </div>
          <div className={styles.overviewContent}>
            <span className={styles.overviewValue}>{data.overviewStats.totalStudents}</span>
            <span className={styles.overviewLabel}>Học sinh</span>
          </div>
        </div>
        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon} style={{ background: '#FEF3C7', color: '#D97706' }}>
            <Award size={20} />
          </div>
          <div className={styles.overviewContent}>
            <span className={styles.overviewValue}>{data.overviewStats.averageScore.toFixed(1)}</span>
            <span className={styles.overviewLabel}>Điểm TB hệ thống</span>
          </div>
        </div>
        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon} style={{ background: '#EDE9FE', color: '#7C3AED' }}>
            <BarChart3 size={20} />
          </div>
          <div className={styles.overviewContent}>
            <span className={styles.overviewValue}>{data.overviewStats.examsThisMonth}</span>
            <span className={styles.overviewLabel}>Bài thi tháng này</span>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className={styles.chartsRow}>
        {/* Score Trend Line Chart */}
        <div className={styles.chartCard} style={{ flex: 2 }}>
          <div className={styles.chartHeader}>
            <h2>Xu hướng điểm trung bình</h2>
            <span className={styles.chartSubtitle}>12 tháng gần nhất</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.scoreTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis domain={[5, 10]} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
                formatter={(value: number) => [`${value.toFixed(1)}`, 'Điểm TB']}
              />
              <Line
                type="monotone"
                dataKey="avgScore"
                stroke="#0b2240"
                strokeWidth={2.5}
                dot={{ fill: '#0b2240', r: 4 }}
                activeDot={{ r: 6, fill: '#0b2240' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Grade Distribution Pie */}
        <div className={styles.chartCard} style={{ flex: 1 }}>
          <div className={styles.chartHeader}>
            <h2>Phân bố xếp loại</h2>
            <span className={styles.chartSubtitle}>Tất cả bài thi</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data.gradeDistribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
                nameKey="grade"
              >
                {data.gradeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} học sinh`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.pieLegend}>
            {data.gradeDistribution.map((item, i) => (
              <div key={i} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: item.color }} />
                <span className={styles.legendLabel}>{item.grade}</span>
                <span className={styles.legendValue}>{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className={styles.chartsRow}>
        {/* Subject Performance Bar */}
        <div className={styles.chartCard} style={{ flex: 1 }}>
          <div className={styles.chartHeader}>
            <h2>Điểm TB theo môn học</h2>
            <span className={styles.chartSubtitle}>So sánh hiệu suất</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.subjectPerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis type="category" dataKey="subject" tick={{ fontSize: 12, fill: '#475569' }} width={80} />
              <Tooltip formatter={(value: number) => [`${value.toFixed(1)}`, 'Điểm TB']} />
              <Bar dataKey="avgScore" radius={[0, 4, 4, 0]}>
                {data.subjectPerformance.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Exam Completion Rate Line */}
        <div className={styles.chartCard} style={{ flex: 1 }}>
          <div className={styles.chartHeader}>
            <h2>Tỷ lệ nộp bài</h2>
            <span className={styles.chartSubtitle}>Theo tháng</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.examCompletionRate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis domain={[80, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
              <Tooltip formatter={(value: number) => [`${value}%`, 'Tỷ lệ nộp']} />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#7C3AED"
                strokeWidth={2.5}
                dot={{ fill: '#7C3AED', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Students Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h2>Xếp hạng học sinh</h2>
          <span className={styles.chartSubtitle}>Top 10 điểm trung bình cao nhất</span>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 50 }}>#</th>
              <th>Họ và tên</th>
              <th>Lớp</th>
              <th>Điểm TB</th>
              <th>Xu hướng</th>
            </tr>
          </thead>
          <tbody>
            {data.topStudents.map((student, i) => (
              <tr key={i}>
                <td>
                  <span className={`${styles.rankBadge} ${i < 3 ? styles[`rank${i + 1}`] : ''}`}>
                    {i + 1}
                  </span>
                </td>
                <td className={styles.studentName}>{student.name}</td>
                <td>{student.class}</td>
                <td><strong>{student.avgScore}</strong></td>
                <td>{trendIcon(student.trend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create AnalyticsPage CSS**

```css
/* client/web/src/pages/AnalyticsPage.module.css */
.container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}
.header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px;
}
.header p { font-size: 14px; color: #64748b; margin: 0; }
.headerActions { display: flex; gap: 12px; align-items: center; }
.rangeSelect {
  padding: 9px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  background: #fff;
  cursor: pointer;
}
.exportBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  background: #0b2240;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.exportBtn:hover { background: #1a3a5c; }

.overviewGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.overviewCard {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.overviewIcon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.overviewContent {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.overviewValue {
  font-size: 26px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}
.overviewLabel {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.chartsRow {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}
.chartCard {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  flex: 1;
}
.chartHeader {
  margin-bottom: 16px;
}
.chartHeader h2 {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 4px;
}
.chartSubtitle {
  font-size: 12px;
  color: #9ca3af;
}

.pieLegend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}
.legendItem {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.legendDot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legendLabel { flex: 1; color: #475569; }
.legendValue { font-weight: 600; color: #1e293b; }

.tableCard {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.tableHeader {
  margin-bottom: 16px;
}
.tableHeader h2 {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 4px;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.table th {
  text-align: left;
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  border-bottom: 1px solid #e2e8f0;
}
.table td {
  padding: 12px;
  border-bottom: 1px solid #f1f5f9;
  color: #1e293b;
}
.table tbody tr:hover { background: #f8fafc; }
.table tbody tr:last-child td { border-bottom: none; }
.rankBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  background: #f1f5f9;
  color: #475569;
}
.rank1 { background: #FEF3C7; color: #92400E; }
.rank2 { background: #E2E8F0; color: #475569; }
.rank3 { background: #FED7AA; color: #9A3412; }
.studentName { font-weight: 500; }

@media (max-width: 1024px) {
  .overviewGrid { grid-template-columns: repeat(2, 1fr); }
  .chartsRow { flex-direction: column; }
}
@media (max-width: 640px) {
  .overviewGrid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: Commit**

```bash
git add client/web/src/pages/AnalyticsPage.tsx client/web/src/pages/AnalyticsPage.module.css
git commit -m "feat(web): create AnalyticsPage with Recharts (line, bar, pie, ranking table)"
```

---

### Task 2.3: Create SettingsPage & HelpPage

**Files:**
- Create: `client/web/src/pages/SettingsPage.tsx`
- Create: `client/web/src/pages/SettingsPage.module.css`
- Create: `client/web/src/pages/HelpPage.tsx`
- Create: `client/web/src/pages/HelpPage.module.css`

**Steps:**

- [ ] **Step 1: Create SettingsPage**

```tsx
// client/web/src/pages/SettingsPage.tsx
import { useState } from 'react';
import { User, Bell, Shield, Palette, Globe, Save, Camera, ChevronRight, Check } from 'lucide-react';
import { useAuthStore } from '../presentation/store/authStore';
import { mockCurrentUser } from '../services/mockData';
import styles from './SettingsPage.module.css';

const TABS = [
  { id: 'profile', label: 'Hồ sơ cá nhân', icon: User },
  { id: 'notifications', label: 'Thông báo', icon: Bell },
  { id: 'security', label: 'Bảo mật', icon: Shield },
  { id: 'preferences', label: 'Tùy chỉnh', icon: Palette },
];

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const currentUser = user || mockCurrentUser;

  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: currentUser.name,
    email: currentUser.email,
    phone: currentUser.phone || '',
  });

  const [notifications, setNotifications] = useState({
    examPublished: true,
    newSubmission: true,
    appealRequest: true,
    scoreAvailable: true,
    weeklyReport: false,
    systemAnnouncements: true,
  });

  const [preferences, setPreferences] = useState({
    language: 'vi',
    timezone: 'Asia/Ho_Chi_Minh',
    dateFormat: 'DD/MM/YYYY',
    theme: 'light',
  });

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Cài đặt</h1>
        <p>Quản lý tài khoản và tùy chỉnh trải nghiệm</p>
      </div>

      <div className={styles.layout}>
        {/* Sidebar Tabs */}
        <nav className={styles.sidebar}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
              <ChevronRight size={16} className={styles.tabArrow} />
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className={styles.content}>
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className={styles.section}>
              <h2>Hồ sơ cá nhân</h2>
              <p className={styles.sectionDesc}>Cập nhật thông tin cá nhân của bạn</p>

              <div className={styles.avatarSection}>
                <div className={styles.avatarLarge}>
                  <User size={40} />
                </div>
                <button className={styles.changeAvatarBtn}>
                  <Camera size={16} />
                  <span>Đổi ảnh</span>
                </button>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Họ và tên</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Số điện thoại</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                    className={styles.input}
                    placeholder="Nhập số điện thoại"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Vai trò</label>
                  <input
                    type="text"
                    value={currentUser.role === 'teacher' ? 'Giáo viên' : currentUser.role}
                    className={styles.input}
                    disabled
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className={styles.section}>
              <h2>Thông báo</h2>
              <p className={styles.sectionDesc}>Chọn loại thông báo bạn muốn nhận</p>

              <div className={styles.toggleList}>
                {[
                  { key: 'examPublished', label: 'Bài thi được phát hành', desc: 'Nhận thông báo khi bài thi mới được phát hành' },
                  { key: 'newSubmission', label: 'Bài nộp mới', desc: 'Thông báo khi có bài thi được nộp vào hệ thống' },
                  { key: 'appealRequest', label: 'Yêu cầu phúc khảo', desc: 'Nhận thông báo khi học sinh gửi yêu cầu phúc khảo' },
                  { key: 'scoreAvailable', label: 'Điểm thi có sẵn', desc: 'Thông báo khi kết quả chấm điểm đã sẵn sàng' },
                  { key: 'weeklyReport', label: 'Báo cáo hàng tuần', desc: 'Nhận email tổng hợp kết quả thi hàng tuần' },
                  { key: 'systemAnnouncements', label: 'Thông báo hệ thống', desc: 'Cập nhật và thông báo quan trọng từ Smart Grading' },
                ].map(item => (
                  <div key={item.key} className={styles.toggleItem}>
                    <div>
                      <span className={styles.toggleLabel}>{item.label}</span>
                      <span className={styles.toggleDesc}>{item.desc}</span>
                    </div>
                    <button
                      className={`${styles.toggle} ${notifications[item.key as keyof typeof notifications] ? styles.toggleOn : ''}`}
                      onClick={() => toggleNotification(item.key as keyof typeof notifications)}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className={styles.section}>
              <h2>Bảo mật</h2>
              <p className={styles.sectionDesc}>Quản lý mật khẩu và bảo vệ tài khoản</p>

              <div className={styles.securityItems}>
                <div className={styles.securityItem}>
                  <div className={styles.securityInfo}>
                    <h3>Đổi mật khẩu</h3>
                    <p>Cập nhật mật khẩu để bảo vệ tài khoản của bạn</p>
                  </div>
                  <button className={styles.securityBtn}>Đổi mật khẩu</button>
                </div>
                <div className={styles.securityItem}>
                  <div className={styles.securityInfo}>
                    <h3>Xác thực hai yếu tố (2FA)</h3>
                    <p>Thêm lớp bảo mật bổ sung cho tài khoản của bạn</p>
                  </div>
                  <button className={`${styles.securityBtn} ${styles.securityBtnSecondary}`}>Bật 2FA</button>
                </div>
                <div className={styles.securityItem}>
                  <div className={styles.securityInfo}>
                    <h3>Phiên hoạt động</h3>
                    <p>Xem và quản lý các thiết bị đang đăng nhập</p>
                  </div>
                  <button className={styles.securityBtn}>Xem phiên</button>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className={styles.section}>
              <h2>Tùy chỉnh</h2>
              <p className={styles.sectionDesc}>Cá nhân hóa giao diện và ngôn ngữ</p>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Ngôn ngữ</label>
                  <select
                    value={preferences.language}
                    onChange={e => setPreferences(p => ({ ...p, language: e.target.value }))}
                    className={styles.select}
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Múi giờ</label>
                  <select
                    value={preferences.timezone}
                    onChange={e => setPreferences(p => ({ ...p, timezone: e.target.value }))}
                    className={styles.select}
                  >
                    <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Định dạng ngày</label>
                  <select
                    value={preferences.dateFormat}
                    onChange={e => setPreferences(p => ({ ...p, dateFormat: e.target.value }))}
                    className={styles.select}
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Save Bar */}
          <div className={styles.saveBar}>
            <button
              className={`${styles.saveBtn} ${saved ? styles.saveBtnSuccess : ''}`}
              onClick={handleSave}
              disabled={isSaving}
            >
              {saved ? <><Check size={16} /> Đã lưu</> : isSaving ? 'Đang lưu...' : <><Save size={16} /> Lưu thay đổi</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

```css
/* client/web/src/pages/SettingsPage.module.css */
.container { padding: 24px; max-width: 1100px; margin: 0 auto; }
.header { margin-bottom: 24px; }
.header h1 { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 4px; }
.header p { font-size: 14px; color: #64748b; margin: 0; }

.layout { display: flex; gap: 24px; align-items: flex-start; }
.sidebar {
  width: 240px;
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  flex-shrink: 0;
  position: sticky;
  top: 24px;
}
.tabBtn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
  margin-bottom: 2px;
}
.tabBtn:hover { background: #f8fafc; color: #1e293b; }
.tabBtnActive { background: #EFF6FF !important; color: #1D4ED8 !important; }
.tabArrow { margin-left: auto; opacity: 0.5; }

.content {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  padding: 28px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  min-width: 0;
}
.section h2 { font-size: 18px; font-weight: 600; color: #1e293b; margin: 0 0 4px; }
.sectionDesc { font-size: 13px; color: #9ca3af; margin: 0 0 24px; }

.avatarSection {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 28px;
}
.avatarLarge {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
}
.changeAvatarBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  color: #475569;
}
.changeAvatarBtn:hover { background: #f8fafc; }

.formGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.formGroup { display: flex; flex-direction: column; gap: 6px; }
.formGroup label { font-size: 13px; font-weight: 500; color: #374151; }
.input, .select {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #1e293b;
  transition: border-color 0.2s;
}
.input:focus, .select:focus { outline: none; border-color: #0b2240; }
.input:disabled { background: #f8fafc; color: #9ca3af; cursor: not-allowed; }

.toggleList { display: flex; flex-direction: column; gap: 0; }
.toggleItem {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f1f5f9;
}
.toggleItem:last-child { border-bottom: none; }
.toggleLabel { display: block; font-size: 14px; font-weight: 500; color: #1e293b; margin-bottom: 2px; }
.toggleDesc { display: block; font-size: 12px; color: #9ca3af; }

.toggle {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: #d1d5db;
  border: none;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}
.toggleOn { background: #16A34A; }
.toggleThumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  transition: left 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.toggleOn .toggleThumb { left: 22px; }

.securityItems { display: flex; flex-direction: column; gap: 0; }
.securityItem {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid #f1f5f9;
}
.securityItem:last-child { border-bottom: none; }
.securityInfo h3 { font-size: 14px; font-weight: 600; color: #1e293b; margin: 0 0 4px; }
.securityInfo p { font-size: 12px; color: #9ca3af; margin: 0; }
.securityBtn {
  padding: 8px 16px;
  background: #0b2240;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}
.securityBtn:hover { background: #1a3a5c; }
.securityBtnSecondary { background: #fff; color: #0b2240; border: 1px solid #e2e8f0; }
.securityBtnSecondary:hover { background: #f8fafc; }

.saveBar {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
}
.saveBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #0b2240;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.saveBtn:hover { background: #1a3a5c; }
.saveBtn:disabled { opacity: 0.6; cursor: not-allowed; }
.saveBtnSuccess { background: #16A34A !important; }

@media (max-width: 768px) {
  .layout { flex-direction: column; }
  .sidebar { width: 100%; position: static; }
  .formGrid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Create HelpPage**

```tsx
// client/web/src/pages/HelpPage.tsx
import { useState } from 'react';
import { BookOpen, MessageCircle, Mail, Phone, ChevronDown, ChevronUp, Search, FileText, Video, Users } from 'lucide-react';
import styles from './HelpPage.module.css';

const FAQS = [
  { q: 'Làm sao để tạo một bài kiểm tra mới?', a: 'Đi tới mục "Bài thi" và nhấn nút "Tạo bài kiểm tra mới". Điền thông tin cơ bản, chọn lớp, thiết lập thông số và gán câu hỏi từ ngân hàng câu hỏi.' },
  { q: 'OMR Scanner hoạt động như thế nào?', a: 'OMR Scanner cho phép bạn tải lên hoặc chụp ảnh phiếu trả lời. Hệ thống sẽ tự động nhận diện mã đề, số báo danh và đáp án, sau đó chấm điểm tự động.' },
  { q: 'Làm sao để xuất kết quả thi ra Excel?', a: 'Sau khi có kết quả chấm, vào trang "Bài nộp" hoặc "Báo cáo", nhấn nút "Xuất Excel" để tải danh sách điểm về máy.' },
  { q: 'Tôi có thể chỉnh sửa bài thi sau khi phát hành không?', a: 'Sau khi phát hành, bạn không thể sửa nội dung câu hỏi. Tuy nhiên, bạn có thể thêm/bớt lớp thi và xem thống kê.' },
  { q: 'Hệ thống có hỗ trợ nhiều mã đề không?', a: 'Có. Khi tạo bài thi, bạn có thể chọn số lượng mã đề (1-50). Hệ thống sẽ tự động trộn câu hỏi và đáp án để tạo các mã đề khác nhau.' },
  { q: 'Làm sao để xử lý phúc khảo?', a: 'Vào mục "Phúc khảo" để xem các yêu cầu. Bạn có thể xem chi tiết bài thi gốc, hình ảnh phiếu và quyết định chấp nhận hoặc từ chối.' },
  { q: 'Ngân hàng câu hỏi hỗ trợ công thức toán không?', a: 'Có. Hệ thống hỗ trợ LaTeX cho công thức toán. Bạn có thể nhập công thức như $\\int_0^1 f(x)dx$ hoặc $\\sqrt{x^2+1}$.' },
  { q: 'Có thể import câu hỏi từ file Word/Excel không?', a: 'Tính năng import đang được phát triển. Hiện tại bạn có thể tạo câu hỏi thủ công hoặc sử dụng AI để sinh câu hỏi tự động.' },
];

const GUIDES = [
  { icon: BookOpen, title: 'Hướng dẫn bắt đầu', desc: 'Tìm hiểu các bước cơ bản để sử dụng Smart Grading', link: '#' },
  { icon: FileText, title: 'Tạo bài thi', desc: 'Cách tạo, cấu hình và phát hành bài kiểm tra', link: '#' },
  { icon: Users, title: 'Quản lý lớp học', desc: 'Thêm học sinh vào lớp và quản lý danh sách', link: '#' },
  { icon: Video, title: 'Video hướng dẫn', desc: 'Xem các video chi tiết về từng tính năng', link: '#' },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const filteredFaqs = FAQS.filter(faq =>
    !searchQuery ||
    faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <h1>Trung tâm trợ giúp</h1>
        <p>Tìm câu trả lời nhanh chóng hoặc liên hệ với chúng tôi</p>
        <div className={styles.searchBox}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm câu hỏi thường gặp..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Quick Guides */}
      <div className={styles.guidesGrid}>
        {GUIDES.map((guide, i) => (
          <div key={i} className={styles.guideCard}>
            <div className={styles.guideIcon}>
              <guide.icon size={24} />
            </div>
            <h3>{guide.title}</h3>
            <p>{guide.desc}</p>
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className={styles.faqSection}>
        <h2>Câu hỏi thường gặp</h2>
        <div className={styles.faqList}>
          {filteredFaqs.length === 0 ? (
            <p className={styles.noResults}>Không tìm thấy câu hỏi nào phù hợp. Thử từ khóa khác.</p>
          ) : (
            filteredFaqs.map((faq, i) => (
              <div key={i} className={`${styles.faqItem} ${openFaq === i ? styles.faqItemOpen : ''}`}>
                <button className={styles.faqQuestion} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  {openFaq === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {openFaq === i && (
                  <div className={styles.faqAnswer}>
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Contact */}
      <div className={styles.contactSection}>
        <h2>Liên hệ hỗ trợ</h2>
        <p className={styles.contactDesc}>Không tìm thấy câu trả lời? Liên hệ với đội ngũ hỗ trợ của chúng tôi.</p>
        <div className={styles.contactCards}>
          <div className={styles.contactCard}>
            <Mail size={24} />
            <h3>Email</h3>
            <p>support@smartgrading.edu.vn</p>
          </div>
          <div className={styles.contactCard}>
            <Phone size={24} />
            <h3>Điện thoại</h3>
            <p>1900 1234 (8:00 - 17:00, Thứ 2 - Thứ 6)</p>
          </div>
          <div className={styles.contactCard}>
            <MessageCircle size={24} />
            <h3>Chat trực tuyến</h3>
            <p>Chat với tư vấn viên ngay</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

```css
/* client/web/src/pages/HelpPage.module.css */
.container { padding: 24px; max-width: 1000px; margin: 0 auto; }
.hero {
  background: linear-gradient(135deg, #0b2240 0%, #1a3a5c 100%);
  border-radius: 16px;
  padding: 48px 32px;
  text-align: center;
  margin-bottom: 32px;
  color: #fff;
}
.hero h1 { font-size: 28px; font-weight: 700; margin: 0 0 8px; }
.hero p { font-size: 15px; opacity: 0.8; margin: 0 0 24px; }
.searchBox {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 12px;
  padding: 12px 20px;
  max-width: 480px;
  margin: 0 auto;
}
.searchBox svg { opacity: 0.7; flex-shrink: 0; }
.searchBox input {
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 15px;
  width: 100%;
}
.searchBox input::placeholder { color: rgba(255,255,255,0.6); }

.guidesGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 40px;
}
.guideCard {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}
.guideCard:hover { border-color: #0b2240; transform: translateY(-2px); }
.guideIcon {
  width: 56px;
  height: 56px;
  background: #EFF6FF;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1D4ED8;
  margin: 0 auto 16px;
}
.guideCard h3 { font-size: 14px; font-weight: 600; color: #1e293b; margin: 0 0 6px; }
.guideCard p { font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.5; }

.faqSection { margin-bottom: 40px; }
.faqSection h2 { font-size: 20px; font-weight: 600; color: #1e293b; margin: 0 0 20px; }
.faqList { display: flex; flex-direction: column; gap: 8px; }
.faqItem {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  overflow: hidden;
  border: 1px solid #f1f5f9;
}
.faqItemOpen { border-color: #dbeafe; }
.faqQuestion {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  cursor: pointer;
  text-align: left;
  gap: 16px;
}
.faqQuestion:hover { background: #f8fafc; }
.faqQuestion svg { flex-shrink: 0; color: #9ca3af; }
.faqAnswer {
  padding: 0 20px 16px;
  border-top: 1px solid #f1f5f9;
  padding-top: 16px;
}
.faqAnswer p { font-size: 13px; color: #475569; line-height: 1.7; margin: 0; }
.noResults {
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
  padding: 32px;
}

.contactSection { margin-bottom: 40px; }
.contactSection h2 { font-size: 20px; font-weight: 600; color: #1e293b; margin: 0 0 8px; }
.contactDesc { font-size: 14px; color: #64748b; margin: 0 0 24px; }
.contactCards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.contactCard {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}
.contactCard:hover { border-color: #0b2240; }
.contactCard svg { color: #0b2240; margin-bottom: 12px; }
.contactCard h3 { font-size: 14px; font-weight: 600; color: #1e293b; margin: 0 0 4px; }
.contactCard p { font-size: 13px; color: #64748b; margin: 0; }

@media (max-width: 768px) {
  .guidesGrid { grid-template-columns: repeat(2, 1fr); }
  .contactCards { grid-template-columns: 1fr; }
}
@media (max-width: 480px) {
  .guidesGrid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: Commit**

```bash
git add client/web/src/pages/SettingsPage.tsx client/web/src/pages/SettingsPage.module.css client/web/src/pages/HelpPage.tsx client/web/src/pages/HelpPage.module.css
git commit -m "feat(web): create SettingsPage (profile/notifications/security/preferences) and HelpPage (FAQ/guides/contact)"
```

---

### Task 2.4: Create AppealsPage

**Files:**
- Create: `client/web/src/pages/AppealsPage.tsx`
- Create: `client/web/src/pages/AppealsPage.module.css`

**Steps:**

- [ ] **Step 1: Create AppealsPage**

```tsx
// client/web/src/pages/AppealsPage.tsx
import { useState, useMemo } from 'react';
import { Search, Filter, CheckCircle, XCircle, Clock, Eye, MessageSquare, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { mockAppeals, mockExams } from '../services/mockData';
import type { Appeal } from '../types';
import styles from './AppealsPage.module.css';

const STATUS_CONFIG = {
  pending: { label: 'Chờ xử lý', color: '#D97706', bg: '#FEF3C7', icon: Clock },
  under_review: { label: 'Đang xem xét', color: '#2563EB', bg: '#DBEAFE', icon: Clock },
  approved: { label: 'Đã chấp nhận', color: '#16A34A', bg: '#DCFCE7', icon: CheckCircle },
  rejected: { label: 'Đã từ chối', color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
};

export default function AppealsPage() {
  const [appeals] = useState<Appeal[]>(mockAppeals);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const itemsPerPage = 10;

  const filteredAppeals = useMemo(() => {
    return appeals.filter(a => {
      const matchesSearch = !searchQuery ||
        (typeof a.studentId === 'object' && a.studentId?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = !statusFilter || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [appeals, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredAppeals.length / itemsPerPage);
  const paginatedAppeals = filteredAppeals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleResolve = async (id: string, decision: 'approved' | 'rejected') => {
    setProcessingId(id);
    await new Promise(r => setTimeout(r, 1000));
    setProcessingId(null);
    alert(`Đã ${decision === 'approved' ? 'chấp nhận' : 'từ chối'} yêu cầu phúc khảo.`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Quản lý phúc khảo</h1>
          <p>Xử lý các yêu cầu phúc khảo từ học sinh</p>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.statChip}>
            <Clock size={14} />
            <span>{appeals.filter(a => a.status === 'pending').length} chờ xử lý</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = appeals.filter(a => a.status === key).length;
          return (
            <div key={key} className={styles.statCard} style={{ borderLeft: `3px solid ${cfg.color}` }}>
              <span className={styles.statValue} style={{ color: cfg.color }}>{count}</span>
              <span className={styles.statLabel}>{cfg.label}</span>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm theo tên học sinh..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {/* Appeals List */}
      <div className={styles.appealsList}>
        {filteredAppeals.length === 0 ? (
          <div className={styles.emptyState}>
            <CheckCircle size={48} style={{ color: '#16A34A', marginBottom: 12 }} />
            <h3>Không có yêu cầu phúc khảo nào</h3>
            <p>Tất cả yêu cầu đã được xử lý hoặc chưa có yêu cầu nào.</p>
          </div>
        ) : (
          paginatedAppeals.map(appeal => {
            const cfg = STATUS_CONFIG[appeal.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
            const studentName = typeof appeal.studentId === 'object' ? appeal.studentId?.name || 'Unknown' : 'Unknown';
            const examTitle = typeof appeal.examId === 'object' ? (appeal.examId as any)?.title || 'N/A' : mockExams.find(e => e._id === appeal.examId)?.title || 'N/A';
            const isPending = appeal.status === 'pending';

            return (
              <div key={appeal._id} className={styles.appealCard}>
                <div className={styles.appealHeader}>
                  <div className={styles.appealInfo}>
                    <span className={styles.studentName}>{studentName}</span>
                    <span className={styles.examTitle}>{examTitle}</span>
                  </div>
                  <span className={styles.statusBadge} style={{ color: cfg.color, background: cfg.bg }}>
                    {cfg.label}
                  </span>
                </div>
                <div className={styles.appealBody}>
                  <p className={styles.appealReason}>
                    <strong>Câu {appeal.questionPosition}:</strong> {appeal.reason}
                  </p>
                  <div className={styles.appealMeta}>
                    <span>Gửi: {new Date(appeal.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    {appeal.teacherResponse?.note && (
                      <span className={styles.teacherNote}>
                        <MessageSquare size={12} />
                        {appeal.teacherResponse.note}
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.appealActions}>
                  <button className={styles.viewBtn} onClick={() => setSelectedAppeal(appeal)}>
                    <Eye size={15} />
                    Chi tiết
                  </button>
                  {isPending && (
                    <>
                      <button
                        className={styles.rejectBtn}
                        onClick={() => handleResolve(appeal._id, 'rejected')}
                        disabled={processingId === appeal._id}
                      >
                        {processingId === appeal._id ? 'Đang xử lý...' : <><XCircle size={15} /> Từ chối</>}
                      </button>
                      <button
                        className={styles.approveBtn}
                        onClick={() => handleResolve(appeal._id, 'approved')}
                        disabled={processingId === appeal._id}
                      >
                        {processingId === appeal._id ? 'Đang xử lý...' : <><CheckCircle size={15} /> Chấp nhận</>}
                      </button>
                    </>
                  )}
                  {!isPending && appeal.status === 'under_review' && (
                    <>
                      <button className={styles.rejectBtn} disabled={processingId === appeal._id}>
                        <XCircle size={15} /> Từ chối
                      </button>
                      <button className={styles.approveBtn} disabled={processingId === appeal._id}>
                        <CheckCircle size={15} /> Chấp nhận
                      </button>
                    </>
                  )}
                  {!isPending && appeal.status !== 'under_review' && (
                    <span className={styles.resolvedInfo}>
                      {appeal.teacherResponse?.decision === 'approved' ? 'Đã chấp nhận' : 'Đã từ chối'}
                      {' - '}{new Date(appeal.teacherResponse?.reviewedAt || appeal.updatedAt).toLocaleDateString('vi-VN')}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span>Hiển thị {filteredAppeals.length} yêu cầu</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={styles.pageBtn}>
              <ChevronLeft size={16} />
            </button>
            <span className={styles.pageInfo}>{currentPage}/{totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className={styles.pageBtn}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedAppeal && (
        <div className={styles.modalOverlay} onClick={() => setSelectedAppeal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Chi tiết phúc khảo</h2>
              <button onClick={() => setSelectedAppeal(null)} className={styles.closeBtn}>&times;</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Học sinh</span>
                <span className={styles.detailValue}>{typeof selectedAppeal.studentId === 'object' ? selectedAppeal.studentId?.name : selectedAppeal.studentId}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Câu hỏi</span>
                <span className={styles.detailValue}>#{selectedAppeal.questionPosition}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Lý do</span>
                <span className={styles.detailValue}>{selectedAppeal.reason}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Trạng thái</span>
                <span className={styles.detailValue}>{STATUS_CONFIG[selectedAppeal.status as keyof typeof STATUS_CONFIG]?.label}</span>
              </div>
              {selectedAppeal.teacherResponse && (
                <>
                  <div className={styles.divider} />
                  <h3 className={styles.responseTitle}>Phản hồi giáo viên</h3>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Quyết định</span>
                    <span className={styles.detailValue} style={{ fontWeight: 700, color: selectedAppeal.teacherResponse.decision === 'approved' ? '#16A34A' : '#DC2626' }}>
                      {selectedAppeal.teacherResponse.decision === 'approved' ? 'Chấp nhận' : 'Từ chối'}
                    </span>
                  </div>
                  {selectedAppeal.teacherResponse.note && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Ghi chú</span>
                      <span className={styles.detailValue}>{selectedAppeal.teacherResponse.note}</span>
                    </div>
                  )}
                </>
              )}
              <div className={styles.modalActions}>
                {selectedAppeal.status === 'pending' && (
                  <>
                    <button className={styles.rejectBtn} onClick={() => { handleResolve(selectedAppeal._id, 'rejected'); setSelectedAppeal(null); }}>
                      <XCircle size={15} /> Từ chối
                    </button>
                    <button className={styles.approveBtn} onClick={() => { handleResolve(selectedAppeal._id, 'approved'); setSelectedAppeal(null); }}>
                      <CheckCircle size={15} /> Chấp nhận
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

```css
/* client/web/src/pages/AppealsPage.module.css */
.container { padding: 24px; max-width: 1000px; margin: 0 auto; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.header h1 { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 4px; }
.header p { font-size: 14px; color: #64748b; margin: 0; }
.headerStats { display: flex; gap: 12px; }
.statChip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #FEF3C7;
  color: #92400E;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.statsRow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
.statCard {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.statValue { font-size: 28px; font-weight: 700; display: block; }
.statLabel { font-size: 12px; color: #64748b; }

.toolbar { display: flex; gap: 12px; margin-bottom: 20px; }
.searchBox {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0 12px;
}
.searchBox svg { color: #9ca3af; }
.searchBox input {
  border: none;
  outline: none;
  padding: 10px 0;
  font-size: 14px;
  width: 100%;
}
.filterSelect {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  cursor: pointer;
  min-width: 160px;
}

.appealsList { display: flex; flex-direction: column; gap: 12px; }
.emptyState { text-align: center; padding: 60px 20px; background: #fff; border-radius: 12px; }
.emptyState h3 { font-size: 16px; font-weight: 600; color: #475569; margin: 0 0 8px; }
.emptyState p { font-size: 13px; color: #9ca3af; margin: 0; }

.appealCard {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  border: 1px solid #f1f5f9;
  transition: border-color 0.2s;
}
.appealCard:hover { border-color: #e2e8f0; }
.appealHeader { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.appealInfo { display: flex; flex-direction: column; gap: 2px; }
.studentName { font-size: 15px; font-weight: 600; color: #1e293b; }
.examTitle { font-size: 12px; color: #9ca3af; }
.statusBadge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}
.appealBody { margin-bottom: 16px; }
.appealReason { font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 10px; }
.appealMeta { display: flex; gap: 16px; font-size: 12px; color: #9ca3af; flex-wrap: wrap; }
.teacherNote { display: flex; align-items: center; gap: 4px; color: #2563EB; }

.appealActions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid #f1f5f9; }
.viewBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  color: #475569;
}
.viewBtn:hover { background: #f8fafc; }
.approveBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: none;
  background: #16A34A;
  color: #fff;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.approveBtn:hover { background: #15803d; }
.approveBtn:disabled { opacity: 0.6; cursor: not-allowed; }
.rejectBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid #fee2e2;
  background: #fff;
  color: #dc2626;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.rejectBtn:hover { background: #fef2f2; }
.rejectBtn:disabled { opacity: 0.6; cursor: not-allowed; }
.resolvedInfo { font-size: 12px; color: #9ca3af; margin-left: auto; }

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  font-size: 13px;
  color: #64748b;
}
.pageBtn {
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
}
.pageBtn:disabled { opacity: 0.4; cursor: not-allowed; }
.pageInfo { padding: 0 8px; font-size: 13px; }

/* Modal */
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: #fff; border-radius: 16px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; }
.modalHeader h2 { font-size: 18px; font-weight: 600; color: #1e293b; margin: 0; }
.closeBtn { width: 32px; height: 32px; border: none; background: #f1f5f9; border-radius: 8px; font-size: 20px; cursor: pointer; color: #64748b; display: flex; align-items: center; justify-content: center; }
.modalBody { padding: 24px; }
.detailRow { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
.detailLabel { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
.detailValue { font-size: 14px; color: #1e293b; }
.divider { height: 1px; background: #f1f5f9; margin: 20px 0; }
.responseTitle { font-size: 14px; font-weight: 600; color: #1e293b; margin: 0 0 16px; }
.modalActions { display: flex; gap: 8px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #f1f5f9; }

@media (max-width: 640px) {
  .statsRow { grid-template-columns: repeat(2, 1fr); }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/web/src/pages/AppealsPage.tsx client/web/src/pages/AppealsPage.module.css
git commit -m "feat(web): create AppealsPage for managing student grade appeals"
```

---

### Task 2.5: Complete ScanPage with OMR functionality

**Files:**
- Modify: `client/web/src/pages/ScanPage.tsx` (rewrite)
- Modify: `client/web/src/pages/ScanPage.module.css` (rewrite)

**Steps:**

- [ ] **Step 1: Rewrite ScanPage with full OMR scanning workflow**

```tsx
// client/web/src/pages/ScanPage.tsx
import { useState, useRef, useCallback } from 'react';
import { Upload, Camera, FileText, CheckCircle, AlertTriangle, X, RefreshCw, Settings, Eye, Download, Loader } from 'lucide-react';
import { mockExams, mockOMRTemplates } from '../services/mockData';
import type { Submission } from '../types';
import styles from './ScanPage.module.css';

interface ScanResult {
  studentCode: string;
  versionCode: string;
  score: number;
  maxScore: number;
  correctCount: number;
  incorrectCount: number;
  emptyCount: number;
  confidence: number;
  imageUrl?: string;
  status: 'success' | 'warning' | 'error';
  warnings: string[];
}

export default function ScanPage() {
  const [selectedExam, setSelectedExam] = useState('');
  const [scanMode, setScanMode] = useState<'upload' | 'camera'>('upload');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!selectedExam) {
      alert('Vui lòng chọn bài thi trước khi quét.');
      return;
    }
    setIsScanning(true);
    setScanProgress(0);

    // Simulate scanning progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 200));
      setScanProgress(i);
    }

    // Generate mock results
    const results: ScanResult[] = Array.from({ length: Math.floor(Math.random() * 5) + 3 }, (_, i) => {
      const score = Math.floor(Math.random() * 10 * 10) / 10;
      const correctCount = Math.floor(score * 5);
      const incorrectCount = Math.floor((10 - score) * 5);
      return {
        studentCode: String(i + 1).padStart(3, '0'),
        versionCode: ['101', '102', '103', '104'][Math.floor(Math.random() * 4)],
        score,
        maxScore: 10,
        correctCount,
        incorrectCount,
        emptyCount: Math.floor(Math.random() * 3),
        confidence: 85 + Math.random() * 15,
        status: Math.random() > 0.8 ? 'warning' : 'success',
        warnings: Math.random() > 0.5 ? ['Tô mờ ở câu 7', 'Tô đúp ở câu 15'] : [],
      };
    });

    setScanResults(prev => [...prev, ...results]);
    setIsScanning(false);
    setScanProgress(0);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      setCameraActive(true);
    } catch {
      alert('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const handleCapture = () => {
    stopCamera();
    const fakeFile = new File([''], 'camera-capture.jpg', { type: 'image/jpeg' });
    handleFile(fakeFile);
  };

  const handleUploadAll = () => {
    alert(`Đã tải lên ${scanResults.length} phiếu. Hệ thống đang xử lý...`);
    setScanResults([]);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Quét phiếu trả lời OMR</h1>
        <p>Tải lên hoặc chụp ảnh phiếu trả lời để chấm điểm tự động</p>
      </div>

      {/* Exam Selector */}
      <div className={styles.examSelector}>
        <label>Chọn bài thi để quét:</label>
        <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} className={styles.examSelect}>
          <option value="">-- Chọn bài thi --</option>
          {mockExams.map(e => (
            <option key={e._id} value={e._id}>{e.title}</option>
          ))}
        </select>
      </div>

      {/* Mode Tabs */}
      <div className={styles.modeTabs}>
        <button
          className={`${styles.modeTab} ${scanMode === 'upload' ? styles.modeTabActive : ''}`}
          onClick={() => setScanMode('upload')}
        >
          <Upload size={18} />
          Tải lên file
        </button>
        <button
          className={`${styles.modeTab} ${scanMode === 'camera' ? styles.modeTabActive : ''}`}
          onClick={() => setScanMode('camera')}
        >
          <Camera size={18} />
          Mở camera
        </button>
      </div>

      {/* Upload Area */}
      {scanMode === 'upload' && (
        <div
          className={`${styles.uploadArea} ${dragActive ? styles.uploadAreaDrag : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {isScanning ? (
            <div className={styles.scanningState}>
              <div className={styles.spinner} />
              <p>Đang xử lý ảnh...</p>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${scanProgress}%` }} />
              </div>
              <span className={styles.progressText}>{scanProgress}%</span>
            </div>
          ) : (
            <>
              <Upload size={56} className={styles.uploadIcon} />
              <h2>Kéo thả file vào đây</h2>
              <p>hoặc nhấn để chọn file</p>
              <div className={styles.uploadBtns}>
                <button className={styles.uploadBtn} onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  <Upload size={16} />
                  Tải lên file
                </button>
              </div>
              <p className={styles.uploadHint}>Hỗ trợ: JPG, PNG, PDF. Kích thước tối đa: 10MB</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Camera Area */}
      {scanMode === 'camera' && (
        <div className={styles.cameraArea}>
          {!cameraActive ? (
            <div className={styles.cameraPlaceholder}>
              <Camera size={56} />
              <h2>Mở camera để quét</h2>
              <p>Sử dụng camera sau của thiết bị để chụp phiếu trả lời</p>
              <button className={styles.cameraBtn} onClick={startCamera}>
                <Camera size={18} />
                Bật camera
              </button>
            </div>
          ) : (
            <div className={styles.cameraLive}>
              <video ref={cameraRef} autoPlay playsInline style={{ width: '100%', borderRadius: 12 }} />
              <div className={styles.cameraOverlay}>
                <div className={styles.cameraGuide} />
              </div>
              <div className={styles.cameraControls}>
                <button className={styles.captureBtn} onClick={handleCapture}>
                  <Camera size={24} />
                </button>
                <button className={styles.cancelCameraBtn} onClick={stopCamera}>
                  <X size={20} />
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scan Results */}
      {scanResults.length > 0 && (
        <div className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <h2>Kết quả quét ({scanResults.length} phiếu)</h2>
            <div className={styles.resultsActions}>
              <button className={styles.reScanBtn} onClick={() => setScanResults([])}>
                <RefreshCw size={15} />
                Quét lại
              </button>
              <button className={styles.uploadAllBtn} onClick={handleUploadAll}>
                <Upload size={15} />
                Tải lên tất cả
              </button>
            </div>
          </div>
          <div className={styles.resultsGrid}>
            {scanResults.map((result, i) => (
              <div
                key={i}
                className={`${styles.resultCard} ${result.status === 'error' ? styles.resultError : result.status === 'warning' ? styles.resultWarning : styles.resultSuccess}`}
                onClick={() => setSelectedResult(result)}
              >
                <div className={styles.resultTop}>
                  <div className={styles.resultInfo}>
                    <span className={styles.resultCode}>{result.studentCode}</span>
                    <span className={styles.resultVersion}>Mã đề {result.versionCode}</span>
                  </div>
                  {result.status === 'success' ? (
                    <CheckCircle size={18} className={styles.iconSuccess} />
                  ) : (
                    <AlertTriangle size={18} className={result.status === 'warning' ? styles.iconWarning : styles.iconError} />
                  )}
                </div>
                <div className={styles.resultScore}>
                  <span className={styles.scoreNum}>{result.score.toFixed(1)}</span>
                  <span className={styles.scoreMax}>/{result.maxScore}</span>
                </div>
                <div className={styles.resultStats}>
                  <span className={styles.statCorrect}>{result.correctCount} đúng</span>
                  <span className={styles.statIncorrect}>{result.incorrectCount} sai</span>
                  {result.emptyCount > 0 && <span className={styles.statEmpty}>{result.emptyCount} bỏ</span>}
                </div>
                <div className={styles.resultConfidence}>
                  <div className={styles.confidenceBar}>
                    <div className={styles.confidenceFill} style={{ width: `${result.confidence}%` }} />
                  </div>
                  <span>{result.confidence.toFixed(0)}% OCR</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className={styles.instructions}>
        <h3>Hướng dẫn quét OMR</h3>
        <ul>
          <li>Chụp hoặc quét rõ nét phiếu trả lời theo chiều dọc</li>
          <li>Đảm bảo ánh sáng đầy đủ, không bị bóng che</li>
          <li>Giữ phiếu phẳng và không bị móp méo</li>
          <li>Hỗ trợ định dạng: JPG, PNG, PDF</li>
          <li>Đảm bảo các ô tô đen đậm và không có vết nhòe</li>
        </ul>
        <div className={styles.templateList}>
          <span className={styles.templateLabel}>Mẫu OMR đã cấu hình:</span>
          {mockOMRTemplates.map(t => (
            <span key={t._id} className={styles.templateChip}>{t.name}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

```css
/* client/web/src/pages/ScanPage.module.css */
.container { padding: 24px; max-width: 1100px; margin: 0 auto; }
.header { margin-bottom: 24px; }
.header h1 { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 4px; }
.header p { font-size: 14px; color: #64748b; margin: 0; }

.examSelector {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  gap: 16px;
}
.examSelector label { font-size: 14px; font-weight: 500; color: #374151; white-space: nowrap; }
.examSelect {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  cursor: pointer;
  max-width: 400px;
}
.examSelect:focus { outline: none; border-color: #0b2240; }

.modeTabs {
  display: flex;
  gap: 0;
  background: #fff;
  border-radius: 12px 12px 0 0;
  padding: 12px 12px 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.modeTab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  background: transparent;
  border-radius: 8px 8px 0 0;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s;
  border-bottom: 2px solid transparent;
}
.modeTab:hover { color: #1e293b; }
.modeTabActive { color: #0b2240; border-bottom-color: #0b2240; background: #f8fafc; }

.uploadArea {
  background: #fff;
  border: 2px dashed #e2e8f0;
  border-top: none;
  border-radius: 0 0 12px 12px;
  padding: 60px 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.uploadArea:hover { border-color: #0b2240; background: #f8fafc; }
.uploadAreaDrag { border-color: #0b2240; background: #EFF6FF; }
.uploadIcon { color: #9ca3af; margin-bottom: 16px; }
.uploadArea h2 { font-size: 18px; font-weight: 600; color: #1e293b; margin: 0 0 8px; }
.uploadArea p { font-size: 14px; color: #9ca3af; margin: 0 0 20px; }
.uploadBtns { display: flex; gap: 12px; justify-content: center; }
.uploadBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #0b2240;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.uploadBtn:hover { background: #1a3a5c; }
.uploadHint { font-size: 12px; color: #9ca3af; margin-top: 8px; }

.scanningState { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.spinner {
  width: 48px;
  height: 48px;
  border: 3px solid #e2e8f0;
  border-top-color: #0b2240;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.scanningState p { font-size: 15px; color: #475569; font-weight: 500; margin: 0; }
.progressBar { width: 240px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
.progressFill { height: 100%; background: #0b2240; border-radius: 3px; transition: width 0.3s; }
.progressText { font-size: 13px; color: #64748b; }

.cameraArea {
  background: #fff;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  min-height: 400px;
  overflow: hidden;
}
.cameraPlaceholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 12px;
  color: #9ca3af;
  padding: 40px;
}
.cameraPlaceholder h2 { font-size: 18px; font-weight: 600; color: #475569; margin: 0; }
.cameraPlaceholder p { font-size: 14px; color: #9ca3af; margin: 0; }
.cameraBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #0b2240;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 8px;
}
.cameraBtn:hover { background: #1a3a5c; }
.cameraLive { position: relative; }
.cameraOverlay { position: absolute; inset: 0; pointer-events: none; display: flex; align-items: center; justify-content: center; }
.cameraGuide { width: 80%; height: 80%; border: 2px dashed rgba(255,255,255,0.5); border-radius: 8px; }
.cameraControls { display: flex; gap: 12px; justify-content: center; padding: 16px; background: rgba(0,0,0,0.8); }
.captureBtn { width: 60px; height: 60px; border-radius: 50%; background: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.captureBtn:hover { background: #f1f5f9; }
.cancelCameraBtn { display: flex; align-items: center; gap: 6px; padding: 12px 20px; background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; font-size: 14px; cursor: pointer; }

.resultsSection { margin-top: 24px; }
.resultsHeader { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.resultsHeader h2 { font-size: 18px; font-weight: 600; color: #1e293b; margin: 0; }
.resultsActions { display: flex; gap: 8px; }
.reScanBtn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; border: 1px solid #e2e8f0; background: #fff;
  border-radius: 8px; font-size: 13px; cursor: pointer; color: #475569;
}
.reScanBtn:hover { background: #f8fafc; }
.uploadAllBtn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; background: #0b2240; color: #fff;
  border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer;
}
.uploadAllBtn:hover { background: #1a3a5c; }
.resultsGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.resultCard {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  cursor: pointer;
  border: 1px solid #f1f5f9;
  transition: all 0.15s;
  border-left: 3px solid #16A34A;
}
.resultCard:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.resultWarning { border-left-color: #D97706; }
.resultError { border-left-color: #DC2626; }
.resultTop { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.resultInfo { display: flex; flex-direction: column; gap: 2px; }
.resultCode { font-size: 14px; font-weight: 700; color: #1e293b; }
.resultVersion { font-size: 11px; color: #9ca3af; }
.iconSuccess { color: #16A34A; }
.iconWarning { color: #D97706; }
.iconError { color: #DC2626; }
.resultScore { margin-bottom: 8px; }
.scoreNum { font-size: 28px; font-weight: 700; color: #1e293b; }
.scoreMax { font-size: 14px; color: #9ca3af; }
.resultStats { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.statCorrect { font-size: 11px; color: #16A34A; font-weight: 500; }
.statIncorrect { font-size: 11px; color: #DC2626; font-weight: 500; }
.statEmpty { font-size: 11px; color: #9ca3af; font-weight: 500; }
.resultConfidence { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #9ca3af; }
.confidenceBar { flex: 1; height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden; }
.confidenceFill { height: 100%; background: #16A34A; border-radius: 2px; }

.instructions {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin-top: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.instructions h3 { font-size: 15px; font-weight: 600; color: #1e293b; margin: 0 0 12px; }
.instructions ul { margin: 0 0 16px; padding-left: 20px; }
.instructions ul li { font-size: 13px; color: #475569; margin-bottom: 6px; line-height: 1.6; }
.templateList { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.templateLabel { font-size: 13px; color: #64748b; font-weight: 500; }
.templateChip {
  display: inline-block;
  padding: 4px 12px;
  background: #EFF6FF;
  color: #1D4ED8;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/web/src/pages/ScanPage.tsx client/web/src/pages/ScanPage.module.css
git commit -m "feat(web): complete ScanPage with drag-drop upload, camera capture, OMR scanning simulation, and results display"
```

---

## PHASE 3: Enhance Existing Pages (Ngày 4-5)

### Task 3.1: Update AppRoutes to include new pages

**Files:**
- Modify: `client/web/src/presentation/routes/AppRoutes.tsx`

**Steps:**

- [ ] **Step 1: Add imports and routes for new pages**

Add these imports to AppRoutes.tsx:

```tsx
import AnalyticsPage from '../../pages/AnalyticsPage';
import SettingsPage from '../../pages/SettingsPage';
import HelpPage from '../../pages/HelpPage';
import AppealsPage from '../../pages/AppealsPage';
```

Add these routes inside the `<Route path="/" element={<Layout />}>`, after existing routes:

```tsx
<Route path="analytics" element={<AnalyticsPage />} />
<Route path="settings" element={<SettingsPage />} />
<Route path="help" element={<HelpPage />} />
<Route path="appeals" element={<AppealsPage />} />
```

- [ ] **Step 2: Commit**

```bash
git add client/web/src/presentation/routes/AppRoutes.tsx
git commit -m "feat(web): add routes for Analytics, Settings, Help, and Appeals pages"
```

---

### Task 3.2: Enhance DashboardPage with real data

**Files:**
- Modify: `client/web/src/pages/DashboardPage.tsx` (update to use mock data)
- Modify: `client/web/src/presentation/store/dashboardStore.ts` (update fetchDashboard)

**Steps:**

- [ ] **Step 1: Update dashboardStore to use mock data when API unavailable**

Read the current dashboardStore, then update the `fetchDashboard` method to use mock data when API calls fail:

```ts
// Modify the catch block in fetchDashboard:
catch (error) {
  // Fallback to mock data when backend is not available
  const mockData = mockDashboardStats;
  set({
    stats: mockData.stats,
    upcomingExams: mockData.upcomingExams,
    isLoading: false,
  });
}
```

- [ ] **Step 2: Update DashboardPage to use mock activities**

Modify the activities section in DashboardPage to use mock data:

```tsx
// Replace the hardcoded activities array with:
const activities = mockDashboardStats.activities;
```

- [ ] **Step 3: Commit**

```bash
git add client/web/src/presentation/store/dashboardStore.ts client/web/src/pages/DashboardPage.tsx
git commit -m "feat(web): enhance DashboardPage with mock data fallback and improved data display"
```

---

### Task 3.3: Create NotificationPanel component

**Files:**
- Create: `client/web/src/presentation/components/NotificationPanel.tsx`
- Create: `client/web/src/presentation/components/NotificationPanel.module.css`
- Modify: `client/web/src/presentation/components/Layout.tsx`

**Steps:**

- [ ] **Step 1: Create NotificationPanel**

```tsx
// client/web/src/presentation/components/NotificationPanel.tsx
import { useState, useEffect } from 'react';
import { X, Bell, Check, CheckCheck, AlertCircle, FileText, Award, MessageSquare, Info } from 'lucide-react';
import { mockNotifications } from '../../services/mockData';
import type { Notification } from '../../types';
import styles from './NotificationPanel.module.css';

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  exam_published: { icon: FileText, color: '#2563EB', label: 'Bài thi' },
  exam_reminder: { icon: Bell, color: '#D97706', label: 'Nhắc nhở' },
  score_available: { icon: Award, color: '#16A34A', label: 'Điểm' },
  appeal_submitted: { icon: MessageSquare, color: '#7C3AED', label: 'Phúc khảo' },
  appeal_resolved: { icon: Check, color: '#16A34A', label: 'Phúc khảo' },
  ai_report_ready: { icon: Award, color: '#059669', label: 'AI Report' },
  system: { icon: Info, color: '#64748b', label: 'Hệ thống' },
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
  };

  const handleMarkRead = (id: string) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n));
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffHours < 1) return 'Vừa xong';
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.header}>
          <div>
            <h2>Thông báo</h2>
            {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount} mới</span>}
          </div>
          <div className={styles.headerActions}>
            {unreadCount > 0 && (
              <button className={styles.markAllBtn} onClick={handleMarkAllRead}>
                <CheckCheck size={15} />
                Đánh dấu đã đọc
              </button>
            )}
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className={styles.list}>
          {notifications.length === 0 ? (
            <div className={styles.empty}>
              <Bell size={32} />
              <p>Không có thông báo nào</p>
            </div>
          ) : (
            notifications.map(notif => {
              const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
              const Icon = cfg.icon;
              return (
                <div
                  key={notif._id}
                  className={`${styles.item} ${!notif.isRead ? styles.itemUnread : ''}`}
                  onClick={() => handleMarkRead(notif._id)}
                >
                  <div className={styles.iconWrapper} style={{ background: `${cfg.color}15`, color: cfg.color }}>
                    <Icon size={16} />
                  </div>
                  <div className={styles.content}>
                    <div className={styles.titleRow}>
                      <span className={styles.title}>{notif.title}</span>
                      {!notif.isRead && <span className={styles.dot} />}
                    </div>
                    {notif.body && <p className={styles.body}>{notif.body}</p>}
                    <span className={styles.time}>{formatTime(notif.createdAt)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
```

```css
/* client/web/src/presentation/components/NotificationPanel.module.css */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 499;
}
.panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  max-width: 100vw;
  height: 100vh;
  background: #fff;
  box-shadow: -4px 0 24px rgba(0,0,0,0.1);
  z-index: 500;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.2s ease-out;
}
@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 16px;
  border-bottom: 1px solid #e2e8f0;
}
.header h2 { font-size: 18px; font-weight: 600; color: #1e293b; margin: 0; display: inline; }
.unreadBadge {
  display: inline-block;
  background: #DC2626;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 8px;
  vertical-align: middle;
}
.headerActions { display: flex; gap: 8px; align-items: center; }
.markAllBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 6px;
  font-size: 12px;
  color: #475569;
  cursor: pointer;
}
.markAllBtn:hover { background: #f8fafc; }
.closeBtn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
}
.closeBtn:hover { background: #e2e8f0; }

.list { flex: 1; overflow-y: auto; }
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: #9ca3af;
  text-align: center;
}
.empty p { margin: 0; font-size: 14px; }

.item {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background 0.15s;
}
.item:hover { background: #f8fafc; }
.itemUnread { background: #EFF6FF; }
.itemUnread:hover { background: #DBEAFE; }

.iconWrapper {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.content { flex: 1; min-width: 0; }
.titleRow { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.title { font-size: 13px; font-weight: 600; color: #1e293b; }
.dot {
  width: 7px;
  height: 7px;
  background: #2563EB;
  border-radius: 50%;
  flex-shrink: 0;
}
.body { font-size: 12px; color: #64748b; margin: 0 0 4px; line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.time { font-size: 11px; color: #9ca3af; }
```

- [ ] **Step 2: Update Layout to include NotificationPanel**

Modify `client/web/src/presentation/components/Layout.tsx`:

```tsx
// Add imports
import NotificationPanel from './NotificationPanel';

// Add state
const [showNotifications, setShowNotifications] = useState(false);

// Update the bell button
<button
  className={styles.headerIconBtn}
  onClick={() => setShowNotifications(true)}
>
  <Bell size={18} />
  <span className={styles.notificationDot} />
</button>

// Add before closing </div> in the viewport div:
<NotificationPanel
  isOpen={showNotifications}
  onClose={() => setShowNotifications(false)}
/>
```

- [ ] **Step 3: Commit**

```bash
git add client/web/src/presentation/components/NotificationPanel.tsx client/web/src/presentation/components/NotificationPanel.module.css client/web/src/presentation/components/Layout.tsx
git commit -m "feat(web): add NotificationPanel component with bell icon integration in Layout"
```

---

### Task 3.4: Create Reports feature (PDF/Excel export)

**Files:**
- Create: `client/web/src/features/reports/examReportExporter.ts`

**Steps:**

- [ ] **Step 1: Create exam report exporter**

```ts
// client/web/src/features/reports/examReportExporter.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { ExamReport, Exam, Submission } from '../../types';

export function exportExamReportPDF(report: ExamReport, exam: Exam) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('BAO CAO KET QUA THI', 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(exam.title, 105, 30, { align: 'center' });
  doc.text(`Ngay thi: ${exam.examDate ? new Date(exam.examDate).toLocaleDateString('vi-VN') : 'N/A'}`, 105, 38, { align: 'center' });

  // Statistics
  const stats = report.statistics;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Thong ke tong quan', 14, 52);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const statsData = [
    ['Tong hoc sinh', String(stats.totalStudents)],
    ['Da nop', String(stats.submittedCount)],
    ['Diem trung binh', `${stats.averageScore.toFixed(2)} / ${exam.totalScore}`],
    ['Diem cao nhat', String(stats.highestScore)],
    ['Diem thap nhat', String(stats.lowestScore)],
    ['Ty le nop bai', `${((stats.submittedCount / stats.totalStudents) * 100).toFixed(1)}%`],
  ];
  autoTable(doc, {
    startY: 56,
    head: [['Chi tieu', 'Gia tri']],
    body: statsData,
    theme: 'grid',
    headStyles: { fillColor: [11, 34, 64] },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  // Grade distribution
  const gradeY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Phan bo xep loai', 14, gradeY);

  const gradeData = [
    ['Xep loai', 'So luong', 'Ty le'],
    ['Gioi (8-10)', String(report.gradeDistribution.excellent.count), `${report.gradeDistribution.excellent.percentage}%`],
    ['Kha (6.5-8)', String(report.gradeDistribution.good.count), `${report.gradeDistribution.good.percentage}%`],
    ['Trung binh (5-6.5)', String(report.gradeDistribution.average.count), `${report.gradeDistribution.average.percentage}%`],
    ['Yeu (<5)', String(report.gradeDistribution.poor.count), `${report.gradeDistribution.poor.percentage}%`],
  ];
  autoTable(doc, {
    startY: gradeY + 4,
    head: [gradeData[0]],
    body: gradeData.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [11, 34, 64] },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  // Top students
  const topY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Top hoc sinh xuat sac', 14, topY);

  const topData = report.topStudents.map((s, i) => [
    String(i + 1),
    typeof s.studentId === 'object' ? (s.studentId as any).name : 'N/A',
    `${s.score} / ${exam.totalScore}`,
    String(s.rank),
  ]);
  autoTable(doc, {
    startY: topY + 4,
    head: [['Hang', 'Ho ten', 'Diem', 'Xep hang lop']],
    body: topData,
    theme: 'grid',
    headStyles: { fillColor: [11, 34, 64] },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  doc.save(`report-${exam.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

export function exportSubmissionsExcel(submissions: Submission[], exam: Exam, examTitle: string) {
  const data = submissions.map((s, i) => ({
    'STT': i + 1,
    'Ma SBD': s.studentCode,
    'Diem': s.totalScore,
    'Diem toi da': s.maxScore,
    'Diem cuoi cung': s.finalScore,
    'Trang thai': s.status,
    'Thoi gian nop': new Date(s.createdAt).toLocaleString('vi-VN'),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ket qua');
  XLSX.writeFile(wb, `submissions-${examTitle.replace(/\s+/g, '-').toLowerCase()}.xlsx`);
}
```

- [ ] **Step 2: Create Student Progress Report export**

```ts
// client/web/src/features/student-progress/studentProgressExporter.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { StudentProgress } from '../../types';

export function exportStudentProgressPDF(progress: StudentProgress, studentName: string) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('BAO CAO TIEN DO HOC TAP', 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Hoc sinh: ${studentName}`, 105, 30, { align: 'center' });
  doc.text(`Diem TB: ${progress.overallAverageScore.toFixed(2)}`, 105, 38, { align: 'center' });

  // Score history
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Lich su diem thi', 14, 52);

  const historyData = progress.scoreHistory.map((h, i) => [
    String(i + 1),
    typeof h.examId === 'object' ? (h.examId as any).title || 'N/A' : 'N/A',
    `${h.score} / ${h.maxScore}`,
    `${h.percentage.toFixed(0)}%`,
    h.grade,
    new Date(h.examDate).toLocaleDateString('vi-VN'),
  ]);

  autoTable(doc, {
    startY: 56,
    head: [['STT', 'Bai thi', 'Diem', 'Ty le', 'Xep loai', 'Ngay thi']],
    body: historyData,
    theme: 'grid',
    headStyles: { fillColor: [11, 34, 64] },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  doc.save(`progress-${studentName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
```

- [ ] **Step 3: Commit**

```bash
git add client/web/src/features/reports/examReportExporter.ts client/web/src/features/student-progress/studentProgressExporter.ts
git commit -m "feat(web): add PDF/Excel export for exam reports and student progress"
```

---

### Task 3.5: Create AI Tutor Chat feature

**Files:**
- Create: `client/web/src/features/ai-tutor/AITutorChat.tsx`
- Create: `client/web/src/features/ai-tutor/AITutorChat.module.css`

**Steps:**

- [ ] **Step 1: Create AI Tutor Chat component**

```tsx
// client/web/src/features/ai-tutor/AITutorChat.tsx
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, X, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { mockCurrentUser, mockStudentProgress } from '../../services/mockData';
import styles from './AITutorChat.module.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: string[];
}

const MOCK_RESPONSES = [
  'Dựa trên kết quả thi của bạn, tôi nhận thấy bạn cần ôn lại chủ đề "Hàm số bậc hai". Đây là dạng toán chiếm 30% điểm thi nhưng tỷ lệ đúng của bạn chỉ 55%.',
  'Bạn nên xem lại các bài toán về đạo hàm và tích phân. Đây là hai chủ đề xuất hiện thường xuyên trong các bài thi giữa kỳ.',
  'Tuyệt vời! Kết quả thi Toán của bạn rất tốt. Tôi khuyên bạn nên thử các bài toán nâng cao để chuẩn bị cho kỳ thi cuối kỳ.',
];

export default function AITutorChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Xin chào! Tôi là AI Tutor của Smart Grading. Tôi có thể giúp bạn:\n\n• Phân tích kết quả thi và tìm điểm yếu\n• Gợi ý tài liệu ôn tập phù hợp\n• Trả lời câu hỏi về các dạng toán\n\nBạn muốn bắt đầu với việc phân tích kết quả thi gần nhất không?`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
    const responseContent = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
    const aiMsg: Message = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: responseContent,
      timestamp: new Date().toISOString(),
      sources: ['Kết quả thi GK1 Toán 12', 'Ngân hàng câu hỏi Toán 12'],
    };
    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <div className={styles.aiAvatar}>
            <Sparkles size={20} />
          </div>
          <div>
            <h2>AI Tutor</h2>
            <span className={styles.statusDot} />
            <span className={styles.status}>Luôn sẵn sàng</span>
          </div>
        </div>
        <button className={styles.clearBtn} onClick={() => setMessages([messages[0]])}>
          <RefreshCw size={15} />
          Xóa cuộc trò chuyện
        </button>
      </div>

      <div className={styles.messages}>
        {messages.map(msg => (
          <div key={msg.id} className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.aiMessage}`}>
            <div className={styles.avatar}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={styles.bubble}>
              <div className={styles.content}>{msg.content}</div>
              {msg.sources && (
                <div className={styles.sources}>
                  <span>Nguồn: </span>
                  {msg.sources.map((s, i) => (
                    <span key={i} className={styles.sourceChip}>{s}</span>
                  ))}
                </div>
              )}
              <div className={styles.timestamp}>
                {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className={`${styles.message} ${styles.aiMessage}`}>
            <div className={styles.avatar}><Bot size={16} /></div>
            <div className={styles.bubble}>
              <div className={styles.typing}>
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <textarea
          className={styles.input}
          placeholder="Hỏi AI Tutor về kết quả học tập của bạn..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button className={styles.sendBtn} onClick={handleSend} disabled={!input.trim()}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
```

```css
/* client/web/src/features/ai-tutor/AITutorChat.module.css */
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  overflow: hidden;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}
.headerInfo { display: flex; align-items: center; gap: 12px; }
.aiAvatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #7C3AED, #2563EB);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.header h2 { font-size: 16px; font-weight: 600; color: #1e293b; margin: 0; }
.statusDot {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #16A34A;
  border-radius: 50%;
  margin: 0 6px;
}
.status { font-size: 12px; color: #16A34A; font-weight: 500; }
.clearBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 6px;
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
}
.clearBtn:hover { background: #f8fafc; }

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.message { display: flex; gap: 10px; max-width: 85%; }
.userMessage { align-self: flex-end; flex-direction: row-reverse; }
.aiMessage { align-self: flex-start; }
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #f1f5f9;
  color: #64748b;
}
.aiMessage .avatar { background: #EDE9FE; color: #7C3AED; }
.bubble {
  background: #f1f5f9;
  border-radius: 12px;
  padding: 12px 16px;
  max-width: 100%;
}
.userMessage .bubble {
  background: #0b2240;
  color: #fff;
  border-radius: 12px 12px 4px 12px;
}
.aiMessage .bubble {
  background: #f1f5f9;
  color: #1e293b;
  border-radius: 12px 12px 12px 4px;
}
.content { font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
.timestamp { font-size: 10px; color: #9ca3af; margin-top: 6px; text-align: right; }
.userMessage .timestamp { color: rgba(255,255,255,0.6); }
.sources { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.sources span:first-child { font-size: 10px; color: #9ca3af; }
.sourceChip {
  display: inline-block;
  padding: 2px 8px;
  background: #DBEAFE;
  color: #1D4ED8;
  border-radius: 4px;
  font-size: 10px;
}
.typing { display: flex; gap: 4px; padding: 4px 0; }
.typing span {
  width: 6px;
  height: 6px;
  background: #9ca3af;
  border-radius: 50%;
  animation: typing 1.2s infinite;
}
.typing span:nth-child(2) { animation-delay: 0.2s; }
.typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-6px); opacity: 1; }
}

.inputArea {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  align-items: flex-end;
}
.input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  resize: none;
  max-height: 120px;
  font-family: inherit;
  background: #fff;
  outline: none;
  transition: border-color 0.2s;
}
.input:focus { border-color: #7C3AED; }
.sendBtn {
  width: 40px;
  height: 40px;
  background: #7C3AED;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  flex-shrink: 0;
}
.sendBtn:hover:not(:disabled) { background: #6D28D9; }
.sendBtn:disabled { opacity: 0.5; cursor: not-allowed; }
```

- [ ] **Step 2: Commit**

```bash
git add client/web/src/features/ai-tutor/AITutorChat.tsx client/web/src/features/ai-tutor/AITutorChat.module.css
git commit -m "feat(web): add AI Tutor chat component for student learning support"
```

---

## PHASE 4: Polish & Integration (Ngày 6)

### Task 4.1: Clean up unused App.tsx and add 404 page

**Files:**
- Delete: `client/web/src/App.tsx` (unused template)
- Delete: `client/web/src/App.css` (unused)
- Create: `client/web/src/pages/NotFoundPage.tsx`
- Modify: `client/web/src/presentation/routes/AppRoutes.tsx` (update wildcard route)

**Steps:**

- [ ] **Step 1: Create NotFoundPage**

```tsx
// client/web/src/pages/NotFoundPage.tsx
import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <span className={styles.code}>404</span>
        <h1>Trang không tìm thấy</h1>
        <p>Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.</p>
        <Link to="/" className={styles.homeBtn}> Quay về trang chủ </Link>
      </div>
    </div>
  );
}
```

```css
/* client/web/src/pages/NotFoundPage.module.css */
.container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 24px;
}
.content {
  text-align: center;
  max-width: 400px;
}
.code {
  font-size: 96px;
  font-weight: 800;
  color: #0b2240;
  opacity: 0.15;
  display: block;
  line-height: 1;
  margin-bottom: -20px;
}
.content h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px;
}
.content p {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 28px;
  line-height: 1.6;
}
.homeBtn {
  display: inline-flex;
  align-items: center;
  padding: 12px 24px;
  background: #0b2240;
  color: #fff;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.2s;
}
.homeBtn:hover { background: #1a3a5c; }
```

- [ ] **Step 2: Update AppRoutes wildcard to show 404**

Change `<Route path="*" element={<Navigate to="/" replace />} />` to show NotFoundPage instead.

- [ ] **Step 3: Delete unused files**

```bash
rm client/web/src/App.tsx client/web/src/App.css 2>/dev/null || true
```

- [ ] **Step 4: Commit**

```bash
git add client/web/src/pages/NotFoundPage.tsx client/web/src/pages/NotFoundPage.module.css
git commit -m "chore(web): add 404 NotFoundPage and remove unused App.tsx template"
```

---

### Task 4.2: Final verification and lint check

**Files:**
- None (verification only)

**Steps:**

- [ ] **Step 1: Run TypeScript check**

```bash
cd client/web && npx tsc --noEmit 2>&1 | head -50
```

- [ ] **Step 2: Run build test**

```bash
cd client/web && npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Run lint check**

```bash
cd client/web && npm run lint 2>&1 | head -30
```

- [ ] **Step 4: Run tests**

```bash
cd client/web && npm test 2>&1 | tail -20
```

- [ ] **Step 5: If errors found, fix them**

Fix any TypeScript errors, lint errors, or test failures. Commit fixes.

- [ ] **Step 6: Final commit**

```bash
git add -A && git commit -m "fix(web): resolve TypeScript/lint errors from Phase 1-4"
```

---

## Summary

| Phase | Tasks | Files Changed |
|-------|-------|-------------|
| 1 | Setup (deps, error boundary, types, mock data) | 8 files |
| 2 | Complete missing pages (Submissions, Analytics, Settings, Help, Appeals, Scan) | 12 files |
| 3 | Enhance existing (routes, dashboard, notifications, reports, AI tutor) | 6 files |
| 4 | Polish (404, cleanup, verification) | 4 files |
| **Total** | **17 tasks** | **~30 files** |

---

## Self-Review Checklist

- [ ] All 4 new pages have both `.tsx` and `.module.css` files
- [ ] All new pages are registered in `AppRoutes.tsx`
- [ ] Mock data covers all new features for offline development
- [ ] ErrorBoundary wraps the entire app
- [ ] NotificationPanel integrates with Layout bell icon
- [ ] PDF/Excel export functions are created and importable
- [ ] AI Tutor chat component is standalone and reusable
- [ ] TypeScript compiles without errors
- [ ] All pages use CSS Modules (no inline styles)
- [ ] Every task has a commit with descriptive message
