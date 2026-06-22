import { useEffect, useMemo, useState, useRef } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Calendar,
  RotateCcw,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  X,
  User,
  BookOpen,
  FileQuestion,
  MessageSquare,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useAppealStore } from '../presentation/store/appealStore';
import { useExamStore } from '../presentation/store/examStore';
import type { AppealStatus } from '../types';
import styles from './AppealsPage.module.css';

// Extended Appeal interface with mock data fields
interface Appeal {
  _id: string;
  submissionId: string;
  examId: string;
  studentId: string;
  studentName: string;
  studentCode?: string;
  className: string;
  questionId: string;
  questionPosition: number;
  questionContent: string;
  reason: string;
  currentAnswer: string;
  expectedAnswer: string;
  status: AppealStatus;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  createdAt: string;
}

// Helper: map backend appeal to UI model
function mapBackendAppeal(a: import('../presentation/store/appealStore').BackendAppeal): Appeal {
  const questionIdObj = typeof a.questionId === 'object' ? a.questionId as { _id: string; content: string } : null;
  return {
    _id: a._id,
    submissionId: a.submissionId,
    examId: typeof a.examId === 'object' ? (a.examId as { _id: string })._id : (a.examId as string),
    studentId: typeof a.studentId === 'object' ? (a.studentId as { _id: string })._id : (a.studentId as string),
    studentName: typeof a.studentId === 'object' ? (a.studentId as { name: string }).name : '',
    studentCode: typeof a.studentId === 'object' ? (a.studentId as { studentCode?: string }).studentCode : undefined,
    className: '',
    questionId: questionIdObj ? questionIdObj._id : (a.questionId as string),
    questionPosition: a.questionPosition,
    questionContent: questionIdObj?.content || '',
    reason: a.reason,
    currentAnswer: a.currentAnswer || '',
    expectedAnswer: a.expectedAnswer || '',
    status: a.status === 'under_review' ? 'reviewing' : (a.status as AppealStatus),
    resolvedBy: typeof a.teacherResponse?.reviewedBy === 'object'
      ? (a.teacherResponse.reviewedBy as { _id: string })._id
      : (a.teacherResponse?.reviewedBy as string | undefined),
    resolvedAt: a.teacherResponse?.reviewedAt,
    resolutionNote: a.teacherResponse?.note,
    createdAt: a.createdAt,
  };
}

