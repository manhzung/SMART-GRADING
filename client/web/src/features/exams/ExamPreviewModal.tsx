import { X, Clock, FileText, CheckCircle } from 'lucide-react';
import type { Exam, ExamVersion } from '../../presentation/store/examStore';
import styles from './ExamPreviewModal.module.css';

interface ExamPreviewModalProps {
  exam: Exam | null;
  examVersions?: ExamVersion[];
  questions?: Array<{
    questionId: string;
    content?: string;
    text?: string;
    options?: Array<{ id: string; text: string; isCorrect?: boolean }>;
  }>;
  onClose: () => void;
}

export default function ExamPreviewModal({
  exam,
  examVersions,
  questions,
  onClose,
}: ExamPreviewModalProps) {
  if (!exam) return null;

  // Get questions from exam versions or use passed questions
  const displayQuestions = questions || [];

  // Handle escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className={styles.overlay} 
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
    >
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <div className={styles.headerIcon}>
              <FileText size={20} />
            </div>
            <h2 id="preview-modal-title">Xem trước: {exam.title}</h2>
          </div>
          <button 
            className={styles.closeButton} 
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Exam Info */}
          <div className={styles.examInfo}>
            <div className={styles.infoItem}>
              <Clock size={16} />
              <span>Thời gian: <strong>{exam.duration || 45} phút</strong></span>
            </div>
            <div className={styles.infoItem}>
              <FileText size={16} />
              <span>Tổng điểm: <strong>{exam.totalScore || 10}</strong></span>
            </div>
            <div className={styles.infoItem}>
              <CheckCircle size={16} />
              <span>Điểm đạt: <strong>{exam.passingScore || 5}</strong></span>
            </div>
          </div>

          {/* Metadata */}
          <div className={styles.metadata}>
            {exam.subjectName && (
              <span className={styles.subjectBadge}>{exam.subjectName}</span>
            )}
            <span className={styles.statusBadge}>
              {exam.status === 'draft' ? 'Bản nháp' : 
               exam.status === 'published' ? 'Đã xuất bản' :
               exam.status === 'in_progress' ? 'Đang diễn ra' :
               exam.status === 'completed' ? 'Hoàn thành' : exam.status}
            </span>
            {exam.numberOfVersions && (
              <span className={styles.versionsBadge}>
                {exam.numberOfVersions} mã đề
              </span>
            )}
          </div>

          {/* Questions List */}
          <div className={styles.questionsSection}>
            <h3 className={styles.questionsTitle}>
              Danh sách câu hỏi ({exam.numberOfQuestions || displayQuestions.length || 0} câu)
            </h3>

            {displayQuestions.length > 0 ? (
              <div className={styles.questionsList}>
                {displayQuestions.slice(0, 20).map((q, idx) => (
                  <div key={q.questionId || idx} className={styles.questionItem}>
                    <div className={styles.questionHeader}>
                      <span className={styles.questionNumber}>Câu {idx + 1}</span>
                      {q.options && (
                        <span className={styles.optionCount}>
                          {q.options.length} đáp án
                        </span>
                      )}
                    </div>
                    <p className={styles.questionText}>
                      {q.content || q.text || `ID: ${q.questionId?.substring(0, 12)}...`}
                    </p>
                    {q.options && q.options.length > 0 && (
                      <div className={styles.options}>
                        {q.options.map((opt, optIdx) => (
                          <div 
                            key={opt.id || optIdx} 
                            className={`${styles.option} ${opt.isCorrect ? styles.correctOption : ''}`}
                          >
                            <span className={styles.optionLetter}>
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <span className={styles.optionText}>
                              {opt.text}
                            </span>
                            {opt.isCorrect && (
                              <CheckCircle size={14} className={styles.correctIcon} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {displayQuestions.length > 20 && (
                  <div className={styles.moreQuestions}>
                    <span>... và {displayQuestions.length - 20} câu hỏi khác</span>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.emptyQuestions}>
                <p>Chưa có câu hỏi nào được thêm vào đề thi.</p>
              </div>
            )}
          </div>

          {/* Versions Info */}
          {examVersions && examVersions.length > 0 && (
            <div className={styles.versionsSection}>
              <h3 className={styles.versionsTitle}>Các mã đề đã tạo</h3>
              <div className={styles.versionsList}>
                {examVersions.map((v) => (
                  <div key={v._id} className={styles.versionItem}>
                    <span className={styles.versionCode}>{v.versionCode}</span>
                    <span className={styles.versionMeta}>
                      {v.numberOfQuestions} câu • {v.submissionCount || 0} bài nộp
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
