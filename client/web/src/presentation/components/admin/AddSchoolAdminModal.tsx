import { useEffect, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import Modal from '../shared/Modal';
import { useSchoolManagementStore } from '../../store/schoolManagementStore';
import { apiService } from '../../../core/api';
import styles from './AddSchoolAdminModal.module.css';

interface Teacher {
  _id: string;
  id?: string;
  name: string;
  email: string;
}

interface AddSchoolAdminModalProps {
  open: boolean;
  schoolId: string;
  existingAdminIds: string[];
  onClose: () => void;
}

export default function AddSchoolAdminModal({
  open,
  schoolId,
  existingAdminIds,
  onClose,
}: AddSchoolAdminModalProps) {
  const { addSchoolAdmin } = useSchoolManagementStore();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedId('');
    setSearch('');
    setError(null);
    setLoading(true);
    apiService
      .get<{ results: Teacher[] }>('/users', {
        params: { role: 'teacher', schoolId, limit: 100 },
      })
      .then((data) => setTeachers(data.results || []))
      .catch((err) => setError(err?.message || 'Unable to load teachers list'))
      .finally(() => setLoading(false));
  }, [open, schoolId]);

  const available = teachers.filter((t) => !existingAdminIds.includes(t._id || (t.id ?? '')));
  const filtered = available.filter((t) =>
    `${t.name} ${t.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!selectedId) return;
    setError(null);
    setSubmitting(true);
    try {
      await addSchoolAdmin(schoolId, selectedId);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to add admin');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Add School Admin"
      size="md"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={styles.btnCancel} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnSubmit}
            onClick={handleSubmit}
            disabled={!selectedId || submitting}
          >
            {submitting ? 'Adding...' : 'Add Admin'}
          </button>
        </>
      }
    >
      <div className={styles.body}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search teachers by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className={styles.loading}>
            <Loader2 size={24} className={styles.spinner} />
            <span>Loading teachers list...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            {teachers.length === 0 ? (
              <>
                <p>This school has no teachers yet.</p>
                <span>Please add teachers to the school first before assigning School Admin.</span>
              </>
            ) : (
              <p>No matching teachers found.</p>
            )}
          </div>
        ) : (
          <div className={styles.list}>
            {filtered.map((t) => {
              const id = t._id || (t.id ?? '');
              return (
                <label key={id} className={`${styles.item} ${selectedId === id ? styles.selected : ''}`}>
                  <input
                    type="radio"
                    name="teacher"
                    value={id}
                    checked={selectedId === id}
                    onChange={() => setSelectedId(id)}
                  />
                  <div className={styles.avatar}>{t.name.charAt(0).toUpperCase()}</div>
                  <div className={styles.info}>
                    <strong>{t.name}</strong>
                    <span>{t.email}</span>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {available.length === 0 && !loading && teachers.length > 0 && (
          <div className={styles.hint}>
            All teachers at this school are already School Admins.
          </div>
        )}
      </div>
    </Modal>
  );
}
