import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EntityPageHeader from '../../../presentation/components/shared/EntityPageHeader';

describe('EntityPageHeader', () => {
  it('renders title and subtitle', () => {
    render(<EntityPageHeader mode="admin" title="Classes" subtitle="All schools" />);
    expect(screen.getByText('Classes')).toBeInTheDocument();
    expect(screen.getByText('All schools')).toBeInTheDocument();
  });

  it('shows correct role badge text per mode', () => {
    const { rerender } = render(<EntityPageHeader mode="admin" title="T" subtitle="s" />);
    expect(screen.getByText('SUPER ADMIN')).toBeInTheDocument();
    rerender(<EntityPageHeader mode="schoolAdmin" title="T" subtitle="s" />);
    expect(screen.getByText('SCHOOL ADMIN')).toBeInTheDocument();
    rerender(<EntityPageHeader mode="teacher" title="T" subtitle="s" />);
    expect(screen.getByText('TEACHER')).toBeInTheDocument();
  });

  it('applies correct accent class per mode', () => {
    const { rerender, container } = render(<EntityPageHeader mode="admin" title="T" subtitle="s" />);
    expect(container.firstChild).toHaveAttribute('class', expect.stringContaining('admin'));
    rerender(<EntityPageHeader mode="schoolAdmin" title="T" subtitle="s" />);
    expect(container.firstChild).toHaveAttribute('class', expect.stringContaining('schoolAdmin'));
    rerender(<EntityPageHeader mode="teacher" title="T" subtitle="s" />);
    expect(container.firstChild).toHaveAttribute('class', expect.stringContaining('teacher'));
  });

  it('renders action button and calls onCreate', () => {
    const onCreate = vi.fn();
    render(<EntityPageHeader mode="admin" title="T" subtitle="s" createLabel="Add" onCreate={onCreate} />);
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('does not render create button when onCreate not provided', () => {
    render(<EntityPageHeader mode="admin" title="T" subtitle="s" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
