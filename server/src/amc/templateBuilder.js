/**
 * Template Builder
 * Combine bubble coordinates (from .calage.xy) + answer keys (from CSV)
 * to produce the final template.json for OMR grading
 *
 * Template.json is what the mobile scanner uses to:
 * 1. Know where bubbles are on the scanned page (calage data)
 * 2. Know which bubble is correct for each question (answer key)
 * 3. Know how to decode student ID / version code fields
 */

const { scaleCalage } = require('./amcCalageParser');
const { answerKeyToObject } = require('./amcCsvParser');

const DEFAULT_SCAN_DPI = 300;
const PAPER_SIZES = {
  A4: { width: 595, height: 842 },
  A5: { width: 420, height: 595 },
};

/**
 * Build the answers section: coordinates of all bubbles per question
 * Format: { 'q1': { A: {x,y,w,h}, B: {...}, ... }, 'q2': {...}, ... }
 * (q + numeric position -> option letter -> coords)
 * NOTE: Uses 'q' prefix to match mobile expected format
 *
 * AMC exports only correct answer bubble (A) in calage.xy per question.
 * This function generates positions for B, C, D based on existing bubble + spacing.
 *
 * @param {Object} scaledCalage - result of scaleCalage() - already scaled!
 * @param {number} scale - DPI scale factor (used for reference only, coords already scaled)
 * @param {Object} csvData - parsed CSV with optionsPerQuestion info
 * @returns {Object}
 */
function buildAnswersSection(scaledCalage, scale, csvData) {
  const answers = {};
  if (!scaledCalage || !scaledCalage.questions) return answers;

  // Get options per question from CSV metadata (default 4: A,B,C,D)
  const optionsPerQuestion = csvData?.meta?.optionsPerQuestion || 4;
  const optionLetters = ['A', 'B', 'C', 'D'].slice(0, optionsPerQuestion);

  // IMPORTANT: Calculate ACTUAL spacing from all bubbles in calage
  // AMC spacing is ~25pt for options, but calage only stores 1 slot per question
  // So we must calculate spacing from the bubbles array
  let actualSpacing = Math.round(25 * scale); // ~104px at 300 DPI (default)

  // Try to calculate spacing from bubbles array
  if (scaledCalage.bubbles && scaledCalage.bubbles.length >= 8) {
    // Group bubbles by question
    const bubblesByQ = {};
    for (const bubble of scaledCalage.bubbles) {
      const qNum = bubble.questionNum;
      if (!bubblesByQ[qNum]) bubblesByQ[qNum] = [];
      bubblesByQ[qNum].push(bubble);
    }

    // Calculate spacing from questions that have multiple bubbles
    const spacings = [];
    for (const bubbles of Object.values(bubblesByQ)) {
      if (bubbles.length >= 2) {
        bubbles.sort((a, b) => a.x - b.x);
        for (let i = 1; i < bubbles.length; i++) {
          const spacing = bubbles[i].x - bubbles[i - 1].x;
          if (spacing > 50 && spacing < 200) {
            // Valid spacing range
            spacings.push(spacing);
          }
        }
      }
    }

    if (spacings.length > 0) {
      // Use median spacing (more robust than average)
      spacings.sort((a, b) => a - b);
      actualSpacing = spacings[Math.floor(spacings.length / 2)];
      console.log(`[buildAnswersSection] Calculated spacing from ${spacings.length} samples: ${actualSpacing}px (median)`);
    }
  }

  console.log(`[buildAnswersSection] Using spacing: ${actualSpacing}px`);

  for (const [qNumStr, qData] of Object.entries(scaledCalage.questions)) {
    const qNum = parseInt(qNumStr, 10);
    if (isNaN(qNum) || qNum <= 0) continue;
    answers[`q${qNum}`] = {};

    // Collect existing bubbles (usually just the correct answer = A)
    const existingSlots = qData.slots || {};

    // Add existing bubbles (from AMC calage - typically only correct answer)
    for (const [letter, bubble] of Object.entries(existingSlots)) {
      answers[`q${qNum}`][letter] = {
        x: bubble.x,
        y: bubble.y,
        w: bubble.w,
        h: bubble.h,
      };
    }

    // Generate missing option bubbles (B, C, D)
    // Find reference bubble (prefer A if exists, otherwise first available)
    const referenceLetter = optionLetters.find((l) => existingSlots[l]) || Object.keys(existingSlots)[0];
    const referenceBubble = existingSlots[referenceLetter];

    if (referenceBubble && optionsPerQuestion > 1) {
      const refIndex = optionLetters.indexOf(referenceLetter);
      const refX = referenceBubble.x;
      const refY = referenceBubble.y;
      const refW = referenceBubble.w || Math.round(15 * scale);
      const refH = referenceBubble.h || Math.round(15 * scale);

      for (let i = 0; i < optionLetters.length; i++) {
        const letter = optionLetters[i];
        if (!answers[`q${qNum}`][letter]) {
          // Generate position for this option based on reference
          const offsetFromRef = i - refIndex;
          const newX = refX + offsetFromRef * actualSpacing;

          answers[`q${qNum}`][letter] = {
            x: newX,
            y: refY,
            w: refW,
            h: refH,
          };
        }
      }
    }
  }

  return answers;
}

