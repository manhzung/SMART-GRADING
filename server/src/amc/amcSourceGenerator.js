/**
 * AMC Source Generator
 * Sinh AMC .tex source file tu exam data
 * AMC (Auto-Multiple-Choice) la bo cong cu LaTeX de tao de thi trac nghiem
 *
 * Workflow moi (2026-06):
 * - Moi version (101, 102, 103, 104) co file tex rieng, noi dung cau hoi/option da shuffle
 * - Answer sheet (phieu to dap an) duoc tao RIENG boi answerSheetGenerator.js
 *   (khong con nhap vao file tex cua de nua)
 */

function escapeLatex(text) {
  if (!text) return '';

  // Strategy: use unique placeholder tokens to avoid double-escaping.
  // When we replace special chars with LaTeX escapes (e.g. '&' -> '\&'),
  // the backslash in '\&' would be re-escaped by the final backslash pass.
  // Using placeholders ensures each special char is only escaped once.

  const TOKENS = {
    BACKSLASH: '\x01BS\x01',
    TILDE: '\x01TL\x01',
    CARET: '\x01CT\x01',
    AMP: '\x01AM\x01',
    PERCENT: '\x01PC\x01',
    DOLLAR: '\x01DL\x01',
    HASH: '\x01HS\x01',
    UNDERSCORE: '\x01US\x01',
    LBRACE: '\x01LB\x01',
    RBRACE: '\x01RB\x01',
    QUOTE: '\x01QT\x01',
  };

  return text
    // Step 1: Convert special chars to placeholder tokens
    .replace(/\\/g, TOKENS.BACKSLASH)
    .replace(/~/g, TOKENS.TILDE)
    .replace(/\^/g, TOKENS.CARET)
    .replace(/&/g, TOKENS.AMP)
    .replace(/%/g, TOKENS.PERCENT)
    .replace(/\$/g, TOKENS.DOLLAR)
    .replace(/#/g, TOKENS.HASH)
    .replace(/_/g, TOKENS.UNDERSCORE)
    .replace(/\{/g, TOKENS.LBRACE)
    .replace(/\}/g, TOKENS.RBRACE)
    .replace(/"/g, TOKENS.QUOTE)
    // Step 2: Convert tokens to LaTeX escapes
    .replace(new RegExp(TOKENS.BACKSLASH, 'g'), '\\textbackslash{}')
    .replace(new RegExp(TOKENS.TILDE, 'g'), '\\textasciitilde{}')
    .replace(new RegExp(TOKENS.CARET, 'g'), '\\textasciicircum{}')
    .replace(new RegExp(TOKENS.AMP, 'g'), '\\&')
    .replace(new RegExp(TOKENS.PERCENT, 'g'), '\\%')
    .replace(new RegExp(TOKENS.DOLLAR, 'g'), '\\$')
    .replace(new RegExp(TOKENS.HASH, 'g'), '\\#')
    .replace(new RegExp(TOKENS.UNDERSCORE, 'g'), '\\_')
    .replace(new RegExp(TOKENS.LBRACE, 'g'), '\\{')
    .replace(new RegExp(TOKENS.RBRACE, 'g'), '\\}')
    .replace(new RegExp(TOKENS.QUOTE, 'g'), '\\textquotedbl{}')
    // Step 3: Keep single quotes as-is (LaTeX renders them OK)
    .replace(/'/g, "'");
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

function formatDuration(minutes) {
  if (!minutes) return '';
  return `${minutes} phut`;
}

/**
 * Deterministic shuffle using seeded PRNG (mulberry32)
 * Cung 1 seed -> cung 1 ket qua (quan trong de cung 1 version luon co cung thu tu)
 * @param {Array} array
 * @param {number} seed
 * @returns {Array} - new shuffled array
 */
function seededShuffle(array, seed) {
  const arr = [...array];
  let s = seed >>> 0;
  // mulberry32 PRNG
  const rand = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Convert versionCode string to integer seed
 * "101" -> 101, "A" -> 65, etc.
 * @param {string} versionCode
 * @returns {number}
 */
function versionCodeToSeed(versionCode) {
  if (typeof versionCode === 'number') return versionCode;
  // Try parse as int
  const asInt = parseInt(versionCode, 10);
  if (!isNaN(asInt)) return asInt;
  // Hash string to int
  let hash = 0;
  for (let i = 0; i < versionCode.length; i++) {
    hash = ((hash << 5) - hash + versionCode.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Build common AMC document header (preamble)
 * @param {Object} exam
 * @param {Object} config
 * @returns {string[]}
 */
function buildHeaderLines(exam, config) {
  const lines = [];
  lines.push('\\documentclass[11pt,a4paper]{article}');
  lines.push('');
  lines.push('\\usepackage[utf8]{inputenc}');
  lines.push('\\usepackage{amsmath,amssymb}');
  lines.push('\\usepackage{geometry}');
  lines.push('\\geometry{top=1.5cm,bottom=1.5cm,left=1.5cm,right=1.5cm}');
  lines.push('\\usepackage{automultiplechoice}');
  lines.push('');

  // Begin document - AMC commands must come AFTER \begin{document}
  lines.push('\\begin{document}');
  lines.push('');

  // School header
  if (config.schoolHeader) {
    lines.push(`{\\centering\\textbf{${escapeLatex(config.schoolHeader)}}\\par}`);
    lines.push('\\vspace{0.2cm}');
  }
  lines.push(`{\\centering\\textbf{${escapeLatex(exam.title || 'Kiem tra trac nghiem')}}\\par}`);
  lines.push(`Mon: ${escapeLatex(exam.subjectName || '')} \\hfill Lop: ${escapeLatex(exam.className || '')}\\par`);
  lines.push(`Thoi gian: ${escapeLatex(formatDuration(exam.duration))} \\hfill Diem: ${exam.totalScore || 10}\\par`);
  lines.push(`Ngay thi: ${formatDate(exam.examDate)}`);
  lines.push('');
  lines.push('\\vspace{0.2cm}');
  lines.push('\\hrule');
  lines.push('\\vspace{0.3cm}');
  lines.push('');

  // Version code on exam (student should ALSO write this on their answer sheet)
  if (exam.versionCode) {
    lines.push('{\\centering');
    lines.push(`\\textbf{\\large MA DE: ${escapeLatex(exam.versionCode)}}`);
    lines.push('\\par');
    lines.push('\\vspace{0.3cm}');
    lines.push('}');
    lines.push('');
  }

  // Student info
  lines.push('{\\centering');
  lines.push('{\\footnotesize Ho va ten: \\dotfill\\hspace{2cm}\\dotfill}');
  lines.push('\\hfill');
  lines.push('{\\footnotesize So bao danh: \\dotfill}');
  lines.push('\\hfill');
  lines.push('{\\footnotesize Phong: \\dotfill}');
  lines.push('\\par\\vspace{0.3cm}}');
  lines.push('');

  // \onecopy{1} - single copy per file (we generate 4 separate files for 4 versions)
  lines.push('\\onecopy{1}{');
  lines.push('');
  return lines;
}

/**
 * Build question block in AMC 1.6.0 syntax
 * @param {Array} questions - already shuffled and ordered for this version
 * @returns {string[]}
 */
function buildQuestionLines(questions) {
  const lines = [];
  questions.forEach((q, i) => {
    lines.push(`\\begin{question}{q${i + 1}}`);
    lines.push(escapeLatex(q.content));
    lines.push('\\begin{choices}');
    q.options.forEach((opt) => {
      if (opt.isCorrect) {
        lines.push(`  \\correctchoice{${escapeLatex(opt.content)}}`);
      } else {
        lines.push(`  \\wrongchoice{${escapeLatex(opt.content)}}`);
      }
    });
    lines.push('\\end{choices}');
    lines.push('\\end{question}');
    lines.push('');
  });
  return lines;
}

/**
 * Build footer
 * @returns {string[]}
 */
function buildFooterLines() {
  return [
    '}',
    '',
    '\\end{document}',
  ];
}

/**
 * Generate AMC LaTeX source for a SPECIFIC version
 * This is the main entry point for the new multi-version flow.
 *
 * @param {Object} input
 * @param {Object} input.exam - { title, subjectName, className, duration, totalScore, examDate, versionCode }
 * @param {Array} input.questions - Already shuffled & ordered for this version
 *   Each: { content, options: [{ content, isCorrect }] }
 * @param {Object} input.config - { schoolHeader }
 * @returns {string} - LaTeX source
 */
function generateAmcSourceForVersion(input) {
  const { exam, questions, config } = input;
  const lines = [
    ...buildHeaderLines(exam, config),
    ...buildQuestionLines(questions),
    ...buildFooterLines(),
  ];
  return lines.join('\n');
}

/**
 * LEGACY: Generate AMC LaTeX source from exam data (backward compat)
 * Use generateAmcSourceForVersion for new code.
 * @param {Object} input - {exam, questions, config}
 * @returns {string}
 */
function generateAmcSource(input) {
  return generateAmcSourceForVersion(input);
}

/**
 * Generate shuffled questions for a specific version
 * Uses deterministic shuffle keyed by versionCode, so the same version
 * always produces the same order (re-running won't break grading).
 *
 * @param {Array} questions - Original questions (in DB order)
 *   Each: { _id, content, options, score, ... }
 * @param {string} versionCode - '101', '102', '103', '104'
 * @param {Object} options
 * @param {boolean} options.shuffleQuestions - shuffle question order
 * @param {boolean} options.shuffleOptions - shuffle options within each question
 * @returns {Array} - [{ content, options: [{ content, isCorrect }], originalIndex }]
 */
function shuffleQuestionsForVersion(questions, versionCode, options = {}) {
  const { shuffleQuestions = true, shuffleOptions = true } = options;
  const seed = versionCodeToSeed(versionCode);

  // Step 1: shuffle question order
  let orderedQuestions = questions;
  if (shuffleQuestions) {
    orderedQuestions = seededShuffle(questions, seed);
  }

  // Step 2: shuffle options within each question
  // (use different seed offsets to avoid correlation with question order)
  return orderedQuestions.map((q, idx) => {
    const optionsToShuffle = (q.options || []).map(opt => ({
      content: opt.content,
      isCorrect: opt.isCorrect,
      id: opt.id,
    }));

    const shuffledOpts = shuffleOptions
      ? seededShuffle(optionsToShuffle, seed + idx * 1000 + 7)
      : optionsToShuffle;

    return {
      _id: q._id, // Preserve ID for downstream lookup
      content: q.content,
      options: shuffledOpts,
      originalIndex: questions.findIndex(orig => orig._id?.toString() === q._id?.toString()),
    };
  });
}

module.exports = {
  generateAmcSource,
  generateAmcSourceForVersion,
  shuffleQuestionsForVersion,
  escapeLatex,
  seededShuffle,
  versionCodeToSeed,
};
