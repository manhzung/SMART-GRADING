import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from '../../../presentation/components/shared/ConfirmDialog';

describe('ConfirmDialog', () => {
  const baseProps = {
    open: true,
    title: 'Delete item?',
    message: 'This cannot be undone.',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    submitting: false,
  };

  it('renders nothing when closed', () => {
    render(<ConfirmDialog {...baseProps} open={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders title and message when open', () => {
    render(<ConfirmDialog {...baseProps} />);
    expect(screen.getByText('Delete item?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...baseProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: /xác nhận|confirm/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...baseProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /hủy|cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when submitting', () => {
    render(<ConfirmDialog {...baseProps} submitting />);
    expect(screen.getByRole('button', { name: /hủy|cancel/i })).toBeDisabled();
  });
});
