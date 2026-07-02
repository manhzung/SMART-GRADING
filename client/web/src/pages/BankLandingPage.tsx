import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  AlertCircle,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Search,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBankStore } from '../presentation/store/bankStore';
import { useAuthStore } from '../presentation/store/authStore';
import { apiService } from '../core/api';
import styles from './BankLandingPage.module.css';

interface AllBankItem {
  _id: string;
  name: string;
  description?: string;
  type: 'personal' | 'school';
  schoolId?: string;
  createdAt: string;
}

interface AllBanksResponse {
  results: AllBankItem[];
  total: number;
  page: number;
  pages: number;
}

export default function BankLandingPage() {
  const navigate = useNavigate();
  const { banks, fetchBanks, createBank, requestAccess, isLoading, error, clearError } = useBankStore();
  const user = useAuthStore((s) => s.user);
  const userSchoolId = user?.schoolId;
  const isSchoolAdmin = user?.role === 'admin' || user?.role === 'school-admin';
  const isTeacher = user?.role === 'teacher';
  const canCreateSchoolBank = !!userSchoolId && isSchoolAdmin;
  const isBankTypeLocked = isSchoolAdmin || isTeacher; // Teachers can only create personal banks

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [allBanks, setAllBanks] = useState<AllBankItem[]>([]);
  const [newBank, setNewBank] = useState({
    name: '',
    description: '',
    type: 'personal' as 'personal' | 'school',
  });

  useEffect(() => {
    if (isTeacher) {
      setNewBank((prev) => ({ ...prev, type: 'personal' }));
    }
  }, [isTeacher]);

  useEffect(() => {
    fetchBanks();
    fetchAllBanks();
  }, [fetchBanks]);

  // Fetch all banks in the system
  const fetchAllBanks = async (searchTerm?: string) => {
    try {
      const response = await apiService.get<AllBanksResponse>('/banks/search', {
        params: searchTerm ? { search: searchTerm } : undefined,
      });
      setAllBanks(response.results || []);
    } catch (err) {
      console.error('Failed to fetch all banks:', err);
      toast.error('Failed to load banks');
    }
  };

  // Filter my banks
  const filteredMyBanks = banks.filter((b) =>
    b.bank.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Filter all banks list - exclude banks user already has access to
  const userBankIds = new Set(banks.map((b) => b.bank._id));
  const filteredAllBanks = allBanks.filter(
    (bank) =>
      bank.name.toLowerCase().includes(search.toLowerCase()) &&
      !userBankIds.has(bank._id),
  );

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (value.trim()) {
      fetchAllBanks(value);
    } else {
      fetchAllBanks();
    }
  };

  const handleSelect = (bankId: string) => {
    navigate(`/question-bank/${bankId}`);
  };

  const handleRequestAccess = async (bankId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await requestAccess(bankId);
      toast.success('Access requested! You will be notified when approved.');
      fetchBanks();
      fetchAllBanks(search || undefined);
    } catch {
      toast.error('Failed to request access');
    }
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
      if (newBank.description.trim()) payload.description = newBank.description.trim();
      if (newBank.type === 'school' && userSchoolId) {
        payload.schoolId = String(userSchoolId);
      }
      const bank = await createBank(payload);
      toast.success('Bank created');
      setIsCreateOpen(false);
      setNewBank({ name: '', description: '', type: 'personal' });
      navigate(`/question-bank/${bank._id}`);
    } catch {
      toast.error('Failed to create bank');
    }
  };

  const renderRoleBadge = (role: string) => {
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

  // Render card for user's own bank (with membership info)
  const renderMyBankCard = (b: (typeof banks)[0]) => (
    <div
      key={b.bank._id}
      className={styles.bankCard}
      onClick={() => handleSelect(b.bank._id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleSelect(b.bank._id);
      }}
    >
      <div className={styles.bankCardIcon}>
        <BookOpen size={24} />
      </div>
      <div className={styles.bankCardInfo}>
        <div className={styles.bankCardName}>{b.bank.name}</div>
        <div className={styles.bankCardMeta}>
          <span className={styles.typeTag}>
            {b.bank.type === 'school' ? 'School bank' : 'Personal bank'}
          </span>
          {b.membership?.role && renderRoleBadge(b.membership.role)}
        </div>
        {b.bank.description && (
          <p className={styles.bankCardDesc}>{b.bank.description}</p>
        )}
      </div>
      <div className={styles.bankCardActions}>
        <button
          className={styles.selectBtn}
          onClick={(e) => {
            e.stopPropagation();
            handleSelect(b.bank._id);
          }}
        >
          Open
        </button>
      </div>
    </div>
  );

  // Render card for bank from "all banks" list (may not be a member)
  const renderAllBankCard = (bank: AllBankItem) => {
    return (
      <div
        key={bank._id}
        className={styles.bankCard}
      >
        <div className={styles.bankCardIcon}>
          <BookOpen size={24} />
        </div>
        <div className={styles.bankCardInfo}>
          <div className={styles.bankCardName}>{bank.name}</div>
          <div className={styles.bankCardMeta}>
            <span className={styles.typeTag}>
              {bank.type === 'school' ? 'School bank' : 'Personal bank'}
            </span>
          </div>
          {bank.description && (
            <p className={styles.bankCardDesc}>{bank.description}</p>
          )}
        </div>
        <div className={styles.bankCardActions}>
          <button
            className={styles.requestBtn}
            onClick={(e) => handleRequestAccess(bank._id, e)}
          >
            Request Access
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>
            <BookOpen size={28} />
            Question Banks
          </h1>
          <p className={styles.subtitle}>
            Select a question bank to browse, create and manage your academic questions.
          </p>
        </div>
        <button
          type="button"
          className={styles.createBtn}
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus size={18} />
          New Bank
        </button>
      </div>

      {/* Search */}
      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <Search size={16} style={{ color: '#9ca3af', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search all banks..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={styles.searchInput}
          />
          {search && (
            <button
              onClick={() => handleSearchChange('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
            >
              <RefreshCw size={14} style={{ color: '#9ca3af' }} />
            </button>
          )}
        </div>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={() => {
            fetchBanks();
            fetchAllBanks(search || undefined);
          }}
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={clearError} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && banks.length === 0 && allBanks.length === 0 ? (
        <div className={styles.loadingState}>
          <Loader2 size={32} className={styles.spinner} />
          <p>Loading banks...</p>
        </div>
      ) : null}

      {/* Banks Grid */}
      <>
        {/* My Banks Section */}
        {filteredMyBanks.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <CheckCircle2 size={16} />
              Your Banks ({filteredMyBanks.length})
            </h2>
            <div className={styles.bankGrid}>
              {filteredMyBanks.map((b) => renderMyBankCard(b))}
            </div>
          </section>
        )}

        {/* All Banks Section - only for non-school-admin */}
        {!isSchoolAdmin && filteredAllBanks.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Globe size={16} />
              All Banks in the System ({filteredAllBanks.length})
            </h2>
            <div className={styles.bankGrid}>
              {filteredAllBanks.map((bank) => renderAllBankCard(bank))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {filteredMyBanks.length === 0 && (!isSchoolAdmin ? filteredAllBanks.length === 0 : true) && (
          <div className={styles.emptyState}>
            <BookOpen size={48} style={{ color: '#94a3b8', marginBottom: 12 }} />
            <h3>No banks found</h3>
            <p>
              {search
                ? 'No banks match your search. Try a different name.'
                : "You don't have any banks yet. Create your first bank to start organizing questions."}
            </p>
            {!search && (
              <button
                type="button"
                className={styles.createBtn}
                style={{ marginTop: 8 }}
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus size={16} />
                Create First Bank
              </button>
            )}
          </div>
        )}
      </>

      {/* Create Bank Modal */}
      {isCreateOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCreateOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                <BookOpen size={20} />
                Create New Bank
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsCreateOpen(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalHelp}>
                <strong>Personal</strong> banks belong to you only.
                <strong> School</strong> banks belong to your school and require at least one school-admin owner.
              </p>

              <label className={styles.field}>
                <span>Bank Name *</span>
                <input
                  type="text"
                  value={newBank.name}
                  onChange={(e) => setNewBank({ ...newBank, name: e.target.value })}
                  placeholder="e.g. Math Grade 10 Finals"
                  className={styles.input}
                  autoFocus
                />
              </label>

              <label className={styles.field}>
                <span>Description</span>
                <textarea
                  rows={2}
                  value={newBank.description}
                  onChange={(e) => setNewBank({ ...newBank, description: e.target.value })}
                  placeholder="Optional description..."
                  className={styles.textarea}
                />
              </label>

              <label className={styles.field}>
                <span>Type</span>
                {isBankTypeLocked ? (
                  <input
                    type="text"
                    value={isTeacher ? 'Personal' : 'School'}
                    className={styles.input}
                    disabled
                  />
                ) : (
                  <select
                    value={newBank.type}
                    onChange={(e) =>
                      setNewBank({ ...newBank, type: e.target.value as 'personal' | 'school' })
                    }
                    className={styles.select}
                  >
                    <option value="personal">Personal</option>
                    <option value="school">School</option>
                  </select>
                )}
              </label>

              {isTeacher && (
                <p className={styles.notice}>
                  Teachers can only create personal banks. School banks require a school-admin owner.
                </p>
              )}

              {!canCreateSchoolBank && !isTeacher && (
                <p className={styles.warning}>
                  <AlertCircle size={12} />
                  You are not linked to a school, so only personal banks are available.
                </p>
              )}

              {newBank.type === 'school' && userSchoolId && (
                <p className={styles.notice}>
                  This bank will be created for your school and governed by school-admin owners.
                </p>
              )}
            </div>
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
                className={styles.submitBtn}
                onClick={handleCreate}
                disabled={!newBank.name.trim() || isLoading}
              >
                <Plus size={14} />
                Create Bank
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
