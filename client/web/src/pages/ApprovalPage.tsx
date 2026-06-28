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
    pendingQuestions,
    pendingTeachers,
    isLoadingQuestions,
    isLoadingTeachers,
    pendingQuestionsCount,
    pendingTeachersCount,
    fetchPendingQuestions,
    fetchPendingTeachers,
    approveQuestion,
    rejectQuestion,
    approveTeacher,
    rejectTeacher,
  } = useApprovalStore();

  const [activeTab, setActiveTab] = useState<'questions' | 'teachers'>('questions');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectType, setRejectType] = useState<'question' | 'teacher'>('question');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'school-admin') {
      navigate('/', { replace: true });
      return;
    }
    fetchPendingQuestions();
    fetchPendingTeachers();
  }, [user, navigate, fetchPendingQuestions, fetchPendingTeachers]);

  const totalPending = pendingQuestionsCount + pendingTeachersCount;

  const handleApproveQuestion = async (questionId: string) => {
    setProcessing(true);
    try {
      await approveQuestion(questionId);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectQuestionClick = (questionId: string) => {
    setSelectedId(questionId);
    setRejectType('question');
    setRejectDialogOpen(true);
  };

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
    setRejectType('teacher');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedId) return;
    setProcessing(true);
    try {
      if (rejectType === 'question') {
        await rejectQuestion(selectedId, rejectReason);
      } else {
        await rejectTeacher(selectedId, rejectReason);
      }
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedId(null);
    } finally {
      setProcessing(false);
    }
  };

  const renderQuestionsTab = () => {
    if (isLoadingQuestions) {
      return <div className={styles.loading}>Đang tải...</div>;
    }

    if (pendingQuestions.length === 0) {
      return (
        <div className={styles.empty}>
          <Clock size={48} />
          <p>Không có câu hỏi nào đang chờ duyệt</p>
        </div>
      );
    }

    return (
      <div className={styles.list}>
        {pendingQuestions.map((question) => (
          <div key={question.id || question._id} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={`${styles.badge} ${styles[question.difficulty]}`}>
                {question.difficulty === 'easy' ? 'Dễ' : question.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
              </span>
              <span className={styles.type}>
                {question.type === 'single_choice' ? 'Một đáp án' : 'Nhiều đáp án'}
              </span>
            </div>
            <div className={styles.cardContent}>
              <p>{question.content}</p>
            </div>
            <div className={styles.cardFooter}>
              <span className={styles.author}>
                Người tạo: {question.createdBy?.name || 'N/A'}
              </span>
              <div className={styles.actions}>
                <button
                  className={styles.btnApprove}
                  onClick={() => handleApproveQuestion(question.id || question._id)}
                  disabled={processing}
                >
                  <Check size={16} />
                  Duyệt
                </button>
                <button
                  className={styles.btnReject}
                  onClick={() => handleRejectQuestionClick(question.id || question._id)}
                  disabled={processing}
                >
                  <X size={16} />
                  Từ chối
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTeachersTab = () => {
    if (isLoadingTeachers) {
      return <div className={styles.loading}>Đang tải...</div>;
    }

    if (pendingTeachers.length === 0) {
      return (
        <div className={styles.empty}>
          <Clock size={48} />
          <p>Không có giáo viên nào đang chờ duyệt</p>
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
                Duyệt
              </button>
              <button
                className={styles.btnReject}
                onClick={() => handleRejectTeacherClick(teacher.id || teacher._id)}
                disabled={processing}
              >
                <X size={16} />
                Từ chối
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
        <h1>Phê duyệt</h1>
        {totalPending > 0 && (
          <span className={styles.badge}>{totalPending} chờ xử lý</span>
        )}
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'questions' ? styles.active : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          Câu hỏi
          {pendingQuestionsCount > 0 && (
            <span className={styles.tabBadge}>{pendingQuestionsCount}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'teachers' ? styles.active : ''}`}
          onClick={() => setActiveTab('teachers')}
        >
          Giáo viên
          {pendingTeachersCount > 0 && (
            <span className={styles.tabBadge}>{pendingTeachersCount}</span>
          )}
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'questions' ? renderQuestionsTab() : renderTeachersTab()}
      </div>

      <ConfirmDialog
        open={rejectDialogOpen}
        title={rejectType === 'question' ? 'Từ chối câu hỏi' : 'Từ chối giáo viên'}
        message={
          rejectType === 'question'
            ? 'Bạn có chắc chắn muốn từ chối câu hỏi này?'
            : 'Bạn có chắc chắn muốn từ chối giáo viên này?'
        }
        confirmLabel="Từ chối"
        cancelLabel="Hủy"
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
          <label>Lý do từ chối (tùy chọn):</label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Nhập lý do từ chối..."
            rows={3}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
