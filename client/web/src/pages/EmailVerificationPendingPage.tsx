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
            <h1 className={styles.title}>Error</h1>
            <p className={styles.subtitle}>No email information found. Please register again.</p>
            <Link to="/register" className={styles.loginBtn}>
              Back to Registration
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
            <h1 className={styles.title}>Verification Successful!</h1>
            <p className={styles.subtitle}>Your email has been verified.</p>
            <p className={styles.emailHighlight}>{email}</p>
            <button onClick={handleGoToLogin} className={styles.loginBtn}>
              Login Now
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

          <h1 className={styles.title}>Email Verification</h1>
          <p className={styles.subtitle}>
            We've sent a verification email to
          </p>
          <p className={styles.emailHighlight}>{email}</p>

          <div className={styles.checkingStatus}>
            <Loader2 size={20} className={styles.spinner} />
            <span>Checking verification status...</span>
          </div>

          <div className={styles.instructions}>
            <div className={styles.step}>
              <span className={styles.stepNumber}>1</span>
              <span>Open your email inbox and find the email from Smart Grading</span>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>2</span>
              <span>Click on the "Confirm Email" link</span>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>3</span>
              <span>This page will automatically redirect you to login</span>
            </div>
          </div>

          <div className={styles.autoUpdate}>
            <RefreshCw size={16} />
            <span>The page will automatically update once you verify your email</span>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
