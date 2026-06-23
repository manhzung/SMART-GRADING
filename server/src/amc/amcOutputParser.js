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
   * @returns {AmcOutput}
   */
  parse(stdout, stderr, pdfPaths, numVersions) {
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

    const parsedPdfs = pdfPaths.map((pdfPath, index) => {
      const versionCode = (101 + index).toString();
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
