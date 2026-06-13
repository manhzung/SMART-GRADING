const Joi = require('joi');
const { updateClass } = require('../../../src/validations/class.validation');

describe('Class validation schemas', () => {
  describe('updateClass', () => {
    const { body, params } = updateClass;

    test('should accept valid update payload with name only', () => {
      const validData = { name: 'New Class Name' };
      const { error } = Joi.compile({ body, params }).validate({
        params: { id: '507f1f77bcf86cd799439011' },
        body: validData,
      });
      expect(error).toBeUndefined();
    });

    test('should accept valid update payload with gradeLevel', () => {
      const validData = { gradeLevel: 10 };
      const { error } = Joi.compile({ body, params }).validate({
        params: { id: '507f1f77bcf86cd799439011' },
        body: validData,
      });
      expect(error).toBeUndefined();
    });

    test('should accept valid update payload with homeroomTeacherId', () => {
      const validData = { homeroomTeacherId: '507f1f77bcf86cd799439011' };
      const { error } = Joi.compile({ body, params }).validate({
        params: { id: '507f1f77bcf86cd799439011' },
        body: validData,
      });
      expect(error).toBeUndefined();
    });

    test('should reject update with code field (not in schema)', () => {
      const invalidData = { name: 'New Name', code: 'NEWCODE' };
      const { error } = Joi.compile({ body, params }).validate({
        params: { id: '507f1f77bcf86cd799439011' },
        body: invalidData,
      });
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('code');
      expect(error.details[0].message).toContain('not allowed');
    });

    test('should reject update with subjectId field (not in model)', () => {
      const invalidData = { name: 'New Name', subjectId: '507f1f77bcf86cd799439011' };
      const { error } = Joi.compile({ body, params }).validate({
        params: { id: '507f1f77bcf86cd799439011' },
        body: invalidData,
      });
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('subjectId');
      expect(error.details[0].message).toContain('not allowed');
    });

    test('should reject update with schoolId field (not in schema)', () => {
      const invalidData = { name: 'New Name', schoolId: '507f1f77bcf86cd799439011' };
      const { error } = Joi.compile({ body, params }).validate({
        params: { id: '507f1f77bcf86cd799439011' },
        body: invalidData,
      });
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('schoolId');
      expect(error.details[0].message).toContain('not allowed');
    });

    test('should reject update with invalid id param', () => {
      const { error } = Joi.compile({ body, params }).validate({
        params: { id: 'invalid-id' },
        body: { name: 'New Name' },
      });
      expect(error).toBeDefined();
    });
  });
});
