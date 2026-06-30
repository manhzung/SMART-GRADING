import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  Download, 
  X, 
  Check, 
  AlertCircle,
  FileBarChart,
  Users,
  GraduationCap,
  BarChart3,
  PieChart,
  Key
} from 'lucide-react';
import type { Exam } from '../../presentation/store/examStore';
import type { BackendSubmission } from '../../presentation/store/submissionStore';
import type { ExamReport } from './types';
import { useReportExport, type ExportType, type ReportType, type ExportOptions } from './useReportExport';
import styles from './ReportExportModal.module.css';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  report: ExamReport | null;
  submissions: BackendSubmission[];
}

interface OptionConfig {
  id: keyof Pick<ExportOptions, 'includeGradeDistribution' | 'includeStatistics' | 'includeAnswerKey'>;
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultChecked: boolean;
}

const OPTIONS_CONFIG: OptionConfig[] = [
  {
    id: 'includeStatistics',
    label: 'Overview Statistics',
    description: 'Include average, highest, and lowest scores',
    icon: <BarChart3 size={20} />,
    defaultChecked: true,
  },
  {
    id: 'includeGradeDistribution',
    label: 'Score Distribution',
    description: 'Grading table and student ratio',
    icon: <PieChart size={20} />,
    defaultChecked: true,
  },
  {
    id: 'includeAnswerKey',
    label: 'Answer Key',
    description: 'Include correct answers',
    icon: <Key size={20} />,
    defaultChecked: false,
  },
];

export function ReportExportModal({
  isOpen,
  onClose,
  exam,
  report,
  submissions,
}: ReportExportModalProps) {
  const [exportType, setExportType] = useState<ExportType>('pdf');
  const [reportType, setReportType] = useState<ReportType>('exam');
  const [options, setOptions] = useState({
    includeGradeDistribution: true,
    includeStatistics: true,
    includeAnswerKey: false,
  });

  const {
    isExporting,
    exportProgress,
    exportError,
    exportWithOptions,
    resetExport,
  } = useReportExport();

  // Use key to force reset when modal opens
  const modalKey = useMemo(() => (isOpen ? 'open' : 'closed'), [isOpen]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      resetExport();
    }
  }, [isOpen, resetExport]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isExporting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isExporting, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOptionToggle = useCallback((optionId: keyof typeof options) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: !prev[optionId],
    }));
  }, []);

  const handleExport = useCallback(async () => {
    if (!exam || !report) return;

    await exportWithOptions(exam, report, submissions, {
      exportType,
      reportType,
      ...options,
    });

    // Close modal after successful export (small delay for UX)
    setTimeout(() => {
      onClose();
    }, 500);
  }, [exam, report, submissions, exportType, reportType, options, exportWithOptions, onClose]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isExporting) {
      onClose();
    }
  }, [isExporting, onClose]);

  if (!isOpen) return null;

  const exportTypeOptions = [
    { value: 'pdf' as const, label: 'PDF', icon: <FileText size={24} /> },
    { value: 'excel' as const, label: 'Excel', icon: <FileSpreadsheet size={24} /> },
  ];

  const reportTypeOptions = [
    { value: 'exam' as const, label: 'Exam Report', icon: <FileBarChart size={16} /> },
    { value: 'class' as const, label: 'Class Report', icon: <Users size={16} /> },
    { value: 'student' as const, label: 'Student Report', icon: <GraduationCap size={16} /> },
  ];

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div key={modalKey} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <div className={styles.headerIcon}>
              <Download size={24} />
            </div>
            <h2 id="modal-title">Export Report</h2>
          </div>
          <button 
            className={styles.closeButton} 
            onClick={onClose}
            disabled={isExporting}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Loading Overlay */}
        {isExporting && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner} />
            <span className={styles.loadingText}>
              Exporting report...
            </span>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Body */}
        <div className={styles.body}>
          {/* Exam Info */}
          {exam && (
            <div className={styles.examInfo}>
              <div className={styles.examIcon}>
                <FileBarChart size={20} />
              </div>
              <div className={styles.examDetails}>
                <p className={styles.examTitle}>{exam.title}</p>
                <p className={styles.examMeta}>
                  {exam.subjectName || 'Unassigned'} • {exam.totalScore || 10} points • {exam.numberOfQuestions || 0} questions
                </p>
              </div>
            </div>
          )}

          {/* Export Type Selector */}
          <div className={styles.section}>
            <label className={styles.sectionLabel}>File Format</label>
            <div className={styles.exportTypeGrid}>
              {exportTypeOptions.map((option) => (
                <button
                  key={option.value}
                  className={`${styles.exportTypeButton} ${exportType === option.value ? styles.active : ''}`}
                  onClick={() => setExportType(option.value)}
                  type="button"
                >
                  <div className={styles.exportTypeIcon}>{option.icon}</div>
                  <span className={styles.exportTypeLabel}>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Report Type Selector */}
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Report Type</label>
            <div className={styles.reportTypeGrid}>
              {reportTypeOptions.map((option) => (
                <button
                  key={option.value}
                  className={`${styles.reportTypeButton} ${reportType === option.value ? styles.active : ''}`}
                  onClick={() => setReportType(option.value)}
                  type="button"
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Report Options</label>
            <div className={styles.optionsList}>
              {OPTIONS_CONFIG.map((config) => (
                <div
                  key={config.id}
                  className={`${styles.optionItem} ${options[config.id] ? styles.checked : ''}`}
                  onClick={() => handleOptionToggle(config.id)}
                  role="checkbox"
                  aria-checked={options[config.id]}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOptionToggle(config.id);
                    }
                  }}
                >
                  <div className={styles.optionCheckbox}>
                    {options[config.id] && <Check size={14} />}
                  </div>
                  <div className={styles.optionContent}>
                    <div className={styles.optionLabel}>{config.label}</div>
                    <div className={styles.optionDescription}>{config.description}</div>
                  </div>
                  <div className={styles.optionIconWrapper}>
                    {config.icon}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {exportError && (
            <div className={styles.errorMessage}>
              <AlertCircle size={18} className={styles.errorIcon} />
              <span>{exportError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isExporting}
            type="button"
          >
            Cancel
          </button>
          <button
            className={styles.exportButton}
            onClick={handleExport}
            disabled={isExporting || !exam || !report}
            type="button"
          >
            {isExporting ? (
              <>
                <span className={styles.spinnerSmall} />
                Exporting...
              </>
            ) : (
              <>
                <Download size={18} />
                Export Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReportExportModal;
