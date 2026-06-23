/**
 * AMC Output Validator
 * Validate output PDFs tu AMC
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class AmcValidator {
  /**
   * Validate a single PDF file
   * @param {string} pdfPath - Windows path to PDF
   * @param {Object} options - {minPages, maxPages}
   * @returns {Promise<ValidationResult>}
   */
  async validatePdf(pdfPath, options = {}) {
    const { minPages = 1, maxPages = 50 } = options;
    const result = { path: pdfPath, valid: true, errors: [], pageCount: 0 };

    // Check file exists
    if (!fs.existsSync(pdfPath)) {
      result.valid = false;
      result.errors.push('File does not exist');
      return result;
    }

    // Check file is readable
    try {
      const stats = fs.statSync(pdfPath);
      if (stats.size === 0) {
        result.valid = false;
        result.errors.push('File is empty (0 bytes)');
        return result;
      }
    } catch {
      result.valid = false;
      result.errors.push('Cannot read file stats');
      return result;
    }

    // Get page count via Ghostscript
    try {
      const pageCount = await this.getPdfPageCount(pdfPath);
      result.pageCount = pageCount;

      if (pageCount < minPages) {
        result.valid = false;
        result.errors.push(`Page count (${pageCount}) below minimum (${minPages})`);
      }
      if (pageCount > maxPages) {
        result.warnings = result.warnings || [];
        result.warnings.push(`Page count (${pageCount}) exceeds typical maximum (${maxPages})`);
      }
    } catch (err) {
      result.valid = false;
      result.errors.push(`Failed to read PDF: ${err.message}`);
    }

    return result;
  }

  /**
   * Validate all generated PDFs
   * @param {string[]} pdfPaths
   * @param {Object} options
   * @returns {Promise<ValidationResult[]>}
   */
  async validateAll(pdfPaths, options = {}) {
    return Promise.all(pdfPaths.map((p) => this.validatePdf(p, options)));
  }

  /**
   * Get PDF page count via Ghostscript in WSL
   * @param {string} pdfPath
   * @returns {Promise<number>}
   */
  async getPdfPageCount(pdfPath) {
    const wslPath = this.toWslPath(pdfPath);
    const cmd = `wsl gs -dNODISPLAY -dBATCH -dNOPAUSE -sDEVICE=nullpage "${wslPath}" 2>&1 | grep -c "^Page " || echo 0`;

    try {
      const { stdout } = await execAsync(cmd, { timeout: 10000 });
      const count = parseInt(stdout.trim(), 10);
      return isNaN(count) ? 0 : count;
    } catch {
      return null;
    }
  }

  /**
   * Convert Windows path to WSL path
   * @param {string} winPath
   * @returns {string}
   */
  toWslPath(winPath) {
    return winPath
      .replace(/^([A-Za-z]):/, (m) => `/mnt/${m[0].toLowerCase()}`)
      .replace(/\\/g, '/');
  }
}

module.exports = new AmcValidator();
