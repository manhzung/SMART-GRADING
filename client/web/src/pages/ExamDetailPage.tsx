import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Edit, 
  Trash2, 
  Printer, 
  Copy, 
  Radio, 
  Info, 
  Calendar, 
  Clock, 
  Timer, 
  Star, 
  Shield, 
  BookOpen, 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  FileText,
  Key,
  MoreVertical,
  Check,
  Settings,
  FileDown
} from 'lucide-react';
import { useExamStore } from '../presentation/store/examStore';
import { useSubmissionStore } from '../presentation/store/submissionStore';
import { apiService } from '../core/api';
import { mapExamDetailData } from './examPageAdapters';
import { exportOmrTemplatePdf, exportOmrTemplateVersionSheetsPdf } from '../features/reports/examReportExport';
import styles from './ExamDetailPage.module.css';

export default function ExamDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const {
    currentExam,
    examVersions,
    isLoading: isExamLoading,
    isPublishing,
    isGeneratingVersions,
    fetchExamById,
    fetchExamVersions,
    publishExam,
    completeExam,
    generateExamVersions,
    addClassesToExam,
    removeClassesFromExam,
    deleteExam,
    exportExamPdf,
    exportVersionPdf,
    exportResults,
  } = useExamStore();

  const {
    statistics,
    isLoading: isSubLoading,
    fetchByExam,
    fetchStatistics,
    submissions,
  } = useSubmissionStore();

  const [isSystemConfigOpen, setIsSystemConfigOpen] = useState(false);
  const [isExportingOmr, setIsExportingOmr] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [currentQuestionPage, setCurrentQuestionPage] = useState(1);
  const questionsPerPage = 3;

  useEffect(() => {
    if (id) {
      fetchExamById(id);
      fetchExamVersions(id);
      fetchByExam(id);
      fetchStatistics(id);
    }
  }, [id, fetchExamById, fetchExamVersions, fetchByExam, fetchStatistics]);

  const examData = useMemo(() => mapExamDetailData(currentExam, examVersions), [currentExam, examVersions]);

  if (!examData) {
    const hasData = currentExam || isExamLoading || isSubLoading;
    if (hasData) {
      return (
        <div className={styles.loadingContainer}>
          <div className={styles.loader}></div>
          <p>Đang tải dữ liệu bài thi...</p>
        </div>
      );
    }
    return (
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link to="/exams" className={styles.breadcrumbLink}>Quản lý bài kiểm tra</Link>
          <span className={styles.breadcrumbSeparator}>&gt;</span>
          <span className={styles.breadcrumbActive}>Không tìm thấy</span>
        </nav>
        <div className={styles.emptyState}>
          <Info size={48} className={styles.emptyIcon} />
          <h2>Không tìm thấy bài thi</h2>
          <p>Bài kiểm tra này không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
          <Link to="/exams" className={styles.btnSolid}>Quay lại danh sách</Link>
        </div>
      </div>
    );
  }

  // Paginated Questions
  const indexOfLastQuestion = currentQuestionPage * questionsPerPage;
  const indexOfFirstQuestion = indexOfLastQuestion - questionsPerPage;
  const currentQuestions = examData.questions.slice(indexOfFirstQuestion, indexOfLastQuestion);
  const totalQuestionPages = Math.ceil(examData.questions.length / questionsPerPage);

  // Class code extractor (e.g. Lớp 12A1 -> 12A)
  const getClassCode = (name: string) => {
    const match = name.match(/Lớp\s+(\d+[A-Z])/i) || name.match(/(\d+[A-Z])/i);
    return match ? match[1] : name.slice(0, 3).replace(/\s/g, '');
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed': return styles.statusCompleted;
      case 'in_progress': return styles.statusInProgress;
      case 'published': return styles.statusPublished;
      case 'draft':
      default:
        return styles.statusDraft;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'ĐÃ HOÀN THÀNH';
      case 'in_progress': return 'ĐANG DIỄN RA';
      case 'published': return 'ĐÃ PHÁT HÀNH';
      case 'draft':
      default:
        return 'ĐANG SOẠN THẢO';
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    if (window.confirm('Bạn có chắc chắn muốn xuất bản đề thi này? Học sinh sẽ có thể xem thông tin bài thi.')) {
      try {
        await publishExam(id);
        alert('Xuất bản đề thi thành công!');
      } catch (err: any) {
        alert(err.message || 'Lỗi khi xuất bản đề thi');
      }
    }
  };

  const handleCompleteExam = async () => {
    if (!id) return;
    if (!window.confirm('Kết thúc kỳ thi? Không thể hoàn tác.')) return;
    setIsCompleting(true);
    try {
      await completeExam(id);
      alert('Kỳ thi đã được kết thúc');
      await fetchExamById(id);
    } catch (err: any) {
      alert(err.message || 'Thao tác thất bại');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleGenerateVersions = async () => {
    if (!id) return;
    const count = prompt('Nhập số lượng mã đề muốn trộn (Mặc định: 4):', '4');
    if (count === null) return;
    const num = parseInt(count, 10);
    if (isNaN(num) || num <= 0) {
      alert('Vui lòng nhập số nguyên dương hợp lệ.');
      return;
    }
    try {
      await generateExamVersions(id, num);
      alert('Trộn đề và sinh phiên bản thành công!');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi sinh mã đề');
    }
  };

  const handleExportPdf = async () => {
    if (!id) return;
    try {
      await exportExamPdf(id);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xuất đề thi');
    }
  };

  const handleVersionDownload = async (versionCode: string) => {
    if (!id) return;
    try {
      await exportVersionPdf(id, versionCode);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải đề thi');
    }
  };

  const handleExportResults = async (format: 'pdf' | 'excel' = 'pdf') => {
    if (!id) return;
    try {
      await exportResults(id, format);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xuất kết quả');
    }
  };

  const handleGenerateReport = async () => {
    if (!id) return;
    if (!window.confirm('Tạo báo cáo phân tích cho bài thi này?')) return;
    try {
      const response = await apiService.post(`/reports/exam/${id}/generate`);
      alert('Báo cáo đã được tạo thành công!');
      await fetchStatistics(id);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo báo cáo');
    }
  };

  const handleExportOmrSheet = async () => {
    if (!id) return;
    const templateId = currentExam?.omrTemplateId?._id;
    if (!templateId) {
      alert('Bài thi này chưa gắn mẫu OMR.');
      return;
    }
    setIsExportingOmr(true);
    try {
      const versions = examVersions.map(v => v.versionCode);
      if (versions.length > 1) {
        await exportOmrTemplateVersionSheetsPdf(templateId, versions, examData.title);
      } else {
        await exportOmrTemplatePdf(templateId, examData.title);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải phiếu OMR');
    } finally {
      setIsExportingOmr(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa bài kiểm tra này? Hành động này sẽ chuyển trạng thái bài thi thành lưu trữ.')) {
      try {
        await deleteExam(examData._id);
        alert('Xóa bài thi thành công.');
        navigate('/exams');
      } catch (err: any) {
        alert(err.message || 'Lỗi khi xóa bài thi');
      }
    }
  };

  const handleAddClass = async () => {
    if (!id) return;
    const className = prompt('Nhập tên lớp học muốn thêm vào đề thi (Ví dụ: 12A3):');
    if (!className) return;
    try {
      await addClassesToExam(id, [className]);
      alert(`Đã thêm lớp ${className} vào bài thi.`);
      await fetchExamById(id);
    } catch (err: any) {
      alert(err.message || 'Không thể thêm lớp vào bài thi.');
    }
  };

  const handleRemoveClass = async (classId: string, className: string) => {
    if (!id) return;
    if (window.confirm(`Xóa lớp ${className} khỏi danh sách dự thi bài thi này?`)) {
      try {
        await removeClassesFromExam(id, [classId]);
        alert(`Đã xóa lớp ${className}.`);
        await fetchExamById(id);
      } catch (err: any) {
        alert(err.message || 'Không thể xóa lớp khỏi bài thi.');
      }
    }
  };

  return (
    <div className={styles.container}>
      {/* Breadcrumbs */}
      <nav className={styles.breadcrumb}>
        <Link to="/exams" className={styles.breadcrumbLink}>Quản lý bài kiểm tra</Link>
        <span className={styles.breadcrumbSeparator}>&gt;</span>
        <span className={styles.breadcrumbActive}>{examData.title}</span>
      </nav>

      {/* Main Header Area */}
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <h1 className={styles.title}>{examData.title}</h1>
          <span className={`${styles.statusBadge} ${getStatusClass(examData.status)}`}>
            {getStatusLabel(examData.status)}
          </span>
        </div>
        
        <div className={styles.actions}>
          <button className={styles.btnOutline} onClick={handleDelete} title="Xóa bài thi">
            <Trash2 size={16} />
            <span>Xóa</span>
          </button>
          <button className={styles.btnOutline} onClick={() => navigate(`/exams/${examData._id}/edit`)} title="Sửa bài thi">
            <Edit size={16} />
            <span>Sửa</span>
          </button>
          <button className={styles.btnOutline} onClick={handleExportPdf} title="Xuất đề thi ra PDF">
            <Printer size={16} />
            <span>In đề</span>
          </button>
          <button className={styles.btnOutline} onClick={handleExportOmrSheet} disabled={isExportingOmr} title="Tải phiếu trả lời OMR">
            <FileDown size={16} />
            <span>{isExportingOmr ? 'Đang tải...' : 'In Phiếu OMR'}</span>
          </button>
          <button className={styles.btnOutline} onClick={handleGenerateVersions} disabled={isGeneratingVersions} title="Sinh mã đề trộn">
            <Copy size={16} />
            <span>Sinh phiên bản</span>
          </button>
          <button className={styles.btnSolidPublish} onClick={handlePublish} disabled={isPublishing || examData.status !== 'draft'} title="Xuất bản đề thi">
            <Radio size={16} />
            <span>Xuất bản</span>
          </button>
          {examData.status !== 'completed' && (
            <button className={styles.btnOutlineComplete} onClick={handleCompleteExam} disabled={isCompleting} title="Kết thúc kỳ thi">
              <CheckCircle2 size={16} />
              <span>{isCompleting ? 'Đang xử lý...' : 'Kết thúc'}</span>
            </button>
          )}
        </div>
      </div>

      <p className={styles.subtitle}>
        Cập nhật lần cuối: {examData.updatedDate} bởi {examData.creator}
      </p>

      {/* Grid: Columns */}
      <div className={styles.mainGrid}>
        
        {/* Left Column: General + Detailed info */}
        <div className={styles.leftCol}>
          
          {/* Card: Thông tin chung */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.headerTitle}>
                <h2>Thông tin chung</h2>
                <Info size={16} className={styles.infoIcon} />
              </div>
            </div>
            
            <div className={styles.cardContent}>
              <div className={styles.infoGrid}>
                <div className={styles.infoField}>
                  <span className={styles.infoLabel}>MÃ BÀI THI</span>
                  <span className={styles.infoValue}>{examData.code}</span>
                </div>
                <div className={styles.infoField}>
                  <span className={styles.infoLabel}>NGƯỜI TẠO</span>
                  <span className={styles.infoValue}>{examData.creator}</span>
                </div>
                <div className={styles.infoField}>
                  <span className={styles.infoLabel}>NGÀY TẠO</span>
                  <span className={styles.infoValue}>{examData.createdDate}</span>
                </div>
                <div className={styles.infoField}>
                  <span className={styles.infoLabel}>OMR TEMPLATE</span>
                  <span className={styles.infoValueLink}>
                    <FileText size={14} />
                    <span>{examData.omrTemplateName}</span>
                  </span>
                </div>
              </div>
              <div className={styles.divider} />
              <div className={styles.descriptionSection}>
                <span className={styles.infoLabel}>MÔ TẢ CHI TIẾT</span>
                <p className={styles.descriptionText}>{examData.description}</p>
              </div>
            </div>
          </div>

          {/* Card: Thông tin thi */}
          <div className={styles.card}>
            <div className={styles.cardHeaderFlex}>
              <div className={styles.headerTitle}>
                <h2>Thông tin thi</h2>
              </div>
              <div className={styles.progressSection}>
                <span className={styles.progressText}>
                  TỈ LỆ NỘP BÀI: <strong>{examData.submissionsCount} / {examData.totalStudents} ({Math.round((examData.submissionsCount / examData.totalStudents) * 100)}%)</strong>
                </span>
                <div className={styles.progressContainer}>
                  <div 
                    className={styles.progressBar} 
                    style={{ width: `${(examData.submissionsCount / examData.totalStudents) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className={styles.cardContent}>
              <div className={styles.detailsGrid}>
                <div className={styles.detailBox}>
                  <div className={styles.detailIcon}><Calendar size={16} /></div>
                  <div className={styles.detailText}>
                    <span className={styles.detailLabel}>NGÀY THI</span>
                    <span className={styles.detailValue}>{examData.examDate}</span>
                  </div>
                </div>

                <div className={styles.detailBox}>
                  <div className={styles.detailIcon}><Clock size={16} /></div>
                  <div className={styles.detailText}>
                    <span className={styles.detailLabel}>GIỜ BẮT ĐẦU</span>
                    <span className={styles.detailValue}>{examData.startTime}</span>
                  </div>
                </div>

                <div className={styles.detailBox}>
                  <div className={styles.detailIcon}><Timer size={16} /></div>
                  <div className={styles.detailText}>
                    <span className={styles.detailLabel}>THỜI GIAN</span>
                    <span className={styles.detailValue}>{examData.duration} phút</span>
                  </div>
                </div>

                <div className={styles.detailBox}>
                  <div className={styles.detailIcon}><BookOpen size={16} /></div>
                  <div className={styles.detailText}>
                    <span className={styles.detailLabel}>SỐ CÂU HỎI</span>
                    <span className={styles.detailValue}>{examData.totalQuestions} câu</span>
                  </div>
                </div>

                <div className={styles.detailBox}>
                  <div className={styles.detailIcon}><Star size={16} /></div>
                  <div className={styles.detailText}>
                    <span className={styles.detailLabel}>THANG ĐIỂM</span>
                    <span className={styles.detailValue}>{examData.scoreScale}</span>
                  </div>
                </div>

                <div className={styles.detailBox}>
                  <div className={styles.detailIcon}><CheckCircle2 size={16} /></div>
                  <div className={styles.detailText}>
                    <span className={styles.detailLabel}>ĐIỂM ĐẠT</span>
                    <span className={styles.detailValue}>{examData.passingScore.toFixed(1)}</span>
                  </div>
                </div>

                <div className={styles.detailBox}>
                  <div className={styles.detailIcon}><Shield size={16} /></div>
                  <div className={styles.detailText}>
                    <span className={styles.detailLabel}>GIÁM SÁT</span>
                    <span className={styles.detailValue}>{examData.monitoring}</span>
                  </div>
                </div>

                <div className={styles.detailBox}>
                  <div className={styles.detailIcon}><Layers size={16} /></div>
                  <div className={styles.detailText}>
                    <span className={styles.detailLabel}>SỐ PHIÊN BẢN</span>
                    <span className={styles.detailValue}>{examData.versions.length} Mã đề</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Statistics + Classes */}
        <div className={styles.rightCol}>
          
          {/* Card: Thống kê kết quả */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.headerTitle}>
                <h2>Thống kê kết quả</h2>
              </div>
            </div>
            
            <div className={styles.cardContent}>
              {/* Stats Grid */}
              <div className={styles.stats2x2}>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>Điểm Trung Bình</span>
                  <span className={styles.statValue}>
                    {statistics?.averageScore != null ? statistics.averageScore.toFixed(1) : '—'}
                  </span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>Tỉ lệ Đạt</span>
                  <span className={`${styles.statValue} ${styles.colorAmber}`}>
                    {statistics?.passRate != null ? `${statistics.passRate}%` : '—'}
                  </span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>Cao nhất</span>
                  <span className={styles.statValue}>
                    {statistics?.highestScore != null ? statistics.highestScore.toFixed(1) : '—'}
                  </span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>Thấp nhất</span>
                  <span className={styles.statValue}>
                    {statistics?.lowestScore != null ? statistics.lowestScore.toFixed(1) : '—'}
                  </span>
                </div>
              </div>

              {/* Chart section */}
              <div className={styles.chartSection}>
                <span className={styles.chartTitle}>PHỔ ĐIỂM</span>
                {statistics?.scoreHistogram && statistics.scoreHistogram.length > 0 ? (
                <div className={styles.barChart}>
                  {statistics.scoreHistogram.map((bucket, idx) => {
                    const maxCount = Math.max(...statistics.scoreHistogram.map(b => b.count), 1);
                    const height = maxCount > 0 ? Math.max(Math.round((bucket.count / maxCount) * 100), bucket.count > 0 ? 5 : 0) : 0;
                    return (
                      <div className={styles.chartTrack} key={idx}>
                        <div className={`${styles.chartBar} ${idx === 3 ? styles.chartBarActive : ''}`} style={{ height: `${height}%` }}></div>
                        <span className={styles.chartLabel}>{bucket.range}</span>
                      </div>
                    );
                  })}
                </div>
                ) : (
                <p style={{ color: '#999', textAlign: 'center', padding: '16px' }}>Chưa có dữ liệu phổ điểm.</p>
                )}
              </div>
            </div>
          </div>

          {/* Card: Lớp tham gia */}
          <div className={styles.card}>
            <div className={styles.cardHeaderFlex}>
              <div className={styles.headerTitle}>
                <h2>Lớp tham gia</h2>
              </div>
              <button className={styles.settingsBtn} title="Quản lý lớp">
                <Settings size={16} />
              </button>
            </div>
            
            <div className={styles.cardContent}>
              <div className={styles.classesList}>
                {examData.classes.length === 0 ? (
                  <p className={styles.emptyText}>Chưa có lớp học nào.</p>
                ) : (
                  examData.classes.map((cls, idx) => (
                    <div key={idx} className={styles.classCard}>
                      <div className={`${styles.classAvatar} ${getClassCode(cls.name).startsWith('11') ? styles.avatarPurple : styles.avatarBlue}`}>
                        {getClassCode(cls.name)}
                      </div>
                      <div className={styles.classInfo}>
                        <span className={styles.className}>{cls.name}</span>
                        <span className={styles.classCount}>{cls.description}</span>
                      </div>
                      <button className={styles.classRemoveBtn} onClick={() => handleRemoveClass(cls._id, cls.name)} title="Xóa lớp">
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              <button className={styles.btnAddClass} onClick={handleAddClass}>
                <span>+ Thêm lớp học</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Section: Ngân hàng câu hỏi */}
      <div className={styles.sectionCard}>
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <div className={styles.headerTitle}>
              <h2>Ngân hàng câu hỏi ({examData.totalQuestions})</h2>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.btnOutlineCompact} onClick={() => alert('Đang thực hiện trộn câu hỏi...')}>Trộn câu hỏi</button>
              <button className={styles.btnSolidCompact} onClick={() => navigate('/question-bank')}>Thêm câu hỏi</button>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>STT</th>
                  <th>NỘI DUNG CÂU HỎI</th>
                  <th style={{ width: '120px' }}>PHÂN LOẠI</th>
                  <th style={{ width: '80px' }}>ĐÁP ÁN</th>
                  <th style={{ width: '80px' }}>ĐIỂM</th>
                  <th style={{ width: '120px' }}>ĐỘ KHÓ</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {examData.questions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#999' }}>
                      Chưa có câu hỏi nào.
                    </td>
                  </tr>
                ) : (
                  currentQuestions.map((q, idx) => (
                    <tr key={idx}>
                      <td className={styles.boldText}>{q.stt}</td>
                      <td className={styles.questionContent}>{q.content}</td>
                      <td>
                        <span className={styles.classificationBadge}>{q.type}</span>
                      </td>
                      <td>
                        <span className={styles.correctAnswerText}>{q.correctAnswer}</span>
                      </td>
                      <td>{q.score.toFixed(1)}</td>
                      <td>
                        <span className={`${styles.difficultyLabel} ${
                          q.difficulty === 'easy' ? styles.diffGreen :
                          q.difficulty === 'medium' ? styles.diffBlue : styles.diffRed
                        }`}>
                          <span className={styles.dot}>●</span>
                          {q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button className={styles.actionIconButton}>
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.tableFooter}>
            <div className={styles.paginationInfo}>
              Hiển thị {indexOfFirstQuestion + 1}-{Math.min(indexOfLastQuestion, examData.questions.length)} / {examData.questions.length} câu
            </div>
            <div className={styles.pageButtons}>
              <button 
                disabled={currentQuestionPage === 1}
                onClick={() => setCurrentQuestionPage(p => p - 1)}
                className={styles.pageBtn}
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                disabled={currentQuestionPage === totalQuestionPages}
                onClick={() => setCurrentQuestionPage(p => p + 1)}
                className={styles.pageBtn}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          
          <div className={styles.viewAllContainer}>
            <Link to="/question-bank" className={styles.viewAllLink}>
              Xem tất cả {examData.totalQuestions} câu hỏi
            </Link>
          </div>
        </div>
      </div>

      {/* Section: Phiên bản đề thi */}
      <div className={styles.sectionCard}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.headerTitle}>
              <h2>Phiên bản đề thi</h2>
            </div>
          </div>
          
          <div className={styles.versionsGrid}>
            {examData.versions.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: '32px', gridColumn: '1 / -1' }}>
                Chưa có phiên bản đề thi nào.
              </p>
            ) : (
              examData.versions.map((ver, idx) => (
              <div key={idx} className={styles.versionCard}>
                <div className={styles.verCardHeader}>
                  <span className={styles.verCardTitle}>MÃ ĐỀ: {ver.code}</span>
                  <div className={styles.checkIconWrapper}>
                    <Check size={12} strokeWidth={3} />
                  </div>
                </div>
                
                <div className={styles.verCardBody}>
                  <div className={styles.verField}>
                    <span className={styles.verLabel}>Trạng thái:</span>
                    <span className={styles.verValueActive}>{ver.status}</span>
                  </div>
                  <div className={styles.verField}>
                    <span className={styles.verLabel}>Cập nhật:</span>
                    <span className={styles.verValue}>{ver.updatedAt}</span>
                  </div>
                </div>

                <div className={styles.verCardFooter}>
                  <button className={styles.verActionBtn} onClick={() => handleVersionDownload(ver.code)}>
                    <FileText size={14} />
                    <span>Đề thi</span>
                  </button>
                  <button className={styles.verActionBtn} onClick={() => handleExportResults()}>
                    <Key size={14} />
                    <span>Đáp án</span>
                  </button>
                </div>
              </div>
            ))
            )}
          </div>
        </div>
      </div>

      {/* Section: Danh sách bài nộp */}
      <div className={styles.sectionCard}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.headerTitle}>
              <h2>Danh sách bài nộp ({submissions.length})</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {examData.status === 'completed' && (
                <button className={styles.btnOutlineCompact} onClick={handleGenerateReport}>
                  Tạo báo cáo
                </button>
              )}
              <button className={styles.btnOutlineCompact} onClick={() => handleExportResults('pdf')}>
                <FileDown size={14} />
                Xuất PDF
              </button>
              <button className={styles.btnSolidCompact} onClick={() => handleExportResults('excel')}>
                Xuất Excel
              </button>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>STT</th>
                  <th style={{ width: '180px' }}>HỌC SINH</th>
                  <th style={{ width: '100px' }}>MÃ HS</th>
                  <th style={{ width: '100px' }}>MÃ ĐỀ</th>
                  <th style={{ width: '80px' }}>ĐIỂM</th>
                  <th style={{ width: '80px' }}>TỶ LỆ</th>
                  <th style={{ width: '100px' }}>TRẠNG THÁI</th>
                  <th style={{ width: '140px' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#999' }}>
                      Chưa có bài nộp nào.
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub, idx) => {
                    // Handle both BE format (with nested objects) and local format
                    const studentId = (sub as any).studentId;
                    const studentName = typeof studentId === 'object' && studentId !== null
                      ? (studentId as any).name
                      : (sub as any).studentName || '';
                    const studentCode = typeof studentId === 'object' && studentId !== null
                      ? (studentId as any).studentCode
                      : (sub as any).studentCode || '';
                    const versionCode = (sub as any).versionId
                      ? (typeof (sub as any).versionId === 'object'
                        ? (sub as any).versionId?.versionCode
                        : (sub as any).versionId)
                      : (sub as any).versionCode || '';
                    const pct = sub.maxScore ? ((sub.score || sub.totalScore || 0) / sub.maxScore * 100) : 0;
                    return (
                      <tr key={sub._id || idx}>
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td>{studentName || '—'}</td>
                        <td>{studentCode || '—'}</td>
                        <td>{versionCode || '—'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                          {sub.totalScore != null ? sub.totalScore.toFixed(1) : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>{pct > 0 ? `${pct.toFixed(0)}%` : '—'}</td>
                        <td>
                          <span className={`${styles.difficultyLabel} ${
                            sub.status === 'completed' || sub.status === 'scanned'
                              ? styles.diffGreen
                              : sub.status === 'pending'
                              ? styles.diffBlue
                              : ''
                          }`}>
                            {sub.status === 'completed' ? 'Hoàn thành'
                              : sub.status === 'scanned' ? 'Đã quét'
                              : sub.status === 'pending' ? 'Chờ quét'
                              : sub.status === 'appealed' ? 'Phúc tra'
                              : sub.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button className={styles.actionIconButton} title="Xem chi tiết">
                            <FileText size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section: Cấu hình hệ thống (Accordion) */}
      <div className={styles.sectionCard}>
        <div className={styles.accordionCard} onClick={() => setIsSystemConfigOpen(!isSystemConfigOpen)}>
          <div className={styles.accordionHeader}>
            <div className={styles.accordionTitle}>
              <Settings size={18} />
              <h2>Cấu hình hệ thống</h2>
            </div>
            {isSystemConfigOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          
          {isSystemConfigOpen && (
            <div className={styles.accordionContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.configGrid}>
                <div className={styles.configItem}>
                  <span className={styles.configLabel}>Khổ giấy in đề</span>
                  <span className={styles.configValue}>{currentExam?.printConfig?.paperSize || 'A4'}</span>
                </div>
                <div className={styles.configItem}>
                  <span className={styles.configLabel}>Số câu mỗi trang</span>
                  <span className={styles.configValue}>{currentExam?.printConfig?.questionsPerPage || '5'} câu</span>
                </div>
                <div className={styles.configItem}>
                  <span className={styles.configLabel}>Bao gồm phiếu trả lời</span>
                  <span className={styles.configValue}>{currentExam?.printConfig?.includeAnswerSheet !== false ? 'Có' : 'Không'}</span>
                </div>
                <div className={styles.configItem}>
                  <span className={styles.configLabel}>Trộn câu hỏi</span>
                  <span className={styles.configValue}>{currentExam?.shuffleConfig?.shuffleQuestions !== false ? 'Bật' : 'Tắt'}</span>
                </div>
                <div className={styles.configItem}>
                  <span className={styles.configLabel}>Trộn đáp án</span>
                  <span className={styles.configValue}>{currentExam?.shuffleConfig?.shuffleOptions !== false ? 'Bật' : 'Tắt'}</span>
                </div>
                <div className={styles.configItem}>
                  <span className={styles.configLabel}>Bản quyền tiêu đề trường</span>
                  <span className={styles.configValue}>{currentExam?.printConfig?.schoolHeader !== false ? 'Có' : 'Không'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section: Lịch sử thay đổi */}
      <div className={styles.sectionCard}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.headerTitle}>
              <h2>Lịch sử thay đổi</h2>
            </div>
          </div>
          
          <div className={styles.timeline}>
            {examData.history.map((hist, idx) => (
              <div key={idx} className={styles.timelineItem}>
                <div className={styles.timelinePoint}></div>
                {idx < examData.history.length - 1 && <div className={styles.timelineLine}></div>}
                
                <div className={styles.timelineContent}>
                  <span className={styles.timelineDate}>{hist.timestamp}</span>
                  <h3 className={styles.timelineActionTitle}>{hist.action}</h3>
                  {hist.action.includes('Phát hành') ? (
                    <>
                      <p className={styles.timelineDesc}>Bài thi đã được công bố cho các lớp 12A1, 12A2, 11B3.</p>
                      <div className={styles.timelineUser}>
                        <div className={styles.timelineAvatar}>NV</div>
                        <span className={styles.timelineUserName}>Bởi {hist.user}</span>
                      </div>
                    </>
                  ) : hist.action.includes('câu hỏi') ? (
                    <p className={styles.timelineDesc}>Thay đổi 5 câu hỏi khó ở chương 2 và điều chỉnh thang điểm.</p>
                  ) : (
                    <p className={styles.timelineDesc}>Tạo khung bài kiểm tra giữa kỳ 1 theo chuẩn của tổ bộ môn.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
