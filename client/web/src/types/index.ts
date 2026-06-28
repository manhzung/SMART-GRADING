// =============================================================================
// SMART GRADING - Centralized TypeScript Types
// =============================================================================
// All TypeScript interfaces for the SMART GRADING application.
// These types are extracted from store files and MongoDB database design.
// =============================================================================

// ─── Common Types ─────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole = 'teacher' | 'admin' | 'student' | 'parent';

export interface User {
  _id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  schoolId?: string | School;
  classIds?: string[] | Class[];
  createdAt: string;
  updatedAt?: string;
  // ── Registration Status (for teacher approval workflow) ─────────────────────
  registrationStatus?: 'pending' | 'approved' | 'rejected';
  rejectedReason?: string | null;
  registeredSchoolId?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  schoolId?: string;
}

// ─── School & Academic ────────────────────────────────────────────────────────

export interface School {
  _id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  principalName?: string;
  code?: string;
  createdAt: string;
  // ── Registration Status (for school approval workflow) ─────────────────────
  registrationStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  rejectedReason?: string | null;
}

export interface Subject {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  color?: string;
  schoolId?: string;
  createdAt: string;
}

export interface ClassRef {
  _id: string;
  name: string;
  code?: string;
}

export interface Class {
  _id: string;
  name: string;
  grade?: number;
  subjectIds?: string[] | Subject[];
  teacherId?: string | User;
  studentIds?: string[] | Student[];
  schoolId?: string | School;
  createdAt: string;
  updatedAt?: string;
}

export interface Student {
  _id: string;
  name: string;
  email?: string;
  studentCode?: string;
  classId?: string | Class;
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  address?: string;
  parentId?: string | User;
  avatar?: string;
  createdAt: string;
}

// ─── Questions & Exams ────────────────────────────────────────────────────────

export type QuestionType = 'single_choice' | 'multiple_choice' | 'essay' | 'true_false';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Source = 'ai' | 'manual' | 'imported';

export interface QuestionOption {
  id: 'A' | 'B' | 'C' | 'D';
  content: string;
  text?: string;
  isCorrect?: boolean;
  order?: number;
}

