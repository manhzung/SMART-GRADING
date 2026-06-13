import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, ShieldCheck, Gauge, Laptop } from 'lucide-react';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  children: React.ReactNode;
  splitLayout?: boolean;
  showIllustration?: boolean;
  illustrationType?: 'book' | 'chart';
}

export default function AuthLayout({
  children,
  splitLayout = false,
  showIllustration = false,
  illustrationType = 'book',
}: AuthLayoutProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  // Render header links based on the current page
  const renderHeaderLinks = () => {
    if (currentPath === '/login') {
      return (
        <div className={styles.navLinks}>
          <a href="#support" className={styles.navLink}>Support</a>
          <Link to="/register" className={styles.registerBtn}>Register</Link>
        </div>
      );
    }

    if (currentPath === '/register') {
      return (
        <div className={styles.navLinks}>
          <a href="#how-it-works" className={styles.navLink}>How it works</a>
          <a href="#pricing" className={styles.navLink}>Pricing</a>
          <a href="#about" className={styles.navLink}>About</a>
          <Link to="/login" className={styles.navLink}>Log In</Link>
          <Link to="/register" className={`${styles.registerBtn}`}>Register</Link>
        </div>
      );
    }

    if (currentPath === '/verify-email') {
      return (
        <div className={styles.navLinks}>
          <Link to="/login" className={styles.navLink}>Log In</Link>
          <Link to="/register" className={`${styles.navLink} ${styles.activeNavLink}`}>Register</Link>
        </div>
      );
    }

    if (currentPath === '/forgot-password' || currentPath === '/reset-password') {
      return (
        <div className={styles.navLinks}>
          <Link to="/register" className={styles.navLink}>Register</Link>
          <Link to="/login" className={`${styles.navLink} ${styles.activeNavLink}`}>Log In</Link>
        </div>
      );
    }

    // Default fallback
    return (
      <div className={styles.navLinks}>
        <Link to="/login" className={styles.navLink}>Log In</Link>
        <Link to="/register" className={styles.registerBtn}>Register</Link>
      </div>
    );
  };

  return (
    <div className={styles.authContainer}>
      {/* Header */}
      <header className={styles.header}>
        <Link to="/" className={styles.logoContainer}>
          <BookOpen className={styles.logoIcon} size={24} />
          <span>Smart Exam Grading</span>
        </Link>
        {renderHeaderLinks()}
      </header>

      {/* Main Body */}
      <main className={styles.mainContent}>
        <div className={`${styles.card} ${splitLayout ? styles.splitCard : ''}`}>
          {splitLayout ? (
            <>
              {/* Left sidebar for split layout (Register Page) */}
              <div className={styles.benefitsCol}>
                <div>
                  <h2 className={styles.benefitsTitle}>Revolutionizing Academic Assessment</h2>
                  <p className={styles.benefitsDesc}>
                    Join thousands of educators leveraging AI-powered insights to provide faster, fairer, and more accurate grading for every student.
                  </p>
                </div>
                <div className={styles.benefitsList}>
                  <div className={styles.benefitItem}>
                    <div className={styles.benefitIconWrapper}>
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h4 className={styles.benefitTextTitle}>Accurate AI Analysis</h4>
                      <p className={styles.benefitTextDesc}>Consistent grading across all paper types.</p>
                    </div>
                  </div>
                  <div className={styles.benefitItem}>
                    <div className={styles.benefitIconWrapper}>
                      <Gauge size={20} />
                    </div>
                    <div>
                      <h4 className={styles.benefitTextTitle}>800% Faster Turnaround</h4>
                      <p className={styles.benefitTextDesc}>Return results to students in record time.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right form side */}
              <div className={styles.formCol}>
                {children}
              </div>
            </>
          ) : (
            <div className={styles.singleFormCol}>
              {children}
            </div>
          )}
        </div>

        {/* Bottom illustration for Login / Forgot / Reset Password pages */}
        {showIllustration && (
          <div className={styles.illustrationContainer}>
            <div className={styles.illustrationBox}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <Laptop size={48} strokeWidth={1.5} />
                <span style={{ fontSize: '10px', opacity: 0.8, fontWeight: 500 }}>
                  {illustrationType === 'book' ? '📖 grading.io' : '📊 stats.io'}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div>Smart Exam Grading</div>
        <div>&copy; 2026 Smart Exam Grading. All rights reserved.</div>
        <div className={styles.footerLinks}>
          <a href="#privacy" className={styles.footerLink}>Privacy Policy</a>
          <a href="#terms" className={styles.footerLink}>Terms of Service</a>
          <a href="#support" className={styles.footerLink}>Support</a>
        </div>
      </footer>
    </div>
  );
}
