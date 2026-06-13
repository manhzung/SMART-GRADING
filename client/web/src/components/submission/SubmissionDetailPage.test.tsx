import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SubmissionDetailPage } from './SubmissionDetailPage';

vi.mock('./ImageGallery', () => ({
  ImageGallery: () => <div data-testid="image-gallery" />,
}));

const mockFetch = vi.fn();
(globalThis as unknown as Record<string, unknown>).fetch = mockFetch;

describe('SubmissionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('accessToken', 'test-token');
  });

  it('shows loading then loads submission by id', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          _id: 's1',
          status: 'completed',
          totalScore: 8,
          maxScore: 10,
          examId: { title: 'Math Mid' },
          studentId: { name: 'A', studentCode: 'HS001' },
          images: { original: { url: 'https://x/o.jpg' } },
        }),
      text: () => Promise.resolve(JSON.stringify({ _id: 's1' })),
    });

    render(<SubmissionDetailPage submissionId="s1" />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Math Mid/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Score: 8 \/ 10/)).toBeInTheDocument();
    expect(screen.getByTestId('image-gallery')).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/submissions/s1'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('shows error message on non-2xx', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: 'not found' }),
      text: () => Promise.resolve(JSON.stringify({ message: 'not found' })),
    });

    render(<SubmissionDetailPage submissionId="missing" />);

    await waitFor(() => {
      expect(screen.getByText(/Error: HTTP 404/)).toBeInTheDocument();
    });
  });
});
