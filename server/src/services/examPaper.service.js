/**
 * Exam Paper Service
 *
 * Orchestrates the full AMC-based exam paper generation pipeline:
 *
 * Flow:
 *   1. Load exam data from DB
 *   2. Load all ExamVersion records (created by generateVersions)
 *      → Each version stores answerKey (Map<position, optionLetter>)
 *      → This is the AUTHORITATIVE answer key for grading
 *   3. Compile exam PDFs via AMC (pdflatex through WSL)
 *   4. Compile answer sheet PDF → generates .calage.xy (bubble coords in PDF points)
 *   5. Parse .calage.xy → scale to 300 DPI px
 *   6. buildTemplate() → OMRTemplate.templateJson
 *      → Contains per-bubble {x,y,w,h} coords + answerKey + questionScores
 *      → This is the SINGLE SOURCE OF TRUTH for mobile OMR scanning
 *   7. Save templateJson to OMRTemplate
 *   8. Upload PDFs to Cloudinary
 *
 * Key distinction:
 *   - ExamVersion.answerKey → used by backend to grade legacy submissions
 *   - OMRTemplate.templateJson → used by mobile engine_v2 for AMC exam scanning
 *
 * After this service runs:
 *   - GET /exams/:id/template → returns OMRTemplate.templateJson for mobile
 *   - Mobile scans → engine_v2 grades using templateJson → POST /submissions
 *   - Backend stores pre-graded answers (no python bridge needed for AMC)
 */

const path = require('path');
const fs = require('fs');
const {
  generateAmcSourceForVersion,
} = require('../amc/amcSourceGenerator');
const { generateAnswerSheetTex } = require('../amc/amcAnswerSheetTexGenerator');
const { readAndParseCalage } = require('../amc/amcCalageParser');
const { buildTemplate } = require('../amc/templateBuilder');
const { generateAnswerKey } = require('../amc/answerSheetGenerator');
const amcRunner = require('../amc/amcRunner.service');
const cloudinaryService = require('./cloudinary.service');
const { buildExamFolder } = require('../utils/cloudinary.util');
const { Exam, ExamVersion, OMRTemplate } = require('../models');

