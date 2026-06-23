/**
 * AMC Template Bridge
 * Generate template.json from AMC CSV data + exam data
 */

class AmcTemplateBridge {
  /**
   * @param {Object} options
   * @param {Object} options.csvData - parsed from AmcCsvParser
   * @param {Object} options.versionData - { versionCode, answerKey }
   * @param {Object} options.examData - exam document
   * @returns {Object} template JSON
   */
  generate({ csvData, versionData, examData }) {
    const answerKey = versionData.answerKey || {};
    const questionScores = {};
    const totalScore = examData.totalScore || 10;
    const numQuestions = csvData.answers ? Object.keys(csvData.answers).length : 0;
    const scorePerQuestion = numQuestions > 0 ? totalScore / numQuestions : 1;

    // Build questionScores from examData.questionIds
    if (examData.questionIds && examData.questionIds.length > 0) {
      Object.keys(csvData.answers || {}).forEach((qId, idx) => {
        const q = examData.questionIds[idx];
        questionScores[qId] = q && q.score ? q.score : scorePerQuestion;
      });
    }

    // Fill missing with equal score
    Object.keys(csvData.answers || {}).forEach((qId) => {
      if (!questionScores[qId]) {
        questionScores[qId] = scorePerQuestion;
      }
    });

    return {
      examId: examData._id ? examData._id.toString() : '',
      versionCode: versionData.versionCode,
      paperSize: 'A4',
      studentId: csvData.studentId,
      versionCodeZone: csvData.versionCode,
      answers: csvData.answers || {},
      answerKey,
      questionScores,
      totalScore,
      numberOfQuestions: numQuestions,
    };
  }
}

module.exports = AmcTemplateBridge;
