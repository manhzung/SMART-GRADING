export function getGradeLabel(score: number, maxScore: number): string {
  if (!maxScore || maxScore <= 0) return '—';
  const ratio = score / maxScore;
  if (ratio >= 0.9) return 'Xuất sắc';
  if (ratio >= 0.8) return 'Giỏi';
  if (ratio >= 0.65) return 'Khá';
  if (ratio >= 0.5) return 'Trung bình';
  return 'Yếu';
}

function trimTrailing(num: number): string {
  // Strip trailing zeros but keep up to 1 decimal: 8.50 -> 8.5, 8.00 -> 8
  const s = num.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

export function formatScore(score: number, maxScore: number): string {
  return `${trimTrailing(score)} / ${trimTrailing(maxScore)}`;
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}
