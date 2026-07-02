const amcOutputParser = require('../../src/amc/amcOutputParser');

describe('amcOutputParser', () => {
  describe('parse', () => {
    it('should map version indices to version codes starting at 101', () => {
      const result = amcOutputParser.parse('', '', ['/path/001.pdf', '/path/002.pdf', '/path/003.pdf'], 3);

      expect(result.versionPdfs).toHaveLength(3);
      expect(result.versionPdfs[0].versionCode).toBe('101');
      expect(result.versionPdfs[1].versionCode).toBe('102');
      expect(result.versionPdfs[2].versionCode).toBe('103');
    });

    it('should extract error lines from stderr', () => {
      const stderr = 'Some output\n! LaTeX Error: Something bad\nMore text\n! Fatal error';
      const result = amcOutputParser.parse('', stderr, [], 0);

      expect(result.errors).toContain('! LaTeX Error: Something bad');
      expect(result.errors).toContain('! Fatal error');
    });

    it('should cap errors at 5', () => {
      const stderr = Array.from({ length: 10 }, (_, i) => `! Error ${i}`).join('\n');
      const result = amcOutputParser.parse('', stderr, [], 0);

      expect(result.errors).toHaveLength(5);
    });

    it('should include warnings', () => {
      const stdout = 'LaTeX Warning: some warning';
      const result = amcOutputParser.parse(stdout, '', [], 0);

      expect(result.warnings).toBeDefined();
      expect(result.warnings.length).toBeLessThanOrEqual(10);
    });

    it('should handle empty stdout and stderr', () => {
      const result = amcOutputParser.parse('', '', [], 0);

      expect(result.errors).toHaveLength(0);
      expect(result.versionPdfs).toHaveLength(0);
      expect(result.totalVersions).toBe(0);
    });

    it('should set pageCount to null by default', () => {
      const result = amcOutputParser.parse('', '', ['/path/001.pdf'], 1);

      expect(result.versionPdfs[0].pageCount).toBeNull();
    });

    it('should include filename in versionPdf', () => {
      const result = amcOutputParser.parse('', '', ['/path/001.pdf'], 1);

      expect(result.versionPdfs[0].filename).toBe('001.pdf');
    });
  });

  describe('detectOutputFormat', () => {
    it('should return combined type by default', () => {
      const result = amcOutputParser.detectOutputFormat(['/path/001.pdf']);

      expect(result.type).toBe('combined');
      expect(result.omrPdfPaths).toEqual([]);
    });
  });
});
