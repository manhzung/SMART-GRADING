import { X } from 'lucide-react';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  submitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  danger = false,
  submitting = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.dialog} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.closeBtn} onClick={onCancel} aria-label="Close"><X size={18} /></button>
        </div>
        <p className={styles.message}>{message}</p>
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel} disabled={submitting}>{cancelLabel}</button>
          <button
            className={danger ? `${styles.confirmBtn} ${styles.danger}` : styles.confirmBtn}
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
