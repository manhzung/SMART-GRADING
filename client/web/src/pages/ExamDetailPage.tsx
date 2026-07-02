import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import env from '../config/env';
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
import { useSubmissionStore, type BackendStudent, type BackendClass, type BackendVersion } from '../presentation/store/submissionStore';
import { apiService } from '../core/api';
import { mapExamDetailData } from './examPageAdapters';
import { SubmissionDetailModal } from '../components/submission/SubmissionDetailModal';
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
  const [submissionModalId, setSubmissionModalId] = useState<string | null>(null);

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
          <p>Loading exam data...</p>
        </div>
      );
    }
    return (
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link to="/exams" className={styles.breadcrumbLink}>Exam Management</Link>
          <span className={styles.breadcrumbSeparator}>&gt;</span>
          <span className={styles.breadcrumbActive}>Không tìm thấy</span>
        </nav>
        <div className={styles.emptyState}>
          <Info size={48} className={styles.emptyIcon} />
          <h2>Exam not found</h2>
          <p>This exam does not exist or has been removed from the system.</p>
          <Link to="/exams" className={styles.btnSolid}>Back to list</Link>
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
      case 'completed': return 'COMPLETED';
      case 'in_progress': return 'IN PROGRESS';
      case 'published': return 'PUBLISHED';
      case 'draft':
      default:
        return 'DRAFT';
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
      case 'PDF Generated':
        return <span className={`${styles.statusBadgeAMC} ${styles.statusReady}`}><CheckCircle2 size={10} />Generated</span>;
      case 'Not generated':
        return <span className={`${styles.statusBadgeAMC} ${styles.statusPending}`}>Not generated</span>;
      case 'Error':
        return <span className={`${styles.statusBadgeAMC} ${styles.statusError}`}><AlertTriangle size={10} />Error</span>;
      default:
        return <span className={`${styles.statusBadgeAMC} ${styles.statusReady}`}><CheckCircle2 size={10} />{status}</span>;
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    if (window.confirm('Are you sure you want to publish this exam? Students will be able to view exam information.')) {
      try {
        await publishExam(id);
        alert('Exam published successfully!');
      } catch (err: any) {
        alert(err.message || 'Error publishing exam');
      }
    }
  };

  const handleCompleteExam = async () => {
    if (!id) return;
    if (!window.confirm('End exam? Cannot be undone.')) return;
    setIsCompleting(true);
    try {
      await completeExam(id);
      alert('Exam ended');
      await fetchExamById(id);
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleGenerateVersions = async () => {
    if (!id) return;
    const count = prompt('Enter number of variants to shuffle (Default: 4):', '4');
    if (count === null) return;
    const num = parseInt(count, 10);
    if (isNaN(num) || num <= 0) {
      alert('Please enter a valid positive integer.');
      return;
    }
    try {
      await generateExamVersions(id, num);
      alert('Variants shuffled and generated successfully!');
    } catch (err: any) {
      alert(err.message || 'Error generating variants');
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
      alert('Compile complete! Check variant status below.');
    } catch (err: any) {
      alert(err.message || 'Error during compile: ' + err.message);
    }
  };

  const handleExportPdf = async () => {
    if (!id) return;
    try {
      await exportExamPdf(id);
    } catch (err: any) {
      alert(err.message || 'Error exporting exam');
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
      const apiBase = env.apiUrl.replace(/\/api\/v1\/?$/, '');
      const res = await fetch(`${apiBase}${pdfUrl}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Error downloading file');
    }
  };

  const handleExportResults = async (format: 'pdf' | 'excel' = 'pdf') => {
    if (!id) return;
    try {
      await exportResults(id, format);
    } catch (err: any) {
      alert(err.message || 'Error exporting results');
    }
  };

  const handleGenerateReport = async () => {
    if (!id) return;
    if (!window.confirm('Generate analysis report for this exam?')) return;
    try {
      await apiService.post(`/reports/exam/${id}/generate`);
      alert('Report generated successfully!');
      await fetchStatistics(id);
    } catch (err: any) {
      alert(err.message || 'Error generating report');
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
        alert('This exam has no variants yet. Please generate variants first.');
        return;
      }

      const answerSheetUrls = versions
        .map((v) => ({ versionCode: v.versionCode, url: v.answerSheetPdfUrl }))
        .filter((v) => !!v.url);

      if (answerSheetUrls.length === 0) {
        alert('OMR answer sheets not generated yet. Please compile AMC first.');
        return;
      }

      // Download each answer sheet PDF
      for (const { versionCode, url } of answerSheetUrls) {
        await handleDownloadPdf(url!, `PhieuTraLoi_${versionCode}.pdf`);
      }
    } catch (err: any) {
      alert(err.message || 'Error downloading OMR sheets');
    } finally {
      setIsExportingOmr(false);
    }
  };

  const handleDownloadOmrTemplateJson = async () => {
    if (!id) return;
    if (!examData.omrTemplateReady) {
      alert('OMR template not ready. Please compile AMC first.');
      return;
    }
    try {
      await downloadExamTemplateJson(id);
    } catch (err: any) {
      alert(err.message || 'Error downloading OMR template');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('WARNING: Are you sure you want to delete this exam? This action will archive the exam.')) {
      try {
        await deleteExam(examData._id);
        alert('Exam deleted.');
        navigate('/exams');
      } catch (err: any) {
        alert(err.message || 'Error deleting exam');
      }
    }
  };

  const handleAddClass = async () => {
    if (!id) return;
    const className = prompt('Enter class name to add to this exam (e.g. 12A3):');
    if (!className) return;
    try {
      await addClassesToExam(id, [className]);
      alert(`Added class ${className} to exam.`);
      await fetchExamById(id);
    } catch (err: any) {
      alert(err.message || 'Cannot add class to exam.');
    }
  };

  const handleRemoveClass = async (classId: string, className: string) => {
    if (!id) return;
    if (window.confirm(`Remove class ${className} from this exam's participant list?`)) {
      try {
        await removeClassesFromExam(id, [classId]);
        alert(`Removed class ${className}.`);
        await fetchExamById(id);
      } catch (err: any) {
        alert(err.message || 'Cannot remove class from exam.');
      }
    }
  };

  return (
    <div className={styles.container}>
      {/* Breadcrumbs */}
      <nav className={styles.breadcrumb}>
        <Link to="/exams" className={styles.breadcrumbLink}>Exam Management</Link>
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
            <button className={styles.btnOutline} onClick={() => navigate(`/exams/${examData._id}/edit`)} title="Edit exam">
              <Edit size={16} />
              <span>Edit</span>
            </button>
            <button className={styles.btnOutline} onClick={handleExportPdf} title="Export exam as PDF">
              <Printer size={16} />
              <span>Print exam</span>
            </button>
            <button className={styles.btnOutline} onClick={handleExportOmrSheet} disabled={isExportingOmr} title="Tải phiếu trả lời OMR">
              <FileDown size={16} />
              <span>{isExportingOmr ? 'Downloading...' : 'Print OMR Sheets'}</span>
            </button>
          </div>
          
          {/* Dấu phân cách */}
          <div className={styles.actionDivider} />
          
          {/* Nhóm Chính - Tạo phiên bản và xuất bản */}
          <div className={styles.actionGroup}>
            <button className={styles.btnOutline} onClick={handleGenerateVersions} disabled={isGeneratingVersions} title="Generate shuffled variants">
              <Copy size={16} />
              <span>Generate variants</span>
            </button>
            {examData.status !== 'completed' && (
              <button className={styles.btnOutlineComplete} onClick={handleCompleteExam} disabled={isCompleting} title="End exam">
                <CheckCircle2 size={16} />
                <span>{isCompleting ? 'Processing...' : 'End'}</span>
              </button>
            )}
            <button className={styles.btnSolidPublish} onClick={handlePublish} disabled={isPublishing || examData.status !== 'draft'} title="Publish exam">
              <Radio size={16} />
              <span>Publish</span>
            </button>
          </div>
          
          {/* Nút Xóa - ở cuối vì là tác vụ nguy hiểm */}
          <button className={styles.btnDanger} onClick={handleDelete} title="Delete exam">
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      <p className={styles.subtitle}>
        Last updated: {examData.updatedDate} by {examData.creator}
      </p>

      {/* Grid: Columns */}
      <div className={styles.mainGrid}>
        
        {/* Left Column: General + Detailed info */}
        <div className={styles.leftCol}>
          
          {/* Card: General Information */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.headerTitle}>
                <h2>General Information</h2>
                <Info size={16} className={styles.infoIcon} />
              </div>
            </div>
            
            <div className={styles.cardContent}>
              <div className={styles.infoGrid}>
                <div className={styles.infoField}>
                  <span className={styles.infoLabel}>EXAM CODE</span>
                  <span className={styles.infoValue}>{examData.code}</span>
                </div>
                <div className={styles.infoField}>
                  <span className={styles.infoLabel}>CREATOR</span>
                  <span className={styles.infoValue}>{examData.creator}</span>
                </div>
                <div className={styles.infoField}>
                  <span className={styles.infoLabel}>CREATED DATE</span>
                  <span className={styles.infoValue}>{examData.createdDate}</span>
                </div>
              </div>
              <div className={styles.divider} />
              <div className={styles.descriptionSection}>
                <span className={styles.infoLabel}>DETAILED DESCRIPTION</span>
                <p className={styles.descriptionText}>{examData.description}</p>
              </div>
            </div>
          </div>

          {/* Card: Exam Information */}
          <div className={styles.card}>
            <div className={styles.cardHeaderFlex}>
              <div className={styles.headerTitle}>
                <h2>Exam Information</h2>
              </div>
              <div className={styles.progressSection}>
                <span className={styles.progressText}>
                  SUBMISSION RATE: <strong>{examData.submissionsCount} / {examData.totalStudents} ({Math.round((examData.submissionsCount / examData.totalStudents) * 100)}%)</strong>
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
                    <span className={styles.detailLabel}>EXAM DATE</span>
                    <span className={styles.detailValue}>{examData.examDate}</span>
                  </div>
                </div>

                <div className={styles.detailBox}>
                  <div className={styles.detailIcon}><Clock size={16} /></div>
                  <div className={styles.detailText}>
                    <span className={styles.detailLabel}>START TIME</span>
                    <span className={styles.detailValue}>{examData.startTime}</span>
                  </div>
                </div>

                <div className={styles.detailBox}>
                  <div className={styles.detailIcon}><Timer size={16} /></div>
                  <div className={styles.detailText}>
                    <span className={styles.detailLabel}>DURATION</span>
                    <span className={styles.detailValue}>{examData.duration} minutes</span>
                  </div>
                </div>

                <div className={styles.detailBox}>
                  <div className={styles.detailIcon}><BookOpen size={16} /></div>
                  <div className={styles.detailText}>
                    <span className={styles.detailLabel}>NUMBER OF QUESTIONS</span>
                    <span className={styles.detailValue}>{examData.totalQuestions} questions</span>
                  </div>
                </div>

                <div className={styles.detailBox}>
                  <div className={styles.detailIcon}><Star size={16} /></div>
                  <div className={styles.detailText}>
                    <span className={styles.detailLabel}>SCORE SCALE</span>
                    <span className={styles.detailValue}>{examData.scoreScale}</span>
                  </div>
                </div>

                <div className={styles.detailBox}>
                  <div className={styles.detailIcon}><CheckCircle2 size={16} /></div>
                  <div className={styles.detailText}>
                    <span className={styles.detailLabel}>PASSING SCORE</span>
                    <span className={styles.detailValue}>{examData.passingScore.toFixed(1)}</span>
                  </div>
                </div>

                <div className={styles.detailBox}>
                  <div className={styles.detailIcon}><Shield size={16} /></div>
                  <div className={styles.detailText}>
                    <span className={styles.detailLabel}>SUPERVISION</span>
                    <span className={styles.detailValue}>{examData.monitoring}</span>
                  </div>
                </div>

                <div className={styles.detailBox}>
                  <div className={styles.detailIcon}><Layers size={16} /></div>
                  <div className={styles.detailText}>
                    <span className={styles.detailLabel}>NUMBER OF VARIANTS</span>
                    <span className={styles.detailValue}>{examData.versions.length} variants</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Statistics + Classes */}
        <div className={styles.rightCol}>
          
          {/* Card: Results Statistics */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.headerTitle}>
                <h2>Results Statistics</h2>
              </div>
            </div>
            
            <div className={styles.cardContent}>
              {/* Stats Grid */}
              <div className={styles.stats2x2}>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>Average Score</span>
                  <span className={styles.statValue}>
                    {statistics?.averageScore != null ? statistics.averageScore.toFixed(1) : '—'}
                  </span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>Pass Rate</span>
                  <span className={`${styles.statValue} ${styles.colorAmber}`}>
                    {statistics?.passRate != null ? `${statistics.passRate}%` : '—'}
                  </span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>Highest</span>
                  <span className={styles.statValue}>
                    {statistics?.highestScore != null ? statistics.highestScore.toFixed(1) : '—'}
                  </span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>Lowest</span>
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
                <p style={{ color: '#999', textAlign: 'center', padding: '16px' }}>No score distribution data yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Card: Participating Classes */}
          <div className={styles.card}>
            <div className={styles.cardHeaderFlex}>
              <div className={styles.headerTitle}>
                <h2>Participating Classes</h2>
              </div>
              <button className={styles.settingsBtn} title="Manage classes">
                <Settings size={16} />
              </button>
            </div>
            
            <div className={styles.cardContent}>
              <div className={styles.classesList}>
                {examData.classes.length === 0 ? (
                  <p className={styles.emptyText}>No classes yet.</p>
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
                      <button className={styles.classRemoveBtn} onClick={() => handleRemoveClass(cls._id, cls.name)} title="Remove class">
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              <button className={styles.btnAddClass} onClick={handleAddClass}>
                <span>+ Add class</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Section: Question Bank */}
      <div className={styles.sectionCard}>
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <div className={styles.headerTitle}>
              <h2>Question Bank ({examData.totalQuestions})</h2>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.btnOutlineCompact} onClick={() => alert('Shuffling questions...')}>Shuffle questions</button>
              <button className={styles.btnSolidCompact} onClick={() => navigate('/question-bank')}>Add questions</button>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>QUESTION CONTENT</th>
                  <th style={{ width: '120px' }}>TYPE</th>
                  <th style={{ width: '80px' }}>ANSWER</th>
                  <th style={{ width: '80px' }}>SCORE</th>
                  <th style={{ width: '120px' }}>DIFFICULTY</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {examData.questions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#999' }}>
                      No questions yet.
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
                          {q.difficulty === 'easy' ? 'Easy' : q.difficulty === 'medium' ? 'Medium' : 'Hard'}
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
                <>Showing all {examData.questions.length} / {examData.questions.length} questions</>
              ) : (
                <>Showing {indexOfFirstQuestion + 1}-{Math.min(indexOfLastQuestion, examData.questions.length)} / {examData.questions.length} questions</>
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
                Collapse list
              </button>
            ) : (
              <button
                className={styles.viewAllLink}
                onClick={() => setShowAllQuestions(true)}
              >
                View all {examData.totalQuestions} questions
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section: Exam Variants */}
      <div className={styles.sectionCard}>
        <div className={styles.card}>
          <div className={styles.cardHeaderFlex}>
            <div className={styles.headerTitle}>
              <h2>Exam Variants ({examData.versions.length})</h2>
              {examData.omrTemplateReady ? (
                <span className={`${styles.templateBadge} ${styles.templateReady}`}>OMR: Ready</span>
              ) : (
                <span className={`${styles.templateBadge} ${styles.templatePlaceholder}`}>OMR: Not ready</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className={styles.btnOutlineCompact}
                onClick={() => setIsGenerateModalOpen(true)}
                disabled={isGeneratingVersions}
              >
                <Copy size={13} />
                {isGeneratingVersions ? 'Generating...' : 'Generate variants'}
              </button>
              <button
                className={styles.btnOutlineCompact}
                onClick={handleExportOmrSheet}
                disabled={isExportingOmr}
                title="Tải phiếu trả lời OMR"
              >
                <FileDown size={13} />
                {isExportingOmr ? 'Downloading...' : 'Print OMR Sheets'}
              </button>
              <button
                className={styles.btnSolidCompact}
                onClick={() => setIsCompileModalOpen(true)}
                disabled={isCompiling || examData.versions.length === 0}
              >
                {isCompiling ? 'Compiling...' : 'Compile'}
              </button>
            </div>
          </div>

          {examData.versions.length === 0 ? (
            <div className={styles.emptyState}>
              <FileText size={32} className={styles.emptyIcon} />
              <p>No variants yet</p>
              <button className={styles.btnSolid} onClick={handleGenerateVersions}>
                Generate first variant
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
                    <span className={styles.versionCode}>Variant {ver.code}</span>
                    <span className={styles.versionMeta}>
                      Updated: {ver.updatedAt}
                      {ver.generatedAt && ` • Compiled: ${ver.generatedAt}`}
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
                          title="Download exam"
                        >
                          <Download size={14} />
                          Exam
                        </button>
                        {ver.corrigePdfUrl && (
                          <button
                            className={styles.actionBtn}
                            onClick={() => handleDownloadPdf(ver.corrigePdfUrl, `DapAn_${ver.code}.pdf`)}
                            title="Download answer key"
                          >
                            <Download size={14} />
                            Answer key
                          </button>
                        )}
                        <button
                          className={styles.actionBtnSecondary}
                          onClick={() => handleCompile(true)}
                          disabled={isCompiling}
                          title="Re-compile"
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

      {/* Section: Submissions List */}
      <div className={styles.sectionCard}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.headerTitle}>
              <h2>Submissions List ({submissions.length})</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {examData.status === 'completed' && (
                <button className={styles.btnOutlineCompact} onClick={handleGenerateReport}>
                  Generate report
                </button>
              )}
              <button className={styles.btnOutlineCompact} onClick={() => handleExportResults('pdf')}>
                <FileDown size={14} />
                Export PDF
              </button>
              <button className={styles.btnSolidCompact} onClick={() => handleExportResults('excel')}>
                Export Excel
              </button>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th style={{ width: '180px' }}>STUDENT</th>
                  <th style={{ width: '100px' }}>STUDENT ID</th>
                  <th style={{ width: '100px' }}>CLASS</th>
                  <th style={{ width: '80px' }}>VARIANT</th>
                  <th style={{ width: '80px' }}>SCORE</th>
                  <th style={{ width: '80px' }}>RATE</th>
                  <th style={{ width: '100px' }}>STATUS</th>
                  <th style={{ width: '140px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#999' }}>
                      No submissions yet.
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub, idx) => {
                    // Extract populated data from backend response
                    const studentObj = typeof sub.studentId === 'object' && sub.studentId !== null
                      ? sub.studentId as BackendStudent
                      : null;
                    const studentName = studentObj?.name || '—';
                    const studentCode = studentObj?.studentCode || '—';
                    
                    const classObj = typeof sub.classId === 'object' && sub.classId !== null
                      ? sub.classId as BackendClass
                      : null;
                    const className = classObj?.name || '—';
                    
                    const versionObj = typeof sub.versionId === 'object' && sub.versionId !== null
                      ? sub.versionId as BackendVersion
                      : null;
                    const versionCode = versionObj?.versionCode || '—';
                    
                    const score = sub.score ?? sub.totalScore ?? 0;
                    const pct = sub.maxScore ? (score / sub.maxScore * 100) : 0;
                    
                    return (
                      <tr key={sub._id || idx}>
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td>{studentName}</td>
                        <td>{studentCode}</td>
                        <td>{className}</td>
                        <td>{versionCode}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                          {score > 0 ? score.toFixed(1) : '—'}
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
                            {sub.status === 'completed' ? 'Completed'
                              : sub.status === 'scanned' ? 'Scanned'
                              : sub.status === 'pending' ? 'Pending scan'
                              : sub.status === 'appealed' ? 'Appealed'
                              : sub.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className={styles.actionIconButton}
                            title="View details"
                            onClick={() => sub._id && setSubmissionModalId(sub._id)}
                          >
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
              alert(`Generated ${count} variants successfully!`);
              setIsGenerateModalOpen(false);
            } catch (err: any) {
              alert(err.message || 'Error generating variants');
            }
          }}
          isGenerating={isGeneratingVersions}
        />
      )}

      {/* ── Submission Detail Modal ── */}
      <SubmissionDetailModal
        open={!!submissionModalId}
        submissionId={submissionModalId ?? undefined}
        onClose={() => setSubmissionModalId(null)}
        onSaved={() => {
          if (id) fetchByExam(id);
        }}
      />
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
          <h3 className={styles.modalTitle}>Compile exam with AMC</h3>
          <button className={styles.modalClose} onClick={onClose} disabled={isCompiling}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.engineOptions}>
            <div className={styles.engineOption} style={{ cursor: 'default' }}>
              <div className={styles.engineOptionLabel}>
                <span className={styles.engineOptionName}>AMC (LaTeX)</span>
                <span className={styles.engineOptionDesc}>Generate standard OMR exam with WSL2</span>
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
            <span>Force regenerate (delete old PDFs)</span>
          </label>

          <div className={styles.modalWarning}>
            <AlertTriangle size={14} />
            <span>
              Compilation process may take 1-3 minutes depending on the number of variants. Please do not close this window during processing.
            </span>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose} disabled={isCompiling}>
            Cancel
          </button>
          <button
            className={styles.btnCompile}
            onClick={() => onCompile(forceRegenerate)}
            disabled={isCompiling}
          >
            {isCompiling ? (
              <>
                <span className={styles.compilingSpinner} />
                Compiling...
              </>
            ) : (
              <>
                <Cpu size={14} />
                Start Compile
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
      alert('Number of variants must be between 1 and 100');
      return;
    }
    onGenerate(count);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Generate exam variants</h3>
          <button className={styles.modalClose} onClick={onClose} disabled={isGenerating}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <p style={{ marginBottom: '16px', color: '#64748b' }}>
            Enter the number of variants you want to generate. Each variant will have a different shuffled question order.
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
            Cancel
          </button>
          <button
            className={styles.btnCompile}
            onClick={handleSubmit}
            disabled={isGenerating || count < 1}
          >
            {isGenerating ? (
              <>
                <span className={styles.compilingSpinner} />
                Generating...
              </>
            ) : (
              <>
                <Copy size={14} />
                Generate {count} variants
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
