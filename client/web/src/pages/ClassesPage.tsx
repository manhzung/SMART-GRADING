import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Microscope,
  Globe,
  Palette,
  BookOpen,
  Users,
  MoreVertical,
  Plus,
  Search,
  ChevronDown,
  Filter,
  X,
  Edit2,
  Trash2,
  AlertCircle,
  Crown,
  BookMarked
} from 'lucide-react';
import { useClassStore } from '../presentation/store/classStore';
import type { ClassItem } from '../presentation/store/classStore';
import { useDashboardStore } from '../presentation/store/dashboardStore';
import { useAuthStore } from '../presentation/store/authStore';
import styles from './ClassesPage.module.css';

// Helper to determine the best icon for each subject
function getSubjectIcon(subjectName: string = '') {
  const name = subjectName.toLowerCase();
  if (name.includes('math') || name.includes('literature') || name.includes('lit')) {
    return BookOpen;
  }
  if (name.includes('biology') || name.includes('bio') || name.includes('chemistry') || name.includes('chem') || name.includes('physics') || name.includes('phy')) {
    return Microscope;
  }
  if (name.includes('english') || name.includes('eng') || name.includes('history') || name.includes('his') || name.includes('geography') || name.includes('geo')) {
    return Globe;
  }
  if (name.includes('technology') || name.includes('tech') || name.includes('computer') || name.includes('art') || name.includes('drawing')) {
    return Palette;
  }
  return GraduationCap;
}

