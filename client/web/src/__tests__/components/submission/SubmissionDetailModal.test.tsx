import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../core/api', () => ({
  apiService: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { apiService } from '../../../core/api';
import { SubmissionDetailModal } from '../../../components/submission/SubmissionDetailModal';

const mockSubmission = {
  _id: 'sub1',
  examId: { _id: 'exam1', title: 'Math Exam' },
  versionId: { _id: 'v1', versionCode: 'A' },
  studentId: { _id: 's1', name: 'John Doe', studentCode: 'ST001', email: 'a@school.com' },
  classId: { _id: 'c1', name: 'Grade 12A1' },
  answers: [
    { position: 1, selectedAnswer: 'A', correctAnswer: 'A', isCorrect: true, score: 1, maxScore: 1 },
    { position: 2, selectedAnswer: 'B', correctAnswer: 'C', isCorrect: false, score: 0, maxScore: 1 },
  ],
  totalScore: 7,
  maxScore: 10,
  finalScore: 7,
  status: 'scanned',
  images: {
    original: { url: 'https://example.com/original.jpg' },
  },
  createdAt: '2026-06-28T10:00:00Z',
};

describe('SubmissionDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Read flow', () => {
    it('renders nothing when open=false', () => {
      render(<SubmissionDetailModal open={false} submissionId="sub1" onClose={vi.fn()} />);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('renders dialog with title when open=true', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('fetches submission on mount when submissionId provided', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => {
        expect(apiService.get).toHaveBeenCalledWith('/submissions/sub1');
      });
    });

    it('displays student name and code', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('ST001')).toBeInTheDocument();
      });
    });

    it('displays score and maxScore', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByText(/7 \/ 10/)).toBeInTheDocument();
      });
    });

    it('displays version code', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => {
        const versionLabels = screen.getAllByText('Version:');
        expect(versionLabels.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays loading state while fetching', () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {})
      );
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('displays error message on fetch failure', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('404 Not Found'));
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByText(/404 Not Found/)).toBeInTheDocument();
      });
    });

    it('calls onClose when close button clicked', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      const onClose = vi.fn();
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={onClose} />);
      await waitFor(() => screen.getByRole('dialog'));
      const closeBtn = screen.getByLabelText(/close/i);
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay clicked', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      const onClose = vi.fn();
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={onClose} />);
      await waitFor(() => screen.getByRole('dialog'));
      const overlay = screen.getByTestId('modal-overlay');
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Update flow', () => {
    it('shows Edit button in view mode', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => screen.getByRole('dialog'));
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    it('switches to edit mode when Edit clicked', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => screen.getByRole('dialog'));
      fireEvent.click(screen.getByRole('button', { name: /edit/i }));
      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThan(0);
      });
    });

    it('shows Save button in edit mode', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => screen.getByRole('dialog'));
      fireEvent.click(screen.getByRole('button', { name: /edit/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });
    });

    it('calls PATCH when Save clicked', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      (apiService.patch as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, totalScore: 8 });
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => screen.getByRole('dialog'));
      fireEvent.click(screen.getByRole('button', { name: /edit/i }));
      await waitFor(() => screen.getAllByRole('combobox'));
      const select = screen.getAllByRole('combobox')[1];
      fireEvent.change(select, { target: { value: 'C' } });
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      await waitFor(() => {
        expect(apiService.patch).toHaveBeenCalled();
        const callArgs = (apiService.patch as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(callArgs[0]).toBe('/submissions/sub1/answers');
        expect(callArgs[1].answers['2']).toBe('C');
      });
    });

    it('does not call PATCH when nothing changed in edit mode', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => screen.getByRole('dialog'));
      fireEvent.click(screen.getByRole('button', { name: /edit/i }));
      await waitFor(() => screen.getByRole('button', { name: /save/i }));
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Delete flow', () => {
    it('shows Delete button in view mode', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => screen.getByRole('dialog'));
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('shows confirm dialog when Delete clicked', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => screen.getByRole('dialog'));
      fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /confirm delete/i })).toBeInTheDocument();
      });
    });

    it('calls DELETE when delete confirmed', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      (apiService.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      const onClose = vi.fn();
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={onClose} />);
      await waitFor(() => screen.getByRole('dialog'));
      fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
      await waitFor(() => screen.getByRole('heading', { name: /confirm delete/i }));
      const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
      fireEvent.click(confirmButton);
      await waitFor(() => {
        expect(apiService.delete).toHaveBeenCalledWith('/submissions/sub1');
      });
    });
  });

  describe('Accessibility', () => {
    it('has role=dialog and aria-modal=true', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={vi.fn()} />);
      await waitFor(() => screen.getByRole('dialog'));
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('closes when ESC key pressed', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmission);
      const onClose = vi.fn();
      render(<SubmissionDetailModal open={true} submissionId="sub1" onClose={onClose} />);
      await waitFor(() => screen.getByRole('dialog'));
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });
  });
});
