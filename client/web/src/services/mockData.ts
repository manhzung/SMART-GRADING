/**
 * Mock Data Service
 * Comprehensive mock data for frontend development without a backend.
 * All data uses realistic Vietnamese names, plausible exam scores, and relative dates.
 */

import type {
  Exam,
  ExamVersion,
} from '../presentation/store/examStore';
import type {
  BackendQuestion,
} from '../presentation/store/questionStore';
import type {
  BackendSubmission,
} from '../presentation/store/submissionStore';
import type {
  ClassItem,
} from '../presentation/store/classStore';
import type {
  OMRTemplate,
} from '../presentation/store/omrTemplateStore';
import type {
  User,
} from '../presentation/store/authStore';
import type {
  ExamItem,
  DashboardStats,
} from '../presentation/store/dashboardStore';

// ─── Helper: Generate relative dates ─────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

function monthsAgo(n: number, day = 15): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(day);
  return d.toISOString();
}

// ─── 1. USERS ────────────────────────────────────────────────────────────────

export const mockUsers: User[] = [
  // 2 Teachers
  {
    id: 't001',
    name: 'Nguyễn Thị Mai Hương',
    email: 'maihuong@thpt-nbk.edu.vn',
    role: 'teacher',
    isEmailVerified: true,
    schoolId: 'school001',
  },
  {
    id: 't002',
    name: 'Trần Văn Minh',
    email: 'minhtran@thpt-nbk.edu.vn',
    role: 'teacher',
    isEmailVerified: true,
    schoolId: 'school001',
  },
  // 1 Admin
  {
    id: 'admin001',
    name: 'Lê Hoàng Nam',
    email: 'nam.admin@thpt-nbk.edu.vn',
    role: 'admin',
    isEmailVerified: true,
    schoolId: 'school001',
  },
  // 5 Students
  {
    id: 's001',
    name: 'Phạm Thanh Hà',
    email: 'hapt_s1@student.thpt-nbk.edu.vn',
    role: 'student',
    isEmailVerified: true,
    schoolId: 'school001',
  },
  {
    id: 's002',
    name: 'Đặng Minh Tuấn',
    email: 'tuan.dm@student.thpt-nbk.edu.vn',
    role: 'student',
    isEmailVerified: true,
    schoolId: 'school001',
  },
  {
    id: 's003',
    name: 'Lê Thu Phương',
    email: 'phuong.lt@student.thpt-nbk.edu.vn',
    role: 'student',
    isEmailVerified: true,
    schoolId: 'school001',
  },
  {
    id: 's004',
    name: 'Ngô Đức Anh',
    email: 'anh.nd@student.thpt-nbk.edu.vn',
    role: 'student',
    isEmailVerified: false,
    schoolId: 'school001',
  },
  {
    id: 's005',
    name: 'Bùi Thị Lan',
    email: 'lan.bt@student.thpt-nbk.edu.vn',
    role: 'student',
    isEmailVerified: true,
    schoolId: 'school001',
  },
];

export const mockTeachers = mockUsers.filter(u => u.role === 'teacher');
export const mockStudents = mockUsers.filter(u => u.role === 'student');

// ─── 2. SCHOOLS ──────────────────────────────────────────────────────────────

export interface School {
  _id: string;
  name: string;
  address: string;
  logoUrl?: string;
  createdAt: string;
}

export const mockSchools: School[] = [
  {
    _id: 'school001',
    name: 'Trường THPT Chuyên Nguyễn Bỉnh Khiêm',
    address: '01 Võ Văn Ngân, Quận Thủ Đức, TP. Hồ Chí Minh',
    logoUrl: undefined,
    createdAt: daysAgo(365 * 5),
  },
];

// ─── 3. SUBJECTS ─────────────────────────────────────────────────────────────

export interface Subject {
  _id: string;
  name: string;
  code: string;
  description: string;
  gradeLevel: number;
  color: string;
}

export const mockSubjects: Subject[] = [
  {
    _id: 'subj001',
    name: 'Toán học',
    code: 'TOAN',
    description: 'Môn Toán dành cho học sinh THPT',
    gradeLevel: 10,
    color: '#3B82F6',
  },
  {
    _id: 'subj002',
    name: 'Vật Lý',
    code: 'LY',
    description: 'Môn Vật Lý dành cho học sinh THPT',
    gradeLevel: 10,
    color: '#10B981',
  },
  {
    _id: 'subj003',
    name: 'Hóa Học',
    code: 'HOA',
    description: 'Môn Hóa Học dành cho học sinh THPT',
    gradeLevel: 10,
    color: '#8B5CF6',
  },
  {
    _id: 'subj004',
    name: 'Ngữ Văn',
    code: 'VAN',
    description: 'Môn Ngữ Văn dành cho học sinh THPT',
    gradeLevel: 10,
    color: '#EF4444',
  },
  {
    _id: 'subj005',
    name: 'Tiếng Anh',
    code: 'ANH',
    description: 'Môn Tiếng Anh dành cho học sinh THPT',
    gradeLevel: 10,
    color: '#F59E0B',
  },
];

// ─── 4. CLASSES ─────────────────────────────────────────────────────────────

export const mockClasses: ClassItem[] = [
  {
    _id: 'cls001',
    name: '10A1',
    code: '10A1',
    gradeLevel: 10,
    academicYear: '2025-2026',
    schoolId: 'school001',
    homeroomTeacherId: { _id: 't001', name: 'Nguyễn Thị Mai Hương', email: 'maihuong@thpt-nbk.edu.vn' },
    studentIds: ['s001', 's002', 's003', 's004', 's005'],
    subjectTeachers: [
      { subjectId: { _id: 'subj001', name: 'Toán học', code: 'TOAN', color: '#3B82F6' }, teacherId: { _id: 't001', name: 'Nguyễn Thị Mai Hương', email: 'maihuong@thpt-nbk.edu.vn' } },
      { subjectId: { _id: 'subj002', name: 'Vật Lý', code: 'LY', color: '#10B981' }, teacherId: { _id: 't002', name: 'Trần Văn Minh', email: 'minhtran@thpt-nbk.edu.vn' } },
      { subjectId: { _id: 'subj003', name: 'Hóa Học', code: 'HOA', color: '#8B5CF6' }, teacherId: { _id: 't002', name: 'Trần Văn Minh', email: 'minhtran@thpt-nbk.edu.vn' } },
    ],
    isActive: true,
    enrollmentCode: 'NBK10A12026',
    createdAt: daysAgo(180),
    updatedAt: daysAgo(30),
  },
  {
    _id: 'cls002',
    name: '10A2',
    code: '10A2',
    gradeLevel: 10,
    academicYear: '2025-2026',
    schoolId: 'school001',
    homeroomTeacherId: { _id: 't002', name: 'Trần Văn Minh', email: 'minhtran@thpt-nbk.edu.vn' },
    studentIds: [],
    subjectTeachers: [
      { subjectId: { _id: 'subj001', name: 'Toán học', code: 'TOAN', color: '#3B82F6' }, teacherId: { _id: 't002', name: 'Trần Văn Minh', email: 'minhtran@thpt-nbk.edu.vn' } },
    ],
    isActive: true,
    enrollmentCode: 'NBK10A22026',
    createdAt: daysAgo(180),
    updatedAt: daysAgo(30),
  },
  {
    _id: 'cls003',
    name: '11A1',
    code: '11A1',
    gradeLevel: 11,
    academicYear: '2025-2026',
    schoolId: 'school001',
    homeroomTeacherId: { _id: 't001', name: 'Nguyễn Thị Mai Hương', email: 'maihuong@thpt-nbk.edu.vn' },
    studentIds: [],
    subjectTeachers: [],
    isActive: true,
    enrollmentCode: 'NBK11A12026',
    createdAt: daysAgo(365),
    updatedAt: daysAgo(60),
  },
  {
    _id: 'cls004',
    name: '11A2',
    code: '11A2',
    gradeLevel: 11,
    academicYear: '2025-2026',
    schoolId: 'school001',
    homeroomTeacherId: { _id: 't002', name: 'Trần Văn Minh', email: 'minhtran@thpt-nbk.edu.vn' },
    studentIds: [],
    subjectTeachers: [],
    isActive: true,
    enrollmentCode: 'NBK11A22026',
    createdAt: daysAgo(365),
    updatedAt: daysAgo(60),
  },
  {
    _id: 'cls005',
    name: '12A1',
    code: '12A1',
    gradeLevel: 12,
    academicYear: '2025-2026',
    schoolId: 'school001',
    homeroomTeacherId: { _id: 't001', name: 'Nguyễn Thị Mai Hương', email: 'maihuong@thpt-nbk.edu.vn' },
    studentIds: [],
    subjectTeachers: [
      { subjectId: { _id: 'subj001', name: 'Toán học', code: 'TOAN', color: '#3B82F6' }, teacherId: { _id: 't001', name: 'Nguyễn Thị Mai Hương', email: 'maihuong@thpt-nbk.edu.vn' } },
      { subjectId: { _id: 'subj004', name: 'Ngữ Văn', code: 'VAN', color: '#EF4444' }, teacherId: { _id: 't002', name: 'Trần Văn Minh', email: 'minhtran@thpt-nbk.edu.vn' } },
    ],
    isActive: true,
    enrollmentCode: 'NBK12A12026',
    createdAt: daysAgo(730),
    updatedAt: daysAgo(15),
  },
];

// ─── 5. QUESTIONS ───────────────────────────────────────────────────────────

