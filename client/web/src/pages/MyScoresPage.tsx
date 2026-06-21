import { useEffect, useMemo, useState, useRef } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Calendar,
  RotateCcw,
  Eye,
  X,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  MinusCircle,
  FileQuestion,
  Scale,
} from 'lucide-react';
import { useStudentStore } from '../presentation/store/studentStore';
import styles from './MyScoresPage.module.css';

type ScoreTab = 'overview' | 'questions' | 'appeals';

export default function MyScoresPage() {
  const {
    submissions,
    isLoadingSubmissions,
    submissionsPagination,
    submissionAppeals,
    isLoadingSubmissionAppeals,
    fetchSubmissions,
    fetchSubmissionAppeals,
    clearSubmissionAppeals,
  } = useStudentStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ScoreTab>('overview');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const selectedSubmission = useMemo(
    () => submissions.find((s) => s._id === selectedId) || null,
    [submissions, selectedId]
  );

  useEffect(() => {
    fetchSubmissions({
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      page: currentPage,
      limit: pageSize,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus, currentPage, pageSize]);

  useEffect(() => {
    if (selectedId) {
      fetchSubmissionAppeals(selectedId);
    } else {
      clearSubmissionAppeals();
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, startDate, endDate]);

  // Reset page when status changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus]);

  const stats = useMemo(() => {
    const total = submissionsPagination.total;
    const graded = submissions.filter((s) =>
      ['scanned', 'manual_review', 'completed'].includes(s.status)
    ).length;
    const appealed = submissions.filter((s) => s.status === 'appealed').length;
    return { total, graded, appealed };
  }, [submissions, submissionsPagination.total]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  const getScoreColorClass = (score: number, max: number) => {
    if (!max) return '';
    const ratio = score / max;
    if (ratio >= 0.8) return styles.scoreExcellent;
    if (ratio >= 0.5) return styles.scoreGood;
    return styles.scorePoor;
  };

  const getGradeClass = (score: number, max: number) => {
    if (!max) return '';
    const ratio = score / max;
    if (ratio >= 0.8) return styles.gradeExcellent;
    if (ratio >= 0.65) return styles.gradeGood;
    if (ratio >= 0.5) return styles.gradeAverage;
    return styles.gradePoor;
  };

  const getGradeText = (score: number, max: number) => {
    if (!max) return '-';
    const ratio = score / max;
    if (ratio >= 0.9) return 'Xuất sắc';
    if (ratio >= 0.8) return 'Giỏi';
    if (ratio >= 0.65) return 'Khá';
    if (ratio >= 0.5) return 'Trung bình';
    return 'Yếu';
  };

  const getSubmissionStatus = (status: string) => {
    switch (status) {
      case 'completed':
      case 'scanned':
      case 'manual_review':
        return { text: 'Đã chấm', class: styles.gradedBadge, icon: CheckCircle };
      case 'appealed':
        return { text: 'Đang phúc khảo', class: styles.appealedBadge, icon: Scale };
      case 'pending':
      case 'scanning':
        return { text: 'Đang xử lý', class: styles.pendingBadge, icon: MinusCircle };
      default:
        return { text: 'Không xác định', class: styles.pendingBadge, icon: MinusCircle };
    }
  };

  const getAppealStatus = (status: string) => {
    switch (status) {
      case 'pending': return { text: 'Chờ duyệt', class: styles.pendingBadge, icon: Clock };
      case 'under_review': return { text: 'Đang xem xét', class: styles.reviewingBadge, icon: Eye };
      case 'approved': return { text: 'Đã duyệt', class: styles.approvedBadge, icon: CheckCircle };
      case 'rejected': return { text: 'Đã từ chối', class: styles.rejectedBadge, icon: XCircle };
      default: return { text: 'Không xác định', class: styles.pendingBadge, icon: Clock };
    }
  };

  const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'pending', label: 'Đang xử lý' },
    { value: 'scanned', label: 'Đã quét' },
    { value: 'manual_review', label: 'Đang duyệt' },
    { value: 'completed', label: 'Hoàn thành' },
    { value: 'appealed', label: 'Đang phúc khảo' },
  ];

  const filteredSubmissions = useMemo(() => {
    if (!searchQuery.trim()) return submissions;
    const q = searchQuery.toLowerCase();
    return submissions.filter((s) =>
      (s.examId?.title || '').toLowerCase().includes(q)
    );
  }, [submissions, searchQuery]);

  const totalItems = submissionsPagination.total;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const indexOfLastItem = currentPage * pageSize;
  const indexOfFirstItem = indexOfLastItem - pageSize;
  const currentItems = filteredSubmissions.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumb}>
        <span>Workspace</span>
        <span className={styles.breadcrumbSeparator}>&gt;</span>
        <span className={styles.breadcrumbActive}>Điểm của tôi</span>
      </nav>

      <div className={styles.header}>
        <h1 className={styles.title}>Điểm của tôi</h1>
      </div>

      <div className={styles.statsCards}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper}>
            <FileText size={20} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>TỔNG BÀI THI</span>
            <h3 className={styles.statValue}>{stats.total}</h3>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.gradedIcon}`}>
            <CheckCircle size={20} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>ĐÃ CHẤM</span>
            <h3 className={styles.statValue}>{stats.graded}</h3>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.pendingIcon}`}>
            <Scale size={20} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>ĐANG PHÚC KHẢO</span>
            <h3 className={styles.statValue}>{stats.appealed}</h3>
          </div>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filtersGroupLeft}>
          <div className={styles.searchContainer}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Tìm theo tên bài thi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.dropdownWrapper} ref={statusRef}>
            <button
              className={styles.filterDropdownBtn}
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            >
              <SlidersHorizontal size={14} className={styles.btnIconLeft} />
              <span>
                {selectedStatus === 'all'
                  ? 'Trạng thái'
                  : statusOptions.find((s) => s.value === selectedStatus)?.label || 'Trạng thái'}
              </span>
              <ChevronDown size={14} className={styles.btnChevron} />
            </button>
            {showStatusDropdown && (
              <div className={styles.dropdownMenu}>
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`${styles.dropdownItem} ${selectedStatus === option.value ? styles.dropdownItemActive : ''}`}
                    onClick={() => {
                      setSelectedStatus(option.value);
                      setShowStatusDropdown(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

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

        <button className={styles.resetBtn} onClick={handleResetFilters}>
          <RotateCcw size={14} />
          <span>Đặt lại</span>
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>BÀI THI</th>
              <th>MÔN</th>
              <th>NGÀY NỘP</th>
              <th>ĐIỂM</th>
              <th>XẾP LOẠI</th>
              <th>TRẠNG THÁI</th>
              <th style={{ textAlign: 'center' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingSubmissions ? (
              <tr>
                <td colSpan={7} className={styles.emptyRow}>Đang tải...</td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyRow}>Chưa có bài thi nào</td>
              </tr>
            ) : (
              currentItems.map((submission) => {
                const statusDetails = getSubmissionStatus(submission.status);
                const StatusIcon = statusDetails.icon;
                return (
                  <tr key={submission._id} className={styles.tableRow}>
                    <td>
                      <div className={styles.examCell}>
                        <span className={styles.examTitle}>{submission.examId?.title || '-'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.subjectBadge}>
                        <span
                          className={styles.subjectDot}
                          style={{ backgroundColor: submission.subjectColor || '#64748b' }}
                        />
                        {submission.subjectName || 'Chưa phân loại'}
                      </span>
                    </td>
                    <td>
                      <span className={styles.dateText}>
                        {formatDate(submission.submittedAt || submission.createdAt)}
                      </span>
                    </td>
                    <td>
                      <div className={styles.scoreCell}>
                        <span className={`${styles.scoreValue} ${getScoreColorClass(submission.totalScore, submission.maxScore)}`}>
                          {submission.totalScore}
                        </span>
                        <span className={styles.scoreMax}>/ {submission.maxScore}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.gradeBadge} ${getGradeClass(submission.totalScore, submission.maxScore)}`}>
                        {getGradeText(submission.totalScore, submission.maxScore)}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${statusDetails.class}`}>
                        <StatusIcon size={14} />
                        {statusDetails.text}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className={styles.viewBtn}
                        onClick={() => {
                          setSelectedId(submission._id);
                          setActiveTab('overview');
                        }}
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

      <div className={styles.paginationRow}>
        <div className={styles.paginationLeft}>
          Hiển thị {Math.min(indexOfFirstItem + 1, totalItems)} - {Math.min(indexOfLastItem, totalItems)} trong tổng số {totalItems} bản ghi
        </div>
        <div className={styles.paginationRight}>
          <div className={styles.pageSizeSelector}>
            <span>Số dòng mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className={styles.pageSizeSelect}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <button className={styles.paginationNavBtn} disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: totalPages }).map((_, index) => {
            const pageNum = index + 1;
            if (totalPages > 5 && pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - currentPage) > 1) {
              if (pageNum === 2 || pageNum === totalPages - 1) return <span key={pageNum} className={styles.paginationEllipsis}>...</span>;
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
          <button className={styles.paginationNavBtn} disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {selectedSubmission && (
        <div className={styles.modalOverlay} onClick={() => setSelectedId(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{selectedSubmission.examId?.title || 'Chi tiết bài thi'}</h2>
              <button className={styles.closeBtn} onClick={() => setSelectedId(null)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.tabs}>
              <button className={`${styles.tab} ${activeTab === 'overview' ? styles.tabActive : ''}`} onClick={() => setActiveTab('overview')}>
                <FileText size={14} />
                Tổng quan
              </button>
              <button className={`${styles.tab} ${activeTab === 'questions' ? styles.tabActive : ''}`} onClick={() => setActiveTab('questions')}>
                <FileQuestion size={14} />
                Câu hỏi
              </button>
              <button className={`${styles.tab} ${activeTab === 'appeals' ? styles.tabActive : ''}`} onClick={() => setActiveTab('appeals')}>
                <Scale size={14} />
                Phúc khảo
              </button>
            </div>

            <div className={styles.modalContent}>
              {activeTab === 'overview' && (
                <div>
                  <div className={styles.overviewGrid}>
                    <div className={styles.overviewCard}>
                      <div className={styles.overviewLabel}>ĐIỂM SỐ</div>
                      <div className={`${styles.overviewValue} ${getScoreColorClass(selectedSubmission.totalScore, selectedSubmission.maxScore)}`}>
                        {selectedSubmission.totalScore}
                      </div>
                      <div className={styles.overviewSubtext}>trên {selectedSubmission.maxScore} điểm</div>
                    </div>
                    <div className={styles.overviewCard}>
                      <div className={styles.overviewLabel}>PHẦN TRĂM</div>
                      <div className={styles.overviewValue}>
                        {selectedSubmission.maxScore
                          ? `${Math.round((selectedSubmission.totalScore / selectedSubmission.maxScore) * 100)}%`
                          : 'N/A'}
                      </div>
                      <div className={styles.overviewSubtext}>
                        {getGradeText(selectedSubmission.totalScore, selectedSubmission.maxScore)}
                      </div>
                    </div>
                    <div className={styles.overviewCard}>
                      <div className={styles.overviewLabel}>NGÀY NỘP</div>
                      <div className={styles.overviewValue} style={{ fontSize: '16px' }}>
                        {formatDate(selectedSubmission.submittedAt || selectedSubmission.createdAt)}
                      </div>
                      <div className={styles.overviewSubtext}>
                        {selectedSubmission.examId?.duration ? `${selectedSubmission.examId.duration} phút` : '-'}
                      </div>
                    </div>
                  </div>

                  {selectedSubmission.answers && selectedSubmission.answers.length > 0 && (
                    <div className={styles.overviewGrid}>
                      <div className={styles.overviewCard}>
                        <div className={styles.overviewLabel}>ĐÚNG</div>
                        <div className={styles.overviewValue} style={{ color: '#16a34a' }}>
                          {selectedSubmission.answers.filter((a) => a.isCorrect).length}
                        </div>
                        <div className={styles.overviewSubtext}>câu</div>
                      </div>
                      <div className={styles.overviewCard}>
                        <div className={styles.overviewLabel}>SAI</div>
                        <div className={styles.overviewValue} style={{ color: '#dc2626' }}>
                          {selectedSubmission.answers.filter((a) => !a.isCorrect && a.selectedAnswer).length}
                        </div>
                        <div className={styles.overviewSubtext}>câu</div>
                      </div>
                      <div className={styles.overviewCard}>
                        <div className={styles.overviewLabel}>BỎ TRỐNG</div>
                        <div className={styles.overviewValue} style={{ color: '#94a3b8' }}>
                          {selectedSubmission.answers.filter((a) => !a.selectedAnswer).length}
                        </div>
                        <div className={styles.overviewSubtext}>câu</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'questions' && (
                <div>
                  {!selectedSubmission.answers || selectedSubmission.answers.length === 0 ? (
                    <div className={styles.noAppeals}>Chưa có kết quả chi tiết từng câu hỏi.</div>
                  ) : (
                    selectedSubmission.answers.map((answer) => {
                      const ResultIcon = answer.isCorrect ? CheckCircle : answer.selectedAnswer ? XCircle : MinusCircle;
                      return (
                        <div key={answer.questionId} className={styles.questionResultItem}>
                          <div className={styles.questionResultHeader}>
                            <div className={styles.questionResultInfo}>
                              <span className={styles.questionNumber}>
                                <FileQuestion size={14} className={styles.questionIcon} />
                                Câu {answer.position}
                              </span>
                              <span className={styles.questionScore}>
                                <span className={`${styles.scoreText} ${answer.isCorrect ? styles.correctText : answer.selectedAnswer ? styles.incorrectText : styles.unansweredText}`}>
                                  {answer.score} đ
                                </span>
                                <span className={`${styles.resultBadge} ${answer.isCorrect ? styles.correctBadge : answer.selectedAnswer ? styles.incorrectBadge : styles.unansweredBadge}`}>
                                  <ResultIcon size={12} />
                                  {answer.isCorrect ? 'Đúng' : answer.selectedAnswer ? 'Sai' : 'Bỏ trống'}
                                </span>
                              </span>
                            </div>
                          </div>
                          <div className={styles.questionResultBody}>
                            <div className={styles.answerBox}>
                              <span className={styles.answerLabel}>Câu trả lời của bạn</span>
                              <span className={`${styles.answerValue} ${answer.isCorrect ? styles.answerCorrect : answer.selectedAnswer ? styles.answerWrong : ''}`}>
                                {answer.selectedAnswer || 'Không trả lời'}
                              </span>
                            </div>
                            <div className={styles.answerBox}>
                              <span className={styles.answerLabel}>Đáp án đúng</span>
                              <span className={`${styles.answerValue} ${styles.answerCorrect}`}>
                                {answer.correctAnswer}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === 'appeals' && (
                <div>
                  {isLoadingSubmissionAppeals ? (
                    <div className={styles.noAppeals}>Đang tải...</div>
                  ) : submissionAppeals.length === 0 ? (
                    <div className={styles.noAppeals}>Bạn chưa gửi đơn phúc khảo nào cho bài thi này.</div>
                  ) : (
                    <div className={styles.appealsList}>
                      {submissionAppeals.map((appeal) => {
                        const statusDetails = getAppealStatus(appeal.status);
                        const StatusIcon = statusDetails.icon;
                        return (
                          <div key={appeal._id} className={styles.appealItem}>
                            <div className={styles.appealInfo}>
                              <div className={styles.appealHeader}>
                                <FileQuestion size={12} />
                                <span className={styles.appealQuestion}>Câu {appeal.questionPosition}</span>
                                <span className={`${styles.statusBadge} ${statusDetails.class}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                                  <StatusIcon size={10} />
                                  {statusDetails.text}
                                </span>
                              </div>
                              <div className={styles.appealReason}>{appeal.reason}</div>
                              {appeal.teacherResponse?.note && (
                                <div className={styles.appealResponse}>
                                  <strong>Phản hồi:</strong> {appeal.teacherResponse.note}
                                </div>
                              )}
                              <div className={styles.appealDate}>
                                Gửi: {formatDate(appeal.createdAt)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.closeModalBtn} onClick={() => setSelectedId(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
