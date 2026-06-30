import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Sparkles,
  LayoutGrid,
  List,
  Clock,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  X,
  Info,
  Loader2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import styles from './QuestionBankPage.module.css';
import { useQuestionStore, questionService, toFrontendQuestion, type BackendQuestion, type Question } from '../presentation/store/questionStore';
import { useQuestionPermissions } from '../hooks/useQuestionPermissions';
import EntityListPage, { type Column } from '../presentation/components/shared/EntityListPage';
import EntityPageHeader from '../presentation/components/shared/EntityPageHeader';

// ─── LaTeX renderer ────────────────────────────────────────────────────────────
function Latex({ math, block = false }: { math: string; block?: boolean }) {
  const html = (() => {
    try {
      return katex.renderToString(math, {
        displayMode: block,
        throwOnError: false,
      });
    } catch {
      return null;
    }
  })();

  if (html) {
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <span>{math}</span>;
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

// ─── Difficulty color helpers ────────────────────────────────────────────────────
const difficultyColor: Record<string, string> = {
  Easy: '#16a34a',
  Medium: '#d97706',
  Hard: '#dc2626',
};

const difficultyBg: Record<string, string> = {
  Easy: '#f0fdf4',
  Medium: '#fffbeb',
  Hard: '#fef2f2',
};


export default function QuestionBankPage() {
  const {
    questions,
    availableTags,
    isLoading,
    isCreating,
    error,
    createError,
    pagination,
    fetchQuestions,
    fetchTags,
    createQuestion,
    setFilters,
    clearError,
    clearCreateError,
    approveQuestion,
    generateAiQuestions,
    generateSimilarQuestions,
  } = useQuestionStore();

  const permissions = useQuestionPermissions();
  const canManage = permissions.canCreate;

  // Layout
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Difficulty checkboxes
  const [difficulties, setDifficulties] = useState({
    Easy: false,
    Medium: false,
    Hard: false,
  });

  // Approval status filter (local state for teacher/admin)
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiForm, setAiForm] = useState({ topic: '', count: 5, difficulty: 'medium' as 'easy' | 'medium' | 'hard', requirements: '' });
  const [aiPreview, setAiPreview] = useState<ReturnType<typeof toFrontendQuestion>[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // ─── Similar Questions (multi-select) ─────────────────────────────────────────
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [isSimilarModalOpen, setIsSimilarModalOpen] = useState(false);
  const [similarForm, setSimilarForm] = useState({ count: 3, difficulty: 'medium' as 'easy' | 'medium' | 'hard' });
  const [similarPreview, setSimilarPreview] = useState<ReturnType<typeof toFrontendQuestion>[]>([]);
  const [isGeneratingSimilar, setIsGeneratingSimilar] = useState(false);

  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    // Use 'id' field from the question object
    if (selectedQuestionIds.size === filteredQuestions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(filteredQuestions.map((q: any) => q.id || q._id)));
    }
  };

  // Explanation modal - use a flexible type since Question from store has `text` not `content`
  const [activeExplanation, setActiveExplanation] = useState<{
    _id: string;
    text: string;
    explanation?: string;
  } | null>(null);

  // Add Question modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newQuestionForm, setNewQuestionForm] = useState({
    tags: [] as string[],
    difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard',
    text: '',
    formula: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    explanation: '',
  });
  const [tagInputValue, setTagInputValue] = useState('');

  // Submit status for add modal
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // ─── Initial fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchQuestions({ limit: pagination.limit, page: pagination.page });
    fetchTags();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Filter handlers ──────────────────────────────────────────────────────────
  const handleDifficultyChange = (level: 'Easy' | 'Medium' | 'Hard') => {
    const next = { ...difficulties, [level]: !difficulties[level] };
    setDifficulties(next);

    const active = Object.values(next).some(Boolean);
    // Backend uses lowercase: "easy", "medium", "hard"
    const diffStr = active
      ? Object.entries(next)
          .filter(([, v]) => v)
          .map(([k]) => k.toLowerCase())
          .join(',')
      : '';

    setFilters({ difficulty: diffStr });
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) => {
      const next = prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag];
      setFilters({ tags: next.join(',') });
      return next;
    });
  };

  const handleSearch = () => {
    setFilters({ search: searchInput });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setDifficulties({ Easy: false, Medium: false, Hard: false });
    setSelectedTags([]);
    setApprovalFilter('all');
    setTagSearch('');
    setShowAllTags(false);
    setFilters({ search: '', difficulty: '', source: '', tags: '', isApproved: null });
  };

  const handleApproveQuestion = async (questionId: string) => {
    if (!confirm('Phê duyệt câu hỏi này?')) return;
    try {
      await approveQuestion(questionId);
      toast.success('Question approved');
    } catch {
      toast.error('Approval failed');
    }
  };

  // ─── Add question submit ─────────────────────────────────────────────────────
  const handleAddQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccess(false);
    clearCreateError();

    const content = newQuestionForm.formula
      ? `${newQuestionForm.text}\n\n$$${newQuestionForm.formula}$$`
      : newQuestionForm.text;

    const payload = {
      content,
      type: 'single_choice' as const,
      options: [
        { id: 'A' as const, content: newQuestionForm.optionA, isCorrect: newQuestionForm.correctOption === 'A' },
        { id: 'B' as const, content: newQuestionForm.optionB, isCorrect: newQuestionForm.correctOption === 'B' },
        { id: 'C' as const, content: newQuestionForm.optionC, isCorrect: newQuestionForm.correctOption === 'C' },
        { id: 'D' as const, content: newQuestionForm.optionD, isCorrect: newQuestionForm.correctOption === 'D' },
      ],
      difficulty: newQuestionForm.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
      explanation: newQuestionForm.explanation || '',
      source: 'manual' as const,
      tags: newQuestionForm.tags,
    };

    try {
      await createQuestion(payload);
      setSubmitSuccess(true);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setSubmitSuccess(false);
        setNewQuestionForm({
          tags: '',
          difficulty: 'Medium',
          text: '',
          formula: '',
          optionA: '',
          optionB: '',
          optionC: '',
          optionD: '',
          correctOption: 'A',
          explanation: '',
        });
      }, 1500);
    } catch {
      // Error is set in store
    }
  };

  // ─── Pagination ───────────────────────────────────────────────────────────────
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    fetchQuestions({ page: newPage, limit: pagination.limit });
  };

  // ─── Client-side sub-filter for tags not covered by server ───────────────────
  const clientFiltered = useMemo(() => {
    return questions.filter((q) => {
      for (const tag of selectedTags) {
        const tagValue = tag.startsWith('#') ? tag.slice(1) : tag;
        const hasTag = q.tags?.some((t) => t.toLowerCase() === tagValue.toLowerCase());
        if (!hasTag) return false;
      }
      return true;
    });
  }, [questions, selectedTags]);

  const tagSearchLower = tagSearch.trim().toLowerCase();
  const filteredTags = useMemo(() => {
    if (!tagSearchLower) return availableTags;
    return availableTags.filter((tag) => tag.toLowerCase().includes(tagSearchLower));
  }, [availableTags, tagSearchLower]);

  const visibleTags = showAllTags ? filteredTags : filteredTags.slice(0, 8);
  const hasMoreTags = filteredTags.length > 8;

  // Bank integrity (loaded from API)
  const { data: bankStats } = useQuery({
    queryKey: ['question-bank-stats'],
    queryFn: () => questionService.getBankStats(),
  });

  return (
    <div className={styles.container}>
      {/* ─── Top Header ─────────────────────────────────────────────────────── */}
            <EntityPageHeader
        mode="teacher"
        title="Question Bank"
        subtitle="Create, manage, and filter academic questions and equations"
        extraActions={
          canManage ? (
            <>
              {selectedQuestionIds.size > 0 && (
                <button className={styles.createBtn} style={{ backgroundColor: '#059669' }} onClick={() => setIsSimilarModalOpen(true)}>
                  <Sparkles size={18} />
                  <span>Create similar ({selectedQuestionIds.size})</span>
                </button>
              )}
              <button className={styles.createBtn} style={{ backgroundColor: '#7c3aed' }} onClick={() => setIsAiModalOpen(true)}>
                <Sparkles size={18} />
                <span>Generate with AI</span>
              </button>
              <button className={styles.createBtn} onClick={() => setIsAddModalOpen(true)}>
                <Plus size={18} />
                <span>Add Question</span>
              </button>
            </>
          ) : undefined
        }
      />

      {/* ─── Main Layout ────────────────────────────────────────────────────── */}
      <div className={styles.pageLayout}>
        {/* ─── Left: Filters ────────────────────────────────────────────────── */}
        <aside className={styles.filtersPanel}>
          <div className={styles.filtersCard}>
            <h3 className={styles.filterTitle}>Filters</h3>

            {/* Difficulty */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Difficulty</label>
              <div className={styles.checkboxContainer}>
                {(['Easy', 'Medium', 'Hard'] as const).map((level) => (
                  <label key={level} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={difficulties[level]}
                      onChange={() => handleDifficultyChange(level)}
                      className={styles.checkbox}
                    />
                    <span>{level}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Approval Status - chỉ hiện với teacher/admin */}
            {canManage && (
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Status</label>
                <div className={styles.checkboxContainer}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={approvalFilter === 'pending'}
                      onChange={() => {
                        const next = approvalFilter === 'pending' ? 'all' : 'pending';
                        setApprovalFilter(next);
                        setFilters({ isApproved: next === 'pending' ? false : null });
                      }}
                      className={styles.checkbox}
                    />
                    <span>Pending Approval</span>
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={approvalFilter === 'approved'}
                      onChange={() => {
                        const next = approvalFilter === 'approved' ? 'all' : 'approved';
                        setApprovalFilter(next);
                        setFilters({ isApproved: next === 'approved' ? true : null });
                      }}
                      className={styles.checkbox}
                    />
                    <span>Approved</span>
                  </label>
                </div>
              </div>
            )}

            {/* Tags - loaded from backend */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Tags</label>
              {availableTags.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
                  No tags available
                </p>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Search tags..."
                    value={tagSearch}
                    onChange={(e) => {
                      setTagSearch(e.target.value);
                      setShowAllTags(false);
                    }}
                    className={styles.tagSearchInput}
                  />
                  <div className={styles.tagContainer}>
                    {visibleTags.map((tag) => {
                      const isActive = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          className={`${styles.tag} ${isActive ? styles.tagActive : ''}`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                    {filteredTags.length === 0 && (
                      <p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
                        No tags found
                      </p>
                    )}
                  </div>
                  {hasMoreTags && (
                    <button
                      className={styles.showMoreBtn}
                      onClick={() => setShowAllTags((prev) => !prev)}
                    >
                      {showAllTags ? 'Show less' : `Show more (${filteredTags.length - 8})`}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Reset */}
            <button className={styles.resetBtn} onClick={handleResetFilters}>
              Reset Filters
            </button>
          </div>

          {/* Bank Integrity */}
          <div className={styles.integrityCard}>
            <h4 className={styles.integrityTitle}>Bank Integrity</h4>
            {bankStats ? (
              <>
                <p className={styles.integrityValue}>{bankStats.integrity.toFixed(1)}%</p>
                <div className={styles.progressBar}>
                  <div className={styles.progressBarFill} style={{ width: `${bankStats.integrity}%` }} />
                </div>
                <p className={styles.integrityTotal}>
                  {bankStats.total.toLocaleString()} Total Questions
                </p>
              </>
            ) : (
              <p className={styles.integrityValue} style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                Loading...
              </p>
            )}
          </div>
        </aside>

        {/* ─── Right: Questions ─────────────────────────────────────────────── */}
        <section className={styles.browseContent}>
          {/* Browse Header */}
          <div className={styles.browseHeader}>
            <div className={styles.browseHeaderInfo}>
              <h2>Browse Questions</h2>
              <p>
                {isLoading ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    Loading...
                  </span>
                ) : (
                  <>
                    Showing {clientFiltered.length} of{' '}
                    <strong style={{ color: '#0b2240' }}>{pagination.total.toLocaleString()}</strong> questions
                  </>
                )}
              </p>
            </div>

            {/* Layout toggles */}
            <div className={styles.viewToggles}>
              <button
                onClick={() => setViewMode('grid')}
                className={`${styles.toggleBtn} ${viewMode === 'grid' ? styles.toggleBtnActive : ''}`}
                title="Grid layout"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.toggleBtnActive : ''}`}
                title="List layout"
              >
                <List size={16} />
              </button>
            </div>
          </div>

          {/* Active Filters + Search */}
          <div className={styles.activeBadgesRow}>
            {/* Search */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '6px 12px',
              flex: 1,
              maxWidth: '360px',
            }}>
              <Search size={16} style={{ color: '#9ca3af', marginRight: '8px' }} />
              <input
                type="text"
                placeholder="Search questions, topics..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                style={{ border: 'none', background: 'none', outline: 'none', fontSize: '13px', width: '100%' }}
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(''); setFilters({ search: '' }); }}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}
                >
                  <X size={14} style={{ color: '#9ca3af' }} />
                </button>
              )}
            </div>

            {/* Active difficulty badges */}
            {Object.entries(difficulties).map(([lvl, active]) =>
              active ? (
                <span
                  key={lvl}
                  className={styles.activeFilterBadge}
                  onClick={() => handleDifficultyChange(lvl as 'Easy' | 'Medium' | 'Hard')}
                  style={{ cursor: 'pointer' }}
                >
                  Difficulty: {lvl} <X size={12} style={{ marginLeft: '4px' }} />
                </span>
              ) : null,
            )}
            {/* Active tag badges */}
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className={styles.activeFilterBadge}
                onClick={() => handleTagToggle(tag)}
                style={{ cursor: 'pointer' }}
              >
                #{tag} <X size={12} style={{ marginLeft: '4px' }} />
              </span>
            ))}
          </div>

          {/* ─── Error Banner ─────────────────────────────────────────────── */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '13px',
              marginBottom: '12px',
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
              <button
                onClick={clearError}
                style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: '2px' }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* ─── Question List ─────────────────────────────────────────────── */}
          {isLoading && questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
              <p>Loading questions...</p>
            </div>
          ) : clientFiltered.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
            }}>
              <Info size={32} style={{ color: '#94a3b8', marginBottom: '8px' }} />
              <h4 style={{ margin: 0, color: '#334155' }}>No questions match your filters</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                Try modifying your search or reset filters to see all questions.
              </p>
              <button
                onClick={handleResetFilters}
                style={{
                  marginTop: '12px',
                  padding: '6px 12px',
                  backgroundColor: '#0b2240',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={14} />
                Reset Filters
              </button>
            </div>
          ) : (
            <div
              className={styles.questionList}
              style={
                viewMode === 'grid'
                  ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }
                  : {}
              }
            >
              {clientFiltered.map((q) => (
                <article key={q._id} className={styles.questionCard}>
                  {/* Selection checkbox + Badges */}
                  <div className={styles.cardBadges}>
                    {canManage && (
                      <input
                        type="checkbox"
                        checked={selectedQuestionIds.has(q.id || q._id)}
                        onChange={() => toggleQuestionSelection(q.id || q._id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#7c3aed' }}
                        title="Chọn để tạo câu hỏi tương tự"
                      />
                    )}
                    {q.isAiGenerated && (
                      <span className={`${styles.cardBadge} ${styles.cardBadgeAi}`}>
                        <Sparkles size={12} />
                        AI Generated
                      </span>
                    )}
                    <span
                      className={styles.cardBadge}
                      style={{
                        color: difficultyColor[q.difficulty],
                        backgroundColor: difficultyBg[q.difficulty],
                        border: `1px solid ${difficultyColor[q.difficulty]}33`,
                      }}
                    >
                      {q.difficulty}
                    </span>
                    {q.tags?.map((tag) => (
                      <span key={tag} className={`${styles.cardBadge} ${styles.cardBadgeDefault}`}>
                        #{tag}
                      </span>
                    ))}
                    {!q.isApproved && (
                      <span className={`${styles.cardBadge} ${styles.cardBadgePremium}`}>
                        Pending Approval
                      </span>
                    )}
                  </div>

                  {/* Question text */}
                  <h3 className={styles.questionText}>
                    {q.id.slice(-8)}: {parseMathText(q.text)}
                  </h3>



                  {/* Options */}
                  <div className={styles.optionsGrid}>
                    {q.options.map((opt) => (
                      <div
                        key={opt.letter}
                        className={`${styles.optionCard} ${opt.isCorrect && permissions.canViewAnswers ? styles.optionCardCorrect : ''}`}
                      >
                        <div className={styles.optionLetter}>{opt.letter}</div>
                        <span className={styles.optionText}>{parseMathText(opt.text)}</span>
                        {opt.isCorrect && permissions.canViewAnswers && (
                          <span className={styles.correctLabelBadge}>Correct Answer</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className={styles.questionCardFooter}>
                    <div className={styles.footerStats}>
                      <div className={styles.footerStatItem}>
                        <Clock size={14} className={styles.footerStatIcon} />
                        <span>Used in {q.usedInExams} {q.usedInExams === 1 ? 'exam' : 'exams'}</span>
                      </div>
                      <div className={styles.footerStatItem}>
                        <TrendingUp size={14} className={styles.footerStatIcon} />
                        <span>Success rate: {q.successRate}%</span>
                      </div>
                    </div>

                    <button
                      className={styles.explanationLink}
                      onClick={() => setActiveExplanation({ _id: q._id, text: q.text, explanation: q.explanation })}
                    >
                      <span>View Explanation</span>
                      <ChevronRight size={14} />
                    </button>
                    {!q.isApproved && canManage && (
                      <button
                        className={styles.explanationLink}
                        onClick={() => handleApproveQuestion(q._id)}
                        style={{ color: '#16a34a' }}
                      >
                        <CheckCircle2 size={14} />
                        <span>Approve</span>
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* ─── Pagination ──────────────────────────────────────────────────── */}
          {!isLoading && pagination.pages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '24px',
              padding: '16px',
            }}>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  borderRadius: '6px',
                  cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: pagination.page <= 1 ? 0.5 : 1,
                  color: '#334155',
                  fontSize: '13px',
                }}
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <span style={{ fontSize: '13px', color: '#64748b', padding: '0 12px' }}>
                Page {pagination.page} of {pagination.pages}
              </span>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  borderRadius: '6px',
                  cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer',
                  opacity: pagination.page >= pagination.pages ? 0.5 : 1,
                  color: '#334155',
                  fontSize: '13px',
                }}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ─── MODAL: View Explanation ─────────────────────────────────────────── */}
      {activeExplanation && (
        <div className={styles.modalOverlay} onClick={() => setActiveExplanation(null)}>
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            style={{ width: '550px' }}
          >
            <div className={styles.modalHeader}>
              <h2>Explanation</h2>
              <button className={styles.closeBtn} onClick={() => setActiveExplanation(null)}>
                <X size={20} />
              </button>
            </div>
            <div
              className={styles.modalForm}
              style={{ maxHeight: '60vh', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '14px', color: '#334155', overflowY: 'auto' }}
            >
              <div style={{ marginBottom: '16px', fontWeight: 600, color: '#0b2240' }}>
                Question text:
              </div>
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '16px',
              }}>
                {parseMathText(activeExplanation.text)}
              </div>
              <div style={{ fontWeight: 600, color: '#0b2240', marginBottom: '8px' }}>
                Step-by-step solution:
              </div>
              {activeExplanation.explanation ? (
                <div style={{ color: '#4b5563' }}>
                  {parseMathText(activeExplanation.explanation)}
                </div>
              ) : (
                <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                  No explanation provided for this question.
                </div>
              )}
            </div>
            <div className={styles.modalActions} style={{ padding: '16px 24px' }}>
              <button className={styles.submitBtn} onClick={() => setActiveExplanation(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Add Question ──────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className={styles.modalOverlay} onClick={() => !isCreating && setIsAddModalOpen(false)}>
          <form
            onSubmit={handleAddQuestionSubmit}
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Add Question to Bank</h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => !isCreating && setIsAddModalOpen(false)}
                disabled={isCreating}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalForm}>
              {/* Row 1: Tags */}
              <div className={styles.formGroup}>
                <label>Tags *</label>
                <div className={styles.tagInputWrapper}>
                  <div className={styles.tagChipList}>
                    {newQuestionForm.tags.map((tag) => (
                      <span key={tag} className={styles.tagChip}>
                        #{tag}
                        <button
                          type="button"
                          className={styles.tagChipRemove}
                          onClick={() =>
                            setNewQuestionForm({
                              ...newQuestionForm,
                              tags: newQuestionForm.tags.filter((t) => t !== tag),
                            })
                          }
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder={newQuestionForm.tags.length ? 'Add another tag...' : 'e.g. Math, Calculus, FinalExam'}
                      value={tagInputValue}
                      onChange={(e) => setTagInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const raw = tagInputValue.replace(',', '').trim();
                          if (!raw) return;
                          setNewQuestionForm({
                            ...newQuestionForm,
                            tags: newQuestionForm.tags.includes(raw)
                              ? newQuestionForm.tags
                              : [...newQuestionForm.tags, raw],
                          });
                          setTagInputValue('');
                        } else if (e.key === 'Backspace' && !tagInputValue && newQuestionForm.tags.length) {
                          setNewQuestionForm({
                            ...newQuestionForm,
                            tags: newQuestionForm.tags.slice(0, -1),
                          });
                        }
                      }}
                      className={styles.tagInput}
                    />
                  </div>
                  {!!tagInputValue.trim() && (
                    <div className={styles.tagSuggestions}>
                      {(() => {
                        const query = tagInputValue.trim().toLowerCase();
                        const matches = availableTags
                          .filter((tag) => tag.toLowerCase().includes(query) && !newQuestionForm.tags.includes(tag))
                          .slice(0, 6);
                        if (!matches.length) return null;
                        return (
                          <div className={styles.tagSuggestionsList}>
                            {matches.map((tag) => (
                              <button
                                type="button"
                                key={tag}
                                className={styles.tagSuggestionItem}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setNewQuestionForm({
                                    ...newQuestionForm,
                                    tags: [...newQuestionForm.tags, tag],
                                  });
                                  setTagInputValue('');
                                }}
                              >
                                #{tag}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Difficulty */}
              <div className={styles.formGroup}>
                <label>Difficulty *</label>
                <select
                  value={newQuestionForm.difficulty}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, difficulty: e.target.value as 'Easy' | 'Medium' | 'Hard' })}
                  className={styles.formInput}
                  required
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              {/* Question Text */}
              <div className={styles.formGroup}>
                <label>Question Text * (wrap math formulas in $...$ or \(...\))</label>
                <textarea
                  placeholder="Calculate the value of $x$ when..."
                  value={newQuestionForm.text}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, text: e.target.value })}
                  className={styles.formInput}
                  rows={3}
                  required
                />
              </div>

              {/* Formula block */}
              <div className={styles.formGroup}>
                <label>Main Equation Block (LaTeX, optional)</label>
                <input
                  type="text"
                  placeholder="e.g. \int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}"
                  value={newQuestionForm.formula}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, formula: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              {/* Options */}
              <div className={styles.formGroup}>
                <label>Answer Options *</label>
                <div className={styles.optionsInputList}>
                  {(['A', 'B', 'C', 'D'] as const).map((letter) => (
                    <div key={letter} className={styles.optionInputGroup}>
                      <span className={styles.optionInputLetter}>{letter}</span>
                      <input
                        type="text"
                        placeholder={`Option ${letter} value`}
                        value={newQuestionForm[`option${letter}` as keyof typeof newQuestionForm] as string}
                        onChange={(e) => setNewQuestionForm({ ...newQuestionForm, [`option${letter}`]: e.target.value })}
                        className={styles.formInput}
                        style={{ flex: 1 }}
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Correct option */}
              <div className={styles.formGroup}>
                <label>Correct Answer *</label>
                <select
                  value={newQuestionForm.correctOption}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, correctOption: e.target.value })}
                  className={styles.formInput}
                  required
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>

              {/* Explanation */}
              <div className={styles.formGroup}>
                <label>Explanation / Solution Details (wrap formulas in $...$)</label>
                <textarea
                  placeholder="Explain how to get the correct answer..."
                  value={newQuestionForm.explanation}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, explanation: e.target.value })}
                  className={styles.formInput}
                  rows={3}
                />
              </div>

              {/* API error */}
              {createError && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#dc2626',
                  fontSize: '13px',
                }}>
                  <AlertCircle size={14} />
                  <span>{createError}</span>
                </div>
              )}

              {/* Success message */}
              {submitSuccess && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  color: '#16a34a',
                  fontSize: '13px',
                }}>
                  <CheckCircle size={14} />
                  <span>Question created successfully!</span>
                </div>
              )}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => !isCreating && setIsAddModalOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </button>
              <button type="submit" className={styles.submitBtn} disabled={isCreating || submitSuccess}>
                {isCreating ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    Saving...
                  </>
                ) : submitSuccess ? (
                  <>
                    <CheckCircle size={14} />
                    Saved!
                  </>
                ) : (
                  'Save Question'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── MODAL: AI Generate Questions ──────────────────────────────────────── */}
      {isAiModalOpen && (
        <div className={styles.modalOverlay} onClick={() => { if (!isGeneratingAi) setIsAiModalOpen(false); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px', width: '100%' }}>
            <div className={styles.modalHeader}>
              <h2>
                <Sparkles size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Generate questions with AI
              </h2>
              <button className={styles.closeBtn} onClick={() => !isGeneratingAi && setIsAiModalOpen(false)} disabled={isGeneratingAi}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Chủ đề / Yêu cầu *</label>
                <input
                  type="text"
                  placeholder="VD: Phương trình bậc 2, Hàm số lượng giác, Từ vựng Tiếng Anh..."
                  value={aiForm.topic}
                  onChange={(e) => setAiForm({ ...aiForm, topic: e.target.value })}
                  className={styles.formInput}
                  required
                  disabled={isGeneratingAi}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className={styles.formGroup}>
                  <label>Số lượng câu hỏi</label>
                  <select
                    value={aiForm.count}
                    onChange={(e) => setAiForm({ ...aiForm, count: Number(e.target.value) })}
                    className={styles.formInput}
                    disabled={isGeneratingAi}
                  >
                    {[3, 5, 10, 15, 20].map(n => <option key={n} value={n}>{n} câu</option>)}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Độ khó</label>
                  <select
                    value={aiForm.difficulty}
                    onChange={(e) => setAiForm({ ...aiForm, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                    className={styles.formInput}
                    disabled={isGeneratingAi}
                  >
                    <option value="easy">Dễ</option>
                    <option value="medium">Trung bình</option>
                    <option value="hard">Khó</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Yêu cầu bổ sung (tùy chọn)</label>
                <textarea
                  placeholder="VD: Có công thức toán, ưu tiên câu hỏi thực tế..."
                  value={aiForm.requirements}
                  onChange={(e) => setAiForm({ ...aiForm, requirements: e.target.value })}
                  className={styles.formInput}
                  rows={3}
                  disabled={isGeneratingAi}
                />
              </div>

              {isGeneratingAi && (
                <div style={{ textAlign: 'center', padding: '16px', color: '#7c3aed' }}>
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                  <p>AI đang tạo câu hỏi, vui lòng chờ...</p>
                </div>
              )}

              {/* Preview Section */}
              {aiPreview.length > 0 && !isGeneratingAi && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ marginBottom: '12px', color: '#0b2240', fontSize: '14px' }}>
                    Xem trước &amp; chỉnh sửa ({aiPreview.length} câu hỏi)
                  </h4>
                  <div style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    {aiPreview.map((q, idx) => (
                      <div key={idx} style={{ padding: '12px 0', borderBottom: idx < aiPreview.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px', color: '#334155' }}>Câu {idx + 1}.</span>
                          <select
                            value={q.difficulty}
                            onChange={(e) => {
                              const next = [...aiPreview];
                              next[idx] = { ...next[idx], difficulty: e.target.value as any };
                              setAiPreview(next);
                            }}
                            style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: q.difficulty === 'Easy' ? '#f0fdf4' : q.difficulty === 'Hard' ? '#fef2f2' : '#fffbeb', color: q.difficulty === 'Easy' ? '#16a34a' : q.difficulty === 'Hard' ? '#dc2626' : '#d97706' }}
                          >
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const next = aiPreview.filter((_, i) => i !== idx);
                              setAiPreview(next);
                            }}
                            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px 6px', fontSize: '11px' }}
                            title="Delete this question"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <textarea
                          value={q.text}
                          onChange={(e) => {
                            const next = [...aiPreview];
                            next[idx] = { ...next[idx], text: e.target.value };
                            setAiPreview(next);
                          }}
                          style={{ width: '100%', minHeight: '50px', fontSize: '13px', color: '#475569', marginBottom: '8px', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: '4px', resize: 'vertical', fontFamily: 'inherit' }}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          {q.options.map((opt, optIdx) => (
                            <div key={opt.letter} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...aiPreview];
                                  const updatedOptions = next[idx].options.map((o, i) => ({
                                    ...o,
                                    isCorrect: i === optIdx,
                                  }));
                                  next[idx] = { ...next[idx], options: updatedOptions };
                                  setAiPreview(next);
                                }}
                                style={{
                                  flexShrink: 0,
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '50%',
                                  border: `2px solid ${opt.isCorrect ? '#16a34a' : '#cbd5e1'}`,
                                  backgroundColor: opt.isCorrect ? '#dcfce7' : 'transparent',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: opt.isCorrect ? '#16a34a' : '#94a3b8',
                                  padding: 0,
                                }}
                                title={opt.isCorrect ? 'Đáp án đúng' : 'Click để chọn làm đáp án đúng'}
                              >
                                {opt.letter}
                              </button>
                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => {
                                  const next = [...aiPreview];
                                  const updatedOptions = [...next[idx].options];
                                  updatedOptions[optIdx] = { ...updatedOptions[optIdx], text: e.target.value };
                                  next[idx] = { ...next[idx], options: updatedOptions };
                                  setAiPreview(next);
                                }}
                                style={{ flex: 1, fontSize: '12px', padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#475569' }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {createError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '13px' }}>
                  <AlertCircle size={14} />
                  <span>{createError}</span>
                </div>
              )}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => !isGeneratingAi && setIsAiModalOpen(false)}
                disabled={isGeneratingAi}
              >
                Hủy
              </button>
              {aiPreview.length === 0 ? (
                <button
                  type="button"
                  className={styles.submitBtn}
                  style={{ backgroundColor: '#7c3aed' }}
                  onClick={async () => {
                    if (!aiForm.topic.trim()) {
                      toast.error('Please enter a topic');
                      return;
                    }
                    setIsGeneratingAi(true);
                    try {
                      const rawQuestions = await generateAiQuestions({
                        topic: aiForm.topic,
                        count: aiForm.count,
                        difficulty: aiForm.difficulty,
                        requirements: aiForm.requirements,
                      });
                      setAiPreview(rawQuestions.map(toFrontendQuestion));
                      toast.success(`Created ${rawQuestions.length} questions! Please preview and save.`);
                    } catch {
                      toast.error('Failed to generate questions');
                    } finally {
                      setIsGeneratingAi(false);
                    }
                  }}
                  disabled={isGeneratingAi || !aiForm.topic.trim()}
                >
                  <Sparkles size={14} />
                  Tạo câu hỏi
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={styles.submitBtn}
                    style={{ backgroundColor: '#16a34a' }}
                    onClick={async () => {
                      for (const q of aiPreview) {
                        try {
                          await createQuestion({
                            content: q.text,
                            type: 'single_choice',
                            options: q.options.map(o => ({ id: o.letter as 'A' | 'B' | 'C' | 'D', content: o.text, isCorrect: !!o.isCorrect })),
                            difficulty: q.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
                            source: 'ai',
                            tags: q.tags,
                          });
                        } catch { /* individual error handled by store */ }
                      }
                      toast.success(`Saved ${aiPreview.length} questions to the bank!`);
                      setIsAiModalOpen(false);
                      setAiPreview([]);
                      setAiForm({ topic: '', count: 5, difficulty: 'medium', requirements: '' });
                      fetchQuestions({ page: 1, limit: 20 });
                    }}
                  >
                    <CheckCircle size={14} />
                    Save all ({aiPreview.length})
                  </button>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setAiPreview([])}
                  >
                    Retry
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Similar Questions Modal ─────────────────────────────────────────────── */}
      {isSimilarModalOpen && (
        <div className={styles.modalOverlay} onClick={() => { if (!isGeneratingSimilar) setIsSimilarModalOpen(false); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px', width: '100%' }}>
            <div className={styles.modalHeader}>
              <h2>
                <Sparkles size={20} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#059669' }} />
                Create similar questions
              </h2>
              <button className={styles.closeBtn} onClick={() => !isGeneratingSimilar && setIsSimilarModalOpen(false)} disabled={isGeneratingSimilar}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalForm}>
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <p style={{ fontSize: '13px', color: '#166534', margin: 0 }}>
                  <strong>{selectedQuestionIds.size} questions</strong> selected as templates to create similar questions.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className={styles.formGroup}>
                  <label>Number of new questions</label>
                  <select
                    value={similarForm.count}
                    onChange={(e) => setSimilarForm({ ...similarForm, count: Number(e.target.value) })}
                    className={styles.formInput}
                    disabled={isGeneratingSimilar}
                  >
                    {[1, 2, 3, 5, 10].map(n => <option key={n} value={n}>{n} questions</option>)}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Độ khó</label>
                  <select
                    value={similarForm.difficulty}
                    onChange={(e) => setSimilarForm({ ...similarForm, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                    className={styles.formInput}
                    disabled={isGeneratingSimilar}
                  >
                    <option value="easy">Dễ hơn</option>
                    <option value="medium">Tương tự</option>
                    <option value="hard">Khó hơn</option>
                  </select>
                </div>
              </div>

              {isGeneratingSimilar && (
                <div style={{ textAlign: 'center', padding: '16px', color: '#059669' }}>
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                  <p>AI đang tạo câu hỏi tương tự, vui lòng chờ...</p>
                </div>
              )}

              {/* Preview Section */}
              {similarPreview.length > 0 && !isGeneratingSimilar && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ marginBottom: '12px', color: '#0b2240', fontSize: '14px' }}>
                    Xem trước &amp; chỉnh sửa ({similarPreview.length} câu hỏi)
                  </h4>
                  <div style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    {similarPreview.map((q, idx) => (
                      <div key={idx} style={{ padding: '12px 0', borderBottom: idx < similarPreview.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px', color: '#334155' }}>Câu {idx + 1}.</span>
                          <select
                            value={q.difficulty}
                            onChange={(e) => {
                              const next = [...similarPreview];
                              next[idx] = { ...next[idx], difficulty: e.target.value as any };
                              setSimilarPreview(next);
                            }}
                            style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: q.difficulty === 'Easy' ? '#f0fdf4' : q.difficulty === 'Hard' ? '#fef2f2' : '#fffbeb', color: q.difficulty === 'Easy' ? '#16a34a' : q.difficulty === 'Hard' ? '#dc2626' : '#d97706' }}
                          >
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const next = similarPreview.filter((_, i) => i !== idx);
                              setSimilarPreview(next);
                            }}
                            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px 6px', fontSize: '11px' }}
                            title="Delete this question"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <textarea
                          value={q.text}
                          onChange={(e) => {
                            const next = [...similarPreview];
                            next[idx] = { ...next[idx], text: e.target.value };
                            setSimilarPreview(next);
                          }}
                          style={{ width: '100%', minHeight: '50px', fontSize: '13px', color: '#475569', marginBottom: '8px', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: '4px', resize: 'vertical', fontFamily: 'inherit' }}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          {q.options.map((opt, optIdx) => (
                            <div key={opt.letter} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...similarPreview];
                                  const updatedOptions = next[idx].options.map((o, i) => ({
                                    ...o,
                                    isCorrect: i === optIdx,
                                  }));
                                  next[idx] = { ...next[idx], options: updatedOptions };
                                  setSimilarPreview(next);
                                }}
                                style={{
                                  flexShrink: 0,
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '50%',
                                  border: `2px solid ${opt.isCorrect ? '#16a34a' : '#cbd5e1'}`,
                                  backgroundColor: opt.isCorrect ? '#dcfce7' : 'transparent',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: opt.isCorrect ? '#16a34a' : '#94a3b8',
                                  padding: 0,
                                }}
                                title={opt.isCorrect ? 'Đáp án đúng' : 'Click để chọn làm đáp án đúng'}
                              >
                                {opt.letter}
                              </button>
                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => {
                                  const next = [...similarPreview];
                                  const updatedOptions = [...next[idx].options];
                                  updatedOptions[optIdx] = { ...updatedOptions[optIdx], text: e.target.value };
                                  next[idx] = { ...next[idx], options: updatedOptions };
                                  setSimilarPreview(next);
                                }}
                                style={{ flex: 1, fontSize: '12px', padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#475569' }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {createError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '13px' }}>
                  <AlertCircle size={14} />
                  <span>{createError}</span>
                </div>
              )}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => !isGeneratingSimilar && setIsSimilarModalOpen(false)}
                disabled={isGeneratingSimilar}
              >
                Hủy
              </button>
              {similarPreview.length === 0 ? (
                <button
                  type="button"
                  className={styles.submitBtn}
                  style={{ backgroundColor: '#059669' }}
                  onClick={async () => {
                    setIsGeneratingSimilar(true);
                    clearCreateError();
                    try {
                      const sourceIds = Array.from(selectedQuestionIds);
                      const rawQuestions = await generateSimilarQuestions({
                        sourceQuestionIds: sourceIds,
                        count: similarForm.count,
                        difficulty: similarForm.difficulty,
                      });
                      setSimilarPreview(rawQuestions.map(toFrontendQuestion));
                      toast.success(`Created ${rawQuestions.length} similar questions!`);
                    } catch {
                      toast.error('Failed to generate similar questions');
                    } finally {
                      setIsGeneratingSimilar(false);
                    }
                  }}
                  disabled={isGeneratingSimilar}
                >
                  <Sparkles size={14} />
                  Tạo câu hỏi tương tự
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={styles.submitBtn}
                    style={{ backgroundColor: '#16a34a' }}
                    onClick={async () => {
                      for (const q of similarPreview) {
                        try {
                          await createQuestion({
                            content: q.text,
                            type: 'single_choice',
                            options: q.options.map(o => ({ id: o.letter as 'A' | 'B' | 'C' | 'D', content: o.text, isCorrect: !!o.isCorrect })),
                            difficulty: q.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
                            source: 'ai',
                            tags: q.tags,
                          });
                        } catch { /* individual error handled by store */ }
                      }
                      toast.success(`Saved ${similarPreview.length} questions to the bank!`);
                      setIsSimilarModalOpen(false);
                      setSimilarPreview([]);
                      setSelectedQuestionIds(new Set());
                      setSimilarForm({ count: 3, difficulty: 'medium' });
                      fetchQuestions({ page: 1, limit: 20 });
                    }}
                  >
                    <CheckCircle size={14} />
                    Save all ({similarPreview.length})
                  </button>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setSimilarPreview([])}
                  >
                    Retry
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Global spinner keyframes ─────────────────────────────────────────── */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
