# Bank Members Management - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm modal quản lý thành viên bank cho phép owner/manager xem, promote, remove members và approve/reject requests.

**Architecture:** Tạo component BankManagementModal với 3 sections (Managers, Viewers, Pending). Sử dụng API endpoints đã có trong bankService. Permissions check dựa trên currentMembership.role từ bankStore.

**Tech Stack:** React, TypeScript, CSS Modules, bankService API

---

## File Structure

```
client/web/src/
├── presentation/components/
│   └── BankManagementModal.tsx       (NEW - modal chính)
│   └── BankManagementModal.module.css (NEW - styles)
├── presentation/components/shared/
│   └── ConfirmDialog.tsx             (EXISTING - dùng lại cho remove confirm)
└── presentation/store/
    └── bankStore.ts                  (EXISTING - thêm helper nếu cần)
```

---

## Task 1: Create BankManagementModal Component

**Files:**
- Create: `client/web/src/presentation/components/BankManagementModal.tsx`
- Create: `client/web/src/presentation/components/BankManagementModal.module.css`
- Modify: `client/web/src/presentation/components/index.ts` (export component)

- [ ] **Step 1: Create BankManagementModal.tsx**

```tsx
import { useEffect, useState } from 'react';
import { Crown, Users, Clock, X, Loader2, UserMinus, UserPlus, Check, XCircle } from 'lucide-react';
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
}

interface UserInfo {
  _id: string;
  name: string;
  email?: string;
}

interface MemberWithUser extends BankMember {
  userId: UserInfo;
}

export default function BankManagementModal({ bankId, open, onClose }: Props) {
  const { currentMembership } = useBankStore();
  const [managers, setManagers] = useState<MemberWithUser[]>([]);
  const [viewers, setViewers] = useState<MemberWithUser[]>([]);
  const [pending, setPending] = useState<MemberWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ userId: string; name: string } | null>(null);

  const isOwner = currentMembership?.role === 'owner';
  const isManager = currentMembership?.role === 'manager' || isOwner;

  useEffect(() => {
    if (open && bankId) {
      fetchMembers();
    }
  }, [open, bankId]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const [activeRes, pendingRes] = await Promise.all([
        bankService.listMembers(bankId, 'active'),
        bankService.listPendingRequests(bankId),
      ]);

      const allMembers: MemberWithUser[] = [
        ...activeRes.results,
        ...pendingRes.results,
      ].map((m) => ({
        ...m,
        userId: m.userId as UserInfo,
      }));

      setManagers(allMembers.filter((m) => m.role === 'owner' || m.role === 'manager'));
      setViewers(allMembers.filter((m) => m.role === 'viewer'));
      setPending(allMembers.filter((m) => m.status === 'pending'));
    } catch (err) {
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

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
```

- [ ] **Step 2: Create BankManagementModal.module.css**

