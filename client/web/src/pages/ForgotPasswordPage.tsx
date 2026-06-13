import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, KeyRound, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../presentation/store/authStore';
import AuthLayout from '../presentation/components/AuthLayout';
import styles from './ForgotPasswordPage.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  
  const forgotPassword = useAuthStore((state) => state.forgotPassword);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Vui lòng nhập địa chỉ email.');
      return;
    }

    try {
      await forgotPassword(email);
      setIsSent(true);
      toast.success('Đã gửi email hướng dẫn đặt lại mật khẩu.');
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string };
      if (error.statusCode === 404) {
        setIsSent(true);
        toast.success('Đã gửi email hướng dẫn đặt lại mật khẩu.');
      } else {
        toast.error(error.message || 'Gửi yêu cầu đặt lại mật khẩu thất bại.');
      }
    }
  };

  return (
    <AuthLayout showIllustration={true} illustrationType="chart">
      <div className={styles.container}>
        {!isSent ? (
          <>
            <div className={styles.iconWrapper}>
              <KeyRound size={32} />
            </div>
            
            <h1 className={styles.title}>Reset Your Password</h1>
            <p className={styles.subtitle}>
              Enter your academic email to receive a password reset link.
            </p>

            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div className={styles.errorAlert}>{error}</div>}

              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>Email Address</label>
                <div className={styles.inputWrapper}>
                  <Mail className={styles.inputIcon} size={18} />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearError();
                    }}
                    placeholder="professor@university.edu"
                    className={styles.input}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isLoading}
              >
                {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
                <ArrowRight size={18} />
              </button>
            </form>

            <Link to="/login" className={styles.backLink}>
              <ArrowLeft size={16} />
              Back to Login
            </Link>
          </>
        ) : (
          <div className={styles.successCard}>
            <div className={styles.iconWrapper} style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <CheckCircle size={32} />
            </div>
            <h2 className={styles.successTitle}>Check Your Email</h2>
            <p className={styles.successText}>
              We have sent password reset instructions to <strong>{email}</strong>. 
              Please check your inbox (and spam folder) and click the link inside.
            </p>
            <Link to="/login" className={styles.submitBtn} style={{ textDecoration: 'none', width: '100%' }}>
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
