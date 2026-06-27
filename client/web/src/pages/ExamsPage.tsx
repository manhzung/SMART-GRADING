import { useState, useCallback } from 'react';
import { useExamStore, type Exam } from '../presentation/store/examStore';
import { useAuthStore } from '../presentation/store/authStore';
import EntityListPage, { type Column } from '../presentation/components/shared/EntityListPage';

export type ExamItem = Exam;

const columns: Column<ExamItem>[] = [
  { key: 'title', header: 'Tiêu đề' },
  { key: 'subjectName', header: 'Môn' },
  { key: 'status', header: 'Trạng thái' },
  { key: 'examDate', header: 'Ngày thi', render: (r) => r.examDate ? new Date(r.examDate).toLocaleDateString('vi-VN') : '—' },
];

export default function ExamsPage() {
  const { exams, isLoading, error, pagination, fetchExams, deleteExam } = useExamStore();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback((q: string, p: number) => {
    fetchExams({ search: q || undefined, page: p, limit: 10 });
  }, [fetchExams]);

  return (
    <EntityListPage<ExamItem>
      mode="teacher"
      title="Bài kiểm tra"
      subtitle={user?.name ? `Xin chào, ${user.name}` : 'Danh sách bài kiểm tra bạn đã tạo'}
      searchPlaceholder="Tìm tiêu đề..."
      rows={exams}
      columns={columns}
      rowKey={(r) => r._id || r.id}
      loading={isLoading}
      error={error}
      pagination={{ page: pagination.page, pages: pagination.pages }}
      onSearch={(q) => { setSearch(q); setPage(1); load(q, 1); }}
      onPageChange={(p) => { setPage(p); load(search, p); }}
      onDelete={(r) => deleteExam(r._id || r.id)}
    />
  );
}
