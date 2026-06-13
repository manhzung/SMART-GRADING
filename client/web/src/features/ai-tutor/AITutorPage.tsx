import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle2,
  XCircle,
  ArrowRight,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import AITutorChat from './AITutorChat';
import { aiChatService } from '../../services/ai-chat.service';
import type { AIReport } from '../../types';
import styles from './AITutorPage.module.css';

export default function AITutorPage() {
  const [selectedSubject, setSelectedSubject] = useState('subj001');
  const navigate = useNavigate();
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['ai-reports'],
    queryFn: () => aiChatService.getReports({ limit: 10 }),
  });
  const [activeReport, setActiveReport] = useState<AIReport | null>(reports[0] || null);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'analysis':
        setActiveReport(reports[1] || reports[0] || null);
        break;
      case 'suggestions':
        setActiveReport(reports[3] || reports[0] || null);
        break;
      case 'explanation':
        setActiveReport(reports[2] || reports[0] || null);
        break;
      default:
        break;
    }
  };

  const handleViewDetails = (report: AIReport) => {
    const examId = typeof report.examId === 'object' ? report.examId._id : report.examId;
    navigate(`/analytics?examId=${examId}`);
  };

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <span>Workspace</span>
        <span className={styles.breadcrumbSeparator}>&gt;</span>
        <span className={styles.breadcrumbActive}>AI Tutor</span>
      </nav>

      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Brain size={24} />
          </div>
          <div>
            <h1 className={styles.title}>AI Tutor</h1>
            <p className={styles.subtitle}>
              Trợ lý học tập thông minh - Phân tích kết quả và đưa ra gợi ý cá nhân hóa
            </p>
          </div>
        </div>
        <div className={styles.headerBadge}>
          <Sparkles size={14} />
          <span>AI-Powered</span>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Chat Section */}
        <div className={styles.chatSection}>
          <AITutorChat
            selectedSubject={selectedSubject}
            onSubjectChange={setSelectedSubject}
            onQuickAction={handleQuickAction}
          />
        </div>

        {/* AI Report Sidebar */}
        <div className={styles.reportSection}>
          <div className={styles.reportCard}>
            {/* Report Header */}
            <div className={styles.reportHeader}>
              <div className={styles.reportHeaderLeft}>
                <FileText size={20} className={styles.reportIcon} />
                <div>
                  <h3 className={styles.reportTitle}>Báo cáo AI</h3>
                  <span className={styles.reportSubtitle}>Phân tích học tập</span>
                </div>
              </div>
              <div className={styles.reportBadge}>
                {activeReport?._id === 'ai-report-summary' && 'Tổng quan'}
                {activeReport?._id === 'ai-report-performance' && 'Hiệu suất'}
                {activeReport?._id === 'ai-report-insight' && 'Chi tiết'}
                {activeReport?._id === 'ai-report-recommendation' && 'Khuyến nghị'}
              </div>
            </div>

            {/* Report Content */}
            <div className={styles.reportContent}>
              {/* Summary Section */}
              <div className={styles.summarySection}>
                <h4 className={styles.sectionTitle}>
                  <Target size={16} />
                  Tổng quan
                </h4>
                <p className={styles.summaryText}>
                  {activeReport?.summary || 'Chọn một báo cáo để xem chi tiết phân tích AI về kết quả học tập của bạn.'}
                </p>
              </div>

              {/* Stats Grid */}
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statIconGreen}>
                    <TrendingUp size={18} />
                  </div>
                  <div className={styles.statInfo}>
                    <span className={styles.statValue}>
                      {activeReport?.avgScore != null ? activeReport.avgScore.toFixed(1) : '—'}
                    </span>
                    <span className={styles.statLabel}>Điểm TB</span>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statIconBlue}>
                    <Target size={18} />
                  </div>
                  <div className={styles.statInfo}>
                    <span className={styles.statValue}>
                      {activeReport?.passRate != null ? `${Math.round(activeReport.passRate * 100)}%` : '—'}
                    </span>
                    <span className={styles.statLabel}>Tỷ lệ đạt</span>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statIconPurple}>
                    <Brain size={18} />
                  </div>
                  <div className={styles.statInfo}>
                    <span className={styles.statValue}>
                      {activeReport?.totalStudents ?? '—'}
                    </span>
                    <span className={styles.statLabel}>Học sinh</span>
                  </div>
                </div>
              </div>

              {/* Strengths Section */}
              <div className={styles.strengthsSection}>
                <h4 className={styles.sectionTitle}>
                  <CheckCircle2 size={16} className={styles.strengthIcon} />
                  Điểm mạnh
                </h4>
                <ul className={styles.strengthsList}>
                  {(activeReport?.strengths || []).map((strength) => (
                    <li key={strength} className={styles.strengthItem}>
                      <CheckCircle2 size={16} className={styles.checkIcon} />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses Section */}
              <div className={styles.weaknessesSection}>
                <h4 className={styles.sectionTitle}>
                  <XCircle size={16} className={styles.weaknessIcon} />
                  Điểm cần cải thiện
                </h4>
                <ul className={styles.weaknessesList}>
                  {(activeReport?.weaknesses || []).map((weakness) => (
                    <li key={weakness} className={styles.weaknessItem}>
                      <XCircle size={16} className={styles.xIcon} />
                      <span>{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendations Section */}
              <div className={styles.recommendationsSection}>
                <h4 className={styles.sectionTitle}>
                  <TrendingDown size={16} className={styles.recommendIcon} />
                  Khuyến nghị
                </h4>
                <ol className={styles.recommendationsList}>
                  {(activeReport?.recommendations || []).map((recommendation, index) => (
                    <li key={recommendation} className={styles.recommendationItem}>
                      <span className={styles.recommendationNumber}>{index + 1}</span>
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Report Footer */}
            <div className={styles.reportFooter}>
              <div className={styles.reportMeta}>
                <Clock size={14} />
                <span>Cập nhật: {activeReport?.createdAt 
                  ? new Date(activeReport.createdAt).toLocaleDateString('vi-VN')
                  : 'Chưa có dữ liệu'
                }</span>
              </div>
              <button className={styles.viewDetailsBtn} onClick={() => activeReport && handleViewDetails(activeReport)}>
                <span>Xem chi tiết</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Recent Reports List */}
          <div className={styles.recentReports}>
            <h4 className={styles.recentTitle}>Báo cáo gần đây</h4>
            <div className={styles.recentList}>
              {isLoading ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.loadingSpinner} />
                  <p>Đang tải báo cáo...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>Chưa có báo cáo AI nào. Hãy bắt đầu trò chuyện với AI Tutor để nhận hướng dẫn!</p>
                </div>
              ) : (
                reports.slice(0, 3).map((report) => (
                  <button
                    key={report._id}
                    className={`${styles.recentItem} ${activeReport?._id === report._id ? styles.recentItemActive : ''}`}
                    onClick={() => setActiveReport(report)}
                  >
                    <FileText size={16} />
                    <div className={styles.recentItemContent}>
                      <span className={styles.recentItemTitle}>
                        {String(report.examId).length > 30
                          ? String(report.examId).substring(0, 30) + '...'
                          : String(report.examId)
                        }
                      </span>
                      <span className={styles.recentItemType}>
                        {report._id === 'ai-report-summary' && 'Tổng quan'}
                        {report._id === 'ai-report-performance' && 'Hiệu suất'}
                        {report._id === 'ai-report-insight' && 'Chi tiết'}
                        {report._id === 'ai-report-recommendation' && 'Khuyến nghị'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
