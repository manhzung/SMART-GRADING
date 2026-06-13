const mongoose = require('mongoose');
const faker = require('faker');

const questionOne = {
  _id: mongoose.Types.ObjectId(),
  content: 'What is 2 + 2?',
  type: 'single_choice',
  options: [
    { id: 'A', content: '3', isCorrect: false, order: 0 },
    { id: 'B', content: '4', isCorrect: true, order: 1 },
    { id: 'C', content: '5', isCorrect: false, order: 2 },
    { id: 'D', content: '6', isCorrect: false, order: 3 },
  ],
  correctAnswer: 'B',
  difficulty: 'easy',
  source: 'manual',
  tags: ['Math'],
  isApproved: true,
  isActive: true,
  usageCount: 0,
};

const questionTwo = {
  _id: mongoose.Types.ObjectId(),
  content: 'What is H2O?',
  type: 'single_choice',
  options: [
    { id: 'A', content: 'Hydrogen', isCorrect: false, order: 0 },
    { id: 'B', content: 'Oxygen', isCorrect: false, order: 1 },
    { id: 'C', content: 'Water', isCorrect: true, order: 2 },
    { id: 'D', content: 'Helium', isCorrect: false, order: 3 },
  ],
  correctAnswer: 'C',
  difficulty: 'medium',
  source: 'manual',
  tags: ['Chemistry'],
  isApproved: false, // Chưa duyệt
  isActive: true,
  usageCount: 0,
};

const questionUsedInExam = {
  _id: mongoose.Types.ObjectId(),
  content: 'What is gravity?',
  type: 'single_choice',
  options: [
    { id: 'A', content: 'Force', isCorrect: true, order: 0 },
    { id: 'B', content: 'Energy', isCorrect: false, order: 1 },
    { id: 'C', content: 'Mass', isCorrect: false, order: 2 },
    { id: 'D', content: 'Speed', isCorrect: false, order: 3 },
  ],
  correctAnswer: 'A',
  difficulty: 'hard',
  source: 'manual',
  tags: ['Physics'],
  isApproved: true,
  isActive: true,
  usageCount: 3, // Đã dùng trong exam
};

const insertQuestions = async (questions) => {
  const Question = require('../../src/models/question.model');
  await Question.insertMany(questions.map((q) => ({ ...q })));
};

module.exports = {
  questionOne,
  questionTwo,
  questionUsedInExam,
  insertQuestions,
};
