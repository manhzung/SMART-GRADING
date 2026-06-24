/**
 * AMC Output Parser
 * Parse AMC stdout/stderr va filesystem output -> structured data
 */

const path = require('path');

class AmcOutputParser {
  /**
   * Parse AMC compilation output
   * @param {string} stdout - AMC stdout
   * @param {string} stderr - AMC stderr
   * @param {string[]} pdfPaths - Array of generated PDF paths
   * @param {number} numVersions - Expected number of versions
   * @param {string} csvContent - Optional CSV content for version codes
   * @returns {AmcOutput}
   */
  parse(stdout, stderr, pdfPaths, versionCodes) {
    const errors = [];

    // Extract errors from stderr
    const errorLines = (stderr || '').split('\n').filter((line) => {
      const lower = line.toLowerCase();
      return lower.includes('!') && (lower.includes('error') || lower.includes('fatal'));
    });
    errors.push(...errorLines.slice(0, 5));

    // Extract LaTeX warnings (cap at 10)
    const warningLines = (stdout + stderr).split('\n').filter((line) =>
      line.includes('LaTeX Warning') && !line.includes('file')
    );

    // Support both legacy (number) and new (string[]) formats
    const isLegacyCall = typeof versionCodes === 'number';
    const numVersions = isLegacyCall ? versionCodes : (Array.isArray(versionCodes) ? versionCodes.length : 0);

    const parsedPdfs = pdfPaths.map((pdfPath, index) => {
      let versionCode;
      if (Array.isArray(versionCodes) && versionCodes[index] !== undefined) {
        versionCode = versionCodes[index];
      } else if (isLegacyCall) {
        versionCode = (101 + index).toString();
      } else {
        versionCode = (index + 1).toString();
      }
      return {
        versionCode,
        pdfPath,
        filename: path.basename(pdfPath),
        pageCount: null,
      };
    });

    return {
      versionPdfs: parsedPdfs,
      totalVersions: parsedPdfs.length,
      compilationTime: null,
      errors,
      warnings: warningLines.slice(0, 10),
    };
  }

  /**
   * Determine output format (combined vs separate)
   * @param {string[]} pdfPaths
   * @returns {{type: string, omrPdfPaths: string[]}}
   */
  detectOutputFormat(pdfPaths) {
    return {
      type: 'combined',
      omrPdfPaths: [],
    };
  }
}

module.exports = new AmcOutputParser();
