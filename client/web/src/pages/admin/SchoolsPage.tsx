import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAdminStore, type School } from '../../presentation/store/adminStore';
import styles from './SchoolsPage.module.css';

interface SchoolFormData {
  name: string;
  code: string;
  type: string;
  address: string;
  phone: string;
  email: string;
  principal: string;
  gradingScale: number;
  passingScore: number;
  gradeLevelsMin: number;
  gradeLevelsMax: number;
}

const EMPTY_FORM: SchoolFormData = {
  name: '',
  code: '',
  type: 'THPT',
  address: '',
  phone: '',
  email: '',
  principal: '',
  gradingScale: 10,
  passingScore: 5,
  gradeLevelsMin: 1,
  gradeLevelsMax: 12,
};

const SCHOOL_TYPES = ['THPT', 'THCS', 'TH', 'Mầm non'];

export default function SchoolsPage() {
  const {
    schools, schoolsPagination, schoolsLoading, schoolsError,
    fetchSchools, createSchool, updateSchool, deleteSchool,
  } = useAdminStore();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSchool, setEditSchool] = useState<School | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);
  const [formData, setFormData] = useState<SchoolFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback((s = search, t = typeFilter, p = page) => {
    fetchSchools({ search: s || undefined, type: t || undefined, page: p, limit: 10 });
  }, [fetchSchools, search, typeFilter, page]);

  useEffect(() => { load(); }, []);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => load(val, typeFilter, 1), 300);
  };

  const handleTypeFilter = (val: string) => {
    setTypeFilter(val);
    setPage(1);
    load(search, val, 1);
  };

  const handlePageChange = (newPage: number) => { setPage(newPage); load(search, typeFilter, newPage); };

  const openCreate = () => { setFormData(EMPTY_FORM); setFormError(''); setEditSchool(null); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditSchool(null); setFormError(''); };

  const openEdit = (school: School) => {
    setFormData({
      name: school.name,
      code: school.code,
      type: school.type || 'THPT',
      address: school.address || '',
      phone: school.phone || '',
      email: school.email || '',
      principal: school.principal || '',
      gradingScale: school.gradingScale ?? 10,
      passingScore: school.passingScore ?? 5,
      gradeLevelsMin: school.gradeLevels?.min ?? 1,
      gradeLevelsMax: school.gradeLevels?.max ?? 12,
    });
    setFormError('');
    setEditSchool(school);
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
        type: formData.type,
        address: formData.address.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        principal: formData.principal.trim() || undefined,
        gradingScale: formData.gradingScale,
        passingScore: formData.passingScore,
        gradeLevels: { min: formData.gradeLevelsMin, max: formData.gradeLevelsMax },
      };
      if (editSchool) {
        await updateSchool((editSchool._id || editSchool.id)!, payload);
      } else {
        await createSchool(payload);
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
      await deleteSchool((deleteTarget._id || deleteTarget.id)!);
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      setFormError(err.message || 'Xóa thất bại.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const totalPages = schoolsPagination.pages || 1;
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
          <h1 className={styles.title}>Quản lý Trường học</h1>
          <p className={styles.subtitle}>Thêm, sửa, xóa trường học trong hệ thống</p>
        </div>
        <button className={styles.primaryBtn} onClick={openCreate}>
          <Plus size={16} /> Thêm Trường
        </button>
      </div>

      <div className={styles.filters}>
        <select className={styles.select} value={typeFilter} onChange={(e) => handleTypeFilter(e.target.value)}>
          <option value="">Tất cả loại</option>
          {SCHOOL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Tìm tên trường..." value={search} onChange={(e) => handleSearchChange(e.target.value)} />
          {search && <button className={styles.clearSearch} onClick={() => handleSearchChange('')}><X size={14} /></button>}
        </div>
      </div>

      {schoolsError && <div className={styles.errorBanner}>{schoolsError}</div>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tên trường</th><th>Mã</th><th>Loại</th><th>Địa chỉ</th><th>Hiệu trưởng</th><th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {schoolsLoading && schools.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={styles.skeletonRow}>
                  <td><span className={styles.skeleton} style={{ width: '160px', height: '16px' }} /></td>
                  <td><span className={styles.skeleton} style={{ width: '50px', height: '16px' }} /></td>
                  <td><span className={styles.skeleton} style={{ width: '60px', height: '22px' }} /></td>
                  <td><span className={styles.skeleton} style={{ width: '120px', height: '16px' }} /></td>
                  <td><span className={styles.skeleton} style={{ width: '100px', height: '16px' }} /></td>
                  <td></td>
                </tr>
              ))
            ) : schools.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>
                  <Building2 size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p>Chưa có trường học nào.</p>
                  <button className={styles.linkBtn} onClick={openCreate}>Thêm Trường đầu tiên</button>
                </td>
              </tr>
            ) : (
              schools.map((school) => (
                <tr key={school._id || school.id}>
                  <td className={styles.nameCell}><div className={styles.schoolName}>{school.name}</div></td>
                  <td><code className={styles.codeTag}>{school.code}</code></td>
                  <td><span className={styles.typeBadge}>{school.type || '—'}</span></td>
                  <td className={styles.metaCell}>{school.address || '—'}</td>
                  <td className={styles.metaCell}>{school.principal || '—'}</td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.iconBtn} onClick={() => openEdit(school)} title="Sửa"><Edit2 size={15} /></button>
                      <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => setDeleteTarget(school)} title="Xóa"><Trash2 size={15} /></button>
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
          <button className={styles.pageBtn} disabled={page <= 1} onClick={() => handlePageChange(page - 1)}><ChevronLeft size={16} /></button>
          {pageNumbers.map((p) => (
            <button key={p} className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`} onClick={() => handlePageChange(p)}>{p}</button>
          ))}
          <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}><ChevronRight size={16} /></button>
        </div>
      )}

      {modalOpen && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editSchool ? 'Chỉnh Sửa Trường Học' : 'Thêm Trường Học'}</h2>
              <button className={styles.modalClose} onClick={closeModal}><X size={18} /></button>
            </div>
            <form className={styles.modalForm} onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.label}>Tên trường <span className={styles.required}>*</span></label>
                  <input className={styles.input} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="VD: THPT Nguyễn Huệ" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Mã trường <span className={styles.required}>*</span></label>
                  <input className={styles.input} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} required placeholder="VD: NHTH" maxLength={10} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Loại trường</label>
                  <select className={styles.input} value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                    {SCHOOL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.label}>Địa chỉ</label>
                  <input className={styles.input} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="VD: 123 Đường ABC, Q.1, TP.HCM" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Số điện thoại</label>
                  <input className={styles.input} type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="VD: 02812345678" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Email</label>
                  <input className={styles.input} type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="VD: contact@school.edu.vn" />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.label}>Hiệu trưởng</label>
                  <input className={styles.input} value={formData.principal} onChange={(e) => setFormData({ ...formData, principal: e.target.value })} placeholder="VD: Nguyễn Văn A" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Thang điểm</label>
                  <input className={styles.input} type="number" value={formData.gradingScale} onChange={(e) => setFormData({ ...formData, gradingScale: Number(e.target.value) })} min={1} max={100} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Điểm đạt</label>
                  <input className={styles.input} type="number" value={formData.passingScore} onChange={(e) => setFormData({ ...formData, passingScore: Number(e.target.value) })} min={0} max={formData.gradingScale} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Số khối (từ)</label>
                  <input className={styles.input} type="number" value={formData.gradeLevelsMin} onChange={(e) => setFormData({ ...formData, gradeLevelsMin: Number(e.target.value) })} min={0} max={12} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Số khối (đến)</label>
                  <input className={styles.input} type="number" value={formData.gradeLevelsMax} onChange={(e) => setFormData({ ...formData, gradeLevelsMax: Number(e.target.value) })} min={0} max={12} />
                </div>
              </div>
              {formError && <div className={styles.formError}>{formError}</div>}
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={closeModal}>Hủy bỏ</button>
                <button type="submit" className={styles.submitBtn} disabled={formSubmitting}>
                  {formSubmitting ? 'Đang lưu...' : editSchool ? 'Lưu thay đổi' : 'Tạo Trường'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className={styles.confirmModal}>
            <h3 className={styles.confirmTitle}>Xóa Trường Học?</h3>
            <p className={styles.confirmText}>Bạn có chắc muốn xóa <strong>{deleteTarget.name}</strong>? Hành động này không thể hoàn tác.</p>
            {formError && <div className={styles.formError}>{formError}</div>}
            <div className={styles.confirmFooter}>
              <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)}>Hủy bỏ</button>
              <button className={`${styles.submitBtn} ${styles.danger}`} onClick={handleDelete} disabled={deleteSubmitting}>
                {deleteSubmitting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
