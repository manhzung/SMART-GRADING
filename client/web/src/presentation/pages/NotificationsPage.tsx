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
} from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import type { Notification } from '../store/notificationStore';
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

export default function NotificationsPage() {
  const [filterType, setFilterType] = useState<FilterType>('all');
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
    if (filterType === 'unread') return !n.isRead;
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

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerTitle}>
            <Bell size={28} className={styles.headerIcon} />
            <div>
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
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Đang tải thông báo...</p>
            </div>
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
              {filteredNotifications.map((notification) => {
                const notificationType = getNotificationTypeFromBackend(notification);
                const IconComponent = notificationIcons[notificationType];
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
                        <h4 className={styles.cardTitle}>{notification.title}</h4>
                        {!notification.isRead && (
                          <span className={styles.unreadBadge}>Mới</span>
                        )}
                      </div>
                      <p className={styles.cardMessage}>{notification.message}</p>
                      <div className={styles.cardFooter}>
                        <span className={styles.cardTime}>
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                        <span className={styles.cardDate}>
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
