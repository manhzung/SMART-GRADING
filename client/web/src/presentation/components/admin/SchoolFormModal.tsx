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
    if (!form.name.trim()) return setError('Tên trường là bắt buộc');
    if (!school && !form.code.trim()) return setError('Mã trường là bắt buộc');

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
      setError(err?.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <Modal
      open={open}
      title={school ? 'Sửa thông tin trường' : 'Thêm trường học mới'}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={styles.btnCancel} onClick={onClose} disabled={submitting}>
            Hủy
          </button>
          <button
            type="submit"
            form="school-form"
            className={styles.btnSubmit}
            disabled={submitting}
          >
            {submitting ? 'Đang lưu...' : school ? 'Cập nhật' : 'Tạo trường'}
          </button>
        </>
      }
    >
      <form id="school-form" onSubmit={handleSubmit} className={styles.form}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.row}>
          <div className={styles.field}>
            <label>Tên trường *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="VD: THPT Chu Văn An"
              required
            />
          </div>
          <div className={styles.field}>
            <label>Mã trường {!school && '*'}</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
              placeholder="VD: CVAN"
              disabled={!!school}
              required={!school}
            />
            {school && <span className={styles.hint}>Mã trường không thể thay đổi</span>}
          </div>
        </div>

        <fieldset className={styles.fieldGroup}>
          <legend>Địa chỉ</legend>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Số nhà / Đường</label>
              <input
                type="text"
                value={form.addressStreet}
                onChange={(e) => handleChange('addressStreet', e.target.value)}
                placeholder="Số 10, đường ABC"
              />
            </div>
            <div className={styles.field}>
              <label>Phường/Xã</label>
              <input
                type="text"
                value={form.addressWard}
                onChange={(e) => handleChange('addressWard', e.target.value)}
              />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Quận/Huyện</label>
              <input
                type="text"
                value={form.addressDistrict}
                onChange={(e) => handleChange('addressDistrict', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label>Tỉnh/Thành phố</label>
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
            <label>Số điện thoại</label>
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
            <label>Hiệu trưởng</label>
            <input
              type="text"
              value={form.principalName}
              onChange={(e) => handleChange('principalName', e.target.value)}
              placeholder="Họ và tên hiệu trưởng"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label>Cấp học</label>
          <select
            value={form.schoolType}
            onChange={(e) => handleChange('schoolType', e.target.value)}
          >
            <option value="primary">Tiểu học</option>
            <option value="secondary">THCS</option>
            <option value="high">THPT</option>
            <option value="university">Đại học</option>
            <option value="other">Khác</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}