export const mockQuestions: BackendQuestion[] = [
  // Toán học - 10 câu
  {
    _id: 'q001', id: 'Q001', content: 'Tính đạo hàm của hàm số f(x) = x³ + 2x² - 5x + 1.',
    type: 'single_choice', options: [
      { id: 'A', content: '3x² + 4x - 5', isCorrect: true },
      { id: 'B', content: '3x² + 2x - 5', isCorrect: false },
      { id: 'C', content: 'x³ + 4x - 5', isCorrect: false },
      { id: 'D', content: '3x² + 4x + 1', isCorrect: false },
    ],
    correctAnswer: 'A', score: 1, difficulty: 'easy', topicId: 'topic001', topicName: 'Đạo hàm',
    source: 'ai', explanation: 'Sử dụng quy tắc đạo hàm cơ bản: (xⁿ)\' = nxⁿ⁻¹.',
    usageCount: 12, correctRate: 0.78, isActive: true, isApproved: true,
    createdAt: daysAgo(90), updatedAt: daysAgo(30), createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương', schoolId: 'school001' },
  },
  {
    _id: 'q002', id: 'Q002', content: 'Giải phương trình: x² - 5x + 6 = 0',
    type: 'single_choice', options: [
      { id: 'A', content: 'x = 1 hoặc x = 6', isCorrect: false },
      { id: 'B', content: 'x = 2 hoặc x = 3', isCorrect: true },
      { id: 'C', content: 'x = -2 hoặc x = -3', isCorrect: false },
      { id: 'D', content: 'x = 1 hoặc x = 5', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'easy', topicId: 'topic001', topicName: 'Phương trình bậc hai',
    source: 'manual', explanation: 'Sử dụng công thức nghiệm phương trình bậc hai.',
    usageCount: 25, correctRate: 0.85, isActive: true, isApproved: true,
    createdAt: daysAgo(120), updatedAt: daysAgo(60), createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương', schoolId: 'school001' },
  },
  {
    _id: 'q003', id: 'Q003', content: 'Tính tích phân: ∫₀¹ x² dx',
    type: 'single_choice', options: [
      { id: 'A', content: '1/4', isCorrect: false },
      { id: 'B', content: '1/3', isCorrect: true },
      { id: 'C', content: '1/2', isCorrect: false },
      { id: 'D', content: '1', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'medium', topicId: 'topic002', topicName: 'Tích phân',
    source: 'ai', explanation: '∫x²dx = x³/3, đánh giá từ 0 đến 1 cho kết quả 1/3.',
    usageCount: 8, correctRate: 0.62, isActive: true, isApproved: true,
    createdAt: daysAgo(60), updatedAt: daysAgo(15), createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương', schoolId: 'school001' },
  },
  {
    _id: 'q004', id: 'Q004', content: 'Tìm tập xác định của hàm số y = √(x - 3) + 1/(x - 5)',
    type: 'single_choice', options: [
      { id: 'A', content: '[3; +∞) \\ {5}', isCorrect: true },
      { id: 'B', content: '(3; +∞) \\ {5}', isCorrect: false },
      { id: 'C', content: '[3; 5) ∪ (5; +∞)', isCorrect: false },
      { id: 'D', content: 'R \\ {5}', isCorrect: false },
    ],
    correctAnswer: 'A', score: 1, difficulty: 'medium', topicId: 'topic003', topicName: 'Tập xác định',
    source: 'manual', explanation: 'x-3 ≥ 0 và x-5 ≠ 0, kết hợp được [3;+∞)\\{5}.',
    usageCount: 15, correctRate: 0.70, isActive: true, isApproved: true,
    createdAt: daysAgo(80), updatedAt: daysAgo(40), createdBy: { _id: 't002', name: 'Trần Văn Minh', schoolId: 'school001' },
  },
  {
    _id: 'q005', id: 'Q005', content: 'Cho hàm số y = f(x) = x³ - 3x. Khẳng định nào SAI?',
    type: 'single_choice', options: [
      { id: 'A', content: 'Hàm số đồng biến trên khoảng (-1; 1)', isCorrect: false },
      { id: 'B', content: 'Hàm số nghịch biến trên khoảng (-∞; -1)', isCorrect: false },
      { id: 'C', content: 'Đồ thị hàm số đi qua gốc tọa độ', isCorrect: false },
      { id: 'D', content: 'Hàm số có 2 điểm cực trị', isCorrect: true },
    ],
    correctAnswer: 'D', score: 1, difficulty: 'hard', topicId: 'topic004', topicName: 'Cực trị',
    source: 'ai', explanation: 'f\'(x)=3x²-3=0 ⇒ x=±1. Hàm số có 2 điểm cực trị tại x=-1 và x=1.',
    usageCount: 5, correctRate: 0.55, isActive: true, isApproved: true,
    createdAt: daysAgo(45), updatedAt: daysAgo(10), createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương', schoolId: 'school001' },
  },
  // Vật Lý - 6 câu
  {
    _id: 'q006', id: 'Q006', content: 'Một vật chuyển động thẳng đều với vận tốc 10 m/s. Quãng đường vật đi được trong 5 giây là bao nhiêu?',
    type: 'single_choice', options: [
      { id: 'A', content: '25 m', isCorrect: false },
      { id: 'B', content: '50 m', isCorrect: true },
      { id: 'C', content: '100 m', isCorrect: false },
      { id: 'D', content: '15 m', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'easy', topicId: 'topic010', topicName: 'Chuyển động thẳng đều',
    source: 'manual', explanation: 's = v × t = 10 × 5 = 50 m.',
    usageCount: 30, correctRate: 0.92, isActive: true, isApproved: true,
    createdAt: daysAgo(150), updatedAt: daysAgo(90), createdBy: { _id: 't002', name: 'Trần Văn Minh', schoolId: 'school001' },
  },
  {
    _id: 'q007', id: 'Q007', content: 'Công thức tính động năng của vật là gì?',
    type: 'single_choice', options: [
      { id: 'A', content: 'Wđ = mgh', isCorrect: false },
      { id: 'B', content: 'Wđ = ½mv²', isCorrect: true },
      { id: 'C', content: 'Wđ = mv²', isCorrect: false },
      { id: 'D', content: 'Wđ = mgh + ½mv²', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'easy', topicId: 'topic011', topicName: 'Động năng',
    source: 'manual', explanation: 'Động năng của vật: Wđ = ½mv².',
    usageCount: 22, correctRate: 0.88, isActive: true, isApproved: true,
    createdAt: daysAgo(100), updatedAt: daysAgo(50), createdBy: { _id: 't002', name: 'Trần Văn Minh', schoolId: 'school001' },
  },
  {
    _id: 'q008', id: 'Q008', content: 'Lực hấp dẫn giữa hai vật phụ thuộc vào những yếu tố nào?',
    type: 'single_choice', options: [
      { id: 'A', content: 'Khối lượng và khoảng cách', isCorrect: true },
      { id: 'B', content: 'Chỉ khối lượng', isCorrect: false },
      { id: 'C', content: 'Chỉ khoảng cách', isCorrect: false },
      { id: 'D', content: 'Thể tích và khối lượng', isCorrect: false },
    ],
    correctAnswer: 'A', score: 1, difficulty: 'medium', topicId: 'topic012', topicName: 'Lực hấp dẫn',
    source: 'ai', explanation: 'F = G(m₁m₂)/r² phụ thuộc vào cả hai khối lượng và bình phương khoảng cách.',
    usageCount: 18, correctRate: 0.75, isActive: true, isApproved: true,
    createdAt: daysAgo(70), updatedAt: daysAgo(35), createdBy: { _id: 't002', name: 'Trần Văn Minh', schoolId: 'school001' },
  },
  {
    _id: 'q009', id: 'Q009', content: 'Một con lắc lò xo dao động điều hòa với chu kỳ T. Nếu tăng khối lượng lên 4 lần thì chu kỳ là bao nhiêu?',
    type: 'single_choice', options: [
      { id: 'A', content: '2T', isCorrect: true },
      { id: 'B', content: '4T', isCorrect: false },
      { id: 'C', content: 'T/2', isCorrect: false },
      { id: 'D', content: 'T/4', isCorrect: false },
    ],
    correctAnswer: 'A', score: 1, difficulty: 'hard', topicId: 'topic013', topicName: 'Con lắc lò xo',
    source: 'ai', explanation: 'T = 2π√(m/k), nếu m tăng 4 lần thì T tăng 2 lần.',
    usageCount: 7, correctRate: 0.60, isActive: true, isApproved: true,
    createdAt: daysAgo(30), updatedAt: daysAgo(5), createdBy: { _id: 't002', name: 'Trần Văn Minh', schoolId: 'school001' },
  },
  {
    _id: 'q010', id: 'Q010', content: 'Hiệu điện thế giữa hai điểm A và B là U = 12V. Công của lực điện khi di chuyển điện tích q = 2C từ A đến B là bao nhiêu?',
    type: 'single_choice', options: [
      { id: 'A', content: '6 J', isCorrect: false },
      { id: 'B', content: '14 J', isCorrect: false },
      { id: 'C', content: '24 J', isCorrect: true },
      { id: 'D', content: '10 J', isCorrect: false },
    ],
    correctAnswer: 'C', score: 1, difficulty: 'medium', topicId: 'topic014', topicName: 'Công của lực điện',
    source: 'manual', explanation: 'A = qU = 2 × 12 = 24 J.',
    usageCount: 14, correctRate: 0.80, isActive: true, isApproved: true,
    createdAt: daysAgo(55), updatedAt: daysAgo(20), createdBy: { _id: 't002', name: 'Trần Văn Minh', schoolId: 'school001' },
  },
  {
    _id: 'q011', id: 'Q011', content: 'Tốc độ ánh sáng trong chân không là bao nhiêu km/s?',
    type: 'single_choice', options: [
      { id: 'A', content: '3 × 10⁶ km/s', isCorrect: false },
      { id: 'B', content: '3 × 10⁵ km/s', isCorrect: true },
      { id: 'C', content: '3 × 10⁴ km/s', isCorrect: false },
      { id: 'D', content: '3 × 10⁷ km/s', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'easy', topicId: 'topic015', topicName: 'Thuyết tương đối',
    source: 'manual', explanation: 'c = 300.000 km/s = 3 × 10⁵ km/s.',
    usageCount: 40, correctRate: 0.95, isActive: true, isApproved: true,
    createdAt: daysAgo(200), updatedAt: daysAgo(100), createdBy: { _id: 't002', name: 'Trần Văn Minh', schoolId: 'school001' },
  },
  // Hóa Học - 6 câu
  {
    _id: 'q012', id: 'Q012', content: 'Công thức hóa học của axit sunfuric là gì?',
    type: 'single_choice', options: [
      { id: 'A', content: 'HCl', isCorrect: false },
      { id: 'B', content: 'H₂SO₄', isCorrect: true },
      { id: 'C', content: 'HNO₃', isCorrect: false },
      { id: 'D', content: 'H₃PO₄', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'easy', topicId: 'topic020', topicName: 'Axit',
    source: 'manual', explanation: 'Axit sunfuric có công thức H₂SO₄.',
    usageCount: 35, correctRate: 0.90, isActive: true, isApproved: true,
    createdAt: daysAgo(180), updatedAt: daysAgo(90), createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương', schoolId: 'school001' },
  },
  {
    _id: 'q013', id: 'Q013', content: 'Phản ứng Na + H₂O → NaOH + H₂ thuộc loại phản ứng nào?',
    type: 'single_choice', options: [
      { id: 'A', content: 'Phản ứng hóa hợp', isCorrect: false },
      { id: 'B', content: 'Phản ứng thế', isCorrect: true },
      { id: 'C', content: 'Phản ứng trao đổi', isCorrect: false },
      { id: 'D', content: 'Phản ứng phân hủy', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'medium', topicId: 'topic021', topicName: 'Phản ứng hóa học',
    source: 'manual', explanation: 'Na thế H trong H₂O → phản ứng thế.',
    usageCount: 20, correctRate: 0.78, isActive: true, isApproved: true,
    createdAt: daysAgo(120), updatedAt: daysAgo(60), createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương', schoolId: 'school001' },
  },
  {
    _id: 'q014', id: 'Q014', content: 'Số hiệu nguyên tử của nguyên tố Cacbon (C) là bao nhiêu?',
    type: 'single_choice', options: [
      { id: 'A', content: '6', isCorrect: true },
      { id: 'B', content: '12', isCorrect: false },
      { id: 'C', content: '8', isCorrect: false },
      { id: 'D', content: '14', isCorrect: false },
    ],
    correctAnswer: 'A', score: 1, difficulty: 'easy', topicId: 'topic022', topicName: 'Nguyên tử',
    source: 'manual', explanation: 'C có Z = 6 (6 proton trong hạt nhân).',
    usageCount: 45, correctRate: 0.93, isActive: true, isApproved: true,
    createdAt: daysAgo(200), updatedAt: daysAgo(100), createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương', schoolId: 'school001' },
  },
  {
    _id: 'q015', id: 'Q015', content: 'Liên kết hóa học nào được hình thành bởi sự chia sẻ electron giữa hai nguyên tử?',
    type: 'single_choice', options: [
      { id: 'A', content: 'Liên kết ion', isCorrect: false },
      { id: 'B', content: 'Liên kết cộng hóa trị', isCorrect: true },
      { id: 'C', content: 'Liên kết kim loại', isCorrect: false },
      { id: 'D', content: 'Liên kết hiđro', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'medium', topicId: 'topic023', topicName: 'Liên kết hóa học',
    source: 'ai', explanation: 'Liên kết cộng hóa trị là sự dùng chung các cặp electron.',
    usageCount: 25, correctRate: 0.82, isActive: true, isApproved: true,
    createdAt: daysAgo(80), updatedAt: daysAgo(40), createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương', schoolId: 'school001' },
  },
  {
    _id: 'q016', id: 'Q016', content: 'Khối lượng mol phân tử của glucozơ (C₆H₁₂O₆) là bao nhiêu g/mol?',
    type: 'single_choice', options: [
      { id: 'A', content: '150 g/mol', isCorrect: false },
      { id: 'B', content: '160 g/mol', isCorrect: false },
      { id: 'C', content: '170 g/mol', isCorrect: false },
      { id: 'D', content: '180 g/mol', isCorrect: true },
    ],
    correctAnswer: 'D', score: 1, difficulty: 'medium', topicId: 'topic024', topicName: 'Glucid',
    source: 'ai', explanation: 'M = 12×6 + 1×12 + 16×6 = 72 + 12 + 96 = 180 g/mol.',
    usageCount: 10, correctRate: 0.72, isActive: true, isApproved: true,
    createdAt: daysAgo(40), updatedAt: daysAgo(10), createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương', schoolId: 'school001' },
  },
  {
    _id: 'q017', id: 'Q017', content: 'Trong bảng tuần hoàn, nguyên tố có tính phi kim mạnh nhất là gì?',
    type: 'single_choice', options: [
      { id: 'A', content: 'Oxy', isCorrect: false },
      { id: 'B', content: 'Nitơ', isCorrect: false },
      { id: 'C', content: 'Clo', isCorrect: false },
      { id: 'D', content: 'Flo', isCorrect: true },
    ],
    correctAnswer: 'D', score: 1, difficulty: 'medium', topicId: 'topic025', topicName: 'Bảng tuần hoàn',
    source: 'manual', explanation: 'Flo (F) là nguyên tố có độ âm điện lớn nhất.',
    usageCount: 18, correctRate: 0.75, isActive: true, isApproved: true,
    createdAt: daysAgo(60), updatedAt: daysAgo(20), createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương', schoolId: 'school001' },
  },
  // Ngữ Văn - 4 câu
  {
    _id: 'q018', id: 'Q018', content: 'Tác phẩm "Truyện Kiều" của Nguyễn Du được viết bằng thể thơ nào?',
    type: 'single_choice', options: [
      { id: 'A', content: 'Lục bát', isCorrect: false },
      { id: 'B', content: 'Song thất lục bát', isCorrect: true },
      { id: 'C', content: 'Thất ngôn tứ tuyệt', isCorrect: false },
      { id: 'D', content: 'Cao cách', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'easy', topicId: 'topic030', topicName: 'Văn học trung đại',
    source: 'manual', explanation: 'Truyện Kiều viết bằng thể song thất lục bát.',
    usageCount: 50, correctRate: 0.88, isActive: true, isApproved: true,
    createdAt: daysAgo(250), updatedAt: daysAgo(120), createdBy: { _id: 't002', name: 'Trần Văn Minh', schoolId: 'school001' },
  },
  {
    _id: 'q019', id: 'Q019', content: 'Chi tiết nào sau đây KHÔNG thuộc về nhân vật Thúy Kiều trong "Truyện Kiều"?',
    type: 'single_choice', options: [
      { id: 'A', content: 'Được mô tả là "má đào phấn thắm"', isCorrect: false },
      { id: 'B', content: 'Có tài năng âm nhạc', isCorrect: false },
      { id: 'C', content: 'Là con gái út của gia đình họ Vương', isCorrect: false },
      { id: 'D', content: 'Xuất thân từ gia đình hoàng tộc', isCorrect: true },
    ],
    correctAnswer: 'D', score: 1, difficulty: 'medium', topicId: 'topic030', topicName: 'Truyện Kiều',
    source: 'ai', explanation: 'Thúy Kiều xuất thân từ gia đình nho lược, không phải hoàng tộc.',
    usageCount: 12, correctRate: 0.65, isActive: true, isApproved: true,
    createdAt: daysAgo(50), updatedAt: daysAgo(15), createdBy: { _id: 't002', name: 'Trần Văn Minh', schoolId: 'school001' },
  },
  {
    _id: 'q020', id: 'Q020', content: 'Thể loại "tự sự" trong văn học có đặc điểm gì nổi bật?',
    type: 'single_choice', options: [
      { id: 'A', content: 'Biểu hiện tình cảm chủ quan của tác giả', isCorrect: false },
      { id: 'B', content: 'Kể lại sự việc, sự kiện theo trình tự thời gian', isCorrect: true },
      { id: 'C', content: 'Phân tích, lập luận về một vấn đề', isCorrect: false },
      { id: 'D', content: 'Miêu tả cảnh vật, con người', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'medium', topicId: 'topic031', topicName: 'Văn học đại cương',
    source: 'manual', explanation: 'Văn tự sự tập trung kể lại sự việc theo trình tự thời gian.',
    usageCount: 22, correctRate: 0.77, isActive: true, isApproved: true,
    createdAt: daysAgo(70), updatedAt: daysAgo(30), createdBy: { _id: 't002', name: 'Trần Văn Minh', schoolId: 'school001' },
  },
  {
    _id: 'q021', id: 'Q021', content: 'Tác phẩm "Văn tế nghĩa sĩ Cần Giuộc" của Nguyễn Đình Chiểu thuộc thể loại nào?',
    type: 'single_choice', options: [
      { id: 'A', content: 'Văn xuôi', isCorrect: false },
      { id: 'B', content: 'Văn vần', isCorrect: false },
      { id: 'C', content: 'Văn nôm', isCorrect: true },
      { id: 'D', content: 'Thơ', isCorrect: false },
    ],
    correctAnswer: 'C', score: 1, difficulty: 'hard', topicId: 'topic032', topicName: 'Văn học yêu nước',
    source: 'ai', explanation: 'Văn tế nghĩa sĩ Cần Giuộc được viết bằng văn nôm.',
    usageCount: 8, correctRate: 0.58, isActive: true, isApproved: true,
    createdAt: daysAgo(35), updatedAt: daysAgo(8), createdBy: { _id: 't002', name: 'Trần Văn Minh', schoolId: 'school001' },
  },
  // Tiếng Anh - 4 câu
  {
    _id: 'q022', id: 'Q022', content: 'Choose the correct sentence:',
    type: 'single_choice', options: [
      { id: 'A', content: 'She don\'t like coffee.', isCorrect: false },
      { id: 'B', content: 'She doesn\'t likes coffee.', isCorrect: false },
      { id: 'C', content: 'She doesn\'t like coffee.', isCorrect: true },
      { id: 'D', content: 'She not like coffee.', isCorrect: false },
    ],
    correctAnswer: 'C', score: 1, difficulty: 'easy', topicId: 'topic040', topicName: 'Present Simple',
    source: 'manual', explanation: 'She/He/It + doesn\'t + V(bare infinitive).',
    usageCount: 55, correctRate: 0.91, isActive: true, isApproved: true,
    createdAt: daysAgo(300), updatedAt: daysAgo(150), createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương', schoolId: 'school001' },
  },
  {
    _id: 'q023', id: 'Q023', content: 'The word "beautiful" is a/an:',
    type: 'single_choice', options: [
      { id: 'A', content: 'Noun', isCorrect: false },
      { id: 'B', content: 'Verb', isCorrect: false },
      { id: 'C', content: 'Adjective', isCorrect: true },
      { id: 'D', content: 'Adverb', isCorrect: false },
    ],
    correctAnswer: 'C', score: 1, difficulty: 'easy', topicId: 'topic041', topicName: 'Parts of Speech',
    source: 'manual', explanation: '"Beautiful" is an adjective (tính từ) describing a noun.',
    usageCount: 60, correctRate: 0.94, isActive: true, isApproved: true,
    createdAt: daysAgo(350), updatedAt: daysAgo(180), createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương', schoolId: 'school001' },
  },
  {
    _id: 'q024', id: 'Q024', content: 'If I ___ rich, I would travel around the world.',
    type: 'single_choice', options: [
      { id: 'A', content: 'am', isCorrect: false },
      { id: 'B', content: 'was', isCorrect: false },
      { id: 'C', content: 'were', isCorrect: true },
      { id: 'D', content: 'be', isCorrect: false },
    ],
    correctAnswer: 'C', score: 1, difficulty: 'medium', topicId: 'topic042', topicName: 'Conditional',
    source: 'ai', explanation: 'Câu điều kiện loại 2: If + subject + were + ..., would + V.',
    usageCount: 20, correctRate: 0.70, isActive: true, isApproved: true,
    createdAt: daysAgo(65), updatedAt: daysAgo(25), createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương', schoolId: 'school001' },
  },
  {
    _id: 'q025', id: 'Q025', content: '"She has lived here since 2010." The tense used is:',
    type: 'single_choice', options: [
      { id: 'A', content: 'Present Perfect', isCorrect: true },
      { id: 'B', content: 'Present Perfect Continuous', isCorrect: false },
      { id: 'C', content: 'Past Simple', isCorrect: false },
      { id: 'D', content: 'Present Simple', isCorrect: false },
    ],
    correctAnswer: 'A', score: 1, difficulty: 'medium', topicId: 'topic043', topicName: 'Present Perfect',
    source: 'ai', explanation: '"Since + năm/điểm thời gian" → Present Perfect (quá khứ đến hiện tại).',
    usageCount: 28, correctRate: 0.73, isActive: true, isApproved: true,
    createdAt: daysAgo(55), updatedAt: daysAgo(20), createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương', schoolId: 'school001' },
  },
  // True/False questions
  {
    _id: 'q026', id: 'Q026', content: 'Đạo hàm của hàm số y = sin(x) là y\' = cos(x).',
    type: 'single_choice', options: [
      { id: 'A', content: 'Đúng', isCorrect: true },
      { id: 'B', content: 'Sai', isCorrect: false },
    ],
    correctAnswer: 'A', score: 1, difficulty: 'easy', topicId: 'topic001', topicName: 'Đạo hàm',
    source: 'manual', explanation: 'Đạo hàm của sin(x) là cos(x).',
    usageCount: 30, correctRate: 0.85, isActive: true, isApproved: true,
    createdAt: daysAgo(100), updatedAt: daysAgo(50), createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương', schoolId: 'school001' },
  },
  // Multiple choice multi-answer question
  {
    _id: 'q027', id: 'Q027', content: 'Nguyên tố nào sau đây là kim loại kiềm? (Chọn tất cả đáp án đúng)',
    type: 'multiple_choice', options: [
      { id: 'A', content: 'Natri (Na)', isCorrect: true },
      { id: 'B', content: 'Kali (K)', isCorrect: true },
      { id: 'C', content: 'Canxi (Ca)', isCorrect: false },
      { id: 'D', content: 'Magie (Mg)', isCorrect: false },
    ],
    correctAnswers: ['A', 'B'], score: 2, difficulty: 'medium', topicId: 'topic025', topicName: 'Bảng tuần hoàn',
    source: 'manual', explanation: 'Kim loại kiềm gồm: Li, Na, K, Rb, Cs, Fr.',
    usageCount: 15, correctRate: 0.68, isActive: true, isApproved: true,
    createdAt: daysAgo(40), updatedAt: daysAgo(12), createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương', schoolId: 'school001' },
  },
  // Fill in the blank (multiple choice for UI)
  {
    _id: 'q028', id: 'Q028', content: 'Số Avogadro có giá trị xấp xỉ bằng ___ × 10²³ mol⁻¹',
    type: 'single_choice', options: [
      { id: 'A', content: '6,0', isCorrect: true },
      { id: 'B', content: '3,0', isCorrect: false },
      { id: 'C', content: '9,0', isCorrect: false },
      { id: 'D', content: '1,0', isCorrect: false },
    ],
    correctAnswer: 'A', score: 1, difficulty: 'easy', topicId: 'topic022', topicName: 'Nguyên tử',
    source: 'manual', explanation: 'Số Avogadro NA ≈ 6,022 × 10²³ mol⁻¹.',
    usageCount: 20, correctRate: 0.88, isActive: true, isApproved: true,
    createdAt: daysAgo(90), updatedAt: daysAgo(45), createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương', schoolId: 'school001' },
  },
  {
    _id: 'q029', id: 'Q029', content: 'Năm 1945, nhà văn hóa lớn Hồ Chí Minh viết bài thơ "Không diệt".',
    type: 'single_choice', options: [
      { id: 'A', content: 'Đúng', isCorrect: false },
      { id: 'B', content: 'Sai', isCorrect: true },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'hard', topicId: 'topic030', topicName: 'Văn học hiện đại',
    source: 'ai', explanation: 'Hồ Chí Minh không viết bài thơ "Không diệt". Bài thơ nổi tiếng của Nguyễn Ái Quốc là "Đời sống".',
    usageCount: 5, correctRate: 0.45, isActive: true, isApproved: true,
    createdAt: daysAgo(25), updatedAt: daysAgo(5), createdBy: { _id: 't002', name: 'Trần Văn Minh', schoolId: 'school001' },
  },
  {
    _id: 'q030', id: 'Q030', content: 'Which of the following is a proper noun?',
    type: 'single_choice', options: [
      { id: 'A', content: 'teacher', isCorrect: false },
      { id: 'B', content: 'Hanoi', isCorrect: true },
      { id: 'C', content: 'happy', isCorrect: false },
      { id: 'D', content: 'quickly', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'easy', topicId: 'topic044', topicName: 'Nouns',
    source: 'manual', explanation: '"Hanoi" is a proper noun (tên riêng).',
    usageCount: 40, correctRate: 0.90, isActive: true, isApproved: true,
    createdAt: daysAgo(200), updatedAt: daysAgo(100), createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương', schoolId: 'school001' },
  },
];

// ─── 6. EXAMS ───────────────────────────────────────────────────────────────

export const mockExams: Exam[] = [
  {
    _id: 'exam001',
    title: 'Kiểm tra giữa học kỳ 1 - Toán 10A1',
    description: 'Đề kiểm tra giữa HK1 môn Toán lớp 10A1, nội dung về hàm số và phương trình.',
    status: 'completed',
    classIds: [{ _id: 'cls001', name: '10A1', code: '10A1' }],
    primaryClassId: { _id: 'cls001', name: '10A1', code: '10A1' },
    subjectId: { _id: 'subj001', name: 'Toán học', color: '#3B82F6' },
    subjectName: 'Toán học',
    subjectColor: '#3B82F6',
    examDate: daysAgo(30),
    startTime: '07:30',
    duration: 90,
    totalScore: 10,
    passingScore: 5,
    numberOfQuestions: 20,
    questionIds: mockQuestions.slice(0, 5).map(q => q._id),
    numberOfVersions: 3,
    totalSubmissions: 45,
    totalStudents: 45,
    createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương' },
    createdAt: daysAgo(45),
    updatedAt: daysAgo(28),
    publishedAt: daysAgo(40),
    completedAt: daysAgo(29),
  },
  {
    _id: 'exam002',
    title: 'Kiểm tra 15 phút - Vật Lý lần 1',
    description: 'Bài kiểm tra ngắn 15 phút về chuyển động thẳng đều.',
    status: 'completed',
    classIds: [{ _id: 'cls001', name: '10A1', code: '10A1' }],
    primaryClassId: { _id: 'cls001', name: '10A1', code: '10A1' },
    subjectId: { _id: 'subj002', name: 'Vật Lý', color: '#10B981' },
    subjectName: 'Vật Lý',
    subjectColor: '#10B981',
    examDate: daysAgo(20),
    startTime: '09:00',
    duration: 15,
    totalScore: 10,
    passingScore: 5,
    numberOfQuestions: 5,
    questionIds: mockQuestions.slice(5, 9).map(q => q._id),
    numberOfVersions: 1,
    totalSubmissions: 45,
    totalStudents: 45,
    createdBy: { _id: 't002', name: 'Trần Văn Minh' },
    createdAt: daysAgo(25),
    updatedAt: daysAgo(19),
    publishedAt: daysAgo(22),
    completedAt: daysAgo(19),
  },
  {
    _id: 'exam003',
    title: 'Bài kiểm tra Hóa Học - Chương 3',
    description: 'Kiểm tra chương 3: Liên kết hóa học.',
    status: 'published',
    classIds: [
      { _id: 'cls001', name: '10A1', code: '10A1' },
      { _id: 'cls002', name: '10A2', code: '10A2' },
    ],
    primaryClassId: { _id: 'cls001', name: '10A1', code: '10A1' },
    subjectId: { _id: 'subj003', name: 'Hóa Học', color: '#8B5CF6' },
    subjectName: 'Hóa Học',
    subjectColor: '#8B5CF6',
    examDate: daysFromNow(5),
    startTime: '10:00',
    duration: 45,
    totalScore: 10,
    passingScore: 4,
    numberOfQuestions: 15,
    questionIds: mockQuestions.slice(11, 17).map(q => q._id),
    numberOfVersions: 2,
    totalSubmissions: 0,
    totalStudents: 80,
    createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương' },
    createdAt: daysAgo(10),
    updatedAt: daysAgo(5),
    publishedAt: daysAgo(5),
  },
  {
    _id: 'exam004',
    title: 'Thi học kỳ 1 - Ngữ Văn 12',
    description: 'Đề thi HK1 môn Ngữ Văn lớp 12, gồm đọc hiểu và viết bài văn.',
    status: 'in_progress',
    classIds: [{ _id: 'cls005', name: '12A1', code: '12A1' }],
    primaryClassId: { _id: 'cls005', name: '12A1', code: '12A1' },
    subjectId: { _id: 'subj004', name: 'Ngữ Văn', color: '#EF4444' },
    subjectName: 'Ngữ Văn',
    subjectColor: '#EF4444',
    examDate: daysAgo(1),
    startTime: '07:30',
    duration: 120,
    totalScore: 10,
    passingScore: 5,
    numberOfQuestions: 4,
    questionIds: mockQuestions.slice(17, 21).map(q => q._id),
    numberOfVersions: 1,
    totalSubmissions: 35,
    totalStudents: 40,
    createdBy: { _id: 't002', name: 'Trần Văn Minh' },
    createdAt: daysAgo(60),
    updatedAt: daysAgo(1),
    publishedAt: daysAgo(55),
  },
  {
    _id: 'exam005',
    title: 'Kiểm tra Tiếng Anh - Unit 4',
    description: 'Bài kiểm tra Unit 4: The Environment.',
    status: 'draft',
    classIds: [{ _id: 'cls001', name: '10A1', code: '10A1' }],
    primaryClassId: { _id: 'cls001', name: '10A1', code: '10A1' },
    subjectId: { _id: 'subj005', name: 'Tiếng Anh', color: '#F59E0B' },
    subjectName: 'Tiếng Anh',
    subjectColor: '#F59E0B',
    examDate: daysFromNow(14),
    startTime: '08:00',
    duration: 45,
    totalScore: 10,
    passingScore: 5,
    numberOfQuestions: 25,
    questionIds: mockQuestions.slice(21, 26).map(q => q._id),
    numberOfVersions: 0,
    totalSubmissions: 0,
    totalStudents: 45,
    createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương' },
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },
  {
    _id: 'exam006',
    title: 'Kiểm tra 1 tiết - Vật Lý lớp 11',
    description: 'Bài kiểm tra 1 tiết về dòng điện không đổi.',
    status: 'published',
    classIds: [{ _id: 'cls003', name: '11A1', code: '11A1' }],
    primaryClassId: { _id: 'cls003', name: '11A1', code: '11A1' },
    subjectId: { _id: 'subj002', name: 'Vật Lý', color: '#10B981' },
    subjectName: 'Vật Lý',
    subjectColor: '#10B981',
    examDate: daysFromNow(7),
    startTime: '14:00',
    duration: 45,
    totalScore: 10,
    passingScore: 4,
    numberOfQuestions: 10,
    questionIds: mockQuestions.slice(6, 10).map(q => q._id),
    numberOfVersions: 1,
    totalSubmissions: 0,
    totalStudents: 38,
    createdBy: { _id: 't002', name: 'Trần Văn Minh' },
    createdAt: daysAgo(8),
    updatedAt: daysAgo(3),
    publishedAt: daysAgo(3),
  },
  {
    _id: 'exam007',
    title: 'Kiểm tra Hình học - Toán 10',
    description: 'Đề kiểm tra hình học về vector và tích vô hướng.',
    status: 'archived',
    classIds: [{ _id: 'cls001', name: '10A1', code: '10A1' }],
    primaryClassId: { _id: 'cls001', name: '10A1', code: '10A1' },
    subjectId: { _id: 'subj001', name: 'Toán học', color: '#3B82F6' },
    subjectName: 'Toán học',
    subjectColor: '#3B82F6',
    examDate: monthsAgo(2),
    startTime: '07:30',
    duration: 45,
    totalScore: 10,
    passingScore: 5,
    numberOfQuestions: 8,
    questionIds: mockQuestions.slice(0, 4).map(q => q._id),
    numberOfVersions: 2,
    totalSubmissions: 45,
    totalStudents: 45,
    createdBy: { _id: 't001', name: 'Nguyễn Thị Mai Hương' },
    createdAt: monthsAgo(3),
    updatedAt: monthsAgo(2, 5),
    publishedAt: monthsAgo(2, 25),
    completedAt: monthsAgo(2, 4),
  },
];

// ─── 7. EXAM VERSIONS ────────────────────────────────────────────────────────

export const mockExamVersions: ExamVersion[] = [
  // exam001 - 3 versions
  {
    _id: 'ver001a',
    examId: 'exam001',
    versionCode: 'A',
    numberOfQuestions: 20,
    questionIds: mockQuestions.slice(0, 5).map(q => q._id).concat(
      mockQuestions.slice(0, 5).map(q => q._id)
    ),
    distribution: { A: 45 },
    submissionCount: 15,
    createdAt: daysAgo(40),
  },
  {
    _id: 'ver001b',
    examId: 'exam001',
    versionCode: 'B',
    numberOfQuestions: 20,
    questionIds: mockQuestions.slice(0, 5).reverse().map(q => q._id).concat(
      mockQuestions.slice(0, 5).map(q => q._id)
    ),
    distribution: { B: 45 },
    submissionCount: 15,
    createdAt: daysAgo(40),
  },
  {
    _id: 'ver001c',
    examId: 'exam001',
    versionCode: 'C',
    numberOfQuestions: 20,
    questionIds: [...mockQuestions.slice(0, 3), ...mockQuestions.slice(3, 5), ...mockQuestions.slice(0, 5)].map((q) => q._id),
    distribution: { C: 15 },
    submissionCount: 15,
    createdAt: daysAgo(40),
  },
  // exam002 - 1 version
  {
    _id: 'ver002a',
    examId: 'exam002',
    versionCode: 'A',
    numberOfQuestions: 5,
    questionIds: mockQuestions.slice(5, 9).map(q => q._id),
    distribution: { A: 45 },
    submissionCount: 45,
    createdAt: daysAgo(22),
  },
  // exam003 - 2 versions
  {
    _id: 'ver003a',
    examId: 'exam003',
    versionCode: 'A',
    numberOfQuestions: 15,
    questionIds: mockQuestions.slice(11, 17).map(q => q._id),
    distribution: { A: 40 },
    submissionCount: 0,
    createdAt: daysAgo(5),
  },
  {
    _id: 'ver003b',
    examId: 'exam003',
    versionCode: 'B',
    numberOfQuestions: 15,
    questionIds: [...mockQuestions.slice(12, 17), ...mockQuestions.slice(11, 12)].map((q) => q._id),
    distribution: { B: 40 },
    submissionCount: 0,
    createdAt: daysAgo(5),
  },
  // exam004 - 1 version
  {
    _id: 'ver004a',
    examId: 'exam004',
    versionCode: 'A',
    numberOfQuestions: 4,
    questionIds: mockQuestions.slice(17, 21).map(q => q._id),
    distribution: { A: 40 },
    submissionCount: 35,
    createdAt: daysAgo(55),
  },
  // exam006 - 1 version
  {
    _id: 'ver006a',
    examId: 'exam006',
    versionCode: 'A',
    numberOfQuestions: 10,
    questionIds: mockQuestions.slice(6, 10).map(q => q._id),
    distribution: { A: 38 },
    submissionCount: 0,
    createdAt: daysAgo(3),
  },
  // exam007 - 2 versions
  {
    _id: 'ver007a',
    examId: 'exam007',
    versionCode: 'A',
    numberOfQuestions: 8,
    questionIds: mockQuestions.slice(0, 4).map(q => q._id),
    distribution: { A: 23 },
    submissionCount: 23,
    createdAt: monthsAgo(2, 25),
  },
  {
    _id: 'ver007b',
    examId: 'exam007',
    versionCode: 'B',
    numberOfQuestions: 8,
    questionIds: [...mockQuestions.slice(1, 4), ...mockQuestions.slice(0, 1)].map((q) => q._id),
    distribution: { B: 22 },
    submissionCount: 22,
    createdAt: monthsAgo(2, 25),
  },
];

// ─── 8. SUBMISSIONS ─────────────────────────────────────────────────────────

export const mockSubmissions: BackendSubmission[] = [
  // exam001 submissions (completed exam, all graded)
  {
    _id: 'sub001',
    examId: 'exam001',
    studentId: { _id: 's001', name: 'Phạm Thanh Hà', email: 'hapt_s1@student.thpt-nbk.edu.vn' },
    classId: 'cls001',
    versionCode: 'A',
    answers: { q001: 'A', q002: 'B', q003: 'B', q004: 'A', q005: 'D' },
    score: 8.5,
    status: 'graded',
    submittedAt: daysAgo(30),
    gradedAt: daysAgo(28),
    gradingResult: { score: 8.5, totalQuestions: 20, correctCount: 17, incorrectCount: 2, unansweredCount: 1, answerKey: {}, studentAnswers: {} },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(28),
  },
  {
    _id: 'sub002',
    examId: 'exam001',
    studentId: { _id: 's002', name: 'Đặng Minh Tuấn', email: 'tuan.dm@student.thpt-nbk.edu.vn' },
    classId: 'cls001',
    versionCode: 'A',
    answers: { q001: 'A', q002: 'B', q003: 'A', q004: 'A', q005: 'D' },
    score: 7.0,
    status: 'graded',
    submittedAt: daysAgo(30),
    gradedAt: daysAgo(28),
    gradingResult: { score: 7.0, totalQuestions: 20, correctCount: 14, incorrectCount: 4, unansweredCount: 2, answerKey: {}, studentAnswers: {} },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(28),
  },
  {
    _id: 'sub003',
    examId: 'exam001',
    studentId: { _id: 's003', name: 'Lê Thu Phương', email: 'phuong.lt@student.thpt-nbk.edu.vn' },
    classId: 'cls001',
    versionCode: 'B',
    answers: { q001: 'A', q002: 'B', q003: 'B', q004: 'A', q005: 'D' },
    score: 9.0,
    status: 'graded',
    submittedAt: daysAgo(30),
    gradedAt: daysAgo(28),
    gradingResult: { score: 9.0, totalQuestions: 20, correctCount: 18, incorrectCount: 1, unansweredCount: 1, answerKey: {}, studentAnswers: {} },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(28),
  },
  {
    _id: 'sub004',
    examId: 'exam001',
    studentId: { _id: 's004', name: 'Ngô Đức Anh', email: 'anh.nd@student.thpt-nbk.edu.vn' },
    classId: 'cls001',
    versionCode: 'C',
    answers: { q001: 'A', q002: 'A', q003: 'C', q004: 'A', q005: 'D' },
    score: 6.0,
    status: 'graded',
    submittedAt: daysAgo(30),
    gradedAt: daysAgo(28),
    gradingResult: { score: 6.0, totalQuestions: 20, correctCount: 12, incorrectCount: 5, unansweredCount: 3, answerKey: {}, studentAnswers: {} },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(28),
  },
  {
    _id: 'sub005',
    examId: 'exam001',
    studentId: { _id: 's005', name: 'Bùi Thị Lan', email: 'lan.bt@student.thpt-nbk.edu.vn' },
    classId: 'cls001',
    versionCode: 'B',
    answers: { q001: 'B', q002: 'B', q003: 'B', q004: 'A', q005: 'D' },
    score: 5.5,
    status: 'graded',
    submittedAt: daysAgo(30),
    gradedAt: daysAgo(28),
    gradingResult: { score: 5.5, totalQuestions: 20, correctCount: 11, incorrectCount: 6, unansweredCount: 3, answerKey: {}, studentAnswers: {} },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(28),
  },
  // exam002 submissions
  {
    _id: 'sub006',
    examId: 'exam002',
    studentId: { _id: 's001', name: 'Phạm Thanh Hà', email: 'hapt_s1@student.thpt-nbk.edu.vn' },
    classId: 'cls001',
    versionCode: 'A',
    answers: { q006: 'B', q007: 'B', q008: 'A', q009: 'A' },
    score: 8.0,
    status: 'graded',
    submittedAt: daysAgo(20),
    gradedAt: daysAgo(19),
    gradingResult: { score: 8.0, totalQuestions: 5, correctCount: 4, incorrectCount: 1, unansweredCount: 0, answerKey: {}, studentAnswers: {} },
    createdAt: daysAgo(20),
    updatedAt: daysAgo(19),
  },
  {
    _id: 'sub007',
    examId: 'exam002',
    studentId: { _id: 's002', name: 'Đặng Minh Tuấn', email: 'tuan.dm@student.thpt-nbk.edu.vn' },
    classId: 'cls001',
    versionCode: 'A',
    answers: { q006: 'B', q007: 'A', q008: 'A', q009: 'A' },
    score: 6.0,
    status: 'graded',
    submittedAt: daysAgo(20),
    gradedAt: daysAgo(19),
    gradingResult: { score: 6.0, totalQuestions: 5, correctCount: 3, incorrectCount: 1, unansweredCount: 1, answerKey: {}, studentAnswers: {} },
    createdAt: daysAgo(20),
    updatedAt: daysAgo(19),
  },
  {
    _id: 'sub008',
    examId: 'exam002',
    studentId: { _id: 's003', name: 'Lê Thu Phương', email: 'phuong.lt@student.thpt-nbk.edu.vn' },
    classId: 'cls001',
    versionCode: 'A',
    answers: { q006: 'B', q007: 'B', q008: 'A', q009: 'A' },
    score: 10.0,
    status: 'graded',
    submittedAt: daysAgo(20),
    gradedAt: daysAgo(19),
    gradingResult: { score: 10.0, totalQuestions: 5, correctCount: 5, incorrectCount: 0, unansweredCount: 0, answerKey: {}, studentAnswers: {} },
    createdAt: daysAgo(20),
    updatedAt: daysAgo(19),
  },
  // exam004 submissions (in_progress)
  {
    _id: 'sub009',
    examId: 'exam004',
    studentId: { _id: 's001', name: 'Phạm Thanh Hà', email: 'hapt_s1@student.thpt-nbk.edu.vn' },
    classId: 'cls005',
    versionCode: 'A',
    answers: { q018: 'B', q019: 'D', q020: 'B' },
    score: undefined,
    status: 'submitted',
    submittedAt: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    _id: 'sub010',
    examId: 'exam004',
    studentId: { _id: 's002', name: 'Đặng Minh Tuấn', email: 'tuan.dm@student.thpt-nbk.edu.vn' },
    classId: 'cls005',
    versionCode: 'A',
    answers: { q018: 'B', q019: 'D', q020: 'B', q021: 'C' },
    score: undefined,
    status: 'submitted',
    submittedAt: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    _id: 'sub011',
    examId: 'exam004',
    studentId: { _id: 's003', name: 'Lê Thu Phương', email: 'phuong.lt@student.thpt-nbk.edu.vn' },
    classId: 'cls005',
    versionCode: 'A',
    answers: { q018: 'A', q019: 'D', q020: 'B' },
    score: undefined,
    status: 'submitted',
    submittedAt: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  // exam007 submissions (archived exam)
  {
    _id: 'sub012',
    examId: 'exam007',
    studentId: { _id: 's001', name: 'Phạm Thanh Hà', email: 'hapt_s1@student.thpt-nbk.edu.vn' },
    classId: 'cls001',
    versionCode: 'A',
    answers: { q001: 'A', q002: 'B', q003: 'B', q004: 'A' },
    score: 7.5,
    status: 'graded',
    submittedAt: monthsAgo(2, 5),
    gradedAt: monthsAgo(2, 3),
    gradingResult: { score: 7.5, totalQuestions: 8, correctCount: 6, incorrectCount: 1, unansweredCount: 1, answerKey: {}, studentAnswers: {} },
    createdAt: monthsAgo(2, 5),
    updatedAt: monthsAgo(2, 3),
  },
  {
    _id: 'sub013',
    examId: 'exam007',
    studentId: { _id: 's002', name: 'Đặng Minh Tuấn', email: 'tuan.dm@student.thpt-nbk.edu.vn' },
    classId: 'cls001',
    versionCode: 'B',
    answers: { q001: 'A', q002: 'B', q003: 'A', q004: 'A' },
    score: 6.0,
    status: 'graded',
    submittedAt: monthsAgo(2, 5),
    gradedAt: monthsAgo(2, 3),
    gradingResult: { score: 6.0, totalQuestions: 8, correctCount: 5, incorrectCount: 2, unansweredCount: 1, answerKey: {}, studentAnswers: {} },
    createdAt: monthsAgo(2, 5),
    updatedAt: monthsAgo(2, 3),
  },
  {
    _id: 'sub014',
    examId: 'exam007',
    studentId: { _id: 's003', name: 'Lê Thu Phương', email: 'phuong.lt@student.thpt-nbk.edu.vn' },
    classId: 'cls001',
    versionCode: 'A',
    answers: { q001: 'A', q002: 'B', q003: 'B', q004: 'A' },
    score: 8.0,
    status: 'graded',
    submittedAt: monthsAgo(2, 5),
    gradedAt: monthsAgo(2, 3),
    gradingResult: { score: 8.0, totalQuestions: 8, correctCount: 7, incorrectCount: 1, unansweredCount: 0, answerKey: {}, studentAnswers: {} },
    createdAt: monthsAgo(2, 5),
    updatedAt: monthsAgo(2, 3),
  },
  {
    _id: 'sub015',
    examId: 'exam007',
    studentId: { _id: 's004', name: 'Ngô Đức Anh', email: 'anh.nd@student.thpt-nbk.edu.vn' },
    classId: 'cls001',
    versionCode: 'B',
    answers: { q001: 'A', q002: 'B', q003: 'C', q004: 'A' },
    score: 5.5,
    status: 'graded',
    submittedAt: monthsAgo(2, 5),
    gradedAt: monthsAgo(2, 3),
    gradingResult: { score: 5.5, totalQuestions: 8, correctCount: 4, incorrectCount: 2, unansweredCount: 2, answerKey: {}, studentAnswers: {} },
    createdAt: monthsAgo(2, 5),
    updatedAt: monthsAgo(2, 3),
  },
  {
    _id: 'sub016',
    examId: 'exam007',
    studentId: { _id: 's005', name: 'Bùi Thị Lan', email: 'lan.bt@student.thpt-nbk.edu.vn' },
    classId: 'cls001',
    versionCode: 'A',
    answers: { q001: 'B', q002: 'B', q003: 'B', q004: 'A' },
    score: 4.0,
    status: 'graded',
    submittedAt: monthsAgo(2, 5),
    gradedAt: monthsAgo(2, 3),
    gradingResult: { score: 4.0, totalQuestions: 8, correctCount: 3, incorrectCount: 3, unansweredCount: 2, answerKey: {}, studentAnswers: {} },
    createdAt: monthsAgo(2, 5),
    updatedAt: monthsAgo(2, 3),
  },
  // Pending submissions
  {
    _id: 'sub017',
    examId: 'exam003',
    studentId: { _id: 's001', name: 'Phạm Thanh Hà', email: 'hapt_s1@student.thpt-nbk.edu.vn' },
    classId: 'cls001',
    versionCode: 'A',
    answers: {},
    score: undefined,
    status: 'submitted',
    submittedAt: daysAgo(0),
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
  },
  {
    _id: 'sub018',
    examId: 'exam003',
    studentId: { _id: 's002', name: 'Đặng Minh Tuấn', email: 'tuan.dm@student.thpt-nbk.edu.vn' },
    classId: 'cls001',
    versionCode: 'A',
    answers: {},
    score: undefined,
    status: 'submitted',
    submittedAt: daysAgo(0),
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
  },
  {
    _id: 'sub019',
    examId: 'exam006',
    studentId: { _id: 's001', name: 'Phạm Thanh Hà', email: 'hapt_s1@student.thpt-nbk.edu.vn' },
    classId: 'cls003',
    versionCode: 'A',
    answers: {},
    score: undefined,
    status: 'submitted',
    submittedAt: daysAgo(0),
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
  },
  {
    _id: 'sub020',
    examId: 'exam002',
    studentId: { _id: 's005', name: 'Bùi Thị Lan', email: 'lan.bt@student.thpt-nbk.edu.vn' },
    classId: 'cls001',
    versionCode: 'A',
    answers: { q006: 'B', q007: 'B', q008: 'A', q009: 'B' },
    score: 6.0,
    status: 'graded',
    submittedAt: daysAgo(20),
    gradedAt: daysAgo(19),
    gradingResult: { score: 6.0, totalQuestions: 5, correctCount: 3, incorrectCount: 2, unansweredCount: 0, answerKey: {}, studentAnswers: {} },
    createdAt: daysAgo(20),
    updatedAt: daysAgo(19),
  },
  {
    _id: 'sub021',
    examId: 'exam001',
    studentId: { _id: 's005', name: 'Bùi Thị Lan', email: 'lan.bt@student.thpt-nbk.edu.vn' },
    classId: 'cls001',
    versionCode: 'C',
    answers: { q001: 'A', q002: 'B', q003: 'B', q004: 'A', q005: 'D' },
    score: 5.0,
    status: 'reviewed',
    submittedAt: daysAgo(30),
    gradedAt: daysAgo(27),
    gradingResult: { score: 5.0, totalQuestions: 20, correctCount: 10, incorrectCount: 6, unansweredCount: 4, answerKey: {}, studentAnswers: {} },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(25),
  },
  {
    _id: 'sub022',
    examId: 'exam002',
    studentId: { _id: 's004', name: 'Ngô Đức Anh', email: 'anh.nd@student.thpt-nbk.edu.vn' },
    classId: 'cls001',
    versionCode: 'A',
    answers: { q006: 'B', q007: 'A', q008: 'A', q009: 'A' },
    score: 8.0,
    status: 'graded',
    submittedAt: daysAgo(20),
    gradedAt: daysAgo(19),
    gradingResult: { score: 8.0, totalQuestions: 5, correctCount: 4, incorrectCount: 1, unansweredCount: 0, answerKey: {}, studentAnswers: {} },
    createdAt: daysAgo(20),
    updatedAt: daysAgo(19),
  },
];

// ─── 9. APPEALS ─────────────────────────────────────────────────────────────

export interface Appeal {
  _id: string;
  submissionId: string;
  examId: string;
  studentId: string;
  studentName: string;
  className: string;
  questionId: string;
  reason: string;
  currentAnswer: string;
  expectedAnswer: string;
  status: 'pending' | 'approved' | 'rejected';
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  createdAt: string;
}

export const mockAppeals: Appeal[] = [
  {
    _id: 'appeal001',
    submissionId: 'sub021',
    examId: 'exam001',
    studentId: 's005',
    studentName: 'Bùi Thị Lan',
    className: '10A1',
    questionId: 'q003',
    reason: 'Tôi đã điền đáp án C (1/2) nhưng hệ thống chấm là sai. Đáp án đúng phải là 1/3.',
    currentAnswer: 'C',
    expectedAnswer: 'C',
    status: 'pending',
    createdAt: daysAgo(27),
  },
  {
    _id: 'appeal002',
    submissionId: 'sub012',
    examId: 'exam007',
    studentId: 's001',
    studentName: 'Phạm Thanh Hà',
    className: '10A1',
    questionId: 'q003',
    reason: 'Hệ thống không nhận diện được nét viết tay của tôi cho câu trả lời này.',
    currentAnswer: 'B',
    expectedAnswer: 'B',
    status: 'approved',
    resolvedBy: 't001',
    resolvedAt: daysAgo(25),
    resolutionNote: 'Đã chấm lại, điểm được cộng thêm 0.5 điểm.',
    createdAt: daysAgo(26),
  },
  {
    _id: 'appeal003',
    submissionId: 'sub016',
    examId: 'exam007',
    studentId: 's005',
    studentName: 'Bùi Thị Lan',
    className: '10A1',
    questionId: 'q001',
    reason: 'Tôi tin đáp án B là đúng, đề nghị xem lại.',
    currentAnswer: 'B',
    expectedAnswer: 'A',
    status: 'rejected',
    resolvedBy: 't001',
    resolvedAt: monthsAgo(2, 1),
    resolutionNote: 'Đáp án A mới là đáp án đúng. Không có cơ sở phúc tra.',
    createdAt: monthsAgo(2, 2),
  },
  {
    _id: 'appeal004',
    submissionId: 'sub007',
    examId: 'exam002',
    studentId: 's002',
    studentName: 'Đặng Minh Tuấn',
    className: '10A1',
    questionId: 'q007',
    reason: 'Công thức động năng tôi chọn A nhưng hệ thống ghi nhận sai.',
    currentAnswer: 'A',
    expectedAnswer: 'A',
    status: 'pending',
    createdAt: daysAgo(18),
  },
  {
    _id: 'appeal005',
    submissionId: 'sub015',
    examId: 'exam007',
    studentId: 's004',
    studentName: 'Ngô Đức Anh',
    className: '10A1',
    questionId: 'q002',
    reason: 'Tôi đã chọn đáp án B (x = 2 hoặc x = 3) nhưng hệ thống chấm sai.',
    currentAnswer: 'B',
    expectedAnswer: 'B',
    status: 'approved',
    resolvedBy: 't001',
    resolvedAt: monthsAgo(2, 1),
    resolutionNote: 'Đã xác nhận điểm đúng. Điểm được điều chỉnh từ 5.5 lên 7.0.',
    createdAt: monthsAgo(2, 2),
  },
];

// ─── 10. EXAM REPORTS ───────────────────────────────────────────────────────

export interface ExamReport {
  _id: string;
  examId: string;
  examTitle: string;
  totalStudents: number;
  totalSubmissions: number;
  submissionRate: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  gradeDistribution: { grade: string; count: number; percentage: number }[];
  scoreHistogram: { range: string; count: number }[];
  generatedAt: string;
}

export const mockExamReports: ExamReport[] = [
  {
    _id: 'rpt001',
    examId: 'exam001',
    examTitle: 'Kiểm tra giữa học kỳ 1 - Toán 10A1',
    totalStudents: 45,
    totalSubmissions: 45,
    submissionRate: 100,
    averageScore: 7.2,
    highestScore: 9.5,
    lowestScore: 4.0,
    passRate: 89,
    gradeDistribution: [
      { grade: 'Giỏi (8.5-10)', count: 10, percentage: 22 },
      { grade: 'Khá (7.0-8.4)', count: 18, percentage: 40 },
      { grade: 'Trung bình (5.0-6.9)', count: 12, percentage: 27 },
      { grade: 'Yếu (3.5-4.9)', count: 4, percentage: 9 },
      { grade: 'Kém (<3.5)', count: 1, percentage: 2 },
    ],
    scoreHistogram: [
      { range: '0-2', count: 1 },
      { range: '2-4', count: 2 },
      { range: '4-6', count: 8 },
      { range: '6-8', count: 18 },
      { range: '8-10', count: 16 },
    ],
    generatedAt: daysAgo(27),
  },
  {
    _id: 'rpt002',
    examId: 'exam002',
    examTitle: 'Kiểm tra 15 phút - Vật Lý lần 1',
    totalStudents: 45,
    totalSubmissions: 45,
    submissionRate: 100,
    averageScore: 7.8,
    highestScore: 10.0,
    lowestScore: 5.0,
    passRate: 96,
    gradeDistribution: [
      { grade: 'Giỏi (8.5-10)', count: 22, percentage: 49 },
      { grade: 'Khá (7.0-8.4)', count: 14, percentage: 31 },
      { grade: 'Trung bình (5.0-6.9)', count: 7, percentage: 16 },
      { grade: 'Yếu (3.5-4.9)', count: 2, percentage: 4 },
      { grade: 'Kém (<3.5)', count: 0, percentage: 0 },
    ],
    scoreHistogram: [
      { range: '0-2', count: 0 },
      { range: '2-4', count: 1 },
      { range: '4-6', count: 3 },
      { range: '6-8', count: 14 },
      { range: '8-10', count: 27 },
    ],
    generatedAt: daysAgo(18),
  },
  {
    _id: 'rpt003',
    examId: 'exam007',
    examTitle: 'Kiểm tra Hình học - Toán 10',
    totalStudents: 45,
    totalSubmissions: 45,
    submissionRate: 100,
    averageScore: 6.3,
    highestScore: 8.5,
    lowestScore: 3.5,
    passRate: 78,
    gradeDistribution: [
      { grade: 'Giỏi (8.5-10)', count: 5, percentage: 11 },
      { grade: 'Khá (7.0-8.4)', count: 15, percentage: 33 },
      { grade: 'Trung bình (5.0-6.9)', count: 15, percentage: 33 },
      { grade: 'Yếu (3.5-4.9)', count: 8, percentage: 18 },
      { grade: 'Kém (<3.5)', count: 2, percentage: 5 },
    ],
    scoreHistogram: [
      { range: '0-2', count: 1 },
      { range: '2-4', count: 3 },
      { range: '4-6', count: 15 },
      { range: '6-8', count: 17 },
      { range: '8-10', count: 9 },
    ],
    generatedAt: monthsAgo(2, 2),
  },
  {
    _id: 'rpt004',
    examId: 'exam004',
    examTitle: 'Thi học kỳ 1 - Ngữ Văn 12',
    totalStudents: 40,
    totalSubmissions: 35,
    submissionRate: 87.5,
    averageScore: 6.8,
    highestScore: 9.0,
    lowestScore: 3.0,
    passRate: 74,
    gradeDistribution: [
      { grade: 'Giỏi (8.5-10)', count: 6, percentage: 17 },
      { grade: 'Khá (7.0-8.4)', count: 11, percentage: 31 },
      { grade: 'Trung bình (5.0-6.9)', count: 9, percentage: 26 },
      { grade: 'Yếu (3.5-4.9)', count: 6, percentage: 17 },
      { grade: 'Kém (<3.5)', count: 3, percentage: 9 },
    ],
    scoreHistogram: [
      { range: '0-2', count: 1 },
      { range: '2-4', count: 4 },
      { range: '4-6', count: 10 },
      { range: '6-8', count: 12 },
      { range: '8-10', count: 8 },
    ],
    generatedAt: daysAgo(0),
  },
  {
    _id: 'rpt005',
    examId: 'exam006',
    examTitle: 'Kiểm tra 1 tiết - Vật Lý lớp 11',
    totalStudents: 38,
    totalSubmissions: 0,
    submissionRate: 0,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    passRate: 0,
    gradeDistribution: [
      { grade: 'Giỏi (8.5-10)', count: 0, percentage: 0 },
      { grade: 'Khá (7.0-8.4)', count: 0, percentage: 0 },
      { grade: 'Trung bình (5.0-6.9)', count: 0, percentage: 0 },
      { grade: 'Yếu (3.5-4.9)', count: 0, percentage: 0 },
      { grade: 'Kém (<3.5)', count: 0, percentage: 0 },
    ],
    scoreHistogram: [
      { range: '0-2', count: 0 },
      { range: '2-4', count: 0 },
      { range: '4-6', count: 0 },
      { range: '6-8', count: 0 },
      { range: '8-10', count: 0 },
    ],
    generatedAt: daysAgo(3),
  },
];

// ─── 11. STUDENT PROGRESS ───────────────────────────────────────────────────

export interface StudentProgress {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  dataPoints: { date: string; score: number; examTitle: string }[];
}

export const mockStudentProgress: StudentProgress[] = [
  {
    studentId: 's001',
    studentName: 'Phạm Thanh Hà',
    classId: 'cls001',
    className: '10A1',
    dataPoints: [
      { date: monthsAgo(3), score: 6.5, examTitle: 'Kiểm tra chương 1 - Toán' },
      { date: monthsAgo(2, 20), score: 7.0, examTitle: 'Kiểm tra chương 2 - Toán' },
      { date: monthsAgo(2), score: 7.5, examTitle: 'Kiểm tra Hình học' },
      { date: monthsAgo(1, 10), score: 8.0, examTitle: 'Kiểm tra Đại số' },
      { date: monthsAgo(1), score: 8.5, examTitle: 'Kiểm tra HK1' },
    ],
  },
  {
    studentId: 's002',
    studentName: 'Đặng Minh Tuấn',
    classId: 'cls001',
    className: '10A1',
    dataPoints: [
      { date: monthsAgo(3), score: 5.5, examTitle: 'Kiểm tra chương 1 - Toán' },
      { date: monthsAgo(2, 20), score: 6.0, examTitle: 'Kiểm tra chương 2 - Toán' },
      { date: monthsAgo(2), score: 6.0, examTitle: 'Kiểm tra Hình học' },
      { date: monthsAgo(1, 10), score: 6.5, examTitle: 'Kiểm tra Đại số' },
      { date: monthsAgo(1), score: 7.0, examTitle: 'Kiểm tra HK1' },
    ],
  },
  {
    studentId: 's003',
    studentName: 'Lê Thu Phương',
    classId: 'cls001',
    className: '10A1',
    dataPoints: [
      { date: monthsAgo(3), score: 8.0, examTitle: 'Kiểm tra chương 1 - Toán' },
      { date: monthsAgo(2, 20), score: 8.5, examTitle: 'Kiểm tra chương 2 - Toán' },
      { date: monthsAgo(2), score: 8.0, examTitle: 'Kiểm tra Hình học' },
      { date: monthsAgo(1, 10), score: 9.0, examTitle: 'Kiểm tra Đại số' },
      { date: monthsAgo(1), score: 9.0, examTitle: 'Kiểm tra HK1' },
    ],
  },
];

// ─── 12. NOTIFICATIONS ──────────────────────────────────────────────────────

export interface Notification {
  _id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export const mockNotifications: Notification[] = [
  {
    _id: 'notif001',
    type: 'info',
    title: 'Kỳ thi mới được tạo',
    message: 'Bài kiểm tra Tiếng Anh - Unit 4 đã được tạo và sẵn sàng để xuất bản.',
    link: '/exams/exam005',
    isRead: false,
    createdAt: daysAgo(1),
  },
  {
    _id: 'notif002',
    type: 'success',
    title: 'Bài thi đã hoàn thành chấm điểm',
    message: 'Kết quả chấm điểm cho "Kiểm tra giữa học kỳ 1 - Toán 10A1" đã sẵn sàng.',
    link: '/exams/exam001/results',
    isRead: true,
    createdAt: daysAgo(27),
  },
  {
    _id: 'notif003',
    type: 'warning',
    title: 'Phúc tra đang chờ xử lý',
    message: 'Bạn có 2 yêu cầu phúc tra đang chờ xử lý.',
    link: '/appeals',
    isRead: false,
    createdAt: daysAgo(18),
  },
  {
    _id: 'notif004',
    type: 'info',
    title: 'Có bài thi đang diễn ra',
    message: 'Bài thi "Thi học kỳ 1 - Ngữ Văn 12" đang trong quá trình thi.',
    link: '/exams/exam004',
    isRead: false,
    createdAt: daysAgo(1),
  },
  {
    _id: 'notif005',
    type: 'success',
    title: 'Sinh viên nộp bài thành công',
    message: '35/40 học sinh lớp 12A1 đã nộp bài thi Ngữ Văn HK1.',
    link: '/exams/exam004/submissions',
    isRead: true,
    createdAt: daysAgo(1),
  },
  {
    _id: 'notif006',
    type: 'info',
    title: 'Lớp học mới được thêm',
    message: 'Lớp 11A2 đã được thêm vào hệ thống với 38 học sinh.',
    link: '/classes/cls004',
    isRead: true,
    createdAt: daysAgo(60),
  },
  {
    _id: 'notif007',
    type: 'warning',
    title: 'Sắp đến hạn thi',
    message: 'Bài kiểm tra Hóa Học - Chương 3 sẽ diễn ra trong 5 ngày.',
    link: '/exams/exam003',
    isRead: false,
    createdAt: daysAgo(0),
  },
  {
    _id: 'notif008',
    type: 'success',
    title: 'Báo cáo phân tích đã sẵn sàng',
    message: 'Báo cáo phân tích kết quả học tập tháng 5 đã được tạo.',
    link: '/analytics',
    isRead: true,
    createdAt: daysAgo(5),
  },
  {
    _id: 'notif009',
    type: 'error',
    title: 'Lỗi quét OMR',
    message: '5 phiếu trả lời trong bài thi HK1 Toán không thể quét tự động.',
    link: '/scans',
    isRead: true,
    createdAt: daysAgo(28),
  },
  {
    _id: 'notif010',
    type: 'info',
    title: 'Người dùng mới được thêm',
    message: 'Tài khoản "Ngô Đức Anh" đã được kích hoạt.',
    link: '/users/s004',
    isRead: true,
    createdAt: daysAgo(90),
  },
];

// ─── 13. OMR TEMPLATES ─────────────────────────────────────────────────────

export const mockOMRTemplates: OMRTemplate[] = [
  {
    _id: 'omr001',
    name: 'Phiếu trả lời 40 câu',
    code: 'OMR-40Q',
    description: 'Phiếu trả lời trắc nghiệm 40 câu, phù hợp với bài thi 40-50 phút.',
    numberOfQuestions: 40,
    bubblesPerRow: 5,
    hasNameField: true,
    hasStudentCodeField: true,
    hasSubjectField: true,
    hasDateField: true,
    createdAt: daysAgo(365),
  },
  {
    _id: 'omr002',
    name: 'Phiếu trả lời 50 câu',
    code: 'OMR-50Q',
    description: 'Phiếu trả lời trắc nghiệm 50 câu, phù hợp với bài thi 60-90 phút.',
    numberOfQuestions: 50,
    bubblesPerRow: 5,
    hasNameField: true,
    hasStudentCodeField: true,
    hasSubjectField: true,
    hasDateField: true,
    createdAt: daysAgo(300),
  },
  {
    _id: 'omr003',
    name: 'Phiếu trả lời 30 câu',
    code: 'OMR-30Q',
    description: 'Phiếu trả lời trắc nghiệm 30 câu, phù hợp với bài thi 15-30 phút.',
    numberOfQuestions: 30,
    bubblesPerRow: 5,
    hasNameField: true,
    hasStudentCodeField: true,
    hasSubjectField: false,
    hasDateField: true,
    createdAt: daysAgo(200),
  },
];

// ─── 14. DASHBOARD STATS ────────────────────────────────────────────────────

export const mockDashboardStats: DashboardStats = {
  totalClasses: 5,
  totalStudents: 245,
  activeExams: 3,
  scoredPapers: 180,
};

export const mockDashboardExams: ExamItem[] = mockExams.slice(0, 5).map(e => ({
  _id: e._id,
  title: e.title,
  description: e.description || '',
  classIds: e.classIds as ClassItem[],
  primaryClassId: e.primaryClassId as ClassItem,
  subjectId: e.subjectId as { _id: string; name: string; code: string; color: string },
  examDate: e.examDate || '',
  duration: e.duration || 45,
  totalScore: e.totalScore || 10,
  passingScore: e.passingScore || 5,
  numberOfQuestions: e.numberOfQuestions || 0,
  status: e.status,
  createdBy: e.createdBy as { _id: string; name: string; email: string },
  publishedAt: e.publishedAt,
  completedAt: e.completedAt,
  totalSubmissions: e.totalSubmissions || 0,
  totalStudents: e.totalStudents || 0,
}));

// ─── 15. ANALYTICS DATA ─────────────────────────────────────────────────────

export interface SubjectPerformance {
  subjectId: string;
  subjectName: string;
  color: string;
  averageScore: number;
  examCount: number;
  studentCount: number;
  trend: 'up' | 'down' | 'stable';
}

export interface GradeDistribution {
  grade: string;
  count: number;
  percentage: number;
  color: string;
}

export interface StudentRanking {
  rank: number;
  studentId: string;
  studentName: string;
  className: string;
  averageScore: number;
  totalExams: number;
  improvement: number;
}

export interface AnalyticsData {
  summary: {
    totalExams: number;
    totalStudents: number;
    avgScore: number;
    avgSubmissionRate: number;
    totalAppeals: number;
    pendingAppeals: number;
  };
  subjectPerformance: SubjectPerformance[];
  gradeDistribution: GradeDistribution[];
  studentRankings: StudentRanking[];
  recentActivity: { date: string; event: string; count: number }[];
}

export const mockAnalyticsData: AnalyticsData = {
  summary: {
    totalExams: 7,
    totalStudents: 245,
    avgScore: 7.1,
    avgSubmissionRate: 92,
    totalAppeals: 5,
    pendingAppeals: 2,
  },
  subjectPerformance: [
    { subjectId: 'subj001', subjectName: 'Toán học', color: '#3B82F6', averageScore: 7.2, examCount: 3, studentCount: 120, trend: 'up' },
    { subjectId: 'subj002', subjectName: 'Vật Lý', color: '#10B981', averageScore: 7.8, examCount: 2, studentCount: 100, trend: 'stable' },
    { subjectId: 'subj003', subjectName: 'Hóa Học', color: '#8B5CF6', averageScore: 6.9, examCount: 1, studentCount: 80, trend: 'down' },
    { subjectId: 'subj004', subjectName: 'Ngữ Văn', color: '#EF4444', averageScore: 6.8, examCount: 1, studentCount: 40, trend: 'up' },
    { subjectId: 'subj005', subjectName: 'Tiếng Anh', color: '#F59E0B', averageScore: 7.5, examCount: 1, studentCount: 45, trend: 'stable' },
  ],
  gradeDistribution: [
    { grade: 'Giỏi (8.5-10)', count: 45, percentage: 18, color: '#10B981' },
    { grade: 'Khá (7.0-8.4)', count: 85, percentage: 35, color: '#3B82F6' },
    { grade: 'Trung bình (5.0-6.9)', count: 75, percentage: 31, color: '#F59E0B' },
    { grade: 'Yếu (3.5-4.9)', count: 30, percentage: 12, color: '#EF4444' },
    { grade: 'Kém (<3.5)', count: 10, percentage: 4, color: '#6B7280' },
  ],
  studentRankings: [
    { rank: 1, studentId: 's003', studentName: 'Lê Thu Phương', className: '10A1', averageScore: 9.0, totalExams: 4, improvement: 1.5 },
    { rank: 2, studentId: 's001', studentName: 'Phạm Thanh Hà', className: '10A1', averageScore: 8.2, totalExams: 4, improvement: 2.0 },
    { rank: 3, studentId: 's002', studentName: 'Đặng Minh Tuấn', className: '10A1', averageScore: 7.4, totalExams: 4, improvement: 1.5 },
    { rank: 4, studentId: 's004', studentName: 'Ngô Đức Anh', className: '10A1', averageScore: 6.8, totalExams: 4, improvement: -0.5 },
    { rank: 5, studentId: 's005', studentName: 'Bùi Thị Lan', className: '10A1', averageScore: 5.8, totalExams: 4, improvement: 1.2 },
  ],
  recentActivity: [
    { date: daysAgo(0), event: 'Nộp bài thi', count: 3 },
    { date: daysAgo(1), event: 'Nộp bài thi', count: 35 },
    { date: daysAgo(1), event: 'Tạo bài thi', count: 1 },
    { date: daysAgo(2), event: 'Phúc tra', count: 2 },
    { date: daysAgo(3), event: 'Xuất bản bài thi', count: 2 },
    { date: daysAgo(5), event: 'Tạo bài thi', count: 1 },
    { date: daysAgo(7), event: 'Nộp bài thi', count: 45 },
  ],
};

// ─── 16. AI REPORTS & CHAT ──────────────────────────────────────────────────

export interface AIReport {
  _id: string;
  examId: string;
  examTitle: string;
  type: 'summary' | 'performance' | 'insight' | 'recommendation';
  content: string;
  generatedAt: string;
}

export interface AIChatMessage {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const mockAIReports: AIReport[] = [
  {
    _id: 'airep001',
    examId: 'exam001',
    examTitle: 'Kiểm tra giữa học kỳ 1 - Toán 10A1',
    type: 'summary',
    content: 'Tổng quan: 45 học sinh tham gia, điểm trung bình 7.2/10. Tỷ lệ đạt yêu cầu 89%. Điểm mạnh: đa số học sinh nắm vững kiến thức về phương trình bậc hai (câu 2, tỷ lệ đúng 85%). Điểm yếu: phần tích phân (câu 3) và cực trị (câu 5) có tỷ lệ đúng thấp hơn (62% và 55%). Khuyến nghị: tăng cường bài tập về tích phân và ứng dụng đạo hàm trong khảo sát hàm số.',
    generatedAt: daysAgo(27),
  },
  {
    _id: 'airep002',
    examId: 'exam001',
    examTitle: 'Kiểm tra giữa học kỳ 1 - Toán 10A1',
    type: 'insight',
    content: 'Phân tích sâu: Câu hỏi về cực trị (q005) là thách thức nhất với chỉ 55% đúng. Học sinh thường nhầm lẫn giữa điểm cực đại và cực tiểu. Đặc biệt, 12% học sinh chọn đáp án sai hoàn toàn (đáp án A). Gợi ý: sử dụng bảng biến thiên và kiểm tra dấu đạo hàm để xác định cực trị.',
    generatedAt: daysAgo(27),
  },
  {
    _id: 'airep003',
    examId: 'exam002',
    examTitle: 'Kiểm tra 15 phút - Vật Lý lần 1',
    type: 'performance',
    content: 'Hiệu suất xuất sắc: 49% học sinh đạt điểm Giỏi (8.5-10). Câu dễ nhất là câu về số Avogadro (q011) với 95% đúng. Câu khó nhất là về con lắc lò xo (q009) với 60% đúng. Đề xuất: tăng độ khó của bài kiểm tra tiếp theo để phân hóa tốt hơn.',
    generatedAt: daysAgo(18),
  },
  {
    _id: 'airep004',
    examId: 'exam007',
    examTitle: 'Kiểm tra Hình học - Toán 10',
    type: 'recommendation',
    content: 'Khuyến nghị cải thiện: Cần tập trung ôn tập vector và tích vô hướng. 18% học sinh đạt dưới trung bình. Đề xuất: (1) Tổ chức buổi học phụ đạo về hình học vector, (2) Bổ sung bài tập vận dụng cao về tích vô hướng, (3) Sử dụng hình ảnh trực quan trong giảng dạy.',
    generatedAt: monthsAgo(2, 2),
  },
  {
    _id: 'airep005',
    examId: 'exam004',
    examTitle: 'Thi học kỳ 1 - Ngữ Văn 12',
    type: 'summary',
    content: 'Tổng quan: 35/40 học sinh đã nộp bài. Điểm trung bình 6.8/10. Phần đọc hiểu có tỷ lệ điểm cao hơn phần viết. Khuyến nghị: tăng cường luyện viết nghị luận xã hội và cải thiện kỹ năng phân tích tác phẩm văn học.',
    generatedAt: daysAgo(0),
  },
];

export const mockAIChatMessages: AIChatMessage[] = [
  {
    _id: 'chat001',
    role: 'assistant',
    content: 'Xin chào! Tôi là trợ lý AI của Smart Grading. Tôi có thể giúp bạn phân tích kết quả học tập, tạo báo cáo tự động, hoặc trả lời các câu hỏi về hệ thống. Bạn cần hỗ trợ gì hôm nay?',
    timestamp: daysAgo(1),
  },
  {
    _id: 'chat002',
    role: 'user',
    content: 'Phân tích kết quả bài thi Toán HK1 cho lớp 10A1',
    timestamp: daysAgo(1),
  },
  {
    _id: 'chat003',
    role: 'assistant',
    content: 'Dựa trên dữ liệu bài thi Toán HK1 lớp 10A1, tôi nhận thấy: Điểm trung bình 7.2/10, cao hơn mức trung bình của trường (6.9). 62% học sinh đạt từ Khá trở lên. Điểm yếu nhất tập trung ở phần Tích phân và Cực trị. Bạn có muốn tôi đề xuất kế hoạch ôn tập cá nhân hóa cho từng học sinh không?',
    timestamp: daysAgo(1),
  },
  {
    _id: 'chat004',
    role: 'user',
    content: 'Có, hãy tạo kế hoạch cho 3 học sinh có điểm thấp nhất',
    timestamp: daysAgo(1),
  },
  {
    _id: 'chat005',
    role: 'assistant',
    content: 'Đã tạo kế hoạch học tập cá nhân hóa cho 3 học sinh có điểm thấp nhất:\n\n1. **Ngô Đức Anh** (5.5 điểm): Cần cải thiện về Tích phân và Cực trị. Gợi ý: 15 bài tập cơ bản về Tích phân, 10 bài về Cực trị.\n\n2. **Bùi Thị Lan** (4.0 điểm): Nền tảng yếu về Đạo hàm. Gợi ý: Ôn lại từ đầu chương Đạo hàm, làm 20 bài tập trắc nghiệm cơ bản.\n\n3. **Lê Thu Phương** (không nộp HK1): Cần liên hệ để xác minh tình trạng.\n\nBạn có muốn tôi gửi kế hoạch này qua email cho các em không?',
    timestamp: daysAgo(1),
  },
  {
    _id: 'chat006',
    role: 'user',
    content: 'So sánh hiệu suất giữa các môn học trong tháng này',
    timestamp: daysAgo(0),
  },
  {
    _id: 'chat007',
    role: 'assistant',
    content: 'So sánh hiệu suất các môn học tháng này:\n\n| Môn | Điểm TB | Số bài thi | Xu hướng |\n|-----|---------|-----------|----------|\n| Vật Lý | 7.8 ⭐ | 2 | Ổn định |\n| Tiếng Anh | 7.5 | 1 | Ổn định |\n| Toán | 7.2 | 3 | ↗ Tăng |\n| Ngữ Văn | 6.8 | 1 | ↗ Tăng |\n| Hóa Học | 6.9 | 1 | ↘ Giảm |\n\n**Nhận định**: Vật Lý có hiệu suất tốt nhất. Hóa Học cần được chú ý với điểm trung bình thấp nhất. Bạn có muốn tôi phân tích chi tiết nguyên nhân giảm điểm Hóa Học không?',
    timestamp: daysAgo(0),
  },
];

// ─── Paginated Response Helpers ─────────────────────────────────────────────

export function createPaginatedResponse<T>(items: T[], page = 1, limit = 20) {
  const total = items.length;
  const pages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const results = items.slice(start, start + limit);
  return { results, page, limit, total, pages };
}

// ─── Re-export for convenience ───────────────────────────────────────────────

export { useExamStore } from '../presentation/store/examStore';
export type { Exam, ExamVersion, ExamStatistics, ExamFilters, CreateExamPayload, ClassRef } from '../presentation/store/examStore';
export { useQuestionStore, questionService } from '../presentation/store/questionStore';
export type { BackendQuestion, CreateQuestionPayload } from '../presentation/store/questionStore';
export { useSubmissionStore } from '../presentation/store/submissionStore';
export type { BackendSubmission } from '../presentation/store/submissionStore';
export { useClassStore } from '../presentation/store/classStore';
export type { ClassItem, TeacherItem } from '../presentation/store/classStore';
export { useOMRTemplateStore } from '../presentation/store/omrTemplateStore';
export type { OMRTemplate } from '../presentation/store/omrTemplateStore';
export { useAuthStore } from '../presentation/store/authStore';
export type { User } from '../presentation/store/authStore';
export { useDashboardStore, classService } from '../presentation/store/dashboardStore';
export type { DashboardStats, ExamItem } from '../presentation/store/dashboardStore';
