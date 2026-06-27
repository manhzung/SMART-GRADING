import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../core/api', () => ({
  apiService: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe('studentStore.createAppeal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should POST /appeals with correct payload', async () => {
    const { apiService: mockApi } = await import('../../core/api');
    const mockAppeal = {
      _id: 'appeal1',
      submissionId: 'sub1',
      examId: { _id: 'exam1', title: 'Math Exam' },
      examTitle: 'Math Exam',
      questionPosition: 1,
      questionContent: 'What is 2+2?',
      reason: 'My answer is correct',
      status: 'pending',
      createdAt: '2026-06-28T00:00:00Z',
    };
    (mockApi.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockAppeal);

    const { useStudentStore } = await import('../../presentation/store/studentStore');
    const payload = {
      submissionId: 'sub1',
      examId: 'exam1',
      questionId: 'q1',
      questionPosition: 1,
      reason: 'My answer is correct',
    };

    await useStudentStore.getState().createAppeal(payload);

    expect(mockApi.post).toHaveBeenCalledWith('/appeals', payload);
  });

  it('should set isCreatingAppeal = false after success', async () => {
    const { apiService: mockApi } = await import('../../core/api');
    const mockAppeal = {
      _id: 'appeal1',
      submissionId: 'sub1',
      examId: { _id: 'exam1', title: 'Math Exam' },
      examTitle: 'Math Exam',
      questionPosition: 1,
      questionContent: 'What is 2+2?',
      reason: 'My answer is correct',
      status: 'pending',
      createdAt: '2026-06-28T00:00:00Z',
    };
    (mockApi.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockAppeal);

    const { useStudentStore } = await import('../../presentation/store/studentStore');
    const payload = {
      submissionId: 'sub1',
      examId: 'exam1',
      questionId: 'q1',
      questionPosition: 1,
      reason: 'My answer is correct',
    };

    await useStudentStore.getState().createAppeal(payload);

    const state = useStudentStore.getState();
    expect(state.isCreatingAppeal).toBe(false);
  });

  it('should set isCreatingAppeal = false and re-throw on error', async () => {
    const { apiService: mockApi } = await import('../../core/api');
    (mockApi.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Server error'));

    const { useStudentStore } = await import('../../presentation/store/studentStore');
    const payload = {
      submissionId: 'sub1',
      examId: 'exam1',
      questionId: 'q1',
      questionPosition: 1,
      reason: 'My answer is correct',
    };

    await expect(useStudentStore.getState().createAppeal(payload)).rejects.toThrow('Server error');
    expect(useStudentStore.getState().isCreatingAppeal).toBe(false);
  });
});
