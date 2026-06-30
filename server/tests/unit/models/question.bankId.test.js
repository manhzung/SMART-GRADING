const mongoose = require('mongoose');
const setupTestDB = require('../../utils/setupTestDB');

setupTestDB();

describe('Question Model - bankId', () => {
  it('should allow bankId on question', async () => {
    const Question = require('../../../src/models/question.model');
    const bankId = new mongoose.Types.ObjectId();
    const q = await Question.create({
      content: 'Q1',
      options: [{ id: 'A', content: 'A', isCorrect: true }],
      createdBy: new mongoose.Types.ObjectId(),
      bankId,
    });
    expect(q.bankId.toString()).toBe(bankId.toString());
  });
});
