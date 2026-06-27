import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../core/api', () => ({
  apiService: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

// Raw API response shape (compatible with mapAppeal)
const mockApiResponse = {
  _id: 'appeal123',
  submissionId: 'sub1',
  examId: { _id: 'exam1', title: 'Math Exam' },
  questionPosition: 1,
  questionId: { content: 'What is 2+2?' },
  reason: 'My answer is correct',
  status: 'pending',
  createdAt: '2026-06-28T00:00:00Z',
};

// Transformed appeal shape (what mapAppeal produces)
const mockAppeal = {
  _id: 'appeal123',
  submissionId: 'sub1',
  examId: { _id: 'exam1', title: 'Math Exam' },
  examTitle: 'Math Exam',
  questionPosition: 1,
  questionContent: 'What is 2+2?',
  reason: 'My answer is correct',
  status: 'pending',
  teacherResponse: undefined,
  createdAt: '2026-06-28T00:00:00Z',
};

describe('studentStore.createAppeal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should POST /appeals with correct payload', async () => {
    const { apiService: mockApi } = await import('../../core/api');
    (mockApi.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockApiResponse);

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

  it('should prepend appeal to submissionAppeals and appeals arrays', async () => {
    const { apiService: mockApi } = await import('../../core/api');
    (mockApi.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockApiResponse);

    const { useStudentStore } = await import('../../presentation/store/studentStore');

    // Verify initial state
    expect(useStudentStore.getState().submissionAppeals).toHaveLength(0);
    expect(useStudentStore.getState().appeals).toHaveLength(0);

    const payload = {
      submissionId: 'sub1',
      examId: 'exam1',
      questionId: 'q1',
      questionPosition: 1,
      reason: 'My answer is correct',
    };

    await useStudentStore.getState().createAppeal(payload);

    // Verify arrays are updated with mapped appeal
    expect(useStudentStore.getState().submissionAppeals).toHaveLength(1);
    expect(useStudentStore.getState().submissionAppeals[0]).toMatchObject({
      _id: 'appeal123',
      examTitle: 'Math Exam',
      questionContent: 'What is 2+2?',
    });
    expect(useStudentStore.getState().appeals).toHaveLength(1);
    expect(useStudentStore.getState().appeals[0]).toMatchObject({
      _id: 'appeal123',
      examTitle: 'Math Exam',
      questionContent: 'What is 2+2?',
    });
  });

  it('should set isCreatingAppeal = false after success', async () => {
    const { apiService: mockApi } = await import('../../core/api');
    (mockApi.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockApiResponse);

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
