import { describe, it, expect } from 'vitest';
import { getGradeLabel, formatScore, formatDateTime } from '../../../presentation/components/shared/ExamScoresModal.helpers';

describe('getGradeLabel', () => {
  it('returns "Xuất sắc" for ratio >= 0.9', () => {
    expect(getGradeLabel(9.5, 10)).toBe('Xuất sắc');
    expect(getGradeLabel(9, 10)).toBe('Xuất sắc');
  });
  it('returns "Giỏi" for ratio in [0.8, 0.9)', () => {
    expect(getGradeLabel(8, 10)).toBe('Giỏi');
    expect(getGradeLabel(8.99, 10)).toBe('Giỏi');
  });
  it('returns "Khá" for ratio in [0.65, 0.8)', () => {
    expect(getGradeLabel(6.5, 10)).toBe('Khá');
    expect(getGradeLabel(7.99, 10)).toBe('Khá');
  });
  it('returns "Trung bình" for ratio in [0.5, 0.65)', () => {
    expect(getGradeLabel(5, 10)).toBe('Trung bình');
    expect(getGradeLabel(6.49, 10)).toBe('Trung bình');
  });
  it('returns "Yếu" for ratio < 0.5', () => {
    expect(getGradeLabel(4.99, 10)).toBe('Yếu');
    expect(getGradeLabel(0, 10)).toBe('Yếu');
  });
  it('returns "—" when maxScore is 0', () => {
    expect(getGradeLabel(0, 0)).toBe('—');
  });
  it('returns "—" when maxScore is negative (defensive)', () => {
    expect(getGradeLabel(5, -1)).toBe('—');
  });
});

describe('formatScore', () => {
  it('formats two integers', () => {
    expect(formatScore(8, 10)).toBe('8 / 10');
  });
  it('formats one decimal', () => {
    expect(formatScore(8.5, 10)).toBe('8.5 / 10');
  });
  it('handles zero', () => {
    expect(formatScore(0, 10)).toBe('0 / 10');
    expect(formatScore(0, 0)).toBe('0 / 0');
  });
});

describe('formatDateTime', () => {
  it('returns "—" for undefined', () => {
    expect(formatDateTime(undefined)).toBe('—');
  });
  it('returns "—" for invalid date string', () => {
    expect(formatDateTime('not-a-date')).toBe('—');
  });
  it('formats a valid ISO string to dd/MM/yyyy HH:mm', () => {
    const out = formatDateTime('2026-06-28T07:32:00.000Z');
    // Don't assert HH:mm exactly (TZ-dependent); assert the date part only.
    expect(out).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });
});
