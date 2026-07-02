import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, CheckCircle, Loader2, RefreshCw, ArrowRight, Send, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import AuthLayout from '../presentation/components/AuthLayout';
import styles from './EmailVerificationPendingPage.module.css';

export default function EmailVerificationPendingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const email = (location.state as { email?: string })?.email || '';
  const [isVerified, setIsVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            toast.success('Xác thực email thành công! Đang chuyển hướng...');
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

  // Countdown timer logic for resend button
  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [countdown]);

  const handleResendEmail = async () => {
    if (isResending || countdown > 0) return;
    
    setIsResending(true);
    try {
      const response = await fetch('/api/v1/auth/resend-verification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok || response.status === 204) {
        toast.success('Một email xác thực mới đã được gửi tới hòm thư của bạn.');
        setCountdown(60); // 60s cooldown
      } else {
        toast.error('Không thể gửi lại email xác thực. Vui lòng thử lại sau.');
      }
    } catch (error) {
      console.error('Error resending email:', error);
      toast.error('Có lỗi xảy ra khi gửi lại email. Vui lòng kiểm tra kết nối.');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login', { state: { verified: true, email } });
  };

  if (!email) {
    return (
      <AuthLayout>
        <div className={styles.errorContainer}>
          <div className={styles.errorIconWrapper}>
            <AlertCircle size={40} className={styles.errorIcon} />
          </div>
          <h1 className={styles.errorTitle}>Lỗi Xác Thực</h1>
          <p className={styles.errorSubtitle}>
            Không tìm thấy thông tin email đăng ký. Vui lòng quay lại trang đăng ký tài khoản.
          </p>
          <Link to="/register" className={styles.primaryButton}>
            Quay lại trang Đăng ký
            <ArrowRight size={18} />
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (isVerified) {
    return (
      <AuthLayout>
        <div className={styles.contentWrapper}>
          <div className={styles.successPulseContainer}>
            <div className={styles.pulseRing}></div>
            <div className={styles.successIconWrapper}>
              <CheckCircle size={40} />
            </div>
          </div>
          
          <h1 className={styles.title}>Xác Thực Thành Công!</h1>
          <p className={styles.subtitle}>
            Email của bạn đã được xác thực thành công. Hãy bắt đầu trải nghiệm hệ thống chấm điểm thông minh ngay bây giờ.
          </p>
          
          <div className={styles.emailBadge}>
            <Mail size={16} className={styles.emailIcon} />
            <span>{email}</span>
          </div>

          <button onClick={handleGoToLogin} className={styles.primaryButton}>
            Đăng nhập ngay
            <ArrowRight size={18} />
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className={styles.contentWrapper}>
        <div className={styles.pendingPulseContainer}>
          <div className={styles.pulseRing}></div>
          <div className={styles.pendingIconWrapper}>
            <Mail size={40} />
          </div>
        </div>

        <h1 className={styles.title}>Xác Thực Tài Khoản</h1>
        <p className={styles.subtitle}>
          Chúng tôi đã gửi một liên kết xác thực đến địa chỉ email:
        </p>
        
        <div className={styles.emailBadge}>
          <Mail size={16} className={styles.emailIcon} />
          <span>{email}</span>
        </div>

        <div className={styles.statusBanner}>
          <Loader2 size={16} className={styles.spinningLoader} />
          <span>Đang đợi bạn xác thực email...</span>
        </div>

        <div className={styles.timeline}>
          <div className={styles.timelineItem}>
            <div className={styles.timelineStep}>1</div>
            <div className={styles.timelineContent}>
              <h4>Kiểm tra hòm thư</h4>
              <p>Mở hộp thư đến của bạn (hãy kiểm tra cả hộp thư Rác/Spam hoặc Quảng cáo nếu không tìm thấy).</p>
            </div>
          </div>

          <div className={styles.timelineItem}>
            <div className={styles.timelineStep}>2</div>
            <div className={styles.timelineContent}>
              <h4>Nhấp vào liên kết</h4>
              <p>Nhấp vào nút "Confirm Email" hoặc đường dẫn xác thực được cung cấp trong email.</p>
            </div>
          </div>

          <div className={styles.timelineItem}>
            <div className={styles.timelineStep}>3</div>
            <div className={styles.timelineContent}>
              <h4>Hoàn thành tự động</h4>
              <p>Hệ thống sẽ tự động nhận diện xác thực thành công và chuyển bạn tới trang đăng nhập.</p>
            </div>
          </div>
        </div>

        <div className={styles.footerSection}>
          <p className={styles.resendPrompt}>Bạn không nhận được email xác thực?</p>
          <button
            onClick={handleResendEmail}
            disabled={isResending || countdown > 0}
            className={styles.resendButton}
          >
            {isResending ? (
              <>
                <Loader2 size={16} className={styles.spinningLoader} />
                <span>Đang gửi lại...</span>
              </>
            ) : countdown > 0 ? (
              <>
                <RefreshCw size={16} className={styles.countdownLoader} />
                <span>Gửi lại sau {countdown} giây</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Gửi lại email xác thực</span>
              </>
            )}
          </button>
        </div>

        <div className={styles.autoUpdateTip}>
          <RefreshCw size={14} className={styles.spinningLoaderFast} />
          <span>Trang này sẽ tự động tải lại khi hoàn tất</span>
        </div>
      </div>
    </AuthLayout>
  );
}

