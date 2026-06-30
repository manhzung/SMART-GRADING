import { useState, useMemo, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Users,
  FileText,
  TrendingUp,
  Award,
  ChevronDown,
  Calendar,
} from 'lucide-react';
import { useAnalyticsStore } from '../services/analyticsStore';
import styles from './AnalyticsPage.module.css';

type TimePeriod = 'week' | 'month' | 'semester';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  iconBgClass: string;
}

function StatCard({
  icon,
  label,
  value,
  subtext,
  trend,
  trendValue,
  iconBgClass,
}: StatCardProps) {
  return (
    <div className={styles.statCard}>
      <div className={`${styles.statIcon} ${iconBgClass}`}>{icon}</div>
      <div className={styles.statContent}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statValue}>{value}</span>
        {subtext && <span className={styles.statSubtext}>{subtext}</span>}
        {trend && trendValue && (
          <span
            className={`${styles.statTrend} ${
              trend === 'up'
                ? styles.trendUp
                : trend === 'down'
                  ? styles.trendDown
                  : styles.trendStable
            }`}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}{' '}
            {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function ScoreTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      {payload.map((entry, index) => (
        <p key={index} style={{ color: entry.color }}>
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const { analytics, isLoading, error, fetchAnalytics } = useAnalyticsStore();

  useEffect(() => {
    fetchAnalytics(selectedPeriod);
  }, [selectedPeriod, fetchAnalytics]);

  // Calculate summary stats with null safety
  const summaryStats = analytics?.summary ?? {
    totalExams: 0,
    totalSubmissions: 0,
    avgScore: 0,
    totalStudents: 0,
  };

  // Calculate pass rate from exam reports
  const avgPassRate = useMemo(() => {
    if (!analytics?.gradeDistribution?.length) return 0;
    const total = analytics.gradeDistribution.reduce((sum, g) => sum + g.count, 0);
    if (total === 0) return 0;
    const passing = (analytics.gradeDistribution.find((g) => g.grade === 'A')?.count || 0) +
      (analytics.gradeDistribution.find((g) => g.grade === 'B')?.count || 0);
    return Math.round((passing / total) * 100);
  }, [analytics]);

  // Filter data based on selected time period
  const filteredReports = useMemo(() => {
    if (!analytics?.recentTrends) return [];
    const now = new Date();
    let cutoffDays = 30;
    if (selectedPeriod === 'week') cutoffDays = 7;
    if (selectedPeriod === 'semester') cutoffDays = 180;

    return analytics.recentTrends.filter((r) => {
      if (!r.date) return true;
      const date = new Date(r.date);
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= cutoffDays;
    });
  }, [analytics, selectedPeriod]);

  // Performance trend data from API (recentTrends)
  const performanceTrendData = useMemo(() => {
    if (!analytics?.recentTrends?.length) return [];
    return analytics.recentTrends.map((t) => ({
      period: t.date
        ? new Date(t.date).toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' })
        : 'N/A',
      score: t.avgScore ?? 0,
    }));
  }, [analytics]);

  // Subject performance data - aligned with backend response
  const subjectData = useMemo(() => {
    if (!analytics?.subjectPerformance) return [];
    return analytics.subjectPerformance.map((s) => ({
      name: s.subject || s.subjectName || 'N/A',
      score: s.avgScore ?? s.averageScore ?? 0,
      color: s.color || '#3B82F6',
      exams: s.examCount ?? s.examCount ?? 0,
      trend: s.trend || 'stable',
    }));
  }, [analytics]);

  // Grade distribution data for pie chart
  const gradeDistribution = useMemo(() => {
    if (!analytics?.gradeDistribution) return [];
    const total = analytics.gradeDistribution.reduce((sum, g) => sum + g.count, 0);
    return analytics.gradeDistribution.map((g) => ({
      ...g,
      percentage: total > 0 ? Math.round((g.count / total) * 100) : 0,
    }));
  }, [analytics]);

  // Top students data
  const topStudents = useMemo(() => {
    if (!analytics?.studentRankings) return [];
    return analytics.studentRankings.map((student, index) => ({
      studentId: student._id || student.studentId || `temp-${index}`,
      studentName: student.name || student.studentName || 'N/A',
      className: (student as any).className || 'N/A',
      rank: index + 1,
      averageScore: student.avgScore ?? 0,
      totalExams: student.totalExams ?? 0,
      improvement: 0.5,
    }));
  }, [analytics]);

  // Recent activity data
  const recentActivity = useMemo(() => {
    if (!analytics?.recentTrends) return [];
    return analytics.recentTrends.slice(0, 5).map((t) => ({
      event: 'Hoạt động thi',
      count: t.submissions ?? 0,
      date: t.date ?? new Date().toISOString(),
    }));
  }, [analytics]);

  const periodLabels: Record<TimePeriod, string> = {
    week: 'Last 7 days',
    month: 'Last 30 days',
    semester: 'Semester',
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <span>Workspace</span>
          <span className={styles.breadcrumbSeparator}>&gt;</span>
          <span className={styles.breadcrumbActive}>Data Analytics</span>
        </nav>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <span>Workspace</span>
          <span className={styles.breadcrumbSeparator}>&gt;</span>
          <span className={styles.breadcrumbActive}>Data Analytics</span>
        </nav>
        <div className={styles.errorContainer}>
          <p className={styles.errorTitle}>Something went wrong</p>
          <p className={styles.errorMessage}>{error}</p>
          <button className={styles.retryBtn} onClick={() => fetchAnalytics(selectedPeriod)}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <span>Workspace</span>
        <span className={styles.breadcrumbSeparator}>&gt;</span>
        <span className={styles.breadcrumbActive}>Data Analytics</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Data Analytics</h1>
          <p className={styles.subtitle}>
            Overview of academic performance and exam results
          </p>
        </div>
        <div className={styles.periodSelector}>
          <Calendar size={15} className={styles.periodIcon} />
          <button
            className={styles.periodBtn}
            onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
          >
            <span>{periodLabels[selectedPeriod]}</span>
            <ChevronDown size={14} />
          </button>
          {showPeriodDropdown && (
            <div className={styles.periodDropdown}>
              {(['week', 'month', 'semester'] as TimePeriod[]).map((p) => (
                <button
                  key={p}
                  className={`${styles.periodOption} ${
                    selectedPeriod === p ? styles.periodOptionActive : ''
                  }`}
                  onClick={() => {
                    setSelectedPeriod(p);
                    setShowPeriodDropdown(false);
                  }}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className={styles.statsGrid}>
        <StatCard
          icon={<Users size={22} />}
          label="Total Students"
          value={summaryStats.totalStudents}
          subtext="Enrolled"
          trend="up"
          trendValue="+12"
          iconBgClass={styles.blueIcon}
        />
        <StatCard
          icon={<FileText size={22} />}
          label="Total Exams"
          value={summaryStats.totalExams}
          subtext={`${filteredReports.length} exams in period`}
          trend="stable"
          trendValue="0"
          iconBgClass={styles.greenIcon}
        />
        <StatCard
          icon={<TrendingUp size={22} />}
          label="Average Score"
          value={summaryStats.avgScore.toFixed(1)}
          subtext="/10 points"
          trend="up"
          trendValue="+0.3"
          iconBgClass={styles.purpleIcon}
        />
        <StatCard
          icon={<Award size={22} />}
          label="Pass Rate"
          value={`${avgPassRate}%`}
          subtext="Exam pass rate"
          trend="down"
          trendValue="-2%"
          iconBgClass={styles.orangeIcon}
        />
      </div>

      {/* Charts Row 1: Line Chart + Bar Chart */}
      <div className={styles.chartsRow}>
        {/* Overall Performance Line Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>Score Trends</h3>
            <span className={styles.chartSubtitle}>
              Average scores over time
            </span>
          </div>
          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={performanceTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[5, 10]}
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip content={<ScoreTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Avg Score"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subject Performance Bar Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>Scores by Subject</h3>
            <span className={styles.chartSubtitle}>
              Average scores per subject
            </span>
          </div>
          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={subjectData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 10]}
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip content={<ScoreTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Bar
                  dataKey="score"
                  name="Avg Score"
                  radius={[4, 4, 0, 0]}
                >
                  {subjectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Pie Chart + Top Students Table */}
      <div className={styles.chartsRow}>
        {/* Grade Distribution Pie Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>Score Distribution</h3>
            <span className={styles.chartSubtitle}>
              Student distribution by grade
            </span>
          </div>
          <div className={styles.chartBodyPie}>
            <div className={styles.pieWrapper}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="grade"
                    label={(props) => {
                      const payload = props.payload as { grade?: string; percentage?: number } | undefined;
                      const grade = payload?.grade ?? '';
                      const percentage = payload?.percentage ?? 0;
                      return `${grade.split(' ')[0]} ${percentage}%`;
                    }}
                    labelLine={{ stroke: '#CBD5E1', strokeWidth: 1 }}
                  >
                    {gradeDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke={entry.color}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      `${Number(value ?? 0)} students`,
                      String(name ?? ''),
                    ] as [string, string]}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.pieLegend}>
              {gradeDistribution.map((item) => (
                <div key={item.grade} className={styles.legendItem}>
                  <span
                    className={styles.legendDot}
                    style={{ backgroundColor: item.color }}
                  />
                  <span className={styles.legendLabel}>
                    {item.grade.split(' ')[0]}
                  </span>
                  <span className={styles.legendCount}>{item.count}</span>
                  <span className={styles.legendPercent}>
                    ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Students Table */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>Student Rankings</h3>
            <span className={styles.chartSubtitle}>
              Top {topStudents.length} outstanding students
            </span>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.rankingTable}>
              <thead>
                <tr>
                  <th className={styles.thRank}>#</th>
                  <th>Học sinh</th>
                  <th>Lớp</th>
                  <th className={styles.thScore}>Điểm TB</th>
                  <th className={styles.thTrend}>Xu hướng</th>
                </tr>
              </thead>
              <tbody>
                {topStudents.map((student) => (
                  <tr key={student.studentId} className={styles.tableRow}>
                    <td>
                      <span
                        className={`${styles.rankBadge} ${
                          student.rank <= 3 ? styles[`rankTop${student.rank}`] : ''
                        }`}
                      >
                        {student.rank <= 3 ? (
                          <Award size={12} />
                        ) : (
                          student.rank
                        )}
                      </span>
                    </td>
                    <td>
                      <div className={styles.studentCell}>
                        <span className={styles.studentName}>
                          {student.studentName}
                        </span>
                        <span className={styles.studentExams}>
                          {student.totalExams} bài thi
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.classBadge}>
                        {student.className}
                      </span>
                    </td>
                    <td>
                      <span className={styles.scoreValue}>
                        {student.averageScore.toFixed(1)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.trendBadge} ${
                          student.improvement >= 0
                            ? styles.trendUpBadge
                            : styles.trendDownBadge
                        }`}
                      >
                        {student.improvement >= 0 ? '↑' : '↓'}{' '}
                        {Math.abs(student.improvement).toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className={styles.activityCard}>
        <div className={styles.activityHeader}>
          <h3 className={styles.chartTitle}>Hoạt động gần đây</h3>
        </div>
        <div className={styles.activityList}>
          {recentActivity.map((activity, idx) => (
            <div key={idx} className={styles.activityItem}>
              <div className={styles.activityDot} />
              <div className={styles.activityContent}>
                <span className={styles.activityEvent}>{activity.event}</span>
                <span className={styles.activityCount}>
                  {activity.count} học sinh
                </span>
              </div>
              <span className={styles.activityDate}>
                {new Date(activity.date).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
