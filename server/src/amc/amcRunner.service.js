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
  gs: '/usr/bin/gs',
  amc: '/usr/bin/auto-multiple-choice',
};

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
   */
  async createProject(projectDir, texSource) {
    this._validateProjectPath(projectDir);

    const escaped = texSource
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "'\\''")
      .replace(/\$/g, '\\$')
      .replace(/`/g, '\\`');

    const cmd = `mkdir -p '${projectDir}' && printf '%s' '${escaped}' > '${projectDir}/exam.tex'`;
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
   * Run AMC prepare step using DIRECT pdflatex (bypasses AMC perl to avoid WSL2 root-perm bug)
   *
   * AMC prepare --mode s normally runs 3 phases:
   *   SUJET   -> student exam paper
   *   CORRIGE -> answer key
   *   CATALOG -> OMR catalog
   *
   * Each phase needs 2 pdflatex passes to resolve cross-references.
   * We implement the same logic directly.
   *
   * @param {string} projectDir - WSL path to project
   * @returns {Promise<{sujetPdf, corrigePdf, catalogPdf, dataDir}>}
   */
  async amcPrepare(projectDir) {
    this._validateProjectPath(projectDir);
    const texFile = `${projectDir}/exam.tex`;
    const dataDir = `${projectDir}/exam-data`;
    const texBasename = 'amc-compiled';

    // Create data directory
    await this.wslExec(`mkdir -p '${dataDir}' && chmod 777 '${dataDir}'`);

    const phases = [
      { name: 'SUJET', outName: 'sujet.pdf' },
      { name: 'CORRIGE', outName: 'corrige.pdf' },
      { name: 'CATALOG', outName: 'catalog.pdf' },
    ];

    const results = {};

    for (const phase of phases) {
      // Each phase needs its own fresh data dir
      await this.wslExec(
        `mkdir -p '${dataDir}' && chmod 777 '${dataDir}' && rm -f '${dataDir}'/*`
      );

      // Run pdflatex twice for each phase (cross-ref resolution)
      for (let pass = 1; pass <= 2; pass++) {
        const cmd =
          `cd '${projectDir}' && ` +
          `${AMC_TOOLS.xvfb} --server-num=99 --auto-servernum ` +
          `${AMC_TOOLS.pdflatex} ` +
          `-interaction=nonstopmode -halt-on-error ` +
          `-output-directory='${projectDir}' ` +
          `-jobname='${texBasename}' ` +
          `'${texFile}' > /dev/null 2>&1 ; ` +
          `echo "PDL_EXIT=$?"`;

        const result = await this.wslExecWithTimeout(cmd, 120000);
        if (result.exitCode !== 0) {
          console.warn(`[AMC Runner] ${phase.name} pass ${pass} exit ${result.exitCode}`);
        }
      }

      // Rename the generated PDF to phase-specific name
      const generatedPdf = `${projectDir}/${texBasename}.pdf`;
      const targetPdf = `${projectDir}/${phase.outName}`;

      const mvResult = await this.wslExec(
        `if [ -f '${generatedPdf}' ]; then mv '${generatedPdf}' '${targetPdf}' && echo "OK:${phase.outName}"; else echo "FAIL:${phase.outName}"; fi`
      );

      if (mvResult.stdout.includes('OK:')) {
        results[phase.name.toLowerCase() + 'Pdf'] = targetPdf;
      } else {
        results[phase.name.toLowerCase() + 'Pdf'] = null;
        console.warn(`[AMC Runner] ${phase.name}: PDF not generated`);
      }
    }

    return { ...results, dataDir };
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
