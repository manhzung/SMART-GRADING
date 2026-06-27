import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EntityListPage, { type RoleMode } from '../../../presentation/components/shared/EntityListPage';
import type { Column } from '../../../presentation/components/shared/DataTable';

interface Row { id: string; name: string; school?: string; }
const columns: Column<Row>[] = [{ key: 'name', header: 'Name' }];

describe('EntityListPage', () => {
  const baseProps = {
    mode: 'admin' as RoleMode,
    title: 'T', subtitle: 's',
    rows: [] as Row[], columns, rowKey: (r: Row) => r.id,
    loading: false, error: null as string | null,
    pagination: { page: 1, pages: 1 },
    onSearch: vi.fn(), onPageChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and badge', () => {
    render(<EntityListPage<Row> {...baseProps} />);
    expect(screen.getByText('T')).toBeInTheDocument();
    expect(screen.getByText('SUPER ADMIN')).toBeInTheDocument();
  });

  it('renders error banner when error is set', () => {
    render(<EntityListPage<Row> {...baseProps} error="Boom" />);
    expect(screen.getByText(/boom/i)).toBeInTheDocument();
  });

  it('calls onSearch when typing in search input', () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(<EntityListPage<Row> {...baseProps} onSearch={onSearch} />);
    fireEvent.change(screen.getByPlaceholderText(/tìm|search/i), { target: { value: 'abc' } });
    vi.advanceTimersByTime(300);
    expect(onSearch).toHaveBeenCalledWith('abc');
    vi.useRealTimers();
  });

  it('renders extra filter dropdown when extraFilters provided', () => {
    const onFilterChange = vi.fn();
    render(
      <EntityListPage<Row>
        {...baseProps}
        extraFilters={[{ key: 'school', label: 'School', options: [{ value: 's1', label: 'S1' }] }]}
        onFilterChange={onFilterChange}
      />
    );
    expect(screen.getByText('School')).toBeInTheDocument();
  });

  it('shows school column only for admin mode', () => {
    const cols: Column<Row>[] = [
      { key: 'name', header: 'Name' },
      { key: 'school', header: 'School' },
    ];
    const { rerender } = render(<EntityListPage<Row> {...baseProps} columns={cols} mode="admin" />);
    expect(screen.getByText('School')).toBeInTheDocument();
    rerender(<EntityListPage<Row> {...baseProps} columns={cols} mode="teacher" />);
    expect(screen.queryByText('School')).toBeNull();
  });

  it('shows bulk action bar when items are selected in admin mode', () => {
    render(<EntityListPage<Row> {...baseProps} mode="admin" rows={[{ id: '1', name: 'A' }]} selectedIds={['1']} onBulkDelete={vi.fn()} />);
    expect(screen.getByText(/đã chọn|selected/i)).toBeInTheDocument();
  });

  it('does not show bulk action bar in teacher mode', () => {
    render(<EntityListPage<Row> {...baseProps} mode="teacher" rows={[{ id: '1', name: 'A' }]} selectedIds={['1']} onBulkDelete={vi.fn()} />);
    expect(screen.queryByText(/đã chọn|selected/i)).toBeNull();
  });
});
