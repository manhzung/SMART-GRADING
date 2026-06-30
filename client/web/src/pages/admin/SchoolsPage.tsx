import { useEffect, useState } from 'react';
import { useAuthStore } from '../../presentation/store/authStore';
import { useNavigate } from 'react-router-dom';
import { useSchoolManagementStore } from '../../presentation/store/schoolManagementStore';
import { Building2, Check, X, Plus, Edit, Trash2, Clock, Search, Eye } from 'lucide-react';
import ConfirmDialog from '../../presentation/components/shared/ConfirmDialog';
import SchoolFormModal from '../../presentation/components/admin/SchoolFormModal';
import SchoolDetailModal from '../../presentation/components/admin/SchoolDetailModal';
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
    createSchool,
    updateSchool,
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

  const [formOpen, setFormOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSchool, setDetailSchool] = useState<School | null>(null);

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

  const handleOpenCreate = () => {
    setEditingSchool(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (school: School) => {
    setEditingSchool(school);
    setFormOpen(true);
  };

  const handleOpenDetail = (school: School) => {
    setDetailSchool(school);
    setDetailOpen(true);
  };

  const handleFormSubmit = async (data: Partial<School>) => {
    setFormSubmitting(true);
    try {
      if (editingSchool) {
        await updateSchool(editingSchool._id, data);
      } else {
        await createSchool(data);
      }
      setFormOpen(false);
      setEditingSchool(null);
    } finally {
      setFormSubmitting(false);
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
          {school.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td>
        <div className={styles.actions}>
          <button
            className={styles.btnView}
            title="View Details / School Admins"
            onClick={() => handleOpenDetail(school)}
          >
            <Eye size={16} />
          </button>
          <button
            className={styles.btnEdit}
            title="Edit"
            onClick={() => handleOpenEdit(school)}
          >
            <Edit size={16} />
          </button>
          <button
            className={styles.btnDelete}
            title="Delete"
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
          Pending Approval
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
            Approve
          </button>
          <button
            className={styles.btnReject}
            onClick={() => handleRejectClick(school.id || school._id)}
            disabled={processing}
          >
            <X size={16} />
            Reject
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
          School Management
        </h1>
        <button className={styles.btnPrimary} onClick={handleOpenCreate}>
          <Plus size={18} />
          Add School
        </button>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Building2 size={16} />
          All Schools ({totalSchools})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'pending' ? styles.active : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <Clock size={16} />
          Pending Approval
          {totalPending > 0 && <span className={styles.tabBadge}>{totalPending}</span>}
        </button>
      </div>

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>Loading...</div>
        ) : activeTab === 'all' ? (
          <>
            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search schools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {filteredSchools.length === 0 ? (
              <div className={styles.empty}>
                <Building2 size={48} />
                <p>No schools found</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>School Name</th>
                      <th>Address</th>
                      <th>Contact</th>
                      <th>Status</th>
                      <th>Actions</th>
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
                <p>No pending schools</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>School Name</th>
                      <th>Information</th>
                      <th>Status</th>
                      <th>Actions</th>
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
        title="Delete School"
        message="Are you sure you want to delete this school? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
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
        title="Reject School"
        message="Are you sure you want to reject this school?"
        confirmLabel="Reject"
        cancelLabel="Cancel"
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
          <label>Rejection reason (optional):</label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter rejection reason..."
            rows={3}
          />
        </div>
      </ConfirmDialog>

      <SchoolFormModal
        open={formOpen}
        school={editingSchool}
        submitting={formSubmitting}
        onClose={() => {
          setFormOpen(false);
          setEditingSchool(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <SchoolDetailModal
        open={detailOpen}
        school={detailSchool}
        onClose={() => {
          setDetailOpen(false);
          setDetailSchool(null);
        }}
      />
    </div>
  );
}