export default function ClassesPage() {
  const {
    classes,
    teachers,
    isLoading,
    error,
    fetchClasses,
    fetchTeachers,
    createClass,
    updateClass,
    deleteClass,
    clearError
  } = useClassStore();

  const { fetchDashboard } = useDashboardStore();
  const user = useAuthStore((s) => s.user);
  const userRole = user?.role || 'teacher';
  const isAdmin = userRole === 'admin';
  const isTeacher = userRole === 'teacher';

  // Determine the current user's relationship to a class
  const getClassRole = (cls: ClassItem) => {
    const homeroomId = typeof cls.homeroomTeacherId === 'object' && cls.homeroomTeacherId
      ? (cls.homeroomTeacherId as any)._id : cls.homeroomTeacherId;
    const subjectTeacherIds = (cls.subjectTeachers || []).map(
      (st: any) => typeof st.teacherId === 'object' ? st.teacherId?._id : st.teacherId
    );

    if (homeroomId === user?.id) return 'homeroom';
    if (subjectTeacherIds.includes(user?.id)) return 'subject';
    return null;
  };

  console.log('Classes in ClassesPage:', classes);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [academicYearFilter, setAcademicYearFilter] = useState('All Academic Years');
  const [sortOrder, setSortOrder] = useState<'A-Z' | 'Z-A'>('A-Z');
  const [sortMode, setSortMode] = useState<'name' | 'students'>('name');

  // Filter dropdown state
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  
  // Modal Form Fields
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    academicYear: '2025-2026',
    homeroomTeacherId: user?.id || ''
  });

  const yearDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchClasses({ limit: 100 });
    fetchTeachers();
    fetchDashboard();
  }, [fetchClasses, fetchTeachers, fetchDashboard]);

  // Click outside handler for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
        setShowYearDropdown(false);
      }
      if (activeMenuId && !(event.target as HTMLElement).closest('.' + styles.menuBtn) && !(event.target as HTMLElement).closest('.' + styles.actionMenu)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);

  // Get distinct academic years for the filter dropdown
  const academicYears = ['All Academic Years', ...Array.from(new Set(classes.map(c => c.academicYear))).filter(Boolean)];

  const handleOpenCreateModal = () => {
    setEditingClass(null);
    const defaultTeacherId = user?.id || teachers[0]?.id || '';
    setFormData({
      name: '',
      code: '',
      academicYear: '2025-2026',
      homeroomTeacherId: defaultTeacherId,
    });
    clearError();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cls: ClassItem) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      code: cls.code,
      academicYear: cls.academicYear,
      homeroomTeacherId: (cls.homeroomTeacherId as any)?._id || (cls.homeroomTeacherId as any)?.id || ''
    });
    clearError();
    setIsModalOpen(true);
  };

  const handleDeleteClass = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      try {
        await deleteClass(id);
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let created;
      if (editingClass) {
        const { homeroomTeacherId, ...rest } = formData;
        await updateClass(editingClass._id, { ...rest, homeroomTeacherId: homeroomTeacherId || undefined, gradeLevel: undefined });
      } else {
        const payload = {
          ...formData,
          homeroomTeacherId: formData.homeroomTeacherId || user?.id || undefined,
          gradeLevel: undefined,
        };
        created = await createClass(payload);
      }

      setIsModalOpen(false);

      if (created) {
        const { classes, fetchClasses, pagination } = useClassStore.getState();
        const exists = classes.some((item) => item._id === created._id);
        if (!exists) {
          useClassStore.setState((state) => ({
            classes: [...state.classes, created],
          }));
        }
        await fetchClasses({ page: pagination.page, limit: pagination.limit });
      }
    } catch (err) {
      console.error('Form submission failed:', err);
    }
  };

  // Filter & Sort Logic
  const filteredClasses = classes
    .filter(cls => {
      const matchesSearch =
        cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.code.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesYear =
        academicYearFilter === 'All Academic Years' ||
        cls.academicYear === academicYearFilter;

      return matchesSearch && matchesYear;
    })
    .sort((a, b) => {
      if (sortMode === 'name') {
        return sortOrder === 'A-Z'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        // Sort by student count
        const aCount = a.studentIds?.length || 0;
        const bCount = b.studentIds?.length || 0;
        return bCount - aCount; // Always descending student count when clicked
      }
    });

  const roleLabel = userRole === 'admin' ? 'SUPER ADMIN' : userRole === 'school-admin' ? 'SCHOOL ADMIN' : userRole.toUpperCase();
  const roleBadgeClass = userRole === 'admin' ? 'roleBadgeAdmin' : userRole === 'school-admin' ? 'roleBadgeSchool' : userRole === 'teacher' ? 'roleBadgeTeacher' : 'roleBadgeStudent';

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <span className={`roleBadge ${roleBadgeClass}`}>{roleLabel}</span>
          <h1 className={styles.title}>{isAdmin ? 'Manage Classes' : 'My Classes'}</h1>
          <p className={styles.subtitle}>
            {isAdmin ? 'Manage class list and whole-school teaching assignments' : 'Manage your classes and student groups'}
          </p>
        </div>
        <button className={styles.createBtn} onClick={handleOpenCreateModal}>
          <Plus size={18} />
          <span>Add Class</span>
        </button>
      </div>

      {/* Toolbar filters */}
      <div className={styles.toolbar}>
        <div className={styles.filtersLeft}>
          {/* Search bar inside toolbar to match screen design */}
          <div className={styles.filterBtn} style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', minWidth: '240px' }}>
            <Search size={16} style={{ color: '#9ca3af', marginRight: '8px' }} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search class records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Academic Years Selector */}
          <div className={styles.filterBtn} ref={yearDropdownRef}>
            <button
              onClick={() => setShowYearDropdown(!showYearDropdown)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: 'inherit', font: 'inherit' }}
            >
              <Filter size={15} />
              <span>{academicYearFilter}</span>
              <ChevronDown size={14} />
            </button>
            {showYearDropdown && (
              <div className={styles.filterDropdown}>
                {academicYears.map((year) => (
                  <button
                    key={year}
                    className={`${styles.dropdownItem} ${academicYearFilter === year ? styles.dropdownItemActive : ''}`}
                    onClick={() => {
                      setAcademicYearFilter(year);
                      setShowYearDropdown(false);
                    }}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort by Name toggle */}
          <button
            className={`${styles.filterBtn} ${sortMode === 'name' ? styles.filterBtnActive : ''}`}
            onClick={() => {
              setSortMode('name');
              setSortOrder(sortOrder === 'A-Z' ? 'Z-A' : 'A-Z');
            }}
          >
            <span>Sort by Name {sortMode === 'name' && (sortOrder === 'A-Z' ? '(A-Z)' : '(Z-A)')}</span>
          </button>

          {/* Sort by Student Count */}
          <button
            className={`${styles.filterBtn} ${sortMode === 'students' ? styles.filterBtnActive : ''}`}
            onClick={() => {
              setSortMode('students');
            }}
          >
            <Users size={15} />
            <span>Student Count</span>
          </button>
        </div>

        <span className={styles.showingCount}>
          Showing {filteredClasses.length} {filteredClasses.length === 1 ? 'Class' : 'Classes'}
        </span>
      </div>

      {/* Content View: Loading/Error or Grid */}
      {isLoading && classes.length === 0 ? (
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <p>Loading class list...</p>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {filteredClasses.map((cls) => {
              // Extract subject details
              const subjectInfo = (cls.subjectTeachers && cls.subjectTeachers.length > 0)
                ? (cls.subjectTeachers[0] as any)?.subjectId
                : null;
              const subjectName = typeof subjectInfo === 'object' && subjectInfo ? subjectInfo.name || 'Unassigned' : 'Unassigned';
              const subjectColor = typeof subjectInfo === 'object' && subjectInfo ? subjectInfo.color || '#3b82f6' : '#3b82f6';
              const SubjectIcon = getSubjectIcon(subjectName);
              const classRole = getClassRole(cls);

              let subjectDisplay = subjectName;
              if (subjectDisplay === 'Unassigned' || !subjectDisplay) {
                subjectDisplay = classRole === 'homeroom' ? 'Homeroom Class' : 'No subject assigned';
              }

              return (
                <div key={cls._id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    {/* Dynamic Icon with light transparent background */}
                    <div
                      className={styles.iconWrapper}
                      style={{
                        backgroundColor: `${subjectColor}15`,
                        color: subjectColor,
                      }}
                    >
                      <SubjectIcon size={22} />
                    </div>

                    {/* Three dots menu - only for admin */}
                    {isAdmin && (
                      <>
                        <button
                          className={styles.menuBtn}
                          onClick={() => setActiveMenuId(activeMenuId === cls._id ? null : cls._id)}
                        >
                          <MoreVertical size={18} />
                        </button>

                        {/* Card Options Dropdown */}
                        {activeMenuId === cls._id && (
                          <div className={styles.actionMenu}>
                            <button
                              className={styles.actionItem}
                              onClick={() => {
                                handleOpenEditModal(cls);
                                setActiveMenuId(null);
                              }}
                            >
                              <Edit2 size={13} />
                              <span>Edit Class</span>
                            </button>
                            <button
                              className={`${styles.actionItem} ${styles.deleteItem}`}
                              onClick={() => {
                                handleDeleteClass(cls._id);
                                setActiveMenuId(null);
                              }}
                            >
                              <Trash2 size={13} />
                              <span>Delete Class</span>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className={styles.classInfo}>
                    <Link to={`/classes/${cls._id}`} className={styles.classTitleLink}>
                      <h3 className={styles.className}>{cls.name}</h3>
                    </Link>
                    {/* Role badges */}
                    {isTeacher && classRole && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                        {classRole === 'homeroom' && (
                          <span className={styles.roleBadge} style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
                            <Crown size={10} />
                            Homeroom
                          </span>
                        )}
                        {classRole === 'subject' && (
                          <span className={styles.roleBadge} style={{ backgroundColor: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd' }}>
                            <BookMarked size={10} />
                            Subject
                          </span>
                        )}
                      </div>
                    )}
                    <p className={styles.classSubject}>{subjectDisplay}</p>
                  </div>

                  <div className={styles.cardDivider} />

                  <div className={styles.cardFooter}>
                    <span className={styles.studentCount}>
                      <Users size={14} className={styles.studentIcon} />
                      <span>{cls.studentIds?.length || 0} Students</span>
                    </span>
                    <span className={styles.yearBadge}>{cls.academicYear}</span>
                  </div>
                </div>
              );
            })}

            {/* Dash Card for Creating new group */}
            <div className={styles.dashedCard} onClick={handleOpenCreateModal}>
                <div className={styles.dashedIconWrapper}>
                  <Plus size={24} />
                </div>
                <h4 className={styles.dashedTitle}>Create New Group</h4>
                <p className={styles.dashedSub}>Assign students and subjects</p>
              </div>
          </div>

          {/* Bottom Split Layout */}
          <div className={styles.bottomSection}>
            {/* Left: Attendance Banner */}
            <div className={styles.attendanceBanner}>
              <div className={styles.bannerContent}>
                <h2 className={styles.bannerTitle}>Automate Attendance Tracking</h2>
                <p className={styles.bannerText}>
                  EduGrade Pro now supports biometric and mobile check-ins for all your registered classes. Reduce manual entry time by 80%.
                </p>
                <button className={styles.upgradeBtn} onClick={() => alert('Upgrade subscription functionality is under development.')}>
                  Upgrade Plan
                </button>
              </div>
              <div className={styles.bannerPattern} />
              <div className={styles.bannerPatternTwo} />
            </div>

          </div>
        </>
      )}

      {/* Modal - Create/Edit Class */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingClass ? 'Edit Class Details' : 'Create New Class'}</h2>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className={styles.modalForm}>
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Class Name */}
              <div className={styles.formGroup}>
                <label htmlFor="className">Class Name *</label>
                <input
                  type="text"
                  id="className"
                  className={styles.formInput}
                  placeholder="e.g. Class 12A1"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Class Code */}
              <div className={styles.formGroup}>
                <label htmlFor="classCode">Class Code *</label>
                <input
                  type="text"
                  id="classCode"
                  className={styles.formInput}
                  placeholder="e.g. C12A1"
                  required
                  disabled={!!editingClass} // Class code cannot be changed once created to prevent unique key violations
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>

              {/* Academic Year */}
              <div className={styles.formGroup}>
                <label htmlFor="academicYear">Academic Year *</label>
                <select
                  id="academicYear"
                  className={styles.formInput}
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                >
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
              </div>

              {/* Homeroom Teacher */}
              <div className={styles.formGroup}>
                <label htmlFor="teacher">Homeroom Teacher</label>
                <input
                  id="teacher"
                  className={styles.formInput}
                  value={user?.name || ''}
                  readOnly
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                  {isLoading ? 'Saving...' : editingClass ? 'Save Changes' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
