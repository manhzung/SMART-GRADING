const mongoose = require('mongoose');
const setupTestDB = require('../../utils/setupTestDB');
const QuestionBank = require('../../../src/models/questionBank.model');

setupTestDB();

describe('QuestionBank Model', () => {
  it('should create a personal bank with required fields', async () => {
    const bank = await QuestionBank.create({
      name: 'My Bank',
      type: 'personal',
      createdBy: new mongoose.Types.ObjectId(),
    });
    expect(bank.isActive).toBe(true);
  });

  it('should enforce required name', async () => {
    await expect(
      QuestionBank.create({ type: 'personal', createdBy: new mongoose.Types.ObjectId() })
    ).rejects.toThrow();
  });

  it('should default type to personal and isActive to true', async () => {
    const bank = await QuestionBank.create({
      name: 'Bank',
      createdBy: new mongoose.Types.ObjectId(),
    });
    expect(bank.type).toBe('personal');
    expect(bank.isActive).toBe(true);
  });
});
