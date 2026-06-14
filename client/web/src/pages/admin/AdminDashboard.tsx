import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  GraduationCap,
  FileText,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useAdminStore } from '../../presentation/store/adminStore';
import { useAuthStore } from '../../presentation/store/authStore';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
  const userRole = useAuthStore((state) => state.user?.role);
  const userSchoolId = useAuthStore((state) => state.user?.schoolId);
  const {
    stats,
    statsLoading,
    statsError,
    schools,
    fetchStats,
    fetchSchools,
    fetchUsers,
  } = useAdminStore();

  const isSchoolAdmin = userRole === 'school-admin';
  const isSuperAdmin = userRole === 'admin';

  useEffect(() => {
    fetchStats(userSchoolId);
    fetchSchools({ limit: 5 });
    fetchUsers({ limit: 5 });
  }, []);

  const handleRefresh = () => {
    fetchStats(userSchoolId);
    fetchSchools({ limit: 5 });
    fetchUsers({ limit: 5 });
  };

  const statCards = useMemo(() => {
    if (isSchoolAdmin) {
      return [
        { label: 'Tổng Users', value: stats?.totalUsers ?? 0, icon: Users, color: '#6366f1', sub: 'Người dùng trong trường' },
        { label: 'Tổng Lớp', value: stats?.totalClasses ?? 0, icon: GraduationCap, color: '#3b82f6', sub: 'Lớp học' },
        { label: 'Tổng Bài nộp', value: stats?.totalSubmissions ?? 0, icon: FileText, color: '#10b981', sub: 'Bài đã chấm' },
      ];
    }
    return [
      { label: 'Trường học', value: stats?.totalSchools ?? 0, icon: Building2, color: '#6366f1', sub: 'Trường đang hoạt động' },
      { label: 'Tổng Users', value: stats?.totalUsers ?? 0, icon: Users, color: '#3b82f6', sub: 'Người dùng' },
      { label: 'Tổng Lớp', value: stats?.totalClasses ?? 0, icon: GraduationCap, color: '#10b981', sub: 'Lớp học' },
      { label: 'Tổng Bài nộp', value: stats?.totalSubmissions ?? 0, icon: FileText, color: '#f59e0b', sub: 'Bài đã chấm' },
    ];
  }, [stats, isSchoolAdmin]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.subtitle}>
            {isSuperAdmin ? 'Tổng quan hệ thống' : 'Tổng quan trường học'}
          </p>
        </div>
        <button className={styles.refreshBtn} onClick={handleRefresh} disabled={statsLoading}>
          <RefreshCw size={16} className={statsLoading ? styles.spinning : ''} />
          Làm mới
        </button>
      </div>

      {statsError && (
        <div className={styles.errorBanner}>
          Không tải được dữ liệu: {statsError}
        </div>
      )}

      <div className={styles.statsGrid}>
        {statCards.map((card) => (
          <div key={card.label} className={styles.statCard} style={{ '--accent-color': card.color } as React.CSSProperties}>
            <div className={styles.statIcon} style={{ background: `${card.color}20`, color: card.color }}>
              <card.icon size={24} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>
                {statsLoading ? (
                  <span className={styles.skeleton} style={{ width: '60px', height: '28px' }} />
                ) : (
                  card.value.toLocaleString('vi-VN')
                )}
              </span>
              <span className={styles.statLabel}>{card.label}</span>
              <span className={styles.statSub}>{card.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.recentGrid}>
        {isSuperAdmin && (
          <div className={styles.recentCard}>
            <div className={styles.recentHeader}>
              <h2 className={styles.recentTitle}>Trường gần đây</h2>
              <Link to="/admin/schools" className={styles.viewAll}>
                Xem tất cả <ArrowRight size={14} />
              </Link>
            </div>
            <div className={styles.recentList}>
              {schools.length === 0 && !statsLoading ? (
                <p className={styles.emptyText}>Chưa có trường nào.</p>
              ) : (
                schools.slice(0, 5).map((school) => (
                  <div key={school._id || school.id} className={styles.recentItem}>
                    <div className={styles.recentItemIcon}>
                      <Building2 size={16} />
                    </div>
                    <div className={styles.recentItemContent}>
                      <span className={styles.recentItemName}>{school.name}</span>
                      <span className={styles.recentItemMeta}>{school.code} · {school.type}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className={styles.recentCard}>
          <div className={styles.recentHeader}>
            <h2 className={styles.recentTitle}>Người dùng gần đây</h2>
            <Link to="/admin/users" className={styles.viewAll}>
              Xem tất cả <ArrowRight size={14} />
            </Link>
          </div>
          <div className={styles.recentList}>
            {/* Will be populated when we add users to the store */}
            <p className={styles.emptyText}>Đang tải...</p>
          </div>
        </div>
      </div>

      <div className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Thao tác nhanh</h2>
        <div className={styles.actionButtons}>
          {isSuperAdmin && (
            <Link to="/admin/schools" className={styles.actionBtn}>
              <Building2 size={18} />
              Thêm Trường
            </Link>
          )}
          <Link to="/admin/users" className={styles.actionBtn}>
            <Users size={18} />
            Thêm Người Dùng
          </Link>
          <Link to="/classes" className={styles.actionBtn}>
            <GraduationCap size={18} />
            Quản lý Lớp
          </Link>
        </div>
      </div>
    </div>
  );
}