/**
 * Build student ID field section (7 digits, 0-9)
 * Extracts coordinates from parsed calage data
 * Format for mobile: { digits: n, coords: [{x, y, w, h, digit, value}, ...] }
 * Mobile expects coords sorted by digit position, then value
 * @param {Object} options
 * @param {number} options.digits - number of digits (default 7)
 * @param {number} options.scale - scale factor from PDF points to target DPI
 * @param {Object|null} options.existingCoords - parsed calage data with studentId
 * @returns {Object} { digits: n, coords: [...] }
 */
function buildStudentIdSection(options = {}) {
  const { digits = 7, scale = 1, existingCoords = null } = options;

  if (existingCoords && existingCoords.studentId) {
    // Convert from { digit: { value: coords } } to flat array sorted by digit then value
    const coords = [];
    const studentIdData = existingCoords.studentId;

    // Sort digits numerically
    const sortedDigits = Object.keys(studentIdData)
      .map(Number)
      .sort((a, b) => a - b);

    for (const digit of sortedDigits) {
      const values = studentIdData[digit];
      if (!values) continue;

      // Sort values numerically
      const sortedValues = Object.keys(values)
        .map(Number)
        .sort((a, b) => a - b);

      for (const value of sortedValues) {
        const c = values[value];
        if (!c) continue;
        // NOTE: existingCoords is already scaled by scaleCalage(), so no need to scale again
        coords.push({
          x: Math.round(c.x * 100) / 100,
          y: Math.round(c.y * 100) / 100,
          w: Math.round(c.w * 100) / 100,
          h: Math.round(c.h * 100) / 100,
          digit, // Position: 0, 1, 2...
          value, // Value: 0-9
        });
      }
    }

    return {
      digits,
      coords, // Flat array, sorted by digit then value
    };
  }

  return {
    digits,
    coords: null, // Fallback: student ID field needs to be detected separately
  };
}

/**
 * Build version code field section (2 digits, 1-4)
 * Extracts coordinates from parsed calage data
 * Format for mobile: { digits: n, coords: [{x, y, w, h, digit, value}, ...] }
 * Mobile expects coords sorted by digit position, then value
 * @param {Object} options
 * @param {number} options.digits - number of digits (default 2)
 * @param {number} options.scale - scale factor
 * @param {Object|null} options.existingCoords - parsed calage data with versionCode
 * @returns {Object} { digits: n, coords: [...] }
 */
function buildVersionCodeSection(options = {}, existingCoords = null) {
  const { digits = 2, scale = 1 } = options;

  // Support both call patterns:
  // 1. buildVersionCodeSection({ digits: 2 }, existingCoords)
  // 2. buildVersionCodeSection({ digits: 2, existingCoords: coords })
  const coordsData = existingCoords || options.existingCoords;

  if (coordsData && coordsData.versionCode) {
    const coords = [];
    const versionData = coordsData.versionCode;

    // Sort digits numerically
    const sortedDigits = Object.keys(versionData)
      .map(Number)
      .sort((a, b) => a - b);

    for (const digit of sortedDigits) {
      const values = versionData[digit];
      if (!values) continue;

      // Sort values numerically
      const sortedValues = Object.keys(values)
        .map(Number)
        .sort((a, b) => a - b);

      for (const value of sortedValues) {
        const c = values[value];
        if (!c) continue;
        // NOTE: existingCoords is already scaled by scaleCalage(), so no need to scale again
        coords.push({
          x: Math.round(c.x * 100) / 100,
          y: Math.round(c.y * 100) / 100,
          w: Math.round(c.w * 100) / 100,
          h: Math.round(c.h * 100) / 100,
          digit, // Position: 0, 1, 2...
          value, // Value: 1, 2, 3, 4 for version
        });
      }
    }

    return {
      digits,
      coords, // Flat array, sorted by digit then value
    };
  }

  return {
    digits,
    coords: null,
  };
}

/**
 * Generate version code coordinates based on student ID position.
 * AMC places version code with VERTICAL layout (like student ID):
 * - Each digit has 10 values stacked vertically
 * - Digits are placed side by side horizontally
 *
 * @param {Array|null} studentIdCoords - student ID coords array
 * @param {number} digits - number of version code digits
 * @param {number} scale - DPI scale factor
 * @returns {Array} coords array for version code
 */
