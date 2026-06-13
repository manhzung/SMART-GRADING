import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { MailCheck, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../presentation/store/authStore';
import AuthLayout from '../presentation/components/AuthLayout';
import styles from './VerifyEmailPage.module.css';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const location = useLocation();
  
  const verifyEmail = useAuthStore((state) => state.verifyEmail);
  const sendVerificationEmail = useAuthStore((state) => state.sendVerificationEmail);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  // Email state from register page redirection, or fallback
  const registeredEmail = (location.state as { email?: string })?.email || '';

  // Cooldown timer for resend email
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // 6-digit OTP input states
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Automatically execute verification if token is present in the URL
  useEffect(() => {
    if (token) {
      const runVerification = async () => {
        setVerificationStatus('loading');
        try {
          await verifyEmail(token);
          setVerificationStatus('success');
          setStatusMessage('Xác thực email thành công! Tài khoản của bạn đã hoạt động.');
          toast.success('Xác thực email thành công!');
        } catch (err: unknown) {
          const error = err as { message?: string };
          setVerificationStatus('error');
          setStatusMessage(error.message || 'Xác thực email thất bại hoặc liên kết đã hết hạn.');
          toast.error('Xác thực email thất bại.');
        }
      };
      runVerification();
    }
  }, [token, verifyEmail]);

  // Resend cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Handle digit change
  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d+$/.test(value)) return; // Allow digits only

    const newOtp = [...otp];
    // Keep only the last character (in case they type multiple)
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    clearError();

    // Auto advance focus
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // Handle paste operation
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('Text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      clearError();
    }
  };

  // Submit OTP Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    
    if (code.length < 6) {
      toast.error('Vui lòng nhập đầy đủ mã xác thực gồm 6 chữ số.');
      return;
    }

    // Since backend expects verification via a URL token link:
    // We simulate the OTP success as a mockup behavior for UX, and explain to the user.
    setVerificationStatus('success');
    setStatusMessage('Xác thực mã OTP thành công (Giả lập)! Vui lòng kiểm tra email thực tế và bấm vào liên kết kích hoạt để đồng bộ dữ liệu nếu có.');
    toast.success('Mã OTP hợp lệ!');
    
    setTimeout(() => {
      navigate('/login');
    }, 4000);
  };

  // Handle Resend Email click
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await sendVerificationEmail();
      toast.success('Đã gửi lại email xác thực. Vui lòng kiểm tra hòm thư của bạn.');
      setResendCooldown(60); // Start 60s cooldown
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Gửi lại email xác thực thất bại.');
    }
  };

  // Render URL Token verification states
  if (token) {
    return (
      <AuthLayout>
        <div className={styles.statusCard}>
          {verificationStatus === 'loading' && (
            <>
              <div className={styles.loadingSpinner} />
              <h1 className={styles.title}>Đang xác thực email</h1>
              <p className={styles.subtitle}>Vui lòng chờ trong giây lát khi chúng tôi xác minh tài khoản của bạn...</p>
            </>
          )}

          {verificationStatus === 'success' && (
            <>
              <div className={styles.iconWrapper} style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                <CheckCircle size={32} />
              </div>
              <h1 className={styles.title}>Xác thực thành công</h1>
              <p className={styles.subtitle}>{statusMessage}</p>
              <Link to="/login" className={styles.submitBtn} style={{ textDecoration: 'none', marginTop: '20px' }}>
                Đi đến Đăng nhập
              </Link>
            </>
          )}

          {verificationStatus === 'error' && (
            <>
              <div className={styles.iconWrapper} style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                <XCircle size={32} />
              </div>
              <h1 className={styles.title}>Xác thực thất bại</h1>
              <p className={styles.subtitle}>{statusMessage}</p>
              <div className={styles.errorAlert} style={{ marginTop: '12px' }}>
                {error || 'Mã token xác thực không đúng hoặc đã hết hạn.'}
              </div>
              <div style={{ display: 'flex', gap: '16px', width: '100%', marginTop: '12px' }}>
                <button onClick={() => window.location.reload()} className={styles.submitBtn} style={{ flex: 1 }}>
                  Thử lại
                </button>
                <Link to="/login" className={styles.submitBtn} style={{ flex: 1, textDecoration: 'none', backgroundColor: '#f3f4f6', color: '#1f2937', border: '1px solid #d1d5db' }}>
                  Quay lại đăng nhập
                </Link>
              </div>
            </>
          )}
        </div>
      </AuthLayout>
    );
  }

  // Render OTP verification states (when entering from registration screen)
  return (
    <AuthLayout>
      <div className={styles.container}>
        {verificationStatus === 'success' ? (
          <div className={styles.statusCard}>
            <div className={styles.iconWrapper} style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <CheckCircle size={32} />
            </div>
            <h1 className={styles.title}>Xác thực thành công</h1>
            <p className={styles.subtitle}>{statusMessage}</p>
            <Link to="/login" className={styles.submitBtn} style={{ textDecoration: 'none', marginTop: '20px' }}>
              Đi đến Đăng nhập
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.iconWrapper}>
              <MailCheck size={32} />
            </div>

            <h1 className={styles.title}>Verify Your Identity</h1>
            <p className={styles.subtitle}>
              We've sent a 6-digit verification code to {registeredEmail ? <strong>{registeredEmail}</strong> : 'your email'}. 
              Please enter it below to secure your account.
            </p>

            <div className={styles.infoMessage}>
              💡 <strong>Lưu ý:</strong> Bản thử nghiệm hỗ trợ nhập 6 chữ số bất kỳ để xác thực nhanh giao diện. 
              Bạn cũng có thể nhấp trực tiếp vào đường link trong email để kiểm tra luồng xác thực thực tế.
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.otpContainer}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    className={styles.otpInput}
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              <button type="submit" className={styles.submitBtn}>
                Verify Code
                <ArrowRight size={18} />
              </button>
            </form>

            <div className={styles.resendText}>
              Didn't receive the code?
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || isLoading}
                className={styles.resendBtn}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
              </button>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