```css
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  gap: 12px;
  color: var(--text-secondary, #6b7280);
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 8px 0;
  max-height: 70vh;
  overflow-y: auto;
}

.section {
  background: var(--bg-secondary, #f9fafb);
  border-radius: 12px;
  padding: 16px;
}

.sectionHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #111827);
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.iconGold {
  color: #f59e0b;
}

.iconGray {
  color: #9ca3af;
}

.badge {
  background: var(--bg-tertiary, #e5e7eb);
  color: var(--text-secondary, #6b7280);
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 12px;
  margin-left: auto;
}

.memberList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty {
  color: var(--text-secondary, #6b7280);
  font-size: 14px;
  text-align: center;
  padding: 16px;
  margin: 0;
}

.memberCard {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 12px;
}

.memberInfo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--primary-color, #3b82f6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.memberName {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #111827);
}

.memberEmail {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
}

.memberActions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.roleBadge {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 16px;
}

.ownerBadge {
  background: #fef3c7;
  color: #92400e;
}

.managerBadge {
  background: #dbeafe;
  color: #1e40af;
}

.promoteBtn,
.approveBtn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.promoteBtn {
  background: #dbeafe;
  color: #1e40af;
}

.promoteBtn:hover:not(:disabled) {
  background: #bfdbfe;
}

.approveBtn {
  background: #dcfce7;
  color: #166534;
}

.approveBtn:hover:not(:disabled) {
  background: #bbf7d0;
}

.removeBtn,
.rejectBtn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.removeBtn {
  background: #fee2e2;
  color: #991b1b;
}

.removeBtn:hover:not(:disabled) {
  background: #fecaca;
}

.rejectBtn {
  background: #fee2e2;
  color: #991b1b;
}

.rejectBtn:hover:not(:disabled) {
  background: #fecaca;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

- [ ] **Step 3: Export from components index**

Tìm file index.ts trong components folder và thêm export.

---

## Task 2: Integrate Modal into QuestionBankPage

**Files:**
- Modify: `client/web/src/pages/QuestionBankPage.tsx` (thêm button và modal)

- [ ] **Step 1: Import BankManagementModal**

Thêm vào đầu file QuestionBankPage.tsx:

```tsx
import BankManagementModal from '../presentation/components/BankManagementModal';
```

- [ ] **Step 2: Add state và button**

Trong component QuestionBankPage, thêm state:

```tsx
const [isManagementOpen, setIsManagementOpen] = useState(false);
```

Thêm button "Manage Bank" vào header (tìm phần header/action buttons):

```tsx
{currentMembership?.role === 'owner' || currentMembership?.role === 'manager' ? (
  <button
    className={styles.manageBankBtn}
    onClick={() => setIsManagementOpen(true)}
  >
    <Settings2 size={18} />
    Manage Bank
  </button>
) : null}
```

- [ ] **Step 3: Add Modal component**

Thêm vào cuối JSX (trước closing tag):

```tsx
{bankId && (
  <BankManagementModal
    bankId={bankId}
    open={isManagementOpen}
    onClose={() => setIsManagementOpen(false)}
  />
)}
```

- [ ] **Step 4: Add Settings2 icon import**

```tsx
Settings2,
```

(đã có trong lucide-react import)

---

## Task 3: Test & Verify

**Files:**
- Create: `client/web/src/__tests__/components/BankManagementModal.test.tsx`

- [ ] **Step 1: Write test**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BankManagementModal from '../../presentation/components/BankManagementModal';

// Mock bankService
jest.mock('../../services/bankService', () => ({
  bankService: {
    listMembers: jest.fn(),
    listPendingRequests: jest.fn(),
    updateMemberRole: jest.fn(),
    removeMember: jest.fn(),
    respondToRequest: jest.fn(),
  },
}));

// Mock useBankStore
jest.mock('../store/bankStore', () => ({
  useBankStore: () => ({
    currentMembership: { role: 'owner' },
  }),
}));

import { bankService } from '../../services/bankService';

describe('BankManagementModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', async () => {
    (bankService.listMembers as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // never resolves
    );
    (bankService.listPendingRequests as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    render(
      <BankManagementModal
        bankId="bank-123"
        open={true}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText(/loading members/i)).toBeInTheDocument();
  });

  it('displays members in correct sections', async () => {
    (bankService.listMembers as jest.Mock).mockResolvedValue({
      results: [
        {
          _id: 'm1',
          bankId: 'bank-123',
          userId: { _id: 'u1', name: 'John Owner', email: 'john@test.com' },
          role: 'owner',
          status: 'active',
        },
        {
          _id: 'm2',
          bankId: 'bank-123',
          userId: { _id: 'u2', name: 'Jane Manager', email: 'jane@test.com' },
          role: 'manager',
          status: 'active',
        },
        {
          _id: 'm3',
          bankId: 'bank-123',
          userId: { _id: 'u3', name: 'Bob Viewer', email: 'bob@test.com' },
          role: 'viewer',
          status: 'active',
        },
      ],
    });
    (bankService.listPendingRequests as jest.Mock).mockResolvedValue({
      results: [
        {
          _id: 'm4',
          bankId: 'bank-123',
          userId: { _id: 'u4', name: 'Alice Pending', email: 'alice@test.com' },
          role: 'viewer',
          status: 'pending',
        },
      ],
    });

    render(
      <BankManagementModal
        bankId="bank-123"
        open={true}
        onClose={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Managers')).toBeInTheDocument();
      expect(screen.getByText('Viewers')).toBeInTheDocument();
      expect(screen.getByText('Pending Requests')).toBeInTheDocument();
    });

    expect(screen.getByText('John Owner')).toBeInTheDocument();
    expect(screen.getByText('Jane Manager')).toBeInTheDocument();
    expect(screen.getByText('Bob Viewer')).toBeInTheDocument();
    expect(screen.getByText('Alice Pending')).toBeInTheDocument();
  });

  it('promotes viewer to manager', async () => {
    (bankService.listMembers as jest.Mock).mockResolvedValue({
      results: [
        {
          _id: 'm3',
          bankId: 'bank-123',
          userId: { _id: 'u3', name: 'Bob Viewer', email: 'bob@test.com' },
          role: 'viewer',
          status: 'active',
        },
      ],
    });
    (bankService.listPendingRequests as jest.Mock).mockResolvedValue({ results: [] });
    (bankService.updateMemberRole as jest.Mock).mockResolvedValue({});

    render(
      <BankManagementModal
        bankId="bank-123"
        open={true}
        onClose={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Bob Viewer')).toBeInTheDocument();
    });

    const promoteBtn = screen.getByRole('button', { name: /promote/i });
    await userEvent.click(promoteBtn);

    await waitFor(() => {
      expect(bankService.updateMemberRole).toHaveBeenCalledWith('bank-123', 'u3', 'manager');
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd client/web && npm test -- --testPathPattern="BankManagementModal" --watchAll=false
```

Expected: All tests pass

---

## Task 4: Manual Test Checklist

- [ ] Open Question Bank detail page
- [ ] Login as owner → Verify "Manage Bank" button visible
- [ ] Login as manager → Verify "Manage Bank" button visible
- [ ] Login as viewer → Verify "Manage Bank" button NOT visible
- [ ] Click "Manage Bank" → Modal opens with 3 sections
- [ ] Verify Managers section shows owner/manager roles
- [ ] Verify Viewers section shows viewer roles
- [ ] Verify Pending section shows pending requests
- [ ] Test Promote button → member moves to Managers
- [ ] Test Remove button → confirm dialog appears
- [ ] Test Approve/Reject → list updates
- [ ] Click X or outside modal → modal closes
