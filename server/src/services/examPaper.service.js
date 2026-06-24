/**
 * Exam Paper Service
 *
 * Orchestrate flow: tao 4 version de thi (A,B,C,D) + 1 answer sheet
 * Sau do upload len Cloudinary de user tai ve in.
 *
 * Flow:
 *   1. Lay exam data tu DB
 *   2. Tao 4 ExamVersion records voi shuffle (A=101, B=102, C=103, D=104)
 *   3. Generate 4 file tex (moi version 1 file, noi dung da shuffle)
 *   4. AMC compile tung file -> 4 PDF (sujet-101.pdf, sujet-102.pdf, ...)
 *   5. Generate 1 answer sheet PDF (chung cho ca 4 version)
 *   6. Upload 5 files len Cloudinary
 *   7. Update ExamVersion voi pdfUrl va answerSheetPdfUrl
 */

const path = require('path');
const fs = require('fs');
const {
  generateAmcSourceForVersion,
  shuffleQuestionsForVersion,
} = require('../amc/amcSourceGenerator');
const { generateAnswerSheet, generateAnswerKey } = require('../amc/answerSheetGenerator');
const amcRunner = require('../amc/amcRunner.service');
const amcCompiler = require('../amc/amcCompiler.service');
const cloudinaryService = require('./cloudinary.service');
const { buildExamFolder } = require('../utils/cloudinary.util');
const { Exam, ExamVersion } = require('../models');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/amc');
const VERSION_CODES = ['101', '102', '103', '104']; // 4 fixed versions

class ExamPaperService {
  constructor() {
    this.uploadsDir = UPLOADS_DIR;
  }

  /**
   * Main entry point: generate all exam papers (4 versions + 1 answer sheet)
   * @param {string} examId
   * @returns {Promise<Object>} Result with versionPdfs, answerSheetUrl, errors
   */
  async generateAllPapers(examId) {
    // 1. Load exam with questions
    const exam = await Exam.findById(examId)
      .populate('primaryClassId', 'name')
      .populate('questionIds');

    if (!exam) {
      throw new Error(`Exam ${examId} not found`);
    }
    if (!exam.questionIds || exam.questionIds.length === 0) {
      throw new Error('Exam must have at least one question');
    }

    // 2. Create 4 ExamVersion records with shuffled content
    const versions = await this._createVersionRecords(exam);

    // 3. Compile 4 PDF files (one per version) via AMC
    const versionPdfs = await this._compileVersions(exam, versions);

    // 4. Generate 1 answer sheet PDF
    const answerSheet = await this._generateAnswerSheet(exam, VERSION_CODES);

    // 5. Upload to Cloudinary
    const uploadResults = await this._uploadAllToCloudinary(
      examId,
      versionPdfs,
      answerSheet,
      versions
    );

    return {
      success: true,
      examId,
      versions: uploadResults.versions,
      answerSheet: uploadResults.answerSheet,
    };
  }

  /**
   * Create 4 ExamVersion records in DB with shuffled content
   * (Reuses existing logic, but with deterministic shuffle keyed by versionCode)
   */
  async _createVersionRecords(exam) {
    const versions = [];

    for (let i = 0; i < VERSION_CODES.length; i++) {
      const versionCode = VERSION_CODES[i];

      // Check if version already exists
      let examVersion = await ExamVersion.findOne({
        examId: exam._id,
        versionCode,
      });

      // Shuffle questions/options deterministically by versionCode
      const shuffled = shuffleQuestionsForVersion(
        exam.questionIds,
        versionCode,
        {
          shuffleQuestions: exam.shuffleConfig?.shuffleQuestions !== false,
          shuffleOptions: exam.shuffleConfig?.shuffleOptions !== false,
        }
      );

      // Build examVersion.questions with positions matching the shuffled order
      const questionsWithPositions = shuffled.map((sq, idx) => {
        const origQ = exam.questionIds[sq.originalIndex];
        return {
          position: idx + 1,
          questionId: origQ._id,
          originalPosition: sq.originalIndex + 1,
          shuffledOptions: sq.options.map(opt => ({
            id: opt.id,
            content: opt.content,
            isCorrect: opt.isCorrect,
          })),
        };
      });

      // Build answer key
      const answerKey = new Map();
      questionsWithPositions.forEach((q, idx) => {
        const correctOption = q.shuffledOptions.find(o => o.isCorrect);
        answerKey.set((idx + 1).toString(), correctOption?.id || null);
      });

      if (examVersion) {
        // Update existing
        examVersion.questions = questionsWithPositions;
        examVersion.answerKey = answerKey;
        examVersion.numberOfQuestions = questionsWithPositions.length;
        examVersion.generatedAt = new Date();
        await examVersion.save();
      } else {
        // Create new
        examVersion = new ExamVersion({
          examId: exam._id,
          versionCode,
          numberOfQuestions: questionsWithPositions.length,
          questions: questionsWithPositions,
          answerKey,
          paperEngine: 'amc',
        });
        await examVersion.save();
      }

      versions.push(examVersion);
    }

    return versions;
  }

