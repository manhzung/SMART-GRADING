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
import { apiService } from '../core/api';
import styles from './SubmissionsPage.module.css';

// Status configuration
const STATUS_CONFIG: Record<string, { text: string; class: string }> = {
  scanned: { text: 'Đã quét', class: styles.statusPending },
  completed: { text: 'Hoàn thành', class: styles.statusGraded },
  manual_review: { text: 'Phúc tra', class: styles.statusAppealed },
  appealed: { text: 'Đã phúc tra', class: styles.statusAppealed },
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
  score: number;
  maxScore: number;
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

  // Override modal state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideQuestionId, setOverrideQuestionId] = useState<string>('');
  const [overrideNewAnswer, setOverrideNewAnswer] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('Manual override by teacher');

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

      const maxScore = submission.maxScore || exam?.totalScore || 10;
      const score = submission.totalScore ?? submission.score ?? 0;
      const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      const answersArray = Array.isArray(submission.answers) ? submission.answers : [];
      const correctCount = answersArray.filter((a: any) => a.isCorrect).length;
      const totalQuestions = answersArray.length || submission.gradingResult?.totalQuestions || 0;

      return {
        ...submission,
        studentName: (submission.studentId as any)?.name || 'Unknown',
        studentEmail: (submission.studentId as any)?.email || '',
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
    const answersArray = Array.isArray(submission.answers) ? submission.answers : [];
    const answerKey = submission.gradingResult?.answerKey ?? {};

    return answersArray.map((answer: any) => {
      const questionId = String(answer.position);
      const correctAnswer = answerKey[questionId] || '';
      return {
        questionId,
        questionContent: `Câu hỏi ${answer.position}`,
        studentAnswer: answer.selectedAnswer || '',
        correctAnswer,
        isCorrect: correctAnswer !== '' ? answer.selectedAnswer === correctAnswer : false,
        score: answer.score ?? 0,
        maxScore: answer.maxScore ?? 1,
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
    const config = STATUS_CONFIG[status] || { text: status, class: styles.statusPending };
    return (
      <span className={`${styles.statusBadge} ${config.class}`}>
        {status === 'completed' && <CheckCircle size={12} />}
        {status === 'scanned' && <Clock size={12} />}
        {status === 'manual_review' && <AlertCircle size={12} />}
        {status === 'appealed' && <AlertCircle size={12} />}
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
              {selectedExam === 'all' ? 0 : filteredSubmissions.filter((s) => s.status === 'completed').length}
            </span>
            <span className={styles.statLabel}>Hoàn thành</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>
              {selectedExam === 'all' ? 0 : filteredSubmissions.filter((s) => s.status === 'scanned').length}
            </span>
            <span className={styles.statLabel}>Đã quét</span>
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
                  }}>
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
                    }}>
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
                  }}>
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
                    }}>
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
                  }}>
                  Tất cả trạng thái
                </button>
                <button
                  className={`${styles.dropdownItem} ${selectedStatus === 'scanned' ? styles.dropdownItemActive : ''}`}
                  onClick={() => {
                    setSelectedStatus('scanned');
                    setShowStatusDropdown(false);
                    setCurrentPage(1);
                  }}>
                  Đã quét
                </button>
                <button
                  className={`${styles.dropdownItem} ${selectedStatus === 'completed' ? styles.dropdownItemActive : ''}`}
                  onClick={() => {
                    setSelectedStatus('completed');
                    setShowStatusDropdown(false);
                    setCurrentPage(1);
                  }}>
                  Hoàn thành
                </button>
                <button
                  className={`${styles.dropdownItem} ${selectedStatus === 'manual_review' ? styles.dropdownItemActive : ''}`}
                  onClick={() => {
                    setSelectedStatus('manual_review');
                    setShowStatusDropdown(false);
                    setCurrentPage(1);
                  }}>
                  Phúc tra
                </button>
                <button
                  className={`${styles.dropdownItem} ${selectedStatus === 'appealed' ? styles.dropdownItemActive : ''}`}
                  onClick={() => {
                    setSelectedStatus('appealed');
                    setShowStatusDropdown(false);
                    setCurrentPage(1);
                  }}>
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
                      {(submission.totalScore ?? submission.score) !== undefined ? (
                        <>
                          <span className={styles.scoreValue}>
                            {(submission.totalScore ?? submission.score).toFixed(1)}/{submission.maxScore}
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
                        <div className={styles.answerOption}>
                          <span className={styles.optionLabel}>Điểm:</span>
                          <span className={`${styles.optionValue} ${answer.isCorrect ? styles.correctAnswer : styles.wrongAnswer}`}>
                            +{answer.score.toFixed(1)}/{answer.maxScore.toFixed(1)}
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
              <button
                className={styles.downloadBtn}
                style={{ borderColor: '#7c3aed', color: '#7c3aed' }}
                onClick={() => {
                  setOverrideQuestionId('');
                  setOverrideNewAnswer('');
                  setOverrideReason('Manual override by teacher');
                  setShowOverrideModal(true);
                }}>
                Điều chỉnh điểm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Override Score Modal */}
      {showOverrideModal && selectedSubmission ? (
        <div className={styles.modalOverlay} onClick={() => setShowOverrideModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className={styles.modalHeader}>
              <h2 style={{ margin: 0, fontSize: '16px' }}>Điều chỉnh điểm</h2>
              <button className={styles.closeBtn} onClick={() => setShowOverrideModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                Học sinh: <strong>{selectedSubmission.studentName}</strong><br />
                Điểm hiện tại: <strong>{((selectedSubmission.totalScore ?? selectedSubmission.score) ?? 0).toFixed(1)} / {selectedSubmission.maxScore}</strong>
              </p>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontWeight: 600, fontSize: "13px", color: "#334155", display: "block", marginBottom: "6px" }}>Câu hỏi cần sửa</label>
                <select
                  value={overrideQuestionId}
                  onChange={(e) => setOverrideQuestionId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">-- Chọn câu hỏi --</option>
                  {getAnswerDetails(selectedSubmission).map((ans) => (
                    <option key={ans.questionId} value={ans.questionId}>
                      Câu {ans.questionId}: Đáp án hiện tại "{ans.studentAnswer || 'Không trả lời'}"
                      {ans.isCorrect ? ' (Đúng)' : ' (Sai)'}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontWeight: 600, fontSize: "13px", color: "#334155", display: "block", marginBottom: "6px" }}>Đáp án mới</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['A', 'B', 'C', 'D'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setOverrideNewAnswer(opt)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        border: `1px solid ${overrideNewAnswer === opt ? '#7c3aed' : '#cbd5e1'}`,
                        borderRadius: '6px',
                        background: overrideNewAnswer === opt ? '#7c3aed' : '#fff',
                        color: overrideNewAnswer === opt ? '#fff' : '#334155',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontWeight: 600, fontSize: "13px", color: "#334155", display: "block", marginBottom: "6px" }}>Lý do</label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Nhập lý do điều chỉnh"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setShowOverrideModal(false)}>
                Hủy
              </button>
              <button
                className={styles.downloadBtn}
                style={{ backgroundColor: '#7c3aed', color: '#ffffff' }}
                onClick={async () => {
                  if (!overrideQuestionId) {
                    toast.error('Vui lòng chọn câu hỏi cần sửa');
                    return;
                  }
                  if (!overrideNewAnswer) {
                    toast.error('Vui lòng chọn đáp án mới');
                    return;
                  }
                  try {
                    await apiService.post(`/submissions/${selectedSubmission._id}/override`, {
                      position: parseInt(overrideQuestionId, 10),
                      correctedAnswer: overrideNewAnswer,
                      reason: overrideReason,
                    });
                    toast.success('Điều chỉnh điểm thành công');
                    setShowOverrideModal(false);
                    fetchByExam(selectedSubmission.examId);
                    setSelectedSubmission(null);
                  } catch {
                    toast.error('Điều chỉnh điểm thất bại');
                  }
                }}>
                Lưu điểm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};