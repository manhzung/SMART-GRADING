/**
 * AMC Runner Service
 *
 * SUPPORTS BOTH WORKFLOWS:
 * 1. Legacy: Uses `auto-multiple-choice prepare` perl script
 * 2. Direct: Uses pdflatex + xvfb-run directly (bypasses AMC perl)
 *
 * The direct workflow is the PRIMARY path because AMC perl script has a bug:
 * it runs pdflatex as root which creates files invisible to normal users on WSL2.
 * Using pdflatex directly (spawned as the current user) avoids this issue.
 *
 * Key findings from debugging:
 * - AMC perl -> root-owned files -> invisible on WSL2 metadata fs
 * - Direct pdflatex -> user-owned files -> visible immediately
 * - Must use absolute paths (/usr/bin/pdflatex) in non-login shells
 * - Must build command as single string (not array.join) to preserve args
 */

const { spawn } = require('child_process');
const path = require('path');

const WSL_DISTRO = process.env.WSL_DISTRO || 'Ubuntu-24.04';
const AMC_PROJECTS_DIR = '/home/amc/amc-projects';

// Absolute paths for all AMC tools (avoid PATH issues in non-login shells)
const AMC_TOOLS = {
  xvfb: '/usr/bin/xvfb-run',
  pdflatex: '/usr/bin/pdflatex',
  xelatex: '/usr/bin/xelatex',
  gs: '/usr/bin/gs',
  amc: '/usr/bin/auto-multiple-choice',
};

// Import coordinate calculator
const { generateCalageXyFromLayout } = require('./amcCoordinateCalculator');
const { generateCalageXyFromTex, parseTexLayout } = require('./amcTexLayoutParser');

class AmcRunnerService {
  constructor() {
    this.env = { WSL_DISTRO, AMC_PROJECTS_DIR };
  }

