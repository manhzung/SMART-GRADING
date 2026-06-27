import { useState, useRef, useEffect } from 'react';
import { Bell, BellRing, Info, AlertTriangle, CheckCircle, XCircle, Check, ExternalLink } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import styles from './NotificationPanel.module.css';

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

function mapBackendTypeToFrontend(type: string): 'info' | 'warning' | 'success' | 'error' {
  if (type.includes('error') || type.includes('rejected') || type.includes('failed')) return 'error';
  if (type.includes('success') || type.includes('approved') || type.includes('resolved')) return 'success';
  if (type.includes('warning') || type.includes('reminder') || type.includes('urgent')) return 'warning';
  return 'info';
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
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead } =
    useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const togglePanel = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <div className={styles.container}>
      <button
        ref={buttonRef}
        className={styles.bellButton}
        onClick={togglePanel}
        aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ''}`}
      >
        {unreadCount > 0 ? (
          <BellRing size={18} className={styles.bellIconActive} />
        ) : (
          <Bell size={18} />
        )}
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div ref={panelRef} className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Thông báo</h3>
            {unreadCount > 0 && (
              <button className={styles.markAllBtn} onClick={handleMarkAllAsRead}>
                <Check size={14} />
                <span>Đánh dấu tất cả đã đọc</span>
              </button>
            )}
          </div>

          <div className={styles.notificationList}>
            {isLoading && notifications.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>Đang tải...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className={styles.emptyState}>
                <Bell size={40} className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>Không có thông báo nào</p>
                <p className={styles.emptySubtitle}>Bạn sẽ nhận được thông báo khi có cập nhật mới</p>
              </div>
            ) : (
              notifications.map(notification => {
                const mappedType = mapBackendTypeToFrontend(notification.type);
                const IconComponent = notificationIcons[mappedType];
                return (
                  <div
                    key={notification._id}
                    className={`${styles.notificationItem} ${!notification.isRead ? styles.unread : ''}`}
                    onClick={() => handleNotificationClick(notification._id)}
                  >
                    <div className={`${styles.iconWrapper} ${notificationColors[mappedType]}`}>
                      <IconComponent size={16} />
                    </div>
                    <div className={styles.content}>
                      <div className={styles.titleRow}>
                        <span className={styles.title}>{notification.title}</span>
                        {!notification.isRead && <span className={styles.unreadDot} />}
                      </div>
                      <p className={styles.message}>{notification.message}</p>
                      <span className={styles.time}>{formatRelativeTime(notification.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className={styles.panelFooter}>
            <a href="/notifications" className={styles.viewAllLink}>
              <span>Xem tất cả thông báo</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
