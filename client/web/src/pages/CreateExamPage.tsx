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
  FileText
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useClassStore } from '../presentation/store/classStore';
import { useQuestionStore } from '../presentation/store/questionStore';
import { useExamStore } from '../presentation/store/examStore';
import { resolveAssignedQuestions } from './examPageAdapters';
import styles from './CreateExamPage.module.css';

// ─── LaTeX Renderer Helper ──────────────────────────────────────────────────
function renderMath(math: string, block: boolean): string {
  try {
    const html = katex.renderToString(math, {
      displayMode: block,
      throwOnError: false,
    });
    return html;
  } catch {
    return math;
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
          const html = renderMath(blockPart, true);
          return (
            <div key={`block-${blockIndex}`} className={styles.formulaBox}>
              <span dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          );
        }
        
        // Even indexes are text that might contain inline math ($)
        const inlineParts = blockPart.split('$');
        return (
          <span key={`text-${blockIndex}`}>
            {inlineParts.map((part, inlineIndex) => {
              if (inlineIndex % 2 === 1) {
                const html = renderMath(part, false);
                return <span key={`inline-${inlineIndex}`} dangerouslySetInnerHTML={{ __html: html }} />;
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
  const { questions: storeQuestions, pagination: questionPagination, fetchQuestions, fetchTags, availableTags, fetchQuestionsByTags, tagQuestions, isLoadingTagQuestions } = useQuestionStore();
  const { fetchExams, createExam, generateExamVersions } = useExamStore();

  // ─── API Lists ─────────────────────────────────────────────────────────────
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ─── Form Fields States ─────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  
  // Specs
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

  // Questions assignment
  const [assignedQuestionIds, setAssignedQuestionIds] = useState<string[]>([]);
  const [assignedQuestionsLocalSearch, setAssignedQuestionsLocalSearch] = useState('');

  // Derived count for UI display
  const selectedQuestionsCount = assignedQuestionIds.length;

  // ─── Question Bank Modal Selector ──────────────────────────────────────────
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankSearchText, setBankSearchText] = useState('');
  const [bankDifficultyFilter, setBankDifficultyFilter] = useState('');
  const [bankPage, setBankPage] = useState(1);

  // ─── Tag-based Selection ────────────────────────────────────────────────────
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagDifficultyFilter, setTagDifficultyFilter] = useState('');

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
    fetchTags(); // Load available tags for filtering

    // Preset today's date formatted for html input (yyyy-mm-dd)
    const today = new Date().toISOString().split('T')[0];
    setExamDate(today);
  }, [fetchClasses, fetchQuestions, fetchTags]);

  // Toggle class selection checkbox
  const handleToggleClass = (classId: string) => {
    setSelectedClassIds(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

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
      setErrorMessage('Please enter the exam name.');
      return;
    }
    if (selectedClassIds.length === 0) {
      setErrorMessage('Please select at least one class.');
      return;
    }

    if (assignedQuestionIds.length === 0) {
      setErrorMessage('Please select at least one question from the question bank.');
      return;
    }

    setIsSubmitLoading(true);
    setErrorMessage(null);

    // Build the payload
    const payload = {
      title,
      description,
      classIds: selectedClassIds,
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
      questionIds: assignedQuestionIds,
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
        setErrorMessage('An error occurred while creating the exam.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An error occurred while creating the exam.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* ─── Breadcrumb Navigation ─────────────────────────────────────────── */}
      <nav className={styles.breadcrumb}>
        <Link to="/exams" className={styles.breadcrumbLink}>Exam Management</Link>
        <span className={styles.breadcrumbSeparator}>&gt;</span>
        <span className={styles.breadcrumbActive}>Create New Exam</span>
      </nav>

      {/* ─── Page Title / Back Link ────────────────────────────────────────── */}
      <div className={styles.header}>
        <Link to="/exams" className={styles.backBtn}>
          <ArrowLeft size={16} />
          <span>Go Back</span>
        </Link>
        <h1 className={styles.title}>Create New Exam</h1>
      </div>

      {errorMessage && (
        <div className={styles.errorBanner}>
          <span>{errorMessage}</span>
          <button className={styles.errorClose} onClick={() => setErrorMessage(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ─── Main Form Layout ─── */}
      <form onSubmit={handleSubmit} className={styles.formGrid}>
        
        {/* Card 1: Basic Information */}
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
              <label htmlFor="exam-title" className={styles.fieldLabel}>Exam name <span className={styles.required}>*</span></label>
              <input 
                id="exam-title"
                type="text" 
                required 
                placeholder="e.g. Midterm Exam I - Math 12"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={styles.inputField}
              />
            </div>

            {/* Description */}
            <div className={styles.formGroup}>
              <label htmlFor="exam-desc" className={styles.fieldLabel}>Description</label>
              <textarea 
                id="exam-desc"
                placeholder="Enter description or instructions for students..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={styles.textareaField}
                rows={3}
              />
            </div>

            {/* Class Selection */}
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel}>Participating classes <span className={styles.required}>*</span></label>
              <div className={styles.classListContainer}>
                {classes.length === 0 ? (
                  <div className={styles.noClassesMsg}>Loading class list...</div>
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
                Selected: {selectedClassIds.length} classes
              </div>
            </div>
          </div>
        </section>

        {/* Card 2: Exam Configuration */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderTitle}>
              <span className={styles.stepNumber}>02</span>
              <h2>Exam Configuration</h2>
            </div>
          </div>
          
          <div className={styles.cardContent}>
            {/* Time & Date Grid */}
            <div className={styles.sectionSubtitle}>Time & Location</div>
            <div className={styles.grid3Col}>
              {/* Exam Date */}
              <div className={styles.formGroup}>
                <label htmlFor="exam-date-picker" className={styles.fieldLabel}>Exam date <span className={styles.required}>*</span></label>
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
                <label htmlFor="start-time-picker" className={styles.fieldLabel}>Start time <span className={styles.required}>*</span></label>
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
                <label htmlFor="duration-input" className={styles.fieldLabel}>Exam duration (minutes) <span className={styles.required}>*</span></label>
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
            </div>

            {/* Score & Questions Grid */}
            <div className={styles.sectionSubtitle}>Scores</div>
            <div className={styles.grid4Col}>
              {/* Total Score */}
              <div className={styles.formGroup}>
                <label htmlFor="total-score-input" className={styles.fieldLabel}>Total score <span className={styles.required}>*</span></label>
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
                <label htmlFor="passing-score-input" className={styles.fieldLabel}>Passing score <span className={styles.required}>*</span></label>
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

              {/* Number of Questions */}
              <div className={styles.formGroup}>
                <label htmlFor="questions-count-input" className={styles.fieldLabel}>Number of questions <span className={styles.required}>*</span></label>
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
                <label htmlFor="versions-count-input" className={styles.fieldLabel}>Number of variants <span className={styles.required}>*</span></label>
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
            </div>

            {/* Shuffle Options */}
            <div className={styles.sectionDivider} />
            <div className={styles.sectionSubtitle}>Shuffle options</div>
            <div className={styles.grid2Col}>
              <label className={styles.shuffleOptionCard}>
                <input 
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className={styles.checkboxSquare}
                />
                <div className={styles.optionDetails}>
                  <span className={styles.optionTitle}>Shuffle questions</span>
                  <span className={styles.optionDesc}>Randomize the order of questions in each exam variant.</span>
                </div>
              </label>

              <label className={styles.shuffleOptionCard}>
                <input 
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className={styles.checkboxSquare}
                />
                <div className={styles.optionDetails}>
                  <span className={styles.optionTitle}>Shuffle answer choices</span>
                  <span className={styles.optionDesc}>Randomize the order of A, B, C, D options for each question.</span>
                </div>
              </label>
            </div>
          </div>
        </section>

        {/* Card 3: Assign Questions */}
        <section className={styles.card}>
          <div className={styles.cardHeaderFlex}>
            <div className={styles.cardHeaderTitle}>
              <span className={styles.stepNumber}>03</span>
              <h2>Assign Questions</h2>
            </div>
            
            <span className={styles.questionSelectedBadge}>
              Selected: {assignedQuestionIds.length}/{numberOfQuestions} questions
            </span>
          </div>

          <div className={styles.cardContent}>
            {/* Search filter inline */}
            <div className={styles.inlineSearchWrapper}>
              <div className={styles.searchBox}>
                <Search size={16} className={styles.searchIcon} />
                <input 
                  type="text" 
                  placeholder="Search questions by content" 
                  value={assignedQuestionsLocalSearch}
                  onChange={(e) => setAssignedQuestionsLocalSearch(e.target.value)}
                  className={styles.searchField}
                />
              </div>
            </div>

            {/* Questions list selection */}
            <div className={styles.questionsContainer}>
              {mainCardQuestions.length === 0 ? (
                <div className={styles.emptyQuestions}>No matching questions found.</div>
              ) : (
                mainCardQuestions.map((q) => {
                  const isChecked = assignedQuestionIds.includes(q._id);
                  
                  let diffColor = styles.diffMedium;
                  let diffText = 'Medium';
                  if (q.difficulty === 'Easy') {
                    diffColor = styles.diffEasy;
                    diffText = 'Easy';
                  } else if (q.difficulty === 'Hard') {
                    diffColor = styles.diffHard;
                    diffText = 'Hard';
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
                            {q.options.length === 2 ? 'TRUE/FALSE' : 'SINGLE CHOICE'}
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
              <FileText size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              <span>Select questions from Question Bank</span>
            </button>
          </div>
        </section>

        {/* Space wrapper to avoid footer blocking input content */}
        <div style={{ height: '80px' }} />

        {/* ─── STICKY FOOTER BAR ─── */}
        <footer className={styles.stickyFooter}>
          <div className={styles.footerContent}>
            {/* Left side - empty for cleaner look */}
            <div />

            {/* Right actions buttons */}
            <div className={styles.actionsRight}>
              <button 
                type="button" 
                onClick={() => navigate('/exams')}
                className={styles.cancelBtn}
              >
                Cancel
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
                    <span>Create exam</span>
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
              <h2>School Question Bank</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setIsBankModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalFilterBar}>
              {/* Tag selection chips */}
              <div className={styles.tagFilterSection}>
                <label className={styles.tagFilterLabel}>Filter by Tags:</label>
                <div className={styles.tagChipsContainer}>
                  {availableTags.slice(0, 15).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setSelectedTags((prev) =>
                          prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                        );
                      }}
                      className={`${styles.tagChip} ${selectedTags.includes(tag) ? styles.tagChipActive : ''}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {selectedTags.length > 0 && (
                  <div className={styles.selectedTagsInfo}>
                    <span>Selected: {selectedTags.length} tags</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTags([]);
                        fetchQuestionsByTags([], { difficulty: tagDifficultyFilter, limit: 20 });
                      }}
                      className={styles.clearTagsBtn}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        fetchQuestionsByTags(selectedTags, { difficulty: tagDifficultyFilter, limit: 50 });
                      }}
                      className={styles.applyTagsBtn}
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>

              {/* Difficulty filter */}
              <select
                value={tagDifficultyFilter}
                onChange={(e) => setTagDifficultyFilter(e.target.value)}
                className={styles.modalSelectField}
              >
                <option value="">-- All difficulties --</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <div className={styles.modalSearchBox}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={bankSearchText}
                  onChange={(e) => setBankSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBankSearch()}
                  className={styles.modalSearchField}
                />
              </div>

              <button type="button" onClick={handleBankSearch} className={styles.modalSearchBtn}>
                Search
              </button>
            </div>

            {/* List in modal */}
            <div className={styles.modalQuestionsList}>
              {isLoadingTagQuestions ? (
                <div className={styles.modalLoading}>Loading questions...</div>
              ) : selectedTags.length > 0 && tagQuestions.length > 0 ? (
                // Show questions fetched by tags
                tagQuestions
                  .filter(q => {
                    if (bankSearchText.trim()) {
                      const searchLower = bankSearchText.toLowerCase();
                      if (!q.text.toLowerCase().includes(searchLower)) return false;
                    }
                    if (tagDifficultyFilter) {
                      if (q.difficulty.toLowerCase() !== tagDifficultyFilter.toLowerCase()) return false;
                    }
                    return true;
                  })
                  .map((q) => {
                    const isChecked = assignedQuestionIds.includes(q._id);

                    let diffColor = styles.diffMedium;
                    let diffText = 'Medium';
                    if (q.difficulty === 'Easy') {
                      diffColor = styles.diffEasy;
                      diffText = 'Easy';
                    } else if (q.difficulty === 'Hard') {
                      diffColor = styles.diffHard;
                      diffText = 'Hard';
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
                              {q.options.length === 2 ? 'TRUE/FALSE' : 'SINGLE CHOICE'}
                            </span>
                            <span className={`${styles.diffBadge} ${diffColor}`}>
                              {diffText}
                            </span>
                            {q.tags && q.tags.length > 0 && (
                              <span className={styles.tagPill}>{q.tags[0]}</span>
                            )}
                          </div>
                          <div className={styles.modalQuestionText}>
                            {parseMathText(q.text)}
                          </div>

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
              ) : allAvailableQuestions.length === 0 ? (
                <div className={styles.modalLoading}>No questions found.</div>
              ) : (
                // Show default questions from store
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
                    let diffText = 'Medium';
                    if (q.difficulty === 'Easy') {
                      diffColor = styles.diffEasy;
                      diffText = 'Easy';
                    } else if (q.difficulty === 'Hard') {
                      diffColor = styles.diffHard;
                      diffText = 'Hard';
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
                              {q.options.length === 2 ? 'TRUE/FALSE' : 'SINGLE CHOICE'}
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
                Selected {assignedQuestionIds.length} questions
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
                  Page {bankPage} / {questionPagination.pages || 1}
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
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
