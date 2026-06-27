import { Plus } from 'lucide-react';
import styles from './EntityPageHeader.module.css';

export type RoleMode = 'admin' | 'schoolAdmin' | 'teacher';

const ROLE_BADGE: Record<RoleMode, string> = {
  admin: 'SUPER ADMIN',
  schoolAdmin: 'SCHOOL ADMIN',
  teacher: 'TEACHER',
};

interface EntityPageHeaderProps {
  mode: RoleMode;
  title: string;
  subtitle: string;
  createLabel?: string;
  onCreate?: () => void;
  extraActions?: React.ReactNode;
}

export default function EntityPageHeader({
  mode,
  title,
  subtitle,
  createLabel = 'Thêm mới',
  onCreate,
  extraActions,
}: EntityPageHeaderProps) {
  return (
    <header className={`${styles.header} ${styles[mode]}`}>
      <div className={styles.titleBlock}>
        <span className={`${styles.badge} ${styles[mode]}`}>{ROLE_BADGE[mode]}</span>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
      <div className={styles.actions}>
        {extraActions}
        {onCreate && (
          <button className={`${styles.createBtn} ${styles[mode]}`} onClick={onCreate}>
            <Plus size={16} /> {createLabel}
          </button>
        )}
      </div>
    </header>
  );
}
