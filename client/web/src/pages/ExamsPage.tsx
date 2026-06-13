import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  SlidersHorizontal,
  Calendar,
  RotateCcw,
  Eye,
  Edit,
  ClipboardList,
  CheckCircle,
  FileText
} from 'lucide-react';
import { useExamStore } from '../presentation/store/examStore';
import { useClassStore } from '../presentation/store/classStore';
import { buildExamFilters, mapExamListItem } from './examPageAdapters';
import styles from './ExamsPage.module.css';

export default function ExamsPage() {
  const navigate = useNavigate();
  const { exams: apiExams, fetchExams } = useExamStore();
  const { classes, fetchClasses } = useClassStore();

  const exams = useMemo(() => apiExams.map(mapExamListItem), [apiExams]);
  
  // Filtering states
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Dropdown UI states
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Checkbox row selection
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const classRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // Fetch API data on mount
  useEffect(() => {
    fetchExams({ status: selectedStatus !== 'all' ? selectedStatus : undefined });
    fetchClasses({ limit: 100 });
  }, [fetchExams, fetchClasses, selectedStatus]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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

  // Reset Filters handler
  const handleResetFilters = () => {
    setSelectedClass('all');
    setSelectedStatus('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const filteredExams = useMemo(() => buildExamFilters(exams, {
    selectedClass,
    selectedStatus,
    startDate,
    endDate,
  }), [exams, selectedClass, selectedStatus, startDate, endDate]);

  // Pagination calculation
  const totalItems = filteredExams.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const indexOfLastItem = currentPage * pageSize;
  const indexOfFirstItem = indexOfLastItem - pageSize;
  const currentItems = filteredExams.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Checkbox functions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedExamIds(currentItems.map(item => item._id));
    } else {
      setSelectedExamIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedExamIds(prev => [...prev, id]);
    } else {
      setSelectedExamIds(prev => prev.filter(item => item !== id));
    }
  };

  // Status mapping text and class names
  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'draft':
        return { text: 'Nháp', class: styles.draftBadge };
      case 'in_progress':
        return { text: 'Đang thi', class: styles.inProgressBadge };
      case 'completed':
        return { text: 'Hoàn thành', class: styles.completedBadge };
      case 'published':
      default:
        return { text: 'Đã xuất bản', class: styles.publishedBadge };
    }
  };

  const handleCreateBtnClick = () => {
    navigate('/exams/new');
  };

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <span>Workspace</span>
        <span className={styles.breadcrumbSeparator}>&gt;</span>
        <span className={styles.breadcrumbActive}>Quản lý bài thi</span>
      </nav>

      {/* Title & CTA button */}
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý bài thi</h1>
        <button className={styles.createBtn} onClick={handleCreateBtnClick}>
          <Plus size={16} />
          <span>Tạo bài thi mới</span>
        </button>
      </div>

      {/* Top Filter Bar (Horizontal white card) */}
      <div className={styles.filterBar}>
        <div className={styles.filtersGroupLeft}>
          {/* Class selector */}
          <div className={styles.dropdownWrapper} ref={classRef}>
            <button 
              className={styles.filterDropdownBtn} 
              onClick={() => setShowClassDropdown(!showClassDropdown)}
            >
              <GraduationCap size={16} className={styles.btnIconLeft} />
              <span>{selectedClass === 'all' ? 'Tất cả lớp' : `Lớp: ${selectedClass}`}</span>
              <ChevronDown size={14} className={styles.btnChevron} />
            </button>
            {showClassDropdown && (
              <div className={styles.dropdownMenu}>
                <button 
                  className={`${styles.dropdownItem} ${selectedClass === 'all' ? styles.dropdownItemActive : ''}`}
                  onClick={() => { setSelectedClass('all'); setShowClassDropdown(false); setCurrentPage(1); }}
                >
                  Tất cả lớp
                </button>
                {classes.map((classItem) => (
                  <button 
                    key={classItem._id}
                    className={`${styles.dropdownItem} ${selectedClass === classItem.name ? styles.dropdownItemActive : ''}`}
                    onClick={() => { setSelectedClass(classItem.name); setShowClassDropdown(false); setCurrentPage(1); }}
                  >
                    Lớp {classItem.name}
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
              <SlidersHorizontal size={14} className={styles.btnIconLeft} />
              <span>
                {selectedStatus === 'all' 
                  ? 'Trạng thái' 
                  : selectedStatus === 'draft' 
                    ? 'Nháp' 
                    : selectedStatus === 'in_progress' 
                      ? 'Đang thi' 
                      : selectedStatus === 'completed' 
                        ? 'Hoàn thành' 
                        : 'Đã xuất bản'}
              </span>
              <ChevronDown size={14} className={styles.btnChevron} />
            </button>
            {showStatusDropdown && (
              <div className={styles.dropdownMenu}>
                <button 
                  className={`${styles.dropdownItem} ${selectedStatus === 'all' ? styles.dropdownItemActive : ''}`}
                  onClick={() => { setSelectedStatus('all'); setShowStatusDropdown(false); setCurrentPage(1); }}
                >
                  Tất cả trạng thái
                </button>
                <button 
                  className={`${styles.dropdownItem} ${selectedStatus === 'draft' ? styles.dropdownItemActive : ''}`}
                  onClick={() => { setSelectedStatus('draft'); setShowStatusDropdown(false); setCurrentPage(1); }}
                >
                  Nháp
                </button>
                <button 
                  className={`${styles.dropdownItem} ${selectedStatus === 'in_progress' ? styles.dropdownItemActive : ''}`}
                  onClick={() => { setSelectedStatus('in_progress'); setShowStatusDropdown(false); setCurrentPage(1); }}
                >
                  Đang thi
                </button>
                <button 
                  className={`${styles.dropdownItem} ${selectedStatus === 'completed' ? styles.dropdownItemActive : ''}`}
                  onClick={() => { setSelectedStatus('completed'); setShowStatusDropdown(false); setCurrentPage(1); }}
                >
                  Hoàn thành
                </button>
                <button 
                  className={`${styles.dropdownItem} ${selectedStatus === 'published' ? styles.dropdownItemActive : ''}`}
                  onClick={() => { setSelectedStatus('published'); setShowStatusDropdown(false); setCurrentPage(1); }}
                >
                  Đã xuất bản
                </button>
              </div>
            )}
          </div>

          {/* Date Picker inputs */}
          <div className={styles.datePickerContainer}>
            <Calendar size={14} className={styles.calendarIcon} />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className={styles.dateInput}
            />
            <span className={styles.dateSeparator}>-</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className={styles.dateInput}
            />
          </div>
        </div>

        {/* Reset filters button */}
        <button className={styles.resetBtn} onClick={handleResetFilters}>
          <RotateCcw size={14} />
          <span>Đặt lại</span>
        </button>
      </div>

      {/* Main Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input 
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={currentItems.length > 0 && selectedExamIds.length === currentItems.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th>TÊN BÀI KIỂM TRA</th>
              <th>LỚP</th>
              <th>NGÀY THI</th>
              <th>THỜI GIAN</th>
              <th>SỐ CÂU</th>
              <th>TRẠNG THÁI</th>
              <th>PHIÊN BẢN</th>
              <th>NỘP BÀI</th>
              <th style={{ textAlign: 'center' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={10} className={styles.emptyRow}>
                  Chưa tìm thấy bài kiểm tra nào phù hợp
                </td>
              </tr>
            ) : (
              currentItems.map((exam) => {
                const statusDetails = getStatusDetails(exam.status);
                const isSelected = selectedExamIds.includes(exam._id);
                
                // Submissions progress math
                const submissionProgress = exam.submissionsTotal > 0 
                  ? (exam.submissionsCurrent / exam.submissionsTotal) * 100 
                  : 0;

                return (
                  <tr key={exam._id} className={`${styles.tableRow} ${isSelected ? styles.rowSelected : ''}`}>
                    {/* Checkbox column */}
                    <td>
                      <input 
                        type="checkbox"
                        className={styles.checkboxInput}
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(exam._id, e.target.checked)}
                      />
                    </td>

                    {/* Exam Name & ID */}
                    <td>
                      <div className={styles.examNameCell}>
                        <Link to={`/exams/${exam._id}`} className={styles.examTitleLink}>
                          <h3 className={styles.examTitle}>{exam.title}</h3>
                        </Link>
                        <span className={styles.examId}>ID: {exam._id}</span>
                      </div>
                    </td>

                    {/* Class */}
                    <td>
                      <span className={styles.textMedium}>{exam.classNames.join(', ')}</span>
                    </td>

                    {/* Date */}
                    <td>
                      <span className={styles.textMedium}>{exam.date}</span>
                    </td>

                    {/* Duration */}
                    <td>
                      <span className={styles.textMedium}>{exam.duration}</span>
                    </td>

                    {/* Question Count */}
                    <td>
                      <span className={styles.textSemibold}>{exam.questionCount}</span>
                    </td>

                    {/* Status badge */}
                    <td>
                      <span className={`${styles.statusBadge} ${statusDetails.class}`}>
                        {statusDetails.text}
                      </span>
                    </td>

                    {/* Variants Count */}
                    <td>
                      <span className={styles.textMedium}>{exam.variantsCount} đề</span>
                    </td>

                    {/* Submissions (progress bar or text) */}
                    <td>
                      <div className={styles.submissionsContainer}>
                        <span className={styles.submissionsText}>{exam.submissionsText}</span>
                        {exam.status === 'in_progress' && (
                          <div className={styles.progressLineWrapper}>
                            <div className={styles.progressLine} style={{ width: `${submissionProgress}%` }} />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Direct Actions (Eye & Pencil) */}
                    <td>
                      <div className={styles.directActionsWrapper}>
                        <Link to={`/exams/${exam._id}`} className={styles.directActionBtn} title="Xem chi tiết">
                          <Eye size={16} />
                        </Link>
                        <button 
                          className={styles.directActionBtn} 
                          title="Chỉnh sửa"
                          onClick={() => navigate(`/exams/${exam._id}/edit`)}
                        >
                          <Edit size={15} />
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

      {/* Pagination Footer */}
      <div className={styles.paginationRow}>
        <div className={styles.paginationLeft}>
          {totalItems === 0
            ? 'Không có bản ghi nào'
            : `Hiển thị ${indexOfFirstItem + 1} - ${Math.min(indexOfLastItem, totalItems)} trong tổng số ${totalItems} bản ghi`}
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

      {/* Bottom Section Panel (3 large cards) */}
      <div className={styles.bottomSection}>
        {/* Compute stats from exam data */}
        {(() => {
          const inProgressCount = exams.filter(e => e.status === 'in_progress').length;
          const completedCount = exams.filter(e => e.status === 'completed').length;
          const draftCount = exams.filter(e => e.status === 'draft').length;
          return (
            <>
              {/* Card 1: ĐANG DIỄN RA */}
              <div className={styles.bottomDashboardCard}>
                <div className={styles.cardTopRow}>
                  <div className={`${styles.dashboardIconWrapper} ${styles.blueIconBg}`}>
                    <ClipboardList size={18} />
                  </div>
                  <span className={styles.dashboardTimeText}>Hôm nay</span>
                </div>
                <div className={styles.dashboardCardContent}>
                  <span className={styles.dashboardLabel}>ĐANG DIỄN RA</span>
                  <h2 className={styles.dashboardLargeValue}>{inProgressCount}</h2>
                  <p className={styles.dashboardSubtext}>Bài thi đang diễn ra</p>
                </div>
              </div>

              {/* Card 2: HOÀN THÀNH */}
              <div className={styles.bottomDashboardCard}>
                <div className={styles.cardTopRow}>
                  <div className={`${styles.dashboardIconWrapper} ${styles.greenIconBg}`}>
                    <CheckCircle size={18} />
                  </div>
                  <span className={styles.dashboardTimeText}>Tháng này</span>
                </div>
                <div className={styles.dashboardCardContent}>
                  <span className={styles.dashboardLabel}>HOÀN THÀNH</span>
                  <h2 className={styles.dashboardLargeValue}>{completedCount}</h2>
                  <p className={styles.dashboardSubtext}>Tổng bài thi đã hoàn thành</p>
                </div>
              </div>

              {/* Card 3: BẢN NHÁP */}
              <div className={styles.bottomDashboardCard}>
                <div className={styles.cardTopRow}>
                  <div className={`${styles.dashboardIconWrapper} ${styles.navyIconBg}`}>
                    <FileText size={18} />
                  </div>
                  <span className={styles.dashboardTimeText}>Kho lưu trữ</span>
                </div>
                <div className={styles.dashboardCardContent}>
                  <span className={styles.dashboardLabel}>BẢN NHÁP</span>
                  <h2 className={styles.dashboardLargeValue}>{draftCount}</h2>
                  <p className={styles.dashboardSubtext}>Đang chờ hoàn thiện</p>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
