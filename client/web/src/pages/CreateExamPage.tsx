import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Clock, 
  Search, 
  X, 
  Rocket, 
  ChevronLeft, 
  ChevronRight, 
  HelpCircle, 
  Info,
  CheckCircle2
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useClassStore } from '../presentation/store/classStore';
import { useQuestionStore } from '../presentation/store/questionStore';
import { useExamStore } from '../presentation/store/examStore';
import { useOMRTemplateStore } from '../presentation/store/omrTemplateStore';
import { useSubjectStore } from '../presentation/store/subjectStore';
import { resolveAssignedQuestions } from './examPageAdapters';
import styles from './CreateExamPage.module.css';

// ─── LaTeX Renderer Helper ──────────────────────────────────────────────────
function Latex({ math, block = false }: { math: string; block?: boolean }) {
  try {
    const html = katex.renderToString(math, {
      displayMode: block,
      throwOnError: false,
    });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <span>{math}</span>;
  }
}

function parseMathText(text: string) {
  if (!text) return '';
  
  // Normalize \( and \) to $
  let normalized = text.replace(/\\\(|\\\)/g, '$');
  // Normalize \[ and \] to $$
  normalized = normalized.replace(/\\\[|\\\]/g, '$$$$');
  
  // Split by $$ first to find block equations
  const blockParts = normalized.split('$$');
  
  return (
    <>
      {blockParts.map((blockPart, blockIndex) => {
        // Odd indexes are block math
        if (blockIndex % 2 === 1) {
          return (
            <div key={`block-${blockIndex}`} className={styles.formulaBox}>
              <Latex math={blockPart} block />
            </div>
          );
        }
        
        // Even indexes are text that might contain inline math ($)
        const inlineParts = blockPart.split('$');
        return (
          <span key={`text-${blockIndex}`}>
            {inlineParts.map((part, inlineIndex) => {
              if (inlineIndex % 2 === 1) {
                return <Latex key={`inline-${inlineIndex}`} math={part} />;
              }
              return part;
            })}
          </span>
        );
      })}
    </>
  );
}

