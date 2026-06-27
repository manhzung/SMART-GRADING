import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DataTable from '../../../presentation/components/shared/DataTable';

interface Row { id: string; name: string; }

const columns = [
  { key: 'name' as const, header: 'Name' },
  { key: 'id' as const, header: 'ID' },
];

describe('DataTable', () => {
  it('renders header columns and row cells', () => {
    const rows: Row[] = [{ id: '1', name: 'Alpha' }, { id: '2', name: 'Beta' }];
    render(<DataTable<Row> rows={rows} columns={columns} rowKey={(r) => r.id} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('renders empty state when no rows', () => {
    render(<DataTable<Row> rows={[]} columns={columns} rowKey={(r) => r.id} emptyText="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders loading skeleton when loading', () => {
    const { container } = render(<DataTable<Row> rows={[]} columns={columns} rowKey={(r) => r.id} loading skeletonRows={3} />);
    expect(container.querySelectorAll('[data-skeleton="true"]').length).toBe(3);
  });

  it('renders selection checkboxes when selectable', () => {
    const rows: Row[] = [{ id: '1', name: 'A' }];
    const onSelectionChange = vi.fn();
    render(<DataTable<Row> rows={rows} columns={columns} rowKey={(r) => r.id} selectable selectedIds={[]} onSelectionChange={onSelectionChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /select 1/i }));
    expect(onSelectionChange).toHaveBeenCalledWith(['1']);
  });

  it('renders actions column when actionRenderer provided', () => {
    const rows: Row[] = [{ id: '1', name: 'A' }];
    render(<DataTable<Row> rows={rows} columns={columns} rowKey={(r) => r.id} actionRenderer={(r) => <button>Edit {r.name}</button>} />);
    expect(screen.getByRole('button', { name: /edit a/i })).toBeInTheDocument();
  });
});