export default function AppealsPage() {
  // Appeals state from store
  const {
    appeals: backendAppeals,
    stats,
    error,
    fetchAppeals,
    reviewAppeal,
  } = useAppealStore();

  const appeals = useMemo(() => backendAppeals.map(mapBackendAppeal), [backendAppeals]);

  // Filter states
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dropdown UI states
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showExamDropdown, setShowExamDropdown] = useState(false);

  // Modal state
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Refs for dropdowns
  const statusRef = useRef<HTMLDivElement>(null);
  const examRef = useRef<HTMLDivElement>(null);

  // Get current user (mock teacher)

  // Fetch appeals on mount and when filters change
  useEffect(() => {
    fetchAppeals({
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      examId: selectedExam !== 'all' ? selectedExam : undefined,
      page: currentPage,
      limit: pageSize,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus, selectedExam, currentPage, pageSize]);

  // Fetch exam list for filter dropdown
  const { exams, fetchExams } = useExamStore();
  useEffect(() => {
    fetchExams({ status: 'completed' });
  }, [fetchExams]);

  const showToastNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const filteredAppeals = useMemo(() => {
    let result = [...appeals];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a => a.studentName.toLowerCase().includes(query));
    }

    if (startDate) {
      result = result.filter(a => new Date(a.createdAt) >= new Date(startDate));
    }
    if (endDate) {
      result = result.filter(a => new Date(a.createdAt) <= new Date(endDate + 'T23:59:59'));
    }

    return result;
  }, [appeals, searchQuery, startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, startDate, endDate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
      if (examRef.current && !examRef.current.contains(event.target as Node)) {
        setShowExamDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset filters
  const handleResetFilters = () => {
    setSelectedStatus('all');
    setSelectedExam('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Show error as toast
  useEffect(() => {
    if (error) {
      showToastNotification('Lỗi: ' + error);
    }
  }, [error]);

  // Review appeal
  const handleReview = async (appealId: string, newStatus: 'approved' | 'rejected', note?: string) => {
    try {
      await reviewAppeal(appealId, {
        decision: newStatus,
        note: note || resolutionNotes,
      });
      await fetchAppeals({
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        examId: selectedExam !== 'all' ? selectedExam : undefined,
        page: currentPage,
        limit: pageSize,
      });
      setSelectedAppeal(null);
      setResolutionNotes('');
      showToastNotification(
        newStatus === 'approved'
          ? 'Yêu cầu phúc tra đã được chấp nhận!'
          : 'Yêu cầu phúc tra đã bị từ chối!'
      );
      await fetchAppeals({
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        examId: selectedExam !== 'all' ? selectedExam : undefined,
        page: currentPage,
        limit: pageSize,
      });
    } catch {
      showToastNotification('Có lỗi xảy ra khi xử lý phúc tra!');
    }
  };

  // Get status badge details
  const getStatusDetails = (status: AppealStatus) => {
    switch (status) {
      case 'pending':
        return { text: 'Chờ duyệt', class: styles.pendingBadge, icon: Clock };
      case 'reviewing':
        return { text: 'Đang xem xét', class: styles.reviewingBadge, icon: Eye };
      case 'approved':
        return { text: 'Đã duyệt', class: styles.approvedBadge, icon: CheckCircle };
      case 'rejected':
        return { text: 'Đã từ chối', class: styles.rejectedBadge, icon: XCircle };
      default:
        return { text: 'Không xác định', class: styles.pendingBadge, icon: Clock };
    }
  };

  // Get exam title by ID
  const getExamTitle = (examId: string) => {
    const exam = exams.find(e => e._id === examId);
    return exam?.title || 'Không xác định';
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Format date with time
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get student code from appeal data
  const getStudentCode = (appeal: Appeal) => {
    return appeal.studentCode || appeal.studentId;
  };

  // Pagination calculation
  const totalItems = filteredAppeals.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const indexOfLastItem = currentPage * pageSize;
  const indexOfFirstItem = indexOfLastItem - pageSize;
  const currentItems = filteredAppeals.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Status options for dropdown
  const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'pending', label: 'Chờ duyệt' },
    { value: 'under_review', label: 'Đang xem xét' },
    { value: 'approved', label: 'Đã duyệt' },
    { value: 'rejected', label: 'Đã từ chối' },
  ];

  return (
    <div className={styles.container}>
      {/* Toast Notification */}
      {showToast && (
        <div className={styles.toast}>
          <CheckCircle size={18} className={styles.toastIcon} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <span>Workspace</span>
        <span className={styles.breadcrumbSeparator}>&gt;</span>
        <span className={styles.breadcrumbActive}>Quản lý phúc tra</span>
      </nav>

      {/* Title */}
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý phúc tra</h1>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsCards}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper}>
            <FileText size={20} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>TỔNG SỐ</span>
            <h3 className={styles.statValue}>{stats.total}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.pendingIcon}`}>
            <Clock size={20} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>CHỜ DUYỆT</span>
            <h3 className={styles.statValue}>{stats.pending}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.reviewingIcon}`}>
            <Eye size={20} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>ĐANG XEM XÉT</span>
            <h3 className={styles.statValue}>{stats.reviewing}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.approvedIcon}`}>
            <CheckCircle size={20} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>ĐÃ DUYỆT</span>
            <h3 className={styles.statValue}>{stats.approved}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.rejectedIcon}`}>
            <XCircle size={20} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>ĐÃ TỪ CHỐI</span>
            <h3 className={styles.statValue}>{stats.rejected}</h3>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filtersGroupLeft}>
          {/* Search */}
          <div className={styles.searchContainer}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Tìm theo tên học sinh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          {/* Status dropdown */}
          <div className={styles.dropdownWrapper} ref={statusRef}>
            <button
              className={styles.filterDropdownBtn}
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            >
              <SlidersHorizontal size={14} className={styles.btnIconLeft} />
              <span>
                {selectedStatus === 'all'
                  ? 'Trạng thái'
                  : statusOptions.find(s => s.value === selectedStatus)?.label || 'Trạng thái'}
              </span>
              <ChevronDown size={14} className={styles.btnChevron} />
            </button>
            {showStatusDropdown && (
              <div className={styles.dropdownMenu}>
                {statusOptions.map(option => (
                  <button
                    key={option.value}
                    className={`${styles.dropdownItem} ${selectedStatus === option.value ? styles.dropdownItemActive : ''}`}
                    onClick={() => {
                      setSelectedStatus(option.value);
                      setShowStatusDropdown(false);
                      setCurrentPage(1);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Exam dropdown */}
          <div className={styles.dropdownWrapper} ref={examRef}>
            <button
              className={styles.filterDropdownBtn}
              onClick={() => setShowExamDropdown(!showExamDropdown)}
            >
              <BookOpen size={14} className={styles.btnIconLeft} />
              <span>
                {selectedExam === 'all'
                  ? 'Tất cả bài thi'
                  : exams.find(e => e._id === selectedExam)?.title?.slice(0, 25) + '...' || 'Bài thi'}
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
                {exams.map(exam => (
                  <button
                    key={exam._id}
                    className={`${styles.dropdownItem} ${selectedExam === exam._id ? styles.dropdownItemActive : ''}`}
                    onClick={() => {
                      setSelectedExam(exam._id);
                      setShowExamDropdown(false);
                      setCurrentPage(1);
                    }}
                  >
                    {exam.title.length > 35 ? exam.title.slice(0, 35) + '...' : exam.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div className={styles.datePickerContainer}>
            <Calendar size={14} className={styles.calendarIcon} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={styles.dateInput}
            />
            <span className={styles.dateSeparator}>-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={styles.dateInput}
            />
          </div>
        </div>

        {/* Reset button */}
        <button className={styles.resetBtn} onClick={handleResetFilters}>
          <RotateCcw size={14} />
          <span>Đặt lại</span>
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>HỌC SINH</th>
              <th>BÀI THI</th>
              <th>CÂU HỎI</th>
              <th>LÝ DO</th>
              <th>TRẠNG THÁI</th>
              <th>NGÀY GỬI</th>
              <th style={{ textAlign: 'center' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyRow}>
                  Chưa có yêu cầu phúc tra nào
                </td>
              </tr>
            ) : (
              currentItems.map((appeal) => {
                const statusDetails = getStatusDetails(appeal.status);
                const StatusIcon = statusDetails.icon;

                return (
                  <tr key={appeal._id} className={styles.tableRow}>
                    {/* Student */}
                    <td>
                      <div className={styles.studentCell}>
                        <div className={styles.avatar}>
                          {appeal.studentName.charAt(0)}
                        </div>
                        <div className={styles.studentInfo}>
                          <span className={styles.studentName}>{appeal.studentName}</span>
                          <span className={styles.studentClass}>{appeal.className}</span>
                        </div>
                      </div>
                    </td>

                    {/* Exam */}
                    <td>
                      <span className={styles.examTitle}>
                        {getExamTitle(appeal.examId).length > 30
                          ? getExamTitle(appeal.examId).slice(0, 30) + '...'
                          : getExamTitle(appeal.examId)}
                      </span>
                    </td>

                    {/* Question */}
                    <td>
                      <span className={styles.questionNumber}>
                        <FileQuestion size={14} className={styles.questionIcon} />
                        Câu {appeal.questionPosition}
                      </span>
                    </td>

                    {/* Reason (truncated) */}
                    <td>
                      <div className={styles.reasonCell} title={appeal.reason}>
                        <MessageSquare size={14} className={styles.reasonIcon} />
                        <span className={styles.reasonText}>
                          {appeal.reason.length > 40
                            ? appeal.reason.slice(0, 40) + '...'
                            : appeal.reason}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`${styles.statusBadge} ${statusDetails.class}`}>
                        <StatusIcon size={14} />
                        {statusDetails.text}
                      </span>
                    </td>

                    {/* Submitted Date */}
                    <td>
                      <span className={styles.dateText}>{formatDate(appeal.createdAt)}</span>
                    </td>

                    {/* Actions */}
                    <td>
                      <button
                        className={styles.reviewBtn}
                        onClick={() => setSelectedAppeal(appeal)}
                      >
                        <Eye size={14} />
                        Xem
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className={styles.paginationRow}>
        <div className={styles.paginationLeft}>
          Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, totalItems)} trong tổng số {totalItems} bản ghi
        </div>
        <div className={styles.paginationRight}>
          <div className={styles.pageSizeSelector}>
            <span>Số dòng mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className={styles.pageSizeSelect}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

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

      {/* Appeal Detail Modal */}
      {selectedAppeal && (
        <div className={styles.modalOverlay} onClick={() => setSelectedAppeal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Chi tiết yêu cầu phúc tra</h2>
              <button className={styles.closeBtn} onClick={() => setSelectedAppeal(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className={styles.modalContent}>
              {/* Status Timeline */}
              <div className={styles.statusTimeline}>
                <div className={`${styles.timelineStep} ${selectedAppeal.status !== 'pending' ? styles.timelineStepCompleted : styles.timelineStepActive}`}>
                  <div className={styles.timelineDot}>
                    {selectedAppeal.status !== 'pending' && <Check size={12} />}
                  </div>
                  <span>Đã gửi</span>
                  <span className={styles.timelineDate}>{formatDate(selectedAppeal.createdAt)}</span>
                </div>
                <div className={styles.timelineLine}></div>
                <div className={`${styles.timelineStep} ${selectedAppeal.status === 'reviewing' || selectedAppeal.status === 'under_review' ? styles.timelineStepActive : selectedAppeal.status === 'approved' || selectedAppeal.status === 'rejected' ? styles.timelineStepCompleted : ''}`}>
                  <div className={styles.timelineDot}>
                    {(selectedAppeal.status === 'approved' || selectedAppeal.status === 'rejected') && <Check size={12} />}
                  </div>
                  <span>Đang xem xét</span>
                  {(selectedAppeal.status === 'reviewing' || selectedAppeal.status === 'under_review') && <span className={styles.timelineDate}>Đang xử lý</span>}
                </div>
                <div className={styles.timelineLine}></div>
                <div className={`${styles.timelineStep} ${selectedAppeal.status === 'approved' || selectedAppeal.status === 'rejected' ? styles.timelineStepCompleted : ''}`}>
                  <div className={styles.timelineDot}>
                    {selectedAppeal.status === 'approved' && <Check size={12} />}
                    {selectedAppeal.status === 'rejected' && <X size={12} />}
                  </div>
                  <span>{selectedAppeal.status === 'approved' ? 'Đã chấp nhận' : selectedAppeal.status === 'rejected' ? 'Đã từ chối' : 'Chưa xử lý'}</span>
                  {selectedAppeal.resolvedAt && <span className={styles.timelineDate}>{formatDateTime(selectedAppeal.resolvedAt)}</span>}
                </div>
              </div>

              {/* Student Info */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <User size={16} />
                  Thông tin học sinh
                </h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Họ và tên</span>
                    <span className={styles.infoValue}>{selectedAppeal.studentName}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Lớp</span>
                    <span className={styles.infoValue}>{selectedAppeal.className}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Mã học sinh</span>
                    <span className={styles.infoValue}>{getStudentCode(selectedAppeal)}</span>
                  </div>
                </div>
              </div>

              {/* Exam Info */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <BookOpen size={16} />
                  Thông tin bài thi
                </h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Tên bài thi</span>
                    <span className={styles.infoValue}>{getExamTitle(selectedAppeal.examId)}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Ngày thi</span>
                    <span className={styles.infoValue}>
                      {formatDate(exams.find(e => e._id === selectedAppeal.examId)?.examDate || '')}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Tổng điểm</span>
                    <span className={styles.infoValue}>
                      {exams.find(e => e._id === selectedAppeal.examId)?.totalScore || 10}
                    </span>
                  </div>
                </div>
              </div>

              {/* Question Detail */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <FileQuestion size={16} />
                  Chi tiết câu hỏi
                </h3>
                <div className={styles.questionCard}>
                  <div className={styles.questionContent}>
                    <span className={styles.questionLabel}>Nội dung câu hỏi:</span>
                    <p className={styles.questionText}>{selectedAppeal.questionContent || `Câu hỏi số ${selectedAppeal.questionPosition}`}</p>
                  </div>
                  {(selectedAppeal.currentAnswer || selectedAppeal.expectedAnswer) && (
                    <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '10px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#c2410c', marginBottom: '4px', textTransform: 'uppercase' }}>Đáp án học sinh đã chọn</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#ea580c' }}>
                          {selectedAppeal.currentAnswer
                            ? `${selectedAppeal.currentAnswer} ${selectedAppeal.expectedAnswer && selectedAppeal.currentAnswer !== selectedAppeal.expectedAnswer ? '✗' : '✓'}`
                            : <span style={{ fontStyle: 'italic', fontWeight: 400, color: '#9ca3af' }}>Không trả lời</span>
                          }
                        </div>
                      </div>
                      <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#15803d', marginBottom: '4px', textTransform: 'uppercase' }}>Đáp án đúng</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#16a34a' }}>
                          {selectedAppeal.expectedAnswer || '—'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Appeal Reason */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <MessageSquare size={16} />
                  Lý do phúc tra
                </h3>
                <div className={styles.reasonBox}>
                  <p className={styles.reasonTextLarge}>{selectedAppeal.reason}</p>
                </div>
              </div>

              {/* Resolution Notes (when resolving) */}
              {selectedAppeal.status === 'pending' || selectedAppeal.status === 'reviewing' || selectedAppeal.status === 'under_review' ? (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <AlertCircle size={16} />
                    Ghi chú phúc tra
                  </h3>
                  <textarea
                    className={styles.resolutionTextarea}
                    placeholder="Nhập ghi chú về quyết định phúc tra (không bắt buộc)..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              ) : selectedAppeal.resolutionNote ? (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <AlertCircle size={16} />
                    Ghi chú phúc tra
                  </h3>
                  <div className={styles.resolutionBox}>
                    <p>{selectedAppeal.resolutionNote}</p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            {selectedAppeal.status === 'pending' || selectedAppeal.status === 'reviewing' || selectedAppeal.status === 'under_review' ? (
              <div className={styles.modalFooter}>
                <div className={styles.footerRight}>
                  <button
                    className={styles.rejectBtn}
                    onClick={() => handleReview(selectedAppeal._id, 'rejected', resolutionNotes)}
                  >
                    <XCircle size={16} />
                    Từ chối
                  </button>
                  <button
                    className={styles.approveBtn}
                    onClick={() => handleReview(selectedAppeal._id, 'approved', resolutionNotes)}
                  >
                    <CheckCircle size={16} />
                    Chấp nhận
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.modalFooter}>
                <button className={styles.closeModalBtn} onClick={() => setSelectedAppeal(null)}>
                  Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
