import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  RotateCcw,
  Eye,
  Edit,
  ClipboardList,
  CheckCircle,
  FileText,
  BookOpen,
  FileQuestion,
  Inbox,
} from 'lucide-react';
import { useExamStore } from '../../presentation/store/examStore';
import styles from './ExamsPage.module.css';

export default function ExamsPage() {
  const navigate = useNavigate();
  const { exams, isLoading, fetchExams } = useExamStore();

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Dropdown UI states
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Row selection
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const subjectRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // Fetch exams on mount
  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (subjectRef.current && !subjectRef.current.contains(event.target as Node)) {
        setShowSubjectDropdown(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset filters handler
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSubject('all');
    setSelectedStatus('all');
    setCurrentPage(1);
  };

  // Get unique subjects from exams
  const uniqueSubjects = useMemo(() => {
    const subjects = new Set<string>();
    exams.forEach((exam) => {
      if (exam.subjectName) subjects.add(exam.subjectName);
    });
    return Array.from(subjects).sort();
  }, [exams]);

  // Filter exams based on search and filters
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam._id.toLowerCase().includes(searchQuery.toLowerCase());

      // Subject filter
      const matchesSubject =
        selectedSubject === 'all' || exam.subjectName === selectedSubject;

      // Status filter
      const matchesStatus =
        selectedStatus === 'all' || exam.status === selectedStatus;

      return matchesSearch && matchesSubject && matchesStatus;
    });
  }, [exams, searchQuery, selectedSubject, selectedStatus]);

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
      setSelectedExamIds(currentItems.map((item) => item._id));
    } else {
      setSelectedExamIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedExamIds((prev) => [...prev, id]);
    } else {
      setSelectedExamIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Status mapping
  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'draft':
        return { text: 'Nháp', class: styles.draftBadge };
      case 'in_progress':
        return { text: 'Đang thi', class: styles.inProgressBadge };
      case 'completed':
        return { text: 'Hoàn thành', class: styles.completedBadge };
      case 'published':
        return { text: 'Đã xuất bản', class: styles.publishedBadge };
      case 'archived':
        return { text: 'Đã lưu trữ', class: styles.archivedBadge };
      default:
        return { text: status, class: styles.publishedBadge };
    }
  };

  const handleCreateBtnClick = () => {
    navigate('/school/exams/new');
  };

  // Stats
  const inProgressCount = exams.filter((e) => e.status === 'in_progress').length;
  const completedCount = exams.filter((e) => e.status === 'completed').length;
  const draftCount = exams.filter((e) => e.status === 'draft').length;

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <span>Trường học</span>
        <span className={styles.breadcrumbSeparator}>&gt;</span>
        <span className={styles.breadcrumbActive}>Quản lý bài kiểm tra</span>
      </nav>

      {/* Title & CTA button */}
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý bài kiểm tra</h1>
        <button className={styles.createBtn} onClick={handleCreateBtnClick}>
          <Plus size={16} />
          <span>Tạo bài kiểm tra mới</span>
        </button>
      </div>

      {/* Top Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filtersGroupLeft}>
          {/* Search input */}
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Tìm kiếm tên bài thi..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.searchInput}
            />
          </div>

          {/* Subject selector */}
          <div className={styles.dropdownWrapper} ref={subjectRef}>
            <button
              className={styles.filterDropdownBtn}
              onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
            >
              <BookOpen size={14} className={styles.btnIconLeft} />
              <span>
                {selectedSubject === 'all'
                  ? 'Môn học'
                  : selectedSubject}
              </span>
              <ChevronDown size={14} className={styles.btnChevron} />
            </button>
            {showSubjectDropdown && (
              <div className={styles.dropdownMenu}>
                <button
                  className={`${styles.dropdownItem} ${selectedSubject === 'all' ? styles.dropdownItemActive : ''}`}
                  onClick={() => {
                    setSelectedSubject('all');
                    setShowSubjectDropdown(false);
                    setCurrentPage(1);
                  }}
                >
                  Tất cả môn học
                </button>
                {uniqueSubjects.map((subject) => (
                  <button
                    key={subject}
                    className={`${styles.dropdownItem} ${selectedSubject === subject ? styles.dropdownItemActive : ''}`}
                    onClick={() => {
                      setSelectedSubject(subject);
                      setShowSubjectDropdown(false);
                      setCurrentPage(1);
                    }}
                  >
                    {subject}
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
                        : selectedStatus === 'published'
                          ? 'Đã xuất bản'
                          : 'Đã lưu trữ'}
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
                  className={`${styles.dropdownItem} ${selectedStatus === 'draft' ? styles.dropdownItemActive : ''}`}
                  onClick={() => {
                    setSelectedStatus('draft');
                    setShowStatusDropdown(false);
                    setCurrentPage(1);
                  }}
                >
                  Nháp
                </button>
                <button
                  className={`${styles.dropdownItem} ${selectedStatus === 'published' ? styles.dropdownItemActive : ''}`}
                  onClick={() => {
                    setSelectedStatus('published');
                    setShowStatusDropdown(false);
                    setCurrentPage(1);
                  }}
                >
                  Đã xuất bản
                </button>
                <button
                  className={`${styles.dropdownItem} ${selectedStatus === 'in_progress' ? styles.dropdownItemActive : ''}`}
                  onClick={() => {
                    setSelectedStatus('in_progress');
                    setShowStatusDropdown(false);
                    setCurrentPage(1);
                  }}
                >
                  Đang thi
                </button>
                <button
                  className={`${styles.dropdownItem} ${selectedStatus === 'completed' ? styles.dropdownItemActive : ''}`}
                  onClick={() => {
                    setSelectedStatus('completed');
                    setShowStatusDropdown(false);
                    setCurrentPage(1);
                  }}
                >
                  Hoàn thành
                </button>
                <button
                  className={`${styles.dropdownItem} ${selectedStatus === 'archived' ? styles.dropdownItemActive : ''}`}
                  onClick={() => {
                    setSelectedStatus('archived');
                    setShowStatusDropdown(false);
                    setCurrentPage(1);
                  }}
                >
                  Đã lưu trữ
                </button>
              </div>
            )}
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
                  checked={
                    currentItems.length > 0 &&
                    selectedExamIds.length === currentItems.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th>TÊN BÀI KIỂM TRA</th>
              <th>MÔN HỌC</th>
              <th>NGÀY THI</th>
              <th>THỜI GIAN</th>
              <th>SỐ CÂU</th>
              <th>TRẠNG THÁI</th>
              <th>PHIÊN BẢN</th>
              <th style={{ textAlign: 'center' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Loading skeleton rows
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className={styles.tableRow}>
                  <td>
                    <div className={styles.skeletonCheckbox} />
                  </td>
                  <td>
                    <div className={styles.skeletonCell}>
                      <div className={styles.skeletonLine} style={{ width: '70%' }} />
                      <div className={styles.skeletonLine} style={{ width: '40%', height: '10px' }} />
                    </div>
                  </td>
                  <td><div className={styles.skeletonLine} style={{ width: '60px' }} /></td>
                  <td><div className={styles.skeletonLine} style={{ width: '80px' }} /></td>
                  <td><div className={styles.skeletonLine} style={{ width: '50px' }} /></td>
                  <td><div className={styles.skeletonLine} style={{ width: '30px' }} /></td>
                  <td><div className={styles.skeletonBadge} /></td>
                  <td><div className={styles.skeletonLine} style={{ width: '40px' }} /></td>
                  <td>
                    <div className={styles.skeletonActions}>
                      <div className={styles.skeletonIcon} />
                      <div className={styles.skeletonIcon} />
                    </div>
                  </td>
                </tr>
              ))
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className={styles.emptyState}>
                    <Inbox size={48} className={styles.emptyIcon} />
                    <h3 className={styles.emptyTitle}>
                      {searchQuery || selectedSubject !== 'all' || selectedStatus !== 'all'
                        ? 'Không tìm thấy bài kiểm tra nào'
                        : 'Chưa có bài kiểm tra nào'}
                    </h3>
                    <p className={styles.emptySubtext}>
                      {searchQuery || selectedSubject !== 'all' || selectedStatus !== 'all'
                        ? 'Thử thay đổi bộ lọc tìm kiếm'
                        : 'Bắt đầu bằng cách tạo bài kiểm tra mới'}
                    </p>
                    {!searchQuery && selectedSubject === 'all' && selectedStatus === 'all' && (
                      <button className={styles.emptyCreateBtn} onClick={handleCreateBtnClick}>
                        <Plus size={16} />
                        <span>Tạo bài kiểm tra mới</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              currentItems.map((exam) => {
                const statusDetails = getStatusDetails(exam.status);
                const isSelected = selectedExamIds.includes(exam._id);

                return (
                  <tr
                    key={exam._id}
                    className={`${styles.tableRow} ${isSelected ? styles.rowSelected : ''}`}
                  >
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
                        <Link to={`/school/exams/${exam._id}`} className={styles.examTitleLink}>
                          <h3 className={styles.examTitle}>{exam.title}</h3>
                        </Link>
                        <span className={styles.examId}>ID: {exam._id}</span>
                      </div>
                    </td>

                    {/* Subject */}
                    <td>
                      <span className={styles.textMedium}>
                        {exam.subjectName || '—'}
                      </span>
                    </td>

                    {/* Date */}
                    <td>
                      <span className={styles.textMedium}>
                        {exam.examDate || exam.date || '—'}
                      </span>
                    </td>

                    {/* Duration */}
                    <td>
                      <span className={styles.textMedium}>
                        {exam.duration ? `${exam.duration} phút` : '—'}
                      </span>
                    </td>

                    {/* Question Count */}
                    <td>
                      <span className={styles.textSemibold}>
                        {exam.numberOfQuestions || 0}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td>
                      <span className={`${styles.statusBadge} ${statusDetails.class}`}>
                        {statusDetails.text}
                      </span>
                    </td>

                    {/* Variants Count */}
                    <td>
                      <span className={styles.textMedium}>
                        {exam.numberOfVersions || 0} đề
                      </span>
                    </td>

                    {/* Direct Actions */}
                    <td>
                      <div className={styles.directActionsWrapper}>
                        <Link
                          to={`/school/exams/${exam._id}`}
                          className={styles.directActionBtn}
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          className={styles.directActionBtn}
                          title="Chỉnh sửa"
                          onClick={() => navigate(`/school/exams/${exam._id}/edit`)}
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
            if (
              totalPages > 5 &&
              pageNum !== 1 &&
              pageNum !== totalPages &&
              Math.abs(pageNum - currentPage) > 1
            ) {
              if (pageNum === 2 || pageNum === totalPages - 1) {
                return (
                  <span key={pageNum} className={styles.paginationEllipsis}>
                    ...
                  </span>
                );
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

      {/* Stats Cards */}
      <div className={styles.bottomSection}>
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
      </div>
    </div>
  );
}
