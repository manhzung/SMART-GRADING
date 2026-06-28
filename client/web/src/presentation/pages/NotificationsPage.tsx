import { useEffect, useState } from 'react';
import {
  Bell,
  BellRing,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  Calendar,
  Search,
} from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import type { Notification } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import styles from './NotificationsPage.module.css';

const notificationIcons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: XCircle,
};

const notificationColors = {
  info: styles.colorInfo,
  warning: styles.colorWarning,
  success: styles.colorSuccess,
  error: styles.colorError,
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return formatDate(dateString);
}

type FilterType = 'all' | 'unread';

function NotificationSkeleton() {
  return (
    <div className={styles.notificationList}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={styles.skeletonCard}>
          <div className={`${styles.skeletonPulse} ${styles.skeletonCircle}`} />
          <div className={styles.skeletonContent}>
            <div className={`${styles.skeletonPulse} ${styles.skeletonTitle}`} />
            <div className={`${styles.skeletonPulse} ${styles.skeletonMessage}`} style={{ marginTop: 8 }} />
            <div className={`${styles.skeletonPulse} ${styles.skeletonFooter}`} style={{ marginTop: 12 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const user = useAuthStore((s) => s.user);
  const userRole = user?.role || 'teacher';
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    pagination,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearError,
  } = useNotificationStore();

  useEffect(() => {
    loadNotifications(1);
  }, []);

  const loadNotifications = async (page: number) => {
    await fetchNotifications(page);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadNotifications(pagination.page);
    setIsRefreshing(false);
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(id);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      loadNotifications(newPage);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'unread' && n.isRead) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const titleMatch = (n.title || '').toLowerCase().includes(term);
      const messageMatch = (n.message || '').toLowerCase().includes(term);
      return titleMatch || messageMatch;
    }

    return true;
  });

  const getNotificationTypeFromBackend = (notification: Notification): 'info' | 'warning' | 'success' | 'error' => {
    if (notification.type && typeof notification.type === 'string') {
      if (notification.type.includes('error') || notification.type.includes('rejected')) return 'error';
      if (notification.type.includes('success') || notification.type.includes('approved')) return 'success';
      if (notification.type.includes('warning') || notification.type.includes('reminder')) return 'warning';
    }
    return 'info';
  };

  // Grouping logic helper
  const groupNotifications = (list: Notification[]) => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const earlier: Notification[] = [];
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterdayStr = yesterdayDate.toDateString();

    list.forEach((n) => {
      const d = new Date(n.createdAt);
      if (d.toDateString() === todayStr) {
        today.push(n);
      } else if (d.toDateString() === yesterdayStr) {
        yesterday.push(n);
      } else {
        earlier.push(n);
      }
    });

    return { today, yesterday, earlier };
  };

  const { today, yesterday, earlier } = groupNotifications(filteredNotifications);

  const renderNotificationGroup = (groupTitle: string, items: Notification[]) => {
    if (items.length === 0) return null;
    return (
      <div className={styles.groupContainer}>
        <h3 className={styles.groupHeader}>{groupTitle}</h3>
        <div className={styles.groupList}>
          {items.map((notification) => {
            const notificationType = getNotificationTypeFromBackend(notification);
            const IconComponent = notificationIcons[notificationType];

            // Contextual categorizing tagging
            let categoryLabel = 'Hệ thống';
            let categoryClass = styles.badgeSystem;
            const msgLower = (notification.message || '').toLowerCase();
            const titleLower = (notification.title || '').toLowerCase();
            if (msgLower.includes('phúc khảo') || titleLower.includes('phúc khảo') || msgLower.includes('appeal') || titleLower.includes('appeal')) {
              categoryLabel = 'Phúc khảo';
              categoryClass = styles.badgeAppeal;
            } else if (msgLower.includes('đề thi') || titleLower.includes('đề thi') || msgLower.includes('exam') || titleLower.includes('exam')) {
              categoryLabel = 'Đề thi';
              categoryClass = styles.badgeExam;
            } else if (msgLower.includes('bài nộp') || titleLower.includes('bài nộp') || msgLower.includes('chấm thi') || titleLower.includes('chấm thi') || msgLower.includes('grade') || titleLower.includes('grade') || msgLower.includes('submission') || titleLower.includes('submission')) {
              categoryLabel = 'Chấm thi';
              categoryClass = styles.badgeGrading;
            } else if (msgLower.includes('lớp') || titleLower.includes('lớp') || msgLower.includes('class') || titleLower.includes('class')) {
              categoryLabel = 'Lớp học';
              categoryClass = styles.badgeClass;
            }

            return (
              <div
                key={notification._id}
                className={`${styles.notificationCard} ${!notification.isRead ? styles.unread : ''}`}
                onClick={() => !notification.isRead && handleMarkAsRead(notification._id)}
              >
                <div
                  className={`${styles.iconWrapper} ${notificationColors[notificationType]}`}
                >
                  <IconComponent size={20} />
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitleRow}>
                      <h4 className={styles.cardTitle}>{notification.title}</h4>
                      <span className={`${styles.categoryBadge} ${categoryClass}`}>{categoryLabel}</span>
                    </div>
                    {!notification.isRead && (
                      <span className={styles.unreadBadge}>Mới</span>
                    )}
                  </div>
                  <p className={styles.cardMessage}>{notification.message}</p>
                  <div className={styles.cardFooter}>
                    <span className={styles.cardTime}>
                      <Clock size={12} />
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                    <span className={styles.cardDate}>
                      <Calendar size={12} />
                      {formatDate(notification.createdAt)}
                    </span>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  {!notification.isRead && (
                    <button
                      className={styles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification._id);
                      }}
                      title="Đánh dấu đã đọc"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    onClick={(e) => handleDelete(notification._id, e)}
                    title="Xóa thông báo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const roleLabel = userRole === 'admin' ? 'SUPER ADMIN' : userRole === 'school-admin' ? 'SCHOOL ADMIN' : userRole.toUpperCase();
  const roleBadgeClass = userRole === 'admin' ? 'roleBadgeAdmin' : userRole === 'school-admin' ? 'roleBadgeSchool' : userRole === 'teacher' ? 'roleBadgeTeacher' : 'roleBadgeStudent';

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerTitle}>
            <div>
              <span className={`roleBadge ${roleBadgeClass}`}>{roleLabel}</span>
              <h1 className={styles.title}>Thông báo</h1>
              <p className={styles.subtitle}>
                {unreadCount > 0
                  ? `Bạn có ${unreadCount} thông báo chưa đọc`
                  : 'Tất cả thông báo đã được đọc'}
              </p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.refreshBtn}
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isRefreshing ? styles.spinning : ''} />
              <span>Làm mới</span>
            </button>
            {unreadCount > 0 && (
              <button className={styles.markAllBtn} onClick={handleMarkAllAsRead}>
                <Check size={16} />
                <span>Đánh dấu tất cả đã đọc</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.toolbar}>
          <div className={styles.filterTabs}>
            <button
              className={`${styles.filterTab} ${filterType === 'all' ? styles.active : ''}`}
              onClick={() => setFilterType('all')}
            >
              <Bell size={16} />
              <span>Tất cả</span>
              <span className={styles.count}>{pagination.total}</span>
            </button>
            <button
              className={`${styles.filterTab} ${filterType === 'unread' ? styles.active : ''}`}
              onClick={() => setFilterType('unread')}
            >
              <BellRing size={16} />
              <span>Chưa đọc</span>
              {unreadCount > 0 && <span className={styles.countBadge}>{unreadCount}</span>}
            </button>
          </div>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Tìm kiếm thông báo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <AlertTriangle size={18} />
            <span>{error}</span>
            <button onClick={clearError} className={styles.dismissBtn}>
              <XCircle size={16} />
            </button>
          </div>
        )}

        <div className={styles.notificationList}>
          {isLoading && filteredNotifications.length === 0 ? (
            <NotificationSkeleton />
          ) : filteredNotifications.length === 0 ? (
            <div className={styles.emptyState}>
              <Bell size={64} className={styles.emptyIcon} />
              <h3>
                {filterType === 'unread'
                  ? 'Không có thông báo chưa đọc'
                  : 'Không có thông báo nào'}
              </h3>
              <p>
                {filterType === 'unread'
                  ? 'Tất cả thông báo của bạn đã được đọc'
                  : 'Bạn sẽ nhận được thông báo khi có cập nhật mới'}
              </p>
            </div>
          ) : (
            <>
              {renderNotificationGroup('Hôm nay', today)}
              {renderNotificationGroup('Hôm qua', yesterday)}
              {renderNotificationGroup('Cũ hơn', earlier)}
            </>
          )}
        </div>

        {pagination.pages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft size={18} />
            </button>
            <div className={styles.pageInfo}>
              <span>
                Trang {pagination.page} của {pagination.pages}
              </span>
              <span className={styles.totalCount}>({pagination.total} thông báo)</span>
            </div>
            <button
              className={styles.pageBtn}
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