  /**
   * Spawn a WSL command
   * @returns {Promise<{exitCode: number, stdout: string, stderr: string}>}
   */
  wslExec(cmd, options = {}) {
    return new Promise((resolve, reject) => {
      const args = ['-d', WSL_DISTRO, '--', 'bash', '-c', cmd];
      const proc = spawn('wsl', args, {
        windowsHide: true,
        maxBuffer: 50 * 1024 * 1024,
        ...options,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('error', (err) => {
        reject(new Error(`WSL spawn error: ${err.message}`));
      });

      proc.on('close', (code) => {
        resolve({ exitCode: code, stdout, stderr });
      });
    });
  }

  /**
   * Spawn with timeout and large buffer
   */
  wslExecWithTimeout(cmd, timeoutMs = 120000) {
    return new Promise((resolve, reject) => {
      const proc = spawn('wsl', ['-d', WSL_DISTRO, '--', 'bash', '-c', cmd], {
        windowsHide: true,
        maxBuffer: 50 * 1024 * 1024,
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

      const timer = setTimeout(() => {
        killed = true;
        proc.kill('SIGTERM');
        setTimeout(() => { if (!proc.killed) proc.kill('SIGKILL'); }, 5000);
      }, timeoutMs);

      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve({ exitCode: killed ? -1 : code, stdout, stderr, killed });
      });
    });
  }

  /**
   * Validate AMC environment
   */
  async validateEnvironment() {
    const tools = { texlive: false, amc: false, ghostscript: false, xvfb: false };

    const checks = [
      { cmd: `${AMC_TOOLS.pdflatex} --version 2>&1 | head -1`, key: 'texlive' },
      { cmd: `${AMC_TOOLS.gs} --version 2>&1 | head -1`, key: 'ghostscript' },
      { cmd: `${AMC_TOOLS.xvfb} --help 2>&1 | head -1`, key: 'xvfb' },
    ];

    for (const { cmd, key } of checks) {
      try {
        const result = await this.wslExec(cmd);
        tools[key] = result.exitCode === 0 && result.stdout.trim().length > 0;
      } catch {
        tools[key] = false;
      }
    }

    return {
      isValid: tools.texlive && tools.ghostscript && tools.xvfb,
      tools,
      wslDistro: WSL_DISTRO,
    };
  }

  _toWslPath(winPath) {
    return winPath
      .replace(/\\/g, '/')
      .replace(/^([A-Za-z]):/, (m) => `/mnt/${m[0].toLowerCase()}`);
  }

  _validateProjectPath(projectDir) {
    const normalized = path.normalize(projectDir).replace(/\\/g, '/');
    const baseDir = AMC_PROJECTS_DIR.replace(/\\/g, '/');
    if (!normalized.startsWith(baseDir)) {
      throw new Error(`Invalid project path: ${projectDir} is outside AMC projects directory`);
    }
    return normalized;
  }

  getProjectDir(examId) {
    return `${AMC_PROJECTS_DIR}/${examId}`;
  }

  /**
   * Create WSL2 project directory and write LaTeX source
   * Uses base64 encoding to avoid shell escaping issues
   */
  async createProject(projectDir, texSource) {
    this._validateProjectPath(projectDir);

    // Use base64 to avoid all shell escaping issues
    const base64Source = Buffer.from(texSource, 'utf8').toString('base64');

    const cmd = [
      `mkdir -p '${projectDir}'`,
      `echo '${base64Source}' | base64 -d > '${projectDir}/exam.tex'`
    ].join(' && ');

    const result = await this.wslExec(cmd);
    if (result.exitCode !== 0) {
      throw new Error(`Failed to write LaTeX source: ${result.stderr}`);
    }

    const verify = await this.wslExec(`ls -la '${projectDir}/exam.tex'`);
    if (verify.exitCode !== 0) {
      throw new Error(`LaTeX file verification failed: ${verify.stderr}`);
    }
  }

  /**
   * Generate .calage.xy using AMC's native calibration mode
   * Uses `auto-multiple-choice prepare --mode s --out-calage` which properly
   * generates all option letters (A,B,C,D) in the .xy file
   *
   * @param {string} projectDir - WSL path to project
   * @param {string} texFile - WSL path to .tex file
   * @param {number} timeoutMs - Timeout
   * @returns {Promise<{calagePath, sujetPdf, corrigePdf}>}
   */
  async amcCalibrationPrepare(projectDir, texFile, timeoutMs = 300000) {
    this._validateProjectPath(projectDir);
    const texBasename = path.basename(texFile, '.tex');
    const dataDir = `${projectDir}/exam-data`;

    // Create data directory with full permissions
    await this.wslExec(
      `mkdir -p '${dataDir}' && chmod -R 777 '${dataDir}' && rm -rf '${dataDir}'/*`
    );

    console.log('[AMC Runner] Running AMC prepare with calibration mode...');

    // Use AMC's native prepare command with calibration output
    // This generates: sujet.pdf, corrige.pdf, and calage.xy
    const cmd =
      `cd '${projectDir}' && ` +
      `${AMC_TOOLS.xvfb} --server-num=99 --auto-servernum ` +
      `${AMC_TOOLS.amc} prepare ` +
      `--mode s ` +
      `--prefix ./ ` +
      `--out-sujet sujet.pdf ` +
      `--out-corrige corrige.pdf ` +
      `--out-calage calage.xy ` +
      `'${texFile}' ` +
      `> amc-prepare.log 2>&1 ; ` +
      `echo "AMC_PREPARE_EXIT=$?"`;

    const result = await this.wslExecWithTimeout(cmd, timeoutMs);

    if (result.exitCode !== 0) {
      console.warn(`[AMC Runner] AMC prepare exit ${result.exitCode}`);
      console.warn(`[AMC Runner] Log excerpt: ${result.stdout.slice(-500)}`);
    }

    // Check what files were generated
    const filesCheck = await this.wslExec(
      `ls -la '${projectDir}' | grep -E '\\.xy|\\.pdf|\\.log'`
    );
    console.log(`[AMC Runner] Generated files:\n${filesCheck.stdout}`);

    // Check for calage.xy
    const xyExists = await this.wslExec(
      `[ -f '${projectDir}/calage.xy' ] && echo 'XY_EXISTS' || echo 'XY_NOT_FOUND'`
    );

    const sujetExists = await this.wslExec(
      `[ -f '${projectDir}/sujet.pdf' ] && echo 'SUJET_EXISTS' || echo 'SUJET_NOT_FOUND'`
    );

    const corrigeExists = await this.wslExec(
      `[ -f '${projectDir}/corrige.pdf' ] && echo 'CORRIGE_EXISTS' || echo 'CORRIGE_NOT_FOUND'`
    );

    return {
      success: xyExists.stdout.includes('XY_EXISTS'),
      calagePath: xyExists.stdout.includes('XY_EXISTS')
        ? `${projectDir}/calage.xy`
        : null,
      sujetPdf: sujetExists.stdout.includes('SUJET_EXISTS')
        ? `${projectDir}/sujet.pdf`
        : null,
      corrigePdf: corrigeExists.stdout.includes('CORRIGE_EXISTS')
        ? `${projectDir}/corrige.pdf`
        : null,
      logOutput: result.stdout,
    };
  }

  /**
   * Run xelatex twice for each phase to generate SUJET, CORRIGE, and CATALOG PDFs
   * Then create .calage.xy from the CATALOG phase
   *
   * @param {string} projectDir - WSL path to project
   * @param {number} timeoutMs - Timeout for each xelatex pass (default 300s for large exams)
   * @returns {Promise<{sujetPdf, corrigePdf, catalogPdf, dataDir}>}
   */
  async amcPrepare(projectDir, timeoutMs = 300000) {
    this._validateProjectPath(projectDir);
    const texFile = `${projectDir}/exam.tex`;
    const dataDir = `${projectDir}/exam-data`;
    const texBasename = 'amc-compiled';

    // Create data directory with full permissions
    await this.wslExec(`mkdir -p '${dataDir}' && chmod 777 '${dataDir}'`);

    // For each phase, run xelatex twice (cross-ref resolution)
    // Only SUJET (exam) and CORRIGE (answer key) - CATALOG not needed (calage from answer sheet)
    const phases = [
      { name: 'SUJET', outName: 'sujet.pdf', texenv: 'sujet' },
      { name: 'CORRIGE', outName: 'corrige.pdf', texenv: 'corrige' },
    ];

    const results = {};

    for (const phase of phases) {
      console.log(`[AMC Runner] Phase ${phase.name}...`);

      // Clear data dir for this phase
      await this.wslExec(
        `mkdir -p '${dataDir}' && chmod 777 '${dataDir}' && rm -f '${dataDir}'/*`
      );

      // Run xelatex twice for cross-ref resolution
      for (let pass = 1; pass <= 2; pass++) {
        const logFile = `${projectDir}/xelatex-${phase.name.toLowerCase()}-pass${pass}.log`;
        const cmd =
          `cd '${projectDir}' && ` +
          `${AMC_TOOLS.xvfb} --server-num=99 --auto-servernum ` +
          `${AMC_TOOLS.xelatex} ` +
          `-interaction=nonstopmode -halt-on-error ` +
          `-output-directory='${projectDir}' ` +
          `-jobname='${texBasename}' ` +
          `'${texFile}' > '${logFile}' 2>&1 ; ` +
          `echo "XELATEX_EXIT=$?"`;

        const result = await this.wslExecWithTimeout(cmd, timeoutMs);
        if (result.exitCode !== 0) {
          console.warn(`[AMC Runner] ${phase.name} pass ${pass} exit ${result.exitCode}`);
        }
      }

      // Copy the generated PDF to phase-specific name
      const generatedPdf = `${projectDir}/${texBasename}.pdf`;
      const targetPdf = `${projectDir}/${phase.outName}`;

      const mvResult = await this.wslExec(
        `if [ -f '${generatedPdf}' ]; then cp '${generatedPdf}' '${targetPdf}' && echo "OK:${phase.outName}"; else echo "FAIL:${phase.outName}"; fi`
      );

      if (mvResult.stdout.includes('OK:')) {
        results[phase.name.toLowerCase() + 'Pdf'] = targetPdf;
        console.log(`[AMC Runner] ${phase.name}: OK`);
      } else {
        results[phase.name.toLowerCase() + 'Pdf'] = null;
        console.warn(`[AMC Runner] ${phase.name}: FAIL`);
      }
    }

    // .calage.xy is generated from answer sheet, not from exam versions
    return { ...results, dataDir };
  }

  /**
   * Generate .calage.xy from xelatex output
   * Tries to parse .aux file for \tracepos, falls back to coordinate calculator
   * Creates .calage.xy format for OMR template
   */
  async _generateCalageXy(projectDir, texBasename, calageFile, layoutConfig = {}) {
    const auxFile = `${projectDir}/${texBasename}.aux`;
    const logFile = `${projectDir}/xelatex-catalog-pass2.log`;

    // Read the .aux file - AMC writes \tracepos commands here during compilation
    const auxResult = await this.wslExec(`cat '${auxFile}' 2>/dev/null || echo ''`);
    const auxContent = auxResult.stdout;

    // Read log to get page dimensions
    const logResult = await this.wslExec(`cat '${logFile}' 2>/dev/null || echo ''`);
    const logContent = logResult.stdout;

    // Parse page dimensions from log
    let pageWidth = 597.50787;
    let pageHeight = 845.04684;
    const dimMatch = logContent.match(/Page dimensions \\(paper\\)=(\d+\.?\d*)pt x (\d+\.?\d*)pt/);
    if (dimMatch) {
      pageWidth = parseFloat(dimMatch[1]) || 597.50787;
      pageHeight = parseFloat(dimMatch[2]) || 845.04684;
    }

    // Read TeX source to get question IDs
    const texResult = await this.wslExec(`cat '${projectDir}/exam.tex' 2>/dev/null || echo ''`);
    const texContent = texResult.stdout;

    // Extract question IDs from TeX: \AMCcode{q1}, \AMCcodeGrid{q2}, etc.
    // IMPORTANT: Filter out 'student' and 'ver' from ID fields
    const qMatches = texContent.match(/\\AMCcode(?:Grid)?(?:Int)?\{([^}]+)\}/g) || [];
    const questionIds = [...new Set(qMatches.map(m => {
      const match = m.match(/\\AMCcode(?:Grid)?(?:Int)?\{([^}]+)\}/);
      const id = match ? match[1] : null;
      // Only include IDs starting with 'q' (actual question IDs)
      // Exclude 'student', 'ver', etc.
      return (id && id.startsWith('q')) ? id : null;
    }).filter(Boolean))];

    // Parse \tracepos from .aux file
    // Format: \tracepos{page:label}{x_sp}{y_sp}{shape}
    const traceposRegex = /\\tracepos\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}/g;
    const traceposEntries = [];
    let match;

