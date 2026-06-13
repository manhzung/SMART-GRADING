import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../presentation/store/authStore';
import AuthLayout from '../presentation/components/AuthLayout';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Vui lòng nhập địa chỉ email.');
      return;
    }

    try {
      await login(email, password);
      toast.success('Đăng nhập thành công!');
      navigate('/');
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    }
  };

  const handleSocialLogin = (provider: string) => {
    toast.info(`Tính năng đăng nhập bằng ${provider} đang được phát triển.`);
  };

  return (
    <AuthLayout showIllustration={true} illustrationType="book">
      <div className={styles.container}>
        <h1 className={styles.title}>Smart Exam Grading Login</h1>
        <p className={styles.subtitle}>Welcome back. Please enter your details.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorAlert}>{error}</div>}

          {/* Email / Username */}
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Email Address</label>
            <input
              type="text"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError();
              }}
              placeholder="professor@university.edu"
              className={styles.input}
              disabled={isLoading}
              required
            />
          </div>

          {/* Password with Forgot Link */}
          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <Link to="/forgot-password" className={styles.forgotLink}>
                Forgot Password?
              </Link>
            </div>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError();
                }}
                placeholder="••••••••"
                className={styles.input}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember for 30 days */}
          <div className={styles.checkboxGroup}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className={styles.checkboxInput}
            />
            <label htmlFor="rememberMe" className={styles.checkboxLabel}>
              Remember for 30 days
            </label>
          </div>

          {/* Log In Button */}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading}
          >
            {isLoading ? 'Logging In...' : 'Log In'}
          </button>
        </form>

        {/* OR Divider */}
        <div className={styles.divider}>
          <div className={styles.dividerLine} />
          <span>OR</span>
          <div className={styles.dividerLine} />
        </div>

        {/* Social Buttons */}
        <div className={styles.socialGroup}>
          <button
            type="button"
            className={styles.socialBtn}
            onClick={() => handleSocialLogin('Google')}
            disabled={isLoading}
          >
            <span className={styles.socialIcon}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.909c1.702-1.567 2.683-3.874 2.683-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.909-2.258c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.938 5.48 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.707c-.18-.54-.282-1.119-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.48 0 2.438 2.062.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            </span>
            <span>Sign in with Google</span>
          </button>

          <button
            type="button"
            className={styles.socialBtn}
            onClick={() => handleSocialLogin('HUST Account')}
            disabled={isLoading}
          >
            <span className={`${styles.socialIcon} ${styles.hustIcon}`}>
              <Landmark size={18} />
            </span>
            <span>Sign in with HUST Account</span>
          </button>
        </div>

        <p className={styles.footerText}>
          Don't have an account?{' '}
          <Link to="/register" className={styles.footerLink}>Register now</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
