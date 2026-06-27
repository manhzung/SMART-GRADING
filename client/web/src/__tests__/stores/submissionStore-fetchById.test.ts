import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../core/api', () => ({
  apiService: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe('submissionStore.fetchById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('sets currentSubmission on success', async () => {
    const { apiService: mockApi } = await import('../../core/api');
    const mockSubmission = {
      _id: 'sub1',
      examId: 'exam1',
      studentId: { _id: 's1', name: 'Nguyen Van A' },
      answers: [],
      totalScore: 8,
      maxScore: 10,
      status: 'scanned',
    };
    (mockApi.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);

    const { useSubmissionStore } = await import('../../presentation/store/submissionStore');
    await useSubmissionStore.getState().fetchById('sub1');

    const state = useSubmissionStore.getState();
    expect(state.currentSubmission).toEqual(mockSubmission);
    expect(state.isLoadingDetail).toBe(false);
  });

  it('sets isLoadingDetail to true during fetch', async () => {
    const { apiService: mockApi } = await import('../../core/api');
    let resolvePromise: (value: unknown) => void;
    (mockApi.get as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise((resolve) => { resolvePromise = resolve; })
    );

    const { useSubmissionStore } = await import('../../presentation/store/submissionStore');
    const fetchPromise = useSubmissionStore.getState().fetchById('sub1');

    expect(useSubmissionStore.getState().isLoadingDetail).toBe(true);

    resolvePromise!({ _id: 'sub1' });
    await fetchPromise;

    expect(useSubmissionStore.getState().isLoadingDetail).toBe(false);
  });

  it('sets error message on failure', async () => {
    const { apiService: mockApi } = await import('../../core/api');
    (mockApi.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const { useSubmissionStore } = await import('../../presentation/store/submissionStore');
    await useSubmissionStore.getState().fetchById('sub1');

    const state = useSubmissionStore.getState();
    expect(state.error).toBe('Network error');
    expect(state.isLoadingDetail).toBe(false);
    expect(state.currentSubmission).toBeNull();
  });

  it('clears currentSubmission when clearCurrentSubmission called', async () => {
    const { apiService: mockApi } = await import('../../core/api');
    (mockApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: 'sub1' });

    const { useSubmissionStore } = await import('../../presentation/store/submissionStore');
    await useSubmissionStore.getState().fetchById('sub1');
    expect(useSubmissionStore.getState().currentSubmission).not.toBeNull();

    useSubmissionStore.getState().clearCurrentSubmission();
    expect(useSubmissionStore.getState().currentSubmission).toBeNull();
  });
});