    while ((match = traceposRegex.exec(auxContent)) !== null) {
      const [, label, xSp, ySp, shape] = match;
      // Skip position markers (corner calibration points)
      if (label.includes('position')) continue;
      traceposEntries.push({ label, xSp, ySp, shape });
    }

    // Parse \boxchar from .aux file
    const boxcharRegex = /\\boxchar\{([^}]+)\}\{([^}]*)\}/g;
    const boxcharEntries = [];
    while ((match = boxcharRegex.exec(auxContent)) !== null) {
      const [, label, char] = match;
      boxcharEntries.push({ label, char });
    }

    // Build .calage.xy content
    let calageLines;
    
    if (traceposEntries.length > 0) {
      // We have actual tracepos from .aux - use them
      calageLines = [
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
      questionIds.forEach((qId, idx) => {
        calageLines.push(`\\question{${idx + 1}{${qId}}`);
      });

      // Add page info
      calageLines.push(`\\page{0/1/60}{${pageWidth}pt}{${pageHeight}pt}{${pageWidth}pt}{${pageHeight}pt}`);

      // Add tracepos entries
      for (const entry of traceposEntries) {
        calageLines.push(`\\tracepos{${entry.label}}{${entry.xSp}}{${entry.ySp}}{${entry.shape}}`);
      }

      // Add boxchar entries
      for (const entry of boxcharEntries) {
        calageLines.push(`\\boxchar{${entry.label}}{${entry.char}}`);
      }
      
      console.log(`[AMC Runner] Generated .calage.xy with ${traceposEntries.length} tracepos entries from .aux`);
    } else {
      // No tracepos in .aux - parse TeX source to calculate accurate positions
      console.log('[AMC Runner] No tracepos in .aux, using TeX layout parser for accurate coordinates');
      
      const numQuestions = questionIds.length || layoutConfig.numQuestions || 16;
      
      // Use TeX parser to calculate accurate positions
      const result = generateCalageXyFromTex(texContent, numQuestions);
      calageLines = result.content.split('\n');
      
      console.log(`[AMC Runner] Generated .calage.xy with ${result.traceposCount} tracepos entries from TeX layout`);
    }

    // Write calage file
    const calageContent = calageLines.join('\n');
    const writeResult = await this.wslExec(
      `printf '%s' '${calageContent.replace(/'/g, "'\\''")}' > '${calageFile}' && echo "CALAGE_OK" || echo "CALAGE_FAIL"`
    );

    if (writeResult.stdout.includes('CALAGE_FAIL')) {
      throw new Error(`Failed to write calage file to ${calageFile}`);
    }

    console.log(`[AMC Runner] Wrote .calage.xy with ${calageLines.length} lines`);
  }

  /**
   * Legacy: Run AMC print step (not used in new workflow)
   */
  async amcPrint(projectDir, numVersions, timeoutSeconds = 120) {
    this._validateProjectPath(projectDir);
    const subjectPdf = `${projectDir}/amc-compiled.pdf`;
    const dataDir = `${projectDir}/exam-data`;

    const cmd =
      `cd '${projectDir}' && ` +
      `${AMC_TOOLS.xvfb} --server-num=99 --auto-servernum ` +
      `${AMC_TOOLS.amc} imprime ` +
      `--sujet '${subjectPdf}' ` +
      `--data '${dataDir}' ` +
      `--methode file ` +
      `--output '${projectDir}/copy-%04e.pdf' ` +
      `> /dev/null 2>&1 ; ` +
      `echo "PRINT_EXIT=$?"`;

    const result = await this.wslExecWithTimeout(cmd, timeoutSeconds * 1000);
    if (result.exitCode !== 0) {
      throw new Error(`AMC imprime failed: ${result.stderr}`);
    }

    const findResult = await this.wslExec(
      `find '${projectDir}' -name 'copy-*.pdf' -type f | sort`
    );
    return { outputFiles: findResult.stdout.trim().split('\n').filter(Boolean) };
  }

  /**
   * Cleanup WSL project directory
   */
  async cleanup(projectDir) {
    this._validateProjectPath(projectDir);
    try {
      await this.wslExec(`rm -rf ${projectDir}`);
    } catch (err) {
      console.warn(`AMC cleanup warning for ${projectDir}:`, err.message);
    }
  }

  /**
   * Export PDFs from WSL to Windows output directory
   */
  async exportPdfs(projectDir, outputDir, numVersions) {
    this._validateProjectPath(projectDir);

    const pdfPaths = [];
    const findResult = await this.wslExec(
      `find '${projectDir}' -name '*.pdf' -type f | sort`
    );

    const pdfFiles = findResult.stdout.trim().split('\n').filter(Boolean);

    for (let i = 0; i < Math.min(numVersions, pdfFiles.length); i++) {
      const wslPdfPath = pdfFiles[i];
      const pdfBasename = path.posix.basename(wslPdfPath);
      const winPdfPath = path.join(outputDir, pdfBasename);
      const wslWinPdfPath = this._toWslPath(winPdfPath);

      const copyResult = await this.wslExec(
        `cp '${wslPdfPath}' '${wslWinPdfPath}'`
      );

      if (copyResult.exitCode === 0) {
        pdfPaths.push(winPdfPath);
      }
    }

    if (pdfPaths.length === 0) {
      throw new Error('Failed to export any PDF files');
    }

    return pdfPaths;
  }

  /**
   * Export AMC CSV from WSL to Windows
   */
  async exportCsv(projectDir, outputDir) {
    this._validateProjectPath(projectDir);

    const csvNames = ['exam-answers.csv', 'answers.csv', 'questions.csv'];
    let csvName = null;

    for (const name of csvNames) {
      const p = `${projectDir}/${name}`;
      const r = await this.wslExec(`ls -la '${p}' 2>&1`);
      if (r.exitCode === 0) { csvName = name; break; }
    }

    if (!csvName) {
      console.warn(`AMC CSV not found in ${projectDir}`);
      return null;
    }

    const csvPath = `${projectDir}/${csvName}`;
    const winCsvPath = path.join(outputDir, csvName);
    const wslWinCsvPath = this._toWslPath(winCsvPath);

    const r = await this.wslExec(`cp '${csvPath}' '${wslWinCsvPath}'`);
    if (r.exitCode !== 0) throw new Error(`Failed to export AMC CSV: ${r.stderr}`);
    return winCsvPath;
  }

  /**
   * Export AMC .calage.xy file from WSL to Windows
   * @param {string} projectDir - WSL project directory
   * @param {string} outputDir - Windows output directory
   * @returns {Promise<string|null>} Windows file path or null if not found
   */
  async exportCalage(projectDir, outputDir) {
    this._validateProjectPath(projectDir);

    const calageNames = ['.calage.xy', 'calage.xy'];
    let foundName = null;

    for (const name of calageNames) {
      const p = `${projectDir}/${name}`;
      const r = await this.wslExec(`ls -la '${p}' 2>&1`);
      if (r.exitCode === 0) { foundName = name; break; }
    }

    if (!foundName) {
      console.warn(`[AMC Runner] Calage file not found in ${projectDir}`);
      return null;
    }

    const srcPath = `${projectDir}/${foundName}`;
    const winDstPath = path.join(outputDir, foundName);
    const wslDstPath = this._toWslPath(winDstPath);

    // Check source file size before copy (for validation)
    const srcSizeCheck = await this.wslExec(`stat -c%s '${srcPath}' 2>/dev/null || echo '0'`);
    const srcSize = parseInt(srcSizeCheck.stdout.trim(), 10);

    // Ensure destination directory exists
    await this.wslExec(`mkdir -p '${path.dirname(wslDstPath)}'`);

    // Remove existing file to ensure clean copy
    await this.wslExec(`rm -f '${wslDstPath}' 2>/dev/null`);

    // Copy file
    const r = await this.wslExec(`cp '${srcPath}' '${wslDstPath}'`);
    if (r.exitCode !== 0) {
      console.warn(`[AMC Runner] Failed to export calage: ${r.stderr}`);
      return null;
    }

    // Verify: Check destination file size
    const dstSizeCheck = await this.wslExec(`stat -c%s '${wslDstPath}' 2>/dev/null || echo '0'`);
    const dstSize = parseInt(dstSizeCheck.stdout.trim(), 10);

    if (srcSize !== dstSize) {
      console.error(`[AMC Runner] CRITICAL: File size mismatch! Source: ${srcSize}, Dest: ${dstSize}`);
      throw new Error(`calage.xy copy failed: size mismatch (${srcSize} vs ${dstSize})`);
    }

    // Count lines to ensure completeness (512 lines for full answer sheet)
    const lineCountCheck = await this.wslExec(`wc -l < '${wslDstPath}' 2>/dev/null || echo '0'`);
    const lineCount = parseInt(lineCountCheck.stdout.trim(), 10);
    console.log(`[AMC Runner] calage.xy copied: ${srcSize} bytes, ${lineCount} lines`);

    // Sanity check: expect at least 400 lines for a complete answer sheet
    if (lineCount < 400) {
      console.warn(`[AMC Runner] WARNING: calage.xy has only ${lineCount} lines - may be incomplete!`);
    }

    return winDstPath;
  }

  /**
   * Read CSV content from WSL project directory
   */
  /**
   * BACKWARD COMPAT: Legacy method stubs used by existing unit tests.
   * Not used in the new pipeline.
   */
  async backendScan(projectDir) {
    this._validateProjectPath(projectDir);
    const result = await this.wslExec(
      `${AMC_TOOLS.amc} check --backend '${projectDir}'`
    );
    if (result.exitCode !== 0) {
      throw new Error(`Backend scan failed: ${result.stderr}`);
    }
    return { success: true };
  }

  async compileVersions(projectDir, numVersions, timeoutSeconds = 120) {
    this._validateProjectPath(projectDir);
    const startTime = Date.now();
    // Legacy: just runs amc-compile (wrapper around AMC prepare+print)
    const cmd =
      `${AMC_TOOLS.xvfb} --server-num=99 --auto-servernum ` +
      `${AMC_TOOLS.amc} compile ` +
      `--project '${projectDir}' ` +
      `--n-copies ${numVersions} ` +
      `--output '${projectDir}/copy-%04e.pdf' ` +
      `> /dev/null 2>&1 ; echo "COMPILE_EXIT=$?"`;

    const result = await this.wslExecWithTimeout(cmd, timeoutSeconds * 1000);
    return {
      success: result.exitCode === 0,
      numVersions,
      compilationTime: Date.now() - startTime,
    };
  }

  async readCsv(projectDir) {
    this._validateProjectPath(projectDir);
    const csvNames = ['exam-answers.csv', 'answers.csv', 'questions.csv'];
    for (const name of csvNames) {
      const csvPath = `${projectDir}/${name}`;
      const result = await this.wslExec(`cat '${csvPath}' 2>/dev/null`);
      if (result.exitCode === 0 && result.stdout.trim()) {
        return result.stdout;
      }
    }
    return '';
  }
}

module.exports = new AmcRunnerService();
module.exports.AMC_TOOLS = AMC_TOOLS;
