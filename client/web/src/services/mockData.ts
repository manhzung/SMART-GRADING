/**
 * Mock Data Service
 * Comprehensive mock data for frontend development without a backend.
 * All data uses realistic English names, plausible exam scores, and relative dates.
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
    name: 'Mai Huong Nguyen',
    email: 'maihuong@nbk-high.edu',
    role: 'teacher',
    isEmailVerified: true,
    schoolId: 'school001',
  },
  {
    id: 't002',
    name: 'Minh Van Tran',
    email: 'minhtran@nbk-high.edu',
    role: 'teacher',
    isEmailVerified: true,
    schoolId: 'school001',
  },
  // 1 Admin
  {
    id: 'admin001',
    name: 'Hoang Nam Le',
    email: 'nam.admin@nbk-high.edu',
    role: 'admin',
    isEmailVerified: true,
    schoolId: 'school001',
  },
  // 5 Students
  {
    id: 's001',
    name: 'Thanh Ha Pham',
    email: 'hapt_s1@student.nbk-high.edu',
    role: 'student',
    isEmailVerified: true,
    schoolId: 'school001',
  },
  {
    id: 's002',
    name: 'Minh Tuan Dang',
    email: 'tuan.dm@student.nbk-high.edu',
    role: 'student',
    isEmailVerified: true,
    schoolId: 'school001',
  },
  {
    id: 's003',
    name: 'Thu Phuong Le',
    email: 'phuong.lt@student.nbk-high.edu',
    role: 'student',
    isEmailVerified: true,
    schoolId: 'school001',
  },
  {
    id: 's004',
    name: 'Duc Anh Ngo',
    email: 'anh.nd@student.nbk-high.edu',
    role: 'student',
    isEmailVerified: false,
    schoolId: 'school001',
  },
  {
    id: 's005',
    name: 'Thi Lan Bui',
    email: 'lan.bt@student.nbk-high.edu',
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
    name: 'Nguyen Binh Khiem Specialized High School',
    address: '01 Vo Van Ngan Street, Thu Duc District, Ho Chi Minh City',
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
    name: 'Mathematics',
    code: 'MATH',
    description: 'Mathematics subject for high school students',
    gradeLevel: 10,
    color: '#3B82F6',
  },
  {
    _id: 'subj002',
    name: 'Physics',
    code: 'PHY',
    description: 'Physics subject for high school students',
    gradeLevel: 10,
    color: '#10B981',
  },
  {
    _id: 'subj003',
    name: 'Chemistry',
    code: 'CHEM',
    description: 'Chemistry subject for high school students',
    gradeLevel: 10,
    color: '#8B5CF6',
  },
  {
    _id: 'subj004',
    name: 'Literature',
    code: 'LIT',
    description: 'Literature subject for high school students',
    gradeLevel: 10,
    color: '#EF4444',
  },
  {
    _id: 'subj005',
    name: 'English',
    code: 'ENG',
    description: 'English subject for high school students',
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
    homeroomTeacherId: { _id: 't001', name: 'Mai Huong Nguyen', email: 'maihuong@nbk-high.edu' },
    studentIds: ['s001', 's002', 's003', 's004', 's005'],
    subjectTeachers: [
      { subjectId: { _id: 'subj001', name: 'Mathematics', code: 'MATH', color: '#3B82F6' }, teacherId: { _id: 't001', name: 'Mai Huong Nguyen', email: 'maihuong@nbk-high.edu' } },
      { subjectId: { _id: 'subj002', name: 'Physics', code: 'PHY', color: '#10B981' }, teacherId: { _id: 't002', name: 'Minh Van Tran', email: 'minhtran@nbk-high.edu' } },
      { subjectId: { _id: 'subj003', name: 'Chemistry', code: 'CHEM', color: '#8B5CF6' }, teacherId: { _id: 't002', name: 'Minh Van Tran', email: 'minhtran@nbk-high.edu' } },
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
    homeroomTeacherId: { _id: 't002', name: 'Minh Van Tran', email: 'minhtran@nbk-high.edu' },
    studentIds: [],
    subjectTeachers: [
      { subjectId: { _id: 'subj001', name: 'Mathematics', code: 'MATH', color: '#3B82F6' }, teacherId: { _id: 't002', name: 'Minh Van Tran', email: 'minhtran@nbk-high.edu' } },
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
    homeroomTeacherId: { _id: 't001', name: 'Mai Huong Nguyen', email: 'maihuong@nbk-high.edu' },
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
    homeroomTeacherId: { _id: 't002', name: 'Minh Van Tran', email: 'minhtran@nbk-high.edu' },
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
    homeroomTeacherId: { _id: 't001', name: 'Mai Huong Nguyen', email: 'maihuong@nbk-high.edu' },
    studentIds: [],
    subjectTeachers: [
      { subjectId: { _id: 'subj001', name: 'Mathematics', code: 'MATH', color: '#3B82F6' }, teacherId: { _id: 't001', name: 'Mai Huong Nguyen', email: 'maihuong@nbk-high.edu' } },
      { subjectId: { _id: 'subj004', name: 'Literature', code: 'LIT', color: '#EF4444' }, teacherId: { _id: 't002', name: 'Minh Van Tran', email: 'minhtran@nbk-high.edu' } },
    ],
    isActive: true,
    enrollmentCode: 'NBK12A12026',
    createdAt: daysAgo(730),
    updatedAt: daysAgo(15),
  },
];

// ─── 5. QUESTIONS ───────────────────────────────────────────────────────────

export const mockQuestions: BackendQuestion[] = [
  // Mathematics - 10 questions
  {
    _id: 'q001', id: 'Q001', content: 'Calculate the derivative of the function f(x) = x³ + 2x² - 5x + 1.',
    type: 'single_choice', options: [
      { id: 'A', content: '3x² + 4x - 5', isCorrect: true },
      { id: 'B', content: '3x² + 2x - 5', isCorrect: false },
      { id: 'C', content: 'x³ + 4x - 5', isCorrect: false },
      { id: 'D', content: '3x² + 4x + 1', isCorrect: false },
    ],
    correctAnswer: 'A', score: 1, difficulty: 'easy', topicId: 'topic001', topicName: 'Derivatives',
    source: 'ai', explanation: 'Using the basic derivative rule: (xⁿ)\' = nxⁿ⁻¹.',
    usageCount: 12, correctRate: 0.78, isActive: true, isApproved: true,
    createdAt: daysAgo(90), updatedAt: daysAgo(30), createdBy: { _id: 't001', name: 'Mai Huong Nguyen', schoolId: 'school001' },
  },
  {
    _id: 'q002', id: 'Q002', content: 'Solve the equation: x² - 5x + 6 = 0',
    type: 'single_choice', options: [
      { id: 'A', content: 'x = 1 or x = 6', isCorrect: false },
      { id: 'B', content: 'x = 2 or x = 3', isCorrect: true },
      { id: 'C', content: 'x = -2 or x = -3', isCorrect: false },
      { id: 'D', content: 'x = 1 or x = 5', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'easy', topicId: 'topic001', topicName: 'Quadratic Equations',
    source: 'manual', explanation: 'Using the quadratic formula to solve the equation.',
    usageCount: 25, correctRate: 0.85, isActive: true, isApproved: true,
    createdAt: daysAgo(120), updatedAt: daysAgo(60), createdBy: { _id: 't001', name: 'Mai Huong Nguyen', schoolId: 'school001' },
  },
  {
    _id: 'q003', id: 'Q003', content: 'Calculate the integral: ∫₀¹ x² dx',
    type: 'single_choice', options: [
      { id: 'A', content: '1/4', isCorrect: false },
      { id: 'B', content: '1/3', isCorrect: true },
      { id: 'C', content: '1/2', isCorrect: false },
      { id: 'D', content: '1', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'medium', topicId: 'topic002', topicName: 'Integration',
    source: 'ai', explanation: '∫x²dx = x³/3, evaluating from 0 to 1 gives 1/3.',
    usageCount: 8, correctRate: 0.62, isActive: true, isApproved: true,
    createdAt: daysAgo(60), updatedAt: daysAgo(15), createdBy: { _id: 't001', name: 'Mai Huong Nguyen', schoolId: 'school001' },
  },
  {
    _id: 'q004', id: 'Q004', content: 'Find the domain of the function y = √(x - 3) + 1/(x - 5)',
    type: 'single_choice', options: [
      { id: 'A', content: '[3; +∞) \\ {5}', isCorrect: true },
      { id: 'B', content: '(3; +∞) \\ {5}', isCorrect: false },
      { id: 'C', content: '[3; 5) ∪ (5; +∞)', isCorrect: false },
      { id: 'D', content: 'R \\ {5}', isCorrect: false },
    ],
    correctAnswer: 'A', score: 1, difficulty: 'medium', topicId: 'topic003', topicName: 'Domain',
    source: 'manual', explanation: 'x-3 ≥ 0 and x-5 ≠ 0, combining gives [3;+∞)\\{5}.',
    usageCount: 15, correctRate: 0.70, isActive: true, isApproved: true,
    createdAt: daysAgo(80), updatedAt: daysAgo(40), createdBy: { _id: 't002', name: 'Minh Van Tran', schoolId: 'school001' },
  },
  {
    _id: 'q005', id: 'Q005', content: 'Given the function y = f(x) = x³ - 3x. Which statement is FALSE?',
    type: 'single_choice', options: [
      { id: 'A', content: 'The function is increasing on the interval (-1; 1)', isCorrect: false },
      { id: 'B', content: 'The function is decreasing on the interval (-∞; -1)', isCorrect: false },
      { id: 'C', content: 'The graph passes through the origin', isCorrect: false },
      { id: 'D', content: 'The function has 2 extreme points', isCorrect: true },
    ],
    correctAnswer: 'D', score: 1, difficulty: 'hard', topicId: 'topic004', topicName: 'Extremum',
    source: 'ai', explanation: 'f\'(x)=3x²-3=0 ⇒ x=±1. The function has 2 extreme points at x=-1 and x=1.',
    usageCount: 5, correctRate: 0.55, isActive: true, isApproved: true,
    createdAt: daysAgo(45), updatedAt: daysAgo(10), createdBy: { _id: 't001', name: 'Mai Huong Nguyen', schoolId: 'school001' },
  },
  // Physics - 6 questions
  {
    _id: 'q006', id: 'Q006', content: 'An object moves with uniform linear motion at a velocity of 10 m/s. What is the distance traveled in 5 seconds?',
    type: 'single_choice', options: [
      { id: 'A', content: '25 m', isCorrect: false },
      { id: 'B', content: '50 m', isCorrect: true },
      { id: 'C', content: '100 m', isCorrect: false },
      { id: 'D', content: '15 m', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'easy', topicId: 'topic010', topicName: 'Uniform Linear Motion',
    source: 'manual', explanation: 's = v × t = 10 × 5 = 50 m.',
    usageCount: 30, correctRate: 0.92, isActive: true, isApproved: true,
    createdAt: daysAgo(150), updatedAt: daysAgo(90), createdBy: { _id: 't002', name: 'Minh Van Tran', schoolId: 'school001' },
  },
  {
    _id: 'q007', id: 'Q007', content: 'What is the formula for kinetic energy of an object?',
    type: 'single_choice', options: [
      { id: 'A', content: 'Wₖ = mgh', isCorrect: false },
      { id: 'B', content: 'Wₖ = ½mv²', isCorrect: true },
      { id: 'C', content: 'Wₖ = mv²', isCorrect: false },
      { id: 'D', content: 'Wₖ = mgh + ½mv²', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'easy', topicId: 'topic011', topicName: 'Kinetic Energy',
    source: 'manual', explanation: 'Kinetic energy formula: Wₖ = ½mv².',
    usageCount: 22, correctRate: 0.88, isActive: true, isApproved: true,
    createdAt: daysAgo(100), updatedAt: daysAgo(50), createdBy: { _id: 't002', name: 'Minh Van Tran', schoolId: 'school001' },
  },
  {
    _id: 'q008', id: 'Q008', content: 'What factors does the gravitational force between two objects depend on?',
    type: 'single_choice', options: [
      { id: 'A', content: 'Mass and distance', isCorrect: true },
      { id: 'B', content: 'Mass only', isCorrect: false },
      { id: 'C', content: 'Distance only', isCorrect: false },
      { id: 'D', content: 'Volume and mass', isCorrect: false },
    ],
    correctAnswer: 'A', score: 1, difficulty: 'medium', topicId: 'topic012', topicName: 'Gravitational Force',
    source: 'ai', explanation: 'F = G(m₁m₂)/r² depends on both masses and the square of the distance.',
    usageCount: 18, correctRate: 0.75, isActive: true, isApproved: true,
    createdAt: daysAgo(70), updatedAt: daysAgo(35), createdBy: { _id: 't002', name: 'Minh Van Tran', schoolId: 'school001' },
  },
  {
    _id: 'q009', id: 'Q009', content: 'A spring-mass system oscillates with period T. If the mass is increased by 4 times, what is the new period?',
    type: 'single_choice', options: [
      { id: 'A', content: '2T', isCorrect: true },
      { id: 'B', content: '4T', isCorrect: false },
      { id: 'C', content: 'T/2', isCorrect: false },
      { id: 'D', content: 'T/4', isCorrect: false },
    ],
    correctAnswer: 'A', score: 1, difficulty: 'hard', topicId: 'topic013', topicName: 'Spring Oscillation',
    source: 'ai', explanation: 'T = 2π√(m/k), if m increases 4 times, T increases 2 times.',
    usageCount: 7, correctRate: 0.60, isActive: true, isApproved: true,
    createdAt: daysAgo(30), updatedAt: daysAgo(5), createdBy: { _id: 't002', name: 'Minh Van Tran', schoolId: 'school001' },
  },
  {
    _id: 'q010', id: 'Q010', content: 'The potential difference between points A and B is U = 12V. What is the work done by the electric force when moving charge q = 2C from A to B?',
    type: 'single_choice', options: [
      { id: 'A', content: '6 J', isCorrect: false },
      { id: 'B', content: '14 J', isCorrect: false },
      { id: 'C', content: '24 J', isCorrect: true },
      { id: 'D', content: '10 J', isCorrect: false },
    ],
    correctAnswer: 'C', score: 1, difficulty: 'medium', topicId: 'topic014', topicName: 'Electric Work',
    source: 'manual', explanation: 'A = qU = 2 × 12 = 24 J.',
    usageCount: 14, correctRate: 0.80, isActive: true, isApproved: true,
    createdAt: daysAgo(55), updatedAt: daysAgo(20), createdBy: { _id: 't002', name: 'Minh Van Tran', schoolId: 'school001' },
  },
  {
    _id: 'q011', id: 'Q011', content: 'What is the speed of light in vacuum in km/s?',
    type: 'single_choice', options: [
      { id: 'A', content: '3 × 10⁶ km/s', isCorrect: false },
      { id: 'B', content: '3 × 10⁵ km/s', isCorrect: true },
      { id: 'C', content: '3 × 10⁴ km/s', isCorrect: false },
      { id: 'D', content: '3 × 10⁷ km/s', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'easy', topicId: 'topic015', topicName: 'Relativity',
    source: 'manual', explanation: 'c = 300,000 km/s = 3 × 10⁵ km/s.',
    usageCount: 40, correctRate: 0.95, isActive: true, isApproved: true,
    createdAt: daysAgo(200), updatedAt: daysAgo(100), createdBy: { _id: 't002', name: 'Minh Van Tran', schoolId: 'school001' },
  },
  // Chemistry - 6 questions
  {
    _id: 'q012', id: 'Q012', content: 'What is the chemical formula of sulfuric acid?',
    type: 'single_choice', options: [
      { id: 'A', content: 'HCl', isCorrect: false },
      { id: 'B', content: 'H₂SO₄', isCorrect: true },
      { id: 'C', content: 'HNO₃', isCorrect: false },
      { id: 'D', content: 'H₃PO₄', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'easy', topicId: 'topic020', topicName: 'Acids',
    source: 'manual', explanation: 'Sulfuric acid has the formula H₂SO₄.',
    usageCount: 35, correctRate: 0.90, isActive: true, isApproved: true,
    createdAt: daysAgo(180), updatedAt: daysAgo(90), createdBy: { _id: 't001', name: 'Mai Huong Nguyen', schoolId: 'school001' },
  },
  {
    _id: 'q013', id: 'Q013', content: 'The reaction Na + H₂O → NaOH + H₂ belongs to which type?',
    type: 'single_choice', options: [
      { id: 'A', content: 'Combination reaction', isCorrect: false },
      { id: 'B', content: 'Single replacement reaction', isCorrect: true },
      { id: 'C', content: 'Double replacement reaction', isCorrect: false },
      { id: 'D', content: 'Decomposition reaction', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'medium', topicId: 'topic021', topicName: 'Chemical Reactions',
    source: 'manual', explanation: 'Na replaces H in H₂O → single replacement reaction.',
    usageCount: 20, correctRate: 0.78, isActive: true, isApproved: true,
    createdAt: daysAgo(120), updatedAt: daysAgo(60), createdBy: { _id: 't001', name: 'Mai Huong Nguyen', schoolId: 'school001' },
  },
  {
    _id: 'q014', id: 'Q014', content: 'What is the atomic number of Carbon (C)?',
    type: 'single_choice', options: [
      { id: 'A', content: '6', isCorrect: true },
      { id: 'B', content: '12', isCorrect: false },
      { id: 'C', content: '8', isCorrect: false },
      { id: 'D', content: '14', isCorrect: false },
    ],
    correctAnswer: 'A', score: 1, difficulty: 'easy', topicId: 'topic022', topicName: 'Atoms',
    source: 'manual', explanation: 'C has Z = 6 (6 protons in the nucleus).',
    usageCount: 45, correctRate: 0.93, isActive: true, isApproved: true,
    createdAt: daysAgo(200), updatedAt: daysAgo(100), createdBy: { _id: 't001', name: 'Mai Huong Nguyen', schoolId: 'school001' },
  },
  {
    _id: 'q015', id: 'Q015', content: 'Which type of chemical bond is formed by sharing electrons between two atoms?',
    type: 'single_choice', options: [
      { id: 'A', content: 'Ionic bond', isCorrect: false },
      { id: 'B', content: 'Covalent bond', isCorrect: true },
      { id: 'C', content: 'Metallic bond', isCorrect: false },
      { id: 'D', content: 'Hydrogen bond', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'medium', topicId: 'topic023', topicName: 'Chemical Bonding',
    source: 'ai', explanation: 'Covalent bond is formed by sharing electron pairs.',
    usageCount: 25, correctRate: 0.82, isActive: true, isApproved: true,
    createdAt: daysAgo(80), updatedAt: daysAgo(40), createdBy: { _id: 't001', name: 'Mai Huong Nguyen', schoolId: 'school001' },
  },
  {
    _id: 'q016', id: 'Q016', content: 'What is the molar mass of glucose (C₆H₁₂O₆) in g/mol?',
    type: 'single_choice', options: [
      { id: 'A', content: '150 g/mol', isCorrect: false },
      { id: 'B', content: '160 g/mol', isCorrect: false },
      { id: 'C', content: '170 g/mol', isCorrect: false },
      { id: 'D', content: '180 g/mol', isCorrect: true },
    ],
    correctAnswer: 'D', score: 1, difficulty: 'medium', topicId: 'topic024', topicName: 'Carbohydrates',
    source: 'ai', explanation: 'M = 12×6 + 1×12 + 16×6 = 72 + 12 + 96 = 180 g/mol.',
    usageCount: 10, correctRate: 0.72, isActive: true, isApproved: true,
    createdAt: daysAgo(40), updatedAt: daysAgo(10), createdBy: { _id: 't001', name: 'Mai Huong Nguyen', schoolId: 'school001' },
  },
  {
    _id: 'q017', id: 'Q017', content: 'In the periodic table, which element has the strongest nonmetal properties?',
    type: 'single_choice', options: [
      { id: 'A', content: 'Oxygen', isCorrect: false },
      { id: 'B', content: 'Nitrogen', isCorrect: false },
      { id: 'C', content: 'Chlorine', isCorrect: false },
      { id: 'D', content: 'Fluorine', isCorrect: true },
    ],
    correctAnswer: 'D', score: 1, difficulty: 'medium', topicId: 'topic025', topicName: 'Periodic Table',
    source: 'manual', explanation: 'Fluorine (F) has the highest electronegativity.',
    usageCount: 18, correctRate: 0.75, isActive: true, isApproved: true,
    createdAt: daysAgo(60), updatedAt: daysAgo(20), createdBy: { _id: 't001', name: 'Mai Huong Nguyen', schoolId: 'school001' },
  },
  // Literature - 4 questions
  {
    _id: 'q018', id: 'Q018', content: 'What poetic form was Nguyen Du\'s "Tale of Kieu" written in?',
    type: 'single_choice', options: [
      { id: 'A', content: 'Luc bat (6-8)', isCorrect: false },
      { id: 'B', content: 'Song that luc bat (parallel 6-8)', isCorrect: true },
      { id: 'C', content: 'Seven-character quatrain', isCorrect: false },
      { id: 'D', content: 'Cao cao', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'easy', topicId: 'topic030', topicName: 'Classical Literature',
    source: 'manual', explanation: 'Tale of Kieu was written in the song that luc bat form.',
    usageCount: 50, correctRate: 0.88, isActive: true, isApproved: true,
    createdAt: daysAgo(250), updatedAt: daysAgo(120), createdBy: { _id: 't002', name: 'Minh Van Tran', schoolId: 'school001' },
  },
  {
    _id: 'q019', id: 'Q019', content: 'Which detail does NOT belong to Thuy Kieu character in "Tale of Kieu"?',
    type: 'single_choice', options: [
      { id: 'A', content: 'Described as "cheeks like peach blossoms"', isCorrect: false },
      { id: 'B', content: 'Has musical talent', isCorrect: false },
      { id: 'C', content: 'Is the youngest daughter of the Vuong family', isCorrect: false },
      { id: 'D', content: 'Born into a royal family', isCorrect: true },
    ],
    correctAnswer: 'D', score: 1, difficulty: 'medium', topicId: 'topic030', topicName: 'Tale of Kieu',
    source: 'ai', explanation: 'Thuy Kieu came from a scholarly family, not royalty.',
    usageCount: 12, correctRate: 0.65, isActive: true, isApproved: true,
    createdAt: daysAgo(50), updatedAt: daysAgo(15), createdBy: { _id: 't002', name: 'Minh Van Tran', schoolId: 'school001' },
  },
  {
    _id: 'q020', id: 'Q020', content: 'What is the distinctive feature of "narrative" genre in literature?',
    type: 'single_choice', options: [
      { id: 'A', content: 'Expresses the author\'s subjective emotions', isCorrect: false },
      { id: 'B', content: 'Recounts events in chronological order', isCorrect: true },
      { id: 'C', content: 'Analyzes and argues about an issue', isCorrect: false },
      { id: 'D', content: 'Describes scenery and people', isCorrect: false },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'medium', topicId: 'topic031', topicName: 'Literary Forms',
    source: 'manual', explanation: 'Narrative writing focuses on recounting events in chronological order.',
    usageCount: 22, correctRate: 0.77, isActive: true, isApproved: true,
    createdAt: daysAgo(70), updatedAt: daysAgo(30), createdBy: { _id: 't002', name: 'Minh Van Tran', schoolId: 'school001' },
  },
  {
    _id: 'q021', id: 'Q021', content: 'Nguyen Dinh Chieu\'s "Eulogy for Can Gio Martyrs" belongs to which genre?',
    type: 'single_choice', options: [
      { id: 'A', content: 'Prose', isCorrect: false },
      { id: 'B', content: 'Verse prose', isCorrect: false },
      { id: 'C', content: 'Nom script prose', isCorrect: true },
      { id: 'D', content: 'Poetry', isCorrect: false },
    ],
    correctAnswer: 'C', score: 1, difficulty: 'hard', topicId: 'topic032', topicName: 'Patriotic Literature',
    source: 'ai', explanation: 'Eulogy for Can Gio Martyrs was written in Nom script prose.',
    usageCount: 8, correctRate: 0.58, isActive: true, isApproved: true,
    createdAt: daysAgo(35), updatedAt: daysAgo(8), createdBy: { _id: 't002', name: 'Minh Van Tran', schoolId: 'school001' },
  },
  // English - 4 questions
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
    createdAt: daysAgo(300), updatedAt: daysAgo(150), createdBy: { _id: 't001', name: 'Mai Huong Nguyen', schoolId: 'school001' },
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
    source: 'manual', explanation: '"Beautiful" is an adjective describing a noun.',
    usageCount: 60, correctRate: 0.94, isActive: true, isApproved: true,
    createdAt: daysAgo(350), updatedAt: daysAgo(180), createdBy: { _id: 't001', name: 'Mai Huong Nguyen', schoolId: 'school001' },
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
    source: 'ai', explanation: 'Type 2 conditional: If + subject + were + ..., would + V.',
    usageCount: 20, correctRate: 0.70, isActive: true, isApproved: true,
    createdAt: daysAgo(65), updatedAt: daysAgo(25), createdBy: { _id: 't001', name: 'Mai Huong Nguyen', schoolId: 'school001' },
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
    source: 'ai', explanation: '"Since + year/point in time" → Present Perfect.',
    usageCount: 28, correctRate: 0.73, isActive: true, isApproved: true,
    createdAt: daysAgo(55), updatedAt: daysAgo(20), createdBy: { _id: 't001', name: 'Mai Huong Nguyen', schoolId: 'school001' },
  },
  // True/False questions
  {
    _id: 'q026', id: 'Q026', content: 'The derivative of y = sin(x) is y\' = cos(x).',
    type: 'single_choice', options: [
      { id: 'A', content: 'True', isCorrect: true },
      { id: 'B', content: 'False', isCorrect: false },
    ],
    correctAnswer: 'A', score: 1, difficulty: 'easy', topicId: 'topic001', topicName: 'Derivatives',
    source: 'manual', explanation: 'The derivative of sin(x) is cos(x).',
    usageCount: 30, correctRate: 0.85, isActive: true, isApproved: true,
    createdAt: daysAgo(100), updatedAt: daysAgo(50), createdBy: { _id: 't001', name: 'Mai Huong Nguyen', schoolId: 'school001' },
  },
  // Multiple choice multi-answer question
  {
    _id: 'q027', id: 'Q027', content: 'Which of the following are alkali metals? (Select all correct answers)',
    type: 'multiple_choice', options: [
      { id: 'A', content: 'Sodium (Na)', isCorrect: true },
      { id: 'B', content: 'Potassium (K)', isCorrect: true },
      { id: 'C', content: 'Calcium (Ca)', isCorrect: false },
      { id: 'D', content: 'Magnesium (Mg)', isCorrect: false },
    ],
    correctAnswers: ['A', 'B'], score: 2, difficulty: 'medium', topicId: 'topic025', topicName: 'Periodic Table',
    source: 'manual', explanation: 'Alkali metals include: Li, Na, K, Rb, Cs, Fr.',
    usageCount: 15, correctRate: 0.68, isActive: true, isApproved: true,
    createdAt: daysAgo(40), updatedAt: daysAgo(12), createdBy: { _id: 't001', name: 'Mai Huong Nguyen', schoolId: 'school001' },
  },
  // Fill in the blank (multiple choice for UI)
  {
    _id: 'q028', id: 'Q028', content: 'Avogadro\'s number is approximately ___ × 10²³ mol⁻¹',
    type: 'single_choice', options: [
      { id: 'A', content: '6.0', isCorrect: true },
      { id: 'B', content: '3.0', isCorrect: false },
      { id: 'C', content: '9.0', isCorrect: false },
      { id: 'D', content: '1.0', isCorrect: false },
    ],
    correctAnswer: 'A', score: 1, difficulty: 'easy', topicId: 'topic022', topicName: 'Atoms',
    source: 'manual', explanation: 'Avogadro\'s number NA ≈ 6.022 × 10²³ mol⁻¹.',
    usageCount: 20, correctRate: 0.88, isActive: true, isApproved: true,
    createdAt: daysAgo(90), updatedAt: daysAgo(45), createdBy: { _id: 't001', name: 'Mai Huong Nguyen', schoolId: 'school001' },
  },
  {
    _id: 'q029', id: 'Q029', content: 'In 1945, great cultural figure Ho Chi Minh wrote the poem "Khong Diet" (Immortal).',
    type: 'single_choice', options: [
      { id: 'A', content: 'True', isCorrect: false },
      { id: 'B', content: 'False', isCorrect: true },
    ],
    correctAnswer: 'B', score: 1, difficulty: 'hard', topicId: 'topic030', topicName: 'Modern Literature',
    source: 'ai', explanation: 'Ho Chi Minh did not write the poem "Khong Diet". The famous poem by Nguyen Ai Quoc was "Doi Song" (Life).',
    usageCount: 5, correctRate: 0.45, isActive: true, isApproved: true,
    createdAt: daysAgo(25), updatedAt: daysAgo(5), createdBy: { _id: 't002', name: 'Minh Van Tran', schoolId: 'school001' },
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
    source: 'manual', explanation: '"Hanoi" is a proper noun.',
    usageCount: 40, correctRate: 0.90, isActive: true, isApproved: true,
    createdAt: daysAgo(200), updatedAt: daysAgo(100), createdBy: { _id: 't001', name: 'Mai Huong Nguyen', schoolId: 'school001' },
  },
];

// ─── 6. EXAMS ───────────────────────────────────────────────────────────────

export const mockExams: Exam[] = [
  {
    _id: 'exam001',
    title: 'Midterm Exam - Math 10A1',
    description: 'Midterm exam for Math class 10A1, covering functions and equations.',
    status: 'completed',
    classIds: [{ _id: 'cls001', name: '10A1', code: '10A1' }],
    primaryClassId: { _id: 'cls001', name: '10A1', code: '10A1' },
    subjectId: { _id: 'subj001', name: 'Mathematics', color: '#3B82F6' },
    subjectName: 'Mathematics',
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
    createdBy: { _id: 't001', name: 'Mai Huong Nguyen' },
    createdAt: daysAgo(45),
    updatedAt: daysAgo(28),
    publishedAt: daysAgo(40),
    completedAt: daysAgo(29),
  },
  {
    _id: 'exam002',
    title: '15-Minute Quiz - Physics Round 1',
    description: 'Short 15-minute quiz on uniform linear motion.',
    status: 'completed',
    classIds: [{ _id: 'cls001', name: '10A1', code: '10A1' }],
    primaryClassId: { _id: 'cls001', name: '10A1', code: '10A1' },
    subjectId: { _id: 'subj002', name: 'Physics', color: '#10B981' },
    subjectName: 'Physics',
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
    createdBy: { _id: 't002', name: 'Minh Van Tran' },
    createdAt: daysAgo(25),
    updatedAt: daysAgo(19),
    publishedAt: daysAgo(22),
    completedAt: daysAgo(19),
  },
  {
    _id: 'exam003',
    title: 'Chemistry Quiz - Chapter 3',
    description: 'Quiz on Chapter 3: Chemical Bonding.',
    status: 'published',
    classIds: [
      { _id: 'cls001', name: '10A1', code: '10A1' },
      { _id: 'cls002', name: '10A2', code: '10A2' },
    ],
    primaryClassId: { _id: 'cls001', name: '10A1', code: '10A1' },
    subjectId: { _id: 'subj003', name: 'Chemistry', color: '#8B5CF6' },
    subjectName: 'Chemistry',
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
    createdBy: { _id: 't001', name: 'Mai Huong Nguyen' },
    createdAt: daysAgo(10),
    updatedAt: daysAgo(5),
    publishedAt: daysAgo(5),
  },
  {
    _id: 'exam004',
    title: 'Semester 1 Final Exam - Literature 12',
    description: 'Semester 1 Literature exam for grade 12, including reading comprehension and essay writing.',
    status: 'in_progress',
    classIds: [{ _id: 'cls005', name: '12A1', code: '12A1' }],
    primaryClassId: { _id: 'cls005', name: '12A1', code: '12A1' },
    subjectId: { _id: 'subj004', name: 'Literature', color: '#EF4444' },
    subjectName: 'Literature',
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
    createdBy: { _id: 't002', name: 'Minh Van Tran' },
    createdAt: daysAgo(60),
    updatedAt: daysAgo(1),
    publishedAt: daysAgo(55),
  },
  {
    _id: 'exam005',
    title: 'English Quiz - Unit 4',
    description: 'Quiz for Unit 4: The Environment.',
    status: 'draft',
    classIds: [{ _id: 'cls001', name: '10A1', code: '10A1' }],
    primaryClassId: { _id: 'cls001', name: '10A1', code: '10A1' },
    subjectId: { _id: 'subj005', name: 'English', color: '#F59E0B' },
    subjectName: 'English',
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
    createdBy: { _id: 't001', name: 'Mai Huong Nguyen' },
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },
  {
    _id: 'exam006',
    title: 'Period Test - Physics Grade 11',
    description: '45-minute test on direct current.',
    status: 'published',
    classIds: [{ _id: 'cls003', name: '11A1', code: '11A1' }],
    primaryClassId: { _id: 'cls003', name: '11A1', code: '11A1' },
    subjectId: { _id: 'subj002', name: 'Physics', color: '#10B981' },
    subjectName: 'Physics',
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
    createdBy: { _id: 't002', name: 'Minh Van Tran' },
    createdAt: daysAgo(8),
    updatedAt: daysAgo(3),
    publishedAt: daysAgo(3),
  },
  {
    _id: 'exam007',
    title: 'Geometry Test - Math 10',
    description: 'Geometry test covering vectors and dot products.',
    status: 'archived',
    classIds: [{ _id: 'cls001', name: '10A1', code: '10A1' }],
    primaryClassId: { _id: 'cls001', name: '10A1', code: '10A1' },
    subjectId: { _id: 'subj001', name: 'Mathematics', color: '#3B82F6' },
    subjectName: 'Mathematics',
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
    createdBy: { _id: 't001', name: 'Mai Huong Nguyen' },
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
    studentId: { _id: 's001', name: 'Thanh Ha Pham', email: 'hapt_s1@student.nbk-high.edu' },
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
    studentId: { _id: 's002', name: 'Minh Tuan Dang', email: 'tuan.dm@student.nbk-high.edu' },
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
    studentId: { _id: 's003', name: 'Thu Phuong Le', email: 'phuong.lt@student.nbk-high.edu' },
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
    studentId: { _id: 's004', name: 'Duc Anh Ngo', email: 'anh.nd@student.nbk-high.edu' },
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
    studentId: { _id: 's005', name: 'Thi Lan Bui', email: 'lan.bt@student.nbk-high.edu' },
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
    studentId: { _id: 's001', name: 'Thanh Ha Pham', email: 'hapt_s1@student.nbk-high.edu' },
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
    studentId: { _id: 's002', name: 'Minh Tuan Dang', email: 'tuan.dm@student.nbk-high.edu' },
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
    studentId: { _id: 's003', name: 'Thu Phuong Le', email: 'phuong.lt@student.nbk-high.edu' },
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
    studentId: { _id: 's001', name: 'Thanh Ha Pham', email: 'hapt_s1@student.nbk-high.edu' },
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
    studentId: { _id: 's002', name: 'Minh Tuan Dang', email: 'tuan.dm@student.nbk-high.edu' },
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
    studentId: { _id: 's003', name: 'Thu Phuong Le', email: 'phuong.lt@student.nbk-high.edu' },
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
    studentId: { _id: 's001', name: 'Thanh Ha Pham', email: 'hapt_s1@student.nbk-high.edu' },
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
    studentId: { _id: 's002', name: 'Minh Tuan Dang', email: 'tuan.dm@student.nbk-high.edu' },
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
    studentId: { _id: 's003', name: 'Thu Phuong Le', email: 'phuong.lt@student.nbk-high.edu' },
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
    studentId: { _id: 's004', name: 'Duc Anh Ngo', email: 'anh.nd@student.nbk-high.edu' },
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
    studentId: { _id: 's005', name: 'Thi Lan Bui', email: 'lan.bt@student.nbk-high.edu' },
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
    studentId: { _id: 's001', name: 'Thanh Ha Pham', email: 'hapt_s1@student.nbk-high.edu' },
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
    studentId: { _id: 's002', name: 'Minh Tuan Dang', email: 'tuan.dm@student.nbk-high.edu' },
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
    studentId: { _id: 's001', name: 'Thanh Ha Pham', email: 'hapt_s1@student.nbk-high.edu' },
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
    studentId: { _id: 's005', name: 'Thi Lan Bui', email: 'lan.bt@student.nbk-high.edu' },
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
    studentId: { _id: 's005', name: 'Thi Lan Bui', email: 'lan.bt@student.nbk-high.edu' },
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
    studentId: { _id: 's004', name: 'Duc Anh Ngo', email: 'anh.nd@student.nbk-high.edu' },
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
    studentName: 'Thi Lan Bui',
    className: '10A1',
    questionId: 'q003',
    reason: 'I answered C (1/2) but the system marked it as wrong. The correct answer should be 1/3.',
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
    studentName: 'Thanh Ha Pham',
    className: '10A1',
    questionId: 'q003',
    reason: 'The system could not recognize my handwritten answer for this question.',
    currentAnswer: 'B',
    expectedAnswer: 'B',
    status: 'approved',
    resolvedBy: 't001',
    resolvedAt: daysAgo(25),
    resolutionNote: 'Regraded, 0.5 points added to the score.',
    createdAt: daysAgo(26),
  },
  {
    _id: 'appeal003',
    submissionId: 'sub016',
    examId: 'exam007',
    studentId: 's005',
    studentName: 'Thi Lan Bui',
    className: '10A1',
    questionId: 'q001',
    reason: 'I believe answer B is correct, please review.',
    currentAnswer: 'B',
    expectedAnswer: 'A',
    status: 'rejected',
    resolvedBy: 't001',
    resolvedAt: monthsAgo(2, 1),
    resolutionNote: 'Answer A is the correct answer. No basis for appeal.',
    createdAt: monthsAgo(2, 2),
  },
  {
    _id: 'appeal004',
    submissionId: 'sub007',
    examId: 'exam002',
    studentId: 's002',
    studentName: 'Minh Tuan Dang',
    className: '10A1',
    questionId: 'q007',
    reason: 'I selected answer A for the kinetic energy formula but the system recorded it incorrectly.',
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
    studentName: 'Duc Anh Ngo',
    className: '10A1',
    questionId: 'q002',
    reason: 'I selected answer B (x = 2 or x = 3) but the system graded it incorrectly.',
    currentAnswer: 'B',
    expectedAnswer: 'B',
    status: 'approved',
    resolvedBy: 't001',
    resolvedAt: monthsAgo(2, 1),
    resolutionNote: 'Score confirmed correct. Score adjusted from 5.5 to 7.0.',
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
    examTitle: 'Midterm Exam - Math 10A1',
    totalStudents: 45,
    totalSubmissions: 45,
    submissionRate: 100,
    averageScore: 7.2,
    highestScore: 9.5,
    lowestScore: 4.0,
    passRate: 89,
    gradeDistribution: [
      { grade: 'Excellent (8.5-10)', count: 10, percentage: 22 },
      { grade: 'Good (7.0-8.4)', count: 18, percentage: 40 },
      { grade: 'Average (5.0-6.9)', count: 12, percentage: 27 },
      { grade: 'Below Average (3.5-4.9)', count: 4, percentage: 9 },
      { grade: 'Fail (<3.5)', count: 1, percentage: 2 },
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
    examTitle: '15-Minute Quiz - Physics Round 1',
    totalStudents: 45,
    totalSubmissions: 45,
    submissionRate: 100,
    averageScore: 7.8,
    highestScore: 10.0,
    lowestScore: 5.0,
    passRate: 96,
    gradeDistribution: [
      { grade: 'Excellent (8.5-10)', count: 22, percentage: 49 },
      { grade: 'Good (7.0-8.4)', count: 14, percentage: 31 },
      { grade: 'Average (5.0-6.9)', count: 7, percentage: 16 },
      { grade: 'Below Average (3.5-4.9)', count: 2, percentage: 4 },
      { grade: 'Fail (<3.5)', count: 0, percentage: 0 },
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
    examTitle: 'Geometry Test - Math 10',
    totalStudents: 45,
    totalSubmissions: 45,
    submissionRate: 100,
    averageScore: 6.3,
    highestScore: 8.5,
    lowestScore: 3.5,
    passRate: 78,
    gradeDistribution: [
      { grade: 'Excellent (8.5-10)', count: 5, percentage: 11 },
      { grade: 'Good (7.0-8.4)', count: 15, percentage: 33 },
      { grade: 'Average (5.0-6.9)', count: 15, percentage: 33 },
      { grade: 'Below Average (3.5-4.9)', count: 8, percentage: 18 },
      { grade: 'Fail (<3.5)', count: 2, percentage: 5 },
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
    examTitle: 'Semester 1 Final Exam - Literature 12',
    totalStudents: 40,
    totalSubmissions: 35,
    submissionRate: 87.5,
    averageScore: 6.8,
    highestScore: 9.0,
    lowestScore: 3.0,
    passRate: 74,
    gradeDistribution: [
      { grade: 'Excellent (8.5-10)', count: 6, percentage: 17 },
      { grade: 'Good (7.0-8.4)', count: 11, percentage: 31 },
      { grade: 'Average (5.0-6.9)', count: 9, percentage: 26 },
      { grade: 'Below Average (3.5-4.9)', count: 6, percentage: 17 },
      { grade: 'Fail (<3.5)', count: 3, percentage: 9 },
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
    examTitle: 'Period Test - Physics Grade 11',
    totalStudents: 38,
    totalSubmissions: 0,
    submissionRate: 0,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    passRate: 0,
    gradeDistribution: [
      { grade: 'Excellent (8.5-10)', count: 0, percentage: 0 },
      { grade: 'Good (7.0-8.4)', count: 0, percentage: 0 },
      { grade: 'Average (5.0-6.9)', count: 0, percentage: 0 },
      { grade: 'Below Average (3.5-4.9)', count: 0, percentage: 0 },
      { grade: 'Fail (<3.5)', count: 0, percentage: 0 },
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
    studentName: 'Thanh Ha Pham',
    classId: 'cls001',
    className: '10A1',
    dataPoints: [
      { date: monthsAgo(3), score: 6.5, examTitle: 'Chapter 1 Test - Math' },
      { date: monthsAgo(2, 20), score: 7.0, examTitle: 'Chapter 2 Test - Math' },
      { date: monthsAgo(2), score: 7.5, examTitle: 'Geometry Test' },
      { date: monthsAgo(1, 10), score: 8.0, examTitle: 'Algebra Test' },
      { date: monthsAgo(1), score: 8.5, examTitle: 'Midterm Exam' },
    ],
  },
  {
    studentId: 's002',
    studentName: 'Minh Tuan Dang',
    classId: 'cls001',
    className: '10A1',
    dataPoints: [
      { date: monthsAgo(3), score: 5.5, examTitle: 'Chapter 1 Test - Math' },
      { date: monthsAgo(2, 20), score: 6.0, examTitle: 'Chapter 2 Test - Math' },
      { date: monthsAgo(2), score: 6.0, examTitle: 'Geometry Test' },
      { date: monthsAgo(1, 10), score: 6.5, examTitle: 'Algebra Test' },
      { date: monthsAgo(1), score: 7.0, examTitle: 'Midterm Exam' },
    ],
  },
  {
    studentId: 's003',
    studentName: 'Thu Phuong Le',
    classId: 'cls001',
    className: '10A1',
    dataPoints: [
      { date: monthsAgo(3), score: 8.0, examTitle: 'Chapter 1 Test - Math' },
      { date: monthsAgo(2, 20), score: 8.5, examTitle: 'Chapter 2 Test - Math' },
      { date: monthsAgo(2), score: 8.0, examTitle: 'Geometry Test' },
      { date: monthsAgo(1, 10), score: 9.0, examTitle: 'Algebra Test' },
      { date: monthsAgo(1), score: 9.0, examTitle: 'Midterm Exam' },
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
    title: 'New exam created',
    message: 'English Quiz - Unit 4 has been created and is ready for publishing.',
    link: '/exams/exam005',
    isRead: false,
    createdAt: daysAgo(1),
  },
  {
    _id: 'notif002',
    type: 'success',
    title: 'Exam grading completed',
    message: 'Grading results for "Midterm Exam - Math 10A1" are ready.',
    link: '/exams/exam001/results',
    isRead: true,
    createdAt: daysAgo(27),
  },
  {
    _id: 'notif003',
    type: 'warning',
    title: 'Pending appeal requests',
    message: 'You have 2 appeal requests waiting for processing.',
    link: '/appeals',
    isRead: false,
    createdAt: daysAgo(18),
  },
  {
    _id: 'notif004',
    type: 'info',
    title: 'Exam in progress',
    message: 'Exam "Semester 1 Final Exam - Literature 12" is currently being taken.',
    link: '/exams/exam004',
    isRead: false,
    createdAt: daysAgo(1),
  },
  {
    _id: 'notif005',
    type: 'success',
    title: 'Students submitted successfully',
    message: '35/40 students in class 12A1 have submitted the Literature Semester 1 exam.',
    link: '/exams/exam004/submissions',
    isRead: true,
    createdAt: daysAgo(1),
  },
  {
    _id: 'notif006',
    type: 'info',
    title: 'New class added',
    message: 'Class 11A2 has been added to the system with 38 students.',
    link: '/classes/cls004',
    isRead: true,
    createdAt: daysAgo(60),
  },
  {
    _id: 'notif007',
    type: 'warning',
    title: 'Exam coming soon',
    message: 'Chemistry Quiz - Chapter 3 will take place in 5 days.',
    link: '/exams/exam003',
    isRead: false,
    createdAt: daysAgo(0),
  },
  {
    _id: 'notif008',
    type: 'success',
    title: 'Analytics report ready',
    message: 'May learning outcome analytics report has been generated.',
    link: '/analytics',
    isRead: true,
    createdAt: daysAgo(5),
  },
  {
    _id: 'notif009',
    type: 'error',
    title: 'OMR scan error',
    message: '5 answer sheets from Math Semester 1 exam could not be scanned automatically.',
    link: '/scans',
    isRead: true,
    createdAt: daysAgo(28),
  },
  {
    _id: 'notif010',
    type: 'info',
    title: 'New user added',
    message: 'Account "Duc Anh Ngo" has been activated.',
    link: '/users/s004',
    isRead: true,
    createdAt: daysAgo(90),
  },
];

// ─── 13. OMR TEMPLATES ─────────────────────────────────────────────────────

export const mockOMRTemplates: OMRTemplate[] = [
  {
    _id: 'omr001',
    name: '40-Question Answer Sheet',
    code: 'OMR-40Q',
    description: '40-question multiple choice answer sheet, suitable for 40-50 minute exams.',
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
    name: '50-Question Answer Sheet',
    code: 'OMR-50Q',
    description: '50-question multiple choice answer sheet, suitable for 60-90 minute exams.',
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
    name: '30-Question Answer Sheet',
    code: 'OMR-30Q',
    description: '30-question multiple choice answer sheet, suitable for 15-30 minute exams.',
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
    { subjectId: 'subj001', subjectName: 'Mathematics', color: '#3B82F6', averageScore: 7.2, examCount: 3, studentCount: 120, trend: 'up' },
    { subjectId: 'subj002', subjectName: 'Physics', color: '#10B981', averageScore: 7.8, examCount: 2, studentCount: 100, trend: 'stable' },
    { subjectId: 'subj003', subjectName: 'Chemistry', color: '#8B5CF6', averageScore: 6.9, examCount: 1, studentCount: 80, trend: 'down' },
    { subjectId: 'subj004', subjectName: 'Literature', color: '#EF4444', averageScore: 6.8, examCount: 1, studentCount: 40, trend: 'up' },
    { subjectId: 'subj005', subjectName: 'English', color: '#F59E0B', averageScore: 7.5, examCount: 1, studentCount: 45, trend: 'stable' },
  ],
  gradeDistribution: [
    { grade: 'Excellent (8.5-10)', count: 45, percentage: 18, color: '#10B981' },
    { grade: 'Good (7.0-8.4)', count: 85, percentage: 35, color: '#3B82F6' },
    { grade: 'Average (5.0-6.9)', count: 75, percentage: 31, color: '#F59E0B' },
    { grade: 'Below Average (3.5-4.9)', count: 30, percentage: 12, color: '#EF4444' },
    { grade: 'Fail (<3.5)', count: 10, percentage: 4, color: '#6B7280' },
  ],
  studentRankings: [
    { rank: 1, studentId: 's003', studentName: 'Thu Phuong Le', className: '10A1', averageScore: 9.0, totalExams: 4, improvement: 1.5 },
    { rank: 2, studentId: 's001', studentName: 'Thanh Ha Pham', className: '10A1', averageScore: 8.2, totalExams: 4, improvement: 2.0 },
    { rank: 3, studentId: 's002', studentName: 'Minh Tuan Dang', className: '10A1', averageScore: 7.4, totalExams: 4, improvement: 1.5 },
    { rank: 4, studentId: 's004', studentName: 'Duc Anh Ngo', className: '10A1', averageScore: 6.8, totalExams: 4, improvement: -0.5 },
    { rank: 5, studentId: 's005', studentName: 'Thi Lan Bui', className: '10A1', averageScore: 5.8, totalExams: 4, improvement: 1.2 },
  ],
  recentActivity: [
    { date: daysAgo(0), event: 'Exam submission', count: 3 },
    { date: daysAgo(1), event: 'Exam submission', count: 35 },
    { date: daysAgo(1), event: 'Exam created', count: 1 },
    { date: daysAgo(2), event: 'Appeal', count: 2 },
    { date: daysAgo(3), event: 'Exam published', count: 2 },
    { date: daysAgo(5), event: 'Exam created', count: 1 },
    { date: daysAgo(7), event: 'Exam submission', count: 45 },
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
    examTitle: 'Midterm Exam - Math 10A1',
    type: 'summary',
    content: 'Overview: 45 students participated, average score 7.2/10. Pass rate 89%. Strength: most students have solid understanding of quadratic equations (question 2, 85% correct rate). Weakness: integration (question 3) and extremum (question 5) had lower correct rates (62% and 55%). Recommendation: increase practice on integration and applications of derivatives in function analysis.',
    generatedAt: daysAgo(27),
  },
  {
    _id: 'airep002',
    examId: 'exam001',
    examTitle: 'Midterm Exam - Math 10A1',
    type: 'insight',
    content: 'Deep analysis: The extremum question (q005) was the most challenging with only 55% correct. Students often confuse maximum and minimum points. Notably, 12% of students chose a completely wrong answer (option A). Suggestion: use variation tables and derivative sign tests to determine extremum points.',
    generatedAt: daysAgo(27),
  },
  {
    _id: 'airep003',
    examId: 'exam002',
    examTitle: '15-Minute Quiz - Physics Round 1',
    type: 'performance',
    content: 'Excellent performance: 49% of students achieved Excellent (8.5-10). The easiest question was about Avogadro number (q011) with 95% correct. The most difficult was about spring oscillation (q009) with 60% correct. Proposal: increase the difficulty of the next quiz for better differentiation.',
    generatedAt: daysAgo(18),
  },
  {
    _id: 'airep004',
    examId: 'exam007',
    examTitle: 'Geometry Test - Math 10',
    type: 'recommendation',
    content: 'Improvement recommendations: Need to focus on reviewing vectors and dot products. 18% of students scored below average. Proposals: (1) Organize remedial sessions on vector geometry, (2) Add advanced application exercises on dot products, (3) Use visual aids in teaching.',
    generatedAt: monthsAgo(2, 2),
  },
  {
    _id: 'airep005',
    examId: 'exam004',
    examTitle: 'Semester 1 Final Exam - Literature 12',
    type: 'summary',
    content: 'Overview: 35/40 students submitted. Average score 6.8/10. Reading comprehension section had higher scores than writing. Recommendations: increase practice on argumentative essays and improve skills in analyzing literary works.',
    generatedAt: daysAgo(0),
  },
];

export const mockAIChatMessages: AIChatMessage[] = [
  {
    _id: 'chat001',
    role: 'assistant',
    content: 'Hello! I am the Smart Grading AI assistant. I can help you analyze learning outcomes, generate automatic reports, or answer questions about the system. How can I help you today?',
    timestamp: daysAgo(1),
  },
  {
    _id: 'chat002',
    role: 'user',
    content: 'Analyze Math Semester 1 exam results for class 10A1',
    timestamp: daysAgo(1),
  },
  {
    _id: 'chat003',
    role: 'assistant',
    content: 'Based on the Math Semester 1 exam data for class 10A1, I notice: Average score 7.2/10, higher than the school average (6.9). 62% of students achieved Good or above. Weakest areas are in Integration and Extremum. Would you like me to propose personalized study plans for individual students?',
    timestamp: daysAgo(1),
  },
  {
    _id: 'chat004',
    role: 'user',
    content: 'Yes, create plans for the 3 lowest scoring students',
    timestamp: daysAgo(1),
  },
  {
    _id: 'chat005',
    role: 'assistant',
    content: 'Created personalized study plans for the 3 lowest scoring students:\n\n1. **Duc Anh Ngo** (5.5 points): Needs improvement in Integration and Extremum. Suggestions: 15 basic Integration exercises, 10 Extremum exercises.\n\n2. **Thi Lan Bui** (4.0 points): Weak foundation in Derivatives. Suggestions: Review Derivatives chapter from the beginning, complete 20 basic multiple-choice exercises.\n\n3. **Thu Phuong Le** (did not submit Semester 1): Need to contact to verify status.\n\nWould you like me to send these plans via email to the students?',
    timestamp: daysAgo(1),
  },
  {
    _id: 'chat006',
    role: 'user',
    content: 'Compare subject performance this month',
    timestamp: daysAgo(0),
  },
  {
    _id: 'chat007',
    role: 'assistant',
    content: 'Subject performance comparison this month:\n\n| Subject | Avg Score | # Exams | Trend |\n|-------|-----------|---------|-------|\n| Physics | 7.8 ⭐ | 2 | Stable |\n| English | 7.5 | 1 | Stable |\n| Mathematics | 7.2 | 3 | ↗ Up |\n| Literature | 6.8 | 1 | ↗ Up |\n| Chemistry | 6.9 | 1 | ↘ Down |\n\n**Assessment**: Physics has the best performance. Chemistry needs attention with the lowest average score. Would you like me to analyze the reasons for Chemistry\'s lower scores in detail?',
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
