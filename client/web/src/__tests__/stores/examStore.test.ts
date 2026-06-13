import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../core/api', () => ({
  apiService: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe('examStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('fetchExams maps backend response to Exam array', async () => {
    const { apiService: mockApi } = await import('../../core/api');
    (mockApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: [
        { _id: 'e1', title: 'Test Exam', status: 'draft', createdAt: '2025-01-01' }
      ]
    });

    const { useExamStore } = await import('../../presentation/store/examStore');
    await useExamStore.getState().fetchExams();

    const state = useExamStore.getState();
    expect(state.exams).toHaveLength(1);
    expect(state.exams[0].title).toBe('Test Exam');
  });

  it('fetchExamById sets currentExam on success', async () => {
    const { apiService: mockApi } = await import('../../core/api');
    (mockApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'e1',
      title: 'Detail Exam',
      status: 'published',
    });

    const { useExamStore } = await import('../../presentation/store/examStore');
    await useExamStore.getState().fetchExamById('e1');

    const state = useExamStore.getState();
    expect(state.currentExam).toBeTruthy();
    expect(state.currentExam?.title).toBe('Detail Exam');
  });

  it('deleteExam removes exam from list', async () => {
    const { apiService: mockApi } = await import('../../core/api');
    // Seed with some exams
    const { useExamStore } = await import('../../presentation/store/examStore');
    useExamStore.setState({
      exams: [
        { _id: 'e1', title: 'Exam 1', status: 'draft' as const },
        { _id: 'e2', title: 'Exam 2', status: 'draft' as const },
      ]
    });
    (mockApi.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await useExamStore.getState().deleteExam('e1');

    const state = useExamStore.getState();
    expect(state.exams).toHaveLength(1);
    expect(state.exams[0]._id).toBe('e2');
  });
});
