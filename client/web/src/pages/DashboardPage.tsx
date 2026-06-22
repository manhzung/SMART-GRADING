import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../presentation/store/authStore';
import { useAnalyticsStore } from '../services/analyticsStore';
import {
  GraduationCap,
  FileText,
  Users,
  CheckSquare,
  TrendingUp,
  Clock,
  BookOpen,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { dashboardStats, isLoading, error, fetchDashboardStats } = useAnalyticsStore();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'semester'>('month');

  const greetingName = user?.name || 'Professor';

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const activities = useMemo(() => {
    if (!dashboardStats?.recentSubmissions?.length) return [];
    return dashboardStats.recentSubmissions.slice(0, 5).map((sub, index) => {
      const now = new Date();
      const subDate = new Date(sub.createdAt);
      const diffMs = now.getTime() - subDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      let timeStr = 'Vừa xong';
      if (diffDays > 0) timeStr = `${diffDays} ngày trước`;
      else if (diffHours > 0) timeStr = `${diffHours} giờ trước`;
      else if (diffMins > 0) timeStr = `${diffMins} phút trước`;

      return {
        id: sub.id || index,
        title: sub.student?.name || 'Học sinh',
        description: sub.exam?.title || 'Bài thi',
        time: timeStr,
        dotColor: index === 0 ? '#b45309' : '#0b2240',
      };
    });
  }, [dashboardStats]);

  const statCards = useMemo(() => [
    {
      label: 'Tổng số lớp',
      value: dashboardStats?.totalClasses ?? 0,
      icon: GraduationCap,
      color: '#3B82F6',
    },
    {
      label: 'Bài thi đã đăng tải',
      value: dashboardStats?.publishedExams ?? 0,
      icon: FileText,
      color: '#10B981',
    },
    {
      label: 'Tổng học sinh',
      value: dashboardStats?.totalStudents ?? 0,
      icon: Users,
      color: '#8B5CF6',
    },
    {
      label: 'Bài đã chấm',
      value: dashboardStats?.totalSubmissions ?? 0,
      icon: CheckSquare,
      color: '#F59E0B',
    },
  ], [dashboardStats]);

  const quickStats = useMemo(() => [
    {
      label: 'Phúc khảo chờ duyệt',
      value: dashboardStats?.pendingAppeals ?? 0,
      icon: AlertCircle,
      color: '#EF4444',
    },
    {
      label: 'Điểm TB',
      value: dashboardStats?.avgScore?.toFixed(1) ?? '0.0',
      icon: TrendingUp,
      color: '#10B981',
    },
    {
      label: 'Tỷ lệ đạt',
      value: `${dashboardStats?.passRate ?? 0}%`,
      icon: Clock,
      color: '#3B82F6',
    },
    {
      label: 'Tổng bài thi',
      value: dashboardStats?.totalExams ?? 0,
      icon: BookOpen,
      color: '#8B5CF6',
    },
  ], [dashboardStats]);

  const classPerformance = useMemo(() => {
    const avgScore = dashboardStats?.avgScore ?? 0;
    const goalCompletion = Math.round((avgScore / 10) * 100);
    return { avgScore, goalCompletion };
  }, [dashboardStats]);

  return (
    <div className={styles.container}>
      {/* Title Section */}
      <div className={styles.titleSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className={styles.title}>Tổng quan giáo viên</h1>
            <p className={styles.subtitle}>
              Chào mừng, {greetingName}. Đây là tình trạng học vụ hôm nay.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Period Filter */}
            <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              {(['week', 'month', 'semester'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  style={{
                    padding: '6px 14px',
                    border: 'none',
                    background: selectedPeriod === period ? '#0b2240' : '#ffffff',
                    color: selectedPeriod === period ? '#ffffff' : '#64748b',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {period === 'week' ? '7 ngày' : period === 'month' ? '30 ngày' : 'Học kỳ'}
                </button>
              ))}
            </div>
            {/* Refresh Button */}
            <button
              onClick={() => fetchDashboardStats()}
              disabled={isLoading}
              style={{
                padding: '6px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                background: '#ffffff',
                color: '#334155',
                fontSize: '12px',
                fontWeight: 500,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards Row */}
      <div className={styles.statsGrid}>
        {statCards.map((stat, idx) => (
          <div key={idx} className={styles.statCard}>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>{stat.label}</span>
              <span className={styles.statValue}>
                {isLoading && !dashboardStats ? '...' : stat.value.toLocaleString()}
              </span>
            </div>
            <div
              className={styles.statIconWrapper}
              style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
            >
              <stat.icon size={22} />
            </div>
          </div>
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fee2e2',
          borderRadius: '8px',
          color: '#dc2626',
          fontSize: '13px',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {/* Two Column Layout */}
      <div className={styles.detailsGrid}>

        {/* Left Column: Recent Activities */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Hoạt động gần đây</h3>
          </div>

          <div className={styles.timeline}>
            <div className={styles.timelineLine} />
            {activities.length === 0 ? (
              <p style={{ padding: '12px 0', color: '#9ca3af', fontSize: '13px' }}>
                Chưa có hoạt động nào.
              </p>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className={styles.timelineItem}>
                  <div
                    className={styles.timelineDot}
                    style={{ borderColor: activity.dotColor }}
                  />
                  <span className={styles.timelineItemTitle}>{activity.title}</span>
                  <span className={styles.timelineItemDesc}>{activity.description}</span>
                  <span className={styles.timelineItemTime}>{activity.time}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Quick Stats */}
        <div>
          {/* Quick Stats Row */}
          <div className={styles.quickStatsGrid}>
            {quickStats.map((stat, idx) => (
              <div key={idx} className={styles.quickStatCard}>
                <div
                  className={styles.quickStatIcon}
                  style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
                >
                  <stat.icon size={18} />
                </div>
                <div className={styles.quickStatInfo}>
                  <span className={styles.quickStatValue}>{stat.value}</span>
                  <span className={styles.quickStatLabel}>{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Class Performance Card */}
          <div className={styles.performanceCard}>
            <h3 className={styles.performanceTitle}>Hiệu suất lớp học</h3>
            <p className={styles.performanceText}>
              Điểm trung bình across all classes là {classPerformance.avgScore.toFixed(1)}/10.
              {classPerformance.avgScore >= 7 ? ' Tiến bộ tốt trong tháng này!' : ' Cần cố gắng thêm!'}
            </p>
            <div className={styles.progressWrapper}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${classPerformance.goalCompletion}%` }}
                />
              </div>
              <span className={styles.progressLabel}>
                {classPerformance.goalCompletion}% Mục tiêu hoàn thành
              </span>
            </div>
          </div>

          {/* Recent Submissions Preview */}
          <div className={styles.card} style={{ marginTop: '24px' }}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Bài nộp gần đây</h3>
            </div>
            <div className={styles.classList}>
              {activities.length === 0 ? (
                <p style={{ padding: '12px 0', color: '#9ca3af', fontSize: '13px' }}>
                  Chưa có bài nộp nào.
                </p>
              ) : (
                activities.slice(0, 3).map((activity) => (
                  <div key={activity.id} className={styles.classItem}>
                    <div className={styles.classInfo}>
                      <span className={styles.className}>{activity.title}</span>
                      <span className={styles.classGrade}>{activity.description}</span>
                    </div>
                    <span className={styles.timelineItemTime}>{activity.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
