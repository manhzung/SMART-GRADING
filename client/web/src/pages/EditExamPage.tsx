import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  HelpCircle, 
  Shuffle, 
  X,
  GraduationCap,
  AlertCircle,
} from 'lucide-react';
import { useClassStore } from '../presentation/store/classStore';
import { useExamStore } from '../presentation/store/examStore';
import styles from './EditExamPage.module.css';

export default function EditExamPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { classes, fetchClasses } = useClassStore();
  const { exams, fetchExams, updateExam, fetchExamById, fetchExamVersionsFull } = useExamStore();

  // API Lists
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  
  // Specs - Thêm các trường còn thiếu
  const [numberOfQuestions, setNumberOfQuestions] = useState(40);
  const [numberOfVersions, setNumberOfVersions] = useState(4);
  const [examCode, setExamCode] = useState('MATH12-HK1');
  const [duration, setDuration] = useState(45);
  const [totalScore, setTotalScore] = useState(10);
  const [passingScore, setPassingScore] = useState(5);

  // Shuffle Configuration
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [keepHardAtEnd, setKeepHardAtEnd] = useState(false);

  // Exam Date and details preserved
  const [examDate, setExamDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [_examStatus, setExamStatus] = useState<'draft' | 'published' | 'in_progress' | 'completed' | 'archived'>('draft');
  const [isLoadingExam, setIsLoadingExam] = useState(false);

  // Last saved timestamp
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Lock form fields for published/completed exams (computed after data loads)
  const isPublished = _examStatus === 'published' || _examStatus === 'in_progress' || _examStatus === 'completed';
  const isLocked = isPublished;

  // Load classes and OMR templates on mount
  useEffect(() => {
    fetchClasses({ limit: 100 });
    if (exams.length === 0) {
      fetchExams();
    }
  }, [fetchClasses, fetchExams, exams.length]);

  // Load current exam details
  useEffect(() => {
    if (!id) return;
    
    // Find exam in store
    const exam = exams.find(e => e._id === id);
    if (exam) {
      setTitle(exam.title);
      setDescription(exam.description || '');
      setSelectedClassId(typeof exam.primaryClassId === 'object' ? (exam.primaryClassId as any)?._id : (exam.primaryClassId as string) || '');
      setNumberOfQuestions(exam.questionIds?.length || 40);
      setExamDate(exam.examDate || '');
      setExamStatus(exam.status || 'draft');
      
      // Last saved timestamp
      setLastSaved(new Date());
      
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
            if (res.numberOfQuestions) setNumberOfQuestions(res.numberOfQuestions);
            if (res.numberOfVersions) setNumberOfVersions(res.numberOfVersions);
            if ((res as any).examCode || (res as any).code) setExamCode((res as any).examCode || (res as any).code || 'MATH12-HK1');
            if (res.startTime) setStartTime(res.startTime);
            if (res.examDate) setExamDate(res.examDate);
            // Load new fields
            if (res.duration) setDuration(res.duration);
            if (res.totalScore) setTotalScore(res.totalScore);
            if (res.passingScore) setPassingScore(res.passingScore);
            if ((res as any).shuffleConfig) {
              setShuffleQuestions((res as any).shuffleConfig.shuffleQuestions ?? true);
              setShuffleOptions((res as any).shuffleConfig.shuffleOptions ?? true);
              setKeepHardAtEnd((res as any).shuffleConfig.keepHardAtEnd ?? false);
            }
            setLastSaved(new Date());
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
      setTitle('Kiểm tra cuối kỳ I - Môn Toán - Khối 12');
      setSelectedClassId('');
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

  // Format last saved time
  const formatLastSaved = () => {
    if (!lastSaved) return 'Chưa lưu';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    return lastSaved.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

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
          numberOfQuestions: Number(numberOfQuestions),
          numberOfVersions: Number(numberOfVersions),
          examCode,
          examDate,
          startTime,
          duration: Number(duration),
          totalScore: Number(totalScore),
          passingScore: Number(passingScore),
          shuffleConfig: {
            shuffleQuestions,
            shuffleOptions,
            keepHardAtEnd
          }
        };
        await updateExam(deepPayload as any);
        setLastSaved(new Date());
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

  // Handle add question - navigate to question bank
  // (Tính năng sẽ được bổ sung sau khi Question Bank page hoàn thiện)
  // const handleAddQuestion = () => { navigate('/question-bank'); };

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
          <span>{errorMessage}</span>
          <button className={styles.errorClose} onClick={() => setErrorMessage(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className={styles.successBanner}>
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
                  <h2>Thông tin cơ bản</h2>
                </div>
              </div>
              
              <div className={styles.cardContent}>
                {/* Exam Title */}
                <div className={styles.formGroup}>
                  <label htmlFor="exam-title" className={styles.fieldLabel}>Tên bài kiểm tra</label>
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
                </div>

                {/* Description / Notes */}
                <div className={styles.formGroup}>
                  <label htmlFor="exam-desc" className={styles.fieldLabel}>Mô tả (không bắt buộc)</label>
                  <textarea 
                    id="exam-desc"
                    placeholder="VD: Bài kiểm tra tập trung vào kiến thức Giải tích và Hình học không gian chương 1-2."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={styles.textareaField}
                    rows={3}
                    disabled={isLocked}
                  />
                </div>

                {/* Exam Date & Time Grid */}
                <div className={styles.grid2Col}>
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
              </div>
            </section>

            {/* Card 2: Cấu hình xáo trộn */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTitle}>
                  <Shuffle size={18} className={styles.iconNavy} />
                  <h2>Tùy chọn xáo trộn</h2>
                </div>
              </div>
              
              <div className={styles.cardContent}>
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
                {/* Number of questions */}
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

                {/* Thời gian làm bài */}
                <div className={styles.formGroup}>
                  <label htmlFor="duration" className={styles.fieldLabel}>Thời gian làm bài</label>
                  <div className={styles.inputWithSuffixWrapper}>
                    <input 
                      id="duration"
                      type="number" 
                      required 
                      min={1}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className={styles.inputField}
                      disabled={isLocked}
                    />
                    <span className={styles.inputSuffix}>Phút</span>
                  </div>
                </div>

                {/* Điểm tổng & Điểm đạt */}
                <div className={styles.grid2Col}>
                  <div className={styles.formGroup}>
                    <label htmlFor="total-score" className={styles.fieldLabel}>Điểm tổng</label>
                    <input 
                      id="total-score"
                      type="number" 
                      required 
                      min={1}
                      value={totalScore}
                      onChange={(e) => setTotalScore(Number(e.target.value))}
                      className={styles.inputField}
                      disabled={isLocked}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="passing-score" className={styles.fieldLabel}>Điểm đạt</label>
                    <input 
                      id="passing-score"
                      type="number" 
                      required 
                      min={0}
                      value={passingScore}
                      onChange={(e) => setPassingScore(Number(e.target.value))}
                      className={styles.inputField}
                      disabled={isLocked}
                    />
                  </div>
                </div>

                {/* Số lượng mã đề */}
                <div className={styles.formGroup}>
                  <label htmlFor="versions-count" className={styles.fieldLabel}>Số lượng mã đề cần tạo</label>
                  <select 
                    id="versions-count"
                    value={numberOfVersions}
                    onChange={(e) => setNumberOfVersions(Number(e.target.value))}
                    className={styles.selectField}
                    disabled={isLocked}
                  >
                    {[2, 3, 4, 5, 6, 8, 10].map(v => (
                      <option key={v} value={v}>{v} mã đề</option>
                    ))}
                  </select>
                </div>

                {/* Mã đề gốc */}
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

          </div>
          {/* /LEFT COLUMN */}

        </div>
        {/* /TWO COLUMN GRID */}

        {/* Space wrapper for sticky footer */}
        <div className={styles.footerSpacing} />

        {/* ─── STICKY FOOTER ─── */}
        <footer className={styles.stickyFooter}>
          <div className={styles.footerContent}>
            {/* Left side: status saved indicator - Hiển thị thời gian lưu thực tế */}
            <div className={styles.statusLeft}>
              <span className={styles.statusDot} />
              <span>Lần cuối lưu: {formatLastSaved()}</span>
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
    </div>
  );
}
