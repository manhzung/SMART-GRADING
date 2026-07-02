import { useEffect, useState } from 'react';
import { Check, X, Clock, Mail, User } from 'lucide-react';
import { useAuthStore } from '../presentation/store/authStore';
import { useNavigate } from 'react-router-dom';
import { useApprovalStore } from '../presentation/store/approvalStore';
import ConfirmDialog from '../presentation/components/shared/ConfirmDialog';
import styles from './ApprovalPage.module.css';

export default function ApprovalPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const {
    pendingTeachers,
    isLoadingTeachers,
    pendingTeachersCount,
    fetchPendingTeachers,
    approveTeacher,
    rejectTeacher,
  } = useApprovalStore();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'school-admin') {
      navigate('/', { replace: true });
      return;
    }
    fetchPendingTeachers();
  }, [user, navigate, fetchPendingTeachers]);

  const handleApproveTeacher = async (teacherId: string) => {
    setProcessing(true);
    try {
      await approveTeacher(teacherId);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectTeacherClick = (teacherId: string) => {
    setSelectedId(teacherId);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedId) return;
    setProcessing(true);
    try {
      await rejectTeacher(selectedId, rejectReason);
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedId(null);
    } finally {
      setProcessing(false);
    }
  };

  const renderTeachersTab = () => {
    if (isLoadingTeachers) {
      return <div className={styles.loading}>Loading...</div>;
    }

    if (pendingTeachers.length === 0) {
      return (
        <div className={styles.empty}>
          <Clock size={48} />
          <p>No teachers pending approval</p>
        </div>
      );
    }

    return (
      <div className={styles.list}>
        {pendingTeachers.map((teacher) => (
          <div key={teacher.id || teacher._id} className={styles.teacherCard}>
            <div className={styles.teacherAvatar}>
              <User size={32} />
            </div>
            <div className={styles.teacherInfo}>
              <h4>{teacher.name}</h4>
              <p>
                <Mail size={14} /> {teacher.email}
              </p>
            </div>
            <div className={styles.teacherActions}>
              <button
                className={styles.btnApprove}
                onClick={() => handleApproveTeacher(teacher.id || teacher._id)}
                disabled={processing}
              >
                <Check size={16} />
                Approve
              </button>
              <button
                className={styles.btnReject}
                onClick={() => handleRejectTeacherClick(teacher.id || teacher._id)}
                disabled={processing}
              >
                <X size={16} />
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Approval</h1>
        {pendingTeachersCount > 0 && (
          <span className={styles.badge}>{pendingTeachersCount} pending</span>
        )}
      </div>

      <div className={styles.content}>
        {renderTeachersTab()}
      </div>

      <ConfirmDialog
        open={rejectDialogOpen}
        title="Reject Teacher"
        message="Are you sure you want to reject this teacher?"
        confirmLabel="Reject"
        cancelLabel="Cancel"
        danger
        submitting={processing}
        onConfirm={handleRejectConfirm}
        onCancel={() => {
          setRejectDialogOpen(false);
          setRejectReason('');
          setSelectedId(null);
        }}
      >
        <div className={styles.rejectForm}>
          <label>Reason for rejection (optional):</label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter reason for rejection..."
            rows={3}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