function generateVersionCodeFromStudentId(studentIdCoords, digits = 2, scale = 1) {
  if (!studentIdCoords || studentIdCoords.length === 0) {
    return [];
  }

  // Find the first digit's first value position as reference
  let firstValue = null;
  for (const coord of studentIdCoords) {
    if (coord.digit === 1 && coord.value === 1) {
      firstValue = coord;
      break;
    }
  }

  if (!firstValue) {
    return [];
  }

  // Calculate vertical spacing from student ID bubbles
  // In PDF coordinates (top-left origin): larger y = higher on page (top)
  // Value 1 is at TOP (larger y), value 10 is at BOTTOM (smaller y)
  // So spacing = Math.abs(coord.y - firstValue.y)
  let verticalSpacing = 71; // default (bubble height + gap)
  for (const coord of studentIdCoords) {
    if (coord.digit === 1 && coord.value === 2) {
      verticalSpacing = Math.abs(Math.round(coord.y - firstValue.y));
      break;
    }
  }

  const refX = firstValue.x;
  const refY = firstValue.y;
  const refW = firstValue.w || 46;
  const refH = firstValue.h || 46;

  // Standard AMC spacing between version digits (horizontal)
  const DIGIT_SPACING_PT = 95; // in PDF points (~95 * 4.167 ≈ 396 pixels)

  const startX = refX + DIGIT_SPACING_PT * scale;
  const coords = [];

  // Generate version code bubbles with VERTICAL stacking per digit
  // In PDF: larger y = top, smaller y = bottom
  // Value 1 at top (larger y), value 10 at bottom (smaller y)
  for (let digit = 1; digit <= digits; digit++) {
    const digitStartX = startX + (digit - 1) * DIGIT_SPACING_PT * scale;
    for (let value = 1; value <= 10; value++) {
      // Stack vertically: y decreases as value increases (moving down the page)
      coords.push({
        x: Math.round(digitStartX * 100) / 100,
        y: Math.round((refY - (value - 1) * verticalSpacing) * 100) / 100,
        w: Math.round(refW * 100) / 100,
        h: Math.round(refH * 100) / 100,
        digit,
        value,
      });
    }
  }

  console.log(
    `[generateVersionCodeFromStudentId] Generated ${coords.length} version code bubbles (vertical stack, spacing=${verticalSpacing})`
  );
  return coords;
}

/**
 * Build question scores section (equal scoring by default)
 * Format: { 'q1': score, 'q2': score, ... } (q + numeric position -> score)
 * NOTE: Uses 'q' prefix to match mobile expected format
 * @param {number} numQuestions
 * @param {number} totalScore
 * @returns {Object}
 */
function buildQuestionScores(numQuestions, totalScore = 10) {
  const scores = {};
  if (numQuestions <= 0) return scores;

  const scorePerQuestion = totalScore / numQuestions;

  for (let i = 1; i <= numQuestions; i++) {
    // Use 'q' prefix to match mobile expected format
    scores[`q${i}`] = Math.round(scorePerQuestion * 100) / 100;
  }

  return scores;
}

/**
 * Build answer key section from CSV data
 * Format: { 'q1': 'A', 'q2': 'B', ... } (q + numeric position -> correct option)
 * NOTE: Mobile scoring engine expects 'q' prefix to match detectedAnswers keys
 * @param {Object} csvData - result of parseAmcCsv()
 * @returns {Object} { 'q1': 'A', 'q2': 'B', ... }
 */
function buildAnswerKeySection(csvData) {
  const key = {};
  if (!csvData || !csvData.answers) return key;
  for (const [qNumStr, data] of Object.entries(csvData.answers)) {
    const qNum = parseInt(qNumStr, 10);
    if (isNaN(qNum) || qNum <= 0) continue;
    // Use 'q' prefix to match mobile expected format
    key[`q${qNum}`] = (data.correctOptions[0] || '').toUpperCase();
  }
  return key;
}

/**
 * Main builder: construct template.json from calage + CSV data
 *
 * @param {Object} input
 * @param {Object} input.calageData - raw calage (from parseCalage or readAndParseCalage)
 * @param {Object} input.csvData - parsed CSV (from parseAmcCsv)
 * @param {Object} input.exam - exam metadata { _id, title, totalScore }
 * @param {Object} [input.options]
 * @param {number} [input.options.scanDpi=300] - DPI of mobile scan
 * @param {string} [input.options.paperSize='A4'] - A4 or A5
 * @param {number} [input.options.studentIdDigits=7] - number of student ID digits
 * @param {number} [input.options.versionDigits=2] - number of version code digits
 * @returns {Object} template.json
 */
