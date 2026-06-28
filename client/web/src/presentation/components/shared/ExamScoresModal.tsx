import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { apiService } from '../../../core/api';
import styles from './ExamScoresModal.module.css';
import {
  getGradeLabel,
  formatScore,
  formatDateTime,
} from './ExamScoresModal.helpers';

// ─── Types (local — matches BackendSubmission shape) ─────────────────────────
export interface ExamScoresModalStudent {
  _id: string;
  name: string;
  email: string;
  studentCode?: string;
}

export interface ExamScoresModalSubmission {
  _id: string;
  examId: string;
  studentId: ExamScoresModalStudent | string;
  totalScore: number;
  maxScore: number;
  status: 'scanned' | 'completed' | 'manual_review' | 'appealed' | 'pending';
  submittedAt?: string;
}

export interface ExamScoresModalClass {
  _id: string;
  name: string;
  studentIds: ExamScoresModalStudent[] | string[];
}

// ─── Component ──────────────────────────────────────────────────────────────
export interface ExamScoresModalProps {
  open: boolean;
  onClose: () => void;
  examId: string;
  examTitle: string;
  examSubject?: string;
  examDate?: string;
  classId: string;
  className?: string;
}

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  completed: { label: 'Hoàn thành', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  scanned: { label: 'Đã quét', bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' },
  manual_review: { label: 'Chờ chấm thủ công', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  appealed: { label: 'Đang phúc khảo', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  pending: { label: 'Đang xử lý', bg: '#fefce8', color: '#a16207', border: '#fde047' },
};

export function ExamScoresModal(props: ExamScoresModalProps) {
  const { open, onClose, examId, examTitle, examSubject, examDate, classId, className } = props;

  // Escape key closes the modal
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Fetch submissions for this exam
  const submissionsQuery = useQuery({
    queryKey: ['submissions', examId],
    queryFn: async () => {
      const res = await apiService.get<{ results: ExamScoresModalSubmission[] }>(
        `/submissions/exam/${examId}`,
      );
      return (res.results || res) as ExamScoresModalSubmission[];
    },
    enabled: open && !!examId,
  });

  // Fetch class for roster
  const classQuery = useQuery({
    queryKey: ['class', classId],
    queryFn: async () => apiService.get<ExamScoresModalClass>(`/classes/${classId}`),
    enabled: open && !!classId,
  });

  if (!open) return null;

  const isLoading = submissionsQuery.isLoading || submissionsQuery.isFetching;
  const submissions: ExamScoresModalSubmission[] = submissionsQuery.data ?? [];
  const classData = classQuery.data;
  const rosterIds: string[] = Array.isArray(classData?.studentIds)
    ? classData!.studentIds.map((s) => (typeof s === 'string' ? s : s._id))
    : [];

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exam-scores-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal} data-testid="exam-scores-modal">
        <div className={styles.header}>
          <div>
            <h2 id="exam-scores-title" className={styles.title}>
              Điểm bài thi: {examTitle}
            </h2>
            <p className={styles.subline}>
              {[examSubject, examDate ? `Ngày thi: ${examDate}` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            data-testid="close-btn"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.toolbar}>
          <span className={styles.submittedCount}>
            {isLoading
              ? 'Đang tải...'
              : `${submissions.length}${rosterIds.length ? ` / ${rosterIds.length}` : ''} học sinh đã nộp`}
          </span>
          <button className={styles.exportBtn} disabled data-testid="export-btn">
            Xuất Excel
          </button>
        </div>

        <div className={styles.body}>
          {isLoading ? (
            <div className={styles.loading} data-testid="loading">
              <div className={styles.spinner} />
              <p>Đang tải điểm...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className={styles.empty} data-testid="empty">
              <p>Chưa có học sinh nào nộp bài.</p>
            </div>
          ) : (
            <table className={styles.table} data-testid="scores-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Học sinh</th>
                  <th>Mã HS</th>
                  <th>Điểm</th>
                  <th>Trạng thái</th>
                  <th>Xếp loại</th>
                  <th>Ngày nộp</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s, idx) => {
                  const student =
                    typeof s.studentId === 'string' ? null : s.studentId;
                  const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.pending;
                  return (
                    <tr key={s._id}>
                      <td>{idx + 1}</td>
                      <td>{student?.name ?? '—'}</td>
                      <td>{student?.studentCode ?? '—'}</td>
                      <td>{formatScore(s.totalScore, s.maxScore)}</td>
                      <td>
                        <span
                          className={styles.badge}
                          style={{
                            backgroundColor: badge.bg,
                            color: badge.color,
                            borderColor: badge.border,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td>{getGradeLabel(s.totalScore, s.maxScore)}</td>
                      <td>{formatDateTime(s.submittedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} data-testid="close-btn-footer">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
