import { apiService } from '../core/api';

export interface DashboardStats {
  totalClasses: number;
  totalExams: number;
  totalStudents: number;
  totalSubmissions: number;
  pendingAppeals: number;
  publishedExams: number;
  avgScore: number;
  passRate: number;
  recentSubmissions: Array<{
    id: string;
    student: { id: string; name: string } | null;
    exam: { id: string; title: string } | null;
    score: number;
    maxScore: number;
    status: string;
    createdAt: string;
  }>;
}

export interface Analytics {
  summary: {
    totalExams: number;
    totalSubmissions: number;
    avgScore: number;
    totalStudents: number;
  };
  subjectPerformance: Array<{
    subject?: string;
    subjectName?: string;
    avgScore?: number;
    averageScore?: number;
    examCount?: number;
    color?: string;
    trend?: 'up' | 'down' | 'stable';
  }>;
  gradeDistribution: Array<{
    grade: string;
    count: number;
    color?: string;
    percentage?: number;
  }>;
  studentRankings: Array<{
    _id?: string;
    name?: string;
    studentName?: string;
    email?: string;
    avgScore?: number;
    averageScore?: number;
    totalExams?: number;
    trend?: string;
    className?: string;
    studentId?: string;
  }>;
  recentTrends: Array<{
    date?: string;
    avgScore?: number;
    submissions?: number;
    count?: number;
  }>;
}

export const analyticsService = {
  getDashboardStats: () =>
    apiService.get<DashboardStats>('/analytics/dashboard-stats'),

  getAnalytics: (period?: 'week' | 'month' | 'semester') =>
    apiService.get<Analytics>('/analytics/analytics', {
      params: period ? { period } : undefined,
    }),
};
