import { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import type { School } from '../../../types';
import styles from './SchoolFormModal.module.css';

interface SchoolFormModalProps {
  open: boolean;
  school?: School | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<School>) => Promise<void>;
}

interface FormData {
  name: string;
  code: string;
  addressStreet: string;
  addressWard: string;
  addressDistrict: string;
  addressCity: string;
  phone: string;
  email: string;
  website: string;
  principalName: string;
  schoolType: 'primary' | 'secondary' | 'high' | 'university' | 'other';
}

const EMPTY_FORM: FormData = {
  name: '',
  code: '',
  addressStreet: '',
  addressWard: '',
  addressDistrict: '',
  addressCity: '',
  phone: '',
  email: '',
  website: '',
  principalName: '',
  schoolType: 'high',
};

export default function SchoolFormModal({
  open,
  school,
  submitting,
  onClose,
  onSubmit,
}: SchoolFormModalProps) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (school) {
      const addr =
        typeof school.address === 'object' && school.address !== null
          ? school.address
          : { street: '', ward: '', district: '', city: '' };
      setForm({
        name: school.name ?? '',
        code: school.code ?? '',
        addressStreet: (addr as any).street ?? '',
        addressWard: (addr as any).ward ?? '',
        addressDistrict: (addr as any).district ?? '',
        addressCity: (addr as any).city ?? '',
        phone: school.phone ?? '',
        email: school.email ?? '',
        website: (school as any).website ?? '',
        principalName: school.principalName ?? '',
        schoolType: (school as any).schoolType ?? 'high',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError(null);
  }, [open, school]);

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError('School name is required');
    if (!school && !form.code.trim()) return setError('School code is required');

    const payload: any = {
      name: form.name.trim(),
      address: {
        street: form.addressStreet.trim(),
        ward: form.addressWard.trim(),
        district: form.addressDistrict.trim(),
        city: form.addressCity.trim(),
      },
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      principalName: form.principalName.trim() || null,
      schoolType: form.schoolType,
    };
    if (!school) payload.code = form.code.trim().toUpperCase();

    try {
      await onSubmit(payload);
    } catch (err: any) {
      setError(err?.message || 'An error occurred');
    }
  };

  return (
    <Modal
      open={open}
      title={school ? 'Edit School' : 'Add New School'}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={styles.btnCancel} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            form="school-form"
            className={styles.btnSubmit}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : school ? 'Update' : 'Create School'}
          </button>
        </>
      }
    >
      <form id="school-form" onSubmit={handleSubmit} className={styles.form}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.row}>
          <div className={styles.field}>
            <label>School Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Chu Van An High School"
              required
            />
          </div>
          <div className={styles.field}>
            <label>School Code {!school && '*'}</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
              placeholder="e.g., CVAN"
              disabled={!!school}
              required={!school}
            />
            {school && <span className={styles.hint}>School code cannot be changed</span>}
          </div>
        </div>

        <fieldset className={styles.fieldGroup}>
          <legend>Address</legend>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Street</label>
              <input
                type="text"
                value={form.addressStreet}
                onChange={(e) => handleChange('addressStreet', e.target.value)}
                placeholder="123 Main Street"
              />
            </div>
            <div className={styles.field}>
              <label>Ward / Commune</label>
              <input
                type="text"
                value={form.addressWard}
                onChange={(e) => handleChange('addressWard', e.target.value)}
              />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>District</label>
              <input
                type="text"
                value={form.addressDistrict}
                onChange={(e) => handleChange('addressDistrict', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label>City / Province</label>
              <input
                type="text"
                value={form.addressCity}
                onChange={(e) => handleChange('addressCity', e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        <div className={styles.row}>
          <div className={styles.field}>
            <label>Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="024-xxxxxxx"
            />
          </div>
          <div className={styles.field}>
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="info@school.edu.vn"
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label>Website</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://school.edu.vn"
            />
          </div>
          <div className={styles.field}>
            <label>Principal</label>
            <input
              type="text"
              value={form.principalName}
              onChange={(e) => handleChange('principalName', e.target.value)}
              placeholder="Principal's full name"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label>Education Level</label>
          <select
            value={form.schoolType}
            onChange={(e) => handleChange('schoolType', e.target.value)}
          >
            <option value="primary">Primary School</option>
            <option value="secondary">Middle School</option>
            <option value="high">High School</option>
            <option value="university">University</option>
            <option value="other">Other</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}
