import { useState, useMemo } from 'react';
import { ChevronDown, Plus, BookOpen, Users, Lock, AlertCircle } from 'lucide-react';
import { useBankStore } from '../store/bankStore';
import { useAuthStore } from '../store/authStore';
import styles from './BankSelector.module.css';
import { toast } from 'sonner';

interface BankSelectorProps {
  selectedBankId: string | null;
  onChange: (bankId: string | null) => void;
}

export default function BankSelector({ selectedBankId, onChange }: BankSelectorProps) {
  const {
    banks,
    fetchBanks,
    createBank,
    isLoading,
    error,
    clearError,
  } = useBankStore();

  const [open, setOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newBank, setNewBank] = useState({
    name: '',
    description: '',
    type: 'personal' as 'personal' | 'school',
  });

  const user = useAuthStore((s) => s.user);
  const userSchoolId = user?.schoolId;
  const isSchoolAdmin = user?.role === 'admin' || user?.role === 'school-admin';
  const canCreateSchoolBank = !!userSchoolId && isSchoolAdmin;

  const selected = useMemo(
    () => banks.find((b) => b.bank._id === selectedBankId) ?? null,
    [banks, selectedBankId]
  );

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const handleCreate = async () => {
    if (!newBank.name.trim()) {
      toast.error('Bank name is required');
      return;
    }
    if (newBank.type === 'school' && !userSchoolId) {
      toast.error('You are not associated with a school. Cannot create a school bank.');
      return;
    }
    try {
      const payload: {
        name: string;
        description?: string;
        type: 'personal' | 'school';
        schoolId?: string;
      } = {
        name: newBank.name.trim(),
        type: newBank.type,
      };
      const desc = newBank.description.trim();
      if (desc) payload.description = desc;
      if (newBank.type === 'school' && userSchoolId) {
        payload.schoolId = String(userSchoolId);
      }
      const bank = await createBank(payload);
      toast.success('Bank created');
      setIsCreateOpen(false);
      setNewBank({ name: '', description: '', type: 'personal' });
      onChange(bank._id);
    } catch {
      toast.error('Failed to create bank');
    }
  };

  const renderRoleBadge = (role: string | undefined) => {
    if (!role) return null;
    const map: Record<string, { color: string; bg: string; label: string }> = {
      owner: { color: '#7c3aed', bg: '#ede9fe', label: 'Owner' },
      manager: { color: '#2563eb', bg: '#dbeafe', label: 'Manager' },
      viewer: { color: '#475569', bg: '#e2e8f0', label: 'Viewer' },
    };
    const info = map[role];
    if (!info) return null;
    return (
      <span
        className={styles.roleBadge}
        style={{ color: info.color, backgroundColor: info.bg }}
      >
        {info.label}
      </span>
    );
  };

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className={styles.triggerLeft}>
          <BookOpen size={16} />
          {selected ? (
            <div className={styles.triggerInfo}>
              <span className={styles.triggerName}>{selected.bank.name}</span>
              <span className={styles.triggerMeta}>
                {selected.bank.type === 'school' ? 'School bank' : 'Personal bank'}
              </span>
            </div>
          ) : (
            <span className={styles.triggerName} style={{ color: '#94a3b8' }}>
              Select a bank...
            </span>
          )}
        </div>
        <div className={styles.triggerRight}>
          {selected && renderRoleBadge(selected.membership?.role)}
          <ChevronDown size={14} />
        </div>
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span>Your banks</span>
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => {
                setIsCreateOpen(true);
                setOpen(false);
              }}
            >
              <Plus size={14} /> New bank
            </button>
          </div>
          <div className={styles.list} role="listbox">
            {banks.length === 0 && !isLoading && (
              <div className={styles.empty}>
                <AlertCircle size={14} /> You have no banks yet. Create one to organize your questions.
              </div>
            )}

            {banks.map((b) => (
              <button
                key={b.bank._id}
                type="button"
                className={`${styles.listItem} ${b.bank._id === selectedBankId ? styles.listItemActive : ''}`}
                onClick={() => handleSelect(b.bank._id)}
              >
                <div className={styles.listItemLeft}>
                  <BookOpen size={16} />
                  <div>
                    <div className={styles.listItemTitle}>{b.bank.name}</div>
                    <div className={styles.listItemMeta}>
                      {b.bank.type === 'school' ? 'School bank' : 'Personal bank'}
                      {b.membership?.status === 'pending' && (
                        <span style={{ color: '#d97706', marginLeft: 6 }}>
                          <Lock size={11} style={{ verticalAlign: 'middle' }} /> Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles.listItemRight}>
                  {renderRoleBadge(b.membership?.role)}
                  <span
                    className={styles.manageLink}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/banks/${b.bank._id}/members`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        window.location.href = `/banks/${b.bank._id}/members`;
                      }
                    }}
                  >
                    Manage
                  </span>
                </div>
              </button>
            ))}
          </div>
          {error && (
            <div className={styles.error}>
              {error}
              <button onClick={clearError}>×</button>
            </div>
          )}
        </div>
      )}

      {isCreateOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCreateOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Create new bank</h3>
            <p className={styles.modalHelp}>
              Personal banks belong to you. School banks belong to your school and require at least
              one school-admin owner.
            </p>
            <label className={styles.field}>
              <span>Name</span>
              <input
                value={newBank.name}
                onChange={(e) => setNewBank({ ...newBank, name: e.target.value })}
                placeholder="e.g. Math Grade 10 Finals"
              />
            </label>
            <label className={styles.field}>
              <span>Description</span>
              <textarea
                rows={2}
                value={newBank.description}
                onChange={(e) => setNewBank({ ...newBank, description: e.target.value })}
                placeholder="Optional"
              />
            </label>
            <label className={styles.field}>
              <span>Type</span>
              <select
                value={newBank.type}
                onChange={(e) =>
                  setNewBank({ ...newBank, type: e.target.value as 'personal' | 'school' })
                }
                disabled={!canCreateSchoolBank}
              >
                <option value="personal">Personal</option>
                <option value="school">School</option>
              </select>
            </label>
            {!canCreateSchoolBank && (
              <p className={styles.modalHelp} style={{ color: '#d97706' }}>
                You are not linked to a school, so only personal banks are available.
              </p>
            )}
            {newBank.type === 'school' && userSchoolId && (
              <p className={styles.modalHelp}>
                This bank will be created for your school (id: <code>{String(userSchoolId)}</code>) and
                will be governed by school-admin owners.
              </p>
            )}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.createBtn}
                onClick={handleCreate}
                disabled={!newBank.name.trim() || isLoading}
              >
                <Plus size={14} /> Create
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        className={styles.refreshBtn}
        onClick={() => fetchBanks()}
        title="Refresh banks"
      >
        <Users size={12} />
      </button>
    </div>
  );
}