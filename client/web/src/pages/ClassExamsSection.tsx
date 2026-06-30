import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  X,
  Search,
  Filter,
  Trash2,
  AlertCircle,
  Check,
  CheckSquare,
  Square,
  BookOpen,
  Clock,
  Hash,
  Eye,
} from 'lucide-react';
import { useClassStore } from '../presentation/store/classStore';
import { useExamStore } from '../presentation/store/examStore';
import styles from './ClassExamsSection.module.css';
import { ExamScoresModal } from '../presentation/components/shared/ExamScoresModal';

interface ClassExamsSectionProps {
  classId: string;
  className?: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  in_progress: 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  draft: { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' },
  published: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  in_progress: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  completed: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  archived: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDuration(minutes?: number): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ''}`.trim();
  return `${m}m`;
}

export default function ClassExamsSection({ classId, className }: ClassExamsSectionProps) {
  const navigate = useNavigate();
  const {
    classExams,
    isLoadingClassExams,
    fetchClassExams,
    assignExamsToClass,
    removeExamFromClass,
  } = useClassStore();
  const { exams: allExams, fetchExams } = useExamStore();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExamIds, setSelectedExamIds] = useState<Set<string>>(new Set());
  const [originalExamIds, setOriginalExamIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [viewingScoresForExamId, setViewingScoresForExamId] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (classId) {
      fetchClassExams(classId);
    }
  }, [classId, fetchClassExams]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When modal opens, fetch all exams and set initial selection
  const handleOpenModal = async () => {
    setActionError(null);
    setActionSuccess(null);
    setSearchQuery('');
    setStatusFilter('ALL');
    await fetchExams({});
    // Set currently assigned exams as selected
    const assigned = new Set(classExams.map((e) => e._id));
    setSelectedExamIds(assigned);
    setOriginalExamIds(assigned);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedExamIds(new Set());
    setOriginalExamIds(new Set());
    setSearchQuery('');
    setStatusFilter('ALL');
    setActionError(null);
    setActionSuccess(null);
  };

  const handleToggleExam = (examId: string, status: string) => {
    if (status === 'in_progress') return; // Cannot change in-progress exams
    setSelectedExamIds((prev) => {
      const next = new Set(prev);
      if (next.has(examId)) {
        next.delete(examId);
      } else {
        next.add(examId);
      }
      return next;
    });
  };

  const handleSubmitAssignments = async () => {
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    const toAdd = [...selectedExamIds].filter((id) => !originalExamIds.has(id));
    const toRemove = [...originalExamIds].filter((id) => !selectedExamIds.has(id));

    try {
      let failedCount = 0;

      if (toRemove.length > 0) {
        for (const examId of toRemove) {
          const exam = classExams.find((e) => e._id === examId);
          if (exam?.status === 'in_progress') {
            failedCount++;
            continue;
          }
          await removeExamFromClass(classId, examId);
        }
      }

      if (toAdd.length > 0) {
        const result = await assignExamsToClass(classId, toAdd);
        failedCount += result.failed?.length || 0;
      }

      if (failedCount === 0) {
        setActionSuccess('Exam list updated successfully.');
        setTimeout(() => {
          handleCloseModal();
        }, 1200);
      } else {
        setActionError(`${failedCount} exams could not be updated (currently in progress).`);
      }
    } catch (err) {
      setActionError((err as Error).message || 'Failed to update exam assignments.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveExam = async (examId: string, examTitle: string) => {
    if (!window.confirm(`Remove exam "${examTitle}" from this class?`)) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await removeExamFromClass(classId, examId);
      setActionSuccess('Exam removed from class.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setActionError((err as Error).message || 'Failed to remove exam.');
      setTimeout(() => setActionError(null), 5000);
    }
  };

  // Filter exams in modal
  const filteredModalExams = (allExams || []).filter((e) => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const hasChanges =
    selectedExamIds.size !== originalExamIds.size ||
    [...selectedExamIds].some((id) => !originalExamIds.has(id));

  const viewingExam = viewingScoresForExamId
    ? classExams.find((e) => e._id === viewingScoresForExamId) ?? null
    : null;

  return (
    <div className={styles.section}>
      {/* Header */}
      <div className={styles.sectionHeader}>
        <div>
          <h3 className={styles.sectionTitle}>Class Exams</h3>
          <p className={styles.sectionSubtitle}>
            Manage exams assigned to this class
          </p>
        </div>
        <button className={styles.assignBtn} onClick={handleOpenModal}>
          <Plus size={16} />
          <span>Assign Exam</span>
        </button>
      </div>

      {/* Alerts */}
      {actionError && (
        <div className={styles.alertError}>
          <AlertCircle size={16} />
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className={styles.alertCloseBtn}>
            <X size={14} />
          </button>
        </div>
      )}
      {actionSuccess && (
        <div className={styles.alertSuccess}>
          <Check size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Table */}
      <div className={styles.card}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Exam Title</th>
                <th>Exam Date</th>
                <th>Duration</th>
                <th>No. of Questions</th>
                <th>Status</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingClassExams ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    <div className={styles.spinner} />
                    <p>Loading exam list...</p>
                  </td>
                </tr>
              ) : classExams.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    <div className={styles.emptyIcon}>
                      <FileText size={32} />
                    </div>
                    <p>No exams assigned to this class yet.</p>
                    <button className={styles.emptyActionBtn} onClick={handleOpenModal}>
                      <Plus size={14} />
                      <span>Assign First Exam</span>
                    </button>
                  </td>
                </tr>
              ) : (
                classExams.map((exam) => {
                  const colors = STATUS_COLORS[exam.status] || STATUS_COLORS.draft;
                  const isInProgress = exam.status === 'in_progress';
                  return (
                    <tr key={exam._id}>
                      <td>
                        <div className={styles.examTitleCell}>
                          <button
                            className={styles.examTitleLink}
                            onClick={(e) => { e.stopPropagation(); navigate(`/exams/${exam._id}`); }}
                          >
                            <FileText size={14} />
                            <span className={styles.examTitle}>{exam.title}</span>
                          </button>
                        </div>
                      </td>
                      <td className={styles.dateCell}>
                        {exam.examDate ? formatDate(exam.examDate) : '—'}
                      </td>
                      <td className={styles.centerCell}>
                        {exam.duration ? (
                          <span className={styles.durationBadge}>
                            <Clock size={12} />
                            {formatDuration(exam.duration)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={styles.centerCell}>
                        {exam.numberOfQuestions ? (
                          <span className={styles.questionBadge}>
                            <Hash size={12} />
                            {exam.numberOfQuestions}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <span
                          className={styles.statusBadge}
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            borderColor: colors.border,
                          }}
                        >
                          {STATUS_LABELS[exam.status] || exam.status}
                        </span>
                      </td>
                      <td style={{ width: '120px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className={styles.viewScoresBtn}
                            onClick={() => setViewingScoresForExamId(exam._id)}
                            title="View Exam Scores"
                            aria-label="View Exam Scores"
                            data-testid={`view-scores-${exam._id}`}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className={styles.removeBtn}
                            onClick={() => handleRemoveExam(exam._id, exam.title)}
                            disabled={isInProgress}
                            title={
                              isInProgress
                                ? 'Cannot delete: exam is currently in progress'
                                : 'Remove from class'
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Exam Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && handleCloseModal()}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>Assign Exam</h2>
                <p className={styles.modalSubtitle}>Select exams to assign to this class</p>
              </div>
              <button className={styles.closeBtn} onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>

            {/* Modal toolbar */}
            <div className={styles.modalToolbar}>
              <div className={styles.searchContainer}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search exams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
              <div className={styles.filterWrapper} ref={filterRef}>
                <button
                  className={`${styles.filterBtn} ${statusFilter !== 'ALL' ? styles.filterBtnActive : ''}`}
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                >
                  <Filter size={15} />
                  <span>{statusFilter === 'ALL' ? 'Filter' : STATUS_LABELS[statusFilter]}</span>
                </button>
                {showFilterDropdown && (
                  <div className={styles.dropdownMenu}>
                    <button
                      className={`${styles.dropdownItem} ${statusFilter === 'ALL' ? styles.dropdownItemActive : ''}`}
                      onClick={() => { setStatusFilter('ALL'); setShowFilterDropdown(false); }}
                    >
                      All
                    </button>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <button
                        key={key}
                        className={`${styles.dropdownItem} ${statusFilter === key ? styles.dropdownItemActive : ''}`}
                        onClick={() => { setStatusFilter(key); setShowFilterDropdown(false); }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Error / Success */}
            {actionError && (
              <div className={styles.modalAlertError}>
                <AlertCircle size={15} />
                <span>{actionError}</span>
              </div>
            )}
            {actionSuccess && (
              <div className={styles.modalAlertSuccess}>
                <Check size={15} />
                <span>{actionSuccess}</span>
              </div>
            )}

            {/* Exam list */}
            <div className={styles.examList}>
              {filteredModalExams.length === 0 ? (
                <div className={styles.modalEmpty}>
                  <BookOpen size={28} />
                  <p>No exams found.</p>
                </div>
              ) : (
                filteredModalExams.map((exam) => {
                  const isSelected = selectedExamIds.has(exam._id);
                  const wasAssigned = originalExamIds.has(exam._id);
                  const isInProgress = exam.status === 'in_progress';
                  const colors = STATUS_COLORS[exam.status] || STATUS_COLORS.draft;

                  return (
                    <div
                      key={exam._id}
                      className={`${styles.examItem} ${isSelected ? styles.examItemSelected : ''} ${isInProgress ? styles.examItemDisabled : ''}`}
                      onClick={() => !isInProgress && handleToggleExam(exam._id, exam.status)}
                    >
                      <div className={styles.examItemCheckbox}>
                        {isInProgress ? (
                          <AlertCircle size={18} className={styles.warningIcon} />
                        ) : isSelected ? (
                          <CheckSquare size={18} className={styles.checkedIcon} />
                        ) : (
                          <Square size={18} className={styles.uncheckedIcon} />
                        )}
                      </div>
                      <div className={styles.examItemContent}>
                        <div className={styles.examItemTitle}>{exam.title}</div>
                        <div className={styles.examItemMeta}>
                          {exam.examDate && (
                            <span className={styles.metaItem}>
                              <BookOpen size={11} />
                              {formatDate(exam.examDate)}
                            </span>
                          )}
                          {exam.duration && (
                            <span className={styles.metaItem}>
                              <Clock size={11} />
                              {formatDuration(exam.duration)}
                            </span>
                          )}
                          {exam.numberOfQuestions && (
                            <span className={styles.metaItem}>
                              <Hash size={11} />
                              {exam.numberOfQuestions} questions
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.examItemRight}>
                        <span
                          className={styles.statusBadgeSmall}
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            borderColor: colors.border,
                          }}
                        >
                          {STATUS_LABELS[exam.status]}
                        </span>
                        {wasAssigned && !isInProgress && (
                          <span className={styles.assignedTag}>Assigned</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal footer */}
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={handleCloseModal}>
                Cancel
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleSubmitAssignments}
                disabled={isSubmitting || !hasChanges}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exam Scores Modal */}
      {viewingExam && (
        <ExamScoresModal
          open={true}
          onClose={() => setViewingScoresForExamId(null)}
          examId={viewingExam._id}
          examTitle={viewingExam.title}
          examDate={viewingExam.examDate}
          classId={classId}
          className={className}
        />
      )}
    </div>
  );
}
