/**
 * AMC Runner Service
 * Quản lý AMC CLI lifecycle qua WSL2
 * AMC chạy trong Ubuntu WSL2, Node.js gọi qua `wsl` command
 */

const { spawn } = require('child_process');
const path = require('path');

const WSL_DISTRO = process.env.WSL_DISTRO || 'Ubuntu';
const AMC_PROJECTS_DIR = '/home/amc/amc-projects';

class AmcRunnerService {
  constructor() {
    this.env = { WSL_DISTRO, AMC_PROJECTS_DIR };
  }

  /**
   * Run a command inside WSL2
   * @param {string} cmd - Command to run inside WSL
   * @param {Object} options - spawn options
   * @returns {Promise<{exitCode: number, stdout: string, stderr: string}>}
   */
  wslExec(cmd, options = {}) {
    return new Promise((resolve, reject) => {
      const args = [WSL_DISTRO, '--', 'bash', '-c', cmd];
      const proc = spawn('wsl', args, { windowsHide: true, ...options });

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
   * Kiểm tra AMC + dependencies có sẵn trong WSL2
   * @returns {Promise<EnvironmentCheck>}
   */
  async validateEnvironment() {
    const tools = { texlive: false, amc: false, ghostscript: false };

    const checks = [
      { cmd: 'pdflatex --version 2>&1 | head -1', key: 'texlive' },
      { cmd: 'amc-check --version 2>&1 | head -1', key: 'amc' },
      { cmd: 'gs --version 2>&1 | head -1', key: 'ghostscript' },
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
      isValid: tools.texlive && tools.amc && tools.ghostscript,
      tools,
      wslDistro: WSL_DISTRO,
    };
  }

  /**
   * Chạy AMC backend scan để prepare database
   * @param {string} projectDir - WSL path to project
   * @returns {Promise<void>}
   */
  async backendScan(projectDir) {
    this._validateProjectPath(projectDir);
    const cmd = `cd ${projectDir} && amc-check --backend .`;
    const result = await this.wslExec(cmd);

    if (result.exitCode !== 0) {
      throw new Error(
        `AMC backend scan failed (exit ${result.exitCode}): ${result.stderr || result.stdout}`
      );
    }
  }

  /**
   * Compile N versions với timeout
   * @param {string} projectDir - WSL path
   * @param {number} numVersions - So luong versions
   * @param {number} timeoutSeconds - Timeout per version
   * @returns {Promise<CompilationResult>}
   */
  async compileVersions(projectDir, numVersions, timeoutSeconds = 120) {
    this._validateProjectPath(projectDir);
    const startTime = Date.now();

    const cmd = `cd ${projectDir} && amc-compile --n-copies ${numVersions} .`;
    const result = await this.wslExecWithTimeout(cmd, timeoutSeconds * 1000);

    const compilationTime = Date.now() - startTime;

    if (result.exitCode !== 0) {
      throw new Error(
        `AMC compile failed (exit ${result.exitCode}): ${result.stderr || result.stdout}`
      );
    }

    return {
      success: true,
      compilationTime,
      numVersions,
      output: result.stdout,
    };
  }

  /**
   * Cleanup WSL project directory
   * @param {string} projectDir - WSL path
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
   * Get AMC project directory path for an exam
   * @param {string} examId - MongoDB ObjectId
   * @returns {string} WSL path
   */
  getProjectDir(examId) {
    return `${AMC_PROJECTS_DIR}/${examId}`;
  }

  /**
   * Validate that projectDir stays within AMC_PROJECTS_DIR
   * @param {string} projectDir
   */
  _validateProjectPath(projectDir) {
    const normalized = path.normalize(projectDir).replace(/\\/g, '/');
    const baseDir = AMC_PROJECTS_DIR.replace(/\\/g, '/');
    if (!normalized.startsWith(baseDir)) {
      throw new Error(`Invalid project path: ${projectDir} is outside AMC projects directory`);
    }
    return normalized;
  }

  /**
   * Helper: run command with timeout
   */
  wslExecWithTimeout(cmd, timeoutMs) {
    return new Promise((resolve, reject) => {
      const proc = spawn('wsl', [WSL_DISTRO, '--', 'bash', '-c', cmd], {
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

      const timer = setTimeout(() => {
        killed = true;
        proc.kill('SIGTERM');
        // Grace period: escalate to SIGKILL after 5s
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill('SIGKILL');
          }
        }, 5000);
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
}

module.exports = new AmcRunnerService();
