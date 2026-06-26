import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  Database,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useSchoolStore } from '../../presentation/store/schoolStore';
import { useAuthStore } from '../../presentation/store/authStore';
import styles from './SchoolDashboard.module.css';

export default function SchoolDashboard() {
  const user = useAuthStore((state) => state.user);
  const userSchoolId = useAuthStore((state) => state.user?.schoolId);
  const {
    stats,
    statsLoading,
    statsError,
    fetchStats,
  } = useSchoolStore();

  useEffect(() => {
    fetchStats(userSchoolId);
  }, []);

  const handleRefresh = () => {
    fetchStats(userSchoolId);
  };

  const greeting = user?.name
    ? `Xin chào, ${user.name.split(' ').pop()}!`
    : 'Xin chào!';

  const statCards = [
    {
      label: 'Tổng Lớp',
      value: stats?.totalClasses ?? 0,
      icon: GraduationCap,
      color: '#3b82f6',
      sub: 'Lớp học trong trường',
    },
    {
      label: 'Tổng Học sinh',
      value: stats?.totalStudents ?? 0,
      icon: Users,
      color: '#10b981',
      sub: 'Học sinh đang học',
    },
    {
      label: 'Tổng Câu hỏi',
      value: stats?.totalQuestions ?? 0,
      icon: Database,
      color: '#f59e0b',
      sub: 'Ngân hàng câu hỏi',
    },
    {
      label: 'Tổng Bài kiểm tra',
      value: stats?.totalExams ?? 0,
      icon: FileText,
      color: '#8b5cf6',
      sub: 'Bài kiểm tra đã tạo',
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.greeting}>{greeting}</h1>
          <p className={styles.subtitle}>Tổng quan trường học của bạn</p>
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

      <div className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Thao tác nhanh</h2>
        <div className={styles.actionButtons}>
          <Link to="/school/classes" className={styles.actionBtn}>
            <GraduationCap size={18} />
            Thêm Lớp mới
          </Link>
          <Link to="/school/students" className={styles.actionBtn}>
            <Users size={18} />
            Thêm Học sinh
          </Link>
          <Link to="/school/questions" className={styles.actionBtn}>
            <Database size={18} />
            Thêm Câu hỏi
          </Link>
          <Link to="/school/exams" className={styles.actionBtn}>
            <FileText size={18} />
            Tạo Bài kiểm tra
          </Link>
        </div>
      </div>
    </div>
  );
}