class ExamPaperService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../../uploads/amc');
  }

  /**
   * Main entry point: generate all exam papers for all versions in DB
   * @param {string} examId
   * @param {Object} options - { forceRegenerate: boolean }
   * @returns {Promise<Object>} Result with versionPdfs, answerSheetUrl, errors
   */
  async generateAllPapers(examId, options = {}) {
    const { forceRegenerate = false } = options;

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

    // 2. Load existing ExamVersion records from DB
    const versions = await ExamVersion.find({ examId: exam._id })
      .sort({ versionCode: 1 });

    if (versions.length === 0) {
      throw new Error('No exam versions found. Please generate versions first.');
    }

    // 2b. Mark exam as using AMC engine (done on first compile)
    await Exam.findByIdAndUpdate(examId, { paperEngine: 'amc' });

    // 3. Compile all version PDFs via AMC (skip if exists and not force)
    const versionPdfs = await this._compileVersions(exam, versions, { forceRegenerate });

    // 4. Compile answer sheet PDF via AMC (generates PDF + .calage.xy)
    const answerSheet = await this._compileAnswerSheetProject(exam, versions, { forceRegenerate });

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
   * Compile all exam version PDFs using AMC
   * Each version has its own shuffled content from DB
   */
  async _compileVersions(exam, versions, options = {}) {
    const { forceRegenerate = false } = options;
    const examId = exam._id.toString();
    const outputDir = path.join(this.uploadsDir, examId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const results = [];
    // Timeout per version: 5 minutes base + 30s per version (for many versions)
    const perVersionTimeout = Math.min(300000 + versions.length * 30000, 600000);

    for (let i = 0; i < versions.length; i++) {
      const v = versions[i];
      const versionCode = v.versionCode;
      const pdfPath = path.join(outputDir, `sujet-${versionCode}.pdf`);

      // Skip if already compiled (unless forceRegenerate)
      if (!forceRegenerate && fs.existsSync(pdfPath)) {
        console.log(`[ExamPaper] Skip v${versionCode}: already exists`);
        results.push({
          versionCode,
          pdfPath,
          error: null,
          skipped: true,
        });
        continue;
      }

      // Remove old files if forceRegenerate
      if (forceRegenerate) {
        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
      }

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

      // Generate tex for THIS version (sujet - student exam)
      const texSource = generateAmcSourceForVersion({
        exam: {
          title: exam.title,
          subjectName: exam.subjectName,
          className: exam.primaryClassId?.name || '',
          examDate: exam.examDate,
          duration: exam.duration,
          totalScore: exam.totalScore,
          versionCode,
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
        const prepareResult = await amcRunner.amcPrepare(projectDir, perVersionTimeout);
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

        // Copy corrige.pdf (answer key) if available
        let corrigePdfPath = null;
        if (prepareResult.corrigePdf) {
          const corrigeTargetName = `corrige-${versionCode}.pdf`;
          const corrigeWinPath = path.join(outputDir, corrigeTargetName);
          const corrigeWslPath = amcRunner._toWslPath(corrigeWinPath);
          await amcRunner.wslExec(`cp '${prepareResult.corrigePdf}' '${corrigeWslPath}'`);
          corrigePdfPath = corrigeWinPath;
        }

        // Note: calage.xy is generated by answer-sheet compilation, not here
        // Answer sheet uses _compileAnswerSheetProject which generates calage.xy once

        // Cleanup WSL project
        await amcRunner.cleanup(projectDir);

        results.push({
          versionCode,
          pdfPath: winTargetPath,
          pdfUrl: `/uploads/amc/${examId}/${targetName}`,
          corrigePdfPath,
          corrigePdfUrl: corrigePdfPath ? `/uploads/amc/${examId}/corrige-${versionCode}.pdf` : null,
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
   * Compile answer sheet via AMC: generates PDF + .calage.xy (bubble coordinates)
   * The answer sheet PDF is shared by all versions (101, 102, 103).
   */
  async _compileAnswerSheetProject(exam, versions, options = {}) {
    const { forceRegenerate = false } = options;
    const examId = exam._id.toString();
    const outputDir = path.join(this.uploadsDir, examId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const pdfDst = path.join(outputDir, 'answer-sheet.pdf');
    const calageDst = path.join(outputDir, 'calage.xy');

    // Skip if already compiled (unless forceRegenerate)
    if (!forceRegenerate && fs.existsSync(pdfDst)) {
      console.log(`[ExamPaper] Skip answer sheet: already exists`);
      return {
        answerSheetPdfPath: pdfDst,
        calagePath: calageDst,
        skipped: true,
      };
    }

    // 1. Generate answer-sheet.tex using AMC syntax
    const texSource = generateAnswerSheetTex(
      {
        title: exam.title,
        subjectName: exam.subjectName,
        className: exam.primaryClassId?.name || '',
        examDate: exam.examDate,
        duration: exam.duration,
        totalScore: exam.totalScore,
        schoolHeader: exam.schoolHeader || '',
      },
      exam.questionIds.length
    );

    // 2. Create WSL project and compile
    const projectDir = `/home/amc/amc-projects/${examId}-answersheet`;

    await amcRunner.createProject(projectDir, texSource);

    // Run AMC prepare (2 pdflatex passes → PDF + .calage.xy)
    await amcRunner.amcPrepare(projectDir);

    // 3. Export files from WSL to Windows output dir
    const exported = {};

    // Answer sheet uses its own calage.xy generation (not from CATALOG phase)
    try {
      await this._compileAnswerSheetWithCalage(projectDir, outputDir, texSource);
      exported.pdfPath = path.join(outputDir, 'answer-sheet.pdf');
      exported.calagePath = path.join(outputDir, 'calage.xy');
    } catch (err) {
      console.error(`[ExamPaper] Answer sheet compile failed: ${err.message}`);
      // Fallback: try to find any generated PDF
      const fallbackPdf = path.join(outputDir, 'answer-sheet.pdf');
      exported.pdfPath = fs.existsSync(fallbackPdf) ? fallbackPdf : null;
      exported.calagePath = fs.existsSync(path.join(outputDir, 'calage.xy')) 
        ? path.join(outputDir, 'calage.xy') 
        : null;
    }

    // 4. Build csvData from ExamVersion.questions (authoritative answer key)
    // AMC's CSV is empty for answer sheets (AMCadd doesn't record answers).
    // We use the first version's questions as the canonical answer key.
    const csvData = { answers: {}, meta: { totalQuestions: 0 } };
    if (versions && versions.length > 0) {
      const firstVersion = versions[0];
      const questions = firstVersion.questions || [];
      csvData.meta.totalQuestions = questions.length;
      questions.forEach((vq, idx) => {
        const qNum = idx + 1;
        const correctOpt = (vq.shuffledOptions || []).find(o => o.isCorrect);
        csvData.answers[qNum] = {
          questionNum: qNum,
          correctOptions: correctOpt ? [correctOpt.id] : [],
          originalId: `q${qNum}`,
        };
      });
    }

    // 5. Parse .calage.xy → raw bubble data
    let calageData = null;
    if (exported.calagePath) {
      try {
        calageData = await readAndParseCalage(exported.calagePath);
      } catch (err) {
        console.warn(`[ExamPaper] Failed to parse calage.xy: ${err.message}`);
      }
    }

    // 6. Build template.json from calage + CSV
    const templateJson = buildTemplate({
      calageData,
      csvData,
      exam: {
        _id: exam._id,
        title: exam.title,
        totalScore: exam.totalScore,
      },
      options: {
        scanDpi: 300,
        paperSize: 'A4',
        studentIdDigits: 7,
        versionDigits: 2,
      },
    });

    // 7. Update existing OMRTemplate for this exam OR create new if none exists
    //    Re-using the same template avoids orphaning previous template data
    //    Mobile engine_v2 uses templateJson to:
    //      1. Know exact bubble coordinates: templateJson.answers[q1][A] = {x,y,w,h}
    //      2. Know correct answers:      templateJson.answerKey[q1] = "A"
    //      3. Know per-question scores:   templateJson.questionScores[q1] = 0.5
    
    // Check if exam already has an AMC template - update it instead of creating new
    let existingTemplate = null;
    if (exam.omrTemplateId) {
      existingTemplate = await OMRTemplate.findById(exam.omrTemplateId);
      // Only reuse if it's an auto-generated AMC template
      if (existingTemplate && existingTemplate.code?.startsWith('AMC_')) {
        existingTemplate.templateJson = templateJson;
        existingTemplate.name = `Template - ${exam.title} (${exam._id})`;
        existingTemplate.tags = ['amc', 'auto-generated'];
        await existingTemplate.save();
        console.log(`[ExamPaper] Updated existing AMC template: ${existingTemplate._id}`);
      } else {
        existingTemplate = null;
      }
    }
    
    // Create new template only if no suitable existing template
    if (!existingTemplate) {
      const templateCode = `AMC_${exam._id}_${Date.now()}`;
      existingTemplate = await OMRTemplate.create({
        code: templateCode,
        name: `Template - ${exam.title} (${exam._id})`,
        templateJson: templateJson,
        tags: ['amc', 'auto-generated'],
      });
      // Update exam with the new template ID
      await Exam.findByIdAndUpdate(exam._id, {
        omrTemplateId: existingTemplate._id,
      });
      console.log(`[ExamPaper] Created new AMC template: ${existingTemplate._id}`);
    }

    // 8. Cleanup WSL project
    await amcRunner.cleanup(projectDir);

    return {
      answerSheetPdfPath: exported.pdfPath,
      calagePath: exported.calagePath,
    };
  }

  /**
   * Upload all PDFs (4 version PDFs + 4 corrige PDFs + 1 answer sheet) to Cloudinary
   */
  async _uploadAllToCloudinary(examId, versionPdfs, answerSheet, versions) {
    const folder = buildExamFolder(examId);

    const uploadedVersions = [];

    // Upload 4 version PDFs and corrige PDFs
    for (let i = 0; i < versionPdfs.length; i++) {
      const vp = versionPdfs[i];
      if (vp.error || !vp.pdfPath) continue;

      // If skipped (already exists), fetch existing URLs from DB
      if (vp.skipped) {
        const existingVersion = await ExamVersion.findOne({ examId, versionCode: vp.versionCode })
          .select('pdfUrl corrigePdfUrl answerSheetPdfUrl');
        uploadedVersions.push({
          versionCode: vp.versionCode,
          pdfUrl: existingVersion?.pdfUrl || null,
          corrigePdfUrl: existingVersion?.corrigePdfUrl || null,
          skipped: true,
        });
        continue;
      }

      // Upload sujet PDF
      const publicId = `v${vp.versionCode}-sujet`;
      const buffer = fs.readFileSync(vp.pdfPath);

      const result = await cloudinaryService.uploadPdf(buffer, {
        folder,
        publicId,
      });

      // Upload corrige PDF if available
      let corrigeUrl = null;
      if (vp.corrigePdfPath && fs.existsSync(vp.corrigePdfPath)) {
        const corrigeBuffer = fs.readFileSync(vp.corrigePdfPath);
        const corrigeResult = await cloudinaryService.uploadPdf(corrigeBuffer, {
          folder,
          publicId: `v${vp.versionCode}-corrige`,
        });
        corrigeUrl = corrigeResult.secureUrl;
      }

      // Update ExamVersion record with cloudinary URLs
      await ExamVersion.updateOne(
        { examId, versionCode: vp.versionCode },
        {
          $set: {
            pdfUrl: result.secureUrl,
            corrigePdfUrl: corrigeUrl,
            generatedAt: new Date(),
          },
        }
      );

      uploadedVersions.push({
        versionCode: vp.versionCode,
        pdfUrl: result.secureUrl,
        corrigePdfUrl: corrigeUrl,
        publicId: result.publicId,
      });
    }

    // Upload answer sheet (1 file)
    let answerResult = { secureUrl: null, publicId: null };

    if (answerSheet.skipped) {
      // Get existing URL from first ExamVersion
      const existingVersion = await ExamVersion.findOne({ examId })
        .select('answerSheetPdfUrl')
        .sort({ versionCode: 1 });
      answerResult = { secureUrl: existingVersion?.answerSheetPdfUrl || null, publicId: null };
      console.log(`[ExamPaper] Answer sheet skipped, using existing URL: ${answerResult.secureUrl}`);
    } else {
      const answerSheetPublicId = 'answer-sheet';
      const answerSheetBuffer = answerSheet.answerSheetPdfPath && fs.existsSync(answerSheet.answerSheetPdfPath)
        ? fs.readFileSync(answerSheet.answerSheetPdfPath)
        : null;

      console.log(`[ExamPaper] Answer sheet buffer: ${answerSheetBuffer ? 'exists (' + answerSheetBuffer.length + ' bytes)' : 'null'}`);

      answerResult = answerSheetBuffer
        ? await cloudinaryService.uploadPdf(answerSheetBuffer, {
            folder,
            publicId: answerSheetPublicId,
          })
        : { secureUrl: null, publicId: null };

      console.log(`[ExamPaper] Answer sheet upload result:`, answerResult);
    }

    // Update all ExamVersion records with the shared answer sheet URL (NOT templateJson)
    await ExamVersion.updateMany(
      { examId },
      {
        $set: {
          answerSheetPdfUrl: answerResult.secureUrl,
        },
      }
    );

    return {
      versions: uploadedVersions,
      answerSheet: {
        pdfUrl: answerResult.secureUrl,
        publicId: answerResult.publicId,
      },
    };
  }

  /**
   * Compile answer sheet with bubbles and generate .calage.xy
   * Uses AMC's native prepare command which properly generates all option letters
   */
  async _compileAnswerSheetWithCalage(projectDir, outputDir, texSource) {
    // 1. Create project with the answer sheet tex
    await amcRunner.createProject(projectDir, texSource);

    // 2. Run AMC prepare with calibration mode
    // This generates: sujet.pdf (exam), corrige.pdf (answer key), calage.xy (bubble coords)
    const texFile = `${projectDir}/exam.tex`;
    const calageResult = await amcRunner.amcCalibrationPrepare(projectDir, texFile, 300000);

    console.log('[ExamPaper] AMC calibration prepare result:', {
      success: calageResult.success,
      hasCalage: !!calageResult.calagePath,
      hasSujet: !!calageResult.sujetPdf,
      hasCorrige: !!calageResult.corrigePdf,
    });

    // 3. Copy calage.xy to output directory
    const wslXyDst = amcRunner._toWslPath(path.join(outputDir, 'calage.xy'));

    if (calageResult.calagePath) {
      // AMC generated calage.xy directly
      await amcRunner.wslExec(
        `cp '${calageResult.calagePath}' '${wslXyDst}' && echo 'XY_COPY_OK'`
      );
      console.log('[ExamPaper] .calage.xy copied from AMC calibration mode');
    } else {
      // Fall back to manual parsing
      console.warn('[ExamPaper] AMC calibration failed, falling back to manual .xy generation');
      const calageFile = `${projectDir}/.calage.xy`;
      await amcRunner._generateCalageXy(projectDir, 'amc-compiled', calageFile);
      await amcRunner.wslExec(
        `[ -f '${calageFile}' ] && cp '${calageFile}' '${wslXyDst}' && echo 'XY_COPY_OK' || echo 'XY_FALLBACK_FAIL'`
      );
    }

    // 4. Copy PDF to output directory (use sujet.pdf as answer sheet)
    const pdfDst = path.join(outputDir, 'answer-sheet.pdf');
    const wslPdfDst = amcRunner._toWslPath(pdfDst);

    if (calageResult.sujetPdf) {
      await amcRunner.wslExec(
        `cp '${calageResult.sujetPdf}' '${wslPdfDst}' && echo 'PDF_COPY_OK'`
      );
      console.log('[ExamPaper] Answer sheet PDF copied');
    } else {
      // Fall back: try to find any generated PDF
      const fallbackPdf = `${projectDir}/amc-compiled.pdf`;
      await amcRunner.wslExec(
        `[ -f '${fallbackPdf}' ] && cp '${fallbackPdf}' '${wslPdfDst}' && echo 'PDF_COPY_OK' || echo 'PDF_NOT_FOUND'`
      );
    }

    // 5. Cleanup WSL project
    await amcRunner.cleanup(projectDir);
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