export interface Question {
  _id: string;
  id: string;
  content: string;
  text?: string;
  type: QuestionType;
  options: QuestionOption[];
  correctAnswer?: 'A' | 'B' | 'C' | 'D';
  correctAnswers?: ('A' | 'B' | 'C' | 'D')[];
  imageUrl?: string;
  difficulty: Difficulty;
  score?: number;
  topicId?: string;
  topicName?: string;
  explanation?: string;
  formula?: string;
  source: Source;
  tags?: string[];
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  usageCount: number;
  correctRate?: number;
  isActive?: boolean;
  isAiGenerated?: boolean;
  isPremium?: boolean;
  createdBy?: string | { _id: string; name: string; schoolId?: string };
  createdByName?: string;
  schoolId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateQuestionPayload {
  content: string;
  type?: QuestionType;
  options: { id: 'A' | 'B' | 'C' | 'D'; content: string; isCorrect: boolean }[];
  difficulty?: Difficulty;
  topicId?: string;
  explanation?: string;
  imageUrl?: string;
  tags?: string[];
  source?: Source;
  aiPrompt?: string;
}

export type ExamStatus = 'draft' | 'published' | 'in_progress' | 'completed' | 'archived';
export type ExamType = 'midterm' | 'final' | 'practice';

export interface Exam {
  _id: string;
  title: string;
  description?: string;
  status: ExamStatus;
  examType?: ExamType;
  classId?: string;
  classIds?: ClassRef[];
  primaryClassId?: string | ClassRef;
  subjectId?: string | { _id: string; name: string; color?: string };
  subjectName?: string;
  subjectColor?: string;
  teacherId?: string | User;
  examDate?: string;
  date?: string;
  startTime?: string;
  scheduledAt?: string;
  duration?: number;
  totalScore?: number;
  passingScore?: number;
  numberOfQuestions?: number;
  questionIds?: (string | Question)[];
  numberOfVersions?: number;
  totalSubmissions?: number;
  totalStudents?: number;
  createdBy?: { _id: string; name: string };
  omrTemplateId?: { _id: string; name: string; code?: string };
  printConfig?: {
    paperSize?: string;
    questionsPerPage?: number;
    includeAnswerSheet?: boolean;
    schoolHeader?: boolean;
  };
  shuffleConfig?: {
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateExamPayload {
  title: string;
  description?: string;
  classIds: string[];
  primaryClassId?: string;
  subjectId?: string;
  examDate?: string;
  duration?: number;
  totalScore?: number;
  status?: ExamStatus;
  questionIds?: string[];
}

export interface ExamVersionQuestion {
  position: number;
  questionId: string;
  originalPosition: number;
  shuffledOptions: Array<{ id: string; text: string; isCorrect?: boolean }>;
}

export interface ExamVersion {
  _id: string;
  examId: string;
  versionCode: string;
  numberOfQuestions: number;
  questionIds: string[];
  questions?: ExamVersionQuestion[];
  distribution: Record<string, number>;
  submissionCount: number;
  createdAt: string;
}

export interface OMRTemplate {
  _id: string;
  name: string;
  rows: number;
  cols: number;
  questionCount: number;
  answerPositions: Array<{ row: number; col: number }>;
  schoolId: string;
  createdAt: string;
  // Full template data (from /:id/full endpoint)
  pageConfig?: PageConfig;
  zones?: Zones;
}

// ─── OMR Template Zone Types ────────────────────────────────────────────────

export interface PageConfig {
  paperSize?: 'A4' | 'A5' | 'A3' | string;
  defaultDPI?: number;
  margins?: { top?: number; bottom?: number; left?: number; right?: number };
  customSize?: { width?: number; height?: number };
}

export interface Zones {
  header?: HeaderZone;
  versionCode?: VersionCodeZone;
  studentCode?: StudentCodeZone;
  answerArea?: AnswerAreaZone;
  footer?: FooterZone;
}

export interface HeaderZone {
  enabled?: boolean;
  height?: number;
  elements?: Array<{
    type: string;
    position: { x: number; y: number };
    width?: number;
    height?: number;
    fontSize?: number;
  }>;
}

export interface VersionCodeZone {
  enabled?: boolean;
  position?: { x: number; y: number };
  digits?: number;
  digitConfig?: {
    optionsPerDigit?: number;
    bubbleSize?: { width?: number; height?: number };
    bubbleSpacing?: { horizontal?: number; vertical?: number };
  };
  label?: { text?: string; fontSize?: number; position?: string };
}

export interface StudentCodeZone {
  enabled?: boolean;
  position?: { x: number; y: number };
  digits?: number;
  digitConfig?: {
    optionsPerDigit?: number;
    bubbleSize?: { width?: number; height?: number };
    bubbleSpacing?: { horizontal?: number; vertical?: number };
  };
  label?: { text?: string; fontSize?: number; position?: string };
}

export interface AnswerAreaZone {
  enabled?: boolean;
  startPosition?: { x: number; y: number };
  dimensions?: { width?: number; height?: number };
  gridConfig?: {
    questionsPerRow?: number;
    rowsPerPage?: number;
    totalQuestions?: number;
    bubbleConfig?: {
      width?: number;
      height?: number;
      shape?: 'circle' | 'square';
      borderColor?: string;
      borderWidth?: number;
      fillColor?: string;
      minFillIntensity?: number;
      spacing?: {
        betweenOptions?: number;
        betweenQuestions?: number;
        betweenRows?: number;
      };
    };
    questionNumberConfig?: {
      enabled?: boolean;
      position?: string;
      fontSize?: number;
      fontWeight?: string;
      alignment?: string;
      width?: number;
    };
  };
  pagination?: { enabled?: boolean; questionsPerPage?: number; totalPages?: number };
}

export interface FooterZone {
  enabled?: boolean;
  height?: number;
}

export interface ExamFilters {
  status?: string;
  classId?: string;
  subjectId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ExamStatistics {
  totalExams: number;
  totalStudents: number;
  totalSubmissions: number;
  averageScore: number;
  submissionRate: number;
  statusBreakdown: {
    draft: number;
    published: number;
    in_progress: number;
    completed: number;
    archived: number;
  };
}

// ─── Submissions & Grading ────────────────────────────────────────────────────

export type SubmissionStatus = 'pending' | 'submitted' | 'graded' | 'reviewed';

export interface Answer {
  questionId: string;
  selectedAnswer?: string;
  studentAnswer?: string;
  isCorrect?: boolean;
  points?: number;
}

export interface GradingResult {
  score: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  answerKey: Record<string, string>;
  studentAnswers: Record<string, string>;
}

export interface Submission {
  _id: string;
  examId: string;
  examVersionId?: string;
  studentId: string | { _id: string; name: string; email: string };
  studentName?: string;
  studentEmail?: string;
  classId: string;
  className?: string;
  versionCode: string;
  answers: Record<string, string>;
  score?: number;
  maxScore?: number;
  status: SubmissionStatus;
  submittedAt: string;
  gradedAt?: string;
  gradedBy?: string;
  gradingResult?: GradingResult;
  scannedImage?: string;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BackendSubmission {
  _id: string;
  examId: string;
  studentId: {
    _id: string;
    name: string;
    email: string;
  };
  classId: string;
  versionCode: string;
  answers: Record<string, string>;
  score?: number;
  status: SubmissionStatus;
  submittedAt: string;
  gradedAt?: string;
  gradingResult?: GradingResult;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionStatistics {
  totalSubmissions: number;
  totalStudents: number;
  submissionRate: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate?: number;
  gradeDistribution: {
    grade: string;
    count: number;
    percentage: number;
  }[];
  scoreHistogram: {
    range: string;
    count: number;
  }[];
}

// ─── Appeals ─────────────────────────────────────────────────────────────────

export type AppealStatus = 'pending' | 'reviewing' | 'under_review' | 'approved' | 'rejected';

export interface Appeal {
  _id: string;
  submissionId: string;
  studentId: string | User;
  questionId: string | Question;
  reason: string;
  status: AppealStatus;
  resolvedAt?: string;
  resolvedBy?: string | User;
  resolution?: string;
  createdAt: string;
  updatedAt?: string;
}

// Backend Appeal model (from MongoDB)
export interface BackendAppeal {
  _id: string;
  submissionId: string;
  examId: { _id: string; title: string } | string;
  studentId: { _id: string; name: string; studentCode?: string } | string;
  questionId: { _id: string; content: string } | string;
  questionPosition: number;
  reason: string;
  evidenceImageUrl?: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  teacherResponse?: {
    reviewedBy: { _id: string; name: string } | string;
    reviewedAt: string;
    decision: 'approved' | 'rejected';
    note?: string;
    scoreAdjustment?: { oldScore: number; newScore: number };
  };
  studentNotified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewPayload {
  decision: 'approved' | 'rejected';
  note?: string;
  newScore?: number;
  oldScore?: number;
}

// ─── Reports & Analytics ─────────────────────────────────────────────────────

export interface GradeDistributionItem {
  grade: string;
  count: number;
  percentage: number;
}

export interface ExamReport {
  _id: string;
  examId: string | Exam;
  totalStudents: number;
  avgScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  gradeDistribution: Record<string, number>;
  createdAt: string;
}

export interface StudentProgress {
  _id: string;
  studentId: string | Student;
  subjectId: string | Subject;
  examId: string | Exam;
  score: number;
  percentile?: number;
  trend: 'up' | 'down' | 'stable';
  period?: string;
  createdAt: string;
}

export interface SubjectPerformance {
  subjectId: string | Subject;
  avgScore: number;
  totalExams: number;
  totalStudents: number;
  passRate: number;
}

export interface StudentRanking {
  studentId: string | Student;
  rank: number;
  totalScore: number;
  averageScore: number;
  examCount: number;
}

export interface RecentTrend {
  period: string;
  avgScore: number;
  examCount: number;
  studentCount: number;
}

export interface Analytics {
  summaryStats: {
    totalExams: number;
    totalStudents: number;
    averageScore: number;
    submissionRate: number;
  };
  subjectPerformance: SubjectPerformance[];
  gradeDistribution: GradeDistributionItem[];
  studentRankings: StudentRanking[];
  recentTrends: RecentTrend[];
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationType = 'info' | 'warning' | 'success' | 'error';

export interface Notification {
  _id: string;
  userId: string | User;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

// ─── AI Tutor ───────────────────────────────────────────────────────────────

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface AIReport {
  _id: string;
  examId: string | Exam;
  studentId: string | Student;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  avgScore?: number;
  passRate?: number;
  totalStudents?: number;
  createdAt: string;
}

export interface AIChat {
  _id: string;
  studentId: string | Student;
  messages: AIMessage[];
  subjectId?: string | Subject;
  createdAt: string;
  updatedAt?: string;
}

// ─── Store State Types ───────────────────────────────────────────────────────

export interface QuestionState {
  questions: Question[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  createError: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    search: string;
    difficulty: string;
    source: string;
    tags: string;
    isApproved: boolean | null;
  };
}

export interface ExamState {
  exams: Exam[];
  currentExam: Exam | null;
  examVersions: ExamVersion[];
  examStatistics: ExamStatistics | null;
  isLoading: boolean;
  isLoadingDetail: boolean;
  isPublishing: boolean;
  isCompleting: boolean;
  isGeneratingVersions: boolean;
  error: string | null;
}

export interface SubmissionState {
  submissions: Submission[];
  statistics: SubmissionStatistics | null;
  isLoading: boolean;
  isLoadingStats: boolean;
  error: string | null;
}
