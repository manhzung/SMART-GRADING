/**
 * AMC Coordinate Calculator
 * 
 * Calculates bubble positions based on AMC TeX layout.
 * AMC uses specific positioning formulas for bubbles.
 * 
 * Format output: calage.xy format
 * 
 * Coordinate system:
 * - PDF points (pt) - 72 points per inch
 * - Y increases from top to bottom (PDF convention)
 * - sp (scaled points) = 1/65536 pt
 */

const PAGE_WIDTH_PT = 597.50787;  // A4 width in points
const PAGE_HEIGHT_PT = 845.04684;  // A4 height in points

/**
 * Convert points to scaled points (sp)
 */
function ptToSp(pt) {
  return Math.round(pt * 65536);
}

/**
 * Convert scaled points to points
 */
function spToPt(sp) {
  return sp / 65536;
}

/**
 * AMC bubble sizing (standard)
 */
const BUBBLE_SIZE_PT = 15;  // Standard bubble size

/**
 * Calculate student ID bubble positions
 * Student ID is typically on the left side, 7 digits
 */
function calculateStudentIdPositions(config = {}) {
  const {
    startX = 80,      // Starting X position in pt
    startY = 80,      // Starting Y position in pt (from top)
    numDigits = 7,    // Number of student ID digits
    digitSpacing = 20, // Spacing between digits
    digitWidth = 15,  // Width of each digit bubble
  } = config;

  const positions = [];
  
  for (let digit = 1; digit <= numDigits; digit++) {
    const x = startX + (digit - 1) * digitSpacing;
    // Each digit bubble has 2 tracepos entries (top-left and bottom-right)
    positions.push({
      label: `1/1:chiffre:1,${digit}`,
      x1: ptToSp(x),
      y1: ptToSp(startY),
      x2: ptToSp(x + digitWidth),
      y2: ptToSp(startY + BUBBLE_SIZE_PT),
    });
  }
  
  return positions;
}

/**
 * Calculate version code bubble positions
 */
function calculateVersionPositions(config = {}) {
  const {
    startX = 220,     // Starting X position in pt
    startY = 80,      // Starting Y position in pt (from top)
    numDigits = 2,    // Number of version digits
    digitSpacing = 20,
    digitWidth = 15,
  } = config;

  const positions = [];
  
  for (let digit = 1; digit <= numDigits; digit++) {
    const x = startX + (digit - 1) * digitSpacing;
    positions.push({
      label: `1/1:chiffre:2,${digit}`,
      x1: ptToSp(x),
      y1: ptToSp(startY),
      x2: ptToSp(x + digitWidth),
      y2: ptToSp(startY + BUBBLE_SIZE_PT),
    });
  }
  
  return positions;
}

/**
 * Calculate question bubble positions
 * 
 * IMPORTANT: The .calage.xy format stores Y ALREADY FLIPPED (from PDF origin to image origin)
 * So when generating calage.xy, we should store y_flipped = pageHeight - y_physical
 * 
 * For \AMCcodeGrid (grid horizontal): A, B, C, D are on the SAME ROW
 * Layout: [Q#] [A] [B] [C] [D]
 * Each question takes ~1 row height vertically
 */
function calculateQuestionPositions(config = {}) {
  const {
    startX = 80,       // Left margin
    startY = 200,       // Starting Y physical position (top of page area)
    numColumns = 3,    // Number of columns (AMC multicols)
    columnWidth = 170,   // Width of each column
    optionsSpacing = 25,  // Horizontal spacing between A-B-C-D bubbles
    numQuestions = 10,
    numOptions = 4,      // A, B, C, D options
    questionSpacing = 20, // Vertical spacing between questions (1 row per question for grid layout)
    questionsPerColumn = 5, // Questions per column (controlled by \columnbreak)
    pageHeight = PAGE_HEIGHT_PT,  // A4 page height
  } = config;

  const positions = [];
  
  // With \AMCcodeGrid (horizontal grid): A, B, C, D on same row
  // Layout: [Q#] [A] [B] [C] [D]
  // With \columnbreak every 5 questions:
  // Q1-Q5 → Column 1 (rows 1-5)
  // Q6-Q10 → Column 2 (rows 1-5)
  // Q11-Q15 → Column 3 (rows 1-5)
  const options = ['A', 'B', 'C', 'D']; // Grid order: left to right

  for (let q = 1; q <= numQuestions; q++) {
    // Column based on groups of questionsPerColumn
    const col = Math.floor((q - 1) / questionsPerColumn);
    // Row within column (0-indexed)
    const rowInCol = (q - 1) % questionsPerColumn;
    
    // Base X for this question
    const baseX = startX + col * columnWidth;
    // Y position for this row
    const rowY = startY + rowInCol * questionSpacing;
    
    for (let optIdx = 0; optIdx < numOptions; optIdx++) {
      const option = options[optIdx];
      // A (optIdx=0) at left, D (optIdx=3) at right
      const bubbleX = baseX + optIdx * optionsSpacing;
      
      // Flip Y for calage.xy: y_flipped = pageHeight - physicalY - bubbleHeight
      const flippedY = pageHeight - rowY - BUBBLE_SIZE_PT;
      
      positions.push({
        label: `1/1:case:q${q}:1,${optIdx + 1}`,
        x1: ptToSp(bubbleX),
        y1: ptToSp(flippedY),
        x2: ptToSp(bubbleX + BUBBLE_SIZE_PT),
        y2: ptToSp(flippedY + BUBBLE_SIZE_PT),
      });
    }
  }
  
  return positions;
}

