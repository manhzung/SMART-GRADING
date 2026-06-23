/**
 * AMC Source Generator
 * Sinh AMC .tex source file tu exam data
 * AMC (Auto-Multiple-Choice) la bo cong cu LaTeX de tao de thi trac nghiem
 */

function escapeLatex(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/"/g, '\\textquotedbl{}')
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
 * Generate AMC LaTeX source from exam data
 * @param {Object} input - {exam, questions, config}
 * @returns {string} - LaTeX source string
 */
function generateAmcSource(input) {
  const { exam, questions, config } = input;

  const lines = [];

  // Documentclass
  lines.push('\\documentclass[a4paper]{article}');
  lines.push('');

  // Packages
  lines.push('\\usepackage[utf8]{inputenc}');
  lines.push('\\usepackage[vietnam]{babel}');
  lines.push('\\usepackage{amsmath,amssymb}');
  lines.push('\\usepackage{geometry}');
  lines.push('\\geometry{top=1.5cm,bottom=1.5cm,left=1.5cm,right=1.5cm}');
  lines.push('\\usepackage{auto-multiple-choice}');
  lines.push('\\usepackage{multicol}');
  lines.push('');

  // AMC setup
  lines.push('\\AMCinterquestions=0.5cm');
  lines.push('\\def\\AMCcolQuestionSeparator{\\par}');
  lines.push('');

  // Header
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

  // Student info
  lines.push('{\\centering');
  lines.push('{\\footnotesize Ho va ten: \\dotfill\\hspace{2cm}\\dotfill}');
  lines.push('\\hfill');
  lines.push('{\\footnotesize So bao danh: \\dotfill}');
  lines.push('\\hfill');
  lines.push('{\\footnotesize Phong: \\dotfill}');
  lines.push('\\par\\vspace{0.3cm}}');
  lines.push('');

  // Questions
  lines.push('\\begin{questions}');
  lines.push('');

  questions.forEach((q) => {
    lines.push('\\begin{question}');
    lines.push(`\\question[${q.score || 1}] ${escapeLatex(q.content)}`);
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

  lines.push('\\end{questions}');
  lines.push('');
  lines.push('\\end{document}');

  return lines.join('\n');
}

module.exports = { generateAmcSource, escapeLatex };
