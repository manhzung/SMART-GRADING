import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  HelpCircle, 
  List, 
  Shuffle, 
  Eye, 
  FilePlus, 
  Info, 
  X,
  GraduationCap,
  AlertCircle
} from 'lucide-react';
import { useClassStore } from '../presentation/store/classStore';
import { useExamStore, type Exam } from '../presentation/store/examStore';
import { useOMRTemplateStore } from '../presentation/store/omrTemplateStore';
import ExamPreviewModal from '../features/exams/ExamPreviewModal';
import styles from './EditExamPage.module.css';

// Vietnamese Subject List
const SUBJECTS = [
  'Toán học',
  'Vật lý',
  'Hóa học',
  'Sinh học',
  'Tiếng Anh',
  'Lịch sử',
  'Địa lý',
  'Ngữ văn',
  'Tin học'
];

export default function EditExamPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { classes, fetchClasses } = useClassStore();
  const { exams, fetchExams, updateExam, fetchExamById, examVersions, fetchExamVersionsFull } = useExamStore();
  const { templates: omrTemplatesList, fetchTemplates } = useOMRTemplateStore();

  // API Lists
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Toán học');
  
  // Specs
  const [omrTemplateId, setOmrTemplateId] = useState('');
  const [numberOfQuestions, setNumberOfQuestions] = useState(40);
  const [numberOfVersions, setNumberOfVersions] = useState(4);
  const [examCode, setExamCode] = useState('MATH12-HK1');

  // Shuffle Configuration
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [keepHardAtEnd, setKeepHardAtEnd] = useState(false);

  // Exam Date and details preserved
  const [examDate, setExamDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [_examStatus, setExamStatus] = useState<'draft' | 'published' | 'in_progress' | 'completed' | 'archived'>('draft');
  const [isLoadingExam, setIsLoadingExam] = useState(false);

  // Preview modal state
  const [showPreview, setShowPreview] = useState(false);

  // Current exam for preview
  const [currentExamData, setCurrentExamData] = useState<Exam | null>(null);

  // Lock form fields for published/completed exams (computed after data loads)
  const isPublished = _examStatus === 'published' || _examStatus === 'in_progress' || _examStatus === 'completed';
  const isLocked = isPublished;

  // Load classes and OMR templates on mount
  useEffect(() => {
    fetchClasses({ limit: 100 });
    if (exams.length === 0) {
      fetchExams();
    }
    fetchTemplates();
  }, [fetchClasses, fetchExams, exams.length, fetchTemplates]);

  // Load current exam details
  useEffect(() => {
    if (!id) return;
    
    // Find exam in store
    const exam = exams.find(e => e._id === id);
    if (exam) {
      setTitle(exam.title);
      setDescription(exam.description || '');
      setSelectedClassId(typeof exam.primaryClassId === 'object' ? (exam.primaryClassId as any)?._id : (exam.primaryClassId as string) || '');
      setSelectedSubject(exam.subjectName || 'Toán học');
      setNumberOfQuestions(exam.questionIds?.length || 40);
      setExamDate(exam.examDate || '');
      setExamStatus(exam.status || 'draft');
      
      // Set current exam data for preview
      setCurrentExamData(exam);
      
    // Attempt to load more detail from store
    setIsLoadingExam(true);
    fetchExamById(id)
        .then(() => {
          // Read back from store after it updates
          const res = useExamStore.getState().currentExam;
          if (res) {
            if (res.primaryClassId) {
              const pid = typeof res.primaryClassId === 'object' ? (res.primaryClassId as any)?._id : res.primaryClassId;
              if (pid) setSelectedClassId(pid);
            }
            if ((res as any).subjectId?.name) setSelectedSubject((res as any).subjectId.name);
            if ((res as any).omrTemplateId) {
              const tid = typeof (res as any).omrTemplateId === 'object' ? (res as any).omrTemplateId?._id : (res as any).omrTemplateId;
              if (tid) setOmrTemplateId(tid);
            }
            if (res.numberOfQuestions) setNumberOfQuestions(res.numberOfQuestions);
            if (res.numberOfVersions) setNumberOfVersions(res.numberOfVersions);
            if ((res as any).examCode || (res as any).code) setExamCode((res as any).examCode || (res as any).code || 'MATH12-HK1');
            if (res.startTime) setStartTime(res.startTime);
            if (res.examDate) setExamDate(res.examDate);
            if ((res as any).shuffleConfig) {
              setShuffleQuestions((res as any).shuffleConfig.shuffleQuestions ?? true);
              setShuffleOptions((res as any).shuffleConfig.shuffleOptions ?? true);
              setKeepHardAtEnd((res as any).shuffleConfig.keepHardAtEnd ?? false);
            }
            // Update currentExamData with full data from API
            setCurrentExamData({
              ...exam,
              ...res,
              duration: res.duration || exam.duration || 45,
              totalScore: res.totalScore || exam.totalScore || 10,
              passingScore: res.passingScore || exam.passingScore || 5,
            });
            setIsLoadingExam(false);
            // Fetch exam versions full to get questions
            if ((res as any).questionIds?.length > 0) {
              fetchExamVersionsFull(id);
            }
          }
        })
        .catch(err => {
          console.warn('Could not fetch deep details for exam from server, using store data', err);
        });
    } else {
      // Mock / Default data fallback for the UI mockups if ID is not in store
      // E.g. matching "Kiểm tra cuối kỳ I - Môn Toán - Khối 12"
      setTitle('Kiểm tra cuối kỳ I - Môn Toán - Khối 12');
      setSelectedClassId(''); // Will resolve to first loaded class
      setSelectedSubject('Toán học');
      setDescription('Bài kiểm tra tập trung vào kiến thức Giải tích và Hình học không gian chương 1-2.');
      setNumberOfQuestions(40);
      setNumberOfVersions(4);
      setExamCode('MATH12-HK1');
      setShuffleQuestions(true);
      setShuffleOptions(true);
      setKeepHardAtEnd(false);
    }
  }, [id, exams, fetchExamVersionsFull]);

  // Sync selectedClassId with first class if empty
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0]._id);
    }
  }, [classes, selectedClassId]);

  // Sync omrTemplateId with first option if empty
  useEffect(() => {
    if (omrTemplatesList.length > 0 && !omrTemplateId) {
      setOmrTemplateId(omrTemplatesList[0]._id);
    }
  }, [omrTemplatesList, omrTemplateId]);

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Vui lòng nhập tên bài kiểm tra.');
      return;
    }
    if (!selectedClassId) {
      setErrorMessage('Vui lòng chọn lớp học.');
      return;
    }

    setIsSubmitLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (id) {
        const deepPayload = {
          _id: id,
          title,
          description,
          primaryClassId: selectedClassId,
          classIds: [selectedClassId],
          omrTemplateId,
          numberOfQuestions: Number(numberOfQuestions),
          numberOfVersions: Number(numberOfVersions),
          examCode,
          examDate,
          startTime,
          shuffleConfig: {
            shuffleQuestions,
            shuffleOptions,
            keepHardAtEnd
          }
        };
        await updateExam(deepPayload as any);
      }
      
      setSuccessMessage('Lưu thay đổi thành công!');
      setTimeout(() => {
        navigate(`/exams/${id || ''}`);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Có lỗi xảy ra khi lưu thay đổi.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* ─── BREADCRUMBS ─── */}
      <nav className={styles.breadcrumb}>
        <Link to="/exams" className={styles.breadcrumbLink}>Bài kiểm tra</Link>
        <span className={styles.breadcrumbSeparator}>&gt;</span>
        <span className={styles.breadcrumbActive}>Sửa bài</span>
      </nav>

      {/* ─── PAGE TITLE ─── */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          {isLoadingExam ? 'Đang tải...' : isPublished ? `Xem chi tiết bài kiểm tra` : 'Sửa bài kiểm tra'}
        </h1>
        <span className={styles.statusBadge}>
          {isLoadingExam ? '...' : isPublished ? _examStatus === 'completed' ? 'Hoàn thành' : _examStatus === 'in_progress' ? 'Đang diễn ra' : 'Đã xuất bản' : 'Nháp'}
        </span>
      </div>

      {errorMessage && (
        <div className={styles.errorBanner}>
          <Info size={18} />
          <span>{errorMessage}</span>
          <button className={styles.errorClose} onClick={() => setErrorMessage(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className={styles.successBanner}>
          <Info size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {isPublished && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          color: '#92400e',
          fontSize: '13px',
          marginBottom: '16px',
        }}>
          <AlertCircle size={16} />
          <span>Bài kiểm tra đã được xuất bản. Một số trường bị khóa và không thể chỉnh sửa.</span>
        </div>
      )}

      {/* ─── FORM GRID LAYOUT ─── */}
      <form onSubmit={handleSave} className={styles.formGrid}>
        <div className={styles.twoColumnGrid}>
          
          {/* LEFT COLUMN */}
          <div className={styles.leftCol}>
            
            {/* Card 1: Thông tin chung */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitle}>
                  <HelpCircle size={18} className={styles.iconBlue} />
                  <h2>Thông tin chung</h2>
                </div>
              </div>
              
              <div className={styles.cardContent}>
                {/* Exam Title */}
                <div className={styles.formGroup}>
                  <label htmlFor="exam-title" className={styles.fieldLabel}>Tiêu đề bài kiểm tra</label>
                  <input 
                    id="exam-title"
                    type="text" 
                    required 
                    placeholder="VD: Kiểm tra cuối kỳ I - Môn Toán - Khối 12"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={styles.inputField}
                    disabled={isLocked}
                  />
                </div>

                {/* Class & Subject dropdowns in one row */}
                <div className={styles.grid2Col}>
                  <div className={styles.formGroup}>
                    <label htmlFor="class-select" className={styles.fieldLabel}>Lớp học</label>
                    <select 
                      id="class-select"
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className={styles.selectField}
                      required
                      disabled={isLocked}
                    >
                      <option value="">-- Chọn lớp học --</option>
                      {classes.map(cls => (
                        <option key={cls._id} value={cls._id}>{cls.name}</option>
                      ))}
                      {classes.length === 0 && (
                        <option value="mock-12a1">12A1</option>
                      )}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="subject-select" className={styles.fieldLabel}>Môn học</label>
                    <select 
                      id="subject-select"
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className={styles.selectField}
                      disabled={isLocked}
                    >
                      {SUBJECTS.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description / Notes */}
                <div className={styles.formGroup}>
                  <label htmlFor="exam-desc" className={styles.fieldLabel}>Ghi chú (không bắt buộc)</label>
                  <textarea 
                    id="exam-desc"
                    placeholder="VD: Bài kiểm tra tập trung vào kiến thức Giải tích và Hình học không gian chương 1-2."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={styles.textareaField}
                    rows={4}
                    disabled={isLocked}
                  />
                </div>

                {/* Exam Date */}
                <div className={styles.formGroup}>
                  <label htmlFor="exam-date" className={styles.fieldLabel}>Ngày kiểm tra</label>
                  <input 
                    id="exam-date"
                    type="date" 
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className={styles.inputField}
                    disabled={isLocked}
                  />
                </div>

                {/* Start Time */}
                <div className={styles.formGroup}>
                  <label htmlFor="start-time" className={styles.fieldLabel}>Giờ bắt đầu</label>
                  <input 
                    id="start-time"
                    type="time" 
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={styles.inputField}
                    disabled={isLocked}
                  />
                </div>
              </div>
            </section>

            {/* Card 2: Danh sách câu hỏi */}
            <section className={styles.card}>
              <div className={styles.cardHeaderFlex}>
                <div className={styles.cardHeaderTitle}>
                  <List size={18} className={styles.iconGray} />
                  <h2>Danh sách câu hỏi</h2>
                </div>
                
                <button 
                  type="button" 
                  onClick={() => alert('Thêm câu hỏi thành công!')}
                  className={styles.addQuestionBtn}
                  disabled={isLocked}
                  style={{ opacity: isLocked ? 0.5 : 1, cursor: isLocked ? 'not-allowed' : 'pointer' }}
                >
                  + Thêm câu hỏi
                </button>
              </div>

              <div className={styles.cardContent}>
                {/* List of questions from exam versions */}
                <div className={styles.questionList}>
                  
                  {examVersions.length > 0 ? (
                    examVersions.flatMap(v => v.questions || []).slice(0, numberOfQuestions).map((q, idx) => (
                      <div key={`${q.questionId}-${idx}`} className={styles.questionRow}>
                        <div className={styles.questionHeader}>
                          <span className={styles.questionTitle}>Câu {idx + 1}</span>
                        </div>
                        <p className={styles.questionText}>
                          {q.questionId ? `Câu hỏi: ${q.questionId.substring(0, 12)}...` : 'Đang tải...'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className={styles.dragPlaceholder} onClick={() => alert('Chọn file câu hỏi hoặc nhập từ ngân hàng.')}>
                      <FilePlus size={32} className={styles.placeholderIcon} />
                      <span className={styles.placeholderText}>Kéo thả câu hỏi từ thư viện hoặc tạo mới</span>
                    </div>
                  )}

                </div>
              </div>
            </section>

          </div>

          {/* RIGHT COLUMN */}
          <div className={styles.rightCol}>
            
            {/* Card 3: Cấu trúc đề thi */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitle}>
                  <GraduationCap size={18} className={styles.iconNavy} />
                  <h2>Cấu trúc đề thi</h2>
                </div>
              </div>
              
              <div className={styles.cardContent}>
                {/* Number of questions with input suffix */}
                <div className={styles.formGroup}>
                  <label htmlFor="questions-count" className={styles.fieldLabel}>Số lượng câu hỏi</label>
                  <div className={styles.inputWithSuffixWrapper}>
                    <input 
                      id="questions-count"
                      type="number" 
                      required 
                      min={1}
                      value={numberOfQuestions}
                      onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
                      className={styles.inputField}
                      disabled={isLocked}
                    />
                    <span className={styles.inputSuffix}>Câu</span>
                  </div>
                </div>

                {/* OMR Template */}
                <div className={styles.formGroup}>
                  <label htmlFor="omr-template" className={styles.fieldLabel}>Mẫu phiếu trả lời (OMR)</label>
                  <select 
                    id="omr-template"
                    value={omrTemplateId}
                    onChange={(e) => setOmrTemplateId(e.target.value)}
                    className={styles.selectField}
                    required
                    disabled={isLocked}
                  >
                    {omrTemplatesList.length === 0 ? (
                      <>
                        <option value="40-cau">Mẫu 40 câu - Chuẩn Bộ GD&ĐT</option>
                        <option value="50-cau">Mẫu 50 câu - Tiêu chuẩn</option>
                        <option value="30-cau">Mẫu 30 câu - Giữa kỳ</option>
                      </>
                    ) : (
                      omrTemplatesList.map(tpl => (
                        <option key={tpl._id} value={tpl._id}>{tpl.name}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Original Exam Code */}
                <div className={styles.formGroup}>
                  <label htmlFor="exam-code" className={styles.fieldLabel}>Mã đề gốc</label>
                  <input 
                    id="exam-code"
                    type="text" 
                    required 
                    placeholder="VD: MATH12-HK1"
                    value={examCode}
                    onChange={(e) => setExamCode(e.target.value)}
                    className={styles.inputField}
                    disabled={isLocked}
                  />
                </div>
              </div>
            </section>

            {/* Card 4: Cấu hình xáo trộn */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitle}>
                  <Shuffle size={18} className={styles.iconNavy} />
                  <h2>Cấu hình xáo trộn</h2>
                </div>
              </div>
              
              <div className={styles.cardContent}>
                {/* Shuffle Question order */}
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className={styles.checkboxInput}
                    disabled={isLocked}
                  />
                  <span>Xáo trộn thứ tự câu hỏi</span>
                </label>

                {/* Shuffle Options */}
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className={styles.checkboxInput}
                    disabled={isLocked}
                  />
                  <span>Xáo trộn các phương án trả lời</span>
                </label>

                {/* Keep hard questions at end */}
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox"
                    checked={keepHardAtEnd}
                    onChange={(e) => setKeepHardAtEnd(e.target.checked)}
                    className={styles.checkboxInput}
                    disabled={isLocked}
                  />
                  <span>Giữ cố định các câu hỏi khó ở cuối</span>
                </label>

                {/* Number of versions to create */}
                <div className={styles.formGroup} style={{ marginTop: '8px' }}>
                  <label htmlFor="versions-count" className={styles.fieldLabel}>Số lượng mã đề cần tạo</label>
                  <select 
                    id="versions-count"
                    value={numberOfVersions}
                    onChange={(e) => setNumberOfVersions(Number(e.target.value))}
                    className={styles.selectField}
                    disabled={isLocked}
                  >

            {/* Card 5: Xem trước đề thi */}
            <section className={styles.previewCard}>
              <div className={styles.previewHeader}>
                <h3 className={styles.previewTitle}>Xem trước đề thi</h3>
                <p className={styles.previewDesc}>
                  Kiểm tra hiển thị của các câu hỏi và cấu trúc mã đề trước khi lưu.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPreview(true)}
                className={styles.previewBtn}
              >
                <Eye size={16} />
                <span>Chế độ xem trước</span>
              </button>
            </section>

          </div>

        </div>

        {/* Space wrapper for sticky footer */}
        <div className={styles.footerSpacing} />

        {/* ─── STICKY FOOTER ─── */}
        <footer className={styles.stickyFooter}>
          <div className={styles.footerContent}>
            {/* Left side: status saved indicator */}
            <div className={styles.statusLeft}>
              <span className={styles.statusDot} />
              <span>Lần cuối lưu: 2 phút trước bởi Bạn</span>
            </div>

            {/* Right side: buttons */}
            <div className={styles.actionsRight}>
              <button 
                type="button" 
                onClick={() => navigate(id ? `/exams/${id}` : '/exams')}
                className={styles.cancelBtn}
              >
                Hủy bỏ
              </button>
              
              <button 
                type="submit" 
                disabled={isSubmitLoading || isLocked}
                className={styles.submitBtn}
                style={isLocked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              >
                {isSubmitLoading ? 'Đang lưu...' : isLocked ? 'Khóa (đã xuất bản)' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </footer>

      </form>

      {/* Preview Modal */}
      {showPreview && currentExamData && (
        <ExamPreviewModal
          exam={currentExamData}
          examVersions={examVersions}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
