import { useEffect, useState } from 'react';
import { Crown, Users, Clock, Loader2, UserMinus, UserPlus, Check, XCircle } from 'lucide-react';
import Modal from './shared/Modal';
import ConfirmDialog from './shared/ConfirmDialog';
import { bankService, type BankMember } from '../../services/bankService';
import { useBankStore } from '../store/bankStore';
import { toast } from 'sonner';
import styles from './BankManagementModal.module.css';

interface Props {
  bankId: string;
  open: boolean;
  onClose: () => void;
  userRole?: 'owner' | 'manager' | 'viewer';
}

interface UserInfo {
  _id: string;
  name: string;
  email?: string;
}

interface MemberWithUser extends BankMember {
  userId: UserInfo;
}

export default function BankManagementModal({ bankId, open, onClose, userRole }: Props) {
  const { currentMembership: storeMembership } = useBankStore();
  const [managers, setManagers] = useState<MemberWithUser[]>([]);
  const [viewers, setViewers] = useState<MemberWithUser[]>([]);
  const [pending, setPending] = useState<MemberWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ userId: string; name: string } | null>(null);

  // Use prop role if provided, otherwise fallback to store
  const effectiveRole = userRole || storeMembership?.role;
  const isOwner = effectiveRole === 'owner';
  const isManager = effectiveRole === 'manager' || isOwner;

  useEffect(() => {
    if (open && bankId) {
      fetchMembers();
    }
  }, [open, bankId]);

  async function fetchMembers() {
    setLoading(true);
    try {
      const [activeRes, pendingRes] = await Promise.all([
        bankService.listMembers(bankId, 'active'),
        bankService.listPendingRequests(bankId),
      ]);

      const allMembers: MemberWithUser[] = [
        ...activeRes.results,
        ...(Array.isArray(pendingRes) ? pendingRes : pendingRes.results || []),
      ].map((m) => ({
        ...m,
        userId: m.userId as UserInfo,
      }));

      setManagers(allMembers.filter((m) => m.role === 'owner' || m.role === 'manager'));
      setViewers(allMembers.filter((m) => m.role === 'viewer'));
      setPending(allMembers.filter((m) => m.status === 'pending'));
    } catch {
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  }

  const handlePromote = async (userId: string) => {
    setActionLoading(userId);
    try {
      await bankService.updateMemberRole(bankId, userId, 'manager');
      toast.success('Member promoted to manager');
      fetchMembers();
    } catch {
      toast.error('Failed to promote member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async () => {
    if (!confirmRemove) return;
    setActionLoading(confirmRemove.userId);
    try {
      await bankService.removeMember(bankId, confirmRemove.userId);
      toast.success('Member removed');
      setConfirmRemove(null);
      fetchMembers();
    } catch {
      toast.error('Failed to remove member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    try {
      await bankService.respondToRequest(bankId, userId, 'approve');
      toast.success('Request approved');
      fetchMembers();
    } catch {
      toast.error('Failed to approve request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActionLoading(userId);
    try {
      await bankService.respondToRequest(bankId, userId, 'reject');
      toast.success('Request rejected');
      fetchMembers();
    } catch {
      toast.error('Failed to reject request');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <Modal
        open={open}
        title="Manage Bank Members"
        size="lg"
        onClose={onClose}
      >
        {loading ? (
          <div className={styles.loading}>
            <Loader2 className={styles.spinner} size={32} />
            <span>Loading members...</span>
          </div>
        ) : (
          <div className={styles.content}>
            {/* Managers Section */}
            <section className={styles.section}>
              <h4 className={styles.sectionHeader}>
                <Crown size={18} className={styles.iconGold} />
                Managers
                <span className={styles.badge}>{managers.length}</span>
              </h4>
              <div className={styles.memberList}>
                {managers.length === 0 ? (
                  <p className={styles.empty}>No managers</p>
                ) : (
                  managers.map((member) => (
                    <div key={member._id} className={styles.memberCard}>
                      <div className={styles.memberInfo}>
                        <div className={styles.avatar}>
                          {member.userId?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className={styles.memberName}>{member.userId?.name}</p>
                          <p className={styles.memberEmail}>{member.userId?.email}</p>
                        </div>
                      </div>
                      <div className={styles.memberActions}>
                        <span className={`${styles.roleBadge} ${member.role === 'owner' ? styles.ownerBadge : styles.managerBadge}`}>
                          {member.role === 'owner' ? 'Owner' : 'Manager'}
                        </span>
                        {!isOwner && member.role === 'manager' && (
                          <button
                            className={styles.removeBtn}
                            onClick={() => setConfirmRemove({ userId: member.userId._id, name: member.userId?.name || 'Member' })}
                            disabled={actionLoading === member.userId._id}
                          >
                            <UserMinus size={16} />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Viewers Section */}
            <section className={styles.section}>
              <h4 className={styles.sectionHeader}>
                <Users size={18} />
                Viewers
                <span className={styles.badge}>{viewers.length}</span>
              </h4>
              <div className={styles.memberList}>
                {viewers.length === 0 ? (
                  <p className={styles.empty}>No viewers</p>
                ) : (
                  viewers.map((member) => (
                    <div key={member._id} className={styles.memberCard}>
                      <div className={styles.memberInfo}>
                        <div className={styles.avatar}>
                          {member.userId?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className={styles.memberName}>{member.userId?.name}</p>
                          <p className={styles.memberEmail}>{member.userId?.email}</p>
                        </div>
                      </div>
                      <div className={styles.memberActions}>
                        {isManager && (
                          <>
                            <button
                              className={styles.promoteBtn}
                              onClick={() => handlePromote(member.userId._id)}
                              disabled={actionLoading === member.userId._id}
                            >
                              <UserPlus size={16} />
                              Promote
                            </button>
                            <button
                              className={styles.removeBtn}
                              onClick={() => setConfirmRemove({ userId: member.userId._id, name: member.userId?.name || 'Member' })}
                              disabled={actionLoading === member.userId._id}
                            >
                              <UserMinus size={16} />
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Pending Section */}
            <section className={styles.section}>
              <h4 className={styles.sectionHeader}>
                <Clock size={18} className={styles.iconGray} />
                Pending Requests
                <span className={styles.badge}>{pending.length}</span>
              </h4>
              <div className={styles.memberList}>
                {pending.length === 0 ? (
                  <p className={styles.empty}>No pending requests</p>
                ) : (
                  pending.map((member) => (
                    <div key={member._id} className={styles.memberCard}>
                      <div className={styles.memberInfo}>
                        <div className={styles.avatar}>
                          {member.userId?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className={styles.memberName}>{member.userId?.name}</p>
                          <p className={styles.memberEmail}>{member.userId?.email}</p>
                        </div>
                      </div>
                      <div className={styles.memberActions}>
                        {isManager && (
                          <>
                            <button
                              className={styles.approveBtn}
                              onClick={() => handleApprove(member.userId._id)}
                              disabled={actionLoading === member.userId._id}
                            >
                              <Check size={16} />
                              Approve
                            </button>
                            <button
                              className={styles.rejectBtn}
                              onClick={() => handleReject(member.userId._id)}
                              disabled={actionLoading === member.userId._id}
                            >
                              <XCircle size={16} />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmRemove}
        title="Remove Member"
        message={`Are you sure you want to remove ${confirmRemove?.name} from this bank?`}
        confirmLabel="Remove"
        confirmVariant="danger"
        onConfirm={handleRemove}
        onCancel={() => setConfirmRemove(null)}
        loading={!!actionLoading}
      />
    </>
  );
}
