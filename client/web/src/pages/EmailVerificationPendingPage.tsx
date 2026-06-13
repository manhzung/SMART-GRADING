import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, CheckCircle, Loader2, RefreshCw, ArrowRight } from 'lucide-react';
import AuthLayout from '../presentation/components/AuthLayout';
import styles from './EmailVerificationPendingPage.module.css';

export default function EmailVerificationPendingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const email = (location.state as { email?: string })?.email || '';
  const [isVerified, setIsVerified] = useState(false);

  // Poll to check if email is verified
  useEffect(() => {
    if (!email) {
      return;
    }

    const checkVerification = async () => {
      try {
        const response = await fetch(`/api/v1/auth/check-verification?email=${encodeURIComponent(email)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.isEmailVerified) {
            setIsVerified(true);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    };

    // Check immediately
    checkVerification();

    // Poll every 3 seconds
    const interval = setInterval(checkVerification, 3000);

    return () => clearInterval(interval);
  }, [email]);

  const handleGoToLogin = () => {
    navigate('/login', { state: { verified: true, email } });
  };

  if (!email) {
    return (
      <AuthLayout>
        <div className={styles.container}>
          <div className={styles.card}>
            <h1 className={styles.title}>Lỗi</h1>
            <p className={styles.subtitle}>Không tìm thấy thông tin email. Vui lòng đăng ký lại.</p>
            <Link to="/register" className={styles.loginBtn}>
              Quay lại Đăng ký
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (isVerified) {
    return (
      <AuthLayout>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.iconContainer} style={{ backgroundColor: '#ecfdf5' }}>
              <CheckCircle size={48} color="#059669" />
            </div>
            <h1 className={styles.title}>Xác minh thành công!</h1>
            <p className={styles.subtitle}>Email của bạn đã được xác minh.</p>
            <p className={styles.emailHighlight}>{email}</p>
            <button onClick={handleGoToLogin} className={styles.loginBtn}>
              Đăng nhập ngay
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.iconContainer}>
            <Mail size={48} />
          </div>

          <h1 className={styles.title}>Xác minh Email</h1>
          <p className={styles.subtitle}>
            Chúng tôi đã gửi email xác minh đến
          </p>
          <p className={styles.emailHighlight}>{email}</p>

          <div className={styles.checkingStatus}>
            <Loader2 size={20} className={styles.spinner} />
            <span>Đang kiểm tra trạng thái xác minh...</span>
          </div>

          <div className={styles.instructions}>
            <div className={styles.step}>
              <span className={styles.stepNumber}>1</span>
              <span>Mở email và tìm thư từ Smart Grading</span>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>2</span>
              <span>Nhấp vào liên kết "Xác nhận Email"</span>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>3</span>
              <span>Trang này sẽ tự động chuyển sang đăng nhập</span>
            </div>
          </div>

          <div className={styles.autoUpdate}>
            <RefreshCw size={16} />
            <span>Trang sẽ tự động cập nhật khi bạn xác minh email</span>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
