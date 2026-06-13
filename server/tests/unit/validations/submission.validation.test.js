const Joi = require('joi');
const { scanSubmission } = require('../../../src/validations/submission.validation');

describe('Submission validation - scanSubmission', () => {
  const { body } = scanSubmission;

  test('should accept classId in valid ObjectId format', () => {
    const { error } = Joi.compile({ body }).validate({
      body: {
        examId: '507f1f77bcf86cd799439011',
        image: 'data:image/png;base64,iVBOR...',
        classId: '507f1f77bcf86cd799439012',
      },
    });
    expect(error).toBeUndefined();
  });

  test('should accept request without classId (backward compat)', () => {
    const { error } = Joi.compile({ body }).validate({
      body: {
        examId: '507f1f77bcf86cd799439011',
        image: 'data:image/png;base64,iVBOR...',
      },
    });
    expect(error).toBeUndefined();
  });

  test('should reject invalid classId format', () => {
    const { error } = Joi.compile({ body }).validate({
      body: {
        examId: '507f1f77bcf86cd799439011',
        image: 'data:image/png;base64,iVBOR...',
        classId: 'invalid-id',
      },
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain('classId');
  });
});
