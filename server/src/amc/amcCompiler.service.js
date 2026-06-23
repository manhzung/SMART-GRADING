/**
 * AMC Compiler Service
 * Wrapper quan ly full compile cycle
 */

const path = require('path');
const fs = require('fs');
const amcRunner = require('./amcRunner.service');
const amcOutputParser = require('./amcOutputParser');
const amcValidator = require('./amcValidator');
const { generateAmcSource } = require('./amcSourceGenerator');

class AmcCompilerService {
  /**
   * Full compile cycle for an exam
   * @param {Object} options
   * @returns {Promise<CompilationResult>}
   */
  async compile(options) {
    const {
      examId,
      examData,
      numVersions,
      outputDir,
      timeoutSeconds = 120,
    } = options;

    // Ensure output dir exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const projectDir = amcRunner.getProjectDir(examId);
    const startTime = Date.now();

    try {
      // Step 1: Generate LaTeX source
      const texSource = generateAmcSource({
        exam: {
          title: examData.title,
          subjectName: examData.subjectName,
          className: examData.className || '',
          examDate: examData.examDate,
          duration: examData.duration,
          totalScore: examData.totalScore,
          numberOfVersions: numVersions,
        },
        questions: examData.questions || [],
        config: {
          paperSize: examData.printConfig?.paperSize || 'A4',
          includeAnswerSheet: examData.printConfig?.includeAnswerSheet !== false,
          schoolHeader: examData.schoolHeader || '',
          shuffleQuestions: examData.shuffleConfig?.shuffleQuestions !== false,
          shuffleOptions: examData.shuffleConfig?.shuffleOptions !== false,
        },
      });

      // Step 2: Create WSL2 project
      await amcRunner.createProject(projectDir, texSource);

      // Step 3: Backend scan
      await amcRunner.backendScan(projectDir);

      // Step 4: Compile versions
      const compileResult = await amcRunner.compileVersions(
        projectDir,
        numVersions,
        timeoutSeconds
      );

      // Step 5: Export PDFs
      const pdfPaths = await amcRunner.exportPdfs(projectDir, outputDir, numVersions);

      // Step 6: Parse output
      const parseResult = amcOutputParser.parse(
        compileResult.output || '',
        '',
        pdfPaths,
        numVersions
      );
      parseResult.compilationTime = Date.now() - startTime;

      // Step 7: Validate PDFs
      if (pdfPaths.length > 0) {
        const minPages = Math.max(1, Math.ceil((examData.questions || []).length / 10));
        const validationResults = await amcValidator.validateAll(pdfPaths, {
          minPages,
          maxPages: 20,
        });

        parseResult.versionPdfs.forEach((vp, i) => {
          if (validationResults[i]) {
            vp.pageCount = validationResults[i].pageCount;
            vp.valid = validationResults[i].valid;
            if (validationResults[i].errors.length > 0) {
              vp.errors = validationResults[i].errors;
            }
          }
        });
      }

      return parseResult;

    } finally {
      // Cleanup WSL project dir (keep PDFs)
      try {
        await amcRunner.cleanup(projectDir);
      } catch (err) {
        console.warn(`AMC cleanup failed: ${err.message}`);
      }
    }
  }
}

module.exports = new AmcCompilerService();
