import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../presentation/store/authStore';
import AuthLayout from '../presentation/components/AuthLayout';
import styles from './ResetPasswordPage.module.css';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const resetPassword = useAuthStore((state) => state.resetPassword);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!token) {
      setLocalError('Liên kết đặt lại mật khẩu không hợp lệ (thiếu token).');
      return;
    }

    if (password.length < 8) {
      setLocalError('Mật khẩu mới phải dài ít nhất 8 ký tự.');
      return;
    }

    if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
      setLocalError('Mật khẩu phải chứa ít nhất một chữ cái và một chữ số.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      await resetPassword(token, password);
      setIsSuccess(true);
      toast.success('Đặt lại mật khẩu thành công!');
      
      // Auto redirect to login
      setTimeout(() => {
        navigate('/login');
      }, 3500);
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Đặt lại mật khẩu thất bại.');
    }
  };

  return (
    <AuthLayout showIllustration={true} illustrationType="book">
      <div className={styles.container}>
        {isSuccess ? (
          <div className={styles.successCard}>
            <div className={styles.iconWrapper} style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <CheckCircle size={32} />
            </div>
            <h2 className={styles.successTitle}>Mật khẩu đã đặt lại</h2>
            <p className={styles.successText}>
              Mật khẩu của bạn đã được thay đổi thành công. Hệ thống đang chuyển hướng bạn về trang đăng nhập...
            </p>
            <Link to="/login" className={styles.submitBtn} style={{ textDecoration: 'none', width: '100%' }}>
              Đăng nhập ngay
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.iconWrapper}>
              <Lock size={32} />
            </div>

            <h1 className={styles.title}>Set New Password</h1>
            <p className={styles.subtitle}>
              Choose a strong password to secure your academic account.
            </p>

            {!token && (
              <div className={styles.errorAlert}>
                ⚠️ <strong>Lỗi:</strong> Không tìm thấy mã thông báo (token) trong liên kết. Vui lòng kiểm tra lại liên kết trong email đặt lại mật khẩu của bạn.
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              {localError && <div className={styles.errorAlert}>{localError}</div>}
              {error && <div className={styles.errorAlert}>{error}</div>}

              {/* New Password */}
              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.label}>New Password</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setLocalError(null);
                      clearError();
                    }}
                    placeholder="••••••••"
                    className={styles.input}
                    disabled={!token || isLoading}
                    required
                  />
                  <button
                    type="button"
                    className={styles.eyeIconBtn}
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword" className={styles.label}>Confirm New Password</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setLocalError(null);
                      clearError();
                    }}
                    placeholder="••••••••"
                    className={styles.input}
                    disabled={!token || isLoading}
                    required
                  />
                  <button
                    type="button"
                    className={styles.eyeIconBtn}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={!token || isLoading}
              >
                {isLoading ? 'Resetting Password...' : 'Reset Password'}
                <ArrowRight size={18} />
              </button>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
