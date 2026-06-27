import { useState, useCallback } from 'react';
import { useClassStore, type ClassItem } from '../presentation/store/classStore';
import { useDashboardStore } from '../presentation/store/dashboardStore';
import { useAuthStore } from '../presentation/store/authStore';
import EntityListPage, { type Column } from '../presentation/components/shared/EntityListPage';

const columns: Column<ClassItem>[] = [
  { key: 'name', header: 'Tên lớp' },
  { key: 'code', header: 'Mã' },
  { key: 'gradeLevel', header: 'Khối' },
  { key: 'studentCount', header: 'Sĩ số', render: (r) => (r.studentIds?.length ?? 0) },
];

export default function ClassesPage() {
  const { classes, isLoading, error, pagination, fetchClasses, deleteClass } = useClassStore();
  const { fetchDashboard } = useDashboardStore();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback((q: string, p: number) => {
    fetchClasses({ search: q || undefined, page: p, limit: 10 });
    fetchDashboard();
  }, [fetchClasses, fetchDashboard]);

  return (
    <EntityListPage<ClassItem>
      mode="teacher"
      title="Lớp học của tôi"
      subtitle={user?.name ? `Xin chào, ${user.name}` : 'Danh sách lớp bạn phụ trách'}
      searchPlaceholder="Tìm tên lớp..."
      rows={classes}
      columns={columns}
      rowKey={(r) => r._id || r.id}
      loading={isLoading}
      error={error}
      pagination={{ page: pagination.page, pages: pagination.pages }}
      onSearch={(q) => { setSearch(q); setPage(1); load(q, 1); }}
      onPageChange={(p) => { setPage(p); load(search, p); }}
      onDelete={(r) => deleteClass(r._id || r.id)}
    />
  );
}
