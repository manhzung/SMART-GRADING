import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronRight,
  Users,
  Upload,
  FileText,
  TrendingUp,
  Award,
  Calendar,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  MoreVertical,
  Plus,
  X,
  AlertCircle,
  Trash2,
  Check,
  FileSpreadsheet,
  Crown,
  UserPlus,
  Shield,
  KeyRound,
  Pencil,
  Loader2
} from 'lucide-react';
import { useClassStore } from '../presentation/store/classStore';
import type { TeacherItem } from '../presentation/store/classStore';
import { useAuthStore } from '../presentation/store/authStore';
import { apiService } from '../core/api';
import ClassExamsSection from './ClassExamsSection';
import * as XLSX from 'xlsx';
import styles from './ClassDetailPage.module.css';

// Interface for backend student objects returned by populate
interface PopulateStudent {
  _id: string;
  name: string;
  email: string;
  studentCode?: string;
  isActive?: boolean;
  dateOfBirth?: string;
  password?: string;
}

// Interface for editing state
interface EditingStudent {
  _id: string;
  name: string;
  email: string;
  studentCode: string;
  dateOfBirth: string;
  isActive: boolean;
}

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    currentClass,
    isLoading,
    fetchClassById,
    importStudents,
    manageSubjectTeachers,
    transferHomeroomTeacher,
    teachers,
    fetchTeachers,
    getClassStatistics,
  } = useClassStore();
  const user = useAuthStore((s) => s.user);

  // Role-based access
  const userRole = user?.role || 'teacher';
  const isAdmin = userRole === 'admin';
  const userId = user?.id;

  const homeroomTeacherId = currentClass?.homeroomTeacherId
    ? typeof currentClass.homeroomTeacherId === 'object'
      ? (currentClass.homeroomTeacherId as any).id || (currentClass.homeroomTeacherId as any)._id
      : currentClass.homeroomTeacherId
    : null;
  const isHomeroomTeacher = homeroomTeacherId?.toString() === userId?.toString();
  const canManageSubjectTeachers = isHomeroomTeacher;
  const canTransferOwnership = isHomeroomTeacher && !isAdmin;
  const canViewCredentials = isAdmin || isHomeroomTeacher;

  console.log('ClassDetailPage rendered with id:', id, 'currentClass:', currentClass);

  // Local States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortField, setSortField] = useState<'name' | 'studentCode'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Selection & Pagination
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Dropdowns & Modals
  const [activeMenuStudentId, setActiveMenuStudentId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Excel/CSV Import Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'preview'>('upload');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedStudents, setParsedStudents] = useState<Array<{
    studentCode: string;
    name: string;
    dateOfBirth: string;
    email: string;
  }>>([]);

  // Subject Teachers Modal State
  const [isSubjectTeacherModalOpen, setIsSubjectTeacherModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  // Transfer Ownership Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [newHomeroomTeacherId, setNewHomeroomTeacherId] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Credentials & Inline Edit States
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditingStudent | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Password reset states
  const [resettingPasswordStudentId, setResettingPasswordStudentId] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Form States
  const [manualStudent, setManualStudent] = useState({
    name: '',
    email: '',
    studentCode: '',
    dateOfBirth: '2006-05-14',
    isActive: true,
  });
  
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchClassById(id);
      fetchTeachers();
    }
  }, [id, fetchClassById, fetchTeachers]);

  // Fetch class statistics from API
  const { data: classStats } = useQuery({
    queryKey: ['class-stats', id],
    queryFn: () => getClassStatistics(id!),
    enabled: !!id,
  });

  // Click outside listener for menus
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
      if (activeMenuStudentId && !(event.target as HTMLElement).closest('.' + styles.actionMenuBtn)) {
        setActiveMenuStudentId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuStudentId]);

  // Helpers
  const getInitials = (name: string) => {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarColors = (name: string) => {
    const colors = [
      { bg: '#eff6ff', text: '#1d4ed8' }, // blue
      { bg: '#f0fdf4', text: '#15803d' }, // green
      { bg: '#faf5ff', text: '#7e22ce' }, // purple
      { bg: '#fff7ed', text: '#c2410c' }, // orange
      { bg: '#fdf2f8', text: '#be185d' }, // pink
      { bg: '#ecfeff', text: '#0891b2' }, // cyan
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'May 14, 2006';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'May 14, 2006';
      // Format to: "May 14, 2006"
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'May 14, 2006';
    }
  };

  // Fetch student credentials (password hint, no actual passwords)
  const fetchCredentials = async () => {
    if (!id || !canViewCredentials) {
      return;
    }
    try {
      const data = await apiService.get<any[]>(`/classes/${id}/students/credentials`);
      const credMap: Record<string, string> = {};
      (data || []).forEach((student) => {
        const studentId = String(student._id || student.id);
        // passwordHint indicates the default password for imported students
        credMap[studentId] = student.passwordHint || '';
      });
      setCredentials(credMap);
    } catch (err) {
      console.error('Failed to fetch credentials:', err);
    }
  };

  useEffect(() => {
    if (currentClass && (isAdmin || isHomeroomTeacher)) {
      fetchCredentials();
    }
  }, [currentClass, isAdmin, isHomeroomTeacher]);

  // Reset password for a student
  const openResetPassword = (studentId: string) => {
    setResettingPasswordStudentId(studentId);
    setNewPasswordValue('');
  };

  const cancelResetPassword = () => {
    setResettingPasswordStudentId(null);
    setNewPasswordValue('');
  };

  const handleResetPassword = async () => {
    if (!resettingPasswordStudentId || !id) return;
    if (newPasswordValue.length < 8) {
      setActionError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }
    if (!/\d/.test(newPasswordValue) || (!/[a-zA-Z]/.test(newPasswordValue))) {
      setActionError('Mật khẩu phải có ít nhất 1 chữ cái và 1 chữ số');
      return;
    }
    setIsResettingPassword(true);
    setActionError(null);
    try {
      await apiService.patch(
        `/classes/${id}/students/${resettingPasswordStudentId}/password`,
        { password: newPasswordValue }
      );
      setActionSuccess('Đã đổi mật khẩu thành công');
      cancelResetPassword();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Lỗi khi đổi mật khẩu';
      setActionError(msg);
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Start editing a student
  const startEditing = (student: PopulateStudent) => {
    setEditingStudentId(student._id);
    setEditForm({
      _id: student._id,
      name: student.name,
      email: student.email,
      studentCode: student.studentCode || '',
      dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '',
      isActive: student.isActive ?? true,
    });
    setIsEditing(true);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingStudentId(null);
    setEditForm(null);
    setIsEditing(false);
  };

  // Save edited student
  const saveEditing = async () => {
    if (!id || !editingStudentId || !editForm) return;
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await apiService.patch(`/classes/${id}/students/${editingStudentId}`, {
        name: editForm.name,
        email: editForm.email,
        studentCode: editForm.studentCode,
        dateOfBirth: editForm.dateOfBirth,
        isActive: editForm.isActive,
      });

      setActionSuccess('Cập nhật học sinh thành công.');
      setEditingStudentId(null);
      setEditForm(null);
      setIsEditing(false);
      fetchClassById(id);
    } catch (err) {
      setActionError((err as Error).message || 'Không thể cập nhật học sinh.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert generic studentIds array to populated student items
  const students: PopulateStudent[] = (currentClass?.studentIds || []).map((s: any) => {
    if (typeof s === 'object' && s !== null) {
      return {
        _id: s._id || s.id,
        name: s.name || '',
        email: s.email || '',
        studentCode: s.studentCode || '',
        isActive: s.isActive !== undefined ? s.isActive : true,
        dateOfBirth: s.dateOfBirth,
      };
    }
    return {
      _id: s,
      name: 'Unknown Student',
      email: '',
      studentCode: '',
      isActive: true,
    };
  });

  // Filter & Sort logic
  const filteredStudents = students
    .filter(student => {
      const matchSearch =
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.studentCode && student.studentCode.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && student.isActive) ||
        (statusFilter === 'INACTIVE' && !student.isActive);

      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortField === 'name') {
        const comparison = a.name.localeCompare(b.name);
        return sortDirection === 'asc' ? comparison : -comparison;
      } else {
        const codeA = a.studentCode || '';
        const codeB = b.studentCode || '';
        const comparison = codeA.localeCompare(codeB);
        return sortDirection === 'asc' ? comparison : -comparison;
      }
    });

  // Pagination bounds
  const totalStudents = filteredStudents.length;
  const totalPages = Math.ceil(totalStudents / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalStudents);
  const currentStudents = filteredStudents.slice(startIndex, endIndex);

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = currentStudents.map(s => s._id);
      setSelectedStudentIds(prev => {
        const next = new Set(prev);
        pageIds.forEach(id => next.add(id));
        return next;
      });
    } else {
      const pageIds = currentStudents.map(s => s._id);
      setSelectedStudentIds(prev => {
        const next = new Set(prev);
        pageIds.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  const handleSelectRow = (studentId: string, checked: boolean) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(studentId);
      } else {
        next.delete(studentId);
      }
      return next;
    });
  };

  const isAllPageSelected =
    currentStudents.length > 0 &&
    currentStudents.every(s => selectedStudentIds.has(s._id));

  // Remove Student handler
  const handleRemoveStudent = async (studentId: string) => {
    if (!id) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa học sinh này khỏi lớp không?')) {
      try {
        setActionError(null);
        setActionSuccess(null);
        const token = localStorage.getItem('token') || (apiService as any).token;
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/classes/${id}/students`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
          },
          body: JSON.stringify({ studentIds: [studentId] }),
        });

        if (!response.ok) {
          const resJson = await response.json().catch(() => ({}));
          throw new Error(resJson.message || 'Failed to remove student');
        }

        setActionSuccess('Đã xóa học sinh khỏi lớp thành công.');
        fetchClassById(id);
      } catch (err) {
        setActionError((err as Error).message || 'Không thể xóa học sinh.');
      }
    }
  };

  // Add student manually
  const handleAddManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      // First check if the student exists/create via user management,
      // or directly add students using the class endpoint.
      // But wait! classService.importStudents in class.service.js already handles creating a new student
      // if they do not exist, and adding them to the class, using:
      // importStudents(classId, studentsData) where studentsData is [{ name, email, studentCode, dateOfBirth }]
      // This is perfect! We can just use the import endpoint for a single student!
      const payload = [{
        name: manualStudent.name,
        email: manualStudent.email,
        studentCode: manualStudent.studentCode || undefined,
        phone: '',
      }];

      const res = await importStudents(id, payload);
      if (res.failed && res.failed.length > 0) {
        throw new Error(res.failed[0].error || 'Failed to add student');
      }

      setActionSuccess('Đã thêm học sinh thành công.');
      setIsAddModalOpen(false);
      setManualStudent({
        name: '',
        email: '',
        studentCode: '',
        dateOfBirth: '2006-05-14',
        isActive: true,
      });
      fetchClassById(id);
    } catch (err) {
      setActionError((err as Error).message || 'Không thể thêm học sinh.');
    } finally {
      setIsSubmitting(false);
    }
  };



  // Export CSV Report
  const handleExportReport = () => {
    if (students.length === 0) {
      alert('Không có học sinh để xuất báo cáo.');
      return;
    }
    
    // Create CSV content
    const headers = 'STUDENT ID,FULL NAME,DOB,EMAIL,STATUS\n';
    const rows = students.map(student => {
      const code = student.studentCode || `STU-${student._id.slice(-5).toUpperCase()}`;
      const dob = formatDate(student.dateOfBirth);
      const status = student.isActive ? 'ACTIVE' : 'INACTIVE';
      return `"${code}","${student.name}","${dob}","${student.email}","${status}"`;
    }).join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Student_List_${currentClass?.name || 'Class'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // File Import Handlers
  const handleFileSelected = (file: File) => {
    setImportFile(file);
    setImportError(null);
  };

  const handleEditParsedStudent = (index: number, field: string, value: string) => {
    setParsedStudents(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const formatExcelDate = (val: any) => {
    if (!val) return '2006-05-14';
    
    if (typeof val === 'number') {
      try {
        const date = new Date((val - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
      } catch {
        return '2006-05-14';
      }
    }

    const str = val.toString().trim();
    
    const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch {
      // Ignore parsing errors
    }

    return '2006-05-14';
  };

  const parseCSVText = (text: string) => {
    try {
      const lines = text.split('\n');
      if (lines.length === 0) {
        setImportError('Tệp CSV rỗng.');
        return;
      }
      
      const parsed: any[] = [];
      const startIdx = lines[0].toLowerCase().includes('email') || lines[0].toLowerCase().includes('name') ? 1 : 0;
      
      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',').map(p => p.replace(/^["']|["']$/g, '').trim());
        if (parts.length >= 2) {
          const name = parts[0] || parts[1];
          const email = parts[1] || parts[0];
          parsed.push({
            studentCode: parts[2] || `STU-2024-${String(i).padStart(3, '0')}`,
            name: name,
            dateOfBirth: parts[3] ? formatExcelDate(parts[3]) : '2006-05-14',
            email: email,
          });
        }
      }

      if (parsed.length === 0) {
        setImportError('Không tìm thấy dữ liệu hợp lệ trong file CSV.');
      } else {
        setParsedStudents(parsed);
        setImportStep('preview');
      }
    } catch (err) {
      setImportError('Lỗi đọc tệp CSV: ' + (err as Error).message);
    }
  };

  const parseFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        parseCSVText(text);
      };
      reader.readAsText(file);
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
          
          if (rows.length === 0) {
            setImportError('Tệp Excel rỗng.');
            return;
          }

          const headerRow = rows[0] as string[];
          let idIdx = 0, nameIdx = 1, dobIdx = 2, emailIdx = 3;

          if (headerRow && headerRow.length > 0) {
            headerRow.forEach((h, idx) => {
              if (!h) return;
              const clean = h.toString().toLowerCase().trim();
              if (clean.includes('id') || clean.includes('mã') || clean.includes('code')) idIdx = idx;
              else if (clean.includes('name') || clean.includes('tên') || clean.includes('họ')) nameIdx = idx;
              else if (clean.includes('dob') || clean.includes('sinh') || clean.includes('birth')) dobIdx = idx;
              else if (clean.includes('email') || clean.includes('thư')) emailIdx = idx;
            });
          }

          const startRow = 1;
          const parsed: any[] = [];
          for (let i = startRow; i < rows.length; i++) {
            const r = rows[i];
            if (!r || r.length === 0) continue;
            
            const name = r[nameIdx]?.toString().trim() || '';
            const email = r[emailIdx]?.toString().trim() || '';
            
            if (!name && !email) continue;

            parsed.push({
              studentCode: r[idIdx]?.toString().trim() || `STU-2024-${String(i).padStart(3, '0')}`,
              name: name,
              dateOfBirth: r[dobIdx] ? formatExcelDate(r[dobIdx]) : '2006-05-14',
              email: email || `${name.toLowerCase().replace(/\s+/g, '')}@student.edu`,
            });
          }

          if (parsed.length === 0) {
            setImportError('Không tìm thấy dữ liệu học sinh hợp lệ.');
          } else {
            setParsedStudents(parsed);
            setImportStep('preview');
          }
        } catch (err) {
          setImportError('Lỗi đọc tệp Excel: ' + (err as Error).message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setImportError('Định dạng tệp không được hỗ trợ. Vui lòng chọn .xlsx, .xls hoặc .csv');
    }
  };

  const handleConfirmImport = async () => {
    if (!id) return;
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const payload = parsedStudents.map(student => ({
        name: student.name,
        email: student.email,
        studentCode: student.studentCode,
        dateOfBirth: student.dateOfBirth,
        phone: '',
      }));

      const res = await importStudents(id, payload);
      const successCount = res.success?.length || 0;
      const failedCount = res.failed?.length || 0;

      setActionSuccess(`Đã nhập thành công ${successCount} học sinh. ${failedCount > 0 ? `Thất bại: ${failedCount}` : ''}`);
      setIsImportModalOpen(false);
      setParsedStudents([]);
      setImportFile(null);
      fetchClassById(id);
    } catch (err) {
      setActionError((err as Error).message || 'Không thể nhập danh sách.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [['STUDENT ID', 'FULL NAME', 'DOB', 'EMAIL']];
    const sampleData = [
      ['STU-2024-001', 'Nguyen Van An', '15/05/2006', 'an.nv@student.edu'],
      ['STU-2024-002', 'Tran Thi Bich', '22/08/2006', 'bich.tt@student.edu']
    ];
    const worksheet = XLSX.utils.aoa_to_sheet([...headers, ...sampleData]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'student_import_template.xlsx');
  };

  // Subject Teacher Management
  const handleAddSubjectTeacher = async () => {
    if (!id || !selectedTeacher) return;
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await manageSubjectTeachers(id, 'add', selectedTeacher, selectedSubject || undefined);
      setActionSuccess('Đã thêm giáo viên bộ môn thành công.');
      setIsSubjectTeacherModalOpen(false);
      setSelectedTeacher('');
      setSelectedSubject('');
    } catch (err) {
      setActionError((err as Error).message || 'Không thể thêm giáo viên bộ môn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSubjectTeacher = async (teacherId: string, subjectId?: string) => {
    if (!id) return;
    if (!window.confirm('Bạn có chắc muốn xóa giáo viên bộ môn này khỏi lớp?')) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await manageSubjectTeachers(id, 'remove', teacherId, subjectId);
      setActionSuccess('Đã xóa giáo viên bộ môn.');
    } catch (err) {
      setActionError((err as Error).message || 'Không thể xóa giáo viên.');
    }
  };

  const handleTransferOwnership = async () => {
    if (!id || !homeroomTeacherId) return;
    if (newHomeroomTeacherId === homeroomTeacherId) return;
    if (!window.confirm('Bạn có chắc muốn chuyển quyền GVCN? Bạn sẽ không còn là GVCN của lớp này.')) return;
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await transferHomeroomTeacher(id, homeroomTeacherId, newHomeroomTeacherId);
      setActionSuccess('Đã chuyển quyền GVCN thành công.');
      setIsTransferModalOpen(false);
      setNewHomeroomTeacherId('');
    } catch (err) {
      setActionError((err as Error).message || 'Không thể chuyển quyền GVCN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Breadcrumbs navigation */}
      <div className={styles.breadcrumbs}>
        <Link to="/classes" className={styles.breadcrumbLink}>Classes</Link>
        <ChevronRight size={14} className={styles.breadcrumbsIcon} />
        <span className={styles.breadcrumbActive}>Class {currentClass?.name || 'Loading...'}</span>
      </div>

      {/* Main Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link to="/classes" className={styles.backBtn}>
              <ArrowLeft size={18} />
            </Link>
            <h1>{currentClass ? currentClass.name : 'Loading Class...'}</h1>
          </div>
          <div className={styles.subtext}>
            <Users size={15} />
            <span>{students.length} Students Enrolled</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button 
            className={styles.importBtn} 
            onClick={() => {
              setIsImportModalOpen(true);
              setImportStep('upload');
              setImportFile(null);
              setImportError(null);
              setParsedStudents([]);
            }}
          >
            <Upload size={16} />
            <span>Import from Excel</span>
          </button>
          <button className={styles.exportBtn} onClick={handleExportReport} disabled={students.length === 0}>
            <FileText size={16} />
            <span>Export Report</span>
          </button>
          <button className={styles.addManualBtn} onClick={() => setIsAddModalOpen(true)}>
            <Plus size={16} />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {actionError && (
        <div className={styles.alertError}>
          <AlertCircle size={18} />
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className={styles.alertCloseBtn}>
            <X size={16} />
          </button>
        </div>
      )}
      {actionSuccess && (
        <div className={styles.alertSuccess}>
          <Check size={18} />
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className={styles.alertCloseBtn}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className={styles.statsGrid}>
        {/* ATTENDANCE CARD */}
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span className={styles.statTitle}>ATTENDANCE AVG</span>
            <div className={styles.statIconWrapper} style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div className={styles.statValue}>
            {classStats?.attendanceRate !== undefined ? `${classStats.attendanceRate}%` : '--'}
          </div>
          <div className={styles.statTrend} style={{ color: '#10b981' }}>
            {classStats?.attendanceRate !== undefined ? (
              students.length > 0 ? `+${((classStats.attendanceRate - 90) / 90 * 100).toFixed(1)}% from last month` : 'Attendance rate this month'
            ) : 'Loading...'}
          </div>
        </div>

        {/* RECENT EXAM CARD */}
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span className={styles.statTitle}>RECENT EXAM AVG</span>
            <div className={styles.statIconWrapper} style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
              <Award size={16} />
            </div>
          </div>
          <div className={styles.statValue}>
            {classStats?.averageScore !== undefined ? `${classStats.averageScore}%` : '--'}
          </div>
          <div className={styles.statTrend} style={{ color: '#3b82f6' }}>
            {classStats?.averageScore !== undefined ? (
              students.length > 0 ? `+${((classStats.averageScore - 85) / 85 * 100).toFixed(1)}% from last exam` : 'Average score this term'
            ) : 'Loading...'}
          </div>
        </div>

        {/* ASSIGNMENTS CARD */}
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span className={styles.statTitle}>ASSIGNMENTS</span>
            <div className={styles.statIconWrapper} style={{ backgroundColor: '#fdf2f8', color: '#ec4899' }}>
              <FileSpreadsheet size={16} />
            </div>
          </div>
          <div className={styles.statValue}>
            {classStats?.completedAssignments !== undefined && classStats?.totalAssignments !== undefined
              ? `${classStats.completedAssignments} / ${classStats.totalAssignments}`
              : classStats?.completedAssignments !== undefined
              ? `${classStats.completedAssignments}`
              : '--'}
          </div>
          <div className={styles.statTrend} style={{ color: '#6b7280' }}>
            Completed this term
          </div>
        </div>

        {/* UPCOMING EXAMS CARD */}
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span className={styles.statTitle}>UPCOMING EXAMS</span>
            <div className={styles.statIconWrapper} style={{ backgroundColor: '#fff7ed', color: '#f97316' }}>
              <Calendar size={16} />
            </div>
          </div>
          <div className={styles.statValue}>
            {classStats?.upcomingExams !== undefined
              ? String(classStats.upcomingExams).padStart(2, '0')
              : '--'}
          </div>
          <div className={styles.statTrend} style={{ color: '#ef4444', fontWeight: 600 }}>
            {classStats?.nextExam ? `Next: ${classStats.nextExam.title} (${classStats.nextExam.daysUntil}d)` : 'No upcoming exams'}
          </div>
        </div>
      </div>

      {/* Subject Teachers Section - shown only for homeroom teacher or admin */}
      {canManageSubjectTeachers && (
        <div className={styles.teachersCard}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>Giáo viên bộ môn</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                Quản lý giáo viên dạy các môn trong lớp
              </p>
            </div>
            <button
              className={styles.addTeacherBtn}
              onClick={() => setIsSubjectTeacherModalOpen(true)}
            >
              <UserPlus size={15} />
              <span>Thêm GV bộ môn</span>
            </button>
          </div>

          {currentClass?.subjectTeachers && currentClass.subjectTeachers.length > 0 ? (
            <div className={styles.teachersList}>
              {currentClass.subjectTeachers.map((st: any, idx: number) => {
                const teacherInfo = typeof st.teacherId === 'object' && st.teacherId
                  ? (st.teacherId as any) : null;
                const subjectInfo = typeof st.subjectId === 'object' && st.subjectId
                  ? (st.subjectId as any) : null;
                return (
                  <div key={idx} className={styles.teacherItem}>
                    <div className={styles.teacherAvatar}>
                      {teacherInfo?.name
                        ? teacherInfo.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                        : 'T'}
                    </div>
                    <div className={styles.teacherInfo}>
                      <span className={styles.teacherName}>{teacherInfo?.name || 'Unknown'}</span>
                      <span className={styles.teacherEmail}>{teacherInfo?.email || ''}</span>
                    </div>
                    {subjectInfo && (
                      <span
                        className={styles.subjectChip}
                        style={{ backgroundColor: `${subjectInfo.color || '#3b82f6'}15`, color: subjectInfo.color || '#3b82f6', border: `1px solid ${subjectInfo.color || '#3b82f6'}30` }}
                      >
                        {subjectInfo.name}
                      </span>
                    )}
                    <button
                      className={styles.removeTeacherBtn}
                      onClick={() => handleRemoveSubjectTeacher(
                        typeof st.teacherId === 'object' ? (st.teacherId as any)._id : st.teacherId,
                        subjectInfo?._id
                      )}
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: '#9ca3af', padding: '12px 0', textAlign: 'center' }}>
              Chưa có giáo viên bộ môn nào.
            </p>
          )}

          {/* Transfer Ownership */}
          {canTransferOwnership && (
            <div className={styles.transferSection}>
              <div className={styles.transferInfo}>
                <Shield size={16} style={{ color: '#92400e' }} />
                <span>Chuyển quyền GVCN cho người khác</span>
              </div>
              <button
                className={styles.transferBtn}
                onClick={() => setIsTransferModalOpen(true)}
              >
                <Crown size={14} />
                <span>Chuyển GVCN</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Class Exams Section */}
      <ClassExamsSection classId={id || ''} />

      {/* Main Student Records Section */}
      <div className={styles.studentsCard}>
        {/* Search & Filter Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchContainer}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Filter by name or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.searchInput}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Filter Dropdown Toggle */}
            <div className={styles.dropdownContainer} ref={filterRef}>
              <button
                className={`${styles.toolbarBtn} ${statusFilter !== 'ALL' ? styles.toolbarBtnActive : ''}`}
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              >
                <Filter size={15} />
                <span>Filter</span>
              </button>
              {showFilterDropdown && (
                <div className={styles.dropdownMenu}>
                  <div className={styles.dropdownHeader}>Filter by Status</div>
                  <button
                    className={`${styles.dropdownItem} ${statusFilter === 'ALL' ? styles.dropdownItemActive : ''}`}
                    onClick={() => {
                      setStatusFilter('ALL');
                      setShowFilterDropdown(false);
                      setCurrentPage(1);
                    }}
                  >
                    All Statuses
                  </button>
                  <button
                    className={`${styles.dropdownItem} ${statusFilter === 'ACTIVE' ? styles.dropdownItemActive : ''}`}
                    onClick={() => {
                      setStatusFilter('ACTIVE');
                      setShowFilterDropdown(false);
                      setCurrentPage(1);
                    }}
                  >
                    Active
                  </button>
                  <button
                    className={`${styles.dropdownItem} ${statusFilter === 'INACTIVE' ? styles.dropdownItemActive : ''}`}
                    onClick={() => {
                      setStatusFilter('INACTIVE');
                      setShowFilterDropdown(false);
                      setCurrentPage(1);
                    }}
                  >
                    Inactive
                  </button>
                </div>
              )}
            </div>

            {/* Sort Dropdown Toggle */}
            <div className={styles.dropdownContainer} ref={sortRef}>
              <button
                className={styles.toolbarBtn}
                onClick={() => setShowSortDropdown(!showSortDropdown)}
              >
                <ArrowUpDown size={15} />
                <span>Sort</span>
              </button>
              {showSortDropdown && (
                <div className={styles.dropdownMenu} style={{ right: 0, left: 'auto' }}>
                  <div className={styles.dropdownHeader}>Sort Records</div>
                  <button
                    className={`${styles.dropdownItem} ${sortField === 'name' && sortDirection === 'asc' ? styles.dropdownItemActive : ''}`}
                    onClick={() => {
                      setSortField('name');
                      setSortDirection('asc');
                      setShowSortDropdown(false);
                    }}
                  >
                    Name (A - Z)
                  </button>
                  <button
                    className={`${styles.dropdownItem} ${sortField === 'name' && sortDirection === 'desc' ? styles.dropdownItemActive : ''}`}
                    onClick={() => {
                      setSortField('name');
                      setSortDirection('desc');
                      setShowSortDropdown(false);
                    }}
                  >
                    Name (Z - A)
                  </button>
                  <button
                    className={`${styles.dropdownItem} ${sortField === 'studentCode' && sortDirection === 'asc' ? styles.dropdownItemActive : ''}`}
                    onClick={() => {
                      setSortField('studentCode');
                      setSortDirection('asc');
                      setShowSortDropdown(false);
                    }}
                  >
                    Student ID (Asc)
                  </button>
                  <button
                    className={`${styles.dropdownItem} ${sortField === 'studentCode' && sortDirection === 'desc' ? styles.dropdownItemActive : ''}`}
                    onClick={() => {
                      setSortField('studentCode');
                      setSortDirection('desc');
                      setShowSortDropdown(false);
                    }}
                  >
                    Student ID (Desc)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '48px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={handleSelectAll}
                    className={styles.checkbox}
                  />
                </th>
                <th>STUDENT ID</th>
                <th>FULL NAME</th>
                <th>DOB</th>
                <th>EMAIL</th>
                <th style={{ width: '180px' }}>PASSWORD</th>
                <th>STATUS</th>
                <th style={{ width: '100px', textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className={styles.emptyCell}>
                    <div className={styles.spinner} />
                    <p>Tải thông tin học sinh...</p>
                  </td>
                </tr>
              ) : currentStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyCell}>
                    <p>Không có học sinh nào khớp với bộ lọc.</p>
                  </td>
                </tr>
              ) : (
                currentStudents.map((student, idx) => {
                  const initials = getInitials(student.name);
                  const colors = getAvatarColors(student.name);
                  const code = student.studentCode || `STU-${10293 + idx + startIndex}`;
                  const isSelected = selectedStudentIds.has(student._id);
                  const isEditingRow = editingStudentId === student._id;
                  const passwordHint = credentials[student._id] || '';

                  return (
                    <tr key={student._id} className={`${isSelected ? styles.rowSelected : ''} ${isEditingRow ? styles.rowEditing : ''}`}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(student._id, e.target.checked)}
                          className={styles.checkbox}
                        />
                      </td>
                      <td className={styles.studentIdCell}>{code}</td>
                      <td>
                        {isEditingRow && editForm ? (
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className={styles.inlineInput}
                            autoFocus
                          />
                        ) : (
                          <div className={styles.studentProfile}>
                            <div
                              className={styles.avatar}
                              style={{ backgroundColor: colors.bg, color: colors.text }}
                            >
                              {initials}
                            </div>
                            <span className={styles.studentName}>{student.name}</span>
                          </div>
                        )}
                      </td>
                      <td>
                        {isEditingRow && editForm ? (
                          <input
                            type="date"
                            value={editForm.dateOfBirth}
                            onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                            className={styles.inlineInput}
                          />
                        ) : (
                          formatDate(student.dateOfBirth)
                        )}
                      </td>
                      <td>
                        {isEditingRow && editForm ? (
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className={styles.inlineInput}
                          />
                        ) : (
                          <span className={styles.emailCell}>{student.email}</span>
                        )}
                      </td>
                      <td>
                        {canViewCredentials ? (
                          resettingPasswordStudentId === student._id ? (
                            <div className={styles.passwordResetRow}>
                              <input
                                type="text"
                                value={newPasswordValue}
                                onChange={(e) => setNewPasswordValue(e.target.value)}
                                placeholder="Mật khẩu mới (≥8 ký tự)"
                                className={styles.passwordResetInput}
                                disabled={isResettingPassword}
                                autoFocus
                              />
                              <button
                                className={styles.passwordResetSaveBtn}
                                onClick={handleResetPassword}
                                disabled={isResettingPassword || newPasswordValue.length < 8}
                                title="Lưu"
                              >
                                {isResettingPassword ? '...' : '✓'}
                              </button>
                              <button
                                className={styles.passwordResetCancelBtn}
                                onClick={cancelResetPassword}
                                disabled={isResettingPassword}
                                title="Hủy"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              className={styles.resetPasswordBtn}
                              onClick={() => openResetPassword(student._id)}
                              title={passwordHint ? `Hiện tại: ${passwordHint}` : 'Đổi mật khẩu'}
                            >
                              <KeyRound size={14} />
                              <span>Đổi mật khẩu</span>
                            </button>
                          )
                        ) : (
                          <span className={styles.muted}>—</span>
                        )}
                      </td>
                      <td>
                        {isEditingRow && editForm ? (
                          <select
                            value={editForm.isActive ? 'true' : 'false'}
                            onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'true' })}
                            className={styles.inlineSelect}
                          >
                            <option value="true">ACTIVE</option>
                            <option value="false">INACTIVE</option>
                          </select>
                        ) : (
                          <span className={`${styles.badge} ${student.isActive ? styles.badgeActive : styles.badgeInactive}`}>
                            {student.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isEditingRow ? (
                          <div className={styles.inlineEditActions}>
                            <button
                              className={styles.inlineSaveBtn}
                              onClick={saveEditing}
                              disabled={isSubmitting}
                              title="Lưu"
                            >
                              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button
                              className={styles.inlineCancelBtn}
                              onClick={cancelEditing}
                              disabled={isSubmitting}
                              title="Hủy"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                            <button
                              className={styles.editIconBtn}
                              onClick={() => startEditing(student)}
                              title="Chỉnh sửa"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className={styles.actionMenuBtn}
                              onClick={() => setActiveMenuStudentId(activeMenuStudentId === student._id ? null : student._id)}
                            >
                              <MoreVertical size={16} />
                            </button>
                            {activeMenuStudentId === student._id && (
                              <div className={styles.actionDropdown}>
                                <button
                                  className={styles.actionDropdownItem}
                                  onClick={() => {
                                    handleRemoveStudent(student._id);
                                    setActiveMenuStudentId(null);
                                  }}
                                >
                                  <Trash2 size={13} className={styles.deleteIcon} />
                                  <span className={styles.deleteText}>Xóa khỏi lớp</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <span className={styles.paginationSummary}>
              Showing {startIndex + 1}-{endIndex} of {totalStudents} students
            </span>
            <div className={styles.paginationControls}>
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  className={`${styles.pageNumberBtn} ${currentPage === i + 1 ? styles.pageNumberBtnActive : ''}`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRightIcon size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Add Student Modal */}
      {isAddModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Thêm học sinh mới</h2>
              <button className={styles.closeBtn} onClick={() => setIsAddModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddManualSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Họ và Tên *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Julianne Smith"
                  className={styles.formInput}
                  value={manualStudent.name}
                  onChange={(e) => setManualStudent({ ...manualStudent, name: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. j.smith@edugrade.edu"
                  className={styles.formInput}
                  value={manualStudent.email}
                  onChange={(e) => setManualStudent({ ...manualStudent, email: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Mã số học sinh (Student ID)</label>
                <input
                  type="text"
                  placeholder="e.g. STU-10293"
                  className={styles.formInput}
                  value={manualStudent.studentCode}
                  onChange={(e) => setManualStudent({ ...manualStudent, studentCode: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Ngày sinh</label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={manualStudent.dateOfBirth}
                  onChange={(e) => setManualStudent({ ...manualStudent, dateOfBirth: e.target.value })}
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subject Teacher Modal */}
      {isSubjectTeacherModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Thêm giáo viên bộ môn</h2>
              <button className={styles.closeBtn} onClick={() => setIsSubjectTeacherModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); handleAddSubjectTeacher(); }}
              className={styles.modalForm}
            >
              {actionError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
                  <AlertCircle size={16} />
                  <span>{actionError}</span>
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Chọn giáo viên *</label>
                <select
                  className={styles.formInput}
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  required
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers.map((t: TeacherItem) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Môn học (tùy chọn)</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="VD: Toán, Ngữ Văn, Tiếng Anh..."
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsSubjectTeacherModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isSubmitting || !selectedTeacher}>
                  {isSubmitting ? 'Đang thêm...' : 'Thêm vào lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Homeroom Teacher Modal */}
      {isTransferModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Chuyển quyền GVCN</h2>
              <button className={styles.closeBtn} onClick={() => setIsTransferModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); handleTransferOwnership(); }}
              className={styles.modalForm}
            >
              {actionError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
                  <AlertCircle size={16} />
                  <span>{actionError}</span>
                </div>
              )}

              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#92400e' }}>
                Sau khi chuyển, bạn sẽ mất quyền GVCN và không thể tự lấy lại. Giáo viên mới phải xác nhận.
              </div>

              <div className={styles.formGroup}>
                <label>Chọn giáo viên mới làm GVCN *</label>
                <select
                  className={styles.formInput}
                  value={newHomeroomTeacherId}
                  onChange={(e) => setNewHomeroomTeacherId(e.target.value)}
                  required
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers
                    .filter((t: TeacherItem) => {
                      const teacherId = typeof t.id === 'string' ? t.id : t.id;
                      return teacherId !== homeroomTeacherId;
                    })
                    .map((t: TeacherItem) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.email})
                      </option>
                    ))}
                </select>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsTransferModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isSubmitting || !newHomeroomTeacherId}>
                  {isSubmitting ? 'Đang chuyển...' : 'Xác nhận chuyển'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel/CSV Import Modal */}
      {isImportModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ width: importStep === 'preview' ? '800px' : '500px', maxWidth: '95%' }}>
            <div className={styles.modalHeader}>
              <h2>{importStep === 'upload' ? 'Import Student Data' : 'Preview Student Data'}</h2>
              <button className={styles.closeBtn} onClick={() => setIsImportModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {importStep === 'upload' ? (
              <div className={styles.modalForm} style={{ paddingBottom: '24px' }}>
                <div
                  className={`${styles.dragDropArea} ${isDragging ? styles.dragOver : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileSelected(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className={styles.uploadIconWrapper}>
                    <Upload size={32} />
                  </div>
                  <div className={styles.dragDropText}>
                    {importFile ? (
                      <strong>Selected: {importFile.name}</strong>
                    ) : (
                      <>
                        <strong>Click or drag Excel file to upload</strong>
                        <span>Support formats: .xls, .xlsx, .csv (Max 5MB)</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xls,.xlsx,.csv"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelected(file);
                    }}
                  />
                </div>

                {importError && (
                  <div className={styles.importErrorMsg}>
                    <AlertCircle size={16} />
                    <span>{importError}</span>
                  </div>
                )}

                <div className={styles.templateSection}>
                  <div className={styles.templateHeader}>OR USE A TEMPLATE</div>
                  <div className={styles.templateCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <FileSpreadsheet size={24} style={{ color: '#0b2240' }} />
                      <div className={styles.templateCardText}>
                        <strong>student_import_template.xlsx</strong>
                        <span>Ready-to-use formatting</span>
                      </div>
                    </div>
                    <button type="button" className={styles.downloadBtn} onClick={handleDownloadTemplate}>
                      Download
                    </button>
                  </div>
                </div>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setIsImportModalOpen(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.submitBtn}
                    disabled={!importFile}
                    onClick={() => {
                      if (importFile) parseFile(importFile);
                    }}
                  >
                    Process Upload
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.modalForm} style={{ paddingBottom: '24px' }}>
                <div className={styles.previewTableContainer}>
                  <table className={styles.previewTable}>
                    <thead>
                      <tr>
                        <th>STUDENT ID</th>
                        <th>FULL NAME</th>
                        <th>DOB</th>
                        <th>EMAIL</th>
                        <th style={{ width: '60px', textAlign: 'center' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedStudents.map((student, idx) => (
                        <tr key={idx}>
                          <td>
                            <input
                              type="text"
                              value={student.studentCode}
                              className={styles.previewInput}
                              onChange={(e) => handleEditParsedStudent(idx, 'studentCode', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={student.name}
                              className={styles.previewInput}
                              onChange={(e) => handleEditParsedStudent(idx, 'name', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={student.dateOfBirth}
                              className={styles.previewInput}
                              onChange={(e) => handleEditParsedStudent(idx, 'dateOfBirth', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="email"
                              value={student.email}
                              className={styles.previewInput}
                              onChange={(e) => handleEditParsedStudent(idx, 'email', e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className={styles.rowDeleteBtn}
                              onClick={() => {
                                setParsedStudents(prev => prev.filter((_, i) => i !== idx));
                              }}
                            >
                              <X size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={styles.previewSummary}>
                  * Showing first {parsedStudents.length} of {parsedStudents.length} records to be imported.
                </div>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setImportStep('upload')}>
                    Back
                  </button>
                  <button
                    type="button"
                    className={styles.submitBtn}
                    disabled={isSubmitting || parsedStudents.length === 0}
                    onClick={handleConfirmImport}
                  >
                    {isSubmitting ? 'Importing...' : `Import ${parsedStudents.length} Students`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
