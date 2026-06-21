import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, Users as UsersIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAdminStore, type AdminUser } from '../../presentation/store/adminStore';
import { useAuthStore } from '../../presentation/store/authStore';
import styles from './UsersPage.module.css';

interface UserFormData {
  name: string;
  email: string;
  role: string;
  schoolId: string;
  classId: string;
  studentCode: string;
  phone: string;
}

const EMPTY_FORM: UserFormData = {
  name: '', email: '', role: 'teacher', schoolId: '', classId: '', studentCode: '', phone: '',
};

const ROLES = [
  { value: 'admin', label: 'Quản trị viên' },
  { value: 'school-admin', label: 'Quản trị trường' },
  { value: 'teacher', label: 'Giáo viên' },
  { value: 'student', label: 'Học sinh' },
  { value: 'parent', label: 'Phụ huynh' },
];

export default function UsersPage() {
  const userRole = useAuthStore((state) => state.user?.role);
  const userSchoolId = useAuthStore((state) => state.user?.schoolId);
  const {
    users, usersPagination, usersLoading, usersError,
    schoolsList, fetchSchoolsList,
    classes, classesLoading, fetchClasses,
    createUser, updateUser, deleteUser,
  } = useAdminStore();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState<UserFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  const isSuperAdmin = userRole === 'admin';
  const isSchoolAdmin = userRole === 'school-admin';

  const load = useCallback((s = search, r = roleFilter, p = page) => {
    fetchUsers({
      search: s || undefined,
      role: r || undefined,
      schoolId: isSchoolAdmin ? userSchoolId : undefined,
      page: p,
      limit: 10,
    });
  }, [fetchUsers, search, roleFilter, page, isSchoolAdmin, userSchoolId]);

  const fetchUsers = useAdminStore((state) => state.fetchUsers);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchSchoolsList({ limit: 500 });
    }
    load();
  }, []);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => load(val, roleFilter, 1), 300);
  };

  const handleRoleFilter = (val: string) => { setRoleFilter(val); setPage(1); load(search, val, 1); };
  const handlePageChange = (newPage: number) => { setPage(newPage); load(search, roleFilter, newPage); };

  const handleSchoolChange = (schoolId: string) => {
    setFormData({ ...formData, schoolId, classId: '' });
    if (schoolId) fetchClasses(schoolId);
  };

  const openCreate = () => {
    setFormData({ ...EMPTY_FORM, schoolId: isSchoolAdmin ? (userSchoolId || '') : '' });
    setFormError('');
    setEditUser(null);
    setModalOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setFormData({
      name: user.name, email: user.email, role: user.role,
      schoolId: user.schoolId || '', classId: user.classId || '',
      studentCode: user.studentCode || '', phone: user.phone || '',
    });
    setFormError('');
    setEditUser(user);
    if (user.schoolId) fetchClasses(user.schoolId);
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditUser(null); setFormError(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);
    try {
      if (isSchoolAdmin && formData.role === 'admin') {
        throw new Error('Bạn không có quyền tạo Quản trị viên hệ thống.');
      }
      const payload: Record<string, string> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
      };
      if (formData.schoolId) payload['schoolId'] = formData.schoolId;
      if (formData.classId) payload['classId'] = formData.classId;
      if (formData.studentCode) payload['studentCode'] = formData.studentCode.trim();
      if (formData.phone) payload['phone'] = formData.phone.trim();
      if (!editUser) payload['password'] = 'TempPass123!';

      if (editUser) {
        await updateUser((editUser._id || editUser.id)!, payload);
      } else {
        await createUser(payload);
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
      await deleteUser((deleteTarget._id || deleteTarget.id)!);
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      setFormError(err.message || 'Xóa thất bại.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const showSchoolField = !isSchoolAdmin || formData.role !== 'admin';
  const showClassField = formData.role === 'student';

  const totalPages = usersPagination.pages || 1;
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
          <h1 className={styles.title}>Quản lý Người dùng</h1>
          <p className={styles.subtitle}>
            {isSchoolAdmin ? 'Thêm, sửa, xóa người dùng trong trường của bạn' : 'Thêm, sửa, xóa người dùng trong hệ thống'}
          </p>
        </div>
        <button className={styles.primaryBtn} onClick={openCreate}>
          <Plus size={16} /> Thêm Người Dùng
        </button>
      </div>

      <div className={styles.filters}>
        <select className={styles.select} value={roleFilter} onChange={(e) => handleRoleFilter(e.target.value)}>
          <option value="">Tất cả vai trò</option>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Tìm tên, email, mã SV..." value={search} onChange={(e) => handleSearchChange(e.target.value)} />
          {search && <button className={styles.clearSearch} onClick={() => handleSearchChange('')}><X size={14} /></button>}
        </div>
      </div>

      {usersError && <div className={styles.errorBanner}>{usersError}</div>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Họ tên</th><th>Email</th><th>Vai trò</th>
              {isSuperAdmin && <th>Trường</th>}
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {usersLoading && users.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={styles.skeletonRow}>
                  <td><span className={styles.skeleton} style={{ width: '140px', height: '16px' }} /></td>
                  <td><span className={styles.skeleton} style={{ width: '160px', height: '16px' }} /></td>
                  <td><span className={styles.skeleton} style={{ width: '70px', height: '22px' }} /></td>
                  {isSuperAdmin && <td><span className={styles.skeleton} style={{ width: '100px', height: '16px' }} /></td>}
                  <td></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={isSuperAdmin ? 5 : 4} className={styles.emptyRow}>
                  <UsersIcon size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p>Chưa có người dùng nào.</p>
                  <button className={styles.linkBtn} onClick={openCreate}>Thêm người dùng đầu tiên</button>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id || user.id}>
                  <td className={styles.nameCell}>
                    <div className={styles.userName}>{user.name}</div>
                    {user.studentCode && <div className={styles.studentCode}>{user.studentCode}</div>}
                  </td>
                  <td className={styles.metaCell}>{user.email}</td>
                  <td><span className={styles.roleBadge} data-role={user.role}>{getRoleLabel(user.role)}</span></td>
                  {isSuperAdmin && <td className={styles.metaCell}>{user.schoolName || user.schoolId || '—'}</td>}
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.iconBtn} onClick={() => openEdit(user)} title="Sửa"><Edit2 size={15} /></button>
                      <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => setDeleteTarget(user)} title="Xóa"><Trash2 size={15} /></button>
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
              <h2 className={styles.modalTitle}>{editUser ? 'Chỉnh Sửa Người Dùng' : 'Thêm Người Dùng'}</h2>
              <button className={styles.modalClose} onClick={closeModal}><X size={18} /></button>
            </div>
            <form className={styles.modalForm} onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.label}>Họ tên <span className={styles.required}>*</span></label>
                  <input className={styles.input} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="VD: Nguyễn Văn A" />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.label}>Email <span className={styles.required}>*</span></label>
                  <input className={styles.input} type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required placeholder="VD: user@school.edu.vn" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Vai trò <span className={styles.required}>*</span></label>
                  <select className={styles.input} value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value, classId: e.target.value !== 'student' ? '' : formData.classId })}>
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value} disabled={isSchoolAdmin && r.value === 'admin' && !isSuperAdmin}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Số điện thoại</label>
                  <input className={styles.input} type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="VD: 0912345678" />
                </div>
                {showSchoolField && isSuperAdmin && (
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.label}>Trường học {!isSchoolAdmin && <span className={styles.required}>*</span>}</label>
                    <select className={styles.input} value={formData.schoolId} onChange={(e) => handleSchoolChange(e.target.value)} required={!isSchoolAdmin}>
                      <option value="">Chọn trường học</option>
                      {schoolsList.map((s) => <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
                {showClassField && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Lớp học</label>
                    <select className={styles.input} value={formData.classId} onChange={(e) => setFormData({ ...formData, classId: e.target.value })} disabled={classesLoading || !formData.schoolId}>
                      <option value="">Chọn lớp học</option>
                      {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                {showClassField && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Mã học sinh</label>
                    <input className={styles.input} value={formData.studentCode} onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })} placeholder="VD: HS2024001" />
                  </div>
                )}
              </div>
              {!editUser && <p className={styles.passwordNote}>Mật khẩu tạm sẽ được gửi qua email cho người dùng mới.</p>}
              {formError && <div className={styles.formError}>{formError}</div>}
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={closeModal}>Hủy bỏ</button>
                <button type="submit" className={styles.submitBtn} disabled={formSubmitting}>
                  {formSubmitting ? 'Đang lưu...' : editUser ? 'Lưu thay đổi' : 'Tạo Người Dùng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className={styles.confirmModal}>
            <h3 className={styles.confirmTitle}>Xóa Người Dùng?</h3>
            <p className={styles.confirmText}>Bạn có chắc muốn xóa <strong>{deleteTarget.name}</strong> ({deleteTarget.email})? Hành động này không thể hoàn tác.</p>
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

function getRoleLabel(role: string): string {
  return ROLES.find((r) => r.value === role)?.label || role;
}