  /**
   * Compile 4 separate PDF files using AMC
   * Each version has its own shuffled content
   */
  async _compileVersions(exam, versions) {
    const examId = exam._id.toString();
    const outputDir = path.join(this.uploadsDir, examId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const results = [];

    for (let i = 0; i < versions.length; i++) {
      const v = versions[i];
      const versionCode = v.versionCode;

      // Map shuffledQuestions back to format expected by generator
      // We need to fetch original question content by ID
      const questionsForTex = await Promise.all(
        v.questions.map(async (vq) => {
          const origQ = exam.questionIds.find(
            q => q._id.toString() === vq.questionId.toString()
          );
          return {
            content: origQ.content,
            options: vq.shuffledOptions.map(o => ({
              content: o.content,
              isCorrect: o.isCorrect,
            })),
          };
        })
      );

      // Generate tex for THIS version
      const texSource = generateAmcSourceForVersion({
        exam: {
          title: exam.title,
          subjectName: exam.subjectName,
          className: exam.primaryClassId?.name || '',
          examDate: exam.examDate,
          duration: exam.duration,
          totalScore: exam.totalScore,
          versionCode, // NEW: include version code on exam
        },
        questions: questionsForTex,
        config: {
          schoolHeader: exam.schoolHeader || '',
        },
      });

      // Write tex to a versioned project dir in WSL
      const projectDir = `/home/amc/amc-projects/${examId}-v${versionCode}`;

      try {
        // Use amcRunner to create project + compile
        await amcRunner.createProject(projectDir, texSource);
        const prepareResult = await amcRunner.amcPrepare(projectDir);
        // prepareResult.sujetPdf is the absolute WSL path of generated subject PDF
        const sujetPdf = prepareResult.sujetPdf;

        if (!sujetPdf) {
          throw new Error(`Subject PDF not generated for version ${versionCode}`);
        }

        // Copy sujet.pdf to Windows output dir
        const targetName = `sujet-${versionCode}.pdf`;
        const winTargetPath = path.join(outputDir, targetName);
        const wslTargetPath = amcRunner._toWslPath(winTargetPath);

        await amcRunner.wslExec(`cp '${sujetPdf}' '${wslTargetPath}'`);

        // Also copy calage.xy (bubble coordinates for OMR) and corrige.pdf
        const auxFiles = ['.calage.xy', '.corrige.pdf'];
        for (const auxName of auxFiles) {
          const wslSrc = `${projectDir}/${auxName}`;
          const winDst = path.join(outputDir, `${auxName.replace('.', '')}-${versionCode}`);
          const wslDst = amcRunner._toWslPath(winDst);
          await amcRunner.wslExec(`cp '${wslSrc}' '${wslDst}' 2>/dev/null || true`);
        }

        // Cleanup WSL project
        await amcRunner.cleanup(projectDir);

        results.push({
          versionCode,
          pdfPath: winTargetPath,
          pdfUrl: `/uploads/amc/${examId}/${targetName}`,
        });
      } catch (err) {
        console.error(`Failed to compile v${versionCode}:`, err.message);
        results.push({
          versionCode,
          pdfPath: null,
          pdfUrl: null,
          error: err.message,
        });
      }
    }

    return results;
  }

  /**
   * Generate the single answer sheet PDF (shared by all 4 versions)
   */
  async _generateAnswerSheet(exam, versionCodes) {
    return generateAnswerSheet({
      exam: {
        _id: exam._id,
        title: exam.title,
        subjectName: exam.subjectName,
        className: exam.primaryClassId?.name || '',
        examDate: exam.examDate,
        duration: exam.duration,
        totalScore: exam.totalScore,
        schoolHeader: exam.schoolHeader || '',
      },
      numQuestions: exam.questionIds.length,
      versionCodes,
    });
  }

  /**
   * Upload all PDFs (4 version PDFs + 1 answer sheet) to Cloudinary
   */
  async _uploadAllToCloudinary(examId, versionPdfs, answerSheet, versions) {
    const folder = buildExamFolder(examId);
    const safeExamId = String(examId).replace(/[^a-zA-Z0-9_-]/g, '');

    const uploadedVersions = [];

    // Upload 4 version PDFs
    for (let i = 0; i < versionPdfs.length; i++) {
      const vp = versionPdfs[i];
      if (vp.error || !vp.pdfPath) continue;

      const publicId = `v${vp.versionCode}-sujet`;
      const buffer = fs.readFileSync(vp.pdfPath);

      const result = await cloudinaryService.uploadPdf(buffer, {
        folder,
        publicId,
      });

      // Update ExamVersion record with cloudinary URL
      await ExamVersion.updateOne(
        { examId, versionCode: vp.versionCode },
        {
          $set: {
            pdfUrl: result.secureUrl,
            generatedAt: new Date(),
          },
        }
      );

      uploadedVersions.push({
        versionCode: vp.versionCode,
        pdfUrl: result.secureUrl,
        publicId: result.publicId,
      });
    }

    // Upload answer sheet (1 file)
    const answerSheetPublicId = 'answer-sheet';
    const answerResult = await cloudinaryService.uploadPdf(
      answerSheet.pdfBuffer,
      {
        folder,
        publicId: answerSheetPublicId,
      }
    );

    // Update all ExamVersion records with the shared answer sheet URL
    await ExamVersion.updateMany(
      { examId },
      {
        $set: {
          answerSheetPdfUrl: answerResult.secureUrl,
          templateJson: answerSheet.templateJson,
        },
      }
    );

    return {
      versions: uploadedVersions,
      answerSheet: {
        pdfUrl: answerResult.secureUrl,
        publicId: answerResult.publicId,
        templateJson: answerSheet.templateJson,
      },
    };
  }

  /**
   * Generate answer key mapping for a specific version (for teacher's reference)
   */
  async getAnswerKeyForVersion(examId, versionCode) {
    const version = await ExamVersion.findOne({ examId, versionCode })
      .populate('questions.questionId', 'content options');

    if (!version) {
      throw new Error(`Version ${versionCode} not found for exam ${examId}`);
    }

    return generateAnswerKey(versionCode, version.toObject());
  }
}

module.exports = new ExamPaperService();
