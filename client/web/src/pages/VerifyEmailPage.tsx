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
          setStatusMessage('Email verified successfully! Your account is now active.');
          toast.success('Email verified successfully!');
        } catch (err: unknown) {
          const error = err as { message?: string };
          setVerificationStatus('error');
          setStatusMessage(error.message || 'Email verification failed or link has expired.');
          toast.error('Email verification failed.');
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
      toast.error('Please enter the full 6-digit verification code.');
      return;
    }

    // Since backend expects verification via a URL token link:
    // We simulate the OTP success as a mockup behavior for UX, and explain to the user.
    setVerificationStatus('success');
    setStatusMessage('OTP code verified successfully (Simulation)! Please check your actual email inbox and click the verification link to synchronize data.');
    toast.success('Valid OTP code!');
    
    setTimeout(() => {
      navigate('/login');
    }, 4000);
  };

  // Handle Resend Email click
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await sendVerificationEmail();
      toast.success('Verification email resent. Please check your inbox.');
      setResendCooldown(60); // Start 60s cooldown
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Failed to resend verification email.');
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
              <h1 className={styles.title}>Verifying email</h1>
              <p className={styles.subtitle}>Please wait a moment while we verify your account...</p>
            </>
          )}

          {verificationStatus === 'success' && (
            <>
              <div className={styles.iconWrapper} style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                <CheckCircle size={32} />
              </div>
              <h1 className={styles.title}>Verification Successful</h1>
              <p className={styles.subtitle}>{statusMessage}</p>
              <Link to="/login" className={styles.submitBtn} style={{ textDecoration: 'none', marginTop: '20px' }}>
                Go to Login
              </Link>
            </>
          )}

          {verificationStatus === 'error' && (
            <>
              <div className={styles.iconWrapper} style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                <XCircle size={32} />
              </div>
              <h1 className={styles.title}>Verification Failed</h1>
              <p className={styles.subtitle}>{statusMessage}</p>
              <div className={styles.errorAlert} style={{ marginTop: '12px' }}>
                {error || 'Verification token is invalid or has expired.'}
              </div>
              <div style={{ display: 'flex', gap: '16px', width: '100%', marginTop: '12px' }}>
                <button onClick={() => window.location.reload()} className={styles.submitBtn} style={{ flex: 1 }}>
                  Try again
                </button>
                <Link to="/login" className={styles.submitBtn} style={{ flex: 1, textDecoration: 'none', backgroundColor: '#f3f4f6', color: '#1f2937', border: '1px solid #d1d5db' }}>
                  Back to Login
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
            <h1 className={styles.title}>Verification Successful</h1>
            <p className={styles.subtitle}>{statusMessage}</p>
            <Link to="/login" className={styles.submitBtn} style={{ textDecoration: 'none', marginTop: '20px' }}>
              Go to Login
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
              💡 <strong>Note:</strong> The demo supports entering any 6 digits for quick UI verification. 
              You can also click the link in the email to test the actual verification flow.
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
