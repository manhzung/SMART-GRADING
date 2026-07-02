/**
 * AMC TeX Layout Parser
 *
 * Parses AMC TeX source to extract actual layout parameters
 * and calculate accurate bubble positions.
 *
 * This ensures coordinates match exactly what AMC renders.
 */

const { PAGE_WIDTH_PT, PAGE_HEIGHT_PT, BUBBLE_SIZE_PT, ptToSp } = require('./amcCoordinateCalculator');

/**
 * Parse AMC TeX source to extract layout configuration
 */
function parseTexLayout(texSource) {
  const config = {
    // Page dimensions (from geometry package)
    pageWidth: PAGE_WIDTH_PT,
    pageHeight: PAGE_HEIGHT_PT,

    // Margins
    marginTop: (0.4 * 72) / 2.54, // ~11.3pt (0.4cm)
    marginBottom: (0.4 * 72) / 2.54,
    marginLeft: (0.5 * 72) / 2.54, // ~14.2pt (0.5cm)
    marginRight: (0.5 * 72) / 2.54,

    // Header section
    headerHeight: 40,
    headerEndY: 60,

    // Student ID section
    studentId: {
      startX: 20, // pt (left margin)
      startY: 70, // pt (from top)
      numDigits: 7,
      bubbleSize: 6, // pt (AMC uses smaller bubbles for integer grids)
      spacing: 8, // pt between bubbles
    },

    // Version code section
    versionCode: {
      startX: 150, // pt (after student ID)
      startY: 70,
      numDigits: 2,
      bubbleSize: 6,
      spacing: 8,
    },

    // Answer section
    answers: {
      startX: 20,
      startY: 100,
      numColumns: 3,
      columnWidth: 170, // approx
      numQuestions: 0, // to be detected
      optionsPerQuestion: 4, // A, B, C, D
      bubbleSize: 6,
      optionSpacing: 15, // horizontal between options
      questionSpacing: 12, // vertical between questions
    },
  };

  // Parse margin settings
  const marginMatch = texSource.match(/\\usepackage\[([^\]]+)\]{geometry}/);
  if (marginMatch) {
    const marginStr = marginMatch[1];
    const topMatch = marginStr.match(/top=([0-9.]+)/);
    const bottomMatch = marginStr.match(/bottom=([0-9.]+)/);
    const leftMatch = marginStr.match(/left=([0-9.]+)/);
    const rightMatch = marginStr.match(/right=([0-9.]+)/);

    if (topMatch) config.marginTop = (parseFloat(topMatch[1]) * 72) / 2.54;
    if (bottomMatch) config.marginBottom = (parseFloat(bottomMatch[1]) * 72) / 2.54;
    if (leftMatch) config.marginLeft = (parseFloat(leftMatch[1]) * 72) / 2.54;
    if (rightMatch) config.marginRight = (parseFloat(rightMatch[1]) * 72) / 2.54;
  }

  // Parse \AMCcodeGridInt{student}{7} for student ID digits
  const studentMatch = texSource.match(/\\AMCcodeGridInt\{student\}\{(\d+)\}/);
  if (studentMatch) {
    config.studentId.numDigits = parseInt(studentMatch[1], 10);
  }

  // Parse \AMCcodeGridInt{ver}{2} for version digits
  const verMatch = texSource.match(/\\AMCcodeGridInt\{ver\}\{(\d+)\}/);
  if (verMatch) {
    config.versionCode.numDigits = parseInt(verMatch[1], 10);
    // Position version after student ID
    config.versionCode.startX =
      config.studentId.startX + config.studentId.numDigits * (config.studentId.bubbleSize + config.studentId.spacing);
  }

  // Count questions: \AMCcodeGrid{q1}{A,B,C,D}
  const questionMatches = texSource.match(/\\AMCcodeGrid\{(q\d+)\}\{([^}]+)\}/g) || [];
  config.answers.numQuestions = questionMatches.length;

  // Parse options for each question
  const optionMatches = texSource.match(/\\AMCcodeGrid\{[^}]+\}\{([^}]+)\}/g) || [];
  if (optionMatches.length > 0) {
    const firstOptions = optionMatches[0].match(/\{([^}]+)\}/);
    if (firstOptions) {
      config.answers.optionsPerQuestion = firstOptions[1].split(',').length;
    }
  }

  // Calculate actual column width based on available width
  const availableWidth = config.pageWidth - config.marginLeft - config.marginRight;
  config.answers.columnWidth = Math.floor(availableWidth / config.answers.numColumns);

  // Calculate answer start Y based on header
  config.answers.startY = config.headerEndY + 20;

  return config;
}

/**
 * Generate tracepos entries for student ID bubbles
 * Format: case:student[DIGIT],VALUE
 */
function generateStudentIdTracepos(config) {
  const entries = [];
  const { studentId } = config;

  for (let digit = 1; digit <= studentId.numDigits; digit++) {
    for (let value = 1; value <= 10; value++) {
      // 10 options per digit (0-9)
      const x = studentId.startX + (digit - 1) * (studentId.bubbleSize + studentId.spacing);
      const y = studentId.startY;

      // Two tracepos for each bubble (top-left and bottom-right corners)
      entries.push({
        label: `case:student[${digit}]:${digit},${value}`,
        x1: ptToSp(x),
        y1: ptToSp(y),
        x2: ptToSp(x + studentId.bubbleSize),
        y2: ptToSp(y + studentId.bubbleSize),
      });
    }
  }

  return entries;
}

