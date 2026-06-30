import styles from './DataTable.module.css';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: number | string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  emptyText?: string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  actionRenderer?: (row: T) => React.ReactNode;
}

export default function DataTable<T>({
  rows, columns, rowKey, loading, skeletonRows = 5,
  emptyText = 'No data available', selectable, selectedIds = [], onSelectionChange, actionRenderer,
}: DataTableProps<T>) {
  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (selectedIds.length === rows.length) onSelectionChange([]);
    else onSelectionChange(rows.map(rowKey));
  };
  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) onSelectionChange(selectedIds.filter((x) => x !== id));
    else onSelectionChange([...selectedIds, id]);
  };
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {selectable && (
              <th style={{ width: 40 }}>
                <input type="checkbox" checked={rows.length > 0 && selectedIds.length === rows.length} onChange={toggleAll} aria-label="Select all" />
              </th>
            )}
            {columns.map((c) => (
              <th key={String(c.key)} style={{ width: c.width, textAlign: c.align ?? 'left' }}>{c.header}</th>
            ))}
            {actionRenderer && <th style={{ width: 100 }}></th>}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={`sk-${i}`}>
                {selectable && <td><span data-skeleton="true" className={styles.skeleton} style={{ width: 16, height: 16 }} /></td>}
                <td colSpan={columns.length}><span data-skeleton="true" className={styles.skeleton} style={{ width: '60%', height: 14 }} /></td>
                {actionRenderer && <td></td>}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr><td colSpan={columns.length + (selectable ? 1 : 0) + (actionRenderer ? 1 : 0)} className={styles.empty}>{emptyText}</td></tr>
          ) : rows.map((row) => {
            const id = rowKey(row);
            return (
              <tr key={id}>
                {selectable && (
                  <td><input type="checkbox" checked={selectedIds.includes(id)} onChange={() => toggleOne(id)} aria-label={`Select ${id}`} /></td>
                )}
                {columns.map((c) => (
                  <td key={String(c.key)} style={{ textAlign: c.align ?? 'left' }}>
                    {c.render ? c.render(row) : String((row as any)[c.key] ?? '')}
                  </td>
                ))}
                {actionRenderer && <td>{actionRenderer(row)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
