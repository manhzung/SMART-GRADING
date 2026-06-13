import type { Exam, ExamVersion } from '../presentation/store/examStore';
import type { Question } from '../presentation/store/questionStore';

export interface ExamListItem {
  _id: string;
  title: string;
  classNames: string[];
  date: string;
  duration: string;
  questionCount: number;
  status: 'draft' | 'in_progress' | 'completed' | 'published' | 'archived';
  variantsCount: number;
  submissionsText: string;
  submissionsCurrent: number;
  submissionsTotal: number;
}

export interface ExamFilterInput {
  selectedClass: string;
  selectedStatus: string;
  startDate: string;
  endDate: string;
}

export interface ExamDetailData {
  _id: string;
  title: string;
  code: string;
  status: 'draft' | 'published' | 'in_progress' | 'completed' | 'archived';
  createdDate: string;
  updatedDate: string;
  creator: string;
  description: string;
  submissionsCount: number;
  totalStudents: number;
  examDate: string;
  startTime: string;
  duration: number;
  totalQuestions: number;
  scoreScale: string;
  passingScore: number;
  monitoring: string;
  omrTemplateName: string;
  classes: Array<{ _id: string; name: string; description: string; studentCount: number; isPrimary: boolean }>;
  questions: Array<{ stt: string; content: string; correctAnswer: string; difficulty: 'easy' | 'medium' | 'hard'; score: number; type: string }>;
  versions: Array<{ code: string; status: string; updatedAt: string }>;
  history: Array<{ action: string; timestamp: string; user: string; type: 'edit' | 'class' | 'create' }>;
}

const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa đặt ngày');

export function mapExamListItem(exam: Partial<Exam>): ExamListItem {
  const classNames = (exam.classIds || [])
    .map((item) => (typeof item === 'string' ? item : item.name))
    .filter(Boolean);
  const questionCount = exam.numberOfQuestions || exam.questionIds?.length || 0;
  const submissionsCurrent = exam.totalSubmissions || 0;
  const submissionsTotal = exam.totalStudents || 0;

  return {
    _id: exam._id || '',
    title: exam.title || 'Chưa có tiêu đề',
    classNames: classNames.length ? classNames : ['Chưa gán'],
    date: formatDate(exam.examDate || exam.date),
    duration: `${exam.duration || 0} phút`,
    questionCount,
    status: (exam.status || 'draft') as ExamListItem['status'],
    variantsCount: exam.numberOfVersions || 0,
    submissionsText: `${submissionsCurrent} / ${submissionsTotal}`,
    submissionsCurrent,
    submissionsTotal,
  };
}

export function buildExamFilters(exams: ExamListItem[], filters: ExamFilterInput) {
  return exams.filter((exam) => {
    if (filters.selectedClass !== 'all' && !exam.classNames.some((name) => name.includes(filters.selectedClass))) {
      return false;
    }
    if (filters.selectedStatus !== 'all' && exam.status !== filters.selectedStatus) {
      return false;
    }
    if (filters.startDate || filters.endDate) {
      const parts = exam.date.split('/');
      if (parts.length === 3) {
        const current = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        if (filters.startDate && current < new Date(filters.startDate)) return false;
        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          if (current > end) return false;
        }
      }
    }
    return true;
  });
}

export function resolveAssignedQuestions(storeQuestions: Question[], assignedIds: string[]) {
  return storeQuestions.filter((question) => assignedIds.includes(question._id));
}

export function mapExamDetailData(exam: Exam | null, versions: ExamVersion[]): ExamDetailData | null {
  if (!exam) return null;

  const mappedQuestions = (exam.questionIds || [])
    .filter((question): question is NonNullable<Exam['questionIds']>[number] & Record<string, unknown> => typeof question === 'object' && question !== null)
    .map((question: any, index: number) => ({
      stt: String(index + 1),
      content: question.content || `Câu hỏi ${index + 1}`,
      correctAnswer: question.correctAnswer || question.options?.find((option: any) => option.isCorrect)?.id || 'A',
      difficulty: (question.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
      score: question.score || 1,
      type: question.type === 'multiple_choice' ? 'TRẮC NGHIỆM' : 'TRẮC NGHIỆM',
    }));

  const mappedClasses = (exam.classIds || []).map((item: any) => ({
    _id: item._id || item,
    name: item.name || 'Lớp học',
    description: item.code ? `Mã lớp: ${item.code}` : 'Chưa có mã lớp',
    studentCount: item.studentCount || 0,
    isPrimary: typeof exam.primaryClassId === 'object' ? exam.primaryClassId?._id === item._id : exam.primaryClassId === item._id,
  }));

  return {
    _id: exam._id,
    title: exam.title,
    code: exam._id,
    status: exam.status,
    createdDate: formatDate(exam.createdAt),
    updatedDate: formatDate(exam.updatedAt),
    creator: exam.createdBy?.name || '',
    description: exam.description || '',
    submissionsCount: exam.totalSubmissions || 0,
    totalStudents: exam.totalStudents || 0,
    examDate: formatDate(exam.examDate),
    startTime: exam.startTime || '',
    duration: exam.duration || 0,
    totalQuestions: exam.numberOfQuestions || mappedQuestions.length,
    scoreScale: String(exam.totalScore || 10),
    passingScore: exam.passingScore || 5,
    monitoring: 'Bật AI',
    omrTemplateName: exam.omrTemplateId?.name || '',
    classes: mappedClasses,
    questions: mappedQuestions,
    versions: versions.map((version) => ({
      code: version.versionCode,
      status: 'Sẵn sàng',
      updatedAt: formatDate(version.createdAt),
    })),
    history: [],
  };
}
