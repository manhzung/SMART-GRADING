/**
 * AMC Service Facade
 * Entry point cho toan bo AMC pipeline — chi quan ly PDF generation
 *
 * Luu y: templateJson (OMR grading data) duoc luu vao OMRTemplate
 * boi examPaper.service.generateAllPapers() (qua _compileAnswerSheetProject)
 * Khong luu templateJson o amc.service.js.
 */

const path = require('path');
const fs = require('fs');
const amcRunner = require('./amcRunner.service');
const amcCompiler = require('./amcCompiler.service');
const { Exam, ExamVersion } = require('../models');

const UPLOADS_DIR = path.join(__dirname, '../../../uploads/amc');

class AmcService {
  constructor() {
    this.uploadsDir = UPLOADS_DIR;
  }

  /**
   * Generate exam papers cho mot exam
   * @param {string} examId
   * @param {string[]} versionCodes
   * @param {Object} options
   * @returns {Promise<ExamPaperResult>}
   */
  async generateExamPapers(examId, versionCodes, options = {}) {
    const { timeoutSeconds = 120 } = options;

    const envCheck = await amcRunner.validateEnvironment();
    if (!envCheck.isValid) {
      throw new Error(
        `AMC environment not ready. Missing: ${
          Object.entries(envCheck.tools)
            .filter(([, v]) => !v)
            .map(([k]) => k)
            .join(', ')
        }`
      );
    }

    const exam = await Exam.findById(examId)
      .populate('primaryClassId', 'name')
      .populate('questionIds');

    if (!exam) {
      throw new Error(`Exam ${examId} not found`);
    }

    const outputDir = path.join(this.uploadsDir, examId.toString());
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const questions = (exam.questionIds || []).map((q) => ({
      content: q.content,
      options: q.options.map((o) => ({
        id: o.id,
        content: o.content,
        isCorrect: o.isCorrect,
      })),
      correctAnswer: q.correctAnswer,
      score: q.score || 1,
    }));

    const result = await amcCompiler.compile({
      examId: examId.toString(),
      examData: {
        title: exam.title,
        subjectName: exam.subjectName,
        className: exam.primaryClassId?.name || '',
        examDate: exam.examDate,
        duration: exam.duration,
        totalScore: exam.totalScore,
        questions,
        printConfig: exam.printConfig,
        schoolHeader: exam.schoolHeader || '',
        shuffleConfig: exam.shuffleConfig,
      },
      versionCodes,
      outputDir,
      timeoutSeconds,
    });

    // Update ExamVersion records with PDF URLs only
    const versionResults = [];
    for (let i = 0; i < result.versionPdfs.length; i++) {
      const vp = result.versionPdfs[i];
      const vCode = vp.versionCode;

      const examVersion = await ExamVersion.findOne({ examId, versionCode: vCode });

      if (examVersion) {
        examVersion.pdfUrl = `/uploads/amc/${examId}/${path.basename(vp.pdfPath)}`;
        examVersion.paperEngine = 'amc';
        examVersion.generatedAt = new Date();
        examVersion.generationErrors = vp.errors || [];
        await examVersion.save();

        versionResults.push({
          versionCode: vCode,
          pdfUrl: examVersion.pdfUrl,
          status: vp.valid !== false ? 'ready' : 'failed',
          errors: vp.errors,
        });
      } else {
        versionResults.push({
          versionCode: vCode,
          status: 'failed',
          errors: ['ExamVersion record not found'],
        });
      }
    }

    return {
      success: result.errors.length === 0,
      engine: 'amc',
      fallback: false,
      versions: versionResults,
      totalCompilationTime: result.compilationTime,
    };
  }

  /**
   * Check if AMC environment is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      const check = await amcRunner.validateEnvironment();
      return check.isValid;
    } catch {
      return false;
    }
  }
}

module.exports = new AmcService();
