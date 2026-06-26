/**
 * Direct AMC-style PDF Compiler
 *
 * Replaces the AMC perl scripts by directly calling pdflatex with xvfb-run.
 * This avoids WSL2 permission/metadata issues that occur when running
 * `auto-multiple-choice prepare` (which internally runs commands as root).
 *
 * AMC prepare --mode s runs 3 phases:
 *   1. SUJET   -> student exam paper (no answers)
 *   2. CORRIGE -> answer key
 *   3. CATALOG -> OMR catalog
 *
 * Each phase requires 2 pdflatex passes (for cross-references to resolve).
 * We implement the same logic directly.
 */

const { spawn } = require('child_process');

const WSL_DISTRO = 'Ubuntu-24.04';

/**
 * Spawn a WSL command and wait for result
 */
function wslSpawn(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'wsl',
      ['-d', WSL_DISTRO, '--', 'bash', '-c', cmd],
      {
        windowsHide: true,
        maxBuffer: 50 * 1024 * 1024,
        ...opts,
      }
    );
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('error', reject);
    proc.on('close', code => resolve({ exitCode: code, stdout, stderr }));
  });
}

/**
 * Run with timeout
 */
function wslSpawnWithTimeout(cmd, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'wsl',
      ['-d', WSL_DISTRO, '--', 'bash', '-c', cmd],
      { windowsHide: true, maxBuffer: 50 * 1024 * 1024 }
    );
    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      proc.kill('SIGTERM');
    }, timeoutMs);

    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('error', err => { clearTimeout(timer); reject(err); });
    proc.on('close', code => {
      clearTimeout(timer);
      resolve({ exitCode: killed ? -1 : code, stdout, stderr, killed });
    });
  });
}

class DirectAmcCompiler {
  /**
   * Run the full AMC prepare pipeline: SUJET + CORRIGE + CATALOG
   * Each phase runs pdflatex twice (for AMC document cross-refs)
   *
   * @param {string} projectDir - WSL path to project directory
   * @param {string} texFile - WSL path to .tex file
   * @param {number} timeoutMs - timeout per phase
   * @returns {Promise<{sujetPdf, corrigePdf}>}
   */
  async amcPrepare(projectDir, texFile, timeoutMs = 120000) {
    const texBasename = 'amc-compiled';
    // Only SUJET (exam) and CORRIGE (answer key) - CATALOG not needed
    const phases = [
      { name: 'SUJET', outName: 'sujet.pdf' },
      { name: 'CORRIGE', outName: 'corrige.pdf' },
    ];

    const results = {};

    for (const phase of phases) {
      console.log(`[DirectCompiler] Phase ${phase.name}...`);

      // Create fresh data dir for each phase (AMC uses separate data per phase)
      const dataDir = `${projectDir}/exam-data`;
      await wslSpawn(
        `mkdir -p '${dataDir}' && chmod 777 '${dataDir}'`
      );

      // Each phase needs 2 pdflatex passes
      for (let pass = 1; pass <= 2; pass++) {
        const cmd =
          `cd '${projectDir}' && ` +
          `/usr/bin/xvfb-run --server-num=99 --auto-servernum ` +
          `/usr/bin/pdflatex ` +
          `-interaction=nonstopmode -halt-on-error ` +
          `-output-directory='${projectDir}' ` +
          `-jobname='${texBasename}' ` +
          `'${texFile}' ` +
          `> /dev/null 2>&1 ; ` +
          `echo "PDL_EXIT=$?"`;

        const result = await wslSpawnWithTimeout(cmd, timeoutMs);
        if (result.exitCode !== 0) {
          console.warn(`  [${phase.name}] pass ${pass} exit ${result.exitCode} (continuing)`);
        }
      }

      // After 2 passes, pdflatex outputs to {basename}.pdf
      // Rename to phase-specific name
      const generatedPdf = `${projectDir}/${texBasename}.pdf`;
      const targetPdf = `${projectDir}/${phase.outName}`;

      const mvResult = await wslSpawn(
        `if [ -f '${generatedPdf}' ]; then mv '${generatedPdf}' '${targetPdf}' && ls -la '${targetPdf}' && echo "OK:${phase.outName}"; else echo "FAIL:${phase.outName}"; fi`
      );

      if (mvResult.stdout.includes('OK:')) {
        console.log(`  [${phase.name}] OK: ${mvResult.stdout.match(/OK:(\S+)/)?.[1] || phase.outName}`);
        results[phase.name.toLowerCase() + 'Pdf'] = targetPdf;
      } else {
        console.warn(`  [${phase.name}] FAIL: PDF not found`);
        results[phase.name.toLowerCase() + 'Pdf'] = null;
      }
    }

    return results;
  }

  /**
   * Compile a single tex file to PDF (no AMC phases)
   * Useful for testing or non-AMC documents
   */
  async compileTex(projectDir, texFile, outputName, timeoutMs = 120000) {
    const cmd =
      `cd '${projectDir}' && ` +
      `/usr/bin/xvfb-run --server-num=99 --auto-servernum ` +
      `/usr/bin/pdflatex ` +
      `-interaction=nonstopmode -halt-on-error ` +
      `-output-directory='${projectDir}' ` +
      `'${texFile}' ` +
      `> /dev/null 2>&1 ; ` +
      `echo "PDL_EXIT=$?"`;

    const result = await wslSpawnWithTimeout(cmd, timeoutMs);
    if (result.exitCode !== 0) {
      throw new Error(`pdflatex failed (exit ${result.exitCode})`);
    }

    const generatedPdf = `${projectDir}/${path.basename(texFile, '.tex')}.pdf`;
    const targetPdf = `${projectDir}/${outputName}`;
    await wslSpawn(`mv '${generatedPdf}' '${targetPdf}'`);
    return targetPdf;
  }
}

const path = require('path');

module.exports = { DirectAmcCompiler };