export default function CreateExamPage() {
  const navigate = useNavigate();
  const { classes, fetchClasses } = useClassStore();
  const { questions: storeQuestions, pagination: questionPagination, fetchQuestions } = useQuestionStore();
  const { fetchExams, createExam, generateExamVersions } = useExamStore();
  const { templates: omrTemplates, isLoading: isOmrLoading, fetchTemplates: fetchOmrTemplates } = useOMRTemplateStore();
  const { subjects, fetchSubjects } = useSubjectStore();

  // ─── API Lists ─────────────────────────────────────────────────────────────
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ─── Form Fields States ─────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [primaryClassId, setPrimaryClassId] = useState('');
  
  // Specs
  const [omrTemplateId, setOmrTemplateId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [duration, setDuration] = useState(45);
  const [numberOfQuestions, setNumberOfQuestions] = useState(40);
  const [numberOfVersions, setNumberOfVersions] = useState(4);
  const [totalScore, setTotalScore] = useState(10);
  const [passingScore, setPassingScore] = useState(5);

  // Shuffle Configuration
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);

  // Print Layout Formatting
  const [paperSize, setPaperSize] = useState<'A4' | 'A5'>('A4');
  const [paperEngine, setPaperEngine] = useState<'auto' | 'amc' | 'pdfkit'>('auto');
  const [questionsPerPage, setQuestionsPerPage] = useState(20);
  const [schoolHeader, setSchoolHeader] = useState(true);
  const [includeInstructions, setIncludeInstructions] = useState(true);

  // Questions assignment
  const [assignedQuestionIds, setAssignedQuestionIds] = useState<string[]>([]);
  const [assignedQuestionsLocalSearch, setAssignedQuestionsLocalSearch] = useState('');

  // ─── Question Bank Modal Selector ──────────────────────────────────────────
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankSearchText, setBankSearchText] = useState('');
  const [bankDifficultyFilter, setBankDifficultyFilter] = useState('');
  const [bankPage, setBankPage] = useState(1);

  const allAvailableQuestions = storeQuestions;

  // Questions visible on the creation card page
  const mainCardQuestions = useMemo(() => {
    let list = resolveAssignedQuestions(allAvailableQuestions, assignedQuestionIds);
    
    if (assignedQuestionsLocalSearch.trim()) {
      const q = assignedQuestionsLocalSearch.toLowerCase();
      list = list.filter(item => item.text.toLowerCase().includes(q));
    }
    return list;
  }, [allAvailableQuestions, assignedQuestionIds, assignedQuestionsLocalSearch]);

  // ─── Initial Data Load ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchClasses({ limit: 100 });
    fetchQuestions({ limit: 100, page: 1 });
    fetchOmrTemplates();

    // Preset today's date formatted for html input (yyyy-mm-dd)
    const today = new Date().toISOString().split('T')[0];
    setExamDate(today);
  }, [fetchClasses, fetchQuestions, fetchOmrTemplates]);

  // Fetch subjects list
  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // Auto-select first subject when subjects load
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0]._id);
    }
  }, [subjects, selectedSubjectId]);

  // Sync primaryClassId when selectedClassIds change
  useEffect(() => {
    if (selectedClassIds.length > 0) {
      // If primaryClassId is not in selected list, default it to the first selected class
      if (!selectedClassIds.includes(primaryClassId)) {
        setPrimaryClassId(selectedClassIds[0]);
      }
    } else {
      setPrimaryClassId('');
    }
  }, [selectedClassIds, primaryClassId]);

  // Auto-select first OMR template when loaded
  useEffect(() => {
    if (!isOmrLoading && omrTemplates.length > 0 && !omrTemplateId) {
      setOmrTemplateId(omrTemplates[0]._id);
    }
  }, [omrTemplates, isOmrLoading, omrTemplateId]);

  // Toggle class selection checkbox
  const handleToggleClass = (classId: string) => {
    setSelectedClassIds(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  // Questions count selected
  const selectedQuestionsCount = assignedQuestionIds.length;

  // Toggle question selection
  const handleToggleQuestionAssignment = (qId: string) => {
    setAssignedQuestionIds(prev => 
      prev.includes(qId)
        ? prev.filter(id => id !== qId)
        : [...prev, qId]
    );
  };

  // ─── Question Bank Modal Logic ─────────────────────────────────────────────
  const openQuestionBankModal = () => {
    setIsBankModalOpen(true);
    setBankPage(1);
    fetchQuestions({ limit: 10, page: 1, search: bankSearchText, difficulty: bankDifficultyFilter });
  };

  const handleBankSearch = () => {
    setBankPage(1);
    fetchQuestions({ limit: 10, page: 1, search: bankSearchText, difficulty: bankDifficultyFilter });
  };

  const handleBankPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (questionPagination.pages || 1)) {
      setBankPage(newPage);
      fetchQuestions({ 
        limit: 10, 
        page: newPage, 
        search: bankSearchText, 
        difficulty: bankDifficultyFilter 
      });
    }
  };

  // ─── Submit Form Logic ─────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Vui lòng nhập tên bài kiểm tra.');
      return;
    }
    if (selectedClassIds.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một lớp thi.');
      return;
    }
    if (!omrTemplateId) {
      // If OMR templates list is loading or failed, find fallback seed id
      if (omrTemplates.length > 0) {
        setErrorMessage('Vui lòng chọn mẫu OMR.');
        return;
      }
    }

    if (assignedQuestionIds.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một câu hỏi từ ngân hàng câu hỏi.');
      return;
    }

    setIsSubmitLoading(true);
    setErrorMessage(null);

    const finalQuestionIds = assignedQuestionIds;

    // Resolve subjectName from selected subjectId
    const subjectName = selectedSubjectId
      ? (subjects.find(s => s._id === selectedSubjectId)?.name || '')
      : '';

    // Build the payload
    const payload = {
      title,
      description,
      classIds: selectedClassIds,
      primaryClassId: primaryClassId || selectedClassIds[0],
      subjectId: selectedSubjectId,
      subjectName,
      omrTemplateId,
      examDate: new Date(`${examDate}T${startTime}:00`).toISOString(),
      startTime,
      duration: Number(duration),
      totalScore: Number(totalScore),
      passingScore: Number(passingScore),
      numberOfQuestions: Number(numberOfQuestions),
      numberOfVersions: Number(numberOfVersions),
      shuffleConfig: {
        shuffleQuestions,
        shuffleOptions
      },
      printConfig: {
        paperSize,
        questionsPerPage: Math.min(Number(questionsPerPage), 10),
        includeAnswerSheet: true,
        schoolHeader,
        paperEngine,
      },
      questionIds: finalQuestionIds,
    };

    try {
      const result = await createExam(payload);
      if (result) {
        await fetchExams();

        // Auto-generate versions if requested
        if (numberOfVersions > 0) {
          try {
            await generateExamVersions(result._id, numberOfVersions);
          } catch (genErr) {
            console.warn('Version generation failed:', genErr);
          }
        }

        navigate('/exams');
      } else {
        setErrorMessage('Có lỗi xảy ra khi tạo đề thi.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Có lỗi xảy ra khi tạo đề thi.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* ─── Breadcrumb Navigation ─────────────────────────────────────────── */}
      <nav className={styles.breadcrumb}>
        <Link to="/exams" className={styles.breadcrumbLink}>Quản lý bài thi</Link>
        <span className={styles.breadcrumbSeparator}>&gt;</span>
        <span className={styles.breadcrumbActive}>Tạo bài kiểm tra mới</span>
      </nav>

      {/* ─── Page Title / Back Link ────────────────────────────────────────── */}
      <div className={styles.header}>
        <Link to="/exams" className={styles.backBtn}>
          <ArrowLeft size={16} />
          <span>Quay lại</span>
        </Link>
        <h1 className={styles.title}>Tạo bài kiểm tra mới</h1>
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

      {/* ─── Main Grid Layout ─── */}
      <form onSubmit={handleSubmit} className={styles.formGrid}>
        
        {/* Card 1: Thông tin cơ bản & Đối tượng kiểm tra */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderTitle}>
              <span className={styles.stepNumber}>01</span>
              <h2>Thông tin cơ bản</h2>
            </div>
          </div>
          
          <div className={styles.cardContent}>
            {/* Exam Title */}
            <div className={styles.formGroup}>
              <label htmlFor="exam-title" className={styles.fieldLabel}>Tên bài kiểm tra <span className={styles.required}>*</span></label>
              <input 
                id="exam-title"
                type="text" 
                required 
                placeholder="VD: Kiểm tra Giữa kỳ I - Toán 12"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={styles.inputField}
              />
            </div>

            {/* Subject Selector */}
            <div className={styles.formGroup}>
              <label htmlFor="subject-select" className={styles.fieldLabel}>Môn học <span className={styles.required}>*</span></label>
              <select
                id="subject-select"
                required
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className={styles.selectField}
              >
                <option value="">-- Chọn môn học --</option>
                {subjects.length === 0 ? (
                  <option value="subj001">Toán học</option>
                ) : (
                  subjects.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))
                )}
              </select>
            </div>

            {/* Description */}
            <div className={styles.formGroup}>
              <label htmlFor="exam-desc" className={styles.fieldLabel}>Mô tả</label>
              <textarea 
                id="exam-desc"
                placeholder="Nhập mô tả hoặc hướng dẫn cho học sinh..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={styles.textareaField}
                rows={3}
              />
            </div>

            {/* Target Settings */}
            <div className={styles.targetSection}>
              <div className={styles.targetIconHeader}>
                <HelpCircle size={15} />
                <span>Đối tượng kiểm tra</span>
              </div>

              <div className={styles.targetGrid}>
                {/* Class selector list */}
                <div className={styles.classListWrapper}>
                  <label className={styles.subLabel}>Danh sách lớp</label>
                  <div className={styles.classListContainer}>
                    {classes.length === 0 ? (
                      <div className={styles.noClassesMsg}>Đang tải danh sách lớp...</div>
                    ) : (
                      classes.map((cls) => {
                        const isChecked = selectedClassIds.includes(cls._id);
                        return (
                          <label key={cls._id} className={styles.classCheckItem}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => handleToggleClass(cls._id)}
                              className={styles.checkboxInput}
                            />
                            <span className={styles.checkboxLabelText}>{cls.name}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <div className={styles.selectedCountBadge}>
                    Đã chọn: {selectedClassIds.length} lớp
                  </div>
                </div>

                {/* Primary Class dropdown picker */}
                <div className={styles.primaryClassWrapper}>
                  <label htmlFor="primary-class-select" className={styles.subLabel}>Lớp chính</label>
                  <select 
                    id="primary-class-select"
                    value={primaryClassId}
                    onChange={(e) => setPrimaryClassId(e.target.value)}
                    disabled={selectedClassIds.length === 0}
                    className={styles.selectField}
                  >
                    <option value="">-- Chọn lớp chính --</option>
                    {classes
                      .filter(cls => selectedClassIds.includes(cls._id))
                      .map(cls => (
                        <option key={cls._id} value={cls._id}>{cls.name}</option>
                      ))}
                  </select>
                  <p className={styles.fieldHelper}>Dùng để áp dụng cấu trúc mặc định của lớp này.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Card 2: Thông số bài thi */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderTitle}>
              <span className={styles.stepNumber}>02</span>
              <h2>Thông số bài thi</h2>
            </div>
          </div>
          
          <div className={styles.cardContent}>
            <div className={styles.grid4Col}>
              {/* OMR Template */}
              <div className={styles.formGroup}>
                <label htmlFor="omr-template-select" className={styles.fieldLabel}>Mẫu OMR <span className={styles.required}>*</span></label>
                <select 
                  id="omr-template-select"
                  value={omrTemplateId}
                  onChange={(e) => setOmrTemplateId(e.target.value)}
                  className={styles.selectField}
                  required
                >
                  <option value="">-- Chọn mẫu phiếu --</option>
                  {omrTemplates.length === 0 ? (
                    <>
                      <option value="6a17f0091743766eb47a09ce">Mẫu 50 câu (Tiêu chuẩn)</option>
                      <option value="6a17f0091743766eb47a09cf">Mẫu 30 câu (Giữa kỳ)</option>
                      <option value="6a17f0091743766eb47a09d0">Mẫu 15 câu (15 phút)</option>
                    </>
                  ) : (
                    omrTemplates.map(tpl => (
                      <option key={tpl._id} value={tpl._id}>{tpl.name}</option>
                    ))
                  )}
                </select>
              </div>

              {/* Exam Date */}
              <div className={styles.formGroup}>
                <label htmlFor="exam-date-picker" className={styles.fieldLabel}>Ngày thi <span className={styles.required}>*</span></label>
                <div className={styles.iconInputWrapper}>
                  <CalendarIcon size={16} className={styles.inputIcon} />
                  <input 
                    id="exam-date-picker"
                    type="date" 
                    required 
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className={styles.inputFieldWithIcon}
                  />
                </div>
              </div>

              {/* Start Time */}
              <div className={styles.formGroup}>
                <label htmlFor="start-time-picker" className={styles.fieldLabel}>Giờ bắt đầu <span className={styles.required}>*</span></label>
                <div className={styles.iconInputWrapper}>
                  <Clock size={16} className={styles.inputIcon} />
                  <input 
                    id="start-time-picker"
                    type="time" 
                    required 
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={styles.inputFieldWithIcon}
                  />
                </div>
              </div>

              {/* Duration */}
              <div className={styles.formGroup}>
                <label htmlFor="duration-input" className={styles.fieldLabel}>Thời gian làm bài (phút) <span className={styles.required}>*</span></label>
                <div className={styles.iconInputWrapper}>
                  <Clock size={16} className={styles.inputIcon} />
                  <input 
                    id="duration-input"
                    type="number" 
                    required 
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className={styles.inputFieldWithIcon}
                  />
                </div>
              </div>

              {/* Number of Questions */}
              <div className={styles.formGroup}>
                <label htmlFor="questions-count-input" className={styles.fieldLabel}>Số câu hỏi <span className={styles.required}>*</span></label>
                <input 
                  id="questions-count-input"
                  type="number" 
                  required 
                  min={1}
                  value={numberOfQuestions}
                  onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
                  className={styles.inputField}
                />
              </div>

              {/* Number of Versions */}
              <div className={styles.formGroup}>
                <label htmlFor="versions-count-input" className={styles.fieldLabel}>Số mã đề <span className={styles.required}>*</span></label>
                <input 
                  id="versions-count-input"
                  type="number" 
                  required 
                  min={1}
                  max={50}
                  value={numberOfVersions}
                  onChange={(e) => setNumberOfVersions(Number(e.target.value))}
                  className={styles.inputField}
                />
              </div>

              {/* Total Score */}
              <div className={styles.formGroup}>
                <label htmlFor="total-score-input" className={styles.fieldLabel}>Điểm tổng <span className={styles.required}>*</span></label>
                <input 
                  id="total-score-input"
                  type="number" 
                  required 
                  min={1}
                  value={totalScore}
                  onChange={(e) => setTotalScore(Number(e.target.value))}
                  className={styles.inputField}
                />
              </div>

              {/* Passing Score */}
              <div className={styles.formGroup}>
                <label htmlFor="passing-score-input" className={styles.fieldLabel}>Điểm đạt <span className={styles.required}>*</span></label>
                <input 
                  id="passing-score-input"
                  type="number" 
                  required 
                  min={0}
                  value={passingScore}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
                  className={styles.inputField}
                />
              </div>
            </div>

            {/* Card 3: Tùy chọn xáo trộn */}
            <div className={styles.shuffleSection}>
              <div className={styles.sectionDivider} />
              <h3 className={styles.sectionSubtitle}>Tùy chọn xáo trộn</h3>
              
              <div className={styles.grid2Col}>
                {/* Shuffle Questions */}
                <label className={styles.shuffleOptionCard}>
                  <input 
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className={styles.checkboxSquare}
                  />
                  <div className={styles.optionDetails}>
                    <span className={styles.optionTitle}>Đảo câu hỏi</span>
                    <span className={styles.optionDesc}>Xáo trộn thứ tự các câu hỏi trong mỗi mã đề khác nhau.</span>
                  </div>
                </label>

                {/* Shuffle Answers */}
                <label className={styles.shuffleOptionCard}>
                  <input 
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className={styles.checkboxSquare}
                  />
                  <div className={styles.optionDetails}>
                    <span className={styles.optionTitle}>Đảo đáp án</span>
                    <span className={styles.optionDesc}>Xáo trộn thứ tự A, B, C, D cho từng câu hỏi.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Card 4: Định dạng in ấn */}
            <div className={styles.printSection}>
              <div className={styles.sectionDivider} />
              <h3 className={styles.sectionSubtitle}>Định dạng in ấn</h3>

              <div className={styles.grid4ColAlign}>
                {/* Paper Size */}
                <div className={styles.formGroup}>
                  <label htmlFor="paper-size-select" className={styles.fieldLabel}>Khổ giấy</label>
                  <select
                    id="paper-size-select"
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as 'A4' | 'A5')}
                    className={styles.selectField}
                  >
                    <option value="A4">A4</option>
                    <option value="A5">A5</option>
                  </select>
                </div>

                {/* Paper Engine */}
                <div className={styles.formGroup}>
                  <label htmlFor="paper-engine-select" className={styles.fieldLabel}>Engine tạo đề thi</label>
                  <select
                    id="paper-engine-select"
                    value={paperEngine}
                    onChange={(e) => setPaperEngine(e.target.value as 'auto' | 'amc' | 'pdfkit')}
                    className={styles.selectField}
                  >
                    <option value="auto">Tự động (AMC nếu có sẵn)</option>
                    <option value="amc">AMC (LaTeX, chuẩn quốc tế)</option>
                    <option value="pdfkit">PDFKit (legacy)</option>
                  </select>
                  <p className={styles.fieldHelper}>AMC sinh đề chuẩn với OMR sheet chính xác hơn.</p>
                </div>

                {/* Questions Per Page */}
                <div className={styles.formGroup}>
                  <label htmlFor="questions-per-page-input" className={styles.fieldLabel}>Số câu/trang</label>
                  <input 
                    id="questions-per-page-input"
                    type="number"
                    min={1}
                    value={questionsPerPage}
                    onChange={(e) => setQuestionsPerPage(Number(e.target.value))}
                    className={styles.inputField}
                  />
                </div>

                {/* Show Header */}
                <label className={styles.alignCheckbox}>
                  <input 
                    type="checkbox"
                    checked={schoolHeader}
                    onChange={(e) => setSchoolHeader(e.target.checked)}
                    className={styles.checkboxSquare}
                  />
                  <span className={styles.checkboxTextLabel}>Hiển thị header</span>
                </label>

                {/* Show Instructions */}
                <label className={styles.alignCheckbox}>
                  <input 
                    type="checkbox"
                    checked={includeInstructions}
                    onChange={(e) => setIncludeInstructions(e.target.checked)}
                    className={styles.checkboxSquare}
                  />
                  <span className={styles.checkboxTextLabel}>Hiển thị hướng dẫn</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Card 5: Gán câu hỏi */}
        <section className={styles.card}>
          <div className={styles.cardHeaderFlex}>
            <div className={styles.cardHeaderTitle}>
              <span className={styles.stepNumber}>03</span>
              <h2>Gán câu hỏi</h2>
            </div>
            
            <span className={styles.questionSelectedBadge}>
              Đã chọn: {selectedQuestionsCount}/{numberOfQuestions} câu
            </span>
          </div>

          <div className={styles.cardContent}>
            {/* Search filter inline */}
            <div className={styles.inlineSearchWrapper}>
              <div className={styles.searchBox}>
                <Search size={16} className={styles.searchIcon} />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm câu hỏi theo nội dung" 
                  value={assignedQuestionsLocalSearch}
                  onChange={(e) => setAssignedQuestionsLocalSearch(e.target.value)}
                  className={styles.searchField}
                />
              </div>
            </div>

            {/* Questions list selection */}
            <div className={styles.questionsContainer}>
              {mainCardQuestions.length === 0 ? (
                <div className={styles.emptyQuestions}>Không tìm thấy câu hỏi phù hợp.</div>
              ) : (
                mainCardQuestions.map((q) => {
                  const isChecked = assignedQuestionIds.includes(q._id);
                  
                  // Difficulty color tag
                  let diffColor = styles.diffMedium;
                  let diffText = 'Trung bình';
                  if (q.difficulty === 'Easy') {
                    diffColor = styles.diffEasy;
                    diffText = 'Dễ';
                  } else if (q.difficulty === 'Hard') {
                    diffColor = styles.diffHard;
                    diffText = 'Khó';
                  }

                  return (
                    <article key={q._id} className={`${styles.questionCardRow} ${isChecked ? styles.questionChecked : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => handleToggleQuestionAssignment(q._id)}
                        className={styles.questionCheckbox}
                      />
                      
                      <div className={styles.questionBody}>
                        <div className={styles.questionTagsRow}>
                          <span className={styles.typeBadge}>
                            {q.options.length === 2 ? 'ĐÚNG/SAI' : 'TRẮC NGHIỆM ĐƠN'}
                          </span>
                          <span className={`${styles.diffBadge} ${diffColor}`}>
                            {diffText}
                          </span>
                        </div>

                        <div className={styles.questionText}>
                          {parseMathText(q.text)}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {/* View more from Question Bank */}
            <button 
              type="button" 
              onClick={openQuestionBankModal}
              className={styles.exploreBankBtn}
            >
              <span>Xem thêm câu hỏi từ Ngân hàng</span>
            </button>
          </div>
        </section>

        {/* Space wrapper to avoid footer blocking input content */}
        <div style={{ height: '80px' }} />

        {/* ─── STICKY FOOTER BAR ─── */}
        <footer className={styles.stickyFooter}>
          <div className={styles.footerContent}>
            {/* Left status indicator */}
            <div className={styles.statusLeft}>
              <CheckCircle2 size={16} className={styles.checkIcon} />
              <span>Tất cả thay đổi đã được lưu tự động.</span>
            </div>

            {/* Right actions buttons */}
            <div className={styles.actionsRight}>
              <button 
                type="button" 
                onClick={() => navigate('/exams')}
                className={styles.cancelBtn}
              >
                Hủy bỏ
              </button>

              <button 
                type="submit" 
                disabled={isSubmitLoading}
                className={styles.submitBtn}
              >
                {isSubmitLoading ? (
                  <div className={styles.spinner} />
                ) : (
                  <>
                    <Rocket size={16} />
                    <span>Tạo bài kiểm tra</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </footer>

      </form>

      {/* ─── MODAL: QUESTION BANK SELECTOR ─── */}
      {isBankModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsBankModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            
            <div className={styles.modalHeader}>
              <h2>Ngân hàng câu hỏi của trường</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setIsBankModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalFilterBar}>
              <div className={styles.modalSearchBox}>
                <Search size={16} className={styles.searchIcon} />
                <input 
                  type="text" 
                  placeholder="Tìm câu hỏi..." 
                  value={bankSearchText}
                  onChange={(e) => setBankSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBankSearch()}
                  className={styles.modalSearchField}
                />
              </div>

              <select 
                value={bankDifficultyFilter}
                onChange={(e) => setBankDifficultyFilter(e.target.value)}
                className={styles.modalSelectField}
              >
                <option value="">-- Mọi độ khó --</option>
                <option value="easy">Dễ</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó</option>
              </select>

              <button type="button" onClick={handleBankSearch} className={styles.modalSearchBtn}>
                Tìm kiếm
              </button>
            </div>

            {/* List in modal */}
            <div className={styles.modalQuestionsList}>
              {allAvailableQuestions.length === 0 ? (
                <div className={styles.modalLoading}>Không tìm thấy câu hỏi nào.</div>
              ) : (
                allAvailableQuestions
                  .filter(q => {
                    // client filtering combined with server parameters for maximum reliability
                    if (bankSearchText.trim()) {
                      const searchLower = bankSearchText.toLowerCase();
                      if (!q.text.toLowerCase().includes(searchLower)) return false;
                    }
                    if (bankDifficultyFilter) {
                      if (q.difficulty.toLowerCase() !== bankDifficultyFilter.toLowerCase()) return false;
                    }
                    return true;
                  })
                  .map((q) => {
                    const isChecked = assignedQuestionIds.includes(q._id);
                    
                    let diffColor = styles.diffMedium;
                    let diffText = 'Trung bình';
                    if (q.difficulty === 'Easy') {
                      diffColor = styles.diffEasy;
                      diffText = 'Dễ';
                    } else if (q.difficulty === 'Hard') {
                      diffColor = styles.diffHard;
                      diffText = 'Khó';
                    }

                    return (
                      <div key={q._id} className={`${styles.modalQuestionRow} ${isChecked ? styles.modalQuestionChecked : ''}`}>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleToggleQuestionAssignment(q._id)}
                          className={styles.questionCheckbox}
                        />
                        <div className={styles.modalQuestionContent}>
                          <div className={styles.questionTagsRow}>
                            <span className={styles.typeBadge}>
                              {q.options.length === 2 ? 'ĐÚNG/SAI' : 'TRẮC NGHIỆM ĐƠN'}
                            </span>
                            <span className={`${styles.diffBadge} ${diffColor}`}>
                              {diffText}
                            </span>
                          </div>
                          <div className={styles.modalQuestionText}>
                            {parseMathText(q.text)}
                          </div>
                          
                          {/* Render options in list */}
                          <div className={styles.modalOptionsGrid}>
                            {q.options.map(opt => (
                              <div key={opt.letter} className={styles.modalOption}>
                                <strong style={{ marginRight: '6px' }}>{opt.letter}.</strong>
                                <span>{parseMathText(opt.text)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Footer with pagination */}
            <div className={styles.modalFooter}>
              <span className={styles.modalSelectionCount}>
                Đã chọn {selectedQuestionsCount} câu hỏi
              </span>

              <div className={styles.modalPagination}>
                <button 
                  type="button" 
                  disabled={bankPage <= 1}
                  onClick={() => handleBankPageChange(bankPage - 1)}
                  className={styles.modalNavBtn}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className={styles.modalPageIndicator}>
                  Trang {bankPage} / {questionPagination.pages || 1}
                </span>
                <button 
                  type="button" 
                  disabled={bankPage >= (questionPagination.pages || 1)}
                  onClick={() => handleBankPageChange(bankPage + 1)}
                  className={styles.modalNavBtn}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <button 
                type="button" 
                onClick={() => setIsBankModalOpen(false)}
                className={styles.modalDoneBtn}
              >
                Hoàn tất
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
