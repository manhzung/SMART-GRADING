import { Link } from 'react-router-dom';
import { Home, LogIn, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../presentation/store/authStore';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.iconWrapper}>
          <AlertCircle size={64} className={styles.icon} />
        </div>

        <h1 className={styles.title}>404</h1>
        <h2 className={styles.subtitle}>Trang không tìm thấy</h2>
        <p className={styles.message}>
          Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>

        <div className={styles.actions}>
          <Link to="/" className={styles.primaryButton}>
            <Home size={18} />
            <span>Quay về trang chủ</span>
          </Link>

          {!isAuthenticated && (
            <Link to="/login" className={styles.secondaryButton}>
              <LogIn size={18} />
              <span>Đăng nhập</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
