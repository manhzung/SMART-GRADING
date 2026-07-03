/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState, useMemo } from 'react';
import { X, Edit3, Trash2, Save, AlertTriangle } from 'lucide-react';
import { apiService } from '../../core/api';
import { useSubmissionStore } from '../../presentation/store/submissionStore';
import { useExamStore } from '../../presentation/store/examStore';
import { AnswerEditTable, type AnswerRow } from './AnswerEditTable';
import { ImageGallery } from './ImageGallery';
import styles from './SubmissionDetailModal.module.css';

interface SubmissionDetailModalProps {
  open: boolean;
  submissionId?: string;
  initialMode?: 'view' | 'edit' | 'create';
  onClose: () => void;
  onSaved?: () => void;
}

type ModalMode = 'view' | 'edit' | 'create';

export const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({
  open,
  submissionId,
  initialMode = 'view',
  onClose,
  onSaved,
}) => {
  const {
    currentSubmission,
    isLoadingDetail,
    isSubmitting,
    error,
    fetchById,
    updateSubmission,
    clearCurrentSubmission,
    clearError,
  } = useSubmissionStore();

  const { examVersions, fetchExamVersions } = useExamStore();

  const [mode, setMode] = useState<ModalMode>(initialMode);
  const [editedAnswers, setEditedAnswers] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const examId = useMemo(() => {
    if (!currentSubmission?.examId) return undefined;
    return typeof currentSubmission.examId === 'object'
      ? (currentSubmission.examId as any)._id
      : currentSubmission.examId;
  }, [currentSubmission]);

  useEffect(() => {
    if (open && examId) {
      fetchExamVersions(examId);
    }
  }, [open, examId, fetchExamVersions]);

  useEffect(() => {
    if (currentSubmission?.versionId) {
      const vId = typeof currentSubmission.versionId === 'object'
        ? (currentSubmission.versionId as any)._id
        : currentSubmission.versionId;
      setSelectedVersionId(vId || '');
    } else {
      setSelectedVersionId('');
    }
  }, [currentSubmission]);

  useEffect(() => {
    if (open && submissionId) {
      fetchById(submissionId);
    }
  }, [open, submissionId, fetchById]);

  useEffect(() => {
    if (open) return;
    clearCurrentSubmission();
    setEditedAnswers({});
    setReasons({});
    setSelectedVersionId('');
    setMode(initialMode);
    setShowDeleteConfirm(false);
    clearError();
  }, [open, initialMode, clearCurrentSubmission, clearError]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  const answersAsRows: AnswerRow[] = useMemo(() => {
    if (!currentSubmission?.answers || !Array.isArray(currentSubmission.answers)) return [];
    return currentSubmission.answers.map((a: any) => {
      const posStr = String(a.position);
      const isEdited = Object.prototype.hasOwnProperty.call(editedAnswers, posStr);
      return {
        position: a.position,
        selectedAnswer: isEdited ? editedAnswers[posStr] : a.selectedAnswer,
        correctAnswer: (a as { correctAnswer?: string | null }).correctAnswer ?? null,
        isCorrect: a.isCorrect,
        score: a.score,
        maxScore: a.maxScore,
      };
    });
  }, [currentSubmission, editedAnswers]);

  const hasChanges = Object.keys(editedAnswers).length > 0;

  const handleAnswerChange = (position: number, value: string | null) => {
    setEditedAnswers((prev) => {
      const next = { ...prev };
      const original = answersAsRows.find((a) => a.position === position);
      const isUnchanged = original?.selectedAnswer === value ||
        (original?.selectedAnswer == null && value == null);
      if (isUnchanged) {
        delete next[String(position)];
      } else {
        next[String(position)] = value || '';
      }
      return next;
    });
  };

  const handleReasonChange = (position: number, reason: string) => {
    setReasons((prev) => ({ ...prev, [position]: reason }));
  };

  const handleSave = async () => {
    if (!submissionId) return;
    const originalVersionId = typeof currentSubmission?.versionId === 'object'
      ? (currentSubmission.versionId as any)._id
      : currentSubmission?.versionId;
    const versionChanged = selectedVersionId !== originalVersionId;
    if (!hasChanges && !versionChanged) return;
    try {
      await updateSubmission(
        submissionId,
        hasChanges ? editedAnswers : undefined,
        versionChanged ? selectedVersionId : undefined
      );
      setMode('view');
      setEditedAnswers({});
      onSaved?.();
    } catch {
      // error already set in store
    }
  };

  const handleDelete = async () => {
    if (!submissionId) return;
    try {
      await apiService.delete(`/submissions/${submissionId}`);
      setShowDeleteConfirm(false);
      onSaved?.();
      onClose();
    } catch {
      // error handled elsewhere
    }
  };

  if (!open) return null;

  type RefField = { _id?: string; name?: string; studentCode?: string; email?: string; title?: string; versionCode?: string };
  const student = currentSubmission?.studentId as RefField | string | undefined;
  const exam = currentSubmission?.examId as RefField | string | undefined;
  const version = currentSubmission?.versionId as RefField | string | undefined;
  const classInfo = currentSubmission?.classId as RefField | string | undefined;

  const studentName = typeof student === 'object' ? student?.name : '—';
  const studentCode = typeof student === 'object' ? student?.studentCode : '—';
  const className = typeof classInfo === 'object' ? classInfo?.name : '—';
  const examTitle = typeof exam === 'object' ? exam?.title : '—';
  const versionCode = typeof version === 'object' ? version?.versionCode : '—';

  const statusLabel: Record<string, string> = {
    pending: 'Pending Scan',
    scanned: 'Scanned',
    completed: 'Completed',
    manual_review: 'Pending Review',
    appealed: 'Under Appeal',
  };

  return (
    <div
      className={styles.modalOverlay}
      data-testid="modal-overlay"
      onClick={onClose}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 id="submission-modal-title" className={styles.modalTitle}>
            {mode === 'edit' ? 'Edit Submission' : 'Submission Details'}
          </h3>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
            disabled={isSubmitting}
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {isLoadingDetail && (
            <div className={styles.loading}>Loading data...</div>
          )}

          {error && (
            <div className={styles.error} data-testid="error-message">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {!isLoadingDetail && currentSubmission && (
            <>
              <div className={styles.infoSection}>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Student:</span>
                    <span className={styles.infoValue}>{studentName}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Student ID:</span>
                    <span className={styles.infoValue}>{studentCode}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Class:</span>
                    <span className={styles.infoValue}>{className}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Exam:</span>
                    <span className={styles.infoValue}>{examTitle}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Version:</span>
                    {mode === 'edit' ? (
                      <select
                        value={selectedVersionId}
                        onChange={(e) => setSelectedVersionId(e.target.value)}
                        className={styles.select}
                      >
                        <option value="">Select Version</option>
                        {examVersions.map((v) => (
                          <option key={v._id} value={v._id}>
                            {v.versionCode}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={styles.infoValue}>{versionCode}</span>
                    )}
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Status:</span>
                    <span className={styles.statusBadge}>
                      {statusLabel[currentSubmission.status] || currentSubmission.status}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Score:</span>
                    <span className={styles.scoreHighlight}>
                      {currentSubmission.totalScore} / {currentSubmission.maxScore}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Answer Table</h4>
                <AnswerEditTable
                  answers={answersAsRows}
                  editable={mode === 'edit'}
                  onChange={handleAnswerChange}
                  onReasonChange={handleReasonChange}
                  reasons={reasons}
                />
              </div>

              {(currentSubmission as { images?: { original?: { url?: string }; annotated?: { url?: string } } }).images && (
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>Submission Images</h4>
                  <ImageGallery
                    originalUrl={(currentSubmission as { images?: { original?: { url?: string } } }).images?.original?.url}
                    annotatedUrl={(currentSubmission as { images?: { annotated?: { url?: string } } }).images?.annotated?.url}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          {mode === 'view' && currentSubmission && (
            <>
              <button
                className={styles.btnDelete}
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
              >
                <Trash2 size={14} /> Delete
              </button>
              <button
                className={styles.btnSecondary}
                onClick={() => setMode('edit')}
                disabled={isSubmitting}
              >
                <Edit3 size={14} /> Edit
              </button>
              <button className={styles.btnPrimary} onClick={onClose} disabled={isSubmitting}>
                Close
              </button>
            </>
          )}
          {mode === 'edit' && (
            <>
              <button
                className={styles.btnSecondary}
                onClick={() => {
                  setMode('view');
                  setEditedAnswers({});
                  setReasons({});
                }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className={styles.btnPrimary}
                onClick={handleSave}
                disabled={isSubmitting || !hasChanges}
              >
                {isSubmitting ? 'Saving...' : (<><Save size={14} /> Save</>)}
              </button>
            </>
          )}
        </div>

        {showDeleteConfirm && (
          <div className={styles.confirmOverlay} onClick={() => setShowDeleteConfirm(false)}>
            <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
              <h4>Confirm Delete</h4>
              <p>Are you sure you want to delete the submission from <strong>{studentName}</strong>? This action cannot be undone.</p>
              <div className={styles.confirmActions}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className={styles.btnDelete}
                  onClick={handleDelete}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
