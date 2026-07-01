import { useEffect, useState } from 'react';
import { Building2, Mail, Phone, MapPin, User, Users, Trash2, Plus } from 'lucide-react';
import Modal from '../shared/Modal';
import ConfirmDialog from '../shared/ConfirmDialog';
import { useSchoolManagementStore } from '../../store/schoolManagementStore';
import { useApprovalStore } from '../../store/approvalStore';
import AddSchoolAdminModal from './AddSchoolAdminModal';
import type { School } from '../../../types';
import styles from './SchoolDetailModal.module.css';
import { toast } from 'sonner';

interface SchoolDetailModalProps {
  open: boolean;
  school: School | null;
  onClose: () => void;
}

// ── Sub-component: PendingTeachersSection ──────────────────────────────────────

interface PendingTeachersSectionProps {
  schoolId: string;
}

const PendingTeachersSection: React.FC<PendingTeachersSectionProps> = ({ schoolId }) => {
  const {
    adminPendingTeachers,
    adminPendingTeachersCount,
    isLoadingAdminTeachers,
    fetchAdminPendingTeachers,
    adminApproveTeacher: storeApprove,
    adminRejectTeacher: storeReject,
  } = useApprovalStore();

  useEffect(() => {
    if (schoolId) {
      fetchAdminPendingTeachers(schoolId);
    }
  }, [schoolId, fetchAdminPendingTeachers]);

  const handleApprove = async (userId: string) => {
    try {
      await storeApprove(userId);
      toast.success('Đã duyệt giáo viên thành công');
    } catch {
      toast.error('Duyệt giáo viên thất bại');
    }
  };

  const handleReject = async (userId: string) => {
    const reason = window.prompt('Lý do từ chối (tuỳ chọn):') || undefined;
    try {
      await storeReject(userId, reason);
      toast.success('Đã từ chối giáo viên');
    } catch {
      toast.error('Từ chối giáo viên thất bại');
    }
  };

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <h3><Users size={18} /> Giáo viên chờ duyệt</h3>
        {adminPendingTeachersCount > 0 && (
          <span className={styles.badge}>{adminPendingTeachersCount} pending</span>
        )}
      </header>

      {isLoadingAdminTeachers ? (
        <div className={styles.loadingState}>
          <span className={styles.spinner} />
          <span>Đang tải...</span>
        </div>
      ) : adminPendingTeachers.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Không có giáo viên nào đang chờ duyệt.</p>
        </div>
      ) : (
        <div className={styles.teacherList}>
          {adminPendingTeachers.map((teacher) => (
            <div key={teacher._id || teacher.id} className={styles.teacherCard}>
              <div className={styles.teacherAvatar}>
                {teacher.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className={styles.teacherInfo}>
                <div className={styles.teacherName}>{teacher.name}</div>
                <div className={styles.teacherEmail}>
                  <Mail size={12} /> {teacher.email}
                </div>
                {teacher.createdAt && (
                  <div className={styles.teacherDate}>
                    Đăng ký: {new Date(teacher.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                )}
              </div>
              <div className={styles.teacherActions}>
                <button
                  type="button"
                  className={styles.btnApprove}
                  onClick={() => handleApprove(teacher._id || teacher.id)}
                >
                  Duyệt
                </button>
                <button
                  type="button"
                  className={styles.btnReject}
                  onClick={() => handleReject(teacher._id || teacher.id)}
                >
                  Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

// ── Main modal component ────────────────────────────────────────────────────────

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
      <Modal open={open} title="School Details" size="lg" onClose={onClose}>
        <div className={styles.content}>
          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h3><Building2 size={18} /> General Information</h3>
            </header>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>School Name</span>
                <span className={styles.value}><strong>{school.name}</strong></span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>School Code</span>
                <span className={styles.value}>{school.code || '—'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}><User size={14} /> Principal</span>
                <span className={styles.value}>{school.principalName || '—'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}><MapPin size={14} /> Address</span>
                <span className={styles.value}>{addrText || '—'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}><Phone size={14} /> Phone</span>
                <span className={styles.value}>{school.phone || '—'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}><Mail size={14} /> Email</span>
                <span className={styles.value}>{school.email || '—'}</span>
              </div>
            </div>
          </section>

          {school?._id && (
            <PendingTeachersSection schoolId={school._id} />
          )}

          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h3><Users size={18} /> School Admin ({schoolAdmins.length})</h3>
              <button
                type="button"
                className={styles.btnAddAdmin}
                onClick={() => setShowAddAdmin(true)}
              >
                <Plus size={16} /> Add Admin
              </button>
            </header>

            {schoolAdmins.length === 0 ? (
              <div className={styles.empty}>
                <Users size={32} />
                <p>No School Admins for this school yet</p>
                <button
                  type="button"
                  className={styles.btnAddAdmin}
                  onClick={() => setShowAddAdmin(true)}
                >
                  <Plus size={16} /> Add First School Admin
                </button>
              </div>
            ) : (
              <div className={styles.adminsTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Status</th>
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
                            {admin.isActive ? 'Active' : 'Locked'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.btnRemove}
                            title="Remove from school"
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
        title="Remove School Admin"
        message={`Are you sure you want to remove "${confirmRemove?.name}" from this school?`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        danger
        submitting={removing}
        onConfirm={handleRemoveAdmin}
        onCancel={() => setConfirmRemove(null)}
      />
    </>
  );
}

export { PendingTeachersSection };
