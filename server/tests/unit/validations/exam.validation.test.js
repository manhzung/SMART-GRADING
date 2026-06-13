const Joi = require('joi');
const { getUpcoming } = require('../../../src/validations/exam.validation');

describe('Exam validation - getUpcoming', () => {
  const { query } = getUpcoming;

  test('should accept limit=5', () => {
    const { error } = Joi.compile({ query }).validate({ query: { limit: 5 } });
    expect(error).toBeUndefined();
  });

  test('should accept limit=10 (max boundary)', () => {
    const { error } = Joi.compile({ query }).validate({ query: { limit: 10 } });
    expect(error).toBeUndefined();
  });

  test('should default limit to 5 when not provided', () => {
    const { value } = Joi.compile({ query }).validate({ query: {} });
    expect(value.query.limit).toBe(5);
  });

  test('should reject limit=0 (below min)', () => {
    const { error } = Joi.compile({ query }).validate({ query: { limit: 0 } });
    expect(error).toBeDefined();
  });

  test('should reject limit=11 (above max)', () => {
    const { error } = Joi.compile({ query }).validate({ query: { limit: 11 } });
    expect(error).toBeDefined();
  });

  test('should reject non-integer limit="abc"', () => {
    const { error } = Joi.compile({ query }).validate({ query: { limit: 'abc' } });
    expect(error).toBeDefined();
  });
});
