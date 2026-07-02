import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  ShieldCheck,
  UserMinus,
  Crown,
  RefreshCw,
  AlertCircle,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBankStore } from '../presentation/store/bankStore';
import styles from './BankMembersPage.module.css';

const ROLE_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  owner: { color: '#7c3aed', bg: '#ede9fe', label: 'Owner' },
  manager: { color: '#2563eb', bg: '#dbeafe', label: 'Manager' },
  viewer: { color: '#475569', bg: '#e2e8f0', label: 'Viewer' },
};

export default function BankMembersPage() {
  const { bankId } = useParams<{ bankId: string }>();
  const navigate = useNavigate();
  const {
    currentBank,
    currentMembership,
    members,
    isLoading,
    error,
    fetchBank,
    fetchMembers,
    updateMemberRole,
    removeMember,
    leaveBank,
    clearError,
  } = useBankStore();

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<'manager' | 'viewer'>('viewer');
  const [transferringTo, setTransferringTo] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    if (bankId) {
      fetchBank(bankId);
      fetchMembers(bankId);
    }
  }, [bankId, fetchBank, fetchMembers]);

  const isOwner = currentMembership?.role === 'owner' && currentMembership?.status === 'active';
  const isManager =
    isOwner ||
    (currentMembership?.role === 'manager' && currentMembership?.status === 'active');

  const handleStartEdit = (userId: string, currentRole: string) => {
    if (currentRole === 'owner') return;
    setEditingUserId(userId);
    setEditingRole(currentRole === 'manager' ? 'manager' : 'viewer');
  };

  const handleSaveRole = async (userId: string) => {
    if (!bankId) return;
    try {
      await updateMemberRole(bankId, userId, editingRole);
      toast.success('Role updated');
      setEditingUserId(null);
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleRemove = async (userId: string) => {
    if (!bankId) return;
    try {
      await removeMember(bankId, userId);
      toast.success('Member removed');
      setConfirmRemove(null);
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const handleTransfer = async (toUserId: string) => {
    if (!bankId) return;
    try {
      await useBankStore.getState().transferOwnership(bankId, toUserId);
      toast.success('Ownership transferred');
      setTransferringTo(null);
    } catch {
      toast.error('Failed to transfer ownership');
    }
  };

  const handleLeave = async () => {
    if (!bankId) return;
    try {
      await leaveBank(bankId);
      toast.success('You left the bank');
      navigate('/question-bank');
    } catch {
      toast.error('Failed to leave bank');
    }
  };

  if (isLoading && !currentBank) {
    return (
      <div className={styles.container}>
        <p>Loading bank...</p>
      </div>
    );
  }

  if (!currentBank) {
    return (
      <div className={styles.container}>
        <Link to="/question-bank" className={styles.backLink}>
          <ArrowLeft size={14} /> Back to question bank
        </Link>
        <div className={styles.notice}>
          <AlertCircle size={20} />
          <span>Bank not found or you don't have access.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link to="/question-bank" className={styles.backLink}>
        <ArrowLeft size={14} /> Back to question bank
      </Link>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Users size={24} /> {currentBank.name}
          </h1>
          <p className={styles.subtitle}>
            {currentBank.type === 'school' ? 'School bank' : 'Personal bank'} · {members.length} member
            {members.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className={styles.headerActions}>
          {isOwner && (
            <Link
              to={`/banks/${bankId}/requests`}
              className={styles.secondaryBtn}
            >
              <ShieldCheck size={14} /> Pending requests
            </Link>
          )}
          {!isOwner && currentMembership?.status === 'active' && (
            <button
              type="button"
              className={styles.dangerBtn}
              onClick={() => setConfirmLeave(true)}
            >
              <UserMinus size={14} /> Leave bank
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={clearError}><X size={14} /></button>
        </div>
      )}

      {!currentMembership ? (
        <div className={styles.notice}>
          <AlertCircle size={20} />
          <div>
            <strong>You are not a member of this bank.</strong>
            <p>Request access to view and manage its questions.</p>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={async () => {
                try {
                  await useBankStore.getState().requestAccess(bankId!);
                  toast.success('Access requested');
                } catch {
                  toast.error('Failed to request access');
                }
              }}
            >
              Request access
            </button>
          </div>
        </div>
      ) : currentMembership.status === 'pending' ? (
        <div className={styles.notice}>
          <AlertCircle size={20} />
          <span>Your access is pending approval. You'll be notified when it's approved.</span>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className={styles.empty}>No members yet.</td>
                </tr>
              )}
              {members.map((m) => {
                const userObj = typeof m.userId === 'object' ? m.userId : null;
                const userId = userObj?._id ?? (m.userId as string);
                const userName = userObj?.name ?? 'Unknown';
                const userEmail = userObj?.email ?? '';
                const roleInfo = ROLE_COLORS[m.role];

                return (
                  <tr key={m._id}>
                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.avatar}>
                          {userName.trim().charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className={styles.userName}>{userName}</div>
                          {userEmail && <div className={styles.userEmail}>{userEmail}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      {editingUserId === userId && isOwner ? (
                        <select
                          value={editingRole}
                          onChange={(e) =>
                            setEditingRole(e.target.value as 'manager' | 'viewer')
                          }
                          className={styles.roleSelect}
                        >
                          <option value="manager">Manager</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <span
                          className={styles.roleBadge}
                          style={{ color: roleInfo.color, backgroundColor: roleInfo.bg }}
                        >
                          {roleInfo.label}
                        </span>
                      )}
                    </td>
                    <td className={styles.muted}>
                      {m.invitedAt
                        ? new Date(m.invitedAt).toLocaleDateString()
                        : new Date(m.createdAt || '').toLocaleDateString() || '—'}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        {m.role === 'owner' ? (
                          <span className={styles.muted}>
                            <Crown size={12} /> Owner
                          </span>
                        ) : (
                          <>
                            {isOwner && editingUserId === userId && (
                              <>
                                <button
                                  type="button"
                                  className={styles.iconBtn}
                                  onClick={() => handleSaveRole(userId)}
                                  title="Save"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  className={styles.iconBtn}
                                  onClick={() => setEditingUserId(null)}
                                  title="Cancel"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            )}
                            {isOwner && editingUserId !== userId && (
                              <>
                                <button
                                  type="button"
                                  className={styles.linkBtn}
                                  onClick={() => handleStartEdit(userId, m.role)}
                                >
                                  Change role
                                </button>
                                {isOwner && (
                                  <button
                                    type="button"
                                    className={styles.linkBtn}
                                    onClick={() => setTransferringTo(userId)}
                                  >
                                    Transfer ownership
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className={styles.dangerLinkBtn}
                                  onClick={() => setConfirmRemove(userId)}
                                >
                                  Remove
                                </button>
                              </>
                            )}
                            {isManager && !isOwner && (
                              <span className={styles.muted}>View only</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmRemove && (
        <div className={styles.modalOverlay} onClick={() => setConfirmRemove(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Remove member?</h3>
            <p>The user will lose access to this bank immediately.</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setConfirmRemove(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                onClick={() => handleRemove(confirmRemove)}
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {transferringTo && (
        <div className={styles.modalOverlay} onClick={() => setTransferringTo(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Transfer ownership?</h3>
            <p>
              You will become a manager of this bank. The new owner will have full control. This
              action cannot be undone automatically.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setTransferringTo(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => handleTransfer(transferringTo)}
              >
                <RefreshCw size={14} /> Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmLeave && (
        <div className={styles.modalOverlay} onClick={() => setConfirmLeave(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Leave this bank?</h3>
            <p>You will lose access to its questions. You can be re-invited later.</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setConfirmLeave(false)}>
                Cancel
              </button>
              <button type="button" className={styles.dangerBtn} onClick={handleLeave}>
                <UserMinus size={14} /> Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}