/**
 * Generate tracepos entries for version code bubbles
 * Format: case:ver[DIGIT],VALUE
 */
function generateVersionCodeTracepos(config) {
  const entries = [];
  const { versionCode } = config;

  for (let digit = 1; digit <= versionCode.numDigits; digit++) {
    for (let value = 1; value <= 4; value++) {
      // 4 options per digit (1-4)
      const x = versionCode.startX + (digit - 1) * (versionCode.bubbleSize + versionCode.spacing);
      const y = versionCode.startY;

      entries.push({
        label: `case:ver${digit}:${digit},${value}`,
        x1: ptToSp(x),
        y1: ptToSp(y),
        x2: ptToSp(x + versionCode.bubbleSize),
        y2: ptToSp(y + versionCode.bubbleSize),
      });
    }
  }

  return entries;
}

/**
 * Generate tracepos entries for question bubbles
 * Format: case:q[NUM]:POSITION,VALUE
 * Where VALUE is 1=A, 2=B, 3=C, 4=D
 */
function generateQuestionTracepos(config) {
  const entries = [];
  const { answers } = config;

  const questionsPerColumn = 5; // AMC default
  const rowHeight = 12; // Vertical spacing between questions

  for (let q = 1; q <= answers.numQuestions; q++) {
    // Determine column (0, 1, 2)
    const col = Math.floor((q - 1) / questionsPerColumn);
    // Determine row within column (0-4)
    const row = (q - 1) % questionsPerColumn;

    // Calculate base position for this question row
    const baseX = answers.startX + col * answers.columnWidth;
    const baseY = answers.startY + row * rowHeight;

    // Options A, B, C, D (or more)
    const numOptions = answers.optionsPerQuestion;

    for (let optIdx = 0; optIdx < numOptions; optIdx++) {
      const value = optIdx + 1; // 1=A, 2=B, 3=C, 4=D

      const x = baseX + optIdx * answers.optionSpacing;
      const y = baseY;

      // Flip Y for image coordinates (PDF Y starts from bottom)
      const flippedY = config.pageHeight - y - answers.bubbleSize;

      entries.push({
        label: `case:q${q}:1,${value}`,
        x1: ptToSp(x),
        y1: ptToSp(flippedY),
        x2: ptToSp(x + answers.bubbleSize),
        y2: ptToSp(flippedY + answers.bubbleSize),
      });
    }
  }

  return entries;
}

/**
 * Generate boxchar entries for all bubbles
 */
function generateBoxcharEntries(traceposEntries) {
  return traceposEntries.map((entry) => ({
    label: entry.label,
    char: '',
  }));
}

/**
 * Generate complete calage.xy from TeX source
 */
function generateCalageXyFromTex(texSource, numQuestions) {
  const layout = parseTexLayout(texSource);
  layout.answers.numQuestions = numQuestions || layout.answers.numQuestions;

  const lines = [
    '\\version{2023/02/06 v1.6.0 r:47896cea}',
    '\\with{codedigit=squarebrackets}',
    '\\with{version=2023/02/06 v1.6.0 r:47896cea}',
    '\\with{ensemble=no}',
    '\\with{insidebox=no}',
    '\\with{outsidebox=no}',
    '\\with{postcorrect=no}',
    '\\with{extractonly=no}',
    '\\with{lang=}',
    '\\with{ncopies=default}',
  ];

  // Add questions
  for (let q = 1; q <= layout.answers.numQuestions; q++) {
    lines.push(`\\question{${q}}{q${q}}`);
  }

  // Page info
  lines.push(`\\page{0/1/60}{${layout.pageWidth}pt}{${layout.pageHeight}pt}{${layout.pageWidth}pt}{${layout.pageHeight}pt}`);

  // Student ID tracepos
  const studentEntries = generateStudentIdTracepos(layout);
  for (const entry of studentEntries) {
    lines.push(`\\tracepos{${entry.label}}{${entry.x1}sp}{${entry.y1}sp}{square}`);
    lines.push(`\\tracepos{${entry.label}}{${entry.x2}sp}{${entry.y2}sp}{square}`);
  }

  // Version code tracepos
  const versionEntries = generateVersionCodeTracepos(layout);
  for (const entry of versionEntries) {
    lines.push(`\\tracepos{${entry.label}}{${entry.x1}sp}{${entry.y1}sp}{square}`);
    lines.push(`\\tracepos{${entry.label}}{${entry.x2}sp}{${entry.y2}sp}{square}`);
  }

  // Question tracepos
  const questionEntries = generateQuestionTracepos(layout);
  for (const entry of questionEntries) {
    lines.push(`\\tracepos{${entry.label}}{${entry.x1}sp}{${entry.y1}sp}{square}`);
    lines.push(`\\tracepos{${entry.label}}{${entry.x2}sp}{${entry.y2}sp}{square}`);
  }

  // Boxchar entries
  const boxcharEntries = generateBoxcharEntries([...studentEntries, ...versionEntries, ...questionEntries]);
  for (const entry of boxcharEntries) {
    lines.push(`\\boxchar{${entry.label}}{${entry.char}}`);
  }

  return {
    content: lines.join('\n'),
    layout,
    traceposCount: studentEntries.length + versionEntries.length + questionEntries.length,
  };
}

module.exports = {
  parseTexLayout,
  generateStudentIdTracepos,
  generateVersionCodeTracepos,
  generateQuestionTracepos,
  generateCalageXyFromTex,
};
