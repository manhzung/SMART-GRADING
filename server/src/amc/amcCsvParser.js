/**
 * AMC CSV Parser
 * Parse AMC export CSV containing bubble coordinates
 * CSV format: type,name,page,x1,y1,x2,y2
 */

class AmcCsvParser {
  /**
   * @param {string} csvString - AMC CSV content
   * @returns {Object} parsed coordinate data
   */
  parse(csvString) {
    const lines = (csvString || '').trim().split('\n');
    if (lines.length < 2) {
      return this._emptyResult();
    }

    // Skip header
    const dataLines = lines.slice(1);

    const result = {
      studentId: { digits: 10, coords: [] },
      versionCode: { digits: 3, coords: [] },
      answers: {},
    };

    for (const line of dataLines) {
      const parts = this._parseLine(line);
      if (parts.length < 7) continue;

      const [type, name, page, x1, y1, x2, y2] = parts;
      const x1n = parseInt(x1, 10);
      const y1n = parseInt(y1, 10);
      const x2n = parseInt(x2, 10);
      const y2n = parseInt(y2, 10);
      const w = x2n - x1n;
      const h = y2n - y1n;

      if (type === 'zone') {
        if (name === 'student_id') {
          result.studentId.coords.push({ x: x1n, y: y1n, w, h, digit: result.studentId.coords.length });
        } else if (name === 'version_code') {
          result.versionCode.coords.push({ x: x1n, y: y1n, w, h, digit: result.versionCode.coords.length });
        }
      } else if (type === 'answer') {
        // name format: q01_a, q01_b, etc. (regex: /^(\w+)_([A-D])$/)
        const match = name.match(/^(\w+)_([A-D])$/i);
        if (match) {
          const [, qId, option] = match;
          if (!result.answers[qId]) {
            result.answers[qId] = {};
          }
          result.answers[qId][option.toUpperCase()] = { x: x1n, y: y1n, w, h };
        }
      }
    }

    return result;
  }

  _parseLine(line) {
    return line.split(',').map((s) => s.trim());
  }

  _emptyResult() {
    return { studentId: { digits: 10, coords: [] }, versionCode: { digits: 3, coords: [] }, answers: {} };
  }
}

module.exports = AmcCsvParser;
