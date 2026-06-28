import { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { analyticsService, type DashboardStats } from '../../services/analytics.service';
import styles from './RoleDashboard.module.css';

interface KpiProps {
  label: string;
  value: number | string;
  hint?: string;
}

function Kpi({ label, value, hint }: KpiProps) {
  return (
    <div className={styles.kpiCard}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiValue}>{value}</span>
      {hint && <span className={styles.kpiHint}>{hint}</span>}
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('vi-VN');
  } catch {
    return '—';
  }
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
      setError(e?.message ?? 'Không thể tải dữ liệu dashboard');
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

  return (
    <div className={styles.wrap}>
      <div className={styles.headerRow}>
        <div>
          <span className={`${styles.roleBadge} ${roleBadgeClass}`}>{roleLabel}</span>
          <h1 style={{ margin: 0, color: '#0b2240' }}>
            {isAdmin
              ? 'Tổng quan hệ thống'
              : isSchoolAdmin
                ? 'Tổng quan trường'
                : user.role.toUpperCase()}
          </h1>
        </div>
        <button className={styles.refreshBtn} onClick={load} disabled={isLoading}>
          <RefreshCw size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          {isLoading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: 12,
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div className={styles.kpiGrid}>
        <Kpi label="Lớp học" value={stats?.totalClasses ?? 0} />
        <Kpi label="Học sinh" value={stats?.totalStudents ?? 0} />
        <Kpi
          label="Đề thi"
          value={stats?.totalExams ?? 0}
          hint={stats ? `${stats.publishedExams} đã phát hành` : undefined}
        />
        <Kpi label="Bài nộp" value={stats?.totalSubmissions ?? 0} />
        <Kpi label="ĐTB điểm" value={stats?.avgScore?.toFixed?.(2) ?? '0.00'} hint="/10" />
        <Kpi label="Tỉ lệ đạt" value={stats ? `${stats.passRate}%` : '0%'} />
      </div>

      <div className={styles.row}>
        <div className={styles.listCard}>
          <h3 className={styles.listTitle}>Bài nộp gần đây</h3>
          {(stats?.recentSubmissions ?? []).length === 0 && (
            <div className={styles.empty}>Chưa có dữ liệu</div>
          )}
          {(stats?.recentSubmissions ?? []).map((s) => (
            <div key={s.id} className={styles.listItem}>
              <span>
                {s.student?.name ?? '—'}
                {s.exam ? ` · ${s.exam.title}` : ''}
              </span>
              <span>
                {s.maxScore > 0 ? `${s.score} / ${s.maxScore}` : s.score}
                {' · '}
                {formatDate(s.createdAt)}
              </span>
            </div>
          ))}
        </div>
        <div className={styles.listCard}>
          <h3 className={styles.listTitle}>Phúc khảo đang chờ</h3>
          <div className={styles.listItem}>
            <span>Số yêu cầu đang xử lý</span>
            <span>{stats?.pendingAppeals ?? 0}</span>
          </div>
          <div className={styles.empty} style={{ paddingTop: 12 }}>
            Truy cập <strong>Phúc khảo</strong> trong menu để xử lý.
          </div>
        </div>
      </div>
    </div>
  );
}
