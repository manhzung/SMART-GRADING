import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Check,
  X,
  AlertCircle,
  Inbox,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBankStore } from '../presentation/store/bankStore';
import styles from './BankRequestsPage.module.css';

export default function BankRequestsPage() {
  const { bankId } = useParams<{ bankId: string }>();
  const {
    currentBank,
    currentMembership,
    pendingRequests,
    fetchBank,
    fetchPendingRequests,
    respondToRequest,
    isLoading,
    error,
    clearError,
  } = useBankStore();
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    if (bankId) {
      fetchBank(bankId);
      fetchPendingRequests(bankId);
    }
  }, [bankId, fetchBank, fetchPendingRequests]);

  const canManage =
    currentMembership?.status === 'active' &&
    (currentMembership.role === 'owner' || currentMembership.role === 'manager');

  const handleRespond = async (
    userId: string,
    decision: 'approve' | 'reject'
  ) => {
    if (!bankId) return;
    const key = `${userId}-${decision}`;
    setPendingAction(key);
    try {
      await respondToRequest(bankId, userId, decision);
      toast.success(decision === 'approve' ? 'Request approved' : 'Request rejected');
    } catch {
      toast.error('Failed to respond');
    } finally {
      setPendingAction(null);
    }
  };

  if (isLoading && !currentBank) {
    return (
      <div className={styles.container}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!currentBank) {
    return (
      <div className={styles.container}>
        <Link to="/question-bank" className={styles.backLink}>
          <ArrowLeft size={14} /> Back
        </Link>
        <div className={styles.notice}>
          <AlertCircle size={20} />
          <span>Bank not found.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link to={`/banks/${bankId}/members`} className={styles.backLink}>
        <ArrowLeft size={14} /> Back to members
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>
          <ShieldCheck size={22} /> Pending requests
        </h1>
        <p className={styles.subtitle}>
          {currentBank.name} · {pendingRequests.length} pending
        </p>
      </header>

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={clearError}><X size={14} /></button>
        </div>
      )}

      {!canManage ? (
        <div className={styles.notice}>
          <AlertCircle size={20} />
          <span>You don't have permission to manage requests for this bank.</span>
        </div>
      ) : pendingRequests.length === 0 ? (
        <div className={styles.empty}>
          <Inbox size={32} />
          <h3>No pending requests</h3>
          <p>When users request access to this bank, they'll appear here for approval.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {pendingRequests.map((r) => {
            const userObj = typeof r.userId === 'object' ? r.userId : null;
            const userId = userObj?._id ?? (r.userId as string);
            const userName = userObj?.name ?? 'Unknown';
            const userEmail = userObj?.email ?? '';
            return (
              <article key={r._id} className={styles.row}>
                <div className={styles.user}>
                  <div className={styles.avatar}>{userName.trim().charAt(0).toUpperCase()}</div>
                  <div>
                    <div className={styles.name}>{userName}</div>
                    {userEmail && <div className={styles.email}>{userEmail}</div>}
                  </div>
                </div>
                <div className={styles.meta}>
                  Requested{' '}
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.approveBtn}
                    onClick={() => handleRespond(userId, 'approve')}
                    disabled={pendingAction !== null}
                  >
                    {pendingAction === `${userId}-approve` ? (
                      <Loader2 size={14} className={styles.spin} />
                    ) : (
                      <Check size={14} />
                    )}
                    Approve
                  </button>
                  <button
                    type="button"
                    className={styles.rejectBtn}
                    onClick={() => handleRespond(userId, 'reject')}
                    disabled={pendingAction !== null}
                  >
                    {pendingAction === `${userId}-reject` ? (
                      <Loader2 size={14} className={styles.spin} />
                    ) : (
                      <X size={14} />
                    )}
                    Reject
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}