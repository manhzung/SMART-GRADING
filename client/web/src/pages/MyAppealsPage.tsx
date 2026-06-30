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
  Clock,
  CheckCircle,
  XCircle,
  FileQuestion,
  MessageSquare,
  BookOpen,
  Scale,
  ArrowRight,
  Check,
} from 'lucide-react';
import { useStudentStore } from '../presentation/store/studentStore';
import type { StudentExamAppeal } from '../presentation/store/studentStore';
import styles from './MyAppealsPage.module.css';

export default function MyAppealsPage() {
  const {
    appeals,
    isLoadingAppeals,
    appealsError,
    appealsPagination,
    fetchAppeals,
  } = useStudentStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  const [selectedAppeal, setSelectedAppeal] = useState<StudentExamAppeal | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchAppeals({
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      page: currentPage,
      limit: pageSize,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus, currentPage, pageSize, startDate, endDate]);

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
  }, [searchQuery, startDate, endDate, selectedStatus]);

  // Toast for error
  const [showToast, setShowToast] = useState(false);
  useEffect(() => {
    if (appealsError) {
      setShowToast(true);
      const t = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(t);
    }
  }, [appealsError]);

  const stats = useMemo(() => {
    return {
      total: appealsPagination.total,
      pending: appeals.filter((a) => a.status === 'pending').length,
      reviewing: appeals.filter((a) => a.status === 'under_review').length,
      approved: appeals.filter((a) => a.status === 'approved').length,
      rejected: appeals.filter((a) => a.status === 'rejected').length,
    };
  }, [appeals, appealsPagination.total]);

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

  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'pending': return { text: 'Pending', class: styles.pendingBadge, icon: Clock };
      case 'under_review': return { text: 'Under review', class: styles.reviewingBadge, icon: Eye };
      case 'approved': return { text: 'Approved', class: styles.approvedBadge, icon: CheckCircle };
      case 'rejected': return { text: 'Rejected', class: styles.rejectedBadge, icon: XCircle };
      default: return { text: 'Unknown', class: styles.pendingBadge, icon: Clock };
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'under_review', label: 'Under review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const filteredAppeals = useMemo(() => {
    if (!searchQuery.trim()) return appeals;
    const q = searchQuery.toLowerCase();
    return appeals.filter((a) =>
      (a.examTitle || '').toLowerCase().includes(q) ||
      a.reason.toLowerCase().includes(q)
    );
  }, [appeals, searchQuery]);

  const totalItems = appealsPagination.total;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const indexOfLastItem = currentPage * pageSize;
  const indexOfFirstItem = indexOfLastItem - pageSize;
  const currentItems = filteredAppeals.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className={styles.container}>
      {showToast && (
        <div className={`${styles.toast} ${styles.toastError}`}>
          <XCircle size={18} />
          <span>{appealsError}</span>
        </div>
      )}

      <nav className={styles.breadcrumb}>
        <span>Workspace</span>
        <span className={styles.breadcrumbSeparator}>&gt;</span>
        <span className={styles.breadcrumbActive}>Phúc khảo</span>
      </nav>

      <div className={styles.header}>
        <h1 className={styles.title}>Phúc khảo</h1>
      </div>

      <div className={styles.statsCards}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper}>
            <Scale size={20} />
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

      <div className={styles.filterBar}>
        <div className={styles.filtersGroupLeft}>
          <div className={styles.searchContainer}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Tìm theo tên bài thi hoặc lý do..."
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
              <th>CÂU HỎI</th>
              <th>LÝ DO</th>
              <th>NGÀY GỬI</th>
              <th>TRẠNG THÁI</th>
              <th style={{ textAlign: 'center' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingAppeals ? (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>Đang tải...</td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>Chưa có đơn phúc khảo nào</td>
              </tr>
            ) : (
              currentItems.map((appeal) => {
                const statusDetails = getStatusDetails(appeal.status);
                const StatusIcon = statusDetails.icon;
                return (
                  <tr key={appeal._id} className={styles.tableRow}>
                    <td>
                      <div className={styles.examCell}>
                        <span className={styles.examTitle}>{appeal.examTitle}</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.questionBadge}>
                        <FileQuestion size={12} />
                        Câu {appeal.questionPosition}
                      </span>
                    </td>
                    <td>
                      <div className={styles.reasonCell} title={appeal.reason}>
                        <MessageSquare size={14} className={styles.reasonIcon} />
                        <span className={styles.reasonText}>
                          {appeal.reason.length > 40 ? appeal.reason.slice(0, 40) + '...' : appeal.reason}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.dateText}>{formatDate(appeal.createdAt)}</span>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${statusDetails.class}`}>
                        <StatusIcon size={14} />
                        {statusDetails.text}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className={styles.viewBtn} onClick={() => setSelectedAppeal(appeal)}>
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

      {selectedAppeal && (
        <div className={styles.modalOverlay} onClick={() => setSelectedAppeal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Chi tiết phúc khảo</h2>
              <button className={styles.closeBtn} onClick={() => setSelectedAppeal(null)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalContent}>
              <div className={styles.statusTimeline}>
                <div className={`${styles.timelineStep} ${styles.timelineStepCompleted}`}>
                  <div className={styles.timelineDot}>
                    <Check size={12} />
                  </div>
                  <span className={`${styles.timelineStepLabel} ${styles.timelineStepCompleted}`}>Đã gửi</span>
                </div>
                <div className={styles.timelineLine} />
                <div className={`${styles.timelineStep} ${
                  selectedAppeal.status === 'under_review'
                    ? styles.timelineStepActive
                    : (selectedAppeal.status === 'approved' || selectedAppeal.status === 'rejected')
                    ? styles.timelineStepCompleted
                    : ''
                }`}>
                  <div className={styles.timelineDot}>
                    {(selectedAppeal.status === 'approved' || selectedAppeal.status === 'rejected') && <Check size={12} />}
                  </div>
                  <span className={styles.timelineStepLabel}>Đang xem xét</span>
                </div>
                <div className={styles.timelineLine} />
                <div className={`${styles.timelineStep} ${
                  (selectedAppeal.status === 'approved' || selectedAppeal.status === 'rejected')
                    ? styles.timelineStepCompleted
                    : ''
                }`}>
                  <div className={styles.timelineDot}>
                    {selectedAppeal.status === 'approved' && <Check size={12} />}
                    {selectedAppeal.status === 'rejected' && <X size={12} />}
                  </div>
                  <span className={styles.timelineStepLabel}>
                    {selectedAppeal.status === 'approved' ? 'Đã duyệt' :
                     selectedAppeal.status === 'rejected' ? 'Đã từ chối' : 'Chưa xử lý'}
                  </span>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <BookOpen size={16} />
                  Thông tin bài thi
                </h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Tên bài thi</span>
                    <span className={styles.infoValue}>{selectedAppeal.examTitle}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Câu hỏi</span>
                    <span className={styles.infoValue}>Câu {selectedAppeal.questionPosition}</span>
                  </div>
                </div>
              </div>

              {selectedAppeal.questionContent && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <FileQuestion size={16} />
                    Nội dung câu hỏi
                  </h3>
                  <div className={styles.questionContentBox}>
                    {selectedAppeal.questionContent}
                  </div>
                </div>
              )}

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <MessageSquare size={16} />
                  Lý do phúc khảo
                </h3>
                <div className={styles.reasonBox}>
                  <p className={styles.reasonTextLarge}>{selectedAppeal.reason}</p>
                </div>
              </div>

              {selectedAppeal.teacherResponse && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    {selectedAppeal.teacherResponse.decision === 'approved' ? (
                      <CheckCircle size={16} />
                    ) : (
                      <XCircle size={16} />
                    )}
                    Phản hồi từ giáo viên
                  </h3>
                  <div className={`${styles.responseBox} ${
                    selectedAppeal.teacherResponse.decision === 'rejected' ? styles.responseBoxRejected : ''
                  }`}>
                    {selectedAppeal.teacherResponse.note && (
                      <p className={`${styles.responseText} ${
                        selectedAppeal.teacherResponse.decision === 'rejected' ? styles.responseTextRejected : ''
                      }`}>
                        {selectedAppeal.teacherResponse.note}
                      </p>
                    )}
                    {selectedAppeal.teacherResponse.scoreAdjustment && (
                      <div className={styles.scoreAdjustment}>
                        <span className={styles.oldScore}>
                          {selectedAppeal.teacherResponse.scoreAdjustment.oldScore} điểm
                        </span>
                        <ArrowRight size={16} className={styles.arrowIcon} />
                        <span className={styles.newScore}>
                          {selectedAppeal.teacherResponse.scoreAdjustment.newScore} điểm
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className={styles.section}>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Ngày gửi</span>
                    <span className={styles.infoValue}>{formatDate(selectedAppeal.createdAt)}</span>
                  </div>
                  {selectedAppeal.teacherResponse?.reviewedAt && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Ngày phản hồi</span>
                      <span className={styles.infoValue}>{formatDate(selectedAppeal.teacherResponse.reviewedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.closeModalBtn} onClick={() => setSelectedAppeal(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
