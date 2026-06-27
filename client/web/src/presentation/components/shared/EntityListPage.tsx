import { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import EntityPageHeader, { type RoleMode } from './EntityPageHeader';
import DataTable, { type Column } from './DataTable';
import ConfirmDialog from './ConfirmDialog';
import styles from './EntityListPage.module.css';

export type { RoleMode };
export type { Column };

export interface Pagination { page: number; pages: number; }

interface ExtraFilter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface EntityListPageProps<T> {
  mode: RoleMode;
  title: string;
  subtitle: string;
  createLabel?: string;
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  pagination: Pagination;
  searchPlaceholder?: string;
  extraFilters?: ExtraFilter[];
  selectedIds?: string[];
  emptyText?: string;

  onSearch: (q: string) => void;
  onFilterChange?: (key: string, value: string) => void;
  onPageChange: (page: number) => void;
  onCreate?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onBulkDelete?: (ids: string[]) => void;

  onSelectionChange?: (ids: string[]) => void;
  headerExtra?: React.ReactNode;
}

export default function EntityListPage<T>({
  mode, title, subtitle, createLabel, rows, columns, rowKey,
  loading = false, error = null, pagination,
  searchPlaceholder = 'Tìm kiếm...', extraFilters,
  selectedIds = [], emptyText = 'Chưa có dữ liệu',
  onSearch, onFilterChange, onPageChange, onCreate, onEdit, onDelete, onBulkDelete,
  onSelectionChange, headerExtra,
}: EntityListPageProps<T>) {
  const [searchValue, setSearchValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<T | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  const visibleColumns = mode === 'admin'
    ? columns
    : columns.filter((c) => !['school', 'schoolName', 'schoolId'].includes(String(c.key)));

  const showBulk = mode === 'admin' && !!onBulkDelete;

  useEffect(() => {
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, []);

  const handleSearch = (val: string) => {
    setSearchValue(val);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => onSearch(val), 300);
  };

  const handleDelete = async () => {
    if (!confirmDelete || !onDelete) return;
    setSubmittingDelete(true);
    try { onDelete(confirmDelete); } finally { setSubmittingDelete(false); setConfirmDelete(null); }
  };

  const handleBulkDelete = async () => {
    if (!onBulkDelete) return;
    setSubmittingDelete(true);
    try { onBulkDelete(selectedIds); } finally { setSubmittingDelete(false); setConfirmBulk(false); }
  };

  const pageNumbers = Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => i + 1);

  return (
    <div className={styles.page}>
      <EntityPageHeader mode={mode} title={title} subtitle={subtitle} createLabel={createLabel} onCreate={onCreate} extraActions={headerExtra} />

      <div className={styles.filters}>
        {extraFilters?.map((f) => (
          <select key={f.key} className={styles.select} onChange={(e) => onFilterChange?.(f.key, e.target.value)}>
            <option value="">{f.label}</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder={searchPlaceholder} value={searchValue} onChange={(e) => handleSearch(e.target.value)} />
          {searchValue && <button className={styles.clearBtn} onClick={() => handleSearch('')}><X size={14} /></button>}
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {showBulk && selectedIds.length > 0 && (
        <div className={styles.bulkBar}>
          <span>Đã chọn {selectedIds.length} mục</span>
          <button className={styles.bulkDeleteBtn} onClick={() => setConfirmBulk(true)}>Xóa hàng loạt</button>
        </div>
      )}

      <DataTable<T>
        rows={rows}
        columns={visibleColumns}
        rowKey={rowKey}
        loading={loading}
        emptyText={emptyText}
        selectable={showBulk}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
        actionRenderer={onEdit || onDelete ? (row) => (
          <div className={styles.rowActions}>
            {onEdit && <button className={styles.iconBtn} onClick={() => onEdit(row)} title="Sửa">Sửa</button>}
            {onDelete && <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => setConfirmDelete(row)} title="Xóa">Xóa</button>}
          </div>
        ) : undefined}
      />

      {pagination.pages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}><ChevronLeft size={16} /></button>
          {pageNumbers.map((p) => (
            <button key={p} className={`${styles.pageBtn} ${p === pagination.page ? styles.pageBtnActive : ''}`} onClick={() => onPageChange(p)}>{p}</button>
          ))}
          <button className={styles.pageBtn} disabled={pagination.page >= pagination.pages} onClick={() => onPageChange(pagination.page + 1)}><ChevronRight size={16} /></button>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Xóa mục này?"
        message="Hành động này không thể hoàn tác."
        danger
        submitting={submittingDelete}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={confirmBulk}
        title={`Xóa ${selectedIds.length} mục đã chọn?`}
        message="Hành động này không thể hoàn tác."
        danger
        submitting={submittingDelete}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulk(false)}
      />
    </div>
  );
}