function buildTemplate(input) {
  const { calageData, csvData, exam, options = {} } = input;

  const { scanDpi = DEFAULT_SCAN_DPI, paperSize = 'A4', studentIdDigits = 7, versionDigits = 2 } = options;

  const totalScore = exam?.totalScore || 10;
  const numQuestions = calageData?.meta?.totalQuestions || csvData?.meta?.totalQuestions || 0;
  const scorePerQuestion = numQuestions > 0 ? totalScore / numQuestions : 1;

  // Scale calage from PDF points to target scan DPI
  const scaledCalage = scaleCalage(calageData, scanDpi);
  const scale = scanDpi / 72; // 72 = PDF points

  const paperDims = PAPER_SIZES[paperSize] || PAPER_SIZES.A4;
  const pageWidth = Math.round(paperDims.width * scale);
  const pageHeight = Math.round(paperDims.height * scale);

  // Reference bubble size (from first question, first option)
  const firstBubble = scaledCalage.bubbles[0] || { w: 15, h: 15 };
  const bubbleWidth = Math.round(firstBubble.w * 100) / 100;
  const bubbleHeight = Math.round(firstBubble.h * 100) / 100;

  // Build sections
  const answers = buildAnswersSection(scaledCalage, scale, csvData);
  const answerKey = buildAnswerKeySection(csvData);
  const questionScores = buildQuestionScores(numQuestions, totalScore);

  // NOTE: existingCoords (scaledCalage) is already scaled by scaleCalage()
  // So we pass scale=1 to avoid double-scaling
  const studentIdSection = buildStudentIdSection({
    digits: studentIdDigits,
    scale: 1,
    existingCoords: scaledCalage,
  });

  // Build version code section
  // If calage doesn't have versionCode data, generate from student ID position
  let versionCodeSection = buildVersionCodeSection({
    digits: versionDigits,
    scale: 1,
    existingCoords: scaledCalage,
  });

  // Fallback: generate version code bubbles based on student ID position
  if (!versionCodeSection.coords || versionCodeSection.coords.length === 0) {
    console.log('[buildTemplate] No versionCode in calage, generating from student ID position...');
    const generatedCoords = generateVersionCodeFromStudentId(studentIdSection.coords, versionDigits, scale);
    if (generatedCoords.length > 0) {
      versionCodeSection = {
        digits: versionDigits,
        coords: generatedCoords,
      };
    }
  }

  // Validate coordinates don't overflow page
  const validateCoords = (coords, fieldName) => {
    if (!coords || !Array.isArray(coords)) return;
    for (const c of coords) {
      if (c.x + c.w > pageWidth) {
        console.warn(`[buildTemplate] WARNING: ${fieldName} x(${c.x}) + w(${c.w}) = ${c.x + c.w} > pageWidth(${pageWidth})`);
      }
      if (c.y + c.h > pageHeight) {
        console.warn(
          `[buildTemplate] WARNING: ${fieldName} y(${c.y}) + h(${c.h}) = ${c.y + c.h} > pageHeight(${pageHeight})`
        );
      }
    }
  };
  validateCoords(studentIdSection.coords, 'studentId');
  validateCoords(versionCodeSection.coords, 'versionCodeZone');

  return {
    examId: exam?._id ? exam._id.toString() : '',
    title: exam?.title || '',
    paperSize,
    scanDpi,
    // Scale factor: how much to multiply PDF points to get target DPI pixels
    // e.g., at 300 DPI: scale = 300/72 ≈ 4.167
    scale: Math.round(scale * 10000) / 10000,
    pageWidth,
    pageHeight,
    bubbleWidth,
    bubbleHeight,
    // Student ID section - already scaled by scaleCalage()
    studentId: studentIdSection,
    // Version code section - already scaled by scaleCalage()
    versionCodeZone: versionCodeSection,
    // NOTE: answers/answerKey/questionScores all use 'q' prefix
    // e.g., answers['q1'] = { A: {x,y,w,h}, B: {...}, ... }
    //       answerKey['q1'] = 'A'
    //       questionScores['q1'] = 0.5
    answers,
    answerKey,
    questionScores,
    totalScore,
    numberOfQuestions: numQuestions,
    preProcessors: [
      { name: 'Levels', options: { inBlack: 15.0, inWhite: 200.0, outBlack: 0.0, outWhite: 255.0, gamma: 1.0 } },
      { name: 'GaussianBlur', options: { kSize: [3, 3], sigmaX: 0 } },
      { name: 'CropPage', options: {} },
    ],
    autoAlign: false,
    generatedAt: new Date().toISOString(),
    source: 'amc-calage',
  };
}

module.exports = {
  buildTemplate,
  buildAnswersSection,
  buildStudentIdSection,
  buildVersionCodeSection,
  buildQuestionScores,
  buildAnswerKeySection,
  generateVersionCodeFromStudentId,
  DEFAULT_SCAN_DPI,
  PAPER_SIZES,
};
