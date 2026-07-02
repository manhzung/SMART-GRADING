import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUnreadNotifications } from '../hooks/useUnreadNotifications';

interface NotificationBadgeProps {
  size?: number;
  variant?: 'header' | 'inline';
}

export default function NotificationBadge({ size = 18, variant = 'header' }: NotificationBadgeProps) {
  const { data, isLoading } = useUnreadNotifications();
  const navigate = useNavigate();
  const count = data?.unreadCount ?? 0;
  const displayCount = count > 99 ? '99+' : count;

  const handleClick = () => {
    navigate('/notifications');
  };

  if (variant === 'header') {
    return (
      <button
        onClick={handleClick}
        aria-label="Notifications"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 6,
          color: 'inherit',
        }}
        title={count > 0 ? `${count} unread notification${count === 1 ? '' : 's'}` : 'No unread notifications'}
      >
        <Bell size={size} />
        {count > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 9,
              backgroundColor: '#dc2626',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              boxShadow: '0 0 0 2px #fff',
            }}
            aria-hidden
          >
            {isLoading ? '…' : displayCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 8,
        background: count > 0 ? '#fef2f2' : '#f8fafc',
        color: count > 0 ? '#dc2626' : '#64748b',
        border: count > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      <Bell size={16} />
      <span>{count} unread</span>
    </button>
  );
}