import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  GraduationCap,
  Users,
  FileText,
  Send,
  Award,
  Percent,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { analyticsService, type DashboardStats } from '../../services/analytics.service';
import styles from './RoleDashboard.module.css';

interface KpiProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: React.ReactNode;
  colorClass: string;
}

function Kpi({ label, value, hint, icon, colorClass }: KpiProps) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiInfo}>
        <span className={styles.kpiLabel}>{label}</span>
        <span className={styles.kpiValue}>{value}</span>
        {hint && <span className={styles.kpiHint}>{hint}</span>}
      </div>
      <div className={`${styles.kpiIconWrapper} ${colorClass}`}>
        {icon}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US');
  } catch {
    return '—';
  }
}

function DashboardSkeleton() {
  return (
    <div className={styles.wrap}>
      {/* Header skeleton */}
      <div className={styles.headerRow}>
        <div>
          <div className={`${styles.skeletonPulse} ${styles.skeletonLabel}`} style={{ width: 80, height: 18, marginBottom: 8, borderRadius: 9999 }} />
          <div className={`${styles.skeletonPulse} ${styles.skeletonValue}`} style={{ width: 220, height: 32 }} />
        </div>
        <div className={`${styles.skeletonPulse}`} style={{ width: 110, height: 36, borderRadius: 10 }} />
      </div>

      {/* KPI Grid skeleton */}
      <div className={styles.skeletonGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard}>
            <div className={styles.skeletonInfo}>
              <div className={`${styles.skeletonPulse} ${styles.skeletonLabel}`} style={{ width: 80, height: 12 }} />
              <div className={`${styles.skeletonPulse} ${styles.skeletonValue}`} style={{ width: 50, height: 28, marginTop: 4 }} />
            </div>
            <div className={`${styles.skeletonPulse} ${styles.skeletonCircle}`} />
          </div>
        ))}
      </div>

      {/* Details skeleton */}
      <div className={styles.skeletonRow}>
        <div className={styles.listCard}>
          <div className={`${styles.skeletonPulse}`} style={{ width: 140, height: 20, marginBottom: 16, borderRadius: 4 }} />
          <div className={styles.skeletonList}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.skeletonListItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className={`${styles.skeletonPulse}`} style={{ width: 36, height: 36, borderRadius: '50%' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div className={`${styles.skeletonPulse}`} style={{ width: 100, height: 14, borderRadius: 4 }} />
                    <div className={`${styles.skeletonPulse}`} style={{ width: 160, height: 12, borderRadius: 4 }} />
                  </div>
                </div>
                <div className={`${styles.skeletonPulse}`} style={{ width: 60, height: 24, borderRadius: 8 }} />
              </div>
            ))}
          </div>
        </div>

        <div className={styles.listCard}>
          <div className={`${styles.skeletonPulse}`} style={{ width: 160, height: 20, marginBottom: 16, borderRadius: 4 }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
            <div className={`${styles.skeletonPulse}`} style={{ width: 100, height: 80, borderRadius: 16 }} />
            <div className={`${styles.skeletonPulse}`} style={{ width: 180, height: 14, borderRadius: 4 }} />
            <div className={`${styles.skeletonPulse}`} style={{ width: '100%', height: 38, borderRadius: 10 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoleDashboard() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await analyticsService.getDashboardStats();
      setStats(data);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const isSchoolAdmin = user.role === 'school-admin';
  const roleLabel = isAdmin ? 'SUPER ADMIN' : isSchoolAdmin ? 'SCHOOL ADMIN' : user.role.toUpperCase();
  const roleBadgeClass = isAdmin
    ? styles.roleBadgeAdmin
    : isSchoolAdmin
      ? styles.roleBadgeSchool
      : styles.roleBadgeTeacher;

  // Show beautiful skeleton screen on initial load
  if (isLoading && !stats) {
    return <DashboardSkeleton />;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.headerRow}>
        <div>
          <span className={`${styles.roleBadge} ${roleBadgeClass}`}>{roleLabel}</span>
          <h1 className={styles.welcomeTitle}>
            {isAdmin
              ? 'System Overview'
              : isSchoolAdmin
                ? 'School Overview'
                : user.role.toUpperCase()}
          </h1>
          <p className={styles.welcomeSubtitle}>
            {isAdmin
              ? 'View metrics and activities across the entire system'
              : isSchoolAdmin
                ? 'Manage all metrics, teachers, and classes in your school'
                : 'View and manage your classes and teaching activities'}
          </p>
        </div>
        <button className={styles.refreshBtn} onClick={load} disabled={isLoading}>
          <RefreshCw
            size={14}
            className={isLoading ? styles.refreshIconSpin : undefined}
          />
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className={styles.kpiGrid}>
        <Kpi
          label="Classes"
          value={stats?.totalClasses ?? 0}
          icon={<GraduationCap size={22} />}
          colorClass={styles.blueIcon}
        />
        <Kpi
          label="Students"
          value={stats?.totalStudents ?? 0}
          icon={<Users size={22} />}
          colorClass={styles.greenIcon}
        />
        <Kpi
          label="Exams"
          value={stats?.totalExams ?? 0}
          hint={stats ? `${stats.publishedExams} published` : undefined}
          icon={<FileText size={22} />}
          colorClass={styles.purpleIcon}
        />
        <Kpi
          label="Submissions"
          value={stats?.totalSubmissions ?? 0}
          icon={<Send size={22} />}
          colorClass={styles.orangeIcon}
        />
        <Kpi
          label="Avg Score"
          value={stats?.avgScore?.toFixed?.(2) ?? '0.00'}
          hint="/10"
          icon={<Award size={22} />}
          colorClass={styles.amberIcon}
        />
        <Kpi
          label="Pass Rate"
          value={stats ? `${stats.passRate}%` : '0%'}
          icon={<Percent size={22} />}
          colorClass={styles.tealIcon}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.listCard}>
          <h3 className={styles.listTitle}>Recent Submissions</h3>
          {(stats?.recentSubmissions ?? []).length === 0 && (
            <div className={styles.empty}>No data available</div>
          )}
          {(stats?.recentSubmissions ?? []).map((s) => {
            const studentName = s.student?.name ?? '—';
            // Display first letter of student's actual name (e.g. "Nguyen Van A" -> "A")
            const nameParts = studentName.trim().split(/\s+/);
            const initials = nameParts.length > 0 ? nameParts[nameParts.length - 1].charAt(0).toUpperCase() : '—';

            return (
              <div key={s.id} className={styles.listItem}>
                <div className={styles.studentMeta}>
                  <div className={styles.avatar}>{initials}</div>
                  <div className={styles.studentInfo}>
                    <span className={styles.studentName}>{studentName}</span>
                    {s.exam && <span className={styles.examTitle}>{s.exam.title}</span>}
                  </div>
                </div>
                <div className={styles.submissionMeta}>
                  <span className={styles.scoreBadge}>
                    {s.maxScore > 0 ? `${s.score} / ${s.maxScore}` : s.score}
                  </span>
                  <span className={styles.subDate}>
                    <Clock size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {formatDate(s.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.listCard}>
          <h3 className={styles.listTitle}>Pending Appeals</h3>
          <div className={styles.appealsContainer}>
            <div className={styles.appealCountBox}>
              <span className={styles.appealCount}>{stats?.pendingAppeals ?? 0}</span>
              <span className={styles.appealLabel}>Request(s)</span>
            </div>
            <p className={styles.appealDescription}>
              Go to <strong>Appeals</strong> in the menu to process exam appeals requested by students.
            </p>
            <Link to="/appeals" className={styles.appealBtn}>
              Go to Appeals
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
