/**
 * Test API: Question Selection & Exam Creation
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
const API_KEY = process.env.API_KEY || 'test-api-key';

// Helper for authenticated requests
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
  },
});

// Demo token from login (replace with actual)
let authToken = null;

async function login() {
  try {
    // Try to get token from existing login flow
    // For testing, we'll skip auth and use API key
    console.log('Using API key authentication...\n');
  } catch (err) {
    console.error('Login failed:', err.message);
  }
}

async function testGetTags() {
  console.log('📋 TEST 1: Get All Tags');
  console.log('─'.repeat(40));

  try {
    const response = await api.get('/questions/tags');
    console.log('✅ SUCCESS');
    console.log('Tags found:', response.data.tags?.slice(0, 10).join(', '));
    console.log('Total tags:', response.data.tags?.length);
    return response.data.tags;
  } catch (err) {
    console.log('❌ FAILED:', err.response?.data?.message || err.message);
    return [];
  }
}

async function testGetQuestionsByTags(tags) {
  console.log('\n📋 TEST 2: Get Questions By Tags');
  console.log('─'.repeat(40));

  if (!tags || tags.length === 0) {
    console.log('⚠️ No tags available, using default: ["toan", "dai-so"]');
    tags = ['toan', 'dai-so'];
  }

  try {
    const tagParam = tags.slice(0, 3).join(',');
    const response = await api.get(`/questions/by-tags?tags=${tagParam}&limit=10`);

    console.log('✅ SUCCESS');
    console.log('Total questions:', response.data.data.total);
    console.log('By difficulty:');
    console.log('  - Easy:', response.data.data.byDifficulty?.easy?.length || 0);
    console.log('  - Medium:', response.data.data.byDifficulty?.medium?.length || 0);
    console.log('  - Hard:', response.data.data.byDifficulty?.hard?.length || 0);

    // Show sample question
    if (response.data.data.questions?.length > 0) {
      const q = response.data.data.questions[0];
      console.log('\n📝 Sample Question:');
      console.log('  Content:', q.content?.substring(0, 80) + '...');
      console.log('  Difficulty:', q.difficulty);
      console.log('  Tags:', q.tags?.join(', '));
    }

    return response.data.data.questions || [];
  } catch (err) {
    console.log('❌ FAILED:', err.response?.data?.message || err.message);
    return [];
  }
}

async function testGetQuestionsByDifficulty(tags) {
  console.log('\n📋 TEST 3: Get Questions By Tags + Difficulty Filter');
  console.log('─'.repeat(40));

  try {
    const tagParam = tags.slice(0, 2).join(',');
    const response = await api.get(`/questions/by-tags?tags=${tagParam}&difficulty=medium&limit=5`);

    console.log('✅ SUCCESS');
    console.log('Medium difficulty questions:', response.data.data.total);

    return response.data.data.questions || [];
  } catch (err) {
    console.log('❌ FAILED:', err.response?.data?.message || err.message);
    return [];
  }
}

async function testCreateExamFromSelection(questionIds) {
  console.log('\n📋 TEST 4: Create Exam From Selection');
  console.log('─'.repeat(40));

  if (!questionIds || questionIds.length === 0) {
    console.log('⚠️ No questions to create exam, skipping...');
    return null;
  }

  // Take first 5 questions for exam
  const selectedIds = questionIds.slice(0, 5);

  const examData = {
    questionIds: selectedIds,
    title: `Test Exam - ${new Date().toISOString().split('T')[0]}`,
    description: 'Auto-generated test exam from question selection',
    subjectName: 'Toán',
    classIds: ['6732a1b2c3d4e5f6a7b8c9d0'], // Demo class ID - replace with real
    examDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
    duration: 45,
    totalScore: selectedIds.length,
    numberOfVersions: 2,
  };

  try {
    const response = await api.post('/exams/from-selection', examData);

    console.log('✅ SUCCESS');
    console.log('Exam created:');
    console.log('  - ID:', response.data.data._id);
    console.log('  - Title:', response.data.data.title);
    console.log('  - Questions:', response.data.data.numberOfQuestions);
    console.log('  - Total Score:', response.data.data.totalScore);
    console.log('  - Status:', response.data.data.status);

    return response.data.data;
  } catch (err) {
    console.log('❌ FAILED:', err.response?.data?.message || err.message);
    if (err.response?.data?.details) {
      console.log('   Details:', err.response.data.details);
    }
    return null;
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  TEST: Question Selection & Exam Creation API  ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  await login();

  // Test 1: Get all tags
  const tags = await testGetTags();

  // Test 2: Get questions by tags
  const questions = await testGetQuestionsByTags(tags);

  // Test 3: Get questions filtered by difficulty
  await testGetQuestionsByDifficulty(tags);

  // Test 4: Create exam from selected questions
  if (questions.length > 0) {
    const questionIds = questions.map((q) => q._id);
    await testCreateExamFromSelection(questionIds);
  }

  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║                  TEST COMPLETE                  ║');
  console.log('╚════════════════════════════════════════════════╝\n');
}

runTests().catch(console.error);
