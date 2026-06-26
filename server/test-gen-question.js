/**
 * Test GenQuestion API - Direct Service Test
 */

const geminiService = require('./src/services/gemini.service');

async function testGenQuestion() {
  console.log('\n========================================');
  console.log('📝 GEN QUESTION API TEST');
  console.log('========================================\n');

  // Test 1: Generate Questions for Math
  console.log('📋 Test 1: Generate Math Questions');
  try {
    const result = await geminiService.generateQuestions({
      subject: 'Toán',
      topic: 'Phương trình bậc 2 (ax² + bx + c = 0)',
      grade: 10,
      count: 5,
      options: { difficulty: 'mixed', language: 'vietnamese' }
    });

    if (result && result.questions) {
      console.log('✅ SUCCESS\n');
      console.log('📊 Generated Questions:');
      result.questions.forEach((q, i) => {
        console.log(`\n  Câu ${i + 1} [${q.difficulty.toUpperCase()}]: ${q.question}`);
        console.log(`    A. ${q.options[0]}`);
        console.log(`    B. ${q.options[1]}`);
        console.log(`    C. ${q.options[2]}`);
        console.log(`    D. ${q.options[3]}`);
        console.log(`    ✅ Đáp án: ${q.correctAnswer}`);
      });
    } else {
      console.log('⚠️ No questions in response');
      console.log('Raw:', JSON.stringify(result).substring(0, 200));
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }

  // Test 2: Generate Questions for Vietnamese Literature
  console.log('\n\n📋 Test 2: Generate Literature Questions');
  try {
    const result = await geminiService.generateQuestions({
      subject: 'Ngữ Văn',
      topic: 'Tác phẩm "Tắt đèn" của Ngô Tất Tố',
      grade: 9,
      count: 3,
      options: { language: 'vietnamese' }
    });

    if (result && result.questions) {
      console.log('✅ SUCCESS\n');
      console.log('📊 Generated Questions:');
      result.questions.forEach((q, i) => {
        console.log(`\n  Câu ${i + 1}: ${q.question}`);
        console.log(`    Đáp án: ${q.correctAnswer} | Độ khó: ${q.difficulty}`);
      });
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }

  // Test 3: Generate English Grammar Questions
  console.log('\n\n📋 Test 3: Generate English Grammar Questions');
  try {
    const result = await geminiService.generateQuestions({
      subject: 'English',
      topic: 'Present Perfect Tense',
      grade: 10,
      count: 3,
      options: { language: 'english' }
    });

    if (result && result.questions) {
      console.log('✅ SUCCESS\n');
      console.log('📊 Generated Questions:');
      result.questions.forEach((q, i) => {
        console.log(`\n  Question ${i + 1}: ${q.question}`);
        console.log(`    Correct Answer: ${q.correctAnswer}`);
      });
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }

  // Test 4: Physics Questions
  console.log('\n\n📋 Test 4: Generate Physics Questions');
  try {
    const result = await geminiService.generateQuestions({
      subject: 'Vật Lý',
      topic: 'Định luật Newton',
      grade: 10,
      count: 4,
      options: { language: 'vietnamese' }
    });

    if (result && result.questions) {
      console.log('✅ SUCCESS\n');
      result.questions.forEach((q, i) => {
        console.log(`  Câu ${i + 1}: ${q.question.substring(0, 60)}...`);
        console.log(`    Đáp án: ${q.correctAnswer}`);
      });
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }

  console.log('\n========================================');
  console.log('🏁 TEST COMPLETE');
  console.log('========================================\n');
}

testGenQuestion().catch(console.error);
