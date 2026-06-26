import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSchoolStore, type SchoolClass } from '../../presentation/store/schoolStore';
import styles from './ClassesPage.module.css';

interface ClassFormData {
  name: string;
  code: string;
  gradeLevel: number;
}

const EMPTY_FORM: ClassFormData = {
  name: '',
  code: '',
  gradeLevel: 10,
};

const GRADE_LEVELS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function ClassesPage() {
  const {
    classes, classesPagination, classesLoading, classesError,
    fetchClasses, createClass, updateClass, deleteClass,
  } = useSchoolStore();

  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editClass, setEditClass] = useState<SchoolClass | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchoolClass | null>(null);
  const [formData, setFormData] = useState<ClassFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback((s = search, g = gradeFilter, p = page) => {
    fetchClasses({
      search: s || undefined,
      ...(g ? { schoolId: g } : {}),
      page: p,
      limit: 10,
    });
  }, [fetchClasses, search, gradeFilter, page]);

  useEffect(() => { load(); }, []);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => load(val, gradeFilter, 1), 300);
  };

  const handleGradeFilter = (val: string) => {
    setGradeFilter(val);
    setPage(1);
    load(search, val, 1);
  };

  const handlePageChange = (newPage: number) => { setPage(newPage); load(search, gradeFilter, newPage); };

  const openCreate = () => { setFormData(EMPTY_FORM); setFormError(''); setEditClass(null); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditClass(null); setFormError(''); };

  const openEdit = (cls: SchoolClass) => {
    setFormData({
      name: cls.name,
      code: cls.code,
      gradeLevel: cls.gradeLevel ?? 10,
    });
    setFormError('');
    setEditClass(cls);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        gradeLevel: formData.gradeLevel,
      };
      if (editClass) {
        await updateClass((editClass._id || editClass.id)!, payload);
      } else {
        await createClass(payload);
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
      await deleteClass((deleteTarget._id || deleteTarget.id)!);
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      setFormError(err.message || 'Xóa thất bại.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const totalPages = classesPagination.pages || 1;
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
          <h1 className={styles.title}>Quản lý Lớp học</h1>
          <p className={styles.subtitle}>Thêm, sửa, xóa lớp học trong hệ thống</p>
        </div>
        <button className={styles.primaryBtn} onClick={openCreate}>
          <Plus size={16} /> Thêm Lớp
        </button>
      </div>

      <div className={styles.filters}>
        <select
          className={styles.select}
          value={gradeFilter}
          onChange={(e) => handleGradeFilter(e.target.value)}
        >
          <option value="">Tất cả khối</option>
          {GRADE_LEVELS.map((g) => (
            <option key={g} value={g}>Khối {g}</option>
          ))}
        </select>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Tìm tên lớp..."
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

      {classesError && <div className={styles.errorBanner}>{classesError}</div>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tên lớp</th>
              <th>Mã lớp</th>
              <th>Khối</th>
              <th>Sĩ số</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {classesLoading && classes.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={styles.skeletonRow}>
                  <td><span className={styles.skeleton} style={{ width: '160px', height: '16px' }} /></td>
                  <td><span className={styles.skeleton} style={{ width: '60px', height: '16px' }} /></td>
                  <td><span className={styles.skeleton} style={{ width: '50px', height: '22px' }} /></td>
                  <td><span className={styles.skeleton} style={{ width: '40px', height: '16px' }} /></td>
                  <td></td>
                </tr>
              ))
            ) : classes.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>
                  <Users size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p>Chưa có lớp học nào.</p>
                  <button className={styles.linkBtn} onClick={openCreate}>Thêm Lớp đầu tiên</button>
                </td>
              </tr>
            ) : (
              classes.map((cls) => (
                <tr key={cls._id || cls.id}>
                  <td className={styles.nameCell}>
                    <div className={styles.className}>{cls.name}</div>
                  </td>
                  <td><code className={styles.codeTag}>{cls.code}</code></td>
                  <td>
                    <span className={styles.gradeBadge}>
                      {cls.gradeLevel ? `Khối ${cls.gradeLevel}` : '—'}
                    </span>
                  </td>
                  <td className={styles.metaCell}>{cls.studentCount ?? 0}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.iconBtn}
                        onClick={() => openEdit(cls)}
                        title="Sửa"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        className={`${styles.iconBtn} ${styles.danger}`}
                        onClick={() => setDeleteTarget(cls)}
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
                {editClass ? 'Chỉnh Sửa Lớp Học' : 'Thêm Lớp Học'}
              </h2>
              <button className={styles.modalClose} onClick={closeModal}>
                <X size={18} />
              </button>
            </div>
            <form className={styles.modalForm} onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <label className={styles.label}>
                    Tên lớp <span className={styles.required}>*</span>
                  </label>
                  <input
                    className={styles.input}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="VD: 10A1"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Mã lớp <span className={styles.required}>*</span>
                  </label>
                  <input
                    className={styles.input}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                    placeholder="VD: 10A1"
                    maxLength={10}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Khối <span className={styles.required}>*</span>
                  </label>
                  <select
                    className={styles.input}
                    value={formData.gradeLevel}
                    onChange={(e) => setFormData({ ...formData, gradeLevel: Number(e.target.value) })}
                  >
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>Khối {g}</option>
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
                  {formSubmitting ? 'Đang lưu...' : editClass ? 'Lưu thay đổi' : 'Tạo Lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className={styles.confirmModal}>
            <h3 className={styles.confirmTitle}>Xóa Lớp Học?</h3>
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
