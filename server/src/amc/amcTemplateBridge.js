/**
 * AMC Template Bridge
 * Generate template.json from AMC CSV data + exam data
 *
 * AMC CSV xuất coordinates trong PDF point space (72 DPI).
 * Mobile scan phiếu in thường ở 300 DPI → scale factor = 300/72 ≈ 4.17
 */

const PDF_DPI = 72;
const DEFAULT_SCAN_DPI = 300;

class AmcTemplateBridge {
  /**
   * @param {Object} options
   * @param {Object} options.csvData - parsed from AmcCsvParser
   * @param {Object} options.versionData - { versionCode, answerKey }
   * @param {Object} options.examData - exam document
   * @param {number} [options.scanDpi=300] - DPI của ảnh scan mobile
   * @param {string} [options.paperSize='A4'] - Khổ giấy AMC (A4/A5)
   * @returns {Object} template JSON
   */
  generate({ csvData, versionData, examData, scanDpi = DEFAULT_SCAN_DPI, paperSize = 'A4' }) {
    const answerKey = versionData.answerKey || {};
    const questionScores = {};
    const totalScore = examData.totalScore || 10;
    const numQuestions = csvData.answers ? Object.keys(csvData.answers).length : 0;
    const scorePerQuestion = numQuestions > 0 ? totalScore / numQuestions : 1;

    const scale = scanDpi / PDF_DPI;

    const scaledAnswers = {};
    Object.keys(csvData.answers || {}).forEach((qId) => {
      scaledAnswers[qId] = {};
      Object.keys(csvData.answers[qId]).forEach((letter) => {
        const c = csvData.answers[qId][letter];
        scaledAnswers[qId][letter] = {
          x: Math.round(c.x * scale),
          y: Math.round(c.y * scale),
          w: Math.round(c.w * scale),
          h: Math.round(c.h * scale),
        };
      });
    });

    const scaledStudentId = csvData.studentId
      ? {
          digits: csvData.studentId.digits,
          coords: (csvData.studentId.coords || []).map((c) => ({
            x: Math.round(c.x * scale),
            y: Math.round(c.y * scale),
            w: Math.round(c.w * scale),
            h: Math.round(c.h * scale),
            digit: c.digit,
          })),
        }
      : { digits: 0, coords: [] };

    const scaledVersionCode = csvData.versionCode
      ? {
          digits: csvData.versionCode.digits,
          coords: (csvData.versionCode.coords || []).map((c) => ({
            x: Math.round(c.x * scale),
            y: Math.round(c.y * scale),
            w: Math.round(c.w * scale),
            h: Math.round(c.h * scale),
            digit: c.digit,
          })),
        }
      : { digits: 0, coords: [] };

    const paperDims = {
      A4: { width: 595, height: 842 },
      A5: { width: 420, height: 595 },
    }[paperSize] || { width: 595, height: 842 };

    const pageWidth = Math.round(paperDims.width * scale);
    const pageHeight = Math.round(paperDims.height * scale);

    if (examData.questionIds && examData.questionIds.length > 0) {
      Object.keys(scaledAnswers || {}).forEach((qId, idx) => {
        const q = examData.questionIds[idx];
        questionScores[qId] = q && q.score ? q.score : scorePerQuestion;
      });
    }

    Object.keys(scaledAnswers || {}).forEach((qId) => {
      if (!questionScores[qId]) {
        questionScores[qId] = scorePerQuestion;
      }
    });

    return {
      examId: examData._id ? examData._id.toString() : '',
      versionCode: versionData.versionCode,
      paperSize,
      scanDpi,
      scale,
      pageWidth,
      pageHeight,
      bubbleWidth: scaledAnswers[Object.keys(scaledAnswers)[0]]?.A?.w || Math.round(20 * scale),
      bubbleHeight: scaledAnswers[Object.keys(scaledAnswers)[0]]?.A?.h || Math.round(20 * scale),
      studentId: scaledStudentId,
      versionCodeZone: scaledVersionCode,
      answers: scaledAnswers,
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
    };
  }
}

module.exports = AmcTemplateBridge;
