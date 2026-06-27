import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnswerEditTable } from '../../../components/submission/AnswerEditTable';

const mockAnswers = [
  { position: 1, selectedAnswer: 'A', correctAnswer: 'A', isCorrect: true, score: 1, maxScore: 1 },
  { position: 2, selectedAnswer: 'B', correctAnswer: 'C', isCorrect: false, score: 0, maxScore: 1 },
  { position: 3, selectedAnswer: null, correctAnswer: 'D', isCorrect: false, score: 0, maxScore: 1 },
];

describe('AnswerEditTable', () => {
  it('renders one row per answer', () => {
    render(<AnswerEditTable answers={mockAnswers} editable={false} onChange={vi.fn()} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows selectedAnswer in read-only mode', () => {
    render(<AnswerEditTable answers={mockAnswers} editable={false} onChange={vi.fn()} />);
    const cellsA = screen.getAllByText('A');
    expect(cellsA.length).toBeGreaterThanOrEqual(1);
  });

  it('shows dash for null selectedAnswer', () => {
    render(<AnswerEditTable answers={mockAnswers} editable={false} onChange={vi.fn()} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows correctAnswer column', () => {
    render(<AnswerEditTable answers={mockAnswers} editable={false} onChange={vi.fn()} />);
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('shows check icon for correct answers', () => {
    const { container } = render(<AnswerEditTable answers={mockAnswers} editable={false} onChange={vi.fn()} />);
    const correctIcons = container.querySelectorAll('[data-testid="correct-icon"]');
    expect(correctIcons.length).toBe(1);
  });

  it('renders dropdowns when editable=true', () => {
    render(<AnswerEditTable answers={mockAnswers} editable={true} onChange={vi.fn()} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBe(3);
  });

  it('calls onChange when dropdown value changes', () => {
    const onChange = vi.fn();
    render(<AnswerEditTable answers={mockAnswers} editable={true} onChange={onChange} />);
    const firstSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(firstSelect, { target: { value: 'B' } });
    expect(onChange).toHaveBeenCalledWith(1, 'B');
  });

  it('shows reason textarea when editable=true', () => {
    render(<AnswerEditTable answers={mockAnswers} editable={true} onChange={vi.fn()} onReasonChange={vi.fn()} />);
    const textareas = screen.getAllByRole('textbox');
    expect(textareas.length).toBeGreaterThan(0);
  });

  it('calls onReasonChange when reason typed', () => {
    const onReasonChange = vi.fn();
    render(<AnswerEditTable answers={mockAnswers} editable={true} onChange={vi.fn()} onReasonChange={onReasonChange} />);
    const textarea = screen.getAllByRole('textbox')[0];
    fireEvent.change(textarea, { target: { value: 'HS tô sai' } });
    expect(onReasonChange).toHaveBeenCalledWith(1, 'HS tô sai');
  });

  it('displays empty state when answers is empty', () => {
    render(<AnswerEditTable answers={[]} editable={false} onChange={vi.fn()} />);
    expect(screen.getByText(/chưa có đáp án/i)).toBeInTheDocument();
  });
});
