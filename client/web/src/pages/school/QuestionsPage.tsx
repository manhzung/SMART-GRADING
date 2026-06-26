import React, { useEffect, useState } from 'react';
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Info,
  RefreshCw,
  Clock,
  TrendingUp,
  ChevronRight as ChevronRightIcon,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import styles from './QuestionsPage.module.css';
import {
  useQuestionStore,
  toFrontendQuestion,
  type Question,
} from '../../presentation/store/questionStore';

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

  let normalized = text.replace(/\\\(|\\\)/g, '$');
  normalized = normalized.replace(/\\\[|\\\]/g, '$$$$');

  const blockParts = normalized.split('$$');

  return (
    <>
      {blockParts.map((blockPart, blockIndex) => {
        if (blockIndex % 2 === 1) {
          return (
            <div key={`block-${blockIndex}`} className={styles.formulaBox}>
              <Latex math={blockPart} block />
            </div>
          );
        }

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

// ─── Difficulty helpers ────────────────────────────────────────────────────────
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

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function QuestionSkeleton() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonBadge} style={{ width: '80px' }} />
        <div className={styles.skeletonBadge} style={{ width: '60px' }} />
      </div>
      <div className={styles.skeletonText} style={{ width: '70%' }} />
      <div className={styles.skeletonText} style={{ width: '90%' }} />
      <div className={styles.skeletonOptions}>
        <div className={styles.skeletonOption} />
        <div className={styles.skeletonOption} />
        <div className={styles.skeletonOption} />
        <div className={styles.skeletonOption} />
      </div>
      <div className={styles.skeletonFooter}>
        <div style={{ width: '120px', height: '16px' }} />
        <div style={{ width: '100px', height: '16px' }} />
      </div>
    </div>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────
interface QuestionCardProps {
  question: Question;
  onViewExplanation: (q: Question) => void;
}

function QuestionCard({ question, onViewExplanation }: QuestionCardProps) {
  return (
    <article className={styles.questionCard}>
      {/* Badges */}
      <div className={styles.cardBadges}>
        {question.isAiGenerated && (
          <span className={`${styles.cardBadge} ${styles.cardBadgeAi}`}>
            <Sparkles size={12} />
            AI Generated
          </span>
        )}
        <span
          className={styles.cardBadge}
          style={{
            color: difficultyColor[question.difficulty],
            backgroundColor: difficultyBg[question.difficulty],
            border: `1px solid ${difficultyColor[question.difficulty]}33`,
          }}
        >
          {question.difficulty}
        </span>
        {question.tags?.slice(0, 3).map((tag) => (
          <span key={tag} className={`${styles.cardBadge} ${styles.cardBadgeDefault}`}>
            #{tag}
          </span>
        ))}
        {!question.isApproved && (
          <span className={`${styles.cardBadge} ${styles.cardBadgePremium}`}>
            Pending
          </span>
        )}
      </div>

      {/* Question text */}
      <h3 className={styles.questionText}>
        <span className={styles.questionId}>{question.id.slice(-8)}:</span>{' '}
        {parseMathText(question.text)}
      </h3>

      {/* Options */}
      <div className={styles.optionsGrid}>
        {question.options.map((opt) => (
          <div
            key={opt.letter}
            className={`${styles.optionCard} ${opt.isCorrect ? styles.optionCardCorrect : ''}`}
          >
            <div className={styles.optionLetter}>{opt.letter}</div>
            <span className={styles.optionText}>{parseMathText(opt.text)}</span>
            {opt.isCorrect && (
              <span className={styles.correctLabelBadge}>Correct</span>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className={styles.questionCardFooter}>
        <div className={styles.footerStats}>
          <div className={styles.footerStatItem}>
            <Clock size={14} className={styles.footerStatIcon} />
            <span>
              {question.usedInExams} {question.usedInExams === 1 ? 'exam' : 'exams'}
            </span>
          </div>
          <div className={styles.footerStatItem}>
            <TrendingUp size={14} className={styles.footerStatIcon} />
            <span>Success: {question.successRate}%</span>
          </div>
        </div>

        <button
          className={styles.explanationLink}
          onClick={() => onViewExplanation(question)}
        >
          <span>View Explanation</span>
          <ChevronRightIcon size={14} />
        </button>
      </div>
    </article>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function QuestionsPage() {
  const {
    questions,
    availableTags,
    isLoading,
    error,
    pagination,
    fetchQuestions,
    fetchTags,
    setFilters,
    clearError,
  } = useQuestionStore();

  // Local state
  const [searchInput, setSearchInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activeExplanation, setActiveExplanation] = useState<Question | null>(null);

  // Initial fetch
  useEffect(() => {
    fetchQuestions({ limit: pagination.limit, page: pagination.page });
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Search ─────────────────────────────────────────────────────────────────
  const handleSearch = () => {
    setFilters({ search: searchInput });
    fetchQuestions({ page: 1, search: searchInput });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const clearSearch = () => {
    setSearchInput('');
    setFilters({ search: '' });
    fetchQuestions({ page: 1, search: '' });
  };

  // ─── Tag filter ──────────────────────────────────────────────────────────────
  const handleTagToggle = (tag: string) => {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(next);
    setFilters({ tags: next.join(',') });
    fetchQuestions({ page: 1, tags: next.join(',') });
  };

  // ─── Reset filters ──────────────────────────────────────────────────────────
  const handleResetFilters = () => {
    setSearchInput('');
    setSelectedTags([]);
    setFilters({ search: '', tags: '' });
    fetchQuestions({ page: 1, search: '', tags: '' });
  };

  // ─── Pagination ─────────────────────────────────────────────────────────────
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    fetchQuestions({ page: newPage });
  };

  return (
    <div className={styles.container}>
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <div className={styles.headerIcon}>
            <BookOpen size={24} />
          </div>
          <div>
            <h1>Questions</h1>
            <p>View and manage questions in the school question bank</p>
          </div>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{pagination.total.toLocaleString()}</span>
            <span className={styles.statLabel}>Total Questions</span>
          </div>
        </div>
      </div>

      {/* ─── Search & Filter Bar ────────────────────────────────────────────── */}
      <div className={styles.toolbar}>
        {/* Search */}
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search questions by content..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className={styles.searchInput}
          />
          {searchInput && (
            <button className={styles.clearSearchBtn} onClick={clearSearch}>
              <X size={16} />
            </button>
          )}
          <button className={styles.searchBtn} onClick={handleSearch}>
            Search
          </button>
        </div>

        {/* View toggle */}
        <div className={styles.viewToggles}>
          <button
            onClick={() => setViewMode('grid')}
            className={`${styles.toggleBtn} ${viewMode === 'grid' ? styles.toggleBtnActive : ''}`}
            title="Grid view"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="1" width="6" height="6" rx="1" />
              <rect x="9" y="1" width="6" height="6" rx="1" />
              <rect x="1" y="9" width="6" height="6" rx="1" />
              <rect x="9" y="9" width="6" height="6" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.toggleBtnActive : ''}`}
            title="List view"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="2" width="14" height="2" rx="1" />
              <rect x="1" y="7" width="14" height="2" rx="1" />
              <rect x="1" y="12" width="14" height="2" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* ─── Active Filters ─────────────────────────────────────────────────── */}
      {(selectedTags.length > 0 || searchInput) && (
        <div className={styles.activeFilters}>
          {selectedTags.map((tag) => (
            <span key={tag} className={styles.filterChip}>
              #{tag}
              <button onClick={() => handleTagToggle(tag)} className={styles.filterChipClose}>
                <X size={12} />
              </button>
            </span>
          ))}
          {searchInput && (
            <span className={styles.filterChip}>
              Search: "{searchInput}"
              <button onClick={clearSearch} className={styles.filterChipClose}>
                <X size={12} />
              </button>
            </span>
          )}
          <button className={styles.resetFiltersBtn} onClick={handleResetFilters}>
            Reset all
          </button>
        </div>
      )}

      {/* ─── Main Content ───────────────────────────────────────────────────── */}
      <div className={styles.content}>
        {/* ─── Tags Sidebar ─────────────────────────────────────────────────── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>Filter by Tags</h3>
            {availableTags.length === 0 ? (
              <p className={styles.emptyTags}>No tags available</p>
            ) : (
              <div className={styles.tagList}>
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`${styles.tagBtn} ${selectedTags.includes(tag) ? styles.tagBtnActive : ''}`}
                  >
                    <span className={styles.tagHash}>#</span>
                    {tag}
                    {selectedTags.includes(tag) && (
                      <X size={12} className={styles.tagCheck} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ─── Questions List ────────────────────────────────────────────────── */}
        <section className={styles.questionsSection}>
          {/* Results header */}
          <div className={styles.resultsHeader}>
            <span className={styles.resultsCount}>
              {isLoading ? (
                <>
                  <Loader2 size={14} className={styles.spinner} />
                  Loading...
                </>
              ) : (
                <>
                  Showing <strong>{questions.length}</strong> of{' '}
                  <strong>{pagination.total.toLocaleString()}</strong> questions
                </>
              )}
            </span>
          </div>

          {/* Error Banner */}
          {error && (
            <div className={styles.errorBanner}>
              <Info size={16} />
              <span>{error}</span>
              <button onClick={clearError} className={styles.errorClose}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && questions.length === 0 ? (
            <div className={styles.questionList}>
              {Array.from({ length: 5 }).map((_, i) => (
                <QuestionSkeleton key={i} />
              ))}
            </div>
          ) : questions.length === 0 ? (
            /* Empty State */
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <BookOpen size={48} />
              </div>
              <h3>No questions found</h3>
              <p>
                {searchInput || selectedTags.length > 0
                  ? 'Try adjusting your search or filters'
                  : 'No questions have been added to the bank yet'}
              </p>
              {(searchInput || selectedTags.length > 0) && (
                <button className={styles.resetBtn} onClick={handleResetFilters}>
                  <RefreshCw size={16} />
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            /* Questions Grid/List */
            <div
              className={styles.questionList}
              style={
                viewMode === 'grid'
                  ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }
                  : {}
              }
            >
              {questions.map((q) => (
                <QuestionCard
                  key={q._id}
                  question={q}
                  onViewExplanation={setActiveExplanation}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && pagination.pages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className={styles.pageBtn}
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <div className={styles.pageNumbers}>
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  let pageNum: number;
                  const current = pagination.page;
                  const total = pagination.pages;

                  if (total <= 5) {
                    pageNum = i + 1;
                  } else if (current <= 3) {
                    pageNum = i + 1;
                  } else if (current >= total - 2) {
                    pageNum = total - 4 + i;
                  } else {
                    pageNum = current - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`${styles.pageNumber} ${current === pageNum ? styles.pageNumberActive : ''}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <span className={styles.pageInfo}>
                Page {pagination.page} of {pagination.pages}
              </span>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className={styles.pageBtn}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ─── Explanation Modal ───────────────────────────────────────────────── */}
      {activeExplanation && (
        <div className={styles.modalOverlay} onClick={() => setActiveExplanation(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Question Explanation</h2>
              <button className={styles.closeBtn} onClick={() => setActiveExplanation(null)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.explanationSection}>
                <label className={styles.explanationLabel}>Question</label>
                <div className={styles.explanationQuestion}>
                  {parseMathText(activeExplanation.text)}
                </div>
              </div>

              <div className={styles.explanationSection}>
                <label className={styles.explanationLabel}>Explanation</label>
                {activeExplanation.explanation ? (
                  <div className={styles.explanationText}>
                    {parseMathText(activeExplanation.explanation)}
                  </div>
                ) : (
                  <p className={styles.noExplanation}>No explanation provided for this question.</p>
                )}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalCloseBtn} onClick={() => setActiveExplanation(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Animations ─────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .${styles.spinner} {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
