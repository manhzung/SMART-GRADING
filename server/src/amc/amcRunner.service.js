/**
 * AMC Runner Service - Production Version
 *
 * SUPPORTS BOTH WORKFLOWS:
 * 1. WSL2 (Development on Windows): Uses WSL distro for AMC commands
 * 2. Linux Native (Production on VPS): Runs AMC commands directly
 *
 * Detection: Checks if RUNNING_IN_DOCKER environment variable is set
 * - If set: Use Linux native commands (production)
 * - If not set: Use WSL commands (development)
 */

const { spawn } = require('child_process');
const path = require('path');

const WSL_DISTRO = process.env.WSL_DISTRO || 'Ubuntu-24.04';
const AMC_PROJECTS_DIR = process.env.AMC_PROJECTS_DIR || '/home/amc/amc-projects';
const RUNNING_IN_DOCKER = process.env.RUNNING_IN_DOCKER === 'true';
const RUNNING_ON_WINDOWS = process.platform === 'win32';

// Absolute paths for all AMC tools
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
    this.env = { WSL_DISTRO, AMC_PROJECTS_DIR, RUNNING_IN_DOCKER };
    this.isLinuxNative = RUNNING_IN_DOCKER || !RUNNING_ON_WINDOWS;

    if (this.isLinuxNative) {
      console.log('[AMC Runner] Running in Linux native mode (production)');
    } else {
      console.log('[AMC Runner] Running in WSL mode (development)');
    }
  }

  /**
   * Execute command - automatically chooses WSL or native based on environment
   * @returns {Promise<{exitCode: number, stdout: string, stderr: string}>}
   */
  exec(cmd, options = {}) {
    if (this.isLinuxNative) {
      return this._linuxExec(cmd, options);
    } else {
      return this.wslExec(cmd, options);
    }
  }

  /**
   * Execute command on Linux (production)
   */
  _linuxExec(cmd, options = {}) {
    return new Promise((resolve, reject) => {
      const proc = spawn('bash', ['-c', cmd], {
        windowsHide: true,
        maxBuffer: 50 * 1024 * 1024,
        env: {
          ...process.env,
          DISPLAY: process.env.DISPLAY || ':99',
          HOME: process.env.HOME || '/home/amc',
        },
        ...options,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (err) => {
        reject(new Error(`Linux spawn error: ${err.message}`));
      });

      proc.on('close', (code) => {
        resolve({ exitCode: code, stdout, stderr });
      });
    });
  }

  /**
   * Execute command via WSL (development on Windows)
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

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (err) => {
        reject(new Error(`WSL spawn error: ${err.message}`));
      });

      proc.on('close', (code) => {
        resolve({ exitCode: code, stdout, stderr });
      });
    });
  }

  /**
   * Execute with timeout
   */
  execWithTimeout(cmd, timeoutMs = 120000) {
    return new Promise((resolve, reject) => {
      const spawnCmd = this.isLinuxNative ? 'bash' : 'wsl';
      const spawnArgs = this.isLinuxNative ? ['-c', cmd] : ['-d', WSL_DISTRO, '--', 'bash', '-c', cmd];

      const proc = spawn(spawnCmd, spawnArgs, {
        windowsHide: true,
        maxBuffer: 50 * 1024 * 1024,
        env: {
          ...process.env,
          DISPLAY: process.env.DISPLAY || ':99',
        },
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

      const timer = setTimeout(() => {
        killed = true;
        proc.kill('SIGTERM');
        setTimeout(() => {
          if (!proc.killed) proc.kill('SIGKILL');
        }, 5000);
      }, timeoutMs);

      proc.stdout.on('data', (d) => {
        stdout += d.toString();
      });
      proc.stderr.on('data', (d) => {
        stderr += d.toString();
      });

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
        const result = await this.exec(cmd);
        tools[key] = result.exitCode === 0 && result.stdout.trim().length > 0;
      } catch {
        tools[key] = false;
      }
    }

    return {
      isValid: tools.texlive && tools.ghostscript && tools.xvfb,
      tools,
      mode: this.isLinuxNative ? 'linux-native' : 'wsl',
      wslDistro: this.isLinuxNative ? null : WSL_DISTRO,
    };
  }

  _toWslPath(winPath) {
    return winPath.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (m) => `/mnt/${m[0].toLowerCase()}`);
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
   * Create project directory and write LaTeX source
   */
  async createProject(projectDir, texSource) {
    this._validateProjectPath(projectDir);

    // Use printf instead of echo for better portability
    const base64Source = Buffer.from(texSource, 'utf8').toString('base64');

    const cmd = [`mkdir -p '${projectDir}'`, `printf '%s' '${base64Source}' | base64 -d > '${projectDir}/exam.tex'`].join(
      ' && '
    );

    const result = await this.exec(cmd);
    if (result.exitCode !== 0) {
      throw new Error(`Failed to write LaTeX source: ${result.stderr}`);
    }

    // Verify file exists and has content
    const verify = await this.exec(`wc -c < '${projectDir}/exam.tex'`);
    if (verify.exitCode !== 0) {
      throw new Error(`LaTeX file verification failed: ${verify.stderr}`);
    }

    const fileSize = parseInt(verify.stdout.trim(), 10);
    if (fileSize === 0) {
      throw new Error(`LaTeX file is empty after writing`);
    }
  }

  /**
   * Generate .calage.xy using AMC's native calibration mode
   */
  async amcCalibrationPrepare(projectDir, texFile, timeoutMs = 300000) {
    this._validateProjectPath(projectDir);
    const dataDir = `${projectDir}/exam-data`;

    await this.exec(`mkdir -p '${dataDir}' && chmod -R 777 '${dataDir}' && rm -rf '${dataDir}'/*`);

    console.log('[AMC Runner] Running AMC prepare with calibration mode...');

    const cmd =
      `cd '${projectDir}' && ` +
      `mkdir -p '${dataDir}' && chmod 777 '${dataDir}' && ` +
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

    const result = await this.execWithTimeout(cmd, timeoutMs);

    if (result.exitCode !== 0) {
      console.warn(`[AMC Runner] AMC prepare exit ${result.exitCode}`);
      console.warn(`[AMC Runner] Log excerpt: ${result.stdout.slice(-500)}`);
    }

    const filesCheck = await this.exec(`ls -la '${projectDir}' | grep -E '\\.xy|\\.pdf|\\.log'`);
    console.log(`[AMC Runner] Generated files:\n${filesCheck.stdout}`);

    const xyExists = await this.exec(
      `[ -f '${projectDir}/calage.xy' ] && echo 'XY_EXISTS' || ` +
        `[ -f '${projectDir}/amc-compiled.xy' ] && echo 'AMC_XY_EXISTS' || echo 'XY_NOT_FOUND'`
    );

    const sujetExists = await this.exec(`[ -f '${projectDir}/sujet.pdf' ] && echo 'SUJET_EXISTS' || echo 'SUJET_NOT_FOUND'`);

    const corrigeExists = await this.exec(
      `[ -f '${projectDir}/corrige.pdf' ] && echo 'CORRIGE_EXISTS' || echo 'CORRIGE_NOT_FOUND'`
    );

    const hasCalage = xyExists.stdout.includes('XY_EXISTS');
    const hasAmcXy = xyExists.stdout.includes('AMC_XY_EXISTS');

    return {
      success: hasCalage || hasAmcXy,
      calagePath: hasCalage ? `${projectDir}/calage.xy` : null,
      amcCompiledXyPath: hasAmcXy ? `${projectDir}/amc-compiled.xy` : null,
      sujetPdf: sujetExists.stdout.includes('SUJET_EXISTS') ? `${projectDir}/sujet.pdf` : null,
      corrigePdf: corrigeExists.stdout.includes('CORRIGE_EXISTS') ? `${projectDir}/corrige.pdf` : null,
      logOutput: result.stdout,
    };
  }

  /**
   * Run xelatex twice for each phase
   */
  async amcPrepare(projectDir, timeoutMs = 300000) {
    this._validateProjectPath(projectDir);
    const texFile = `${projectDir}/exam.tex`;
    const dataDir = `${projectDir}/exam-data`;
    const texBasename = 'amc-compiled';

    await this.exec(`mkdir -p '${dataDir}' && chmod 777 '${dataDir}'`);

    const phases = [
      { name: 'SUJET', outName: 'sujet.pdf', texenv: 'sujet' },
      { name: 'CORRIGE', outName: 'corrige.pdf', texenv: 'corrige' },
    ];

    const results = {};

    for (const phase of phases) {
      console.log(`[AMC Runner] Phase ${phase.name}...`);

      await this.exec(`mkdir -p '${dataDir}' && chmod 777 '${dataDir}' && rm -f '${dataDir}'/*`);

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

        const result = await this.execWithTimeout(cmd, timeoutMs);
        if (result.exitCode !== 0) {
          console.warn(`[AMC Runner] ${phase.name} pass ${pass} exit ${result.exitCode}`);
        }
      }

      const generatedPdf = `${projectDir}/${texBasename}.pdf`;
      const targetPdf = `${projectDir}/${phase.outName}`;

      const mvResult = await this.exec(
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

    return { ...results, dataDir };
  }

  /**
   * Generate .calage.xy from xelatex output
   */
  async _generateCalageXy(projectDir, texBasename, calageFile, layoutConfig = {}) {
    const auxFile = `${projectDir}/${texBasename}.aux`;
    const logFile = `${projectDir}/xelatex-catalog-pass2.log`;

    const auxResult = await this.exec(`cat '${auxFile}' 2>/dev/null || echo ''`);
    const auxContent = auxResult.stdout;

    const logResult = await this.exec(`cat '${logFile}' 2>/dev/null || echo ''`);
    const logContent = logResult.stdout;

    let pageWidth = 597.50787;
    let pageHeight = 845.04684;
    const dimMatch = logContent.match(/Page dimensions \(paper\)=(\d+\.?\d*)pt x (\d+\.?\d*)pt/);
    if (dimMatch) {
      pageWidth = parseFloat(dimMatch[1]) || 597.50787;
      pageHeight = parseFloat(dimMatch[2]) || 845.04684;
    }

    const texResult = await this.exec(`cat '${projectDir}/exam.tex' 2>/dev/null || echo ''`);
    const texContent = texResult.stdout;

    const qMatches = texContent.match(/\\AMCcode(?:Grid)?(?:Int)?\{([^}]+)\}/g) || [];
    const questionIds = [
      ...new Set(
        qMatches
          .map((m) => {
            const match = m.match(/\\AMCcode(?:Grid)?(?:Int)?\{([^}]+)\}/);
            const id = match ? match[1] : null;
            return id && id.startsWith('q') ? id : null;
          })
          .filter(Boolean)
      ),
    ];

    const traceposRegex = /\\tracepos\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}/g;
    const traceposEntries = [];
    let match;

    while ((match = traceposRegex.exec(auxContent)) !== null) {
      const [, label, xSp, ySp, shape] = match;
      if (label.includes('position')) continue;
      traceposEntries.push({ label, xSp, ySp, shape });
    }

    const boxcharRegex = /\\boxchar\{([^}]+)\}\{([^}]*)\}/g;
    const boxcharEntries = [];
    while ((match = boxcharRegex.exec(auxContent)) !== null) {
      const [, label, char] = match;
      boxcharEntries.push({ label, char });
    }

    let calageLines;

    if (traceposEntries.length > 0) {
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

      questionIds.forEach((qId, idx) => {
        calageLines.push(`\\question{${idx + 1}{${qId}}`);
      });

      calageLines.push(`\\page{0/1/60}{${pageWidth}pt}{${pageHeight}pt}{${pageWidth}pt}{${pageHeight}pt}`);

      for (const entry of traceposEntries) {
        calageLines.push(`\\tracepos{${entry.label}}{${entry.xSp}}{${entry.ySp}}{${entry.shape}}`);
      }

      for (const entry of boxcharEntries) {
        calageLines.push(`\\boxchar{${entry.label}}{${entry.char}}`);
      }

      console.log(`[AMC Runner] Generated .calage.xy with ${traceposEntries.length} tracepos entries from .aux`);
    } else {
      console.log('[AMC Runner] No tracepos in .aux, using TeX layout parser for accurate coordinates');

      const numQuestions = questionIds.length || layoutConfig.numQuestions || 16;
      const result = generateCalageXyFromTex(texContent, numQuestions);
      calageLines = result.content.split('\n');

      console.log(`[AMC Runner] Generated .calage.xy with ${result.traceposCount} tracepos entries from TeX layout`);
    }

    const calageContent = calageLines.join('\n');
    const writeResult = await this.exec(
      `printf '%s' '${calageContent.replace(/'/g, "'\\''")}' > '${calageFile}' && echo "CALAGE_OK" || echo "CALAGE_FAIL"`
    );

    if (writeResult.stdout.includes('CALAGE_FAIL')) {
      throw new Error(`Failed to write calage file to ${calageFile}`);
    }

    console.log(`[AMC Runner] Wrote .calage.xy with ${calageLines.length} lines`);
  }

  /**
   * Legacy: Run AMC print step
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

    const result = await this.execWithTimeout(cmd, timeoutSeconds * 1000);
    if (result.exitCode !== 0) {
      throw new Error(`AMC imprime failed: ${result.stderr}`);
    }

    const findResult = await this.exec(`find '${projectDir}' -name 'copy-*.pdf' -type f | sort`);
    return { outputFiles: findResult.stdout.trim().split('\n').filter(Boolean) };
  }

  /**
   * Cleanup project directory
   */
  async cleanup(projectDir) {
    this._validateProjectPath(projectDir);
    try {
      await this.exec(`rm -rf ${projectDir}`);
    } catch (err) {
      console.warn(`AMC cleanup warning for ${projectDir}:`, err.message);
    }
  }

  /**
   * Export PDFs from project to output directory
   */
  async exportPdfs(projectDir, outputDir, numVersions) {
    this._validateProjectPath(projectDir);

    const pdfPaths = [];
    const findResult = await this.exec(`find '${projectDir}' -name '*.pdf' -type f | sort`);

    const pdfFiles = findResult.stdout.trim().split('\n').filter(Boolean);

    for (let i = 0; i < Math.min(numVersions, pdfFiles.length); i++) {
      const srcPdfPath = pdfFiles[i];
      const pdfBasename = path.posix.basename(srcPdfPath);
      const winPdfPath = path.join(outputDir, pdfBasename);
      const wslWinPdfPath = this._toWslPath(winPdfPath);

      const copyResult = await this.exec(`cp '${srcPdfPath}' '${wslWinPdfPath}'`);

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
   * Export AMC CSV
   */
  async exportCsv(projectDir, outputDir) {
    this._validateProjectPath(projectDir);

    const csvNames = ['exam-answers.csv', 'answers.csv', 'questions.csv'];
    let csvName = null;

    for (const name of csvNames) {
      const p = `${projectDir}/${name}`;
      const r = await this.exec(`ls -la '${p}' 2>&1`);
      if (r.exitCode === 0) {
        csvName = name;
        break;
      }
    }

    if (!csvName) {
      console.warn(`AMC CSV not found in ${projectDir}`);
      return null;
    }

    const csvPath = `${projectDir}/${csvName}`;
    const winCsvPath = path.join(outputDir, csvName);
    const wslWinCsvPath = this._toWslPath(winCsvPath);

    const r = await this.exec(`cp '${csvPath}' '${wslWinCsvPath}'`);
    if (r.exitCode !== 0) throw new Error(`Failed to export AMC CSV: ${r.stderr}`);
    return winCsvPath;
  }

  /**
   * Export AMC .calage.xy file
   */
  async exportCalage(projectDir, outputDir) {
    this._validateProjectPath(projectDir);

    const calageNames = ['.calage.xy', 'calage.xy'];
    let foundName = null;

    for (const name of calageNames) {
      const p = `${projectDir}/${name}`;
      const r = await this.exec(`ls -la '${p}' 2>&1`);
      if (r.exitCode === 0) {
        foundName = name;
        break;
      }
    }

    if (!foundName) {
      console.warn(`[AMC Runner] Calage file not found in ${projectDir}`);
      return null;
    }

    const srcPath = `${projectDir}/${foundName}`;
    const winDstPath = path.join(outputDir, foundName);
    const wslDstPath = this._toWslPath(winDstPath);

    const srcSizeCheck = await this.exec(`stat -c%s '${srcPath}' 2>/dev/null || echo '0'`);
    const srcSize = parseInt(srcSizeCheck.stdout.trim(), 10);

    await this.exec(`mkdir -p '${path.dirname(wslDstPath)}'`);
    await this.exec(`rm -f '${wslDstPath}' 2>/dev/null`);

    const r = await this.exec(`cp '${srcPath}' '${wslDstPath}'`);
    if (r.exitCode !== 0) {
      console.warn(`[AMC Runner] Failed to export calage: ${r.stderr}`);
      return null;
    }

    const dstSizeCheck = await this.exec(`stat -c%s '${wslDstPath}' 2>/dev/null || echo '0'`);
    const dstSize = parseInt(dstSizeCheck.stdout.trim(), 10);

    if (srcSize !== dstSize) {
      console.error(`[AMC Runner] CRITICAL: File size mismatch! Source: ${srcSize}, Dest: ${dstSize}`);
      throw new Error(`calage.xy copy failed: size mismatch (${srcSize} vs ${dstSize})`);
    }

    const lineCountCheck = await this.exec(`wc -l < '${wslDstPath}' 2>/dev/null || echo '0'`);
    const lineCount = parseInt(lineCountCheck.stdout.trim(), 10);
    console.log(`[AMC Runner] calage.xy copied: ${srcSize} bytes, ${lineCount} lines`);

    if (lineCount < 400) {
      console.warn(`[AMC Runner] WARNING: calage.xy has only ${lineCount} lines - may be incomplete!`);
    }

    return winDstPath;
  }

  /**
   * Backend scan (legacy)
   */
  async backendScan(projectDir) {
    this._validateProjectPath(projectDir);
    const result = await this.exec(`${AMC_TOOLS.amc} check --backend '${projectDir}'`);
    if (result.exitCode !== 0) {
      throw new Error(`Backend scan failed: ${result.stderr}`);
    }
    return { success: true };
  }

  async compileVersions(projectDir, numVersions, timeoutSeconds = 120) {
    this._validateProjectPath(projectDir);
    const startTime = Date.now();
    const cmd =
      `${AMC_TOOLS.xvfb} --server-num=99 --auto-servernum ` +
      `${AMC_TOOLS.amc} compile ` +
      `--project '${projectDir}' ` +
      `--n-copies ${numVersions} ` +
      `--output '${projectDir}/copy-%04e.pdf' ` +
      `> /dev/null 2>&1 ; echo "COMPILE_EXIT=$?"`;

    const result = await this.execWithTimeout(cmd, timeoutSeconds * 1000);
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
      const result = await this.exec(`cat '${csvPath}' 2>/dev/null`);
      if (result.exitCode === 0 && result.stdout.trim()) {
        return result.stdout;
      }
    }
    return '';
  }
}

module.exports = new AmcRunnerService();
module.exports.AMC_TOOLS = AMC_TOOLS;
module.exports.AMC_PROJECTS_DIR = AMC_PROJECTS_DIR;