/**
 * Calculate corner markers (for calibration)
 */
function calculateCornerMarkers(config = {}) {
  const {
    margin = 20,  // Margin from page edge
  } = config;

  return [
    // Top-left
    { label: '1/1:positionHG', x1: 0, y1: 0, x2: ptToSp(margin), y2: ptToSp(margin) },
    // Top-right
    { label: '1/1:positionHD', x1: ptToSp(PAGE_WIDTH_PT - margin), y1: 0, x2: ptToSp(PAGE_WIDTH_PT), y2: ptToSp(margin) },
    // Bottom-left
    { label: '1/1:positionBG', x1: 0, y1: ptToSp(PAGE_HEIGHT_PT - margin), x2: ptToSp(margin), y2: ptToSp(PAGE_HEIGHT_PT) },
    // Bottom-right
    { label: '1/1:positionBD', x1: ptToSp(PAGE_WIDTH_PT - margin), y1: ptToSp(PAGE_HEIGHT_PT - margin), x2: ptToSp(PAGE_WIDTH_PT), y2: ptToSp(PAGE_HEIGHT_PT) },
  ];
}

/**
 * Generate calage.xy content from TeX layout
 */
function generateCalageXyFromLayout(config = {}) {
  const {
    numQuestions = 10,
    numStudentDigits = 7,
    numVersionDigits = 2,
    studentIdConfig = {},
    versionConfig = {},
    questionConfig = {},
  } = config;

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

  // Add questions - format: \question{1}{q1}
  for (let q = 1; q <= numQuestions; q++) {
    lines.push(`\\question{${q}}}{q${q}}`);
  }

  // Page info
  lines.push(`\\page{0/1/60}{${PAGE_WIDTH_PT}pt}{${PAGE_HEIGHT_PT}pt}{${PAGE_WIDTH_PT}pt}{${PAGE_HEIGHT_PT}pt}`);

  // Corner markers
  const corners = calculateCornerMarkers();
  for (const c of corners) {
    lines.push(`\\tracepos{${c.label}}{${c.x1}sp}{${c.y1}sp}{square}`);
    lines.push(`\\tracepos{${c.label}}{${c.x2}sp}{${c.y2}sp}{square}`);
  }

  // Student ID bubbles
  const studentIdPositions = calculateStudentIdPositions({
    numDigits: numStudentDigits,
    ...studentIdConfig,
  });
  for (const p of studentIdPositions) {
    lines.push(`\\tracepos{${p.label}}{${p.x1}sp}{${p.y1}sp}{square}`);
    lines.push(`\\tracepos{${p.label}}{${p.x2}sp}{${p.y2}sp}{square}`);
    lines.push(`\\boxchar{${p.label}}{}`);
  }

  // Version code bubbles
  const versionPositions = calculateVersionPositions({
    numDigits: numVersionDigits,
    ...versionConfig,
  });
  for (const p of versionPositions) {
    lines.push(`\\tracepos{${p.label}}{${p.x1}sp}{${p.y1}sp}{square}`);
    lines.push(`\\tracepos{${p.label}}{${p.x2}sp}{${p.y2}sp}{square}`);
    lines.push(`\\boxchar{${p.label}}{}`);
  }

  // Question bubbles
  const questionPositions = calculateQuestionPositions({
    numQuestions,
    ...questionConfig,
  });
  for (const p of questionPositions) {
    lines.push(`\\tracepos{${p.label}}{${p.x1}sp}{${p.y1}sp}{square}`);
    lines.push(`\\tracepos{${p.label}}{${p.x2}sp}{${p.y2}sp}{square}`);
    lines.push(`\\boxchar{${p.label}}{}`);
  }

  return lines.join('\n');
}

module.exports = {
  generateCalageXyFromLayout,
  calculateStudentIdPositions,
  calculateVersionPositions,
  calculateQuestionPositions,
  calculateCornerMarkers,
  ptToSp,
  spToPt,
  PAGE_WIDTH_PT,
  PAGE_HEIGHT_PT,
  BUBBLE_SIZE_PT,
};
