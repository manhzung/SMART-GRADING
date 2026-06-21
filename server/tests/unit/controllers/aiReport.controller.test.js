const aiReportController = require('../../../src/controllers/aiReport.controller');

describe('AIReportController', () => {
  it('should have generateForSubmission function', () => {
    expect(typeof aiReportController.generateForSubmission).toBe('function');
  });

  it('should have generateForExam function', () => {
    expect(typeof aiReportController.generateForExam).toBe('function');
  });

  it('should have getQuestionDifficulty function', () => {
    expect(typeof aiReportController.getQuestionDifficulty).toBe('function');
  });

  it('should have getStudentReports function', () => {
    expect(typeof aiReportController.getStudentReports).toBe('function');
  });
});
