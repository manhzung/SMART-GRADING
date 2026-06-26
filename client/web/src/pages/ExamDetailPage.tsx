import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Edit,
  Trash2,
  Printer,
  Copy,
  Radio,
  Calendar,
  Clock,
  Timer,
  Star,
  Shield,
  BookOpen,
  Layers,
  X,
  CheckCircle2,
  FileText,
  FileDown,
  AlertTriangle,
  Cpu,
  RefreshCw,
  Settings,
  Download,
  Info,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useExamStore } from '../presentation/store/examStore';
import { useSubmissionStore } from '../presentation/store/submissionStore';
import { apiService } from '../core/api';
import { mapExamDetailData } from './examPageAdapters';
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
    exportResults,
    generatePapers,
    isCompiling,
    fetchExamTemplate,
    downloadExamTemplateJson,
    examTemplate,
  } = useExamStore();

  const {
    statistics,
    isLoading: isSubLoading,
    fetchByExam,
    fetchStatistics,
    submissions,
  } = useSubmissionStore();

  const [isExportingOmr, setIsExportingOmr] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [currentQuestionPage, setCurrentQuestionPage] = useState(1);
  const questionsPerPage = 3;
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [isCompileModalOpen, setIsCompileModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchExamById(id);
      fetchExamVersions(id);
      fetchByExam(id);
      fetchStatistics(id);
      // Load exam template for OMR readiness check (used in mapExamDetailData)
      fetchExamTemplate(id);
    }
  }, [id, fetchExamById, fetchExamVersions, fetchByExam, fetchStatistics, fetchExamTemplate]);

  const examData = useMemo(() => mapExamDetailData(currentExam, examVersions, examTemplate), [currentExam, examVersions, examTemplate]);

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
  const displayedQuestions = showAllQuestions
    ? examData.questions
    : examData.questions.slice(indexOfFirstQuestion, indexOfLastQuestion);
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

  const getEngineBadge = () => {
    return (
      <span className={`${styles.engineBadge} ${styles.engineBadgeAMC}`}>
        <Cpu size={9} />
        AMC
      </span>
    );
  };

  const getVersionStatusBadge = (status: string) => {
    switch (status) {
      case 'Đã sinh PDF':
        return <span className={`${styles.statusBadgeAMC} ${styles.statusReady}`}><CheckCircle2 size={10} />Đã sinh</span>;
      case 'Chưa sinh':
        return <span className={`${styles.statusBadgeAMC} ${styles.statusPending}`}>Chưa sinh</span>;
      case 'Lỗi':
        return <span className={`${styles.statusBadgeAMC} ${styles.statusError}`}><AlertTriangle size={10} />Lỗi</span>;
      default:
        return <span className={`${styles.statusBadgeAMC} ${styles.statusReady}`}><CheckCircle2 size={10} />{status}</span>;
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

  const handleCompile = async (forceRegenerate: boolean) => {
    if (!id) return;
    try {
      await generatePapers(id, { forceRegenerate });
      await fetchExamVersions(id);
      // Re-fetch the exam so the OMRTemplate (with new templateJson) is in currentExam.
      await fetchExamById(id);
      // Fetch the exam-level template (now sourced from OMRTemplate.templateJson).
      await fetchExamTemplate(id);
      setIsCompileModalOpen(false);
      alert('Compile hoàn tất! Kiểm tra trạng thái các mã đề bên dưới.');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi compile: ' + err.message);
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

  const handleDownloadPdf = async (pdfUrl: string | null | undefined, filename: string) => {
    if (!pdfUrl) return;

    // Cloudinary (or any absolute http URL): open directly in new tab
    if (/^https?:\/\//i.test(pdfUrl)) {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Local server path: fetch with auth header, then trigger browser download
    try {
      const token = localStorage.getItem('token') || '';
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiBase}${pdfUrl}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Tải thất bại');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải file');
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
      await apiService.post(`/reports/exam/${id}/generate`);
      alert('Báo cáo đã được tạo thành công!');
      await fetchStatistics(id);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo báo cáo');
    }
  };

  const handleExportOmrSheet = async () => {
    if (!id) return;

    setIsExportingOmr(true);
    try {
      // Fetch versions to get answerSheetPdfUrl from each ExamVersion
      const versionsRes = await apiService.get<any>(`/exams/${id}/versions`);
      const versions: any[] = Array.isArray(versionsRes) ? versionsRes : (versionsRes.results || []);

      if (versions.length === 0) {
        alert('Bài thi chưa có mã đề nào. Vui lòng sinh mã đề trước.');
        return;
      }

      const answerSheetUrls = versions
        .map((v) => ({ versionCode: v.versionCode, url: v.answerSheetPdfUrl }))
        .filter((v) => !!v.url);

      if (answerSheetUrls.length === 0) {
        alert('Phiếu OMR chưa được sinh. Vui lòng compile AMC trước.');
        return;
      }

      // Download each answer sheet PDF
      for (const { versionCode, url } of answerSheetUrls) {
        await handleDownloadPdf(url!, `PhieuTraLoi_${versionCode}.pdf`);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải phiếu OMR');
    } finally {
      setIsExportingOmr(false);
    }
  };

  const handleDownloadOmrTemplateJson = async () => {
    if (!id) return;
    if (!examData.omrTemplateReady) {
      alert('OMR template chưa sẵn sàng. Hãy compile AMC trước.');
      return;
    }
    try {
      await downloadExamTemplateJson(id);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải OMR template');
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
        
        {/* Actions - Nhóm lại: Chính và Phụ */}
        <div className={styles.actions}>
          {/* Nhóm Phụ - Các tác vụ xem/in */}
          <div className={styles.actionGroup}>
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
          </div>
          
          {/* Dấu phân cách */}
          <div className={styles.actionDivider} />
          
          {/* Nhóm Chính - Tạo phiên bản và xuất bản */}
          <div className={styles.actionGroup}>
            <button className={styles.btnOutline} onClick={handleGenerateVersions} disabled={isGeneratingVersions} title="Sinh mã đề trộn">
              <Copy size={16} />
              <span>Sinh phiên bản</span>
            </button>
            {examData.status !== 'completed' && (
              <button className={styles.btnOutlineComplete} onClick={handleCompleteExam} disabled={isCompleting} title="Kết thúc kỳ thi">
                <CheckCircle2 size={16} />
                <span>{isCompleting ? 'Đang xử lý...' : 'Kết thúc'}</span>
              </button>
            )}
            <button className={styles.btnSolidPublish} onClick={handlePublish} disabled={isPublishing || examData.status !== 'draft'} title="Xuất bản đề thi">
              <Radio size={16} />
              <span>Xuất bản</span>
            </button>
          </div>
          
          {/* Nút Xóa - ở cuối vì là tác vụ nguy hiểm */}
          <button className={styles.btnDanger} onClick={handleDelete} title="Xóa bài thi">
            <Trash2 size={16} />
            <span>Xóa</span>
          </button>
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
                  displayedQuestions.map((q, idx) => (
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
              {showAllQuestions ? (
                <>Hiển thị tất cả {examData.questions.length} / {examData.questions.length} câu</>
              ) : (
                <>Hiển thị {indexOfFirstQuestion + 1}-{Math.min(indexOfLastQuestion, examData.questions.length)} / {examData.questions.length} câu</>
              )}
            </div>
            <div className={styles.pageButtons}>
              {!showAllQuestions && (
                <>
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
                </>
              )}
            </div>
          </div>
          
          <div className={styles.viewAllContainer}>
            {showAllQuestions ? (
              <button
                className={styles.viewAllLink}
                onClick={() => {
                  setShowAllQuestions(false);
                  setCurrentQuestionPage(1);
                }}
              >
                Thu gọn danh sách
              </button>
            ) : (
              <button
                className={styles.viewAllLink}
                onClick={() => setShowAllQuestions(true)}
              >
                Xem tất cả {examData.totalQuestions} câu hỏi
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section: Phiên bản đề thi */}
      <div className={styles.sectionCard}>
        <div className={styles.card}>
          <div className={styles.cardHeaderFlex}>
            <div className={styles.headerTitle}>
              <h2>Phiên bản đề thi ({examData.versions.length})</h2>
              {examData.omrTemplateReady ? (
                <span className={`${styles.templateBadge} ${styles.templateReady}`}>OMR: Sẵn sàng</span>
              ) : (
                <span className={`${styles.templateBadge} ${styles.templatePlaceholder}`}>OMR: Chưa sẵn sàng</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className={styles.btnOutlineCompact}
                onClick={() => setIsGenerateModalOpen(true)}
                disabled={isGeneratingVersions}
              >
                <Copy size={13} />
                {isGeneratingVersions ? 'Đang sinh...' : 'Sinh mã đề'}
              </button>
              <button
                className={styles.btnOutlineCompact}
                onClick={handleExportOmrSheet}
                disabled={isExportingOmr}
                title="Tải phiếu trả lời OMR"
              >
                <FileDown size={13} />
                {isExportingOmr ? 'Đang tải...' : 'In Phiếu OMR'}
              </button>
              <button
                className={styles.btnSolidCompact}
                onClick={() => setIsCompileModalOpen(true)}
                disabled={isCompiling || examData.versions.length === 0}
              >
                {isCompiling ? 'Đang compile...' : 'Compile'}
              </button>
            </div>
          </div>

          {examData.versions.length === 0 ? (
            <div className={styles.emptyState}>
              <FileText size={32} className={styles.emptyIcon} />
              <p>Chưa có mã đề nào</p>
              <button className={styles.btnSolid} onClick={handleGenerateVersions}>
                Sinh mã đề đầu tiên
              </button>
            </div>
          ) : (
            <div className={styles.versionsList}>
              {examData.versions.map((ver, idx) => {
                const hasErrors = ver.hasErrors;
                return (
                <div key={ver.code} className={styles.versionRow}>
                  <div className={styles.versionIndex}>{idx + 1}</div>
                  <div className={styles.versionInfo}>
                    <span className={styles.versionCode}>Mã đề {ver.code}</span>
                    <span className={styles.versionMeta}>
                      Cập nhật: {ver.updatedAt}
                      {ver.generatedAt && ` • Đã compile: ${ver.generatedAt}`}
                    </span>
                  </div>
                  <div className={styles.versionStatus}>
                    {getVersionStatusBadge(ver.status)}
                    {hasErrors && ver.errors.length > 0 && (
                      <span className={styles.errorBadge}>
                        <AlertTriangle size={11} /> {ver.errors[0]}
                      </span>
                    )}
                  </div>
                  <div className={styles.versionActions}>
                    {ver.pdfUrl ? (
                      <>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleDownloadPdf(ver.pdfUrl, `De_${ver.code}.pdf`)}
                          title="Tải đề thi"
                        >
                          <Download size={14} />
                          Đề
                        </button>
                        {ver.corrigePdfUrl && (
                          <button
                            className={styles.actionBtn}
                            onClick={() => handleDownloadPdf(ver.corrigePdfUrl, `DapAn_${ver.code}.pdf`)}
                            title="Tải đáp án"
                          >
                            <Download size={14} />
                            Đáp án
                          </button>
                        )}
                        <button
                          className={styles.actionBtnSecondary}
                          onClick={() => handleCompile(true)}
                          disabled={isCompiling}
                          title="Compile lại"
                        >
                          <RefreshCw size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        className={styles.actionBtnPrimary}
                        onClick={() => handleCompile(false)}
                        disabled={isCompiling}
                      >
                        <Cpu size={14} />
                        Compile
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
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

      {/* ── Compile AMC Modal ── */}
      {isCompileModalOpen && (
        <CompileModal
          examId={id || ''}
          onClose={() => setIsCompileModalOpen(false)}
          onCompile={handleCompile}
          isCompiling={isCompiling}
        />
      )}

      {/* ── Generate Versions Modal ── */}
      {isGenerateModalOpen && (
        <GenerateVersionsModal
          onClose={() => setIsGenerateModalOpen(false)}
          onGenerate={async (count) => {
            if (!id) return;
            try {
              await generateExamVersions(id, count);
              alert(`Đã sinh ${count} mã đề thành công!`);
              setIsGenerateModalOpen(false);
            } catch (err: any) {
              alert(err.message || 'Lỗi khi sinh mã đề');
            }
          }}
          isGenerating={isGeneratingVersions}
        />
      )}
    </div>
  );
}

function CompileModal({
  onClose,
  onCompile,
  isCompiling,
}: {
  onClose: () => void;
  onCompile: (force: boolean) => void;
  isCompiling: boolean;
}) {
  const [forceRegenerate, setForceRegenerate] = useState(false);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Compile đề thi với AMC</h3>
          <button className={styles.modalClose} onClick={onClose} disabled={isCompiling}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.engineOptions}>
            <div className={styles.engineOption} style={{ cursor: 'default' }}>
              <div className={styles.engineOptionLabel}>
                <span className={styles.engineOptionName}>AMC (LaTeX)</span>
                <span className={styles.engineOptionDesc}>Sinh đề chuẩn OMR với WSL2</span>
              </div>
            </div>
          </div>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={forceRegenerate}
              onChange={(e) => setForceRegenerate(e.target.checked)}
              disabled={isCompiling}
            />
            <span>Buộc tạo lại (xóa PDF cũ)</span>
          </label>

          <div className={styles.modalWarning}>
            <AlertTriangle size={14} />
            <span>
              Quá trình compile có thể mất 1–3 phút tùy số lượng mã đề. Vui lòng không đóng cửa sổ này trong khi đang xử lý.
            </span>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose} disabled={isCompiling}>
            Hủy
          </button>
          <button
            className={styles.btnCompile}
            onClick={() => onCompile(forceRegenerate)}
            disabled={isCompiling}
          >
            {isCompiling ? (
              <>
                <span className={styles.compilingSpinner} />
                Đang compile...
              </>
            ) : (
              <>
                <Cpu size={14} />
                Bắt đầu Compile
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function GenerateVersionsModal({
  onClose,
  onGenerate,
  isGenerating,
}: {
  onClose: () => void;
  onGenerate: (count: number) => void;
  isGenerating: boolean;
}) {
  const [count, setCount] = useState(4);

  const handleSubmit = () => {
    if (count < 1 || count > 100) {
      alert('Số lượng mã đề phải từ 1 đến 100');
      return;
    }
    onGenerate(count);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Sinh mã đề thi</h3>
          <button className={styles.modalClose} onClick={onClose} disabled={isGenerating}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <p style={{ marginBottom: '16px', color: '#64748b' }}>
            Nhập số lượng mã đề bạn muốn sinh. Mỗi mã đề sẽ có thứ tự câu hỏi được xáo trộn khác nhau.
          </p>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Số lượng mã đề</label>
            <input
              type="number"
              className={styles.formInput}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 0)}
              min={1}
              max={100}
              disabled={isGenerating}
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose} disabled={isGenerating}>
            Hủy
          </button>
          <button
            className={styles.btnCompile}
            onClick={handleSubmit}
            disabled={isGenerating || count < 1}
          >
            {isGenerating ? (
              <>
                <span className={styles.compilingSpinner} />
                Đang sinh...
              </>
            ) : (
              <>
                <Copy size={14} />
                Sinh {count} mã đề
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
