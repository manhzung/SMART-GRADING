import { apiService } from '../core/api';

export interface ExamReport {
  _id: string;
  examId: string;
  totalStudents: number;
  avgScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  gradeDistribution: Record<string, number>;
}

export interface StudentProgress {
  _id: string;
  studentId: string;
  scores: number[];
  avgScore: number;
  trend: 'up' | 'down' | 'stable';
  totalExams: number;
}

export interface ClassLeaderboard {
  results: Array<{
    studentId: string;
    rank: number;
    totalScore: number;
    averageScore: number;
    examCount: number;
  }>;
}

export const reportService = {
  getExamReport: (examId: string) =>
    apiService.get<ExamReport>(`/reports/exam/${examId}`),

  generateExamReport: (examId: string) =>
    apiService.post<ExamReport>(`/reports/exam/${examId}/generate`),

  getStudentProgress: (studentId: string) =>
    apiService.get<StudentProgress>(`/reports/student/${studentId}/progress`),

  getStudentHistory: (studentId: string) =>
    apiService.get<any>(`/reports/student/${studentId}/history`),

  getClassLeaderboard: (classId: string) =>
    apiService.get<ClassLeaderboard>(`/reports/class/${classId}/leaderboard`),
};
