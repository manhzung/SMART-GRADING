const exportService = require('../../../src/services/export.service');

describe('ExportService', () => {
  describe('generatePdf', () => {
    it('should be a function', () => {
      expect(typeof exportService.generatePdf).toBe('function');
    });
  });

  describe('generateExcel', () => {
    it('should be a function', () => {
      expect(typeof exportService.generateExcel).toBe('function');
    });
  });

  describe('uploadToCloudinary', () => {
    it('should be a function', () => {
      expect(typeof exportService.uploadToCloudinary).toBe('function');
    });
  });

  describe('generateExamReportPdf', () => {
    it('should be a function', () => {
      expect(typeof exportService.generateExamReportPdf).toBe('function');
    });
  });

  describe('generateExamReportExcel', () => {
    it('should be a function', () => {
      expect(typeof exportService.generateExamReportExcel).toBe('function');
    });
  });

  describe('drawTable', () => {
    it('should be a function', () => {
      expect(typeof exportService.drawTable).toBe('function');
    });
  });
});
