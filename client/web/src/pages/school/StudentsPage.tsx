import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSchoolStore, type Student, type SchoolClass } from '../../presentation/store/schoolStore';
import styles from './StudentsPage.module.css';

interface StudentFormData {
  name: string;
  email: string;
  studentCode: string;
  classId: string;
}

const EMPTY_FORM: StudentFormData = {
  name: '',
  email: '',
  studentCode: '',
  classId: '',
};

export default function StudentsPage() {
  const {
    students, studentsPagination, studentsLoading, studentsError,
    classes,
    fetchStudents, createStudent, updateStudent, deleteStudent,
    fetchClasses,
  } = useSchoolStore();

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [formData, setFormData] = useState<StudentFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback((s = search, c = classFilter, p = page) => {
    fetchStudents({
      search: s || undefined,
      ...(c ? { classId: c } : {}),
      page: p,
      limit: 10,
    });
  }, [fetchStudents, search, classFilter, page]);

  const loadClasses = useCallback(() => {
    fetchClasses({ limit: 100 });
  }, [fetchClasses]);

  useEffect(() => { load(); }, []);
  useEffect(() => { loadClasses(); }, []);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => load(val, classFilter, 1), 300);
  };

  const handleClassFilter = (val: string) => {
    setClassFilter(val);
    setPage(1);
    load(search, val, 1);
  };

  const handlePageChange = (newPage: number) => { setPage(newPage); load(search, classFilter, newPage); };

  const openCreate = () => { setFormData(EMPTY_FORM); setFormError(''); setEditStudent(null); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditStudent(null); setFormError(''); };

  const openEdit = (student: Student) => {
    setFormData({
      name: student.name,
      email: student.email,
      studentCode: student.studentCode || '',
      classId: student.classId || '',
    });
    setFormError('');
    setEditStudent(student);
    setModalOpen(true);
  };

  const getClassName = (classId: string): string => {
    const cls = classes.find((c) => (c._id || c.id) === classId);
    return cls?.name || '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);
    try {
      const payload: Record<string, string> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
      };
      if (formData.studentCode.trim()) {
        payload.studentCode = formData.studentCode.trim();
      }
      if (formData.classId) {
        payload.classId = formData.classId;
      }
      if (editStudent) {
        await updateStudent((editStudent._id || editStudent.id)!, payload);
      } else {
        await createStudent(payload);
      }
      closeModal();
      load();
    } catch (err: any) {
      setFormError(err.message || 'Đã xảy ra lỗi, vui lòng thử lại.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await deleteStudent((deleteTarget._id || deleteTarget.id)!);
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      setFormError(err.message || 'Xóa thất bại.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const totalPages = studentsPagination.pages || 1;
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý Học sinh</h1>
          <p className={styles.subtitle}>Thêm, sửa, xóa học sinh trong hệ thống</p>
        </div>
        <button className={styles.primaryBtn} onClick={openCreate}>
          <Plus size={16} /> Thêm Học sinh
        </button>
      </div>

      <div className={styles.filters}>
        <select
          className={styles.select}
          value={classFilter}
          onChange={(e) => handleClassFilter(e.target.value)}
        >
          <option value="">Tất cả lớp</option>
          {classes.map((cls) => (
            <option key={cls._id || cls.id} value={cls._id || cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Tìm tên, email, mã HS..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => handleSearchChange('')}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {studentsError && <div className={styles.errorBanner}>{studentsError}</div>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Email</th>
              <th>Mã HS</th>
              <th>Lớp</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {studentsLoading && students.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={styles.skeletonRow}>
                  <td><span className={styles.skeleton} style={{ width: '160px', height: '16px' }} /></td>
                  <td><span className={styles.skeleton} style={{ width: '200px', height: '16px' }} /></td>
                  <td><span className={styles.skeleton} style={{ width: '80px', height: '16px' }} /></td>
                  <td><span className={styles.skeleton} style={{ width: '80px', height: '22px' }} /></td>
                  <td></td>
                </tr>
              ))
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>
                  <Users size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p>Chưa có học sinh nào.</p>
                  <button className={styles.linkBtn} onClick={openCreate}>Thêm Học sinh đầu tiên</button>
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student._id || student.id}>
                  <td className={styles.nameCell}>
                    <div className={styles.studentName}>{student.name}</div>
                  </td>
                  <td className={styles.emailCell}>{student.email}</td>
                  <td>
                    {student.studentCode ? (
                      <code className={styles.codeTag}>{student.studentCode}</code>
                    ) : (
                      <span className={styles.metaCell}>—</span>
                    )}
                  </td>
                  <td>
                    {student.classId ? (
                      <span className={styles.classBadge}>{getClassName(student.classId) || student.className || '—'}</span>
                    ) : (
                      <span className={styles.metaCell}>—</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.iconBtn}
                        onClick={() => openEdit(student)}
                        title="Sửa"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        className={`${styles.iconBtn} ${styles.danger}`}
                        onClick={() => setDeleteTarget(student)}
                        title="Xóa"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          {pageNumbers.map((p) => (
            <button
              key={p}
              className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
              onClick={() => handlePageChange(p)}
            >
              {p}
            </button>
          ))}
          <button
            className={styles.pageBtn}
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {modalOpen && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editStudent ? 'Chỉnh Sửa Học Sinh' : 'Thêm Học Sinh'}
              </h2>
              <button className={styles.modalClose} onClick={closeModal}>
                <X size={18} />
              </button>
            </div>
            <form className={styles.modalForm} onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <label className={styles.label}>
                    Tên <span className={styles.required}>*</span>
                  </label>
                  <input
                    className={styles.input}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="VD: Nguyễn Văn A"
                  />
                </div>
                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <label className={styles.label}>
                    Email <span className={styles.required}>*</span>
                  </label>
                  <input
                    className={styles.input}
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="VD: nguyenvana@email.com"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Mã học sinh</label>
                  <input
                    className={styles.input}
                    value={formData.studentCode}
                    onChange={(e) => setFormData({ ...formData, studentCode: e.target.value.toUpperCase() })}
                    placeholder="VD: HS001"
                    maxLength={20}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Lớp</label>
                  <select
                    className={styles.input}
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  >
                    <option value="">Chưa phân lớp</option>
                    {classes.map((cls) => (
                      <option key={cls._id || cls.id} value={cls._id || cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {formError && <div className={styles.formError}>{formError}</div>}
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={closeModal}>
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Đang lưu...' : editStudent ? 'Lưu thay đổi' : 'Tạo Học sinh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className={styles.confirmModal}>
            <h3 className={styles.confirmTitle}>Xóa Học Sinh?</h3>
            <p className={styles.confirmText}>
              Bạn có chắc muốn xóa <strong>{deleteTarget.name}</strong>? Hành động này không thể hoàn tác.
            </p>
            {formError && <div className={styles.formError}>{formError}</div>}
            <div className={styles.confirmFooter}>
              <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)}>
                Hủy bỏ
              </button>
              <button
                className={`${styles.submitBtn} ${styles.danger}`}
                onClick={handleDelete}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
