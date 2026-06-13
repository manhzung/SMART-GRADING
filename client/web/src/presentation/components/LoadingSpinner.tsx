import React from 'react';
import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  label?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  fullScreen = false,
  label,
}) => {
  const spinner = (
    <div className={styles.wrapper}>
      <div className={`${styles.spinner} ${styles[size]}`} />
      {label && <p className={styles.label}>{label}</p>}
    </div>
  );

  if (fullScreen) {
    return <div className={styles.fullScreen}>{spinner}</div>;
  }
  return spinner;
};

export default LoadingSpinner;
