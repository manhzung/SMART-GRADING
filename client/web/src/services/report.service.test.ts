import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../core/api', () => ({
  apiService: { get: vi.fn(), post: vi.fn() },
}));

describe('reportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getExamReport calls GET /reports/exam/:examId', async () => {
    const { apiService: mockApi } = await import('../core/api');
    (mockApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'r1', examId: 'e1', totalStudents: 30, avgScore: 7.5,
      highestScore: 10, lowestScore: 4, passRate: 0.8,
      gradeDistribution: { A: 5, B: 10, C: 10, D: 5 }
    });

    const { reportService } = await import('../services/report.service');
    const result = await reportService.getExamReport('e1');
    expect(mockApi.get).toHaveBeenCalledWith('/reports/exam/e1');
    expect(result.avgScore).toBe(7.5);
  });

  it('generateExamReport calls POST /reports/exam/:examId/generate', async () => {
    const { apiService: mockApi } = await import('../core/api');
    (mockApi.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'r1', examId: 'e1', avgScore: 8,
    });

    const { reportService } = await import('../services/report.service');
    const result = await reportService.generateExamReport('e1');
    expect(mockApi.post).toHaveBeenCalledWith('/reports/exam/e1/generate');
    expect(result.avgScore).toBe(8);
  });

  it('getStudentProgress calls GET /reports/student/:studentId/progress', async () => {
    const { apiService: mockApi } = await import('../core/api');
    (mockApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'p1', studentId: 's1', scores: [8, 7, 9], avgScore: 8,
      trend: 'up', totalExams: 3
    });

    const { reportService } = await import('../services/report.service');
    const result = await reportService.getStudentProgress('s1');
    expect(mockApi.get).toHaveBeenCalledWith('/reports/student/s1/progress');
    expect(result.trend).toBe('up');
  });

  it('getClassLeaderboard calls GET /reports/class/:classId/leaderboard', async () => {
    const { apiService: mockApi } = await import('../core/api');
    (mockApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: [{ studentId: 's1', rank: 1, totalScore: 90, averageScore: 9, examCount: 5 }]
    });

    const { reportService } = await import('../services/report.service');
    const result = await reportService.getClassLeaderboard('c1');
    expect(mockApi.get).toHaveBeenCalledWith('/reports/class/c1/leaderboard');
    expect(result.results[0].rank).toBe(1);
  });
});
