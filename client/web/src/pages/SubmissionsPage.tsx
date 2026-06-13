import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  Filter,
  RotateCcw,
  GraduationCap,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  BookOpen,
  Calendar,
  BarChart3,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSubmissionStore, type BackendSubmission } from '../presentation/store/submissionStore';
import { useExamStore } from '../presentation/store/examStore';
import { useClassStore } from '../presentation/store/classStore';
import styles from './SubmissionsPage.module.css';

// Status configuration
const STATUS_CONFIG = {
  pending: { text: 'Chưa chấm', class: styles.statusPending },
  submitted: { text: 'Đã nộp', class: styles.statusPending },
  graded: { text: 'Đã chấm', class: styles.statusGraded },
  reviewed: { text: 'Đã phúc tra', class: styles.statusAppealed },
};

interface SubmissionWithDetails extends BackendSubmission {
  studentName: string;
  studentEmail: string;
  examTitle: string;
  className: string;
  maxScore: number;
  totalQuestions: number;
  correctCount: number;
  percentage: number;
}

interface SubmissionAnswerDetail {
  questionId: string;
  questionContent: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export default function SubmissionsPage() {
  const { submissions, isLoading, error, fetchByExam, clearSubmissions, deleteSubmission } = useSubmissionStore();
  const { exams, fetchExams } = useExamStore();
  const { classes, fetchClasses } = useClassStore();

  // Filter states
  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dropdown UI states
  const [showExamDropdown, setShowExamDropdown] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modal state
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithDetails | null>(null);

  // Refs for click outside
  const examRef = useRef<HTMLDivElement>(null);
  const classRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchExams();
    fetchClasses({ limit: 100 });
  }, [fetchExams, fetchClasses]);

  useEffect(() => {
    if (selectedExam === 'all') {
      clearSubmissions();
      return;
    }

    fetchByExam(selectedExam);
  }, [selectedExam, fetchByExam, clearSubmissions]);

  // Process submissions with details
  const submissionsWithDetails: SubmissionWithDetails[] = useMemo(() => {
    return submissions.map((submission) => {
      const exam = exams.find((e) => e._id === submission.examId);
      const cls = classes.find((c) => c._id === submission.classId);

      const maxScore = exam?.totalScore || 10;
      const score = submission.score ?? 0;
      const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      const correctCount = submission.gradingResult?.correctCount || 0;
      const totalQuestions = submission.gradingResult?.totalQuestions || Object.keys(submission.answers).length || 0;

      return {
        ...submission,
        studentName: submission.studentId?.name || 'Unknown',
        studentEmail: submission.studentId?.email || '',
        examTitle: exam?.title || 'Không xác định',
        className: cls?.name || submission.classId || 'Không xác định',
        maxScore,
        totalQuestions,
        correctCount,
        percentage,
      };
    });
  }, [classes, exams, submissions]);

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    return submissionsWithDetails.filter((submission) => {
      // Exam filter
      if (selectedExam !== 'all' && submission.examId !== selectedExam) {
        return false;
      }

      // Class filter
      if (selectedClass !== 'all' && submission.classId !== selectedClass) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && submission.status !== selectedStatus) {
        return false;
      }

      // Date range filter
      if (startDate || endDate) {
        const submittedDate = new Date(submission.submittedAt);
        if (startDate && submittedDate < new Date(startDate)) {
          return false;
        }
        if (endDate) {
          const endDateObj = new Date(endDate);
          endDateObj.setHours(23, 59, 59, 999);
          if (submittedDate > endDateObj) {
            return false;
          }
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = submission.studentName.toLowerCase().includes(query);
        const matchEmail = submission.studentEmail.toLowerCase().includes(query);
        const matchExam = submission.examTitle.toLowerCase().includes(query);
        if (!matchName && !matchEmail && !matchExam) {
          return false;
        }
      }

      return true;
    });
  }, [submissionsWithDetails, selectedExam, selectedClass, selectedStatus, startDate, endDate, searchQuery]);

  // Pagination calculation
  const totalItems = filteredSubmissions.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const indexOfLastItem = currentPage * pageSize;
  const indexOfFirstItem = indexOfLastItem - pageSize;
  const currentItems = filteredSubmissions.slice(indexOfFirstItem, indexOfLastItem);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (examRef.current && !examRef.current.contains(event.target as Node)) {
        setShowExamDropdown(false);
      }
      if (classRef.current && !classRef.current.contains(event.target as Node)) {
        setShowClassDropdown(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset filters
  const handleResetFilters = () => {
    setSelectedExam('all');
    setSelectedClass('all');
    setSelectedStatus('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Pagination handler
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Open detail modal
  const handleRowClick = (submission: SubmissionWithDetails) => {
    setSelectedSubmission(submission);
  };

  // Close modal
  const handleCloseModal = () => {
    setSelectedSubmission(null);
  };

  // Delete submission
  const handleDeleteSubmission = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa bài nộp này?')) return;
    try {
      await deleteSubmission(id);
      setSelectedSubmission(null);
      toast.success('Đã xóa bài nộp');
    } catch (error) {
      toast.error('Xóa thất bại');
    }
  };

  // Download submission
  const handleDownload = async (submissionId: string) => {
    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/submissions/${submissionId}/download`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submission_${submissionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Tải xuống thành công');
    } catch (error) {
      toast.error('Tải xuống thất bại');
    }
  };

  // Get answers with question details for modal
  const getAnswerDetails = (submission: SubmissionWithDetails): SubmissionAnswerDetail[] => {
    const answerKey = submission.gradingResult?.answerKey ?? {};

    return Object.entries(submission.answers).map(([questionId, answer], index) => {
      const correctAnswer = answerKey[questionId] || '';
      return {
        questionId,
        questionContent: `Câu hỏi ${index + 1}`,
        studentAnswer: answer,
        correctAnswer,
        isCorrect: correctAnswer !== '' ? correctAnswer === answer : false,
      };
    });
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.submitted;
    return (
      <span className={`${styles.statusBadge} ${config.class}`}>
        {status === 'graded' && <CheckCircle size={12} />}
        {status === 'submitted' && <Clock size={12} />}
        {status === 'reviewed' && <AlertCircle size={12} />}
        {config.text}
      </span>
    );
  };

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <span>Workspace</span>
        <span className={styles.breadcrumbSeparator}>&gt;</span>
        <span className={styles.breadcrumbActive}>Quản lý bài nộp</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Quản lý bài nộp</h1>
          <p className={styles.subtitle}>Xem và quản lý các bài thi đã nộp</p>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{selectedExam === 'all' ? 0 : filteredSubmissions.length}</span>
            <span className={styles.statLabel}>Tổng bài nộp</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>
              {selectedExam === 'all' ? 0 : filteredSubmissions.filter((s) => s.status === 'graded').length}
            </span>
            <span className={styles.statLabel}>Đã chấm</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>
              {selectedExam === 'all' ? 0 : filteredSubmissions.filter((s) => s.status === 'submitted').length}
            </span>
            <span className={styles.statLabel}>Chưa chấm</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filtersGroupLeft}>
          {/* Search */}
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, email, bài thi..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.searchInput}
            />
          </div>

          {/* Exam selector */}
          <div className={styles.dropdownWrapper} ref={examRef}>
            <button
              className={styles.filterDropdownBtn}
              onClick={() => setShowExamDropdown(!showExamDropdown)}
            >
              <FileText size={14} className={styles.btnIconLeft} />
              <span>
                {selectedExam === 'all'
                  ? 'Tất cả bài thi'
                  : exams.find((e) => e._id === selectedExam)?.title.slice(0, 30) + '...' || 'Bài thi'}
              </span>
              <ChevronDown size={14} className={styles.btnChevron} />
            </button>
            {showExamDropdown && (
              <div className={styles.dropdownMenu}>
                <button
                  className={`${styles.dropdownItem} ${selectedExam === 'all' ? styles.dropdownItemActive : ''}`}
                  onClick={() => {
                    setSelectedExam('all');
                    setShowExamDropdown(false);
                    setCurrentPage(1);
                  }}
                >
                  Tất cả bài thi
                </button>
                {exams.map((exam) => (
                  <button
                    key={exam._id}
                    className={`${styles.dropdownItem} ${selectedExam === exam._id ? styles.dropdownItemActive : ''}`}
                    onClick={() => {
                      setSelectedExam(exam._id);
                      setShowExamDropdown(false);
                      setCurrentPage(1);
                    }}
                  >
                    {exam.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Class selector */}
          <div className={styles.dropdownWrapper} ref={classRef}>
            <button
              className={styles.filterDropdownBtn}
              onClick={() => setShowClassDropdown(!showClassDropdown)}
            >
              <GraduationCap size={14} className={styles.btnIconLeft} />
              <span>{selectedClass === 'all' ? 'Tất cả lớp' : `Lớp ${selectedClass}`}</span>
              <ChevronDown size={14} className={styles.btnChevron} />
            </button>
            {showClassDropdown && (
              <div className={styles.dropdownMenu}>
                <button
                  className={`${styles.dropdownItem} ${selectedClass === 'all' ? styles.dropdownItemActive : ''}`}
                  onClick={() => {
                    setSelectedClass('all');
                    setShowClassDropdown(false);
                    setCurrentPage(1);
                  }}
                >
                  Tất cả lớp
                </button>
                {classes.map((cls) => (
                  <button
                    key={cls._id}
                    className={`${styles.dropdownItem} ${selectedClass === cls.name ? styles.dropdownItemActive : ''}`}
                    onClick={() => {
                      setSelectedClass(cls.name);
                      setShowClassDropdown(false);
                      setCurrentPage(1);
                    }}
                  >
                    Lớp {cls.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status selector */}
          <div className={styles.dropdownWrapper} ref={statusRef}>
            <button
              className={styles.filterDropdownBtn}
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            >
              <Filter size={14} className={styles.btnIconLeft} />
              <span>
                {selectedStatus === 'all'
                  ? 'Tất cả trạng thái'
                  : STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG]?.text || selectedStatus}
              </span>
              <ChevronDown size={14} className={styles.btnChevron} />
            </button>
            {showStatusDropdown && (
              <div className={styles.dropdownMenu}>
                <button
                  className={`${styles.dropdownItem} ${selectedStatus === 'all' ? styles.dropdownItemActive : ''}`}
                  onClick={() => {
                    setSelectedStatus('all');
                    setShowStatusDropdown(false);
                    setCurrentPage(1);
                  }}
                >
                  Tất cả trạng thái
                </button>
                <button
                  className={`${styles.dropdownItem} ${selectedStatus === 'submitted' ? styles.dropdownItemActive : ''}`}
                  onClick={() => {
                    setSelectedStatus('submitted');
                    setShowStatusDropdown(false);
                    setCurrentPage(1);
                  }}
                >
                  Đã nộp
                </button>
                <button
                  className={`${styles.dropdownItem} ${selectedStatus === 'graded' ? styles.dropdownItemActive : ''}`}
                  onClick={() => {
                    setSelectedStatus('graded');
                    setShowStatusDropdown(false);
                    setCurrentPage(1);
                  }}
                >
                  Đã chấm
                </button>
                <button
                  className={`${styles.dropdownItem} ${selectedStatus === 'reviewed' ? styles.dropdownItemActive : ''}`}
                  onClick={() => {
                    setSelectedStatus('reviewed');
                    setShowStatusDropdown(false);
                    setCurrentPage(1);
                  }}
                >
                  Đã phúc tra
                </button>
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className={styles.datePickerContainer}>
            <Calendar size={14} className={styles.calendarIcon} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.dateInput}
            />
            <span className={styles.dateSeparator}>-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.dateInput}
            />
          </div>
        </div>

        <button className={styles.resetBtn} onClick={handleResetFilters}>
          <RotateCcw size={14} />
          <span>Đặt lại</span>
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        {error && <div className={styles.emptyContent}><p>{error}</p></div>}
        {isLoading && <div className={styles.emptyContent}><p>Đang tải bài nộp...</p></div>}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>STT</th>
              <th>HỌC SINH</th>
              <th>BÀI THI</th>
              <th>LỚP</th>
              <th>ĐIỂM</th>
              <th>TRẠNG THÁI</th>
              <th>NỘP LÚC</th>
            </tr>
          </thead>
          <tbody>
            {selectedExam === 'all' ? (
              <tr>
                <td colSpan={7} className={styles.emptyRow}>
                  <div className={styles.emptyContent}>
                    <FileText size={48} className={styles.emptyIcon} />
                    <p>Chọn một bài thi để xem bài nộp</p>
                    <span>Dữ liệu bài nộp được tải theo từng bài thi từ hệ thống</span>
                  </div>
                </td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyRow}>
                  <div className={styles.emptyContent}>
                    <FileText size={48} className={styles.emptyIcon} />
                    <p>Không tìm thấy bài nộp nào</p>
                    <span>Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác</span>
                  </div>
                </td>
              </tr>
            ) : (
              currentItems.map((submission, index) => (
                <tr
                  key={submission._id}
                  className={styles.tableRow}
                  onClick={() => handleRowClick(submission)}
                >
                  <td className={styles.sttCell}>{indexOfFirstItem + index + 1}</td>
                  <td>
                    <div className={styles.studentCell}>
                      <div className={styles.avatar}>
                        {submission.studentName.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.studentInfo}>
                        <span className={styles.studentName}>{submission.studentName}</span>
                        <span className={styles.studentEmail}>{submission.studentEmail}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={styles.examTitle}>{submission.examTitle}</span>
                  </td>
                  <td>
                    <span className={styles.className}>{submission.className}</span>
                  </td>
                  <td>
                    <div className={styles.scoreCell}>
                      {submission.score !== undefined ? (
                        <>
                          <span className={styles.scoreValue}>
                            {submission.score.toFixed(1)}/{submission.maxScore}
                          </span>
                          <span className={styles.scorePercentage}>{submission.percentage}%</span>
                        </>
                      ) : (
                        <span className={styles.noScore}>-</span>
                      )}
                    </div>
                  </td>
                  <td>{getStatusBadge(submission.status)}</td>
                  <td>
                    <span className={styles.dateCell}>{formatDate(submission.submittedAt)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className={styles.paginationRow}>
        <div className={styles.paginationLeft}>
          Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, totalItems)} trong tổng số{' '}
          {totalItems} bản ghi
        </div>
        <div className={styles.paginationRight}>
          <button
            className={styles.paginationNavBtn}
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            <ChevronLeft size={16} />
          </button>

          {Array.from({ length: totalPages }).map((_, index) => {
            const pageNum = index + 1;
            if (totalPages > 5 && pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - currentPage) > 1) {
              if (pageNum === 2 || pageNum === totalPages - 1) {
                return <span key={pageNum} className={styles.paginationEllipsis}>...</span>;
              }
              return null;
            }

            return (
              <button
                key={pageNum}
                className={`${styles.paginationNumBtn} ${currentPage === pageNum ? styles.paginationNumBtnActive : ''}`}
                onClick={() => handlePageChange(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            className={styles.paginationNavBtn}
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedSubmission && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Chi tiết bài nộp</h2>
              <button className={styles.closeBtn} onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className={styles.modalBody}>
              {/* Student Info */}
              <div className={styles.infoSection}>
                <h3 className={styles.sectionTitle}>
                  <User size={16} />
                  Thông tin học sinh
                </h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Họ tên</span>
                    <span className={styles.infoValue}>{selectedSubmission.studentName}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Email</span>
                    <span className={styles.infoValue}>{selectedSubmission.studentEmail}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Lớp</span>
                    <span className={styles.infoValue}>{selectedSubmission.className}</span>
                  </div>
                </div>
              </div>

              {/* Exam Info */}
              <div className={styles.infoSection}>
                <h3 className={styles.sectionTitle}>
                  <BookOpen size={16} />
                  Thông tin bài thi
                </h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Bài thi</span>
                    <span className={styles.infoValue}>{selectedSubmission.examTitle}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Phiên bản</span>
                    <span className={styles.infoValue}>Đề {selectedSubmission.versionCode}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Nộp lúc</span>
                    <span className={styles.infoValue}>{formatDate(selectedSubmission.submittedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Score Summary */}
              <div className={styles.scoreSection}>
                <div className={styles.scoreCard}>
                  <div className={styles.scoreMain}>
                    <BarChart3 size={24} />
                    <div className={styles.scoreDetails}>
                      <span className={styles.scoreNumber}>
                        {selectedSubmission.score?.toFixed(1) || '0'}/{selectedSubmission.maxScore}
                      </span>
                      <span className={styles.scorePercent}>{selectedSubmission.percentage}%</span>
                    </div>
                  </div>
                  <div className={styles.scoreBreakdown}>
                    <div className={styles.breakdownItem}>
                      <span className={styles.breakdownLabel}>Đúng</span>
                      <span className={styles.breakdownValueCorrect}>{selectedSubmission.correctCount}</span>
                    </div>
                    <div className={styles.breakdownItem}>
                      <span className={styles.breakdownLabel}>Sai</span>
                      <span className={styles.breakdownValueIncorrect}>
                        {selectedSubmission.totalQuestions - selectedSubmission.correctCount}
                      </span>
                    </div>
                    <div className={styles.breakdownItem}>
                      <span className={styles.breakdownLabel}>Tổng</span>
                      <span className={styles.breakdownValue}>{selectedSubmission.totalQuestions}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.statusCard}>{getStatusBadge(selectedSubmission.status)}</div>
              </div>

              {/* Answers */}
              <div className={styles.answersSection}>
                <h3 className={styles.sectionTitle}>
                  <FileText size={16} />
                  Chi tiết câu trả lời
                </h3>
                <div className={styles.answersList}>
                  {getAnswerDetails(selectedSubmission).map((answer, idx) => (
                    <div key={answer.questionId} className={styles.answerItem}>
                      <div className={styles.answerHeader}>
                        <span className={styles.questionNumber}>Câu {idx + 1}</span>
                        <span className={`${styles.answerStatus} ${answer.isCorrect ? styles.correct : styles.incorrect}`}>
                          {answer.isCorrect ? (
                            <>
                              <CheckCircle size={14} /> Đúng
                            </>
                          ) : (
                            <>
                              <X size={14} /> Sai
                            </>
                          )}
                        </span>
                      </div>
                      <p className={styles.questionContent}>{answer.questionContent}</p>
                      <div className={styles.answerDetails}>
                        <div className={styles.answerOption}>
                          <span className={styles.optionLabel}>Câu trả lời:</span>
                          <span className={`${styles.optionValue} ${!answer.isCorrect ? styles.wrongAnswer : ''}`}>
                            {answer.studentAnswer || 'Không trả lời'}
                          </span>
                        </div>
                        <div className={styles.answerOption}>
                          <span className={styles.optionLabel}>Đáp án đúng:</span>
                          <span className={`${styles.optionValue} ${styles.correctAnswer}`}>
                            {answer.correctAnswer}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <button
                className={styles.btnDanger}
                onClick={() => handleDeleteSubmission(selectedSubmission._id)}
              >
                <Trash2 size={16} />
                Xóa bài nộp
              </button>
              <button
                className={styles.downloadBtn}
                onClick={() => handleDownload(selectedSubmission._id)}
              >
                <Download size={16} />
                Tải xuống phiếu trả lời
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
