import { useEffect, useState } from 'react';
import { Building2, Mail, Phone, MapPin, User, Users, Trash2, Plus } from 'lucide-react';
import Modal from '../shared/Modal';
import ConfirmDialog from '../shared/ConfirmDialog';
import { useSchoolManagementStore } from '../../store/schoolManagementStore';
import AddSchoolAdminModal from './AddSchoolAdminModal';
import type { School } from '../../../types';
import styles from './SchoolDetailModal.module.css';

interface SchoolDetailModalProps {
  open: boolean;
  school: School | null;
  onClose: () => void;
}

export default function SchoolDetailModal({ open, school, onClose }: SchoolDetailModalProps) {
  const {
    schoolAdmins,
    fetchSchoolAdmins,
    removeSchoolAdmin,
  } = useSchoolManagementStore();

  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);

  useEffect(() => {
    if (open && school) {
      fetchSchoolAdmins(school._id);
    }
  }, [open, school, fetchSchoolAdmins]);

  if (!school) return null;

  const addr =
    typeof school.address === 'object' && school.address !== null
      ? school.address
      : null;
  const addrText = addr
    ? [addr.street, addr.ward, addr.district, addr.city].filter(Boolean).join(', ')
    : typeof school.address === 'string'
      ? school.address
      : null;

  const handleRemoveAdmin = async () => {
    if (!confirmRemove) return;
    setRemoving(true);
    try {
      await removeSchoolAdmin(school._id, confirmRemove.id);
      setConfirmRemove(null);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <Modal open={open} title="Chi tiết trường học" size="lg" onClose={onClose}>
        <div className={styles.content}>
          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h3><Building2 size={18} /> Thông tin chung</h3>
            </header>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Tên trường</span>
                <span className={styles.value}><strong>{school.name}</strong></span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Mã trường</span>
                <span className={styles.value}>{school.code || '—'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}><User size={14} /> Hiệu trưởng</span>
                <span className={styles.value}>{school.principalName || '—'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}><MapPin size={14} /> Địa chỉ</span>
                <span className={styles.value}>{addrText || '—'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}><Phone size={14} /> Số điện thoại</span>
                <span className={styles.value}>{school.phone || '—'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}><Mail size={14} /> Email</span>
                <span className={styles.value}>{school.email || '—'}</span>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h3><Users size={18} /> School Admin ({schoolAdmins.length})</h3>
              <button
                type="button"
                className={styles.btnAddAdmin}
                onClick={() => setShowAddAdmin(true)}
              >
                <Plus size={16} /> Thêm Admin
              </button>
            </header>

            {schoolAdmins.length === 0 ? (
              <div className={styles.empty}>
                <Users size={32} />
                <p>Chưa có School Admin nào cho trường này</p>
                <button
                  type="button"
                  className={styles.btnAddAdmin}
                  onClick={() => setShowAddAdmin(true)}
                >
                  <Plus size={16} /> Thêm School Admin đầu tiên
                </button>
              </div>
            ) : (
              <div className={styles.adminsTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Họ tên</th>
                      <th>Email</th>
                      <th>Trạng thái</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {schoolAdmins.map((admin) => (
                      <tr key={admin._id || admin.id}>
                        <td>{admin.name}</td>
                        <td>{admin.email}</td>
                        <td>
                          <span
                            className={`${styles.statusPill} ${admin.isActive ? styles.active : styles.inactive}`}
                          >
                            {admin.isActive ? 'Hoạt động' : 'Khóa'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.btnRemove}
                            title="Xóa khỏi trường"
                            onClick={() =>
                              setConfirmRemove({ id: admin._id || admin.id, name: admin.name })
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </Modal>

      <AddSchoolAdminModal
        open={showAddAdmin}
        schoolId={school._id}
        existingAdminIds={schoolAdmins.map((a) => a._id || a.id)}
        onClose={() => setShowAddAdmin(false)}
      />

      <ConfirmDialog
        open={!!confirmRemove}
        title="Xóa School Admin"
        message={`Bạn có chắc chắn muốn xóa "${confirmRemove?.name}" khỏi trường này?`}
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        danger
        submitting={removing}
        onConfirm={handleRemoveAdmin}
        onCancel={() => setConfirmRemove(null)}
      />
    </>
  );
}
