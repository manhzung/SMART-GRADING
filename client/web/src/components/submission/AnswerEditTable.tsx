import React from 'react';
import { Check, X as XIcon } from 'lucide-react';
import styles from './AnswerEditTable.module.css';

export interface AnswerRow {
  position: number;
  selectedAnswer: string | null;
  correctAnswer?: string | null;
  isCorrect: boolean;
  score: number;
  maxScore: number;
}

interface AnswerEditTableProps {
  answers: AnswerRow[];
  editable: boolean;
  onChange: (position: number, value: string | null) => void;
  onReasonChange?: (position: number, reason: string) => void;
  reasons?: Record<number, string>;
}

export const AnswerEditTable: React.FC<AnswerEditTableProps> = ({
  answers,
  editable,
  onChange,
  onReasonChange,
  reasons = {},
}) => {
  if (answers.length === 0) {
    return (
      <div className={styles.emptyState} data-testid="empty-state">
        No answers available
      </div>
    );
  }

  return (
    <table className={styles.table} data-testid="answer-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Student Answer</th>
          <th>Correct Answer</th>
          <th>Result</th>
          <th>Score</th>
          {editable && <th>Edit Reason</th>}
        </tr>
      </thead>
      <tbody>
        {answers.map((ans) => (
          <tr key={ans.position} data-testid={`row-${ans.position}`}>
            <td>{ans.position}</td>
            <td>
              {editable ? (
                <select
                  data-testid={`select-${ans.position}`}
                  value={ans.selectedAnswer ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : e.target.value;
                    onChange(ans.position, val);
                  }}
                  className={styles.select}
                >
                  <option value="">—</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              ) : (
                <span>{ans.selectedAnswer ?? '—'}</span>
              )}
            </td>
            <td>{ans.correctAnswer ?? '—'}</td>
            <td>
              {ans.isCorrect ? (
                <Check size={16} className={styles.iconCorrect} data-testid="correct-icon" />
              ) : (
                <XIcon size={16} className={styles.iconWrong} />
              )}
            </td>
            <td>
              {ans.score}/{ans.maxScore}
            </td>
            {editable && (
              <td>
                <textarea
                  data-testid={`reason-${ans.position}`}
                  value={reasons[ans.position] ?? ''}
                  onChange={(e) => onReasonChange?.(ans.position, e.target.value)}
                  className={styles.reasonInput}
                  rows={1}
                  placeholder="Reason (optional)"
                />
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
