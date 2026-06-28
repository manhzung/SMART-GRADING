import { useEffect, useState } from 'react';
import { useAuthStore } from '../../presentation/store/authStore';
import { useNavigate } from 'react-router-dom';
import { useSchoolManagementStore } from '../../presentation/store/schoolManagementStore';
import { Building2, Check, X, Plus, Edit, Trash2, Clock, Search, Users } from 'lucide-react';
import ConfirmDialog from '../../presentation/components/shared/ConfirmDialog';
import styles from './SchoolsPage.module.css';
import type { School } from '../../types';

export default function SchoolsPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const {
    schools,
    pendingSchools,
    isLoading,
    fetchSchools,
    fetchPendingSchools,
    approveSchool,
    rejectSchool,
    deleteSchool,
    totalPending,
    totalSchools,
  } = useSchoolManagementStore();

  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/', { replace: true });
      return;
    }
    fetchSchools();
    fetchPendingSchools();
  }, [user, navigate, fetchSchools, fetchPendingSchools]);

  const handleDeleteClick = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSchoolId) return;
    setProcessing(true);
    try {
      await deleteSchool(selectedSchoolId);
      setDeleteDialogOpen(false);
      setSelectedSchoolId(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectClick = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedSchoolId) return;
    setProcessing(true);
    try {
      await rejectSchool(selectedSchoolId, rejectReason);
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedSchoolId(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveSchool = async (schoolId: string) => {
    setProcessing(true);
    try {
      await approveSchool(schoolId);
    } finally {
      setProcessing(false);
    }
  };

  const filteredSchools = schools.filter((school) =>
    school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    school.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderSchoolRow = (school: School) => {
    const addr = school.address as { street?: string; ward?: string; district?: string; city?: string } | string | undefined;
    const addrText = typeof addr === 'string'
      ? addr
      : addr
        ? [addr.street, addr.ward, addr.district, addr.city].filter(Boolean).join(', ')
        : '-';
    return (
    <tr key={school._id} className={styles.row}>
      <td className={styles.schoolCell}>
        <Building2 size={18} className={styles.icon} />
        <div>
          <strong>{school.name}</strong>
          <span>{school.code || '-'}</span>
        </div>
      </td>
      <td>{addrText || '-'}</td>
      <td>
        <div className={styles.contactCell}>
          {school.email && <span>{school.email}</span>}
          {school.phone && <span>{school.phone}</span>}
        </div>
      </td>
      <td>
        <span className={`${styles.status} ${school.isActive ? styles.active : styles.inactive}`}>
          {school.isActive ? 'Hoạt động' : 'Không hoạt động'}
        </span>
      </td>
      <td>
        <div className={styles.actions}>
          <button className={styles.btnEdit} title="Sửa">
            <Edit size={16} />
          </button>
          <button
            className={styles.btnDelete}
            title="Xóa"
            onClick={() => handleDeleteClick(school._id)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
    );
  };

  const renderPendingSchoolRow = (school: any) => (
    <tr key={school.id || school._id} className={styles.row}>
      <td className={styles.schoolCell}>
        <Building2 size={18} className={styles.icon} />
        <div>
          <strong>{school.name}</strong>
          <span>{school.code}</span>
        </div>
      </td>
      <td>
        <div className={styles.contactCell}>
          {school.email && <span>{school.email}</span>}
          {school.phone && <span>{school.phone}</span>}
          {school.address && (
            <span>
              {school.address.street}, {school.address.ward}, {school.address.district}
            </span>
          )}
        </div>
      </td>
      <td>
        <span className={styles.pendingBadge}>
          <Clock size={14} />
          Chờ duyệt
        </span>
      </td>
      <td>
        <div className={styles.actions}>
          <button
            className={styles.btnApprove}
            onClick={() => handleApproveSchool(school.id || school._id)}
            disabled={processing}
          >
            <Check size={16} />
            Duyệt
          </button>
          <button
            className={styles.btnReject}
            onClick={() => handleRejectClick(school.id || school._id)}
            disabled={processing}
          >
            <X size={16} />
            Từ chối
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>
          <Building2 size={28} />
          Quản lý Trường học
        </h1>
        <button className={styles.btnPrimary}>
          <Plus size={18} />
          Thêm trường
        </button>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Building2 size={16} />
          Tất cả trường ({totalSchools})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'pending' ? styles.active : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <Clock size={16} />
          Chờ duyệt
          {totalPending > 0 && <span className={styles.tabBadge}>{totalPending}</span>}
        </button>
      </div>

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>Đang tải...</div>
        ) : activeTab === 'all' ? (
          <>
            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Tìm kiếm trường..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className={styles.btnSecondary}>
                <Users size={16} />
                Quản lý School-Admin
              </button>
            </div>

            {filteredSchools.length === 0 ? (
              <div className={styles.empty}>
                <Building2 size={48} />
                <p>Không có trường học nào</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Tên trường</th>
                      <th>Địa chỉ</th>
                      <th>Liên hệ</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>{filteredSchools.map(renderSchoolRow)}</tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
            {pendingSchools.length === 0 ? (
              <div className={styles.empty}>
                <Clock size={48} />
                <p>Không có trường nào đang chờ duyệt</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Tên trường</th>
                      <th>Thông tin</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>{pendingSchools.map(renderPendingSchoolRow)}</tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Xóa trường học"
        message="Bạn có chắc chắn muốn xóa trường học này? Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        danger
        submitting={processing}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedSchoolId(null);
        }}
      />

      <ConfirmDialog
        open={rejectDialogOpen}
        title="Từ chối trường học"
        message="Bạn có chắc chắn muốn từ chối trường học này?"
        confirmLabel="Từ chối"
        cancelLabel="Hủy"
        danger
        submitting={processing}
        onConfirm={handleRejectConfirm}
        onCancel={() => {
          setRejectDialogOpen(false);
          setRejectReason('');
          setSelectedSchoolId(null);
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
