import { useState, useCallback } from 'react';
import { useAppealStore, type BackendAppeal } from '../presentation/store/appealStore';
import EntityListPage, { type Column } from '../presentation/components/shared/EntityListPage';

export type AppealItem = BackendAppeal;

const columns: Column<AppealItem>[] = [
  {
    key: 'studentName',
    header: 'Học sinh',
    render: (r) => {
      const name = typeof r.studentId === 'object' ? r.studentId.name : '—';
      const code = typeof r.studentId === 'object' ? r.studentId.studentCode : '';
      return (
        <span>
          {name}
          {code ? <span style={{ color: '#888', fontSize: '12px', marginLeft: '6px' }}>({code})</span> : null}
        </span>
      );
    },
  },
  {
    key: 'examTitle',
    header: 'Bài thi',
    render: (r) => typeof r.examId === 'object' ? r.examId.title : '—',
  },
  {
    key: 'questionContent',
    header: 'Câu hỏi',
    render: (r) => {
      const content = typeof r.questionId === 'object' ? r.questionId.content : '';
      return content ? content.slice(0, 60) + (content.length > 60 ? '...' : '') : `Câu ${r.questionPosition}`;
    },
  },
  {
    key: 'status',
    header: 'Trạng thái',
    render: (r) => {
      const statusMap: Record<string, string> = {
        pending: 'Chờ duyệt',
        under_review: 'Đang xem xét',
        approved: 'Đã duyệt',
        rejected: 'Đã từ chối',
      };
      return statusMap[r.status] ?? r.status;
    },
  },
  {
    key: 'createdAt',
    header: 'Ngày gửi',
    render: (r) => new Date(r.createdAt).toLocaleDateString('vi-VN'),
  },
];

export default function AppealsPage() {
  const { appeals, isLoading, error, pagination, fetchAppeals, reviewAppeal } = useAppealStore();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback((q: string, p: number) => {
    fetchAppeals({ search: q || undefined, page: p, limit: 10 });
  }, [fetchAppeals]);

  return (
    <EntityListPage<AppealItem>
      mode="teacher"
      title="Quản lý phúc tra"
      subtitle="Xem và xử lý yêu cầu phúc khảo từ học sinh"
      searchPlaceholder="Tìm theo tên học sinh..."
      rows={appeals}
      columns={columns}
      rowKey={(r) => r._id}
      loading={isLoading}
      error={error}
      pagination={{ page: pagination.page, pages: pagination.pages }}
      onSearch={(q) => { setSearch(q); setPage(1); load(q, 1); }}
      onPageChange={(p) => { setPage(p); load(search, p); }}
      onEdit={(r) => reviewAppeal(r._id, { decision: 'approved' })}
    />
  );
}
