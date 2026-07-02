const Joi = require('joi');
const { createClass, updateClass, getAvailableStudents } = require('../../../src/validations/class.validation');

describe('Class validation schemas', () => {
  describe('createClass', () => {
    const { body } = createClass;

    test('should accept create payload with a schoolId', () => {
      const validData = {
        name: '10A1',
        code: '10A1',
        academicYear: '2024-2025',
        schoolId: '507f1f77bcf86cd799439011',
      };
      const { error } = Joi.compile({ body }).validate({ body: validData });
      expect(error).toBeUndefined();
    });

    test('should accept create payload without a schoolId (school-less class)', () => {
      const validData = {
        name: '10A1',
        code: '10A1',
        academicYear: '2024-2025',
      };
      const { error } = Joi.compile({ body }).validate({ body: validData });
      expect(error).toBeUndefined();
    });

    test('should accept create payload with empty-string schoolId', () => {
      const validData = {
        name: '10A1',
        code: '10A1',
        academicYear: '2024-2025',
        schoolId: '',
      };
      const { error } = Joi.compile({ body }).validate({ body: validData });
      expect(error).toBeUndefined();
    });

    test('should accept create payload with explicit null schoolId', () => {
      const validData = {
        name: '10A1',
        code: '10A1',
        academicYear: '2024-2025',
        schoolId: null,
      };
      const { error } = Joi.compile({ body }).validate({ body: validData });
      expect(error).toBeUndefined();
    });

    test('should reject create payload with invalid schoolId format', () => {
      const invalidData = {
        name: '10A1',
        code: '10A1',
        academicYear: '2024-2025',
        schoolId: 'invalid-id',
      };
      const { error } = Joi.compile({ body }).validate({ body: invalidData });
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('schoolId');
    });

    test('should reject create payload missing required academicYear', () => {
      const invalidData = {
        name: '10A1',
        code: '10A1',
      };
      const { error } = Joi.compile({ body }).validate({ body: invalidData });
      expect(error).toBeDefined();
    });
  });

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

  describe('getAvailableStudents', () => {
    const { params, query } = getAvailableStudents;

    test('should accept valid id with all query params', () => {
      const { error } = Joi.compile({ params, query }).validate({
        params: { id: '507f1f77bcf86cd799439011' },
        query: { search: 'Nguyen', page: 1, limit: 20 },
      });
      expect(error).toBeUndefined();
    });

    test('should accept request without any query params (use defaults)', () => {
      const { error } = Joi.compile({ params, query }).validate({
        params: { id: '507f1f77bcf86cd799439011' },
        query: {},
      });
      expect(error).toBeUndefined();
    });

    test('should reject invalid id', () => {
      const { error } = Joi.compile({ params, query }).validate({
        params: { id: 'invalid-id' },
        query: {},
      });
      expect(error).toBeDefined();
    });

    test('should reject limit greater than 100', () => {
      const { error } = Joi.compile({ params, query }).validate({
        params: { id: '507f1f77bcf86cd799439011' },
        query: { limit: 200 },
      });
      expect(error).toBeDefined();
    });

    test('should reject search longer than 100 chars', () => {
      const { error } = Joi.compile({ params, query }).validate({
        params: { id: '507f1f77bcf86cd799439011' },
        query: { search: 'a'.repeat(101) },
      });
      expect(error).toBeDefined();
    });

    test('should reject negative page', () => {
      const { error } = Joi.compile({ params, query }).validate({
        params: { id: '507f1f77bcf86cd799439011' },
        query: { page: -1 },
      });
      expect(error).toBeDefined();
    });
  });
});
