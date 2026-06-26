/**
 * AMC Answer Sheet TeX Generator
 * Generates answer-sheet.tex for AMC compilation
 *
 * Design: 3-column layout with 5 questions per block
 * - Header: School, title, subject, class (in one line)
 * - ID section: Student ID (7 digits) + Version code (2 digits) horizontally
 * - Questions: 3 columns x N blocks of 5 questions
 */

const { escapeLatex } = require('./amcSourceGenerator');

/**
 * Build compact header - single line metadata
 */
function buildAnswerSheetHeader(exam) {
  const lines = [];
  lines.push('\\documentclass[9pt,a4paper]{article}');
  lines.push('\\usepackage[margin=0.5cm,top=0.4cm,bottom=0.4cm]{geometry}');
  lines.push('\\usepackage[calibration]{automultiplechoice}');
  lines.push('\\usepackage{multicol}');
  lines.push('\\setlength{\\parindent}{0pt}');
  lines.push('\\setlength{\\parskip}{0pt}');
  lines.push('\\setlength\\itemsep{0pt}');
  lines.push('');

  // Header
  const title = escapeLatex(exam.title || 'Bai kiem tra');
  const subject = exam.subjectName ? escapeLatex(exam.subjectName) : '';
  const className = exam.className ? escapeLatex(exam.className) : '';
  const school = exam.schoolHeader ? escapeLatex(exam.schoolHeader) : '';

  lines.push('\\begin{document}');
  lines.push('');
  // Note: \AMCboxgridtrue requires boxgrid option and specific AMC version
  // Commenting out as it's not available in current AMC installation
  // lines.push('\\AMCboxgridtrue');
  lines.push('');
  lines.push('\\begin{center}');
  if (school) {
    lines.push('{\\bfseries ' + school + '} \\\\');
  }
  lines.push('{\\Large\\bfseries PHIEU TRA LOI} \\\\');
  lines.push('{\\bfseries ' + title + '}');

  const metaParts = [];
  if (subject) metaParts.push('Mon: ' + subject);
  if (className) metaParts.push('Lop: ' + className);
  if (metaParts.length > 0) {
    lines.push('(' + metaParts.join(', ') + ')');
  }
  lines.push('\\end{center}');

  return lines;
}

/**
 * Build ID section - horizontal layout
 * Student ID: 7 digits, Version: 2 digits
 */
function buildIdSection() {
  return [
    '\\vspace{2pt}',
    '\\hrule',
    '\\vspace{2pt}',
    '\\begin{center}',
    '\\begin{tabular}{p{6cm}p{6cm}}',
    '{\\bfseries So bao danh:} & {\\bfseries Ma de:} \\\\',
    '\\AMCcodeGridInt{student}{7} & \\AMCcodeGridInt{ver}{2}',
    '\\end{tabular}',
    '\\end{center}',
  ];
}

/**
 * Build answer section with 3 columns, 5 questions per column
 * Layout: 3 columns × 5 rows = 15 questions per block
 * Fill: left→right (col1 full, then col2, then col3)
 */
function buildAnswerSection(numQuestions) {
  const lines = [];
  lines.push('\\vspace{2pt}');
  lines.push('\\hrule');
  lines.push('\\vspace{2pt}');
  lines.push('{\\itshape Huong dan: To den vao mot o duy nhat moi cau.}');
  lines.push('\\vspace{2pt}');

  // Start 3-column layout - LaTeX fills: col1 (5 items), col2 (5 items), col3 (5 items)
  lines.push('\\begin{multicols}{3}');
  lines.push('\\setlength\\itemsep{0pt}');
  lines.push('\\setlength\\parskip{0pt}');

  for (let q = 1; q <= numQuestions; q++) {
    lines.push('\\begin{tabular}{p{0.5cm}p{4.5cm}}');
    lines.push(q + '. & \\AMCcodeGrid{q' + q + '}{A,B,C,D}');
    lines.push('\\end{tabular}');
  }

  lines.push('\\end{multicols}');

  return lines;
}

/**
 * Build footer
 */
function buildAnswerSheetFooter() {
  return ['\\end{document}'];
}

/**
 * Generate answer-sheet.tex source for AMC
 */
function generateAnswerSheetTex(exam, numQuestions) {
  const lines = [
    ...buildAnswerSheetHeader(exam),
    ...buildIdSection(),
    ...buildAnswerSection(numQuestions),
    ...buildAnswerSheetFooter(),
  ];
  return lines.join('\n');
}

module.exports = { generateAnswerSheetTex };